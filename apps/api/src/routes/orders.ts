import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { sendMail } from '../email.js';
import { emailTemplates } from '../emailTemplates.js';
const router = Router();

const unitToCents = (v:number)=>Math.round(Number(v||0)*100);
const centsToUnit = (v:number|null|undefined)=>Math.round((v??0)/100);
function variantDisplayName(variant:any){
  const explicit=String(variant?.name||'').trim();
  const parts=[variant?.color,variant?.size,variant?.model,variant?.lens].map(value=>String(value||'').trim()).filter(Boolean);
  return explicit||parts.join(' / ')||'Variante';
}
const checkoutSchema = z.object({
  items: z.array(z.object({ productId:z.string(), variantId:z.string().optional().nullable(), quantity:z.number().int().positive() })).min(1),
  country: z.enum(['RD','US']),
  province: z.string().optional(),
  city: z.string().optional(),
  addressLine: z.string().min(5),
  promoCode: z.string().optional(),
  paymentMethodId: z.string().optional(),
});
function toOrder(o:any){ return {...o, subtotal:centsToUnit(o.subtotal), discount:centsToUnit(o.discount), shipping:centsToUnit(o.shipping), total:centsToUnit(o.total), items:o.items?.map((i:any)=>({...i,price:centsToUnit(i.price),variant:i.variant?{id:i.variant.id,name:variantDisplayName(i.variant),sku:i.variant.sku,color:i.variant.color,size:i.variant.size,model:i.variant.model,lens:i.variant.lens}:null})), events:o.events?.map((event:any)=>({...event, actor:event.user ? { id:event.user.id, name:event.user.name, role:event.user.role } : null }))}; }
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
  const products = await prisma.product.findMany({ where: { id: { in: items.map(i=>i.productId) } }, include:{variants:true}});
  const currency = country === 'US' ? 'USD' : 'DOP';
  let subtotal = 0;
  for (const item of items) {
    const product = products.find(p=>p.id===item.productId);
    if (!product) return res.status(404).json({ message:'Producto no encontrado' });
    if (['SOLD_OUT','UPCOMING'].includes(product.status)) return res.status(409).json({ message:`${product.name} no está disponible para compra.` });
    const variant = item.variantId ? product.variants.find(v=>v.id===item.variantId&&v.active) : null;
    if (item.variantId && !variant) return res.status(404).json({ message:'Variante no encontrada' });
    const availableStock = variant ? variant.stock : product.stock;
    if (availableStock < item.quantity) return res.status(409).json({ message:`Stock insuficiente para ${product.name}${variant?` - ${variant.name}`:''}` });
    const unitPrice = variant?.price || (country === 'US' ? (product.priceUsd || product.price) : product.price);
    const unitPriceUsd = variant?.priceUsd || (product.priceUsd || product.price);
    subtotal += (country === 'US' ? unitPriceUsd : unitPrice) * item.quantity;
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
    const status = 'PENDING';
    const total = Math.max(subtotal - discount, 0) + shipping;
    const paymentStatus = 'AWAITING_ADMIN_CONFIRMATION';
    const created = await tx.order.create({ data: { userId:req.user!.id, subtotal, discount, shipping, total, country, currency, addressLine, shippingStatus, awaitingCustomerApproval, status, promoCodeId:promo?.id, paymentStatus, paymentProvider:'WHATSAPP', paymentReference:paymentMethod?.id || null, salesChannel:'WHATSAPP', confirmationStatus:'AWAITING_ADMIN_CONFIRMATION', inventoryCommitted:false }} as any);
    if (promo) await tx.promoCode.update({ where:{ id:promo.id }, data:{ usedCount:{ increment:1 } } });
    await tx.paymentTransaction.create({ data:{ orderId:created.id, provider:'WHATSAPP', status:'PENDING_CONFIRMATION', amount:total, currency, reference:paymentMethod?.id || undefined, metadata:JSON.stringify({ source:'checkout_whatsapp', brand:paymentMethod?.brand, last4:paymentMethod?.last4 }) } });
    for (const item of items) {
      const product = products.find(p=>p.id===item.productId)!;
      const variant = item.variantId ? product.variants.find(v=>v.id===item.variantId&&v.active) : null;
      const unitPrice = country === 'US' ? (variant?.priceUsd || product.priceUsd || product.price) : (variant?.price || product.price);
      await tx.orderItem.create({ data:{ orderId:created.id, productId:product.id, variantId:variant?.id || null, quantity:item.quantity, price:unitPrice }});
    }
    await tx.orderEvent.create({ data:{ orderId:created.id, userId:req.user!.id, type:'CREATED', title:'Pedido pendiente de confirmacion', body:'Tu pedido fue enviado por WhatsApp. La venta se registra cuando admin confirme el pago.', metadata:JSON.stringify({ items:items.length, total:centsToUnit(total), currency }) } });
    await tx.notification.create({ data:{ userId:req.user!.id, title:'Pedido recibido', body:'Recibimos tu solicitud. Confirmaremos la disponibilidad y el pago antes de procesarlo.', actionUrl:'/cuenta', type:'ORDER', priority:'HIGH' }});
    return created;
  });
  await notifyStaff('orders', 'Pedido pendiente de confirmacion', `El pedido ${order.id} llego por WhatsApp. Confirma el pago antes de descontar inventario.`, '/dixnissowner', 'HIGH', 'ORDER');
  await sendMail({ to:req.user!.email, ...emailTemplates.orderReceived({ orderId:order.id, total:centsToUnit(order.total), currency:order.currency }) }).catch(()=>null);
  res.status(201).json(toOrder(order));
});

router.get('/mine', requireAuth, async (req, res) => {
  const orders = await prisma.order.findMany({ where:{ userId:req.user!.id }, include:{ items:{ include:{ product:true, variant:true }},events:{take:8,orderBy:{createdAt:'desc'},include:{user:{select:{id:true,name:true,role:true}}}}}, orderBy:{ createdAt:'desc' }});
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
      if(order.inventoryCommitted) for(const item of order.items) {
        if(item.variantId) await tx.productVariant.update({ where:{ id:item.variantId }, data:{ stock:{ increment:item.quantity } }});
        else await tx.product.update({ where:{ id:item.productId }, data:{ stock:{ increment:item.quantity } }});
        await tx.inventoryMovement.create({ data:{ productId:item.productId, type:'RETURN', quantity:item.quantity, reason:'Pedido cancelado por cliente', reference:order.id, variantId:item.variantId||undefined } });
      }
      await tx.orderEvent.create({ data:{ orderId:order.id, userId:req.user!.id, type:'CUSTOMER_CANCELLED_SHIPPING', title:'Cliente canceló la tarifa de envío', body:'El pedido fue cancelado por el cliente al rechazar la tarifa.' } });
      return tx.order.update({ where:{id:order.id}, data:{ status:'CANCELLED', awaitingCustomerApproval:false, customerDecisionAt:new Date(), shippingStatus:'Cancelado por el cliente' }, include:{items:{include:{product:true,variant:true}},events:{take:8,orderBy:{createdAt:'desc'},include:{user:{select:{id:true,name:true,role:true}}}}} });
    });
    await notifyUser(order.userId, 'Pedido cancelado', 'Cancelaste la confirmación del costo de envío.');
    await notifyStaff('orders', 'Pedido cancelado por cliente', `El cliente canceló el pedido ${order.id} al rechazar la tarifa de envío.`, '/admin', 'HIGH', 'ORDER');
    return res.json(toOrder(updated));
  }
  const updated = await prisma.$transaction(async tx=>{
    await tx.orderEvent.create({ data:{ orderId:order.id, userId:req.user!.id, type:'CUSTOMER_ACCEPTED_SHIPPING', title:'Cliente aceptó la tarifa de envío', body:'El pedido vuelve a procesamiento.' } });
    return tx.order.update({ where:{id:order.id}, data:{ status:'PENDING', awaitingCustomerApproval:false, customerDecisionAt:new Date(), shippingStatus:'Tarifa aceptada por cliente' }, include:{items:{include:{product:true,variant:true}},events:{take:8,orderBy:{createdAt:'desc'},include:{user:{select:{id:true,name:true,role:true}}}}} });
  });
  await notifyUser(order.userId, 'Tarifa aceptada', 'Aceptaste la tarifa de envio. El pedido queda pendiente de confirmacion de pago.');
  await notifyStaff('orders', 'Tarifa aceptada', `El cliente acepto la tarifa del pedido ${order.id}. Aun debes confirmar la venta.`, '/dixnissowner', 'HIGH', 'ORDER');
  res.json(toOrder(updated));
});

export default router;
