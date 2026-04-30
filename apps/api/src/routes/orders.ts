import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { sendMail } from '../email.js';
const router = Router();

const unitToCents = (v:number)=>Math.round(Number(v||0)*100);
const centsToUnit = (v:number|null|undefined)=>Math.round((v??0)/100);
const checkoutSchema = z.object({
  items: z.array(z.object({ productId:z.string(), quantity:z.number().int().positive() })).min(1),
  country: z.enum(['RD','US']),
  province: z.string().optional(),
  city: z.string().optional(),
  addressLine: z.string().min(5),
  promoCode: z.string().optional(),
  paymentMethodId: z.string().optional(),
});
function toOrder(o:any){ return {...o, subtotal:centsToUnit(o.subtotal), discount:centsToUnit(o.discount), shipping:centsToUnit(o.shipping), total:centsToUnit(o.total), items:o.items?.map((i:any)=>({...i,price:centsToUnit(i.price)})), events:o.events?.map((event:any)=>({...event, actor:event.user ? { id:event.user.id, name:event.user.name, role:event.user.role } : null }))}; }
async function notifyUser(userId:string, title:string, body:string, actionUrl='/cuenta', priority='NORMAL', type='ORDER'){
  await prisma.notification.create({ data:{ userId, title, body, actionUrl, priority, type }}).catch(()=>null);
}
async function notifyStaff(permission:string, title:string, body:string, actionUrl='/admin', priority='NORMAL', type='ORDER') {
  const roles = await prisma.role.findMany({ where:{ active:true, permissions:{ some:{ permission } } }, select:{ slug:true } });
  const roleSlugs = roles.map(role=>role.slug);
  const staff = await prisma.user.findMany({
    where:{ blocked:false, OR:[{ role:'ADMIN' }, roleSlugs.length ? { role:{ in:roleSlugs } } : { role:'__none__' }] },
    select:{ id:true },
  });
  if (!staff.length) return;
  await prisma.notification.createMany({
    data:staff.map(user=>({ userId:user.id, title, body, actionUrl, priority, type })),
  }).catch(()=>null);
}
async function createOrderEvent(orderId:string, userId:string|undefined, type:string, title:string, body?:string, metadata?:unknown) {
  await prisma.orderEvent.create({ data:{ orderId, userId, type, title, body, metadata:metadata ? JSON.stringify(metadata) : undefined } }).catch(()=>null);
}

async function calculateDiscount(code:string|undefined, subtotal:number) {
  if (!code) return { discount:0, promo:null as any };
  const promo = await prisma.promoCode.findUnique({ where:{ code:code.trim().toUpperCase() } });
  if (!promo || !promo.active) throw new Error('Cupón inválido o inactivo.');
  if (promo.expiresAt && promo.expiresAt < new Date()) throw new Error('Este cupón ya expiró.');
  if (promo.maxUses !== null && promo.maxUses !== undefined && promo.usedCount >= promo.maxUses) throw new Error('Este cupón alcanzó su límite de uso.');
  if (subtotal < promo.minSubtotal) throw new Error(`Este cupón requiere un subtotal mínimo de RD$ ${centsToUnit(promo.minSubtotal)}.`);
  const percentDiscount = promo.type === 'PERCENT' ? Math.round(subtotal * Math.min(Math.max(promo.percent, 0), 100) / 100) : 0;
  const amountDiscount = promo.type === 'AMOUNT' ? Math.max(promo.amount, 0) : 0;
  return { discount:Math.min(subtotal, Math.max(percentDiscount, amountDiscount)), promo };
}

router.post('/checkout', requireAuth, async (req, res) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message:'Checkout inválido', errors:parsed.error.flatten() });
  const { items, country, province, city, addressLine, promoCode, paymentMethodId } = parsed.data;
  const products = await prisma.product.findMany({ where: { id: { in: items.map(i=>i.productId) } }});
  const currency = country === 'US' ? 'USD' : 'DOP';
  let subtotal = 0;
  for (const item of items) {
    const product = products.find(p=>p.id===item.productId);
    if (!product) return res.status(404).json({ message:'Producto no encontrado' });
    if (['SOLD_OUT','UPCOMING'].includes(product.status)) return res.status(409).json({ message:`${product.name} no está disponible para compra.` });
    if (product.stock < item.quantity) return res.status(409).json({ message:`Stock insuficiente para ${product.name}` });
    subtotal += (country === 'US' ? (product.priceUsd || product.price) : product.price) * item.quantity;
  }
  let promo:any = null;
  let discount = 0;
  try {
    const promoResult = await calculateDiscount(promoCode, subtotal);
    discount = promoResult.discount;
    promo = promoResult.promo;
  } catch (err:any) {
    return res.status(400).json({ message:err.message || 'Cupón inválido' });
  }
  let shipping = 0;
  let shippingStatus = 'CONFIRMADO';
  let awaitingCustomerApproval = false;
  let paymentMethod:any = null;
  if (paymentMethodId) {
    paymentMethod = await prisma.paymentMethod.findFirst({ where:{ id:paymentMethodId, userId:req.user!.id, active:true } });
    if (!paymentMethod) return res.status(400).json({ message:'Metodo de pago no disponible.' });
  }
  if (country === 'RD') {
    const zone = await prisma.shippingZone.findFirst({ where: { country, province, city, active:true }});
    if (zone && !zone.requiresConfirmation) shipping = zone.price;
    else { shippingStatus = 'ENVÍO PENDIENTE DE CONFIRMACIÓN'; awaitingCustomerApproval = true; }
  } else {
    const zone = await prisma.shippingZone.findFirst({ where: { country:'US', active:true, requiresConfirmation:false }});
    if (zone) shipping = zone.price;
    else { shippingStatus = 'ENVÍO PENDIENTE DE CONFIRMACIÓN'; awaitingCustomerApproval = true; }
  }
  const order = await prisma.$transaction(async tx => {
    const status = awaitingCustomerApproval ? 'AWAITING_SHIPPING_CONFIRMATION' : 'PROCESSING';
    const total = Math.max(subtotal - discount, 0) + shipping;
    const paymentStatus = paymentMethod ? 'PENDING_CAPTURE' : 'PENDING';
    const created = await tx.order.create({ data: { userId:req.user!.id, subtotal, discount, shipping, total, country, currency, addressLine, shippingStatus, awaitingCustomerApproval, status, promoCodeId:promo?.id, paymentStatus, paymentProvider:paymentMethod ? 'SAVED_METHOD' : 'MANUAL', paymentReference:paymentMethod?.id || null }} as any);
    if (promo) await tx.promoCode.update({ where:{ id:promo.id }, data:{ usedCount:{ increment:1 } } });
    await tx.paymentTransaction.create({ data:{ orderId:created.id, provider:paymentMethod ? 'SAVED_METHOD' : 'MANUAL', status:paymentStatus, amount:total, currency, reference:paymentMethod?.id || undefined, metadata:paymentMethod ? JSON.stringify({ brand:paymentMethod.brand, last4:paymentMethod.last4 }) : undefined } });
    for (const item of items) {
      const product = products.find(p=>p.id===item.productId)!;
      await tx.orderItem.create({ data:{ orderId:created.id, productId:product.id, quantity:item.quantity, price:(country === 'US' ? (product.priceUsd || product.price) : product.price) }});
      await tx.product.update({ where:{ id:product.id }, data:{ stock:{ decrement:item.quantity } }});
      await tx.inventoryMovement.create({ data:{ productId:product.id, type:'SALE', quantity:-item.quantity, reason:'Venta en checkout', reference:created.id } });
    }
    await tx.orderEvent.create({ data:{ orderId:created.id, userId:req.user!.id, type:'CREATED', title:'Pedido creado', body:awaitingCustomerApproval ? 'Pendiente de confirmación manual de envío.' : 'Pedido enviado a procesamiento.', metadata:JSON.stringify({ items:items.length, total:centsToUnit(total), currency }) } });
    await tx.notification.create({ data:{ userId:req.user!.id, title:'Pedido creado', body: awaitingCustomerApproval ? 'Tu pedido queda pendiente de confirmación del envío. Te notificaremos el total final.' : 'Tu pedido está siendo procesado.', actionUrl:'/cuenta', type:'ORDER', priority:awaitingCustomerApproval?'HIGH':'NORMAL' }});
    return created;
  });
  await notifyStaff('orders', awaitingCustomerApproval ? 'Pedido pendiente de envío' : 'Nuevo pedido', awaitingCustomerApproval ? `El pedido ${order.id} necesita confirmación manual de envío.` : `El pedido ${order.id} ya está listo para procesarse.`, '/admin', awaitingCustomerApproval ? 'HIGH' : 'NORMAL', 'ORDER');
  res.status(201).json(toOrder(order));
});

router.get('/mine', requireAuth, async (req, res) => {
  const orders = await prisma.order.findMany({ where:{ userId:req.user!.id }, include:{ items:{ include:{ product:true }},events:{take:8,orderBy:{createdAt:'desc'},include:{user:{select:{id:true,name:true,role:true}}}}}, orderBy:{ createdAt:'desc' }});
  res.json(orders.map(toOrder));
});

router.post('/:id/customer-decision', requireAuth, async (req, res) => {
  const parsed = z.object({ decision:z.enum(['ACCEPT','CANCEL']) }).safeParse(req.body);
  if(!parsed.success) return res.status(400).json({ message:'Decisión inválida' });
  const order = await prisma.order.findFirst({ where:{ id:req.params.id, userId:req.user!.id }, include:{ items:true }});
  if(!order) return res.status(404).json({ message:'Pedido no encontrado' });
  if(!order.awaitingCustomerApproval) return res.status(409).json({ message:'Este pedido no requiere confirmación.' });
  if(parsed.data.decision === 'CANCEL'){
    const updated = await prisma.$transaction(async tx=>{
      for(const item of order.items) {
        await tx.product.update({ where:{ id:item.productId }, data:{ stock:{ increment:item.quantity } }});
        await tx.inventoryMovement.create({ data:{ productId:item.productId, type:'RETURN', quantity:item.quantity, reason:'Pedido cancelado por cliente', reference:order.id } });
      }
      await tx.orderEvent.create({ data:{ orderId:order.id, userId:req.user!.id, type:'CUSTOMER_CANCELLED_SHIPPING', title:'Cliente canceló la tarifa de envío', body:'El pedido fue cancelado por el cliente al rechazar la tarifa.' } });
      return tx.order.update({ where:{id:order.id}, data:{ status:'CANCELLED', awaitingCustomerApproval:false, customerDecisionAt:new Date(), shippingStatus:'Cancelado por el cliente' }, include:{items:{include:{product:true}},events:{take:8,orderBy:{createdAt:'desc'},include:{user:{select:{id:true,name:true,role:true}}}}} });
    });
    await notifyUser(order.userId, 'Pedido cancelado', 'Cancelaste la confirmación del costo de envío.');
    await notifyStaff('orders', 'Pedido cancelado por cliente', `El cliente canceló el pedido ${order.id} al rechazar la tarifa de envío.`, '/admin', 'HIGH', 'ORDER');
    return res.json(toOrder(updated));
  }
  const updated = await prisma.$transaction(async tx=>{
    await tx.orderEvent.create({ data:{ orderId:order.id, userId:req.user!.id, type:'CUSTOMER_ACCEPTED_SHIPPING', title:'Cliente aceptó la tarifa de envío', body:'El pedido vuelve a procesamiento.' } });
    return tx.order.update({ where:{id:order.id}, data:{ status:'PROCESSING', awaitingCustomerApproval:false, customerDecisionAt:new Date(), shippingStatus:'Tarifa aceptada por cliente' }, include:{items:{include:{product:true}},events:{take:8,orderBy:{createdAt:'desc'},include:{user:{select:{id:true,name:true,role:true}}}}} });
  });
  await notifyUser(order.userId, 'Pedido confirmado', 'Aceptaste la tarifa de envío. Tu pedido está siendo procesado.');
  await notifyStaff('orders', 'Tarifa aceptada', `El cliente aceptó la tarifa del pedido ${order.id}.`, '/admin', 'NORMAL', 'ORDER');
  res.json(toOrder(updated));
});

export default router;
