# email_templates

Guia para personalizar los correos automaticos de Magma Blaze.

Las plantillas reales estan en:

`apps/api/src/emailTemplates.ts`

Cada plantilla devuelve:

- `subject`: asunto del correo.
- `text`: version simple para clientes de correo sin HTML.
- `html`: version visual con estilo Magma Blaze.

## Variables necesarias

Configura estas variables en `apps/api/.env` para local y en Render para produccion:

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
MAIL_FROM="Magma Blaze <no-reply@magmablaze.com>"
FRONTEND_URL=https://magmablaze.com
```

Si tienes varios dominios permitidos:

```env
FRONTEND_URLS=https://magmablaze.com,https://www.magmablaze.com
```

## Plantillas incluidas

### 1. Verificacion de cuenta

Funcion: `verificationCode`

Se envia cuando el usuario necesita verificar su cuenta.

Placeholders:

- `code`

Mensaje base:

```text
Tu codigo unico de verificacion es: {{code}}. Expira en 10 minutos.
Nunca compartas este codigo.
```

### 2. Codigo de inicio de sesion

Funcion: `loginCode`

Se envia cuando el sistema solicita codigo de acceso por email.

Placeholders:

- `code`

Mensaje base:

```text
Tu codigo unico para iniciar sesion es: {{code}}.
Expira en 10 minutos.
```

### 3. Pedido recibido

Funcion: `orderReceived`

Se envia despues de crear una solicitud de pedido.

Placeholders:

- `orderId`
- `total`
- `currency`

Mensaje base:

```text
Recibimos tu pedido {{orderId}}.
Total aproximado: {{total}}.
Confirmaremos disponibilidad y pago antes de procesarlo.
```

### 4. Confirmacion de envio

Funcion: `shippingConfirmation`

Se envia cuando admin agrega el precio de envio y el cliente debe aceptar o cancelar.

Placeholders:

- `orderId`
- `shipping`
- `total`
- `currency`

Mensaje base:

```text
Tu pedido {{orderId}} ya tiene costo de envio: {{shipping}}.
Total: {{total}}.
Entra a tu cuenta para aceptar o cancelar.
```

### 5. Cambio de estado de pedido

Funcion: `orderStatus`

Se envia cuando admin cambia el estado del pedido.

Placeholders:

- `orderId`
- `statusLabel`
- `note`

Mensaje base:

```text
Tu pedido {{orderId}} ahora esta: {{statusLabel}}.
{{note}}
```

### 6. Datos de entrega actualizados

Funcion: `fulfillmentUpdated`

Se envia cuando admin agrega tracking, chofer o punto de entrega.

Placeholders:

- `orderId`
- `tracking`
- `driver`
- `place`

Mensaje base:

```text
Actualizamos los datos de entrega de tu pedido {{orderId}}.
Tracking: {{tracking}}
Chofer: {{driver}}
Parada/entrega: {{place}}
```

### 7. Pedido confirmado

Funcion: `saleConfirmed`

Se envia cuando admin confirma disponibilidad/pago y el pedido pasa a procesamiento.

Placeholders:

- `orderId`

Mensaje base:

```text
Tu pedido {{orderId}} fue confirmado por la tienda y esta en procesamiento.
```

### 8. Pedido cancelado

Funcion: `saleCancelled`

Se envia cuando admin cancela un pedido o venta.

Placeholders:

- `orderId`

Mensaje base:

```text
Tu pedido {{orderId}} fue cancelado por la tienda.
Si necesitas ayuda, abre un ticket desde tu cuenta.
```

### 9. Ticket creado

Funcion: `ticketCreated`

Se envia cuando el cliente abre un ticket de ayuda.

Placeholders:

- `ticketId`
- `subject`

Mensaje base:

```text
Recibimos tu ticket {{ticketId}}: {{subject}}.
Te responderemos por el metodo seleccionado.
```

### 10. Respuesta de soporte

Funcion: `ticketReply`

Se envia cuando admin o servicio al cliente responde un ticket.

Placeholders:

- `ticketId`
- `subject`
- `body`

Mensaje base:

```text
Respondimos tu ticket {{ticketId}}: {{subject}}.
Mensaje: {{body}}
```

### 11. Estado de ticket actualizado

Funcion: `ticketStatus`

Se envia cuando cambia el estado de un ticket.

Placeholders:

- `ticketId`
- `subject`
- `status`

Mensaje base:

```text
Tu ticket {{ticketId}} ({{subject}}) ahora esta: {{status}}.
```

## Como personalizarlas

1. Abre `apps/api/src/emailTemplates.ts`.
2. Cambia el `subject`, `text` o el texto que se envia a `layout(...)`.
3. No elimines `escapeHtml(...)` cuando agregues datos escritos por usuarios.
4. Corre:

```bash
npm run build
```

## Notas importantes

- Los correos de codigos no muestran el codigo en terminal si SMTP no esta configurado.
- `FRONTEND_URL` define a donde mandan los botones de los emails.
- En produccion, `FRONTEND_URL` debe ser `https://magmablaze.com`.
- Para Render, agrega las variables en `Environment`.
- Para pruebas locales, usa `apps/api/.env`.
