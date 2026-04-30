import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

const ADMIN_PERMISSIONS = [
  'dashboard',
  'products',
  'categories',
  'orders',
  'drops',
  'models',
  'content',
  'shipping',
  'users',
  'finance',
  'reports',
  'coupons',
  'inventory',
  'settings',
  'security',
  'notifications',
  'support',
  'roles'
];

async function main() {
  await prisma.emailVerificationCode.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.orderEvent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.helpTicketMessage.deleteMany();
  await prisma.helpTicket.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.paymentTransaction.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.modelPhoto.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.promoCode.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.shippingZone.deleteMany();
  await prisma.drop.deleteMany();
  await prisma.newsPost.deleteMany();
  await prisma.storeMetric.deleteMany();
  await prisma.contentBlock.deleteMany();
  await prisma.siteSetting.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.role.deleteMany();

  const adminRole = await prisma.role.create({
    data: {
      name: 'Administrador',
      slug: 'ADMIN',
      description: 'Acceso completo al sistema.',
      permissions: { create: ADMIN_PERMISSIONS.map(permission => ({ permission })) }
    }
  });
  await prisma.role.create({
    data: {
      name: 'Cliente',
      slug: 'CUSTOMER',
      description: 'Cuenta de comprador sin acceso administrativo.'
    }
  });

  const adminPass = await bcrypt.hash('Dixniss21', 12);
  await prisma.user.create({ data: { email: 'dianasantanamrtz@gmail.com', name: 'Diana Santana', passwordHash: adminPass, role: adminRole.slug, isVerified: true, twoFactorEmailEnabled: false, country:'RD', region:'La Vega', language:'es', currency:'DOP', preferredContact:'SYSTEM' }});

  await prisma.siteSetting.createMany({ data: [
    { key:'storeMode', value:'SHOP' },
    { key:'maintenance', value:'false' },
    { key:'showModels', value:'true' },
    { key:'showDrops', value:'true' },
    { key:'showNews', value:'true' },
    { key:'showCategories', value:'true' },
    { key:'showFeatured', value:'true' },
    { key:'showFooter', value:'true' }
  ]});
}
main().finally(()=>prisma.$disconnect());
