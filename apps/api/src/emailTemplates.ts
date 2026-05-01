import { config } from './config.js';

type TemplateInput = Record<string, unknown>;
type MailTemplate = { subject: string; text: string; html: string };

const brand = {
  name: 'Magma Blaze',
  accent: '#ff6a1a',
  bg: '#080605',
  panel: '#14100d',
  text: '#ffffff',
  muted: '#b9aaa1',
};

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function money(value: unknown, currency = 'DOP') {
  const symbol = currency === 'USD' ? 'US$' : 'RD$';
  const amount = Number(value || 0);
  return `${symbol} ${amount.toLocaleString(currency === 'USD' ? 'en-US' : 'es-DO', { minimumFractionDigits: currency === 'USD' ? 2 : 0, maximumFractionDigits: currency === 'USD' ? 2 : 0 })}`;
}

function accountUrl(path = '/cuenta') {
  const base = (config.frontendUrl || 'https://magmablaze.com').replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function layout(title: string, intro: string, body: string, cta?: { label: string; url: string }) {
  const ctaHtml = cta ? `<a href="${escapeHtml(cta.url)}" style="display:inline-block;background:${brand.accent};color:#120702;text-decoration:none;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:14px 20px;border-radius:999px;margin-top:18px">${escapeHtml(cta.label)}</a>` : '';
  return `<!doctype html><html><body style="margin:0;background:${brand.bg};color:${brand.text};font-family:Arial,Helvetica,sans-serif"><div style="padding:28px"><div style="max-width:620px;margin:0 auto;background:${brand.panel};border:1px solid rgba(255,106,26,.28);border-radius:24px;padding:28px"><p style="color:${brand.accent};font-size:12px;letter-spacing:.28em;text-transform:uppercase;font-weight:800;margin:0 0 12px">${brand.name}</p><h1 style="font-size:28px;line-height:1.1;margin:0 0 12px;color:${brand.text}">${escapeHtml(title)}</h1><p style="font-size:15px;line-height:1.65;color:${brand.muted};margin:0 0 18px">${escapeHtml(intro)}</p>${body}${ctaHtml}<p style="border-top:1px solid rgba(255,255,255,.09);color:#847870;font-size:12px;line-height:1.6;margin:26px 0 0;padding-top:16px">Este correo fue enviado automaticamente por Magma Blaze. Si no reconoces esta accion, responde a este correo o contactanos por WhatsApp.</p></div></div></body></html>`;
}

function codeBlock(code: string) {
  return `<div style="font-size:34px;letter-spacing:10px;font-weight:900;color:${brand.accent};background:#080605;border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:18px 20px;text-align:center;margin:18px 0">${escapeHtml(code)}</div>`;
}

function messagePanel(lines: string[]) {
  return `<div style="background:#090706;border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:18px;margin-top:14px">${lines.map(line => `<p style="margin:0 0 8px;color:${brand.muted};font-size:14px;line-height:1.55">${escapeHtml(line)}</p>`).join('')}</div>`;
}

export const emailTemplates = {
  verificationCode({ code }: TemplateInput): MailTemplate {
    const subject = 'Verifica tu cuenta Magma Blaze';
    const text = `Tu codigo unico de verificacion es: ${code}. Expira en 10 minutos. Nunca compartas este codigo.`;
    const html = layout('Verifica tu cuenta', 'Usa este codigo para activar tu cuenta y proteger el acceso.', codeBlock(String(code)), { label: 'Abrir mi cuenta', url: accountUrl('/cuenta') });
    return { subject, text, html };
  },

  loginCode({ code }: TemplateInput): MailTemplate {
    const subject = 'Codigo de acceso Magma Blaze';
    const text = `Tu codigo unico para iniciar sesion es: ${code}. Expira en 10 minutos. Si no intentaste entrar, cambia tu contrasena.`;
    const html = layout('Codigo de acceso', 'Usa este codigo para completar tu inicio de sesion.', codeBlock(String(code)), { label: 'Ir a iniciar sesion', url: accountUrl('/cuenta') });
    return { subject, text, html };
  },

  orderReceived({ orderId, total, currency }: TemplateInput): MailTemplate {
    const subject = 'Recibimos tu solicitud de pedido - Magma Blaze';
    const amount = money(total, String(currency || 'DOP'));
    const text = `Recibimos tu pedido ${orderId}. Total aproximado: ${amount}. Confirmaremos disponibilidad y pago antes de procesarlo.`;
    const html = layout('Pedido recibido', 'Tu solicitud llego correctamente. Confirmaremos disponibilidad, envio y pago antes de procesarlo.', messagePanel([`Pedido: ${orderId}`, `Total aproximado: ${amount}`, 'Estado: pendiente de confirmacion de la tienda']), { label: 'Ver mis pedidos', url: accountUrl('/cuenta') });
    return { subject, text, html };
  },

  shippingConfirmation({ orderId, shipping, total, currency }: TemplateInput): MailTemplate {
    const subject = 'Confirma el total de tu pedido - Magma Blaze';
    const text = `Tu pedido ${orderId} ya tiene costo de envio: ${money(shipping, String(currency || 'DOP'))}. Total: ${money(total, String(currency || 'DOP'))}. Entra a tu cuenta para aceptar o cancelar.`;
    const html = layout('Confirma el total de tu pedido', 'Actualizamos el costo de envio. Puedes aceptar o cancelar la tarifa desde tu cuenta.', messagePanel([`Pedido: ${orderId}`, `Envio: ${money(shipping, String(currency || 'DOP'))}`, `Total: ${money(total, String(currency || 'DOP'))}`]), { label: 'Responder desde mi cuenta', url: accountUrl('/cuenta') });
    return { subject, text, html };
  },

  orderStatus({ orderId, statusLabel, note }: TemplateInput): MailTemplate {
    const subject = 'Actualizacion de tu pedido - Magma Blaze';
    const text = `Tu pedido ${orderId} ahora esta: ${statusLabel}.${note ? ` Nota: ${note}` : ''}`;
    const html = layout('Tu pedido fue actualizado', 'Hay una nueva actualizacion en el estado de tu pedido.', messagePanel([`Pedido: ${orderId}`, `Estado: ${statusLabel}`, note ? `Nota: ${note}` : 'Puedes seguir el historial desde tu cuenta.']), { label: 'Ver pedido', url: accountUrl('/cuenta') });
    return { subject, text, html };
  },

  fulfillmentUpdated({ orderId, tracking, driver, place }: TemplateInput): MailTemplate {
    const subject = 'Datos de entrega actualizados - Magma Blaze';
    const lines = [`Pedido: ${orderId}`];
    if (tracking) lines.push(`Tracking: ${tracking}`);
    if (driver) lines.push(`Chofer: ${driver}`);
    if (place) lines.push(`Parada/entrega: ${place}`);
    const text = `Actualizamos los datos de entrega de tu pedido ${orderId}. ${lines.slice(1).join(' | ')}`;
    const html = layout('Datos de entrega actualizados', 'Agregamos informacion de seguimiento o entrega a tu pedido.', messagePanel(lines), { label: 'Ver mis pedidos', url: accountUrl('/cuenta') });
    return { subject, text, html };
  },

  saleConfirmed({ orderId }: TemplateInput): MailTemplate {
    const subject = 'Pedido confirmado - Magma Blaze';
    const text = `Tu pedido ${orderId} fue confirmado por la tienda y esta en procesamiento.`;
    const html = layout('Pedido confirmado', 'Confirmamos disponibilidad/pago y tu pedido entro en procesamiento.', messagePanel([`Pedido: ${orderId}`, 'Estado: procesando']), { label: 'Ver mis pedidos', url: accountUrl('/cuenta') });
    return { subject, text, html };
  },

  saleCancelled({ orderId }: TemplateInput): MailTemplate {
    const subject = 'Pedido cancelado - Magma Blaze';
    const text = `Tu pedido ${orderId} fue cancelado por la tienda. Si necesitas ayuda, abre un ticket desde tu cuenta.`;
    const html = layout('Pedido cancelado', 'Tu pedido fue cancelado. Si necesitas mas detalles, puedes escribirnos desde ayuda.', messagePanel([`Pedido: ${orderId}`, 'Estado: cancelado']), { label: 'Abrir ayuda', url: accountUrl('/cuenta') });
    return { subject, text, html };
  },

  ticketCreated({ ticketId, subject: ticketSubject }: TemplateInput): MailTemplate {
    const subject = 'Ticket recibido - Magma Blaze';
    const text = `Recibimos tu ticket ${ticketId}: ${ticketSubject}. Te responderemos por el metodo seleccionado.`;
    const html = layout('Ticket recibido', 'Tu solicitud de ayuda fue creada correctamente. Te responderemos por el metodo seleccionado.', messagePanel([`Ticket: ${ticketId}`, `Asunto: ${ticketSubject}`]), { label: 'Ver mensajes', url: accountUrl('/cuenta') });
    return { subject, text, html };
  },

  ticketReply({ ticketId, subject: ticketSubject, body }: TemplateInput): MailTemplate {
    const subject = 'Respuesta de soporte - Magma Blaze';
    const text = `Respondimos tu ticket ${ticketId}: ${ticketSubject}. Mensaje: ${body}`;
    const html = layout('Respuesta de soporte', 'Nuestro equipo respondio tu ticket. Puedes continuar la conversacion desde tu cuenta.', messagePanel([`Ticket: ${ticketId}`, `Asunto: ${ticketSubject}`, `Respuesta: ${body}`]), { label: 'Responder ticket', url: accountUrl('/cuenta') });
    return { subject, text, html };
  },

  ticketStatus({ ticketId, subject: ticketSubject, status }: TemplateInput): MailTemplate {
    const subject = 'Ticket actualizado - Magma Blaze';
    const text = `Tu ticket ${ticketId} (${ticketSubject}) ahora esta: ${status}.`;
    const html = layout('Ticket actualizado', 'Actualizamos el estado de tu ticket de ayuda.', messagePanel([`Ticket: ${ticketId}`, `Asunto: ${ticketSubject}`, `Estado: ${status}`]), { label: 'Ver ticket', url: accountUrl('/cuenta') });
    return { subject, text, html };
  },
};