# Magma Blaze
Base de e-commerce para Magma Blaze con frontend Next.js, API Express, Prisma y PostgreSQL/Supabase.

## Requisitos
- Node.js 20 o superior.
- npm.
- Windows PowerShell o una terminal compatible.

## Instalacion
Desde la raiz del proyecto:

```bash
npm install
```

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

`db:push` sincroniza el schema actual con la base nueva de Supabase. El seed deja solo el admin principal y configuracion base. No crea productos demo.

## Ejecutar

```bash
npm run dev
```

Servicios esperados:

- Frontend: `http://localhost:3000`
- API: `http://localhost:4000`
- Health: `http://localhost:4000/health`
- Panel real: `http://localhost:3000/dixnissowner`
- Trampa de seguridad: `http://localhost:3000/admin`

Si `npm run dev` muestra `EADDRINUSE`, ya hay otro proceso usando `3000` o `4000`. Cierra la terminal anterior o revisa el PID en PowerShell:

```powershell
netstat -ano | findstr :3000
netstat -ano | findstr :4000
Stop-Process -Id <PID> -Force
```

En produccion, cambia esta password despues del primer acceso.

## Seguridad del panel

El panel administrativo real vive en `/dixnissowner`.

La ruta antigua `/admin` es una trampa silenciosa. Cada visita registra IP y navegador en la API. Con `ADMIN_TRAP_THRESHOLD=2`, al segundo intento esa IP queda bloqueada por `ADMIN_TRAP_BAN_DAYS=7` dias.

En produccion, configura el mismo `ADMIN_TRAP_SECRET` en Cloudflare y en el host de la API para que solo el middleware de la web pueda registrar intentos de la trampa.

Despues de este cambio, ejecuta contra Supabase:

```bash
npm run db:migrate
```

Eso crea la tabla `SecurityIpBan`, necesaria para el bloqueo por IP.

Desde `/dixnissowner`, en la seccion `Seguridad`, puedes ver las IPs registradas por la trampa y desbloquearlas si hace falta.

Si te bloqueas por probar `/admin`, inicia sesion en `/dixnissowner`, entra a `Seguridad` y usa `Desbloquear` sobre tu IP.

## Deploy con Supabase y Cloudflare

1. En Supabase, usa las URLs de conexion del panel `Connect > ORM > Prisma`.
2. En `apps/api/.env`, reemplaza `YOUR_SUPABASE_DB_PASSWORD` por tu password real.
3. Ejecuta:

```bash
npm run db:generate
npm run db:push
npm run db:seed
npm run build
```

## Funciones cubiertas
- Control de sitio desde admin: `SHOP`, `DROP`, `MAINTENANCE`.
- `SHOP` muestra la tienda normal.
- `DROP` bloquea el sitio publico con pantalla de contador, sin navbar ni footer.
- `MAINTENANCE` muestra mantenimiento para el sitio publico y mantiene `/dixnissowner` accesible.
- Productos con precio RD, precio USD, costo de compra y margen calculado.
- Categorias con CRUD, slug editable/generado e icono editable.
- Pedidos con estados: `PENDING`, `AWAITING_SHIPPING_CONFIRMATION`, `AWAITING_CUSTOMER_APPROVAL`, `PROCESSING`, `PACKED`, `SHIPPED`, `DELIVERED`, `CANCELLED`.
- Admin puede agregar precio de envio, tracking, chofer, parada, factura subida y PDF generado.
- Cliente puede aceptar o cancelar la tarifa de envio desde su cuenta.
- CMS editable para Home, Nosotros, FAQ, Envios, Devoluciones, Contacto, Privacidad y Terminos.
- Modelos/lookbook con imagen, etiqueta por click y posicion porcentual X/Y.
- Login/registro sin autologin de registro y sin mensajes internos de seguridad al usuario.
- Busqueda y filtros en productos, pedidos y usuarios.
- Cuenta de cliente con menu de pedidos, perfil, direcciones, pais/region/idioma, moneda, metodos de pago, seguridad, notificaciones, mensajes y ayuda.
- Preferencia visible de idioma y moneda: `ES/EN`, `DOP/USD`, con selector en navbar y en la cuenta.
- El selector de idioma cambia textos de navegacion, home, catalogo, filtros, tarjetas, checkout, favoritos y partes clave de cuenta.
- Tickets de ayuda funcionales: cliente abre ticket, admin o rol con permiso `support` responde, y el cliente ve mensajes del sistema.
- Checkout con cupones, descuentos registrados, metodo de pago guardado/manual y movimientos de inventario por venta.
- Favoritos sincronizados: invitado usa localStorage y cliente autenticado sincroniza con la base de datos.
- Reportes admin con ventas, estados, pagos, productos mas vendidos y stock bajo.
- Cupones admin por porcentaje o monto fijo, con uso maximo, minimo de compra, expiracion y activacion.
- Inventario admin con ajustes manuales y movimientos auditados.
- Roles administrativos con permisos por seccion: `dashboard`, `products`, `categories`, `orders`, `drops`, `models`, `content`, `shipping`, `users`, `finance`, `reports`, `coupons`, `inventory`, `settings`, `security`, `support`, `roles`.
- Usuarios admin pueden recibir roles personalizados y solo ven/acceden a las secciones permitidas.

## Pendiente para produccion
- Verificar que Supabase tenga `SecurityIpBan` creada con `npm run db:migrate`.
- Usar storage real para imagenes y facturas, por ejemplo Supabase Storage o Cloudinary.
- Configurar SMTP real y activar `REQUIRE_ADMIN_EMAIL_2FA=true`.
- Rotar `JWT_SECRET` y `CODE_PEPPER` con valores seguros.
- Integrar pagos reales y validacion antifraude.
- Conectar un proveedor real de pagos y tokenizacion para metodos de pago; localmente solo se guarda metadata segura de prueba.
- Configurar correo real o bandeja de soporte para avisos externos de tickets.
- Agregar backups, observabilidad, logs persistentes y politicas de privacidad finales.
