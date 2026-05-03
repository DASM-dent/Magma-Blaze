'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type StoreCountry = 'RD' | 'US';
type StoreCurrency = 'DOP' | 'USD';

type LocaleCtx = {
  country: StoreCountry;
  currency: StoreCurrency;
  symbol: 'RD$' | 'US$';
  setCountry: (c: StoreCountry) => void;
  setCurrency: (c: StoreCurrency) => void;
  formatPrice: (product: any) => string;
  productPrice: (product: any) => number;
  t: (key: string) => string;
};

const Ctx = createContext<LocaleCtx | null>(null);

const USD_EXCHANGE_RATE = 48;
const roundMoney = (v: number) => Math.round((Number(v || 0) + Number.EPSILON) * 100) / 100;
const rdToUsd = (priceRd: number) => roundMoney(priceRd / USD_EXCHANGE_RATE);

const translations: { es: Record<string, string> } = {
  es: {
    'nav.catalog': 'Catalogo',
    'nav.news': 'Novedades',
    'nav.drops': 'Drops',
    'nav.models': 'Modelos',
    'nav.about': 'Nosotros',
    'nav.search': 'Buscar',
    'nav.account': 'Cuenta',
    'nav.cart': 'Carrito',
    'nav.locale': 'Ubicacion y moneda',

    'locale.country': 'Pais',
    'locale.region': 'Region',
    'locale.currency': 'Moneda',
    'locale.current': 'Seleccion actual',

    'common.loading': 'Cargando',
    'common.processing': 'Procesando',
    'common.save': 'Guardar',
    'common.saving': 'Guardando',
    'common.delete': 'Eliminar',
    'common.send': 'Enviar',
    'common.default': 'Principal',
    'common.backHome': 'Volver al inicio',
    'common.backCatalog': 'Volver al catalogo',
    'common.yes': 'Si',
    'common.no': 'No',
    'common.items': 'articulos',
    'common.item': 'articulo',
    'common.saved': 'Cambios guardados.',
    'common.saveError': 'No se pudo guardar.',
    'common.countryRD': 'Republica Dominicana',
    'common.countryUS': 'Estados Unidos',

    'hero.badge': 'Con protección contra los rayos UV',
    'hero.copy': 'Lentes únicos que protegen tu vista de edicion limitada. Para quienes no siguen tendencias: las crean.',
    'hero.collection': 'Ver coleccion',
    'hero.drops': 'Proximos drops',
    'hero.scroll': 'Scroll',

    'home.dropLabel': 'Drops exclusivos',
    'home.dropTitle1': 'Ediciones limitadas.',
    'home.dropTitle2': 'No esperes.',
    'home.dropCopy': 'Cada drop es unico. Cuando se agota, se acaba. Activa las notificaciones y sé el primero.',
    'home.viewDrops': 'Ver drops',
    'home.featuredEyebrow': 'Lo mejor',
    'home.featuredTitle': 'Destacados',
    'home.viewAll': 'Ver todo',
    'home.explore': 'Explorar',
    'home.categories': 'Categorias',
    'home.products': 'productos',

    'footer.shipping': 'Envios',
    'footer.returns': 'Devoluciones',
    'footer.privacy': 'Privacidad',
    'footer.terms': 'Terminos',
    'footer.copy': 'Lentes únicos que protegen tu vista de edicion limitada. Diseñados para quienes no siguen tendencias: las crean.',
    'footer.shop': 'Tienda',
    'footer.support': 'Soporte',
    'footer.rights': 'Todos los derechos reservados.',

    'catalog.title': 'Catalogo',
    'catalog.resultsFor': 'Resultados para',
    'catalog.filters': 'Filtros',
    'catalog.inStock': 'En stock',
    'catalog.results': 'resultados',
    'catalog.noResults': 'Sin resultados',
    'catalog.tryOther': 'Prueba con otros filtros',
    'catalog.loading': 'Cargando catalogo',
    'catalog.categories': 'Categorias',
    'catalog.all': 'Todas',
    'catalog.price': 'Precio',
    'catalog.min': 'Minimo',
    'catalog.max': 'Maximo',
    'catalog.availability': 'Disponibilidad',
    'catalog.onlyStock': 'Solo productos en stock',
    'catalog.apply': 'Aplicar filtros',
    'catalog.clear': 'Limpiar todo',

    'sort.newest': 'Mas recientes',
    'sort.priceAsc': 'Precio: menor a mayor',
    'sort.priceDesc': 'Precio: mayor a menor',
    'sort.popular': 'Mas populares',
    'sort.bestSelling': 'Mas vendidos',

    'badge.new': 'Nuevo',
    'badge.bestSeller': 'Mas vendido',
    'badge.limitedDrop': 'Drop limitado',
    'badge.comingSoon': 'Proximamente',
    'badge.soldOut': 'Agotado',

    'product.favoriteAdd': 'Agregar a favoritos',
    'product.favoriteRemove': 'Quitar de favoritos',
    'product.addToCart': 'Agregar al carrito',
    'product.verifyAvailability': 'Verificar disponibilidad',
    'product.loading': 'Cargando producto',
    'product.notFound': 'No encontramos este producto.',
    'product.backToCatalog': 'Volver al catalogo',
    'product.noUsd': 'Este producto aun no tiene precio en dolares configurado. Se mostrara el precio base hasta que lo actualices en el panel.',
    'product.shippingLine': 'Envíos disponibles para República Dominicana y Estados Unidos.',
    'product.confirmLine': 'Si el envío no tiene tarifa registrada, quedará pendiente de confirmación.',
    'product.inventoryLine': 'Producto protegido con control de inventario.',
    'product.supportLine': 'Atención personalizada para ayudarte con disponibilidad, medidas y entrega.',
    'product.unavailable': 'No disponible',
    'product.relatedTitle': 'Tambien te puede gustar',
    'product.relatedSubtitle': 'Seleccionamos piezas de la misma linea o con movimiento alto para que sigas explorando sin perder el hilo.',
    'product.recentTitle': 'Vistos recientemente',
    'product.recentSubtitle': 'Tus ultimas visitas quedan aqui en este dispositivo para volver rapido a lo que estabas mirando.',

    'cart.title': 'Carrito',
    'cart.empty': 'Tu carrito esta vacio',
    'cart.explore': 'Explorar catalogo',
    'cart.quantity': 'Cantidad',
    'cart.subtotal': 'Subtotal',
    'cart.shippingCheckout': 'Envio calculado en el checkout',
    'cart.checkout': 'Proceder al pago',
    'cart.verifyAvailability': 'Verificar disponibilidad por WhatsApp',
    'cart.availabilityNote': 'La disponibilidad y el envio se confirman por WhatsApp antes de pagar.',
    'cart.continue': 'Seguir comprando',
    'cart.goCheckout': 'Ir al checkout',
    'cart.itemCount': 'items',
    'cart.clear': 'Vaciar carrito',
    'cart.share': 'Compartir carrito',
    'cart.shareCopied': 'Enlace del carrito copiado.',
    'cart.shareError': 'No se pudo compartir el carrito.',
    'cart.finishOrder': 'Hacer pedido por WhatsApp',
    'cart.whatsappOrderNote': 'El mensaje incluye productos, enlaces, cantidades y total aproximado.',
    'cart.total': 'Total',
    'cart.unitPrice': 'Precio',
    'cart.lineTotal': 'Importe',
    'cart.sharedTitle': 'Carrito compartido',
    'cart.sharedIntro': 'Este enlace contiene los productos compartidos, sus cantidades y el total aproximado.',
    'cart.sharedInvalid': 'Este carrito compartido no existe o el enlace esta incompleto.',
    'cart.addShared': 'A\u00f1adir este carrito al mio',
    'cart.sharedAdded': 'Carrito a\u00f1adido.',
    'cart.openCart': 'Ver mi carrito',

    'search.placeholder': 'Buscar lentes, modelos, colores...',
    'search.minLength': 'Escribe al menos 2 caracteres para buscar...',
    'search.noResults': 'No se encontraron resultados para',
    'search.results': 'resultados',

    'favorites.title': 'Favoritos',
    'favorites.subtitle': 'Tus articulos guardados se sincronizan con tu cuenta cuando inicias sesion.',
    'favorites.emptyTitle': 'Aun no tienes favoritos',
    'favorites.emptyText': 'Marca productos con el corazon y apareceran aqui con su imagen y precio.',
    'favorites.remove': 'Quitar',
    'favorites.synced': 'Sincronizado con tu cuenta',
    'favorites.syncing': 'Sincronizando favoritos',
    'favorites.syncError': 'Guardado localmente. Se sincronizara cuando la API responda.',
    'favorites.localOnly': 'Inicia sesion para sincronizar favoritos en tu cuenta.',

    'checkout.badge': 'Checkout',
    'checkout.title': 'Confirma tu pedido',
    'checkout.availabilityTitle': 'Verifica disponibilidad por WhatsApp',
    'checkout.country': 'Pais de entrega',
    'checkout.province': 'Provincia / Estado',
    'checkout.city': 'Municipio / Ciudad',
    'checkout.address': 'Direccion completa',
    'checkout.promo': 'Cupon o codigo promocional',
    'checkout.payment': 'Metodo de pago',
    'checkout.noPayment': 'Pago manual / confirmar luego',
    'checkout.confirm': 'Confirmar orden',
    'checkout.verifyAvailability': 'Hacer pedido por WhatsApp',
    'checkout.whatsappNotice': 'No se creara una orden ni se procesara un pago en la web. Te confirmaremos disponibilidad, envio y forma de pago por WhatsApp.',
    'checkout.summary': 'Resumen',
    'checkout.subtotal': 'Subtotal',
    'checkout.created': 'Orden creada correctamente',
    'checkout.apiError': 'No se pudo crear la orden. Inicia sesion primero.',
    'checkout.usNotice': 'Usa la direccion de tu casillero o courier. El envio puede variar y podriamos contactarte si ese precio no esta registrado.',
    'checkout.cardEnding': 'terminada en',
    'checkout.primary': 'principal',

    'account.logout': 'Cerrar sesion',
    'account.title': 'Mi cuenta',
    'account.breadcrumb': 'Inicio / Cuenta',
    'account.hello': 'Hola',
    'account.adminPanel': 'Panel admin',
    'account.orders': 'Tus pedidos',
    'account.reviews': 'Tus resenas',
    'account.profile': 'Tu perfil',
    'account.coupons': 'Cupones y ofertas',
    'account.credit': 'Saldo de credito',
    'account.favorites': 'Favoritos',
    'account.addresses': 'Direcciones',
    'account.locale': 'Pais/region y moneda',
    'account.payments': 'Metodos de pago',
    'account.security': 'Seguridad de la cuenta',
    'account.notifications': 'Notificaciones',
    'account.messages': 'Mensajes',
    'account.help': 'Ayuda',

    'orders.all': 'Todos',
    'orders.processing': 'Procesando',
    'orders.shipped': 'Enviado',
    'orders.delivered': 'Entregado',
    'orders.returns': 'Devoluciones',
    'orders.empty.all.title': 'Aun no tienes pedidos',
    'orders.empty.all.text': 'Cuando realices una compra, podras seguir aqui el estado completo.',
    'orders.empty.processing.title': 'No tienes pedidos procesando',
    'orders.empty.processing.text': 'Los pedidos en preparacion apareceran en esta seccion.',
    'orders.empty.shipped.title': 'No tienes pedidos enviados',
    'orders.empty.shipped.text': 'Cuando un pedido salga de almacen, podras rastrearlo aqui.',
    'orders.empty.delivered.title': 'No tienes pedidos entregados',
    'orders.empty.delivered.text': 'Tus compras completadas apareceran aqui.',
    'orders.empty.returns.title': 'No tienes devoluciones',
    'orders.empty.returns.text': 'Si una devolucion o cancelacion se registra, aparecera en esta seccion.',
    'orders.order': 'Pedido',
    'orders.total': 'Total',
    'orders.shipping': 'Envio',
    'orders.approveShipping': 'Aceptar tarifa',
    'orders.cancelOrder': 'Cancelar',
    'orders.stepProcessing': 'Procesando',
    'orders.stepPacked': 'Empaquetado',
    'orders.stepShipped': 'Enviado',
    'orders.stepDelivered': 'Entregado',
    'orders.deliveryPlace': 'Entrega/parada',
    'orders.driver': 'Chofer',
    'orders.reference': 'Referencia',
    'orders.uploadedInvoice': 'Ver factura subida',
    'orders.generatedPdf': 'Ver PDF generado',

    'status.open': 'Abierto',
    'status.waitingCustomer': 'Esperando cliente',
    'status.answered': 'Respondido',
    'status.closed': 'Cerrado',
    'status.pending': 'Pendiente',
    'status.awaitingShipping': 'Esperando tarifa',
    'status.awaitingApproval': 'Esperando aprobacion',
    'status.processing': 'Procesando',
    'status.packed': 'Empaquetado',
    'status.shipped': 'Enviado',
    'status.delivered': 'Entregado',
    'status.cancelled': 'Cancelado',

    'profile.name': 'Nombre',
    'profile.email': 'Correo electronico',
    'profile.whatsapp': 'WhatsApp',
    'profile.preferredContact': 'Prefiero ser contactado por',
    'profile.save': 'Guardar perfil',

    'contact.system': 'Sistema',
    'contact.whatsapp': 'WhatsApp',

    'addresses.country': 'Pais',
    'addresses.province': 'Provincia',
    'addresses.state': 'Estado',
    'addresses.provinceHint': 'Puedes escribir para buscar y seleccionar.',
    'addresses.city': 'Ciudad / Municipio',
    'addresses.cityHint': 'La lista cambia segun la provincia o estado.',
    'addresses.zip': 'Codigo postal',
    'addresses.full': 'Direccion completa',
    'addresses.placeholder': 'Calle, numero, edificio, apartamento o referencia',
    'addresses.default': 'Direccion principal',
    'addresses.add': 'Agregar direccion',
    'addresses.saved': 'Direccion guardada.',
    'addresses.saveError': 'No se pudo guardar la direccion.',

    'payments.title': 'Metodos de pago',
    'payments.holder': 'Titular de la tarjeta',
    'payments.number': 'Numero de tarjeta',
    'payments.securityHint': 'Por seguridad solo se guarda la marca y los ultimos 4 digitos. No guardamos CVV.',
    'payments.expires': 'Vencimiento',
    'payments.default': 'Metodo principal',
    'payments.add': 'Agregar metodo',
    'payments.card': 'Tarjeta',
    'payments.saved': 'Metodo de pago guardado.',
    'payments.invalidNumber': 'Escribe un numero de tarjeta valido.',
    'payments.invalidHolder': 'Escribe el titular de la tarjeta.',
    'payments.invalidExpires': 'Escribe el vencimiento en formato MM/AA.',
    'payments.saveError': 'No se pudo guardar el metodo de pago.',
    'payments.ending': 'terminada en',

    'security.emailCode': 'Codigo unico por correo',
    'security.emailCodeText': 'Pide un codigo al iniciar sesion cuando el correo SMTP este configurado.',
    'security.changePassword': 'Cambiar contrasena',
    'security.currentPassword': 'Contrasena actual',
    'security.newPassword': 'Nueva contrasena',
    'security.confirmPassword': 'Confirmar contrasena',
    'security.updatePassword': 'Actualizar contrasena',
    'security.signOutDevice': 'Cerrar sesion en este dispositivo',
    'security.passwordUpdated': 'Contrasena actualizada.',
    'security.passwordError': 'No se pudo cambiar la contrasena.',
    'security.2faOn': 'Codigo por correo activado para futuros inicios de sesion.',
    'security.2faOff': 'Codigo por correo desactivado para futuros inicios de sesion.',
    'security.preferenceError': 'No se pudo actualizar la preferencia.',

    'notifications.title': 'Preferencias de notificaciones',
    'notifications.ordersTitle': 'Pedidos y entregas',
    'notifications.ordersText': 'Actualizaciones de estado, envio y entrega.',
    'notifications.dropsTitle': 'Drops',
    'notifications.dropsText': 'Avisos de lanzamientos y contadores activos.',
    'notifications.supportTitle': 'Ayuda y mensajes',
    'notifications.supportText': 'Respuestas de soporte y mensajes del sistema.',
    'notifications.promosTitle': 'Cupones y ofertas',
    'notifications.promosText': 'Promociones disponibles para tu cuenta.',
    'notifications.save': 'Guardar preferencias',

    'help.subject': 'Asunto',
    'help.category': 'Categoria',
    'help.preferredContact': 'Quiero ser contactado por',
    'help.message': 'Mensaje',
    'help.openTicket': 'Abrir ticket',
    'help.ticketError': 'No se pudo abrir el ticket.',
    'help.intro': 'Cuentanos que necesitas y el equipo de Magma Blaze lo vera como ticket. Tambien te llegaran las respuestas en mensajes.',
    'help.responseNote': 'Puedes elegir si prefieres respuesta por el sistema o WhatsApp.',
    'help.category.general': 'General',
    'help.category.orders': 'Pedidos',
    'help.category.shipping': 'Envios',
    'help.category.returns': 'Devoluciones',
    'help.category.payments': 'Pagos',
    'help.category.account': 'Cuenta',

    'messages.emptyTitle': 'No tienes mensajes',
    'messages.emptyText': 'Aqui apareceran respuestas de soporte y avisos importantes del sistema.',
    'messages.tickets': 'Tus tickets',
    'messages.replyPlaceholder': 'Responder ticket',
    'messages.inboxIntro': 'Aqui se agrupan avisos del sistema, respuestas de soporte y actualizaciones importantes.',
    'messages.openHelp': 'Abrir ayuda',
    'messages.unread': 'Nuevo',
    'messages.read': 'Leido',

    'coupons.emptyTitle': 'Aun no tienes cupones u ofertas disponibles',
    'coupons.emptyText': 'Cuando haya beneficios activos para tu cuenta, apareceran aqui.',
    'credit.emptyTitle': 'Aun no tienes saldo de credito disponible',
    'credit.emptyText': 'El credito por devoluciones, ajustes o promociones aparecera aqui.',
    'reviews.emptyTitle': 'Aun no tienes resenas',
    'reviews.emptyText': 'Cuando califiques un producto, tus resenas apareceran aqui.',

    'auth.badge': 'Cuenta Magma Blaze',
    'auth.createAccount': 'Crear cuenta',
    'auth.signIn': 'Iniciar sesion',
    'auth.registerIntro': 'Crea tu cuenta para guardar favoritos, recibir avisos de drops y gestionar tus pedidos.',
    'auth.loginIntro': 'Entra a tu cuenta para continuar con tus pedidos, favoritos y preferencias.',
    'auth.displayName': 'Nombre visible',
    'auth.displayNamePlaceholder': 'Ej. Diana Santana',
    'auth.email': 'Correo electronico',
    'auth.emailPlaceholder': 'correo@ejemplo.com',
    'auth.password': 'Contrasena',
    'auth.passwordHint': 'Debe tener minimo 8 caracteres e incluir al menos una letra y un numero.',
    'auth.emailCodeOptIn': 'Quiero recibir un codigo unico por correo cada vez que inicie sesion.',
    'auth.emailCodeOptInBold': 'Puedes cambiar esta opcion luego desde Seguridad de la cuenta.',
    'auth.codeSent': 'Ingresa el codigo de verificacion enviado a',
    'auth.enter': 'Entrar',
    'auth.verifyCode': 'Verificar codigo',
    'auth.resendCode': 'Reenviar codigo',
    'auth.createdVerify': 'Cuenta creada. Revisa tu correo para verificarla.',
    'auth.createdLogin': 'Cuenta creada. Ya puedes iniciar sesion.',
    'auth.loginCodeSent': 'Te enviamos un codigo de verificacion al correo vinculado a tu cuenta.',
    'auth.mustVerify': 'Debes verificar tu correo. Te enviamos un codigo nuevo.',
    'auth.actionError': 'No se pudo completar la accion',
    'auth.emailVerified': 'Correo verificado. Ahora inicia sesion.',
    'auth.invalidCode': 'Codigo invalido',
    'auth.codeResent': 'Codigo reenviado.',
    'auth.resendError': 'No se pudo reenviar',
    'auth.notice.success': 'Listo',
    'auth.notice.info': 'Revisa tu correo',
    'auth.notice.warning': 'Necesitamos verificar algo',
    'auth.notice.error': 'No pudimos continuar',
    'auth.error.invalidCredentials': 'El correo o la contrasena no coinciden. Revisa ambos campos e intenta otra vez.',
    'auth.error.emailExists': 'Ese correo ya tiene una cuenta. Inicia sesion o usa otro correo.',
    'auth.error.blocked': 'Tu cuenta esta bloqueada. Contacta servicio al cliente para revisarla.',
    'auth.error.locked': 'Por seguridad, pausamos el acceso temporalmente. Revisa tu correo o intenta mas tarde.',
    'auth.error.verifyEmail': 'Debes verificar tu correo antes de entrar. Te enviamos un codigo nuevo.',
    'auth.error.checkFields': 'Revisa estos campos',
    'auth.error.fixFields': 'Corrige lo indicado y vuelve a intentarlo.',
    'auth.error.network': 'No se pudo conectar con la API. Verifica que el backend este activo.',
    'auth.error.timeout': 'La API tardo demasiado. Intenta de nuevo en unos segundos.',
    'auth.error.generic': 'No se pudo completar la accion. Intenta nuevamente.',
    'auth.error.invalidCodeDetail': 'El codigo no coincide, expiro o ya fue usado. Revisa los 6 digitos.',
    'auth.error.nameFormat': 'Nombre: escribe al menos 2 caracteres.',
    'auth.error.emailFormat': 'Correo: escribe un correo valido.',
    'auth.error.passwordFormat': 'Contrasena: minimo 8 caracteres, una letra y un numero.',
    'auth.error.codeFormat': 'Codigo: debe tener 6 digitos.',
    'auth.error.confirmPasswordFormat': 'Confirmacion: debe coincidir con la contrasena.',
    'news.title': 'Novedades',
    'news.copy': 'Anuncios, nuevos lanzamientos, drops, colecciones y noticias publicadas desde el panel admin.',
    'news.loading': 'Cargando novedades',
    'news.empty': 'Todavia no hay novedades publicadas.',

    'models.loading': 'Cargando lookbook',
    'models.closed': 'Lookbook cerrado',
    'models.closedTitle': 'Modelos estara disponible durante el drop activo',
    'models.closedCopy': 'Esta pagina es exclusiva para el lanzamiento disponible. Cuando actives un drop desde admin, aqui apareceran las fotos modelando las gafas.',
    'models.active': 'Drop activo',
    'models.title': 'Modelos Magma',
    'models.copy': 'Lookbook exclusivo del drop disponible. Toca la etiqueta sobre el lente para abrir el producto modelado.',
    'models.tagged': 'Look etiquetado',
    'models.editorial': 'Editorial exclusivo del drop activo.',
    'models.empty': 'Todavia no hay fotos activas para este drop.',

    'content.shipping': 'Envios',
    'content.returns': 'Devoluciones',
    'content.faq': 'Preguntas frecuentes',
    'content.contact': 'Contacto',
    'content.privacy': 'Privacidad',
    'content.terms': 'Terminos',
    'content.generic': 'Contenido',
    'content.loading': 'Cargando contenido',
    'content.unpublished': 'Contenido no publicado',
    'content.empty': 'Esta seccion aun no tiene informacion visible.',

    'about.title': 'Nosotros',
    'about.copy': 'Conoce la historia, identidad y propuesta de valor de la marca.',
    'about.comingSoon': 'Proximamente',
    'about.empty': 'Esta seccion aun no tiene contenido publicado.',

    'drop.days': 'Dias',
    'drop.hours': 'Horas',
    'drop.minutes': 'Minutos',
    'drop.seconds': 'Segundos',
    'drop.notify': 'Notificarme',
    'drop.subscribed': 'Te avisamos cuando abra.',
    'drop.toastSuccess': 'Listo. Te notificaremos cuando inicie el drop.',
    'drop.toastError': 'Error al suscribirse',
    'drop.noSpam': 'Sin spam. Solo te avisamos cuando el drop abra.',
    'drop.nextName': 'PROXIMO DROP',
    'drop.nextDescription': 'Todavia no hay un drop activo. Vuelve pronto para el proximo lanzamiento limitado.',

    'gate.noDropTitle': 'Proximo drop no establecido',
    'gate.noDropCopy': 'Aun no hay un drop disponible. Vuelve pronto para descubrir el proximo lanzamiento.',
    'gate.maintenance': 'Mantenimiento',
    'gate.maintenanceCopy': 'Volvemos pronto con algo increible.',
  },
};

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [country, setCountryState] = useState<StoreCountry>('RD');
  const [currency, setCurrencyState] = useState<StoreCurrency>('DOP');

  useEffect(() => {
    const saved = localStorage.getItem('mb_country') as StoreCountry | null;
    const cur = localStorage.getItem('mb_currency') as StoreCurrency | null;
    if (saved === 'RD' || saved === 'US') setCountryState(saved);
    if (cur === 'DOP' || cur === 'USD') setCurrencyState(cur);
  }, []);

  const setCountry = useCallback((c: StoreCountry) => {
    localStorage.setItem('mb_country', c);
    setCountryState(c);
    const next = c === 'US' ? 'USD' : 'DOP';
    localStorage.setItem('mb_currency', next);
    setCurrencyState(next);
  }, []);

  const setCurrency = useCallback((c: StoreCurrency) => {
    localStorage.setItem('mb_currency', c);
    setCurrencyState(c);
  }, []);

  useEffect(() => {
    document.documentElement.lang = 'es';
    document.title = 'Magma Blaze | Lentes Premium';
  }, []);

  const symbol: 'RD$' | 'US$' = currency === 'USD' ? 'US$' : 'RD$';
  const productPrice = (p: any) => currency === 'USD' ? Number(p.priceUsd || p.usdPrice || rdToUsd(Number(p.price || 0))) : Number(p.price || 0);
  const t = useCallback((key: string) => translations.es[key] || key, []);
  const formatPrice = (p: any) => `${symbol} ${productPrice(p).toLocaleString('es-DO', { minimumFractionDigits: currency === 'USD' ? 2 : 0, maximumFractionDigits: currency === 'USD' ? 2 : 0 })}`;

  const value = useMemo<LocaleCtx>(() => ({
    country,
    currency,
    symbol,
    setCountry,
    setCurrency,
    formatPrice,
    productPrice,
    t,
  }), [country, currency, symbol, setCountry, setCurrency, t]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStoreLocale() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStoreLocale must be used inside LocaleProvider');
  return ctx;
}
