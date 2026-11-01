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
    { key:'showFooter', value:'true' },
    { key:'showShippingInfo', value:'true' }
  ]});

  await prisma.contentBlock.createMany({ data: [
    {
      area: 'FAQ',
      title: '¿Magma Blaze tiene tienda fisica?',
      body: 'No tenemos tienda fisica por ahora. Somos una tienda virtual: puedes explorar los productos en la web y confirmar disponibilidad o detalles por WhatsApp.',
      sortOrder: 1,
      isActive: true
    },
    {
      area: 'FAQ',
      title: '¿Como realizo un pedido?',
      body: 'Puedes agregar productos al carrito, guardar favoritos o tocar verificar disponibilidad. Luego confirmamos por WhatsApp el articulo, variante, direccion y forma de pago antes de preparar el envio.',
      sortOrder: 2,
      isActive: true
    },
    {
      area: 'FAQ',
      title: '¿Cuanto tarda mi envio?',
      body: 'El tiempo maximo estimado es de 2 a 4 horas, dependiendo del destino de envio, disponibilidad del producto y confirmacion del pedido.',
      sortOrder: 3,
      isActive: true
    },
    {
      area: 'FAQ',
      title: '¿Cuando el envio es gratis?',
      body: 'En la ciudad de La Vega tenemos envio gratis. Ademas, los pedidos mayores de RD$1,250 califican para envio gratis solo dentro de la ciudad de La Vega.',
      sortOrder: 4,
      isActive: true
    },
    {
      area: 'FAQ',
      title: '¿Hacen envios fuera de La Vega?',
      body: 'Si. Para otras zonas de Republica Dominicana y Estados Unidos, el costo y tiempo de envio se confirman antes de finalizar el pedido.',
      sortOrder: 5,
      isActive: true
    },
    {
      area: 'FAQ',
      title: '¿Como se si un producto esta disponible?',
      body: 'Cada producto puede verificarse por WhatsApp. Si hay variantes, colores o lentes disponibles, te confirmamos la opcion exacta antes de preparar el pedido.',
      sortOrder: 6,
      isActive: true
    },
    {
      area: 'FAQ',
      title: '¿Como puedo pagar?',
      body: 'El metodo de pago se confirma durante la atencion por WhatsApp. Si eliges transferencia, el pedido queda sujeto a confirmacion del pago antes del envio.',
      sortOrder: 7,
      isActive: true
    },
    {
      area: 'FAQ',
      title: '¿Que pasa si necesito ayuda con mi pedido?',
      body: 'Puedes escribirnos desde la seccion de ayuda, WhatsApp o mensajes de tu cuenta. Te damos atencion personalizada para dudas, cambios y seguimiento.',
      sortOrder: 8,
      isActive: true
    },
    {
      area: 'TERMS',
      title: 'Uso del sitio',
      body: 'El catálogo de Magma Blaze se ofrece para consultar productos, características y precios. El uso indebido del sitio, la manipulación de sus funciones o cualquier intento de afectar su disponibilidad puede provocar la restricción de acceso.',
      sortOrder: 1,
      isActive: true
    },
    {
      area: 'TERMS',
      title: 'Disponibilidad y reserva',
      body: 'Mostrar un producto en el catálogo no constituye una reserva. La pieza queda separada únicamente cuando Magma Blaze confirma expresamente la disponibilidad y las condiciones de la solicitud.',
      sortOrder: 2,
      isActive: true
    },
    {
      area: 'TERMS',
      title: 'Precios y promociones',
      body: 'Los precios y promociones pueden cambiar antes de que una solicitud sea confirmada. Nunca aplicaremos un cambio retroactivo a una compra que ya haya sido aceptada y confirmada por ambas partes.',
      sortOrder: 3,
      isActive: true
    },
    {
      area: 'TERMS',
      title: 'Representación de los productos',
      body: 'Procuramos que las fotografías y descripciones sean fieles al producto. El color puede variar ligeramente según la iluminación de la foto, la pantalla utilizada o pequeños detalles propios de cada pieza.',
      sortOrder: 4,
      isActive: true
    },
    {
      area: 'TERMS',
      title: 'Contenido y propiedad de la marca',
      body: 'Las fotografías, textos, logotipos, diseños y demás contenido de Magma Blaze no pueden copiarse, modificarse o utilizarse comercialmente sin autorización previa.',
      sortOrder: 5,
      isActive: true
    },
    {
      area: 'TERMS',
      title: 'Actualización de estas condiciones',
      body: 'Podemos actualizar estas condiciones para reflejar cambios en el funcionamiento de la tienda. La versión visible en esta página será la aplicable desde su fecha de publicación.',
      sortOrder: 6,
      isActive: true
    },
    {
      area: 'PRIVACY',
      title: 'Información que utilizamos',
      body: 'Tratamos únicamente la información necesaria para responder consultas, identificar una solicitud y coordinar la atención, como nombre, datos de contacto y detalles de los productos de interés.',
      sortOrder: 1,
      isActive: true
    },
    {
      area: 'PRIVACY',
      title: 'Carrito guardado en tu navegador',
      body: 'El carrito y algunas preferencias pueden almacenarse localmente en tu dispositivo para que permanezcan disponibles cuando vuelvas. Puedes eliminarlos al vaciar el carrito o borrar los datos del navegador.',
      sortOrder: 2,
      isActive: true
    },
    {
      area: 'PRIVACY',
      title: 'Cómo usamos la información',
      body: 'La información se usa para atenderte, mantener el funcionamiento del sitio, prevenir usos indebidos y mejorar la experiencia de compra. No vendemos tus datos personales.',
      sortOrder: 3,
      isActive: true
    },
    {
      area: 'PRIVACY',
      title: 'Proveedores necesarios',
      body: 'Algunos datos pueden ser procesados por proveedores técnicos indispensables para operar la tienda, como alojamiento, base de datos, correo o mensajería. Solo reciben la información necesaria para prestar su servicio.',
      sortOrder: 4,
      isActive: true
    },
    {
      area: 'PRIVACY',
      title: 'Conservación y eliminación',
      body: 'Conservamos la información durante el tiempo necesario para atender la solicitud, cumplir obligaciones aplicables y proteger la operación de la tienda. Puedes pedir la corrección o eliminación de tus datos cuando corresponda.',
      sortOrder: 5,
      isActive: true
    },
    {
      area: 'PRIVACY',
      title: 'Seguridad y tus derechos',
      body: 'Aplicamos medidas razonables para limitar accesos no autorizados. Si deseas consultar, corregir o solicitar la eliminación de tu información, puedes comunicarte mediante los canales oficiales de Magma Blaze.',
      sortOrder: 6,
      isActive: true
    }
  ]});
}
main().finally(()=>prisma.$disconnect());
