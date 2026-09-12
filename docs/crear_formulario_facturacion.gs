/**
 * Genera automáticamente el "Cuestionario — Módulo de Facturación" en Google Forms.
 *
 * CÓMO USARLO:
 *   1. Abre https://script.google.com  ->  Nuevo proyecto.
 *   2. Borra el contenido y pega este archivo completo.
 *   3. Menú: Ejecutar -> crearFormulario.  Autoriza los permisos que pida.
 *   4. Ve a "Registro de ejecución" (Ver -> Registros). Ahí salen dos enlaces:
 *        - "Editar":    para revisar / ajustar el formulario.
 *        - "Compartir":  el enlace que le pasas al cliente.
 *
 * El formulario queda guardado en tu Google Drive.
 */

function crearFormulario() {
  var form = FormApp.create(
    'Cuestionario — Módulo de Facturación · Depósito Emmanuel'
  );

  form.setDescription(
    'Hoy el negocio calcula el impuesto (IVA) a mano para pasárselo al contador. ' +
    'La idea del módulo de facturación es que, con solo registrar la venta, el ' +
    'sistema calcule el impuesto automáticamente y genere el reporte que el ' +
    'contador necesita.\n\n' +
    'Para lograrlo necesitamos entender bien cómo factura hoy. Si no está segura ' +
    'de alguna respuesta, escriba lo que le haya dicho su contador.'
  );
  form.setProgressBar(true);
  form.setCollectEmail(false);

  // ---- Helpers -------------------------------------------------------
  function sec(titulo, ayuda) {
    var p = form.addPageBreakItem().setTitle(titulo);
    if (ayuda) p.setHelpText(ayuda);
  }
  function encabezado(titulo, ayuda) {
    var h = form.addSectionHeaderItem().setTitle(titulo);
    if (ayuda) h.setHelpText(ayuda);
  }
  function txt(t, req) {
    form.addTextItem().setTitle(t).setRequired(!!req);
  }
  function par(t, req) {
    form.addParagraphTextItem().setTitle(t).setRequired(!!req);
  }
  function opc(t, opciones, req) {
    form.addMultipleChoiceItem().setTitle(t).setChoiceValues(opciones).setRequired(!!req);
  }
  function cas(t, opciones) {
    form.addCheckboxItem().setTitle(t).setChoiceValues(opciones);
  }

  // ================================================================
  // 1 · Datos del negocio para la factura
  // ================================================================
  encabezado('1 · Datos del negocio para la factura');
  txt('Nombre completo del contribuyente, tal como aparece en la SAT', true);
  txt('Nombre comercial del negocio (sugerido: "Depósito Emmanuel")');
  txt('NIT del negocio', true);
  txt('Dirección fiscal registrada en la SAT');
  txt('Teléfono y correo que quiere que aparezcan en la factura');
  opc('¿Tiene más de un local o punto de venta registrado en la SAT?', [
    'No, solo uno',
    'Sí, 2',
    'Sí, 3 o más'
  ]);
  txt('Actividad económica con la que está inscrito en la SAT (ej. "Venta al por menor de bebidas")');

  // ================================================================
  // 2 · Cómo calcula los impuestos hoy  (la más importante)
  // ================================================================
  sec(
    '2 · Cómo calcula los impuestos hoy',
    'Esta sección define cómo el sistema calculará el impuesto. Si no está ' +
    'segura, escriba lo que le haya dicho su contador.'
  );
  opc('¿Bajo qué régimen paga impuestos a la SAT?', [
    'Pequeño Contribuyente — pago un 5% sobre el total de lo que vendo',
    'Régimen General — cobro 12% de IVA en mis ventas y descuento el IVA de mis compras',
    'No estoy segura / lo maneja el contador'
  ], true);
  par(
    'Explique con sus palabras, paso a paso, cómo saca hoy el monto de ' +
    'impuesto que le reporta al contador.',
    true
  );
  opc('¿Cada cuánto le entrega esa información al contador?', [
    'Cada mes', 'Cada quincena', 'Cuando él la pide', 'Otro'
  ]);
  cas('¿Qué le entrega exactamente al contador?', [
    'El total vendido del período',
    'Un listado de todas las facturas',
    'Una hoja de Excel',
    'Un cuaderno con anotaciones',
    'Las facturas físicas',
    'Otro'
  ]);
  opc('¿Cuánto tiempo le toma preparar esa información cada mes?', [
    'Menos de 1 hora', 'De 1 a 3 horas', 'Medio día', 'Un día completo o más'
  ]);
  opc('¿Ha tenido errores, multas o llamadas de atención de la SAT por el cálculo de impuestos?', [
    'Nunca', 'Alguna vez', 'Varias veces'
  ]);
  opc('Los precios de venta que maneja, ¿ya llevan el impuesto incluido o se suma aparte?', [
    'El precio que le doy al cliente ya incluye el impuesto',
    'El impuesto se suma aparte al final',
    'No sé'
  ]);
  opc('En las compras a sus proveedores (Coca-Cola, Pepsi, Big Cola…), ¿le entregan factura con IVA?', [
    'Sí, siempre', 'A veces', 'No', 'No sé'
  ]);
  par('¿El contador le pide algún formato o reporte específico? ¿Cuál?');
  txt('Nombre y contacto del contador (para coordinar el formato de los reportes)');

  // ================================================================
  // 3 · Cómo factura hoy
  // ================================================================
  sec('3 · Cómo factura hoy');
  opc('¿Emite factura por todas las ventas o solo cuando el cliente la pide?', [
    'Por todas', 'Solo cuando la piden', 'Casi nunca facturo'
  ]);
  cas('¿Qué usa hoy para facturar?', [
    'Facturas impresas de imprenta (talonario)',
    'Factura electrónica en línea (FEL)',
    'Recibos',
    'Un cuaderno',
    'Nada',
    'Otro'
  ]);
  txt('Si usa factura electrónica (FEL), ¿con qué empresa certificadora?');
  opc('¿Le interesa que el sistema genere la factura electrónica automáticamente?', [
    'Sí, aunque haya que contratar un certificador autorizado',
    'Prefiero que el sistema prepare los datos y yo la emito en la página de la SAT',
    'Por ahora no, solo quiero el control interno'
  ]);
  opc('¿Cómo lleva la numeración de las facturas?', [
    'Correlativo escrito a mano',
    'La imprenta trae los números',
    'Un sistema los genera',
    'No llevo numeración'
  ]);
  par('¿Con qué frecuencia anula facturas y por qué motivo suele hacerlo?');
  opc('¿Hace devoluciones de producto que necesiten una nota de crédito?', [
    'Sí, seguido', 'A veces', 'No'
  ]);
  par('¿Vende al crédito (fiado) o todo es de contado? Si vende al crédito, ¿cómo controla quién le debe?');
  opc('Las ventas del camión (ruta), ¿también se facturan?', [
    'Sí, cada venta por separado',
    'Se hace una sola factura por todo lo del día',
    'No se facturan'
  ]);
  opc('¿Cuántas facturas emite al día, aproximadamente?', [
    '1 a 5', '6 a 15', '16 a 30', 'Más de 30'
  ]);
  txt('Monto de la factura más común y de la más grande que suele hacer (ej. "común Q150, grande Q3,000")');

  // ================================================================
  // 4 · Datos del cliente en la factura
  // ================================================================
  sec('4 · Datos del cliente en la factura');
  opc('La mayoría de sus clientes, ¿pide factura con su NIT o va como "Consumidor Final (CF)"?', [
    'Casi todos con NIT', 'Mitad y mitad', 'Casi todos como CF'
  ]);
  opc('¿Le sirve que el sistema guarde los datos (NIT, nombre, dirección) de los clientes frecuentes para no pedirlos cada vez?', [
    'Sí', 'No', 'Me da igual'
  ]);
  cas('Una vez emitida la factura, ¿qué necesita hacer con ella?', [
    'Imprimirla', 'Enviarla por correo', 'Enviarla por WhatsApp', 'Solo guardarla en el sistema'
  ]);

  // ================================================================
  // 5 · Productos e impuestos especiales
  // ================================================================
  sec('5 · Productos e impuestos especiales');
  par('¿Todos sus productos pagan el mismo impuesto o hay algunos exentos o con impuesto diferente?');
  opc('¿Vende productos con impuesto especial (bebidas alcohólicas, cigarros, etc.)?', ['Sí', 'No']);
  opc('¿Maneja descuentos o promociones que deban aparecer en la factura?', [
    'Sí, seguido', 'A veces', 'No'
  ]);
  opc('Los envases retornables (cajas, botellas de vidrio), ¿los cobra y factura aparte?', [
    'Sí', 'No', 'A veces'
  ]);

  // ================================================================
  // 6 · Reportes que necesita
  // ================================================================
  sec('6 · Reportes que necesita');
  cas('¿Qué reportes le servirían del módulo de facturación?', [
    'Resumen mensual del impuesto para el contador',
    'Listado de todas las ventas del período (libro de ventas)',
    'IVA cobrado vs. IVA pagado (débito y crédito fiscal)',
    'Facturas anuladas',
    'Ventas por cliente',
    'Total de ventas por día y por semana',
    'Otro'
  ]);
  opc('¿Necesita poder exportar esos reportes a Excel o PDF?', ['Sí', 'No']);
  txt('¿El contador usa algún programa donde tenga que subir la información? ¿Cuál?');

  // ================================================================
  // 7 · Quién usa el módulo
  // ================================================================
  sec('7 · Quién usa el módulo');
  cas('¿Quién va a emitir las facturas en el día a día?', [
    'La propietaria', 'El o la cajero(a)', 'El repartidor', 'El contador'
  ]);
  cas('¿Quién debe poder ver los reportes de impuestos?', [
    'La propietaria', 'El contador', 'Nadie más'
  ]);
  opc('¿Le gustaría que el contador tenga un usuario propio en el sistema, solo para consultar?', [
    'Sí', 'No', 'Tal vez más adelante'
  ]);

  // ================================================================
  // 8 · Para terminar
  // ================================================================
  sec('8 · Para terminar');
  try {
    form.addFileUploadItem()
      .setTitle('Si puede, adjunte una foto de una factura actual (puede tapar los datos que quiera).')
      .setHelpText('Nos sirve para copiar el formato exacto. El responsable del formulario debe iniciar sesión con Google para subir archivos.');
  } catch (e) {
    // Algunas cuentas no permiten "carga de archivo"; se omite sin romper el script.
    par('Si tiene una foto de una factura actual, indíquenos cómo hacérnosla llegar (correo / WhatsApp).');
  }
  txt('¿Para qué fecha necesita que esto esté funcionando? ¿Hay algún cierre o fecha importante?');
  par('¿Algo más que debamos saber sobre cómo factura o cómo lleva los impuestos?');

  // ---- Enlaces -----------------------------------------------------
  Logger.log('======================================================');
  Logger.log('Formulario creado correctamente.');
  Logger.log('EDITAR:    ' + form.getEditUrl());
  Logger.log('COMPARTIR: ' + form.getPublishedUrl());
  Logger.log('======================================================');
}
