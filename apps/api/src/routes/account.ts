import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const preferenceSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  preferredContact: z.enum(['SYSTEM','WHATSAPP']).optional(),
  country: z.enum(['RD','US']).optional(),
  region: z.string().optional().nullable(),
  language: z.enum(['es','en']).optional(),
  currency: z.enum(['DOP','USD']).optional(),
  notifyOrders: z.boolean().optional(),
  notifyPromos: z.boolean().optional(),
  notifySupport: z.boolean().optional(),
  notifyDrops: z.boolean().optional(),
  twoFactorEmailEnabled: z.boolean().optional(),
});

const passwordSchema = z.string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .regex(/[A-Za-zÁÉÍÓÚáéíóúÑñ]/, 'La contraseña debe incluir al menos una letra.')
  .regex(/\d/, 'La contraseña debe incluir al menos un número.');

const addressSchema = z.object({
  country: z.enum(['RD','US']),
  province: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  line1: z.string().min(4),
  zip: z.string().optional().nullable(),
  isDefault: z.boolean().default(false),
});

const paymentSchema = z.object({
  type: z.enum(['CARD','PAYPAL','TRANSFER','CASH']).default('CARD'),
  label: z.string().min(2),
  brand: z.string().optional().nullable(),
  last4: z.string().regex(/^\d{0,4}$/).optional().nullable(),
  holderName: z.string().optional().nullable(),
  isDefault: z.boolean().default(false),
});

const ticketSchema = z.object({
  subject: z.string().min(4),
  category: z.enum(['GENERAL','ORDERS','SHIPPING','RETURNS','PAYMENTS','ACCOUNT']).default('GENERAL'),
  message: z.string().min(8),
  preferredContact: z.enum(['SYSTEM','WHATSAPP']).default('SYSTEM'),
  contactPhone: z.string().optional().nullable(),
  contactWhatsapp: z.string().optional().nullable(),
});

const ticketMessageSchema = z.object({
  body: z.string().min(2),
});

async function notifyStaff(permission: string, title: string, body: string, actionUrl='/admin', priority='NORMAL', type='SUPPORT') {
  const roles = await prisma.role.findMany({
    where: { active: true, permissions: { some: { permission } } },
    select: { slug: true },
  });
  const roleSlugs = roles.map(role => role.slug);
  const staff = await prisma.user.findMany({
    where: {
      blocked: false,
      OR: [{ role: 'ADMIN' }, roleSlugs.length ? { role: { in: roleSlugs } } : { role: '__none__' }],
    },
    select: { id: true },
  });
  if (!staff.length) return;
  await prisma.notification.createMany({
    data: staff.map(user => ({ userId: user.id, title, body, actionUrl, priority, type })),
  }).catch(() => null);
}

function publicTicket(ticket: any) {
  return {
    ...ticket,
    messages: ticket.messages?.map((m: any) => ({
      id: m.id,
      body: m.body,
      fromStaff: m.fromStaff,
      createdAt: m.createdAt,
      author: m.user ? { id: m.user.id, name: m.user.name, role: m.user.role } : null,
    })),
  };
}

function publicFavorite(item: any) {
  const product = item.product;
  return {
    id: item.id,
    productId: item.productId,
    createdAt: item.createdAt,
    product: product ? {
      ...product,
      price: Math.round((product.price ?? 0) / 100),
      priceUsd: Math.round((product.priceUsd ?? 0) / 100),
      mainImage: product.imageUrl,
      imageUrl: product.imageUrl,
    } : null,
  };
}

router.get('/preferences', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id:true, name:true, email:true, phone:true, whatsapp:true, preferredContact:true, country:true, region:true, language:true, currency:true, notifyOrders:true, notifyPromos:true, notifySupport:true, notifyDrops:true, role:true, twoFactorEmailEnabled:true },
  });
  res.json(user);
});

router.patch('/preferences', async (req, res) => {
  const parsed = preferenceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message:'Preferencias inválidas', errors: parsed.error.flatten() });
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: parsed.data,
    select: { id:true, name:true, email:true, phone:true, whatsapp:true, preferredContact:true, country:true, region:true, language:true, currency:true, notifyOrders:true, notifyPromos:true, notifySupport:true, notifyDrops:true, role:true, twoFactorEmailEnabled:true },
  });
  res.json(user);
});

router.patch('/security/password', async (req, res) => {
  const parsed = z.object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message:'Contraseña inválida', errors: parsed.error.flatten() });
  if (parsed.data.newPassword !== parsed.data.confirmPassword) return res.status(400).json({ message:'Las contraseñas no coinciden' });
  const user = await prisma.user.findUnique({ where:{ id:req.user!.id }, select:{ id:true, passwordHash:true } });
  if (!user) return res.status(404).json({ message:'Usuario no encontrado' });
  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return res.status(400).json({ message:'La contraseña actual no es correcta' });
  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({ where:{ id:user.id }, data:{ passwordHash } }),
    prisma.auditLog.create({ data:{ userId:user.id, action:'ACCOUNT_PASSWORD_CHANGED', ip:req.ip } }),
  ]);
  res.json({ ok:true, message:'Contraseña actualizada' });
});

router.get('/addresses', async (req, res) => {
  const addresses = await prisma.address.findMany({ where:{ userId:req.user!.id }, orderBy:[{ isDefault:'desc' }, { createdAt:'desc' }] });
  res.json(addresses);
});

router.post('/addresses', async (req, res) => {
  const parsed = addressSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message:'Dirección inválida', errors: parsed.error.flatten() });
  const count = await prisma.address.count({ where:{ userId:req.user!.id } });
  const shouldDefault = parsed.data.isDefault || count === 0;
  const address = await prisma.$transaction(async tx => {
    if (shouldDefault) await tx.address.updateMany({ where:{ userId:req.user!.id }, data:{ isDefault:false } });
    return tx.address.create({ data:{ ...parsed.data, userId:req.user!.id, isDefault:shouldDefault } });
  });
  res.status(201).json(address);
});

router.patch('/addresses/:id', async (req, res) => {
  const parsed = addressSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message:'Dirección inválida', errors: parsed.error.flatten() });
  const exists = await prisma.address.findFirst({ where:{ id:req.params.id, userId:req.user!.id } });
  if (!exists) return res.status(404).json({ message:'Dirección no encontrada' });
  const address = await prisma.$transaction(async tx => {
    if (parsed.data.isDefault) await tx.address.updateMany({ where:{ userId:req.user!.id }, data:{ isDefault:false } });
    return tx.address.update({ where:{ id:req.params.id }, data:parsed.data });
  });
  res.json(address);
});

router.delete('/addresses/:id', async (req, res) => {
  const exists = await prisma.address.findFirst({ where:{ id:req.params.id, userId:req.user!.id } });
  if (!exists) return res.status(404).json({ message:'Dirección no encontrada' });
  await prisma.address.delete({ where:{ id:req.params.id } });
  res.json({ ok:true });
});

router.get('/payment-methods', async (req, res) => {
  const methods = await prisma.paymentMethod.findMany({ where:{ userId:req.user!.id, active:true }, orderBy:[{ isDefault:'desc' }, { createdAt:'desc' }] });
  res.json(methods);
});

router.post('/payment-methods', async (req, res) => {
  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message:'Método de pago inválido', errors: parsed.error.flatten() });
  const count = await prisma.paymentMethod.count({ where:{ userId:req.user!.id, active:true } });
  const shouldDefault = parsed.data.isDefault || count === 0;
  const method = await prisma.$transaction(async tx => {
    if (shouldDefault) await tx.paymentMethod.updateMany({ where:{ userId:req.user!.id }, data:{ isDefault:false } });
    return tx.paymentMethod.create({ data:{ ...parsed.data, userId:req.user!.id, isDefault:shouldDefault } });
  });
  res.status(201).json(method);
});

router.patch('/payment-methods/:id', async (req, res) => {
  const parsed = paymentSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message:'Método de pago inválido', errors: parsed.error.flatten() });
  const exists = await prisma.paymentMethod.findFirst({ where:{ id:req.params.id, userId:req.user!.id } });
  if (!exists) return res.status(404).json({ message:'Método de pago no encontrado' });
  const method = await prisma.$transaction(async tx => {
    if (parsed.data.isDefault) await tx.paymentMethod.updateMany({ where:{ userId:req.user!.id }, data:{ isDefault:false } });
    return tx.paymentMethod.update({ where:{ id:req.params.id }, data:parsed.data });
  });
  res.json(method);
});

router.delete('/payment-methods/:id', async (req, res) => {
  const exists = await prisma.paymentMethod.findFirst({ where:{ id:req.params.id, userId:req.user!.id } });
  if (!exists) return res.status(404).json({ message:'Método de pago no encontrado' });
  await prisma.paymentMethod.update({ where:{ id:req.params.id }, data:{ active:false, isDefault:false } });
  res.json({ ok:true });
});

router.get('/tickets', async (req, res) => {
  const tickets = await prisma.helpTicket.findMany({
    where:{ userId:req.user!.id },
    orderBy:{ updatedAt:'desc' },
    include:{ messages:{ orderBy:{ createdAt:'asc' }, include:{ user:{ select:{ id:true, name:true, role:true } } } } },
  });
  res.json(tickets.map(publicTicket));
});

router.post('/tickets', async (req, res) => {
  const parsed = ticketSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message:'Ticket inválido', errors: parsed.error.flatten() });
  const ticket = await prisma.helpTicket.create({
    data:{
      userId:req.user!.id,
      subject: parsed.data.subject,
      category: parsed.data.category,
      preferredContact: parsed.data.preferredContact,
      contactPhone: parsed.data.contactPhone,
      contactWhatsapp: parsed.data.contactWhatsapp,
      messages:{ create:{ userId:req.user!.id, body:parsed.data.message, fromStaff:false } },
    },
    include:{ user:true, messages:{ orderBy:{ createdAt:'asc' }, include:{ user:{ select:{ id:true, name:true, role:true } } } } },
  });
  await notifyStaff('support', 'Nuevo ticket de ayuda', `${ticket.user.name} abrió: ${ticket.subject}`, '/admin', 'HIGH', 'SUPPORT');
  res.status(201).json(publicTicket(ticket));
});

router.post('/tickets/:id/messages', async (req, res) => {
  const parsed = ticketMessageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message:'Mensaje inválido' });
  const ticket = await prisma.helpTicket.findFirst({ where:{ id:req.params.id, userId:req.user!.id } });
  if (!ticket) return res.status(404).json({ message:'Ticket no encontrado' });
  const message = await prisma.helpTicketMessage.create({ data:{ ticketId:ticket.id, userId:req.user!.id, body:parsed.data.body, fromStaff:false } });
  await prisma.helpTicket.update({ where:{ id:ticket.id }, data:{ status:'OPEN' } });
  await notifyStaff('support', 'Respuesta de cliente', `El cliente respondió el ticket: ${ticket.subject}`, '/admin', 'NORMAL', 'SUPPORT');
  res.status(201).json(message);
});

router.get('/messages', async (req, res) => {
  const [notifications, tickets] = await Promise.all([
    prisma.notification.findMany({ where:{ userId:req.user!.id }, orderBy:{ createdAt:'desc' }, take:80 }),
    prisma.helpTicket.findMany({
      where:{ userId:req.user!.id },
      orderBy:{ updatedAt:'desc' },
      include:{ messages:{ where:{ fromStaff:true }, orderBy:{ createdAt:'desc' }, include:{ user:{ select:{ name:true, role:true } } } } },
    }),
  ]);
  const ticketMessages = tickets.flatMap(ticket => ticket.messages.map(message => ({
    id: message.id,
    type: 'ticket',
    title: ticket.subject,
    body: message.body,
    createdAt: message.createdAt,
    from: message.user?.name || 'Magma Blaze',
  })));
  const systemMessages = notifications.map(notification => ({
    id: notification.id,
    type: 'notification',
    notificationType: notification.type,
    priority: notification.priority,
    title: notification.title,
    body: notification.body,
    createdAt: notification.createdAt,
    read: notification.read,
    readAt: notification.readAt,
    actionUrl: notification.actionUrl,
    from: 'Sistema',
  }));
  res.json([...ticketMessages, ...systemMessages].sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()));
});

router.get('/notifications', async (req, res) => {
  const unread = req.query.unread === '1';
  const notifications = await prisma.notification.findMany({
    where:{ userId:req.user!.id, ...(unread ? { read:false } : {}) },
    orderBy:{ createdAt:'desc' },
    take:100,
  });
  res.json(notifications);
});

router.patch('/notifications/:id/read', async (req, res) => {
  const notification = await prisma.notification.findFirst({ where:{ id:req.params.id, userId:req.user!.id } });
  if (!notification) return res.status(404).json({ message:'Notificación no encontrada' });
  const updated = await prisma.notification.update({ where:{ id:notification.id }, data:{ read:true, readAt:new Date() } });
  res.json(updated);
});

router.post('/notifications/read-all', async (req, res) => {
  const result = await prisma.notification.updateMany({ where:{ userId:req.user!.id, read:false }, data:{ read:true, readAt:new Date() } });
  res.json({ ok:true, count:result.count });
});

router.get('/favorites', async (req, res) => {
  const items = await prisma.wishlistItem.findMany({
    where:{ userId:req.user!.id },
    orderBy:{ createdAt:'desc' },
    include:{ product:true },
  });
  res.json(items.map(publicFavorite));
});

router.post('/favorites', async (req, res) => {
  const parsed = z.object({ productId:z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message:'Producto inválido' });
  const product = await prisma.product.findUnique({ where:{ id:parsed.data.productId } });
  if (!product) return res.status(404).json({ message:'Producto no encontrado' });
  const item = await prisma.wishlistItem.upsert({
    where:{ userId_productId:{ userId:req.user!.id, productId:product.id } },
    update:{},
    create:{ userId:req.user!.id, productId:product.id },
    include:{ product:true },
  });
  res.status(201).json(publicFavorite(item));
});

router.delete('/favorites/:productId', async (req, res) => {
  await prisma.wishlistItem.deleteMany({ where:{ userId:req.user!.id, productId:req.params.productId } });
  res.json({ ok:true });
});

export default router;
