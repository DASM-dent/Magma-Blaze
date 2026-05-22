import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';
import { requireAuth, requireStaff } from '../middleware/auth.js';
import { sendMail } from '../email.js';
import { emailTemplates } from '../emailTemplates.js';

const router = Router();
router.use(requireAuth, requireStaff);

const USD_EXCHANGE_RATE = 48;
const roundMoney = (v:number)=>Math.round((Number(v || 0) + Number.EPSILON) * 100) / 100;
const rdToUsd = (priceRd:number)=>roundMoney(priceRd / USD_EXCHANGE_RATE);
const centsToUnit = (v:number|null|undefined)=>roundMoney((v??0)/100);
const unitToCents = (v:number)=>Math.round(Number(v||0)*100);
const DISCOUNT_TYPES = ['NONE','PERCENT','FIXED_AMOUNT','FIXED_PRICE'] as const;
const slugify=(v:string)=>v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)+/g,'')||`item-${Date.now()}`;
const ORDER_STATUSES = ['PENDING','AWAITING_SHIPPING_CONFIRMATION','AWAITING_CUSTOMER_APPROVAL','PROCESSING','PACKED','SHIPPED','DELIVERED','CANCELLED'] as const;
const ORDER_STATUS_LABELS: Record<string,string> = {
  PENDING:'Pendiente',
  AWAITING_SHIPPING_CONFIRMATION:'Esperando tarifa de envío',
  AWAITING_CUSTOMER_APPROVAL:'Esperando aprobación del cliente',
  PROCESSING:'Procesando',
  PACKED:'Empaquetado',
  SHIPPED:'Enviado',
  DELIVERED:'Entregado',
  CANCELLED:'Cancelado',
};
const ADMIN_PERMISSIONS = [
  { key:'dashboard', label:'Dashboard', description:'Ver métricas generales.' },
  { key:'products', label:'Productos', description:'Crear y editar productos.' },
  { key:'categories', label:'Categorías', description:'Administrar categorías.' },
  { key:'orders', label:'Pedidos', description:'Gestionar pedidos y fulfillment.' },
  { key:'drops', label:'Drops', description:'Controlar lanzamientos y lookbook.' },
  { key:'models', label:'Modelos', description:'Administrar fotos de modelos.' },
  { key:'content', label:'CMS', description:'Editar contenido público.' },
  { key:'shipping', label:'Envíos', description:'Gestionar zonas y tarifas.' },
  { key:'users', label:'Usuarios', description:'Crear y administrar usuarios.' },
  { key:'finance', label:'Costos y margen', description:'Ver costos y márgenes.' },
  { key:'sales', label:'Ventas', description:'Registrar ventas externas y descontar inventario.' },
  { key:'reports', label:'Reportes', description:'Ver reportes de ventas, pagos e inventario.' },
  { key:'coupons', label:'Cupones', description:'Crear y administrar cupones.' },
  { key:'inventory', label:'Inventario', description:'Ajustar stock y revisar movimientos.' },
  { key:'settings', label:'Control del sitio', description:'Cambiar tienda, drop y mantenimiento.' },
  { key:'security', label:'Seguridad', description:'Ver auditoría.' },
  { key:'notifications', label:'Notificaciones internas', description:'Ver y gestionar avisos operativos.' },
  { key:'support', label:'Ayuda y tickets', description:'Responder tickets de clientes.' },
  { key:'roles', label:'Roles y permisos', description:'Crear roles y asignar permisos.' },
];
async function audit(userId:string|undefined, action:string, ip?:string){ await prisma.auditLog.create({data:{userId,action,ip}}).catch(()=>null); }
async function notifyStaff(permission:string, title:string, body:string, actionUrl?:string, priority='NORMAL', type='SYSTEM') {
  const roles = await prisma.role.findMany({
    where:{ active:true, permissions:{ some:{ permission } } },
    select:{ slug:true },
  });
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
async function notifyCustomer(userId:string, title:string, body:string, actionUrl?:string, priority='NORMAL', type='ORDER') {
  await prisma.notification.create({ data:{ userId, title, body, actionUrl, priority, type } }).catch(()=>null);
}
async function createOrderEvent(orderId:string, userId:string|undefined, type:string, title:string, body?:string, metadata?:unknown) {
  await prisma.orderEvent.create({
    data:{ orderId, userId, type, title, body, metadata:metadata ? JSON.stringify(metadata) : undefined },
  }).catch(()=>null);
}
function productImages(p:any){
  const images=Array.isArray(p.images)?p.images:[];
  const normalized=images.filter((image:any)=>image?.url).sort((a:any,b:any)=>(a.sortOrder??0)-(b.sortOrder??0)).map((image:any,index:number)=>({id:image.id,url:image.url,alt:image.alt??p.name,sortOrder:image.sortOrder??index}));
  if(!normalized.length&&p.imageUrl)normalized.push({id:'legacy',url:p.imageUrl,alt:p.name,sortOrder:0});
  return normalized;
}
function normalizeProductImages(input:any,fallbackUrl?:string,alt?:string){
  const source=Array.isArray(input)?input:[];
  const unique=new Map<string,{url:string;alt?:string|null;sortOrder:number}>();
  source.forEach((image:any,index:number)=>{const url=String(image?.url||'').trim(); if(!url)return; unique.set(url,{url,alt:image?.alt||alt||null,sortOrder:index});});
  if(!unique.size&&fallbackUrl)unique.set(fallbackUrl,{url:fallbackUrl,alt:alt||null,sortOrder:0});
  return [...unique.values()].map((image,index)=>({...image,sortOrder:index}));
}
function variantDisplayName(variant:any){
  const explicit=String(variant?.name||'').trim();
  const parts=[variant?.color,variant?.size,variant?.model,variant?.lens].map(value=>String(value||'').trim()).filter(Boolean);
  return explicit||parts.join(' / ')||'Variante';
}
function normalizeProductVariants(input:any){
  const source=Array.isArray(input)?input:[];
  return source.map((variant:any,index:number)=>({
    id:String(variant?.id||'').trim()||undefined,
    name:variantDisplayName(variant),
    sku:String(variant?.sku||'').trim()||null,
    color:String(variant?.color||'').trim()||null,
    size:String(variant?.size||'').trim()||null,
    model:String(variant?.model||'').trim()||null,
    lens:String(variant?.lens||'').trim()||null,
    price:variant?.price!==undefined&&variant?.price!==null&&Number(variant.price)>0?unitToCents(Number(variant.price)):null,
    priceUsd:variant?.priceUsd!==undefined&&variant?.priceUsd!==null&&Number(variant.priceUsd)>0?unitToCents(Number(variant.priceUsd)):null,
    stock:Math.max(0,Math.floor(Number(variant?.stock||0))),
    imageUrl:String(variant?.imageUrl||'').trim()||null,
    active:variant?.active!==false,
    sortOrder:Number.isFinite(Number(variant?.sortOrder))?Number(variant.sortOrder):index,
  })).filter((variant:any)=>variant.name!=='Variante'||variant.sku||variant.color||variant.size||variant.model||variant.lens||variant.imageUrl||variant.stock>0);
}
function activeDiscount(p:any,now=new Date()){
  const type=DISCOUNT_TYPES.includes(p.discountType)?p.discountType:'NONE';
  const value=Number(p.discountValue||0);
  const startsAt=p.discountStartsAt?new Date(p.discountStartsAt):null;
  const endsAt=p.discountEndsAt?new Date(p.discountEndsAt):null;
  const inWindow=(!startsAt||startsAt<=now)&&(!endsAt||endsAt>=now);
  if(!p.discountActive||type==='NONE'||value<=0||!inWindow)return null;
  const baseCents=Number(p.price||0);
  let finalCents=baseCents;
  if(type==='PERCENT')finalCents=Math.round(baseCents*(1-Math.min(value,100)/100));
  if(type==='FIXED_AMOUNT')finalCents=baseCents-value;
  if(type==='FIXED_PRICE')finalCents=value;
  finalCents=Math.max(0,Math.min(baseCents,finalCents));
  if(finalCents>=baseCents)return null;
  const savedCents=baseCents-finalCents;
  const percent=baseCents?Math.round((savedCents/baseCents)*100):0;
  return {type,value,finalCents,savedCents,percent};
}
function discountInputToDb(data:any,current?:any){
  const hasType=data.discountType!==undefined;
  const type=DISCOUNT_TYPES.includes(data.discountType)?data.discountType:(current?.discountType||'NONE');
  const active=data.discountActive!==undefined?Boolean(data.discountActive):Boolean(current?.discountActive);
  const rawValue=data.discountValue!==undefined?Number(data.discountValue||0):(type==='PERCENT'?Number(current?.discountValue||0):centsToUnit(current?.discountValue));
  return {
    ...(data.discountActive!==undefined||hasType?{discountActive:active&&type!=='NONE'}:{}),
    ...(hasType?{discountType:active&&type!=='NONE'?type:'NONE'}:{}),
    ...(data.discountValue!==undefined?{discountValue:type==='PERCENT'?Math.round(Math.min(rawValue,100)):unitToCents(rawValue)}:{}),
    ...(data.discountLabel!==undefined?{discountLabel:data.discountLabel?.trim()||null}:{}),
    ...(data.discountStartsAt!==undefined?{discountStartsAt:data.discountStartsAt?new Date(data.discountStartsAt):null}:{}),
    ...(data.discountEndsAt!==undefined?{discountEndsAt:data.discountEndsAt?new Date(data.discountEndsAt):null}:{}),
  };
}
function toProductVariant(variant:any){
  return {
    ...variant,
    name:variantDisplayName(variant),
    color:variant.color||null,
    size:variant.size||null,
    model:variant.model||null,
    lens:variant.lens||null,
    price:variant.price!==null&&variant.price!==undefined?centsToUnit(variant.price):null,
    priceUsd:variant.priceUsd!==null&&variant.priceUsd!==undefined?centsToUnit(variant.priceUsd):null,
  };
}
function toProduct(p:any){
  const cost=centsToUnit(p.cost), price=centsToUnit(p.price), savedPriceUsd=centsToUnit(p.priceUsd);
  const priceUsd=savedPriceUsd>0?savedPriceUsd:rdToUsd(price);
  const images=productImages(p);
  const mainImage=images[0]?.url||p.imageUrl;
  const active=activeDiscount(p);
  const salePrice=active?centsToUnit(active.finalCents):price;
  const salePriceUsd=active?rdToUsd(salePrice):priceUsd;
  const variants=Array.isArray(p.variants)?p.variants.filter((variant:any)=>variant.active!==false).sort((a:any,b:any)=>(a.sortOrder??0)-(b.sortOrder??0)).map(toProductVariant):[];
  const activeVariants=variants.filter((variant:any)=>variant.active);
  const totalVariantStock=activeVariants.reduce((sum:number,variant:any)=>sum+Number(variant.stock||0),0);
  const hasVariants=activeVariants.length>0;
  const availableStock=hasVariants?totalVariantStock:Number(p.stock||0);
  return {...p, imageUrl:mainImage, images, variants, totalVariantStock, availableStock, variantCount:activeVariants.length, price, priceUsd, cost, profit:salePrice-cost, margin: salePrice? Number((((salePrice-cost)/salePrice)*100).toFixed(1)):0, salePrice, salePriceUsd, comparePrice:active?price:null, comparePriceUsd:active?priceUsd:null, discountValue:p.discountType==='PERCENT'?Number(p.discountValue||0):centsToUnit(p.discountValue), discount:{active:Boolean(active),type:p.discountType||'NONE',label:p.discountLabel||null,percent:active?.percent||0,amount:active?centsToUnit(active.savedCents):0,startsAt:p.discountStartsAt,endsAt:p.discountEndsAt}, mainImage, categoryName:p.category?.name??'Sin categoria', isOutOfStock:availableStock<=0||p.status==='SOLD_OUT', isNew:p.status==='NEW', isBestSeller:p.status==='BESTSELLER', isLimitedDrop:p.status==='LIMITED_DROP'};
}
function toOrder(o:any){ return {...o, subtotal:centsToUnit(o.subtotal), discount:centsToUnit(o.discount), shipping:centsToUnit(o.shipping), total:centsToUnit(o.total), items:o.items?.map((i:any)=>({...i,price:centsToUnit(i.price)})), events:o.events?.map((event:any)=>({...event, actor:event.user ? { id:event.user.id, name:event.user.name, role:event.user.role } : null }))}; }
function pdfSafe(value: unknown) {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .slice(0, 120);
}
function makeInvoicePdfDataUrl(order:any) {
  const symbol = order.currency === 'USD' ? 'US$' : 'RD$';
  const lines = [
    'Magma Blaze - Factura de envio',
    `Pedido: ${order.id}`,
    `Cliente: ${order.user?.name ?? ''}`,
    `Correo: ${order.user?.email ?? ''}`,
    `Estado: ${order.status}`,
    `Subtotal: ${symbol} ${centsToUnit(order.subtotal)}`,
    `Envio: ${symbol} ${centsToUnit(order.shipping)}`,
    `Total: ${symbol} ${centsToUnit(order.total)}`,
    `Tracking: ${order.shippingReference ?? ''}`,
    `Chofer: ${order.driverName ?? ''} ${order.driverPhone ?? ''}`,
    `Parada: ${order.deliveryPlace ?? ''}`,
  ];
  const content = `BT /F1 14 Tf 50 760 Td ${lines.map((line, index)=>`${index ? '0 -24 Td ' : ''}(${pdfSafe(line)}) Tj`).join(' ')} ET`;
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${Buffer.byteLength(content, 'latin1')} >> stream\n${content}\nendstream endobj`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${obj}\n`;
  }
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map(offset=>`${String(offset).padStart(10, '0')} 00000 n `).join('\n');
  pdf += `\ntrailer << /Root 1 0 R /Size ${objects.length + 1} >>\nstartxref\n${xref}\n%%EOF`;
  return `data:application/pdf;base64,${Buffer.from(pdf, 'latin1').toString('base64')}`;
}

function permissionForPath(path: string) {
  if (path.startsWith('/products')) return 'products';
  if (path.startsWith('/categories')) return 'categories';
  if (path.startsWith('/orders')) return 'orders';
  if (path.startsWith('/drops')) return 'drops';
  if (path.startsWith('/models')) return 'models';
  if (path.startsWith('/content') || path.startsWith('/news') || path.startsWith('/popups')) return 'content';
  if (path.startsWith('/shipping')) return 'shipping';
  if (path.startsWith('/users')) return 'users';
  if (path.startsWith('/reports')) return 'reports';
  if (path.startsWith('/sales')) return 'sales';
  if (path.startsWith('/coupons')) return 'coupons';
  if (path.startsWith('/inventory')) return 'inventory';
  if (path.startsWith('/settings')) return 'settings';
  if (path.startsWith('/logs') || path.startsWith('/security-bans')) return 'security';
  if (path.startsWith('/notifications')) return 'notifications';
  if (path.startsWith('/tickets')) return 'support';
  if (path.startsWith('/roles') || path.startsWith('/permissions')) return 'roles';
  if (path.startsWith('/dashboard')) return 'dashboard';
  return 'dashboard';
}

router.use(async (req, res, next) => {
  if (req.user?.role === 'ADMIN') return next();
  const permission = permissionForPath(req.path);
  const allowed = await prisma.rolePermission.findFirst({
    where: { permission, role: { slug:req.user!.role, active:true } },
    select: { id:true },
  }).catch(()=>null);
  if (!allowed) return res.status(403).json({ message:'Tu rol no tiene permiso para esta sección.' });
  next();
});

router.get('/dashboard', async (_req,res)=>{
  const now = new Date();
  const since24 = new Date(now.getTime()-24*60*60*1000);
  const since7 = new Date(now.getTime()-7*24*60*60*1000);
  const since30 = new Date(now.getTime()-30*24*60*60*1000);
  const [users,products,orders,revenue,views,lowStock,activeDrops,pendingOrders,recent24,allOrders,bestProducts,categoryStats,settings,drops,metrics,notifications] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.order.count(),
    prisma.order.aggregate({_sum:{total:true}}),
    prisma.product.aggregate({_sum:{views:true}}),
    prisma.product.count({where:{stock:{lte:5}}}),
    prisma.drop.count({where:{OR:[{isActive:true},{lockedMode:true}]}}),
    prisma.order.count({where:{OR:[{status:'PENDING'},{status:'AWAITING_SHIPPING_CONFIRMATION'},{status:'AWAITING_CUSTOMER_APPROVAL'},{status:'PROCESSING'}]}}),
    prisma.order.findMany({where:{createdAt:{gte:since24}},take:10,orderBy:{createdAt:'desc'},include:{user:true,items:{include:{product:true}},events:{take:5,orderBy:{createdAt:'desc'},include:{user:{select:{id:true,name:true,role:true}}}}}}),
    prisma.order.findMany({take:500,orderBy:{createdAt:'desc'},include:{user:true,items:{include:{product:true}},events:{take:6,orderBy:{createdAt:'desc'},include:{user:{select:{id:true,name:true,role:true}}}}}}),
    prisma.product.findMany({take:8,orderBy:{views:'desc'},include:{category:true,orderItems:true}}),
    prisma.category.findMany({orderBy:{sortOrder:'asc'},include:{products:true}}),
    prisma.siteSetting.findMany(),
    prisma.drop.findMany({take:5,orderBy:{startsAt:'desc'}}),
    prisma.storeMetric.findMany({orderBy:{createdAt:'asc'}}),
    prisma.notification.findMany({take:8,where:{read:false},orderBy:{createdAt:'desc'},include:{user:{select:{id:true,name:true,email:true,role:true}}}}),
  ]);
  const productList=await prisma.product.findMany({include:{orderItems:true,category:true}});
  const activeOrders = allOrders.filter(o=>o.status!=='CANCELLED');
  const totalRevenue = revenue._sum.total??0;
  const revenue24 = activeOrders.filter(o=>o.createdAt>=since24).reduce((s,o)=>s+o.total,0);
  const revenue7 = activeOrders.filter(o=>o.createdAt>=since7).reduce((s,o)=>s+o.total,0);
  const revenue30 = activeOrders.filter(o=>o.createdAt>=since30).reduce((s,o)=>s+o.total,0);
  const totalCost = activeOrders.reduce((sum,order)=>sum+order.items.reduce((itemSum,item)=>itemSum+((item.product?.cost||0)*item.quantity),0),0);
  const totalProfit = totalRevenue-totalCost;
  const unitsSold = activeOrders.reduce((sum,order)=>sum+order.items.reduce((itemSum,item)=>itemSum+item.quantity,0),0);
  const averageOrder = activeOrders.length ? totalRevenue / activeOrders.length : 0;
  const statusFunnel = ORDER_STATUSES.map(status=>({ status, count:allOrders.filter(o=>o.status===status).length }));
  const dailySales = Array.from({ length:14 }).map((_,index)=>{
    const day = new Date(now);
    day.setDate(now.getDate()-(13-index));
    const key = day.toISOString().slice(0,10);
    const dayOrders = activeOrders.filter(o=>o.createdAt.toISOString().slice(0,10)===key);
    return { date:key, orders:dayOrders.length, revenue:centsToUnit(dayOrders.reduce((s,o)=>s+o.total,0)) };
  });
  const salesByProduct = new Map<string,{id:string;name:string;quantity:number;revenue:number;stock:number}>();
  activeOrders.forEach(order=>order.items.forEach(item=>{
    const current=salesByProduct.get(item.productId)||{id:item.productId,name:item.product?.name||item.productId,quantity:0,revenue:0,stock:item.product?.stock||0};
    current.quantity+=item.quantity;
    current.revenue+=item.price*item.quantity;
    salesByProduct.set(item.productId,current);
  }));
  const topSales=[...salesByProduct.values()].sort((a,b)=>b.revenue-a.revenue).slice(0,8).map(item=>({...item,revenue:centsToUnit(item.revenue)}));
  const aiRecommendations = productList.flatMap(p=>{
    const sold=p.orderItems.reduce((q,i)=>q+i.quantity,0); const out=[] as string[];
    if(p.stock<=p.lowStockThreshold) out.push(`Stock bajo en ${p.name}: quedan ${p.stock}. Reponer antes de empujar ventas.`);
    if(p.views>10 && sold===0) out.push(`${p.name} recibe vistas pero no ventas: revisa precio, fotos o descripcion.`);
    if(sold>=3 && p.stock>0) out.push(`${p.name} muestra buena rotacion: puede funcionar como destacado o bundle.`);
    return out;
  }).slice(0,8);
  res.json({users,products,orders,revenue:centsToUnit(totalRevenue),views:views._sum.views??0,lowStock,activeDrops,pendingOrders,ordersLast24:recent24.length,conversion: orders>0&&(views._sum.views??0)>0?Number(((orders/(views._sum.views??1))*100).toFixed(1)):0,recentOrders:recent24.map(toOrder),allRecentOrders:allOrders.slice(0,8).map(toOrder),bestProducts:bestProducts.map(toProduct),categoryStats:categoryStats.map(c=>({id:c.id,name:c.name,total:c.products.length,stock:c.products.reduce((s,p)=>s+p.stock,0)})),settings:Object.fromEntries(settings.map(s=>[s.key,s.value])),drops,metrics,notifications,finance:{totalRevenue:centsToUnit(totalRevenue),totalCost:centsToUnit(totalCost),totalProfit:centsToUnit(totalProfit),margin:totalRevenue?Number(((totalProfit/totalRevenue)*100).toFixed(1)):0},sales:{revenue24:centsToUnit(revenue24),revenue7:centsToUnit(revenue7),revenue30:centsToUnit(revenue30),averageOrder:centsToUnit(averageOrder),unitsSold,statusFunnel,dailySales,topSales},aiRecommendations});
});

router.get('/categories', async (_req,res)=>res.json(await prisma.category.findMany({orderBy:[{sortOrder:'asc'},{name:'asc'}],include:{_count:{select:{products:true}}}})));
const categorySchema=z.object({name:z.string().min(2),slug:z.string().optional(),icon:z.string().min(1).max(12).default('🕶️'),imageUrl:z.string().optional().nullable(),sortOrder:z.number().int().optional()});
router.post('/categories',async(req,res)=>{const p=categorySchema.safeParse(req.body); if(!p.success)return res.status(400).json({message:'Categoría inválida',errors:p.error.flatten()}); const c=await prisma.category.create({data:{name:p.data.name,slug:p.data.slug||slugify(p.data.name),icon:p.data.icon||'🕶️',imageUrl:p.data.imageUrl||null,sortOrder:p.data.sortOrder??0}}); await audit(req.user?.id,`CATEGORY_CREATED:${c.id}`,req.ip); res.status(201).json(c);});
router.patch('/categories/:id',async(req,res)=>{const p=categorySchema.partial().safeParse(req.body); if(!p.success)return res.status(400).json({message:'Categoría inválida'}); const c=await prisma.category.update({where:{id:req.params.id},data:{...p.data,...(p.data.name&&!p.data.slug?{slug:slugify(p.data.name)}:{})}}); await audit(req.user?.id,`CATEGORY_UPDATED:${c.id}`,req.ip); res.json(c);});
router.delete('/categories/:id',async(req,res)=>{const count=await prisma.product.count({where:{categoryId:req.params.id}}); if(count>0)return res.status(409).json({message:'No puedes eliminar una categoría con productos.'}); await prisma.category.delete({where:{id:req.params.id}}); await audit(req.user?.id,`CATEGORY_DELETED:${req.params.id}`,req.ip); res.json({ok:true});});

router.get('/products',async(req,res)=>{const q=String(req.query.q||'').trim(); const status=String(req.query.status||''); const products=await prisma.product.findMany({where:{AND:[q?{OR:[{name:{contains:q}},{description:{contains:q}}]}:{},status?{status}:{}]},orderBy:{createdAt:'desc'},include:{category:true,orderItems:true,images:{orderBy:{sortOrder:'asc'}},variants:{orderBy:{sortOrder:'asc'}}}}); res.json(products.map(toProduct));});
const productSchema=z.object({name:z.string().min(2),slug:z.string().optional(),description:z.string().min(3),price:z.number().min(0),priceUsd:z.number().min(0).default(0),cost:z.number().min(0).default(0),discountActive:z.boolean().default(false),discountType:z.enum(DISCOUNT_TYPES).default('NONE'),discountValue:z.number().min(0).default(0),discountLabel:z.string().optional().nullable(),discountStartsAt:z.string().optional().nullable(),discountEndsAt:z.string().optional().nullable(),imageUrl:z.string().min(5),images:z.array(z.object({url:z.string().min(5),alt:z.string().optional().nullable(),sortOrder:z.number().int().min(0).optional()})).optional(),variants:z.array(z.object({id:z.string().optional().nullable(),name:z.string().optional().nullable(),sku:z.string().optional().nullable(),color:z.string().optional().nullable(),size:z.string().optional().nullable(),model:z.string().optional().nullable(),lens:z.string().optional().nullable(),price:z.number().min(0).optional().nullable(),priceUsd:z.number().min(0).optional().nullable(),stock:z.number().int().min(0).default(0),imageUrl:z.string().optional().nullable(),active:z.boolean().default(true),sortOrder:z.number().int().min(0).optional()})).optional(),stock:z.number().int().min(0),lowStockThreshold:z.number().int().min(0).default(5),status:z.enum(['ACTIVE','NEW','BESTSELLER','SOLD_OUT','UPCOMING','LIMITED_DROP']),categoryId:z.string().min(1)});
const PRODUCT_WRITE_TX_OPTIONS={maxWait:20000,timeout:60000};
const productAdminInclude={category:true,orderItems:true,images:{orderBy:{sortOrder:'asc' as const}},variants:{orderBy:{sortOrder:'asc' as const}}};
function productWriteError(res:any,error:any,action:string){
  console.error(`[ADMIN_PRODUCT_${action}_ERROR]`,error);
  if(error?.code==='P2028')return res.status(504).json({message:'La base de datos tardo demasiado guardando el producto. Intenta de nuevo con imagenes mas livianas o menos imagenes.'});
  return res.status(500).json({message:'No se pudo guardar el producto. Intenta nuevamente.'});
}
router.post('/products',async(req,res)=>{
  try{
  const p=productSchema.safeParse(req.body);
  if(!p.success)return res.status(400).json({message:'Producto inválido',errors:p.error.flatten()});
  const d=p.data;
  const images=normalizeProductImages(d.images,d.imageUrl,d.name);
  const variants=normalizeProductVariants(d.variants);
  const {images:_images,variants:_variants,discountActive:_discountActive,discountType:_discountType,discountValue:_discountValue,discountLabel:_discountLabel,discountStartsAt:_discountStartsAt,discountEndsAt:_discountEndsAt,...productData}=d;
  const priceUsd=d.priceUsd>0?d.priceUsd:rdToUsd(d.price);
  const prodId=await prisma.$transaction(async tx=>{
    const created=await tx.product.create({
      data:{
        ...productData,
        ...discountInputToDb(d),
        imageUrl:images[0]?.url||d.imageUrl,
        slug:d.slug||slugify(d.name),
        price:unitToCents(d.price),
        priceUsd:unitToCents(priceUsd),
        cost:unitToCents(d.cost),
        images:{create:images.map(image=>({url:image.url,alt:image.alt,sortOrder:image.sortOrder}))},
        variants:variants.length?{create:variants.map(({id:_id,...variant}:any)=>({
          ...variant,
          price:variant.price??unitToCents(d.price),
          priceUsd:variant.priceUsd??unitToCents(priceUsd),
        }))}:undefined,
      },
      select:{id:true,stock:true,variants:{select:{id:true,stock:true}}}
    });
    if(created.stock>0)await tx.inventoryMovement.create({data:{productId:created.id,type:'INITIAL',quantity:created.stock,reason:'Stock inicial',reference:created.id}});
    for(const variant of created.variants||[]){
      if(variant.stock>0)await tx.inventoryMovement.create({data:{productId:created.id,type:'INITIAL',quantity:variant.stock,reason:'Stock inicial de variante',reference:variant.id,variantId:variant.id}});
    }
    return created.id;
  },PRODUCT_WRITE_TX_OPTIONS);
  const prod=await prisma.product.findUnique({where:{id:prodId},include:productAdminInclude});
  if(!prod)return res.status(404).json({message:'Producto guardado, pero no se pudo recargar.'});
  await audit(req.user?.id,`PRODUCT_CREATED:${prod.id}`,req.ip);
  res.status(201).json(toProduct(prod));
  }catch(error){
    return productWriteError(res,error,'CREATE');
  }
});
router.patch('/products/:id',async(req,res)=>{
  try{
  const p=productSchema.partial().safeParse(req.body);
  if(!p.success)return res.status(400).json({message:'Producto inválido'});
  const current=await prisma.product.findUnique({where:{id:req.params.id}});
  if(!current)return res.status(404).json({message:'Producto no encontrado'});
  const d:any={...p.data};
  const nextVariants=p.data.variants!==undefined?normalizeProductVariants(p.data.variants):undefined;
  const discountData=discountInputToDb(d,current);
  delete d.discountActive;
  delete d.discountType;
  delete d.discountValue;
  delete d.discountLabel;
  delete d.discountStartsAt;
  delete d.discountEndsAt;
  const nextImages=p.data.images!==undefined?normalizeProductImages(p.data.images,p.data.imageUrl!==undefined?p.data.imageUrl:current.imageUrl,d.name||current.name):undefined;
  delete d.images;
  delete d.variants;
  if(nextImages!==undefined)d.imageUrl=nextImages[0]?.url||d.imageUrl||current.imageUrl;
  if(d.price!==undefined&&(d.priceUsd===undefined||Number(d.priceUsd)<=0))d.priceUsd=rdToUsd(d.price);
  if(d.priceUsd!==undefined&&Number(d.priceUsd)<=0)d.priceUsd=rdToUsd(d.price!==undefined?d.price:centsToUnit(current.price));
  if(d.price!==undefined)d.price=unitToCents(d.price);
  if(d.priceUsd!==undefined)d.priceUsd=unitToCents(d.priceUsd);
  if(d.cost!==undefined)d.cost=unitToCents(d.cost);
  if(d.name&&!d.slug)d.slug=slugify(d.name);
  const imageUpdate=nextImages!==undefined?{images:{deleteMany:{},create:nextImages.map(image=>({url:image.url,alt:image.alt,sortOrder:image.sortOrder}))}}:{};
  const prodId=await prisma.$transaction(async tx=>{
    const updated=await tx.product.update({where:{id:req.params.id},data:{...d,...discountData,...imageUpdate},select:{id:true,price:true,priceUsd:true}});
    if(p.data.stock!==undefined&&p.data.stock!==current.stock){
      const delta=p.data.stock-current.stock;
      await tx.inventoryMovement.create({data:{productId:updated.id,type:'ADJUSTMENT',quantity:delta,reason:'Ajuste desde administracion',reference:updated.id}});
    }
    if(nextVariants!==undefined){
      const submittedVariantIds=new Set(nextVariants.map((variant:any)=>String(variant.id||'').trim()).filter(Boolean));
      const existingVariants=await tx.productVariant.findMany({where:{productId:updated.id},select:{id:true}});
      for(const existingVariant of existingVariants){
        if(submittedVariantIds.has(existingVariant.id))continue;
        const used=await tx.orderItem.count({where:{variantId:existingVariant.id}});
        const movementUsed=await tx.inventoryMovement.count({where:{variantId:existingVariant.id}});
        if(used>0||movementUsed>0){
          await tx.productVariant.update({where:{id:existingVariant.id},data:{active:false,stock:0}});
          continue;
        }
        await tx.productVariant.delete({where:{id:existingVariant.id}});
      }
      for(const variant of nextVariants){
        const {id,...variantData}=variant as any;
        const dataForDb={...variantData,price:variantData.price??updated.price,priceUsd:variantData.priceUsd??updated.priceUsd};
        if(id){
          const currentVariant=await tx.productVariant.findFirst({where:{id,productId:updated.id}});
          if(currentVariant){
            const next=await tx.productVariant.update({where:{id},data:dataForDb});
            if(variant.stock!==currentVariant.stock){
              await tx.inventoryMovement.create({data:{productId:updated.id,type:'ADJUSTMENT',quantity:variant.stock-currentVariant.stock,reason:'Ajuste de variante desde producto',reference:next.id,variantId:next.id}});
            }
            continue;
          }
        }
        const createdVariant=await tx.productVariant.create({data:{...dataForDb,productId:updated.id}});
        if(createdVariant.stock>0)await tx.inventoryMovement.create({data:{productId:updated.id,type:'INITIAL',quantity:createdVariant.stock,reason:'Stock inicial de variante',reference:createdVariant.id,variantId:createdVariant.id}});
      }
    }
    return updated.id;
  },PRODUCT_WRITE_TX_OPTIONS);
  const prod=await prisma.product.findUnique({where:{id:prodId},include:productAdminInclude});
  if(!prod)return res.status(404).json({message:'Producto actualizado, pero no se pudo recargar.'});
  await audit(req.user?.id,`PRODUCT_UPDATED:${prod?.id}`,req.ip);
  res.json(toProduct(prod));
  }catch(error){
    return productWriteError(res,error,'UPDATE');
  }
});
router.delete('/products/:id',async(req,res)=>{const used=await prisma.orderItem.count({where:{productId:req.params.id}}); if(used>0){const prod=await prisma.product.update({where:{id:req.params.id},data:{status:'SOLD_OUT',stock:0},include:{category:true,orderItems:true,images:{orderBy:{sortOrder:'asc'}},variants:{orderBy:{sortOrder:'asc'}}}}); return res.json(toProduct(prod));} await prisma.wishlistItem.deleteMany({where:{productId:req.params.id}}); await prisma.modelPhoto.deleteMany({where:{productId:req.params.id}}); await prisma.product.delete({where:{id:req.params.id}}); await audit(req.user?.id,`PRODUCT_DELETED:${req.params.id}`,req.ip); res.json({ok:true});});

const productVariantSchema=z.object({name:z.string().optional().nullable(),sku:z.string().optional().nullable(),color:z.string().optional().nullable(),size:z.string().optional().nullable(),model:z.string().optional().nullable(),lens:z.string().optional().nullable(),price:z.number().min(0).optional().nullable(),priceUsd:z.number().min(0).optional().nullable(),stock:z.number().int().min(0).default(0),imageUrl:z.string().optional().nullable(),active:z.boolean().default(true),sortOrder:z.number().int().min(0).optional()});
const variantToUi=(v:any)=>({...v,name:variantDisplayName(v),color:v.color||null,size:v.size||null,model:v.model||null,lens:v.lens||null,price:v.price!==null&&v.price!==undefined?centsToUnit(v.price):null,priceUsd:v.priceUsd!==null&&v.priceUsd!==undefined?centsToUnit(v.priceUsd):null});
const variantDataToDb=(d:any,current?:any)=>{
  const out:any={...d};
  ['sku','imageUrl','color','size','model','lens'].forEach(key=>{if(out[key]!==undefined){const value=String(out[key]||'').trim(); out[key]=value||null;}});
  if(out.name!==undefined){const name=String(out.name||'').trim(); out.name=name||variantDisplayName({...current,...out});}
  if(out.price!==undefined)out.price=out.price===null?null:unitToCents(out.price);
  if(out.priceUsd!==undefined)out.priceUsd=out.priceUsd===null?null:unitToCents(out.priceUsd);
  if(out.sortOrder===undefined)delete out.sortOrder;
  return out;
};
router.get('/products/:productId/variants',async(req,res)=>{const variants=await prisma.productVariant.findMany({where:{productId:req.params.productId},orderBy:{sortOrder:'asc'}}); res.json(variants.map(variantToUi));});
router.post('/products/:productId/variants',async(req,res)=>{const product=await prisma.product.findUnique({where:{id:req.params.productId}}); if(!product)return res.status(404).json({message:'Producto no encontrado'}); const parsed=productVariantSchema.safeParse(req.body); if(!parsed.success)return res.status(400).json({message:'Variante invalida',errors:parsed.error.flatten()}); const data:any=variantDataToDb(parsed.data); if(!data.name)data.name=variantDisplayName(data); if(data.price===undefined||data.price===null)data.price=product.price; if(data.priceUsd===undefined||data.priceUsd===null)data.priceUsd=product.priceUsd; data.sortOrder=data.sortOrder??0; const created=await prisma.productVariant.create({data:{...data,productId:product.id}}); if(created.stock>0)await prisma.inventoryMovement.create({data:{productId:product.id,type:'INITIAL',quantity:created.stock,reason:'Stock inicial de variante',reference:created.id,variantId:created.id}}); await audit(req.user?.id,'PRODUCT_VARIANT_CREATED:'+created.id,req.ip); res.status(201).json(variantToUi(created));});
router.patch('/product-variants/:id',async(req,res)=>{const parsed=productVariantSchema.partial().safeParse(req.body); if(!parsed.success)return res.status(400).json({message:'Variante invalida',errors:parsed.error.flatten()}); const current=await prisma.productVariant.findUnique({where:{id:req.params.id}}); if(!current)return res.status(404).json({message:'Variante no encontrada'}); const data:any=variantDataToDb(parsed.data,current); const updated=await prisma.$transaction(async tx=>{const next=await tx.productVariant.update({where:{id:req.params.id},data}); if(parsed.data.stock!==undefined&&parsed.data.stock!==current.stock){await tx.inventoryMovement.create({data:{productId:current.productId,type:'ADJUSTMENT',quantity:parsed.data.stock-current.stock,reason:'Ajuste de variante desde administracion',reference:current.id,variantId:current.id}});} return next;}); await audit(req.user?.id,'PRODUCT_VARIANT_UPDATED:'+updated.id,req.ip); res.json(variantToUi(updated));});
router.delete('/product-variants/:id',async(req,res)=>{const current=await prisma.productVariant.findUnique({where:{id:req.params.id}}); if(!current)return res.status(404).json({message:'Variante no encontrada'}); const used=await prisma.orderItem.count({where:{variantId:req.params.id}}); const movementUsed=await prisma.inventoryMovement.count({where:{variantId:req.params.id}}); if(used>0||movementUsed>0){const updated=await prisma.productVariant.update({where:{id:req.params.id},data:{active:false,stock:0}}); await audit(req.user?.id,'PRODUCT_VARIANT_DISABLED:'+updated.id,req.ip); return res.json(variantToUi(updated));} await prisma.productVariant.delete({where:{id:req.params.id}}); await audit(req.user?.id,'PRODUCT_VARIANT_DELETED:'+req.params.id,req.ip); res.json({ok:true});});

router.get('/orders',async(req,res)=>{const q=String(req.query.q||'').trim(); const status=String(req.query.status||''); const country=String(req.query.country||''); const from24=req.query.last24==='1'; const orders=await prisma.order.findMany({where:{AND:[from24?{createdAt:{gte:new Date(Date.now()-24*60*60*1000)}}:{},status?{status}:{},country?{country}:{},q?{OR:[{user:{name:{contains:q}}},{user:{email:{contains:q}}},{id:{contains:q}}]}:{}]},take:120,orderBy:{createdAt:'desc'},include:{user:true,items:{include:{product:true,variant:true}},events:{take:8,orderBy:{createdAt:'desc'},include:{user:{select:{id:true,name:true,role:true}}}}}}); res.json(orders.map(toOrder));});
const orderUpdateSchema=z.object({status:z.enum(ORDER_STATUSES).optional(),shippingStatus:z.string().optional(),shipping:z.number().min(0).optional(),awaitingCustomerApproval:z.boolean().optional(),addressLine:z.string().optional(),packageNote:z.string().optional().nullable(),deliveryPlace:z.string().optional().nullable(),driverName:z.string().optional().nullable(),driverPhone:z.string().optional().nullable(),shippingReference:z.string().optional().nullable(),shippingInvoiceUrl:z.string().optional().nullable(),shippingInvoicePdfUrl:z.string().optional().nullable(),adminNote:z.string().optional().nullable()});
router.patch('/orders/:id',async(req,res)=>{
  const p=orderUpdateSchema.safeParse(req.body);
  if(!p.success)return res.status(400).json({message:'Pedido inválido'});
  const d:any={...p.data};
  const current=await prisma.order.findUnique({where:{id:req.params.id},include:{user:true,items:{include:{product:true}}}});
  if(!current)return res.status(404).json({message:'Pedido no encontrado'});
  if(d.shipping!==undefined){
    d.shipping=unitToCents(d.shipping);
    d.total=Math.max(current.subtotal-(current.discount||0),0)+d.shipping;
    d.awaitingCustomerApproval=true;
    d.status='AWAITING_CUSTOMER_APPROVAL';
    d.shippingStatus='Precio de envío enviado al cliente';
  }
  if(d.status==='PROCESSING') { d.shippingStatus='Procesando'; d.shippedAt=null; d.deliveredAt=null; }
  if(d.status==='PACKED') { d.shippingStatus='Empaquetado'; d.shippedAt=null; d.deliveredAt=null; }
  if(d.status==='SHIPPED') { d.shippingStatus='Enviado'; d.shippedAt=current.shippedAt||new Date(); d.deliveredAt=null; }
  if(d.status==='DELIVERED') { d.shippingStatus='Entregado'; d.shippedAt=current.shippedAt||new Date(); d.deliveredAt=new Date(); }
  let order=await prisma.order.update({where:{id:req.params.id},data:d,include:{user:true,items:{include:{product:true}},events:{take:8,orderBy:{createdAt:'desc'},include:{user:{select:{id:true,name:true,role:true}}}}}});
  if(p.data.shipping!==undefined || p.data.shippingInvoiceUrl!==undefined || p.data.shippingReference!==undefined || p.data.status==='SHIPPED' || p.data.status==='DELIVERED'){
    order=await prisma.order.update({where:{id:order.id},data:{shippingInvoicePdfUrl:makeInvoicePdfDataUrl(order)},include:{user:true,items:{include:{product:true}},events:{take:8,orderBy:{createdAt:'desc'},include:{user:{select:{id:true,name:true,role:true}}}}}});
  }
  if(p.data.shipping!==undefined){
    await createOrderEvent(order.id, req.user?.id, 'SHIPPING_PRICE_SENT', 'Tarifa de envío enviada', `Envío: ${order.currency==='USD'?'US$':'RD$'} ${centsToUnit(order.shipping)}. Total: ${order.currency==='USD'?'US$':'RD$'} ${centsToUnit(order.total)}.`, { shipping:centsToUnit(order.shipping), total:centsToUnit(order.total) });
    await notifyCustomer(order.userId, 'Confirma el total de tu pedido', 'Ya actualizamos el costo de envío. Puedes aceptar o cancelar desde Tus pedidos.', '/cuenta', 'HIGH', 'ORDER');
    await sendMail({ to:order.user.email, ...emailTemplates.shippingConfirmation({ orderId:order.id, shipping:centsToUnit(order.shipping), total:centsToUnit(order.total), currency:order.currency }) }).catch(()=>null);
  }
  if(p.data.status){
    const label=ORDER_STATUS_LABELS[p.data.status]||p.data.status;
    await createOrderEvent(order.id, req.user?.id, 'STATUS_CHANGED', `Estado cambiado a ${label}`, p.data.adminNote || undefined, { status:p.data.status });
    await notifyCustomer(order.userId, 'Actualización de pedido', `Tu pedido ahora está: ${label}.`, '/cuenta', 'NORMAL', 'ORDER');
    await sendMail({ to:order.user.email, ...emailTemplates.orderStatus({ orderId:order.id, statusLabel:label, note:p.data.adminNote }) }).catch(()=>null);
  }
  if(p.data.shippingReference || p.data.shippingInvoiceUrl || p.data.driverName || p.data.deliveryPlace){
    await createOrderEvent(order.id, req.user?.id, 'FULFILLMENT_UPDATED', 'Datos de entrega actualizados', [order.shippingReference&&`Tracking: ${order.shippingReference}`,order.driverName&&`Chofer: ${order.driverName}`,order.deliveryPlace&&`Parada: ${order.deliveryPlace}`].filter(Boolean).join(' · ') || undefined, { shippingReference:order.shippingReference, driverName:order.driverName, deliveryPlace:order.deliveryPlace, hasInvoice:Boolean(order.shippingInvoiceUrl||order.shippingInvoicePdfUrl) });
    await notifyCustomer(order.userId, 'Datos de entrega actualizados', 'Agregamos información de seguimiento o entrega a tu pedido.', '/cuenta', 'NORMAL', 'ORDER');
    await sendMail({ to:order.user.email, ...emailTemplates.fulfillmentUpdated({ orderId:order.id, tracking:order.shippingReference, driver:order.driverName, place:order.deliveryPlace }) }).catch(()=>null);
  }
  if(p.data.packageNote || p.data.adminNote){
    await createOrderEvent(order.id, req.user?.id, 'NOTE_ADDED', 'Nota administrativa agregada', p.data.adminNote || p.data.packageNote || undefined);
  }
  await audit(req.user?.id,`ORDER_UPDATED:${order.id}`,req.ip);
  const refreshed=await prisma.order.findUnique({where:{id:order.id},include:{user:true,items:{include:{product:true}},events:{take:8,orderBy:{createdAt:'desc'},include:{user:{select:{id:true,name:true,role:true}}}}}});
  res.json(toOrder(refreshed||order));
});

router.post('/orders/:id/confirm-sale',async(req,res)=>{
  const current=await prisma.order.findUnique({where:{id:req.params.id},include:{user:true,items:{include:{product:true,variant:true}}}});
  if(!current)return res.status(404).json({message:'Pedido no encontrado'});
  if(current.status==='CANCELLED')return res.status(409).json({message:'No puedes confirmar un pedido cancelado.'});
  if(current.inventoryCommitted)return res.json(toOrder(current));
  const updated=await prisma.$transaction(async tx=>{
    for(const item of current.items){
      if(item.variantId){
        const variantUpdate=await tx.productVariant.updateMany({where:{id:item.variantId,stock:{gte:item.quantity}},data:{stock:{decrement:item.quantity}}});
        if(variantUpdate.count!==1)throw new Error(`Stock insuficiente para ${item.product?.name || 'producto'} - ${item.variant?.name || 'variante'}`);
      }else{
        const productUpdate=await tx.product.updateMany({where:{id:item.productId,stock:{gte:item.quantity}},data:{stock:{decrement:item.quantity}}});
        if(productUpdate.count!==1)throw new Error(`Stock insuficiente para ${item.product?.name || 'producto'}`);
      }
      await tx.inventoryMovement.create({data:{productId:item.productId,type:'SALE',quantity:-item.quantity,reason:'Venta confirmada por admin',reference:current.id,variantId:item.variantId||undefined}});
    }
    await tx.paymentTransaction.updateMany({where:{orderId:current.id,status:{in:['PENDING_CONFIRMATION','PENDING','PARTIAL','AWAITING_ADMIN_CONFIRMATION']}},data:{status:'CONFIRMED'}});
    await tx.orderEvent.create({data:{orderId:current.id,userId:req.user?.id,type:'SALE_CONFIRMED',title:'Venta confirmada',body:'Admin confirmo pago/disponibilidad y el inventario fue descontado.'}});
    return tx.order.update({where:{id:current.id},data:{status:'PROCESSING',paymentStatus:'CONFIRMED',confirmationStatus:'CONFIRMED',inventoryCommitted:true,confirmedAt:new Date(),shippingStatus:'Venta confirmada'},include:{user:true,items:{include:{product:true,variant:true}},events:{take:8,orderBy:{createdAt:'desc'},include:{user:{select:{id:true,name:true,role:true}}}}}});
  });
  await notifyCustomer(current.userId,'Pedido confirmado','Tu pedido fue confirmado por la tienda y esta en procesamiento.','/cuenta','NORMAL','ORDER');
  await sendMail({ to:current.user.email, ...emailTemplates.saleConfirmed({ orderId:current.id }) }).catch(()=>null);
  await audit(req.user?.id,`ORDER_SALE_CONFIRMED:${current.id}`,req.ip);
  res.json(toOrder(updated));
});

router.post('/orders/:id/cancel-sale',async(req,res)=>{
  const current=await prisma.order.findUnique({where:{id:req.params.id},include:{user:true,items:{include:{product:true,variant:true}}}});
  if(!current)return res.status(404).json({message:'Pedido no encontrado'});
  if(current.status==='CANCELLED')return res.json(toOrder(current));
  const isReturn=current.status==='DELIVERED'||String(req.body?.action||'').toUpperCase()==='RETURNED';
  const updated=await prisma.$transaction(async tx=>{
    if(current.inventoryCommitted){
      for(const item of current.items){
        if(item.variantId)await tx.productVariant.update({where:{id:item.variantId},data:{stock:{increment:item.quantity}}});
        else await tx.product.update({where:{id:item.productId},data:{stock:{increment:item.quantity}}});
        await tx.inventoryMovement.create({data:{productId:item.productId,type:'RETURN',quantity:item.quantity,reason:isReturn?'Pedido devuelto por cliente':'Venta cancelada por admin',reference:current.id,variantId:item.variantId||undefined}});
      }
    }
    await tx.paymentTransaction.updateMany({where:{orderId:current.id},data:{status:'CANCELLED'}});
    await tx.orderEvent.create({data:{orderId:current.id,userId:req.user?.id,type:isReturn?'ORDER_RETURNED':'SALE_CANCELLED',title:isReturn?'Pedido devuelto':'Venta cancelada',body:isReturn?'Inventario devuelto por devolucion de pedido entregado.':current.inventoryCommitted?'Inventario devuelto por cancelacion.':'Pedido cancelado antes de confirmar inventario.'}});
    return tx.order.update({where:{id:current.id},data:{status:'CANCELLED',paymentStatus:'CANCELLED',confirmationStatus:'CANCELLED',inventoryCommitted:false,cancelledAt:new Date(),shippingStatus:isReturn?'Pedido devuelto':'Venta cancelada'},include:{user:true,items:{include:{product:true,variant:true}},events:{take:8,orderBy:{createdAt:'desc'},include:{user:{select:{id:true,name:true,role:true}}}}}});
  });
  await notifyCustomer(current.userId,isReturn?'Pedido devuelto':'Pedido cancelado',isReturn?'Registramos la devolucion de tu pedido.':'Tu pedido fue cancelado por la tienda.','/cuenta','NORMAL','ORDER');
  await sendMail({ to:current.user.email, ...emailTemplates.saleCancelled({ orderId:current.id }) }).catch(()=>null);
  await audit(req.user?.id,`${isReturn?'ORDER_RETURNED':'ORDER_SALE_CANCELLED'}:${current.id}`,req.ip);
  res.json(toOrder(updated));
});

router.post('/orders/:id/invoice',async(req,res)=>{
  const order=await prisma.order.findUnique({where:{id:req.params.id},include:{user:true,items:{include:{product:true}}}});
  if(!order)return res.status(404).json({message:'Pedido no encontrado'});
  const updated=await prisma.order.update({where:{id:order.id},data:{shippingInvoicePdfUrl:makeInvoicePdfDataUrl(order)},include:{user:true,items:{include:{product:true}},events:{take:8,orderBy:{createdAt:'desc'},include:{user:{select:{id:true,name:true,role:true}}}}}});
  await createOrderEvent(order.id, req.user?.id, 'INVOICE_GENERATED', 'Factura PDF generada', 'Se generó la factura PDF del envío.');
  await notifyCustomer(order.userId, 'Factura disponible', 'Ya tienes una factura PDF generada para tu pedido.', '/cuenta', 'NORMAL', 'ORDER');
  await audit(req.user?.id,`ORDER_INVOICE_GENERATED:${order.id}`,req.ip);
  res.json(toOrder(updated));
});

router.get('/shipping',async(req,res)=>res.json((await prisma.shippingZone.findMany({orderBy:[{country:'asc'},{province:'asc'},{city:'asc'}]})).map(z=>({...z,price:centsToUnit(z.price)}))));
const shippingSchema=z.object({country:z.enum(['RD','US']),province:z.string().optional().nullable(),city:z.string().optional().nullable(),price:z.number().min(0),currency:z.enum(['DOP','USD']).default('DOP'),requiresConfirmation:z.boolean().default(false),active:z.boolean().default(true)});
router.post('/shipping',async(req,res)=>{const p=shippingSchema.safeParse(req.body); if(!p.success)return res.status(400).json({message:'Zona inválida'}); const z=await prisma.shippingZone.create({data:{...p.data,price:unitToCents(p.data.price)}}); await audit(req.user?.id,`SHIPPING_CREATED:${z.id}`,req.ip); res.status(201).json({...z,price:centsToUnit(z.price)});});
router.patch('/shipping/:id',async(req,res)=>{const p=shippingSchema.partial().safeParse(req.body); if(!p.success)return res.status(400).json({message:'Zona inválida'}); const d:any={...p.data}; if(d.price!==undefined)d.price=unitToCents(d.price); const z=await prisma.shippingZone.update({where:{id:req.params.id},data:d}); await audit(req.user?.id,`SHIPPING_UPDATED:${z.id}`,req.ip); res.json({...z,price:centsToUnit(z.price)});});
router.delete('/shipping/:id',async(req,res)=>{await prisma.shippingZone.delete({where:{id:req.params.id}}); await audit(req.user?.id,`SHIPPING_DELETED:${req.params.id}`,req.ip); res.json({ok:true});});

router.get('/users',async(req,res)=>{const q=String(req.query.q||'').trim(); const role=String(req.query.role||'').trim(); const blocked=String(req.query.blocked||'').trim(); const users=await prisma.user.findMany({where:{AND:[q?{OR:[{name:{contains:q}},{email:{contains:q}}]}:{},role?{role}:{},blocked?{blocked:blocked==='true'}:{}]},take:150,orderBy:{createdAt:'desc'},select:{id:true,name:true,email:true,role:true,isVerified:true,twoFactorEmailEnabled:true,blocked:true,blockedReason:true,failedLoginAttempts:true,lockedUntil:true,createdAt:true,_count:{select:{orders:true,wishlists:true}}}}); res.json(users);});
const userRoleSchema=z.string().min(2).transform(v=>v.trim().toUpperCase().replace(/[^A-Z0-9_]+/g,'_'));
async function validateRole(role:string){ if(role==='ADMIN'||role==='CUSTOMER')return role; const found=await prisma.role.findUnique({where:{slug:role}}); if(!found||!found.active)throw new Error('Rol no encontrado'); return role; }
router.post('/users',async(req,res)=>{const p=z.object({name:z.string().min(2),email:z.string().email(),password:z.string().min(8),role:userRoleSchema.default('CUSTOMER'),isVerified:z.boolean().default(true)}).safeParse(req.body); if(!p.success)return res.status(400).json({message:p.error.issues[0]?.message || 'Usuario inválido', errors:p.error.flatten()}); const {password,email,...userData}=p.data; const role=await validateRole(userData.role).catch(()=>null); if(!role)return res.status(400).json({message:'Rol no encontrado'}); const passwordHash=await bcrypt.hash(password,12); const u=await prisma.user.create({data:{...userData,role,email:email.toLowerCase(),passwordHash},select:{id:true,name:true,email:true,role:true,isVerified:true,blocked:true,createdAt:true}}); await audit(req.user?.id,'USER_CREATED',req.ip); res.status(201).json(u);});
router.patch('/users/:id',async(req,res)=>{const p=z.object({role:userRoleSchema.optional(),isVerified:z.boolean().optional(),name:z.string().min(2).optional(),blocked:z.boolean().optional(),blockedReason:z.string().optional().nullable(),twoFactorEmailEnabled:z.boolean().optional(),failedLoginAttempts:z.number().int().optional(),lockedUntil:z.string().nullable().optional()}).safeParse(req.body); if(!p.success)return res.status(400).json({message:'Usuario inválido'}); const d:any={...p.data}; if(d.role){ const role=await validateRole(d.role).catch(()=>null); if(!role)return res.status(400).json({message:'Rol no encontrado'}); d.role=role; } if(d.lockedUntil) d.lockedUntil=new Date(d.lockedUntil); const u=await prisma.user.update({where:{id:req.params.id},data:d,select:{id:true,name:true,email:true,role:true,isVerified:true,twoFactorEmailEnabled:true,blocked:true,blockedReason:true,failedLoginAttempts:true,lockedUntil:true,createdAt:true}}); await audit(req.user?.id,`USER_UPDATED:${u.id}`,req.ip); res.json(u);});

router.get('/drops',async(_req,res)=>res.json(await prisma.drop.findMany({orderBy:{startsAt:'desc'},include:{_count:{select:{modelPhotos:true}}}})));
const dropSchema=z.object({title:z.string().min(2),description:z.string().min(5),startsAt:z.string(),endsAt:z.string(),isActive:z.boolean().default(false),lockedMode:z.boolean().default(false)});
router.post('/drops',async(req,res)=>{const p=dropSchema.safeParse(req.body); if(!p.success)return res.status(400).json({message:'Drop inválido'}); const d=p.data; const drop=await prisma.drop.create({data:{...d,startsAt:new Date(d.startsAt),endsAt:new Date(d.endsAt)}}); if(drop.isActive){ await prisma.drop.updateMany({where:{id:{not:drop.id}},data:{isActive:false}}); await prisma.siteSetting.upsert({where:{key:'storeMode'},update:{value:'DROP'},create:{key:'storeMode',value:'DROP'}}); } await audit(req.user?.id,`DROP_CREATED:${drop.id}`,req.ip); res.status(201).json(drop);});
router.patch('/drops/:id',async(req,res)=>{const p=dropSchema.partial().safeParse(req.body); if(!p.success)return res.status(400).json({message:'Drop inválido'}); const d:any={...p.data}; if(d.startsAt)d.startsAt=new Date(d.startsAt); if(d.endsAt)d.endsAt=new Date(d.endsAt); const drop=await prisma.drop.update({where:{id:req.params.id},data:d}); if(drop.isActive){ await prisma.drop.updateMany({where:{id:{not:drop.id}},data:{isActive:false}}); await prisma.siteSetting.upsert({where:{key:'storeMode'},update:{value:'DROP'},create:{key:'storeMode',value:'DROP'}}); } await audit(req.user?.id,`DROP_UPDATED:${drop.id}`,req.ip); res.json(drop);});
router.delete('/drops/:id',async(req,res)=>{await prisma.modelPhoto.deleteMany({where:{dropId:req.params.id}}); await prisma.drop.delete({where:{id:req.params.id}}); await audit(req.user?.id,`DROP_DELETED:${req.params.id}`,req.ip); res.json({ok:true});});

router.get('/models',async(_req,res)=>res.json(await prisma.modelPhoto.findMany({orderBy:[{sortOrder:'asc'},{createdAt:'desc'}],include:{drop:true,product:true}})));
const modelSchema=z.object({dropId:z.string(),productId:z.string(),imageUrl:z.string().min(5),caption:z.string().optional().nullable(),tagX:z.number().int().min(0).max(100).default(50),tagY:z.number().int().min(0).max(100).default(50),isActive:z.boolean().default(true),sortOrder:z.number().int().default(0)});
router.post('/models',async(req,res)=>{const p=modelSchema.safeParse(req.body); if(!p.success)return res.status(400).json({message:'Foto inválida'}); const m=await prisma.modelPhoto.create({data:p.data}); await audit(req.user?.id,`MODEL_CREATED:${m.id}`,req.ip); res.status(201).json(m);});
router.patch('/models/:id',async(req,res)=>{const p=modelSchema.partial().safeParse(req.body); if(!p.success)return res.status(400).json({message:'Foto inválida'}); const m=await prisma.modelPhoto.update({where:{id:req.params.id},data:p.data}); await audit(req.user?.id,`MODEL_UPDATED:${m.id}`,req.ip); res.json(m);});
router.delete('/models/:id',async(req,res)=>{await prisma.modelPhoto.delete({where:{id:req.params.id}}); await audit(req.user?.id,`MODEL_DELETED:${req.params.id}`,req.ip); res.json({ok:true});});

router.get('/news',async(_req,res)=>res.json(await prisma.newsPost.findMany({orderBy:{createdAt:'desc'}})));
const newsSchema=z.object({title:z.string().min(2),slug:z.string().optional(),excerpt:z.string().min(2),content:z.string().min(2),imageUrl:z.string().optional().nullable(),type:z.string().default('NEWS'),isPublished:z.boolean().default(true)});
router.post('/news',async(req,res)=>{const p=newsSchema.safeParse(req.body); if(!p.success)return res.status(400).json({message:'Novedad inválida'}); const d=p.data; const n=await prisma.newsPost.create({data:{...d,slug:d.slug||slugify(d.title)}}); await audit(req.user?.id,`NEWS_CREATED:${n.id}`,req.ip); res.status(201).json(n);});
router.patch('/news/:id',async(req,res)=>{const p=newsSchema.partial().safeParse(req.body); if(!p.success)return res.status(400).json({message:'Novedad inválida'}); const d:any={...p.data}; if(d.title&&!d.slug)d.slug=slugify(d.title); const n=await prisma.newsPost.update({where:{id:req.params.id},data:d}); await audit(req.user?.id,`NEWS_UPDATED:${n.id}`,req.ip); res.json(n);});
router.delete('/news/:id',async(req,res)=>{await prisma.newsPost.delete({where:{id:req.params.id}}); await audit(req.user?.id,`NEWS_DELETED:${req.params.id}`,req.ip); res.json({ok:true});});

router.get('/content',async(req,res)=>{const area=String(req.query.area||''); res.json(await prisma.contentBlock.findMany({where:area?{area}:{},orderBy:[{area:'asc'},{sortOrder:'asc'}]}));});
const contentSchema=z.object({area:z.string().min(2),title:z.string().min(2),subtitle:z.string().optional().nullable(),body:z.string().optional().nullable(),url:z.string().optional().nullable(),imageUrl:z.string().optional().nullable(),sortOrder:z.number().int().default(0),isActive:z.boolean().default(true)});
router.post('/content',async(req,res)=>{const p=contentSchema.safeParse(req.body); if(!p.success)return res.status(400).json({message:'Contenido inválido'}); const c=await prisma.contentBlock.create({data:p.data}); await audit(req.user?.id,`CONTENT_CREATED:${c.id}`,req.ip); res.status(201).json(c);});
router.patch('/content/:id',async(req,res)=>{const p=contentSchema.partial().safeParse(req.body); if(!p.success)return res.status(400).json({message:'Contenido inválido'}); const c=await prisma.contentBlock.update({where:{id:req.params.id},data:p.data}); await audit(req.user?.id,`CONTENT_UPDATED:${c.id}`,req.ip); res.json(c);});
router.delete('/content/:id',async(req,res)=>{await prisma.contentBlock.delete({where:{id:req.params.id}}); await audit(req.user?.id,`CONTENT_DELETED:${req.params.id}`,req.ip); res.json({ok:true});});

const popupActions=['LINK','CLOSE','HOME','WHATSAPP'] as const;
const popupAlignments=['left','center','right'] as const;
const colorValue=z.string().min(2).max(80);
const popupSchema=z.object({
  name:z.string().min(2),
  title:z.string().min(2),
  subtitle:z.string().optional().nullable(),
  body:z.string().optional().nullable(),
  imageUrl:z.string().optional().nullable(),
  backgroundColor:colorValue.default('#120d0a'),
  overlayColor:colorValue.default('rgba(0,0,0,0.38)'),
  titleColor:colorValue.default('#fff7ed'),
  subtitleColor:colorValue.default('#fed7aa'),
  bodyColor:colorValue.default('#ffffff'),
  width:z.number().int().min(280).max(1400).default(760),
  height:z.number().int().min(260).max(1100).default(520),
  useImageDimensions:z.boolean().default(false),
  imageNaturalWidth:z.number().int().min(1).max(5000).optional().nullable(),
  imageNaturalHeight:z.number().int().min(1).max(5000).optional().nullable(),
  titleX:z.number().int().min(0).max(100).default(50),
  titleY:z.number().int().min(0).max(100).default(18),
  titleAlign:z.enum(popupAlignments).default('center'),
  subtitleX:z.number().int().min(0).max(100).default(50),
  subtitleY:z.number().int().min(0).max(100).default(30),
  subtitleAlign:z.enum(popupAlignments).default('center'),
  bodyX:z.number().int().min(0).max(100).default(50),
  bodyY:z.number().int().min(0).max(100).default(58),
  bodyAlign:z.enum(popupAlignments).default('center'),
  buttonsX:z.number().int().min(0).max(100).default(50),
  buttonsY:z.number().int().min(0).max(100).default(82),
  buttonsAlign:z.enum(popupAlignments).default('center'),
  primaryLabel:z.string().min(1).default('Ver mas'),
  primaryAction:z.enum(popupActions).default('LINK'),
  primaryUrl:z.string().optional().nullable(),
  primaryBgColor:colorValue.default('#ff6a00'),
  primaryTextColor:colorValue.default('#111111'),
  secondaryLabel:z.string().optional().nullable(),
  secondaryAction:z.enum(popupActions).default('CLOSE'),
  secondaryUrl:z.string().optional().nullable(),
  secondaryBgColor:colorValue.default('transparent'),
  secondaryTextColor:colorValue.default('#ffffff'),
  delaySeconds:z.number().int().min(0).max(120).default(4),
  showOnce:z.boolean().default(true),
  isActive:z.boolean().default(false),
  startsAt:z.string().optional().nullable(),
  endsAt:z.string().optional().nullable(),
});
function popupPayload(data:any){
  const payload:any={...data};
  ['subtitle','body','imageUrl','primaryUrl','secondaryLabel','secondaryUrl'].forEach(key=>{if(payload[key]!==undefined)payload[key]=String(payload[key]||'').trim()||null;});
  if(payload.startsAt!==undefined)payload.startsAt=payload.startsAt?new Date(payload.startsAt):null;
  if(payload.endsAt!==undefined)payload.endsAt=payload.endsAt?new Date(payload.endsAt):null;
  return payload;
}
router.get('/popups',async(_req,res)=>res.json(await prisma.marketingPopup.findMany({orderBy:[{isActive:'desc'},{updatedAt:'desc'}]})));
router.post('/popups',async(req,res)=>{
  const p=popupSchema.safeParse(req.body);
  if(!p.success)return res.status(400).json({message:'Popup invalido',errors:p.error.flatten()});
  const payload=popupPayload(p.data);
  const popup=await prisma.$transaction(async tx=>{
    const created=await tx.marketingPopup.create({data:payload});
    if(created.isActive)await tx.marketingPopup.updateMany({where:{id:{not:created.id}},data:{isActive:false}});
    return created;
  });
  await audit(req.user?.id,`POPUP_CREATED:${popup.id}`,req.ip);
  res.status(201).json(popup);
});
router.patch('/popups/:id',async(req,res)=>{
  const p=popupSchema.partial().safeParse(req.body);
  if(!p.success)return res.status(400).json({message:'Popup invalido',errors:p.error.flatten()});
  const payload=popupPayload(p.data);
  const popup=await prisma.$transaction(async tx=>{
    if(payload.isActive)await tx.marketingPopup.updateMany({where:{id:{not:req.params.id}},data:{isActive:false}});
    return tx.marketingPopup.update({where:{id:req.params.id},data:payload});
  });
  await audit(req.user?.id,`POPUP_UPDATED:${popup.id}`,req.ip);
  res.json(popup);
});
router.delete('/popups/:id',async(req,res)=>{await prisma.marketingPopup.delete({where:{id:req.params.id}}); await audit(req.user?.id,`POPUP_DELETED:${req.params.id}`,req.ip); res.json({ok:true});});

router.get('/permissions',async(_req,res)=>res.json(ADMIN_PERMISSIONS));
router.get('/roles',async(_req,res)=>res.json(await prisma.role.findMany({orderBy:{name:'asc'},include:{permissions:true,_count:{select:{permissions:true}}}})));
const roleSchema=z.object({name:z.string().min(2),slug:z.string().optional(),description:z.string().optional().nullable(),active:z.boolean().default(true),permissions:z.array(z.string()).default([])});
router.post('/roles',async(req,res)=>{
  const p=roleSchema.safeParse(req.body);
  if(!p.success)return res.status(400).json({message:'Rol inválido',errors:p.error.flatten()});
  const slug=(p.data.slug||slugify(p.data.name)).toUpperCase().replace(/-/g,'_');
  if(['ADMIN','CUSTOMER'].includes(slug))return res.status(409).json({message:'Ese rol base no se puede recrear.'});
  const allowed=new Set(ADMIN_PERMISSIONS.map(p=>p.key));
  const permissions=[...new Set(p.data.permissions.filter(x=>allowed.has(x)))];
  const role=await prisma.role.create({data:{name:p.data.name,slug,description:p.data.description,active:p.data.active,permissions:{create:permissions.map(permission=>({permission}))}},include:{permissions:true}});
  await audit(req.user?.id,`ROLE_CREATED:${role.slug}`,req.ip);
  res.status(201).json(role);
});
router.patch('/roles/:id',async(req,res)=>{
  const p=roleSchema.partial().safeParse(req.body);
  if(!p.success)return res.status(400).json({message:'Rol inválido',errors:p.error.flatten()});
  const current=await prisma.role.findUnique({where:{id:req.params.id}});
  if(!current)return res.status(404).json({message:'Rol no encontrado'});
  if(['ADMIN','CUSTOMER'].includes(current.slug) && p.data.slug && p.data.slug!==current.slug)return res.status(409).json({message:'No cambies el identificador de roles base.'});
  const allowed=new Set(ADMIN_PERMISSIONS.map(p=>p.key));
  const data:any={...p.data};
  delete data.permissions;
  if(data.slug)data.slug=String(data.slug).toUpperCase().replace(/[^A-Z0-9_]+/g,'_');
  const role=await prisma.$transaction(async tx=>{
    const updated=await tx.role.update({where:{id:req.params.id},data});
    if(p.data.permissions){
      await tx.rolePermission.deleteMany({where:{roleId:updated.id}});
      await tx.rolePermission.createMany({data:[...new Set(p.data.permissions.filter(x=>allowed.has(x)))].map(permission=>({roleId:updated.id,permission}))});
    }
    return tx.role.findUnique({where:{id:updated.id},include:{permissions:true}});
  });
  await audit(req.user?.id,`ROLE_UPDATED:${role?.slug}`,req.ip);
  res.json(role);
});
router.delete('/roles/:id',async(req,res)=>{
  const role=await prisma.role.findUnique({where:{id:req.params.id}});
  if(!role)return res.status(404).json({message:'Rol no encontrado'});
  if(['ADMIN','CUSTOMER'].includes(role.slug))return res.status(409).json({message:'No puedes eliminar roles base.'});
  const users=await prisma.user.count({where:{role:role.slug}});
  if(users>0)return res.status(409).json({message:'Hay usuarios usando este rol.'});
  await prisma.rolePermission.deleteMany({where:{roleId:role.id}});
  await prisma.role.delete({where:{id:role.id}});
  await audit(req.user?.id,`ROLE_DELETED:${role.slug}`,req.ip);
  res.json({ok:true});
});

function publicTicket(ticket:any){return {...ticket,messages:ticket.messages?.map((m:any)=>({id:m.id,body:m.body,fromStaff:m.fromStaff,createdAt:m.createdAt,author:m.user?{id:m.user.id,name:m.user.name,role:m.user.role}:null}))};}
router.get('/tickets',async(req,res)=>{
  const q=String(req.query.q||'').trim();
  const status=String(req.query.status||'').trim();
  const tickets=await prisma.helpTicket.findMany({where:{AND:[status?{status}:{},q?{OR:[{subject:{contains:q}},{user:{name:{contains:q}}},{user:{email:{contains:q}}},{id:{contains:q}}]}:{}]},orderBy:{updatedAt:'desc'},include:{user:{select:{id:true,name:true,email:true,phone:true,whatsapp:true}},assignedTo:{select:{id:true,name:true,email:true}},messages:{orderBy:{createdAt:'asc'},include:{user:{select:{id:true,name:true,role:true}}}}}});
  res.json(tickets.map(publicTicket));
});
const ticketUpdateSchema=z.object({status:z.enum(['OPEN','WAITING_CUSTOMER','ANSWERED','CLOSED']).optional(),priority:z.enum(['LOW','NORMAL','HIGH']).optional(),assignedToId:z.string().optional().nullable()});
router.patch('/tickets/:id',async(req,res)=>{
  const p=ticketUpdateSchema.safeParse(req.body);
  if(!p.success)return res.status(400).json({message:'Ticket inválido'});
  const data:any={...p.data};
  if(data.status==='CLOSED')data.closedAt=new Date();
  const ticket=await prisma.helpTicket.update({where:{id:req.params.id},data,include:{user:true,assignedTo:true,messages:{orderBy:{createdAt:'asc'},include:{user:{select:{id:true,name:true,role:true}}}}}});
  if(p.data.status){
    await notifyCustomer(ticket.userId,'Ticket actualizado',`Tu ticket "${ticket.subject}" ahora está: ${p.data.status}.`,'/cuenta','NORMAL','SUPPORT');
    await sendMail({ to:ticket.user.email, ...emailTemplates.ticketStatus({ ticketId:ticket.id, subject:ticket.subject, status:p.data.status }) }).catch(()=>null);
  }
  await audit(req.user?.id,`TICKET_UPDATED:${ticket.id}`,req.ip);
  res.json(publicTicket(ticket));
});
router.post('/tickets/:id/messages',async(req,res)=>{
  const p=z.object({body:z.string().min(2),status:z.enum(['OPEN','WAITING_CUSTOMER','ANSWERED','CLOSED']).default('ANSWERED')}).safeParse(req.body);
  if(!p.success)return res.status(400).json({message:'Mensaje inválido'});
  const ticket=await prisma.helpTicket.findUnique({where:{id:req.params.id},include:{user:true}});
  if(!ticket)return res.status(404).json({message:'Ticket no encontrado'});
  const message=await prisma.helpTicketMessage.create({data:{ticketId:ticket.id,userId:req.user!.id,body:p.data.body,fromStaff:true},include:{user:{select:{id:true,name:true,role:true}}}});
  await prisma.helpTicket.update({where:{id:ticket.id},data:{status:p.data.status,assignedToId:req.user!.id}});
  await notifyCustomer(ticket.userId,'Respuesta de soporte',`Respondimos tu ticket: ${ticket.subject}`,'/cuenta','NORMAL','SUPPORT');
  await sendMail({ to:ticket.user.email, ...emailTemplates.ticketReply({ ticketId:ticket.id, subject:ticket.subject, body:p.data.body }) }).catch(()=>null);
  await audit(req.user?.id,`TICKET_REPLIED:${ticket.id}`,req.ip);
  res.status(201).json(message);
});

function notificationScope(req:any){
  return req.user?.role==='ADMIN' ? {} : { OR:[{userId:req.user!.id},{userId:null}] };
}
function publicNotification(notification:any){
  return {
    ...notification,
    user: notification.user ? { id:notification.user.id, name:notification.user.name, email:notification.user.email, role:notification.user.role } : null,
  };
}
const notificationCreateSchema=z.object({
  title:z.string().min(3),
  body:z.string().min(3),
  type:z.enum(['SYSTEM','ORDER','SUPPORT','SALES','INVENTORY']).default('SYSTEM'),
  priority:z.enum(['LOW','NORMAL','HIGH']).default('NORMAL'),
  actionUrl:z.string().optional().nullable(),
  userId:z.string().optional().nullable(),
  permission:z.string().optional().nullable(),
});

function notificationSection(notification:any){
  const action=String(notification.actionUrl||'').toLowerCase();
  const type=String(notification.type||'SYSTEM').toUpperCase();
  if(action.includes('product')||action.includes('inventory'))return action.includes('inventory')?'inventory':'products';
  if(action.includes('order')||type==='ORDER')return 'orders';
  if(action.includes('support')||action.includes('ticket')||type==='SUPPORT')return 'support';
  if(action.includes('sales')||type==='SALES')return 'sales';
  if(action.includes('user'))return 'users';
  if(action.includes('shipping'))return 'shipping';
  if(type==='INVENTORY')return 'inventory';
  return 'notifications';
}
router.get('/notifications/summary',async(req,res)=>{
  const unreadNotifications=await prisma.notification.findMany({where:{AND:[notificationScope(req),{read:false}]},select:{id:true,type:true,priority:true,actionUrl:true}});
  const allNotifications=await prisma.notification.groupBy({by:['read'],where:notificationScope(req),_count:{_all:true}}).catch(()=>[] as any[]);
  const byType:Record<string,number>={};
  const byPriority:Record<string,number>={};
  const bySection:Record<string,number>={};
  for(const notification of unreadNotifications){
    const type=notification.type||'SYSTEM';
    const priority=notification.priority||'NORMAL';
    const section=notificationSection(notification);
    byType[type]=(byType[type]||0)+1;
    byPriority[priority]=(byPriority[priority]||0)+1;
    bySection[section]=(bySection[section]||0)+1;
  }
  const readCount=allNotifications.find((item:any)=>item.read===true)?._count?._all||0;
  res.json({total:unreadNotifications.length,read:readCount,byType,byPriority,bySection});
});

router.get('/notifications',async(req,res)=>{
  const unread=req.query.unread==='1';
  const type=String(req.query.type||'').trim();
  const priority=String(req.query.priority||'').trim();
  const notifications=await prisma.notification.findMany({
    where:{AND:[notificationScope(req),unread?{read:false}:{},type?{type}:{},priority?{priority}:{}]},
    take:160,
    orderBy:{createdAt:'desc'},
    include:{user:{select:{id:true,name:true,email:true,role:true}}},
  });
  res.json(notifications.map(publicNotification));
});
router.post('/notifications',async(req,res)=>{
  const p=notificationCreateSchema.safeParse(req.body);
  if(!p.success)return res.status(400).json({message:'Notificación inválida',errors:p.error.flatten()});
  const data=p.data;
  if(data.permission){
    await notifyStaff(data.permission,data.title,data.body,data.actionUrl||undefined,data.priority,data.type);
    await audit(req.user?.id,`NOTIFICATION_SENT_PERMISSION:${data.permission}`,req.ip);
    return res.status(201).json({ok:true});
  }
  const notification=await prisma.notification.create({data:{userId:data.userId||null,title:data.title,body:data.body,type:data.type,priority:data.priority,actionUrl:data.actionUrl||null},include:{user:{select:{id:true,name:true,email:true,role:true}}}});
  await audit(req.user?.id,`NOTIFICATION_CREATED:${notification.id}`,req.ip);
  res.status(201).json(publicNotification(notification));
});
router.patch('/notifications/:id/read',async(req,res)=>{
  const notification=await prisma.notification.findFirst({where:{id:req.params.id,...notificationScope(req)}});
  if(!notification)return res.status(404).json({message:'Notificación no encontrada'});
  const updated=await prisma.notification.update({where:{id:notification.id},data:{read:true,readAt:new Date()},include:{user:{select:{id:true,name:true,email:true,role:true}}}});
  res.json(publicNotification(updated));
});
router.post('/notifications/read-all',async(req,res)=>{
  const result=await prisma.notification.updateMany({where:{AND:[notificationScope(req),{read:false}]},data:{read:true,readAt:new Date()}});
  res.json({ok:true,count:result.count});
});

function toPromo(p:any){return {...p,amount:centsToUnit(p.amount),minSubtotal:centsToUnit(p.minSubtotal)};}

const SALES_CHANNELS = ['WHATSAPP','FISICO','TRANSFERENCIA','INSTAGRAM','OTRO'] as const;
const SALES_CHANNEL_LABELS: Record<string,string> = {
  WHATSAPP:'WhatsApp',
  FISICO:'Venta fisica',
  TRANSFERENCIA:'Transferencia',
  INSTAGRAM:'Instagram',
  OTRO:'Otro',
  WEB:'Web',
};
const manualSaleSchema = z.object({
  channel:z.enum(SALES_CHANNELS).default('WHATSAPP'),
  customerName:z.string().optional().nullable(),
  reference:z.string().optional().nullable(),
  note:z.string().optional().nullable(),
  currency:z.enum(['DOP','USD']).default('DOP'),
  paidByTransfer:z.boolean().default(false),
  paymentStatus:z.enum(['PENDING','PARTIAL','PAID']).default('PENDING'),
  paidAmount:z.number().min(0).default(0),
  items:z.array(z.object({
    productId:z.string().min(1),
    variantId:z.string().optional().nullable(),
    quantity:z.number().int().min(1),
    unitPrice:z.number().min(0).optional().nullable(),
  })).min(1),
});
const reportDateKey = (date:Date)=>{
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone:'America/Santo_Domingo',
    year:'numeric',
    month:'2-digit',
    day:'2-digit',
  }).formatToParts(date).reduce((acc:any,part)=>{ acc[part.type]=part.value; return acc; },{});
  return `${parts.year}-${parts.month}-${parts.day}`;
};
const parseReportMonth = (value:unknown)=>{
  const raw=String(value||'').trim();
  const fallback=reportDateKey(new Date()).slice(0,7);
  if(!/^\d{4}-\d{2}$/.test(raw))return fallback;
  const [year,month]=raw.split('-').map(Number);
  if(year<2020||month<1||month>12)return fallback;
  return raw;
};
async function getManualSaleUser(tx:any){
  return tx.user.upsert({
    where:{email:'ventas@magmablaze.local'},
    update:{},
    create:{
      email:'ventas@magmablaze.local',
      passwordHash:'manual-sale-account',
      name:'Venta manual',
      role:'CUSTOMER',
      isVerified:true,
    },
  });
}
router.post('/sales/manual', async(req,res)=>{
  const parsed=manualSaleSchema.safeParse(req.body);
  if(!parsed.success)return res.status(400).json({message:'Venta invalida',errors:parsed.error.flatten()});
  const data=parsed.data;
  const grouped=new Map<string,{productId:string;variantId?:string|null;quantity:number;unitPrice?:number|null}>();
  data.items.forEach(item=>{
    const key=`${item.productId}::${item.variantId||'base'}::${item.unitPrice ?? 'auto'}`;
    const current=grouped.get(key);
    if(current)current.quantity+=item.quantity;
    else grouped.set(key,{...item});
  });
  const items=[...grouped.values()];
  const products=await prisma.product.findMany({where:{id:{in:items.map(item=>item.productId)}},include:{category:true,images:{orderBy:{sortOrder:'asc'}},variants:{orderBy:{sortOrder:'asc'}}}});
  const productMap=new Map(products.map(product=>[product.id,product]));
  const missing=items.find(item=>!productMap.has(item.productId));
  if(missing)return res.status(404).json({message:'Uno de los productos no existe.'});
  const orderItems=[] as any[];
  for(const item of items){
    const product=productMap.get(item.productId)!;
    const activeVariants=(product.variants||[]).filter((variant:any)=>variant.active);
    const variant=item.variantId?activeVariants.find((candidate:any)=>candidate.id===item.variantId):null;
    if(item.variantId&&!variant)return res.status(404).json({message:`La variante seleccionada de ${product.name} no existe o esta inactiva.`});
    if(activeVariants.length>0&&!variant)return res.status(400).json({message:`Selecciona una variante para ${product.name}.`});
    const availableStock=variant?variant.stock:product.stock;
    if(availableStock<item.quantity){
      const variantText=variant?` - ${variantDisplayName(variant)}`:'';
      return res.status(409).json({message:`Stock insuficiente para ${product.name}${variantText}. Disponible: ${availableStock}.`});
    }
    const active=activeDiscount(product);
    const autoPrice=variant?.price || active?.finalCents || product.price;
    const price=item.unitPrice!==undefined&&item.unitPrice!==null?unitToCents(item.unitPrice):autoPrice;
    orderItems.push({product,variant,quantity:item.quantity,price});
  }
  const subtotal=orderItems.reduce((sum,item)=>sum+(item.price*item.quantity),0);
  const channelLabel=SALES_CHANNEL_LABELS[data.channel]||data.channel;
  const paidAmount=data.paymentStatus==='PAID'?subtotal:Math.min(subtotal,unitToCents(data.paymentStatus==='PARTIAL'?data.paidAmount:0));
  const paymentProvider=data.paidByTransfer?'TRANSFERENCIA':data.channel;
  const isPaid=data.paymentStatus==='PAID';
  const order=await prisma.$transaction(async tx=>{
    const manualUser=await getManualSaleUser(tx);
    const created=await tx.order.create({
      data:{
        userId:manualUser.id,
        status:isPaid?'DELIVERED':'PENDING',
        shippingStatus:isPaid?'ENTREGADO':'PENDIENTE DE PAGO',
        subtotal,
        discount:0,
        shipping:0,
        total:subtotal,
        country:'RD',
        currency:data.currency,
        salesChannel:data.channel,
        paymentStatus:data.paymentStatus,
        paymentProvider,
        paymentReference:data.reference?.trim()||null,
        addressLine:`Venta manual${data.customerName?.trim()?` - ${data.customerName.trim()}`:''}`,
        adminNote:data.note?.trim()||null,
        deliveredAt:isPaid?new Date():null,
        inventoryCommitted:isPaid,
        confirmationStatus:isPaid?'CONFIRMED':'UNCONFIRMED',
        confirmedAt:isPaid?new Date():null,
        items:{create:orderItems.map(item=>({productId:item.product.id,variantId:item.variant?.id||null,quantity:item.quantity,price:item.price}))},
        payments:{create:{provider:paymentProvider,status:data.paymentStatus,amount:paidAmount,currency:data.currency,reference:data.reference?.trim()||null,metadata:JSON.stringify({paidByTransfer:data.paidByTransfer,balance:subtotal-paidAmount})}},
      },
      include:{user:true,items:{include:{product:{include:{category:true}},variant:true}},payments:true},
    });
    if(isPaid){
      for(const item of orderItems){
        if(item.variant){
          const updated=await tx.productVariant.updateMany({where:{id:item.variant.id,stock:{gte:item.quantity}},data:{stock:{decrement:item.quantity}}});
          if(updated.count!==1)throw new Error(`Stock insuficiente para ${item.product.name} - ${variantDisplayName(item.variant)}.`);
        }else{
          const updated=await tx.product.updateMany({where:{id:item.product.id,stock:{gte:item.quantity}},data:{stock:{decrement:item.quantity}}});
          if(updated.count!==1)throw new Error(`Stock insuficiente para ${item.product.name}.`);
        }
        await tx.inventoryMovement.create({
          data:{
            productId:item.product.id,
            variantId:item.variant?.id||undefined,
            type:'SALE',
            quantity:-item.quantity,
            reason:`Venta manual: ${channelLabel}`,
            reference:created.id,
          },
        });
      }
    }
    await tx.orderEvent.create({
      data:{
        orderId:created.id,
        userId:req.user?.id,
        type:'MANUAL_SALE_CREATED',
        title:`Venta registrada por ${channelLabel}`,
        body:data.note?.trim()||undefined,
        metadata:JSON.stringify({channel:data.channel,reference:data.reference||null,paymentStatus:data.paymentStatus,paidAmount:centsToUnit(paidAmount),paidByTransfer:data.paidByTransfer}),
      },
    }).catch(()=>null);
    return created;
  });
  await audit(req.user?.id,`MANUAL_SALE_CREATED:${order.id}:${data.channel}`,req.ip);
  await notifyStaff('inventory','Venta manual registrada',`${channelLabel}: ${centsToUnit(subtotal).toLocaleString('es-DO')} ${data.currency}.`, '/dixnissowner', 'NORMAL', 'SALES');
  res.status(201).json(toOrder(order));
});
router.get('/reports',async(req,res)=>{
  const now=new Date();
  const month=parseReportMonth(req.query.month);
  const [year,monthNumber]=month.split('-').map(Number);
  const daysInMonth=new Date(year,monthNumber,0).getDate();
  const since30=new Date(now.getTime()-30*24*60*60*1000);
  const [orders,products,movements,payments,coupons,customers]=await Promise.all([
    prisma.order.findMany({take:1000,orderBy:{createdAt:'desc'},include:{user:true,items:{include:{product:{include:{category:true}}}},promoCode:true,payments:true}}),
    prisma.product.findMany({include:{category:true,variants:{orderBy:{sortOrder:'asc'}}}}),
    prisma.inventoryMovement.findMany({take:160,orderBy:{createdAt:'desc'},include:{product:true,variant:true}}),
    prisma.paymentTransaction.findMany({take:300,orderBy:{createdAt:'desc'}}),
    prisma.promoCode.findMany({orderBy:{createdAt:'desc'}}),
    prisma.user.count({where:{role:'CUSTOMER'}}),
  ]);
  const completed=orders.filter(o=>!['CANCELLED'].includes(o.status));
  const recentCompleted=completed.filter(o=>o.createdAt>=since30);
  const totalRevenue=completed.reduce((s,o)=>s+o.total,0);
  const totalDiscount=completed.reduce((s,o)=>s+(o.discount||0),0);
  const totalShipping=completed.reduce((s,o)=>s+o.shipping,0);
  const totalCost=completed.reduce((sum,order)=>sum+order.items.reduce((itemSum,item)=>itemSum+((item.product?.cost||0)*item.quantity),0),0);
  const totalProfit=totalRevenue-totalCost;
  const statusCounts=orders.reduce((acc:any,o)=>{acc[o.status]=(acc[o.status]||0)+1;return acc;},{});
  const paymentCounts=payments.reduce((acc:any,p)=>{acc[p.status]=(acc[p.status]||0)+1;return acc;},{});
  const currencyTotals=completed.reduce((acc:any,o)=>{const key=o.currency||'DOP'; acc[key]=(acc[key]||0)+o.total; return acc;},{});
  const productSales=new Map<string,{id:string;name:string;quantity:number;revenue:number;stock:number;category:string}>();
  completed.forEach(order=>order.items.forEach(item=>{
    const current=productSales.get(item.productId)||{id:item.productId,name:item.product?.name||item.productId,quantity:0,revenue:0,stock:item.product?.stock||0,category:item.product?.category?.name||'Sin categoria'};
    current.quantity+=item.quantity; current.revenue+=item.price*item.quantity; productSales.set(item.productId,current);
  }));
  const paidFor=(order:any)=>order.payments?.reduce((sum:number,payment:any)=>sum+(['PAID','CONFIRMED','PARTIAL'].includes(payment.status)?payment.amount:0),0)||0;
  const manualOrders=completed.filter((order:any)=>order.salesChannel&&order.salesChannel!=='WEB');
  const monthOrders=completed.filter(order=>reportDateKey(order.createdAt).startsWith(month));
  const manualMonthOrders=manualOrders.filter(order=>reportDateKey(order.createdAt).startsWith(month));
  const dailySales=Array.from({length:daysInMonth}).map((_,index)=>{
    const date=`${month}-${String(index+1).padStart(2,'0')}`;
    const dayOrders=monthOrders.filter(o=>reportDateKey(o.createdAt)===date);
    return {date,orders:dayOrders.length,revenue:centsToUnit(dayOrders.reduce((s,o)=>s+o.total,0)),profit:centsToUnit(dayOrders.reduce((s,o)=>s+o.total-o.items.reduce((cost,item)=>cost+((item.product?.cost||0)*item.quantity),0),0))};
  });
  const manualDailySales=Array.from({length:daysInMonth}).map((_,index)=>{
    const date=`${month}-${String(index+1).padStart(2,'0')}`;
    const dayOrders=manualMonthOrders.filter(o=>reportDateKey(o.createdAt)===date);
    return {date,orders:dayOrders.length,revenue:centsToUnit(dayOrders.reduce((s,o)=>s+o.total,0)),paid:centsToUnit(dayOrders.reduce((s,o)=>s+paidFor(o),0)),profit:centsToUnit(dayOrders.reduce((s,o)=>s+o.total-o.items.reduce((cost,item)=>cost+((item.product?.cost||0)*item.quantity),0),0))};
  });
  const categorySales=new Map<string,{name:string;quantity:number;revenue:number}>();
  completed.forEach(order=>order.items.forEach(item=>{
    const key=item.product?.category?.name||'Sin categoria';
    const current=categorySales.get(key)||{name:key,quantity:0,revenue:0};
    current.quantity+=item.quantity;
    current.revenue+=item.price*item.quantity;
    categorySales.set(key,current);
  }));
  const lowStock=products.map(toProduct).filter((p:any)=>p.availableStock<=p.lowStockThreshold);
  const manualTotal=manualMonthOrders.reduce((sum,order)=>sum+order.total,0);
  const manualPaid=manualMonthOrders.reduce((sum,order)=>sum+paidFor(order),0);
  const manualCost=manualMonthOrders.reduce((sum,order)=>sum+order.items.reduce((itemSum,item)=>itemSum+((item.product?.cost||0)*item.quantity),0),0);
  const manualPaymentCounts=manualMonthOrders.reduce((acc:any,order:any)=>{acc[order.paymentStatus]=(acc[order.paymentStatus]||0)+1;return acc;},{});
  res.json({
    summary:{
      orders:orders.length,
      completedOrders:completed.length,
      orders30:recentCompleted.length,
      customers,
      revenue:centsToUnit(totalRevenue),
      revenue30:centsToUnit(recentCompleted.reduce((s,o)=>s+o.total,0)),
      discount:centsToUnit(totalDiscount),
      shipping:centsToUnit(totalShipping),
      cost:centsToUnit(totalCost),
      profit:centsToUnit(totalProfit),
      margin:totalRevenue?Number(((totalProfit/totalRevenue)*100).toFixed(1)):0,
      averageOrder:completed.length?centsToUnit(totalRevenue/completed.length):0,
      cancellationRate:orders.length?Number(((orders.filter(o=>o.status==='CANCELLED').length/orders.length)*100).toFixed(1)):0,
      lowStock:lowStock.length,
    },
    statusCounts,
    paymentCounts,
    currencyTotals:Object.fromEntries(Object.entries(currencyTotals).map(([key,value]:any)=>[key,centsToUnit(value)])),
    calendar:{
      month,
      monthLabel:new Date(year,monthNumber-1,1).toLocaleDateString('es-DO',{month:'long',year:'numeric'}),
      days:dailySales,
    },
    calendarOrders:monthOrders.map(order=>({
      ...toOrder(order),
      date:reportDateKey(order.createdAt),
      salesChannel:(order as any).salesChannel||order.paymentProvider||'WEB',
      salesChannelLabel:SALES_CHANNEL_LABELS[(order as any).salesChannel||order.paymentProvider||'WEB']||((order as any).salesChannel||order.paymentProvider||'Web'),
      customerName:order.addressLine?.startsWith('Venta manual')?order.addressLine.replace('Venta manual - ','').replace('Venta manual','').trim()||'Venta manual':order.user?.name,
      itemSummary:order.items.map(item=>`${item.quantity} x ${item.product?.name||'Producto'}`).join(' + '),
      paidAmount:centsToUnit(paidFor(order)),
      balance:centsToUnit(Math.max(0,order.total-paidFor(order))),
    })),
    manualSummary:{orders:manualOrders.length,revenue:centsToUnit(manualTotal),paid:centsToUnit(manualPaid),pending:centsToUnit(Math.max(0,manualTotal-manualPaid)),profit:centsToUnit(manualTotal-manualCost),margin:manualTotal?Number((((manualTotal-manualCost)/manualTotal)*100).toFixed(1)):0},
    manualPaymentCounts,
    manualDailySales,
    manualOrders:manualMonthOrders.map(order=>({
      ...toOrder(order),
      date:reportDateKey(order.createdAt),
      salesChannel:(order as any).salesChannel||order.paymentProvider||'WEB',
      salesChannelLabel:SALES_CHANNEL_LABELS[(order as any).salesChannel||order.paymentProvider||'WEB']||((order as any).salesChannel||order.paymentProvider||'Web'),
      customerName:order.addressLine?.startsWith('Venta manual')?order.addressLine.replace('Venta manual - ','').replace('Venta manual','').trim()||'Venta manual':order.user?.name,
      itemSummary:order.items.map(item=>`${item.quantity} x ${item.product?.name||'Producto'}`).join(' + '),
      paidAmount:centsToUnit(paidFor(order)),
      balance:centsToUnit(Math.max(0,order.total-paidFor(order))),
    })),
    dailySales,
    categorySales:[...categorySales.values()].sort((a,b)=>b.revenue-a.revenue).map(item=>({...item,revenue:centsToUnit(item.revenue)})),
    topProducts:[...productSales.values()].sort((a,b)=>b.revenue-a.revenue).slice(0,10).map(p=>({...p,revenue:centsToUnit(p.revenue)})),
    lowStock,
    movements:movements.map(m=>({...m,productName:m.product?.name,variantName:m.variant?variantDisplayName(m.variant):null})),
    coupons:coupons.map(toPromo)
  });
});

router.get('/reports',async(_req,res)=>{
  const now=new Date();
  const since30=new Date(now.getTime()-30*24*60*60*1000);
  const [orders,products,movements,payments,coupons,customers]=await Promise.all([
    prisma.order.findMany({take:800,orderBy:{createdAt:'desc'},include:{user:true,items:{include:{product:{include:{category:true}}}},promoCode:true,payments:true}}),
    prisma.product.findMany({include:{category:true,variants:{orderBy:{sortOrder:'asc'}}}}),
    prisma.inventoryMovement.findMany({take:160,orderBy:{createdAt:'desc'},include:{product:true,variant:true}}),
    prisma.paymentTransaction.findMany({take:300,orderBy:{createdAt:'desc'}}),
    prisma.promoCode.findMany({orderBy:{createdAt:'desc'}}),
    prisma.user.count({where:{role:'CUSTOMER'}}),
  ]);
  const completed=orders.filter(o=>!['CANCELLED'].includes(o.status));
  const recentCompleted=completed.filter(o=>o.createdAt>=since30);
  const totalRevenue=completed.reduce((s,o)=>s+o.total,0);
  const totalDiscount=completed.reduce((s,o)=>s+(o.discount||0),0);
  const totalShipping=completed.reduce((s,o)=>s+o.shipping,0);
  const totalCost=completed.reduce((sum,order)=>sum+order.items.reduce((itemSum,item)=>itemSum+((item.product?.cost||0)*item.quantity),0),0);
  const totalProfit=totalRevenue-totalCost;
  const statusCounts=orders.reduce((acc:any,o)=>{acc[o.status]=(acc[o.status]||0)+1;return acc;},{});
  const paymentCounts=payments.reduce((acc:any,p)=>{acc[p.status]=(acc[p.status]||0)+1;return acc;},{});
  const currencyTotals=completed.reduce((acc:any,o)=>{const key=o.currency||'DOP'; acc[key]=(acc[key]||0)+o.total; return acc;},{});
  const productSales=new Map<string,{id:string;name:string;quantity:number;revenue:number;stock:number;category:string}>();
  completed.forEach(order=>order.items.forEach(item=>{
    const current=productSales.get(item.productId)||{id:item.productId,name:item.product?.name||item.productId,quantity:0,revenue:0,stock:item.product?.stock||0,category:item.product?.category?.name||'Sin categoría'};
    current.quantity+=item.quantity; current.revenue+=item.price*item.quantity; productSales.set(item.productId,current);
  }));
  const dailySales=Array.from({length:30}).map((_,index)=>{
    const day=new Date(now);
    day.setDate(now.getDate()-(29-index));
    const date=day.toISOString().slice(0,10);
    const dayOrders=completed.filter(o=>o.createdAt.toISOString().slice(0,10)===date);
    return {date,orders:dayOrders.length,revenue:centsToUnit(dayOrders.reduce((s,o)=>s+o.total,0)),profit:centsToUnit(dayOrders.reduce((s,o)=>s+o.total-o.items.reduce((cost,item)=>cost+((item.product?.cost||0)*item.quantity),0),0))};
  });
  const categorySales=new Map<string,{name:string;quantity:number;revenue:number}>();
  completed.forEach(order=>order.items.forEach(item=>{
    const key=item.product?.category?.name||'Sin categoría';
    const current=categorySales.get(key)||{name:key,quantity:0,revenue:0};
    current.quantity+=item.quantity;
    current.revenue+=item.price*item.quantity;
    categorySales.set(key,current);
  }));
  const lowStock=products.map(toProduct).filter((p:any)=>p.availableStock<=p.lowStockThreshold);
  res.json({
    summary:{
      orders:orders.length,
      completedOrders:completed.length,
      orders30:recentCompleted.length,
      customers,
      revenue:centsToUnit(totalRevenue),
      revenue30:centsToUnit(recentCompleted.reduce((s,o)=>s+o.total,0)),
      discount:centsToUnit(totalDiscount),
      shipping:centsToUnit(totalShipping),
      cost:centsToUnit(totalCost),
      profit:centsToUnit(totalProfit),
      margin:totalRevenue?Number(((totalProfit/totalRevenue)*100).toFixed(1)):0,
      averageOrder:completed.length?centsToUnit(totalRevenue/completed.length):0,
      cancellationRate:orders.length?Number(((orders.filter(o=>o.status==='CANCELLED').length/orders.length)*100).toFixed(1)):0,
      lowStock:lowStock.length,
    },
    statusCounts,
    paymentCounts,
    currencyTotals:Object.fromEntries(Object.entries(currencyTotals).map(([key,value]:any)=>[key,centsToUnit(value)])),
    dailySales,
    categorySales:[...categorySales.values()].sort((a,b)=>b.revenue-a.revenue).map(item=>({...item,revenue:centsToUnit(item.revenue)})),
    topProducts:[...productSales.values()].sort((a,b)=>b.revenue-a.revenue).slice(0,10).map(p=>({...p,revenue:centsToUnit(p.revenue)})),
    lowStock,
    movements:movements.map(m=>({...m,productName:m.product?.name,variantName:m.variant?variantDisplayName(m.variant):null})),
    coupons:coupons.map(toPromo)
  });
});

const couponSchema=z.object({code:z.string().min(3),type:z.enum(['PERCENT','AMOUNT']).default('PERCENT'),percent:z.number().int().min(0).max(100).default(0),amount:z.number().min(0).default(0),minSubtotal:z.number().min(0).default(0),maxUses:z.number().int().min(1).optional().nullable(),active:z.boolean().default(true),expiresAt:z.string().optional().nullable()});
router.get('/coupons',async(_req,res)=>res.json((await prisma.promoCode.findMany({orderBy:{createdAt:'desc'},include:{_count:{select:{orders:true}}}})).map(toPromo)));
router.post('/coupons',async(req,res)=>{
  const p=couponSchema.safeParse(req.body);
  if(!p.success)return res.status(400).json({message:'Cupon invalido',errors:p.error.flatten()});
  const d=p.data;
  const coupon=await prisma.promoCode.create({data:{...d,code:d.code.trim().toUpperCase(),amount:unitToCents(d.amount),minSubtotal:unitToCents(d.minSubtotal),expiresAt:d.expiresAt?new Date(d.expiresAt):null}});
  await audit(req.user?.id,`COUPON_CREATED:${coupon.code}`,req.ip);
  res.status(201).json(toPromo(coupon));
});
router.patch('/coupons/:id',async(req,res)=>{
  const p=couponSchema.partial().safeParse(req.body);
  if(!p.success)return res.status(400).json({message:'Cupon invalido',errors:p.error.flatten()});
  const d:any={...p.data};
  if(d.code)d.code=String(d.code).trim().toUpperCase();
  if(d.amount!==undefined)d.amount=unitToCents(d.amount);
  if(d.minSubtotal!==undefined)d.minSubtotal=unitToCents(d.minSubtotal);
  if(d.expiresAt!==undefined)d.expiresAt=d.expiresAt?new Date(d.expiresAt):null;
  const coupon=await prisma.promoCode.update({where:{id:req.params.id},data:d});
  await audit(req.user?.id,`COUPON_UPDATED:${coupon.code}`,req.ip);
  res.json(toPromo(coupon));
});
router.delete('/coupons/:id',async(req,res)=>{
  const used=await prisma.order.count({where:{promoCodeId:req.params.id}});
  if(used>0){const coupon=await prisma.promoCode.update({where:{id:req.params.id},data:{active:false}}); await audit(req.user?.id,`COUPON_DISABLED:${coupon.code}`,req.ip); return res.json(toPromo(coupon));}
  const coupon=await prisma.promoCode.delete({where:{id:req.params.id}});
  await audit(req.user?.id,`COUPON_DELETED:${coupon.code}`,req.ip);
  res.json({ok:true});
});

router.get('/inventory/movements',async(req,res)=>{
  const productId=String(req.query.productId||'');
  const variantId=String(req.query.variantId||'');
  const type=String(req.query.type||'');
  const movements=await prisma.inventoryMovement.findMany({where:{AND:[productId?{productId}:{},variantId?{variantId}:{},type?{type}:{}]},take:200,orderBy:{createdAt:'desc'},include:{product:{include:{category:true,variants:true}},variant:true}});
  res.json(movements.map(m=>({...m,product:m.product?toProduct(m.product):null,variant:m.variant?variantToUi(m.variant):null})));
});
router.post('/inventory/adjust',async(req,res)=>{
  const p=z.object({productId:z.string().min(1),variantId:z.string().optional().nullable(),quantity:z.number().int().refine(v=>v!==0,'El ajuste no puede ser cero'),reason:z.string().min(2).default('Ajuste manual')}).safeParse(req.body);
  if(!p.success)return res.status(400).json({message:'Ajuste invalido',errors:p.error.flatten()});
  const current=await prisma.product.findUnique({where:{id:p.data.productId},include:{variants:true}});
  if(!current)return res.status(404).json({message:'Producto no encontrado'});
  const variant=p.data.variantId?current.variants.find(v=>v.id===p.data.variantId):null;
  if(p.data.variantId&&!variant)return res.status(404).json({message:'Variante no encontrada para este producto.'});
  const currentStock=variant?variant.stock:current.stock;
  if(currentStock+p.data.quantity<0)return res.status(409).json({message:'El ajuste dejaria el stock en negativo.'});
  const result=await prisma.$transaction(async tx=>{
    if(variant){
      const updatedVariant=await tx.productVariant.update({where:{id:variant.id},data:{stock:{increment:p.data.quantity}}});
      const movement=await tx.inventoryMovement.create({data:{productId:p.data.productId,variantId:variant.id,type:'ADJUSTMENT',quantity:p.data.quantity,reason:p.data.reason,reference:req.user?.id}});
      return {product:current,variant:updatedVariant,movement};
    }
    const updated=await tx.product.update({where:{id:p.data.productId},data:{stock:{increment:p.data.quantity}},include:{category:true,orderItems:true,variants:true}});
    const movement=await tx.inventoryMovement.create({data:{productId:p.data.productId,type:'ADJUSTMENT',quantity:p.data.quantity,reason:p.data.reason,reference:req.user?.id}});
    return {product:updated,movement};
  });
  await audit(req.user?.id,`INVENTORY_ADJUSTED:${p.data.productId}:${p.data.variantId||'base'}:${p.data.quantity}`,req.ip);
  res.json({product:toProduct(result.product),variant:result.variant?variantToUi(result.variant):null,movement:result.movement});
});
router.get('/logs',async(req,res)=>{
  const q=String(req.query.q||'').trim();
  const type=String(req.query.type||'').trim().toUpperCase();
  const requestedTake=Number(req.query.take);
  const take=Number.isFinite(requestedTake)?Math.min(Math.max(Math.floor(requestedTake),10),200):20;
  const logs=await prisma.auditLog.findMany({
    where:{AND:[
      type?{action:{startsWith:type}}:{},
      q?{OR:[{action:{contains:q}},{ip:{contains:q}},{user:{name:{contains:q}}},{user:{email:{contains:q}}}]}:{},
    ]},
    take,
    orderBy:{createdAt:'desc'},
    include:{user:true},
  });
  res.json(logs);
});
router.get('/security-bans',async(req,res)=>{
  const requestedTake=Number(req.query.take);
  const take=Number.isFinite(requestedTake)?Math.min(Math.max(Math.floor(requestedTake),10),200):20;
  res.json(await prisma.securityIpBan.findMany({take,orderBy:{updatedAt:'desc'}}));
});
router.post('/security-bans/:id/unban',async(req,res)=>{
  const row=await prisma.securityIpBan.update({where:{id:req.params.id},data:{banned:false,hits:0,reason:null,bannedAt:null,bannedUntil:null}});
  await audit(req.user?.id,`SECURITY_IP_UNBANNED:${row.ip}`,req.ip);
  res.json(row);
});
router.put('/settings/:key',async(req,res)=>{
  const p=z.object({value:z.string()}).safeParse(req.body);
  if(!p.success)return res.status(400).json({message:'Valor inválido'});
  const key=req.params.key;
  const value=p.data.value;
  const s=await prisma.siteSetting.upsert({where:{key},update:{value},create:{key,value}});

  if(key==='storeMode'){
    const publicKeys=['showModels','showDrops','showNews','showCategories','showFeatured','showFooter'];
    const nextValue=value==='SHOP'?'true':'false';
    await Promise.all(publicKeys.map(k=>prisma.siteSetting.upsert({where:{key:k},update:{value:nextValue},create:{key:k,value:nextValue}})));
    await prisma.siteSetting.upsert({where:{key:'maintenance'},update:{value:String(value==='MAINTENANCE')},create:{key:'maintenance',value:String(value==='MAINTENANCE')}});
  }

  await audit(req.user?.id,`SETTING_UPDATED:${s.key}`,req.ip);
  res.json(s);
});

export default router;
