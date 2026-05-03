import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const faqBlocks = [
  {
    title: '¿Magma Blaze tiene tienda fisica?',
    body: 'No tenemos tienda fisica por ahora. Somos una tienda virtual: puedes explorar los productos en la web y confirmar disponibilidad o detalles por WhatsApp.',
  },
  {
    title: '¿Como realizo un pedido?',
    body: 'Puedes agregar productos al carrito, guardar favoritos o tocar verificar disponibilidad. Luego confirmamos por WhatsApp el articulo, variante, direccion y forma de pago antes de preparar el envio.',
  },
  {
    title: '¿Cuanto tarda mi envio?',
    body: 'El tiempo maximo estimado es de 2 a 4 horas, dependiendo del destino de envio, disponibilidad del producto y confirmacion del pedido.',
  },
  {
    title: '¿Cuando el envio es gratis?',
    body: 'En la ciudad de La Vega tenemos envio gratis. Ademas, los pedidos mayores de RD$1,250 califican para envio gratis solo dentro de la ciudad de La Vega.',
  },
  {
    title: '¿Hacen envios fuera de La Vega?',
    body: 'Si. Para otras zonas de Republica Dominicana y Estados Unidos, el costo y tiempo de envio se confirman antes de finalizar el pedido.',
  },
  {
    title: '¿Como se si un producto esta disponible?',
    body: 'Cada producto puede verificarse por WhatsApp. Si hay variantes, colores o lentes disponibles, te confirmamos la opcion exacta antes de preparar el pedido.',
  },
  {
    title: '¿Como puedo pagar?',
    body: 'El metodo de pago se confirma durante la atencion por WhatsApp. Si eliges transferencia, el pedido queda sujeto a confirmacion del pago antes del envio.',
  },
  {
    title: '¿Que pasa si necesito ayuda con mi pedido?',
    body: 'Puedes escribirnos desde la seccion de ayuda, WhatsApp o mensajes de tu cuenta. Te damos atencion personalizada para dudas, cambios y seguimiento.',
  },
];

async function main() {
  for (const [index, block] of faqBlocks.entries()) {
    const existing = await prisma.contentBlock.findFirst({
      where: { area: 'FAQ', title: block.title },
      select: { id: true },
    });

    if (existing) continue;

    await prisma.contentBlock.create({
      data: {
        area: 'FAQ',
        title: block.title,
        body: block.body,
        sortOrder: index + 1,
        isActive: true,
      },
    });
  }
}

main().finally(() => prisma.$disconnect());
