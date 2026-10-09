// Genera "PRESUPUESTO NOHALEZ - SV-0045-03.docx" con la identidad de Renovare.
// Uso: NODE_PATH=$(npm root -g) node generar-word.js
// El .docx resultante es la plantilla editable: se trabaja directamente en Word.
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, Header, Footer,
  AlignmentType, WidthType, BorderStyle, ShadingType, VerticalAlign, PageNumber, TabStopType,
  TableLayoutType, HeightRule,
} = require('docx');

// ── Sistema de marca ─────────────────────────────────────────────
const C = { tinta: '1C1A16', oro: 'BA9A58', oroTexto: '85692F', gris: '625B50', linea: 'E2DBCD',
            papel: 'FAF8F4', oroClaro: 'F3ECDD', barra: 'A3843F', blanco: 'FFFFFF', semana: 'EFEAE0' };
const F = { titulo: 'Garamond', texto: 'Calibri' };
const W = 9638;                                  // ancho útil A4 con márgenes de 20 mm (DXA)
const LOGO = fs.readFileSync(path.join(__dirname, '..', 'fuente', 'assets', 'logo-renovare.png'));
const LOGO_RATIO = 246 / 633;

// ── Utilidades ───────────────────────────────────────────────────
const NONE = { style: BorderStyle.NIL, size: 0, color: 'auto' };
const SIN_BORDES = { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE };
const linea = (color = C.linea, size = 4) => ({ style: BorderStyle.SINGLE, size, color });

const run = (text, o = {}) => new TextRun({ text, font: o.font || F.texto, size: o.size || 20, bold: o.bold,
  italics: o.italics, color: o.color || C.tinta, characterSpacing: o.spacing, allCaps: o.caps, shading: o.shading });
const para = (children, o = {}) => new Paragraph({
  children: (Array.isArray(children) ? children : [children]).map(c => typeof c === 'string' ? run(c, o) : c),
  alignment: o.align, spacing: { before: o.before ?? 0, after: o.after ?? 100, line: o.line ?? 264, lineRule: 'auto' },
  keepNext: o.keepNext, keepLines: o.keepLines, pageBreakBefore: o.pageBreakBefore, border: o.border,
  style: o.style, indent: o.indent, tabStops: o.tabStops,
});
const etiqueta = (text, o = {}) => para(run(text, { size: o.size || 15, bold: true, color: o.color || C.oroTexto, caps: true, spacing: 30 }),
  { after: o.after ?? 40, before: o.before ?? 0, keepNext: true, align: o.align });

// Rótulo de sección + título grande (inicia página nueva)
const seccion = (num, titulo) => [
  new Paragraph({ style: 'Seccion', pageBreakBefore: true, children: [run(num, { size: 16, bold: true, color: C.oroTexto, caps: true, spacing: 36 })] }),
  new Paragraph({ style: 'Titulo2', children: [new TextRun(titulo)] }),
];
// Subtítulo con cuadro dorado
const h3 = (text, o = {}) => new Paragraph({ style: 'Titulo3', spacing: { before: o.before ?? 200, after: 60 },
  children: [run('■  ', { size: 16, color: o.color || C.oro, bold: true }), new TextRun(text)] });

const cell = (children, o = {}) => new TableCell({
  children: (Array.isArray(children) ? children : [children]).map(c => typeof c === 'string' ? para(c, { after: 0, ...o.p }) : c),
  width: { size: o.w, type: WidthType.DXA }, columnSpan: o.span, verticalAlign: o.v || VerticalAlign.TOP,
  shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
  borders: o.borders || { top: NONE, left: NONE, right: NONE, bottom: o.bottom || linea() },
  margins: o.margins || { top: 90, bottom: 90, left: 120, right: 120 },
});
const tabla = (rows, widths, o = {}) => new Table({
  rows, columnWidths: widths, width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
  layout: TableLayoutType.FIXED, borders: o.borders || SIN_BORDES,
});
// Fila de cabecera oscura (se repite al pasar de página)
const cabecera = (labels, widths, aligns = []) => new TableRow({ tableHeader: true, cantSplit: true,
  children: labels.map((l, i) => cell(para(run(l, { size: 14, bold: true, color: C.blanco, caps: true, spacing: 16 }),
    { after: 0, align: aligns[i] }), { w: widths[i], fill: C.tinta, borders: { top: NONE, bottom: NONE, left: NONE, right: NONE }, v: VerticalAlign.CENTER })) });
const R = AlignmentType.RIGHT, CEN = AlignmentType.CENTER;

// ── Contenido ────────────────────────────────────────────────────
const PARTIDAS = [
  [1, 'Protección de zonas de paso, medios auxiliares y limpieza final', 'ud.', 1, '464 €'],
  [2, 'Nivelación de suelo con mortero de cemento y arena, maestreado y fratasado, con espesor aproximado de 3–5 cm', 'm²', 75, '3.479 €'],
  [3, 'Suministro y aplicación de microcemento en suelo, con preparación, capas y sellado protector', 'm²', 75, '7.732 €'],
  [4, 'Renovación completa de electricidad: cuadro, protecciones, circuitos, mecanismos, puntos y certificado. Aprovechamiento del cable aportado por el propietario', 'ud.', 1, '5.773 €'],
  [5, 'Renovación completa de fontanería y desagües de cocina y baño, conexiones y pruebas', 'ud.', 1, '3.196 €'],
  [6, 'Ayudas de albañilería para instalaciones: apertura y cierre de rozas, pasos y remates', 'ud.', 1, '876 €'],
  [7, 'Construcción de pared de baño de 1,70 × 2,70 m. Ladrillos, arena y cemento: aprovechamiento de materiales que posee el propietario', 'm²', 5, '309 €'],
  [8, 'Prolongación de paredes de baño de 1,30 × 2,70 m y formación de hueco para puerta. Aprovechamiento de materiales que posee el propietario', 'm²', 8, '495 €'],
  [9, 'Suministro e instalación de puerta nueva de baño y habitación de visita, marco, tapajuntas y herrajes', 'ud.', 2, '845 €'],
  [10, 'Retirada de gotelé de paredes y techo. Superficie estimada', 'm²', 196, '2.425 €'],
  [11, 'Enlucido y alisado de paredes. Superficie estimada', 'm²', 226, '2.563 €'],
  [12, 'Pintura de paredes y techo, preparación y dos manos. Superficie estimada', 'm²', 203, '2.093 €'],
  [13, 'Preparación y pintura de techos de toda la casa, incluido el baño de 5 m². Superficie estimada', 'm²', 75, '773 €'],
  [14, 'Sustitución de balconera de PVC de 1,10 × 2,10 m y fijo superior de 0,30 m, dos hojas batientes, una oscilobatiente si es viable, doble vidrio, instalación y remates', 'ud.', 1, '1.591 €'],
  [15, 'Sustitución de ventana de baño de PVC oscilobatiente de 0,50 × 1,20 m, doble vidrio traslúcido, instalación y remates', 'ud.', 1, '466 €'],
  [16, [['Suministro y montaje de muebles de cocina de 5,0 m, incluyendo dos torres dentro de esa longitud, muebles altos y bajos según distribución, herrajes y remates. '], ['No incluyen electrodomésticos. Sí incluyen', true], [' el fregadero sencillo de 1 seno y el grifo monomando básico']], 'ud.', 1, '3.567 €'],
  [17, 'Encimera de cuarzo o Silestone: medición, fabricación, huecos y colocación. Tramo útil estimado hasta 3,5 m, descontadas las torres', 'ud.', 1, '1.547 €'],
  [18, 'Suministro y colocación de enchapado cerámico en paredes del baño, adhesivo, rejuntado y remates. Superficie estimada', 'm²', 29, '2.093 €'],
  [19, 'Suministro y colocación de pladur para techo en baño', 'm²', 7, '649 €'],
  [20, 'Suministro y montaje de mueble de baño de 80 cm, lavabo, espejo y grifo', 'ud.', 1, '670 €'],
  [21, 'Suministro y colocación de inodoro compacto', 'ud.', 1, '361 €'],
  [22, 'Suministro y colocación de plato de ducha de resina antideslizante, con válvula. Medida estimada hasta 130 × 80 cm', 'ud.', 1, '526 €'],
  [23, 'Suministro y montaje de grifería y conjunto de ducha monomando', 'ud.', 1, '227 €'],
  [24, 'Suministro e instalación de mampara de ducha con vidrio de seguridad', 'ud.', 1, '567 €'],
  [25, 'Suministro e instalación de equipo minisplit inverter completo, potencia estimada de 3,5 kW, hasta 3 m de línea por equipo, soportes, desagüe y puesta en marcha. Marca Johnson', 'ud.', 2, '2.577 €'],
  [26, 'Carga, retirada y gestión de residuos generados por los trabajos contratados', 'ud.', 1, '495 €'],
];
const CAPITULOS = [
  ['Suelos: nivelación y microcemento', '2–3', 24.2, '11.211 €'],
  ['Electricidad, fontanería y ayudas de albañilería', '4–6', 21.2, '9.845 €'],
  ['Paredes y techos: gotelé, alisado y pintura', '10–13', 16.9, '7.854 €'],
  ['Baño completo', '7–8, 18–24', 12.7, '5.897 €'],
  ['Cocina: mobiliario y encimera', '16–17', 11.0, '5.114 €'],
  ['Puertas y ventanas', '9, 14–15', 6.3, '2.902 €'],
  ['Climatización', '25', 5.6, '2.577 €'],
  ['Protección, limpieza y residuos', '1, 26', 2.1, '959 €'],
];
const FASES = [
  ['Preparación y demoliciones', 'Áreas despejadas y retirada de escombros', 1, 2],
  ['Albañilería e instalaciones', 'Redistribución y preinstalaciones verificadas', 3, 6],
  ['Revestimientos y acabados', 'Pavimentos, alicatados, techos y pintura', 7, 9],
  ['Montajes y entrega', 'Equipamiento, pruebas, remates y limpieza', 10, 12],
];
const PAGOS = [
  ['1', 'Reserva', 'Firma y confirmación de fecha'],
  ['2', 'Inicio', 'Como máximo el día anterior al inicio'],
  ['3', 'Primer avance', 'Demoliciones, tabiquería y preinstalaciones de electricidad y fontanería'],
  ['4', 'Segundo avance', 'Enlucido y pintura de paredes y techo, y pavimento listo para inicio de microcemento'],
  ['5', 'Entrega', 'Microcemento, montaje de mobiliario de baño y cocina, revisión conjunta, trabajos terminados, pruebas y limpieza'],
];
const CONDICIONES = [
  ['Precio y alcance', ['El precio acordado cubre las partidas, mediciones y calidades incluidas. Los opcionales sin seleccionar y las exclusiones no forman parte del total contratado. Las decisiones abiertas que afecten al precio se resolverán antes de la aceptación.']],
  ['Cambios e imprevistos', ['Si se solicita un cambio o aparece una condición oculta, documentamos el hallazgo y presentamos su solución, coste con IVA y efecto en el plazo. Se ejecuta tras la aprobación escrita del cliente. Mientras se decide, acordamos las actuaciones afectadas y las medidas necesarias de protección.']],
  ['Materiales y suministros', ['Las referencias incluidas constan en las partidas y anexos. Cualquier cambio de gama o suministro del cliente debe quedar definido antes del pedido, junto con su coste, instalación y fecha de entrega. Las compras a medida se autorizan una vez verificadas las dimensiones.']],
  ['Accesos, permisos y residuos', ['El cliente se encargará de las licencias, tasas y documentación técnica necesarias para la obra, salvo que se acuerde expresamente su gestión por Renovare. Asimismo, facilitará el acceso a la vivienda y el suministro de agua y electricidad durante los trabajos. Los horarios se coordinarán con el cliente, respetando las normas de la comunidad y los horarios permitidos.',
    'Renovare realizará la protección de las zonas de paso y de las zonas comunes afectadas por los trabajos, así como la retirada y gestión de los residuos generados y la limpieza final de obra, conforme a las partidas incluidas en el presupuesto.']],
  ['Plazos y coordinación', ['La planificación corresponde al alcance aceptado. Si cambia el alcance o surge una incidencia que afecta al calendario, comunicamos su causa y acordamos por escrito las fechas actualizadas. Las entregas de materiales a medida se coordinan antes de confirmar el inicio.']],
  ['Entrega y atención posterior', ['Al finalizar la obra, se realizará una revisión conjunta con el cliente y se firmará un acta de entrega que recogerá las comprobaciones realizadas, la documentación entregada y los posibles remates pendientes, indicando su responsable y fecha prevista de resolución.',
    [['Las incidencias se comunicarán a Sebastián Vanegas, en el teléfono '], ['624 892 643', true], ['. Renovare entregará las garantías, instrucciones de uso y mantenimiento y certificados que correspondan a los productos e instalaciones incluidos en el presupuesto. Las garantías de los trabajos y productos se atenderán conforme al contrato y a la normativa aplicable, respetando los derechos del cliente.']]]],
  ['Documentación contractual', ['La propuesta aceptada, sus anexos identificados y los cambios aprobados definen el alcance económico. El contrato de obra recoge las restantes condiciones, incluida cancelación y resolución. Seguro de responsabilidad civil: Occident GCO, S.A.U. de Seguros y Reaseguros, 8-11.477.641-F, con vigencia 03-02-2027.']],
];
const texto = (t, o = {}) => para(Array.isArray(t) ? t.map(([s, b]) => run(s, { bold: b, ...o })) : run(t, o), { after: o.after ?? 110, line: 276 });

// ── Portada ──────────────────────────────────────────────────────
const portada = [];
portada.push(tabla([new TableRow({ children: [
  cell(para(new ImageRun({ type: 'png', data: LOGO, transformation: { width: 190, height: Math.round(190 * LOGO_RATIO) } }), { after: 0 }),
    { w: 4819, v: VerticalAlign.BOTTOM, bottom: linea(C.oro, 6), margins: { top: 0, bottom: 200, left: 0, right: 0 } }),
  cell([
    para(run('Renovare Design & Build SL', { size: 15, bold: true }), { align: R, after: 0 }),
    ...['CIF B-88775341', 'Calle Creu Roja 1, bajo · Benetússer', 'www.renovaredyb.com', '624 892 643 · renovaredyb@gmail.com']
      .map(t => para(run(t, { size: 15, color: C.gris }), { align: R, after: 0 })),
  ], { w: 4819, v: VerticalAlign.BOTTOM, bottom: linea(C.oro, 6), margins: { top: 0, bottom: 200, left: 0, right: 0 } }),
] })], [4819, 4819]));
portada.push(etiqueta('Propuesta comercial', { before: 360, after: 60 }));
portada.push(new Paragraph({ style: 'Titulo1', children: [new TextRun('Presupuesto de reforma')] }));
portada.push(para(run('Reforma integral en Valencia', { font: F.titulo, size: 28, italics: true, color: C.oroTexto }), { after: 240 }));

const ficha = (l, v, w, grande, span) => new TableCell({ columnSpan: span, width: { size: w, type: WidthType.DXA },
  borders: { top: NONE, bottom: NONE, left: NONE, right: NONE }, margins: { top: 60, bottom: 60, left: 0, right: 120 },
  children: [etiqueta(l, { size: 13, color: C.gris, after: 20 }), para(run(v, { size: grande ? 24 : 19, bold: grande }), { after: 0 })] });
portada.push(tabla([
  new TableRow({ children: [ficha('Preparado para', 'Cristian Nohalez García', W, true, 4)] }),
  new TableRow({ children: [ficha('Obra', 'Calle Barig 3, Benicalap · 46025', 3638), ficha('Referencia', 'SV-0045-03', 2000),
    ficha('Emisión', '07/10/2026', 2000), ficha('Válido hasta', '07/11/2026', 2000)] }),
], [3638, 2000, 2000, 2000], { borders: { ...SIN_BORDES, top: linea(), bottom: linea() } }));

portada.push(new Paragraph({ style: 'Titulo2', spacing: { before: 280, after: 80 }, children: [new TextRun({ text: 'Su proyecto en una página', size: 34 })] }));
portada.push(texto('Reforma integral de su vivienda de 75 m²: suelos de microcemento, electricidad y fontanería nuevas, cocina y baño completos, puertas y ventanas, alisado y pintura, aire acondicionado y retirada de residuos. La oferta recoge los trabajos, materiales y acabados definidos tras la visita realizada in situ, según su planteamiento.', { after: 200 }));

const filaInv = (l, v, total) => new TableRow({ children: [
  cell(para(run(l, { size: 19, bold: total, color: total ? C.tinta : C.gris }), { after: 0 }), { w: 2400, fill: C.papel, bottom: total ? NONE : linea(), borders: total ? { top: linea(C.oro, 8), bottom: NONE, left: NONE, right: NONE } : undefined, margins: { top: 70, bottom: 70, left: 0, right: 0 } }),
  cell(para(run(v, { size: 19, bold: total }), { after: 0, align: R }), { w: 1900, fill: C.papel, bottom: total ? NONE : linea(), borders: total ? { top: linea(C.oro, 8), bottom: NONE, left: NONE, right: NONE } : undefined, margins: { top: 70, bottom: 70, left: 0, right: 0 } }),
] });
portada.push(tabla([new TableRow({ children: [
  cell([etiqueta('Inversión del proyecto base', { size: 15 }),
    para([run('46.359 €', { font: F.titulo, size: 64 }), run('  + IVA', { size: 22, color: C.gris })], { after: 0 })],
    { w: 4938, fill: C.papel, v: VerticalAlign.CENTER, borders: { top: linea(), bottom: linea(), right: NONE, left: { style: BorderStyle.SINGLE, size: 36, color: C.oro } }, margins: { top: 220, bottom: 220, left: 300, right: 120 } }),
  cell(tabla([filaInv('Base imponible', '46.359,00 €'), filaInv('IVA 10 %', '4.635,90 €'), filaInv('Total IVA incluido', '50.994,90 €', true)], [2400, 1900]),
    { w: 4700, fill: C.papel, v: VerticalAlign.CENTER, borders: { top: linea(), bottom: linea(), right: linea(), left: NONE }, margins: { top: 200, bottom: 200, left: 100, right: 300 } }),
] })], [4938, 4700]));

const dl = (pares, wl, wv) => tabla(pares.map(([l, v]) => new TableRow({ cantSplit: true, children: [
  cell(para(run(l, { size: 19, color: C.gris }), { after: 0 }), { w: wl, margins: { top: 70, bottom: 70, left: 0, right: 80 } }),
  cell(para(run(v, { size: 19, bold: true }), { after: 0 }), { w: wv, margins: { top: 70, bottom: 70, left: 0, right: 0 } }),
] })), [wl, wv]);
portada.push(tabla([new TableRow({ children: [
  cell([h3('Alcance principal', { before: 0 }), dl([['Espacios', 'Salón, baño, cocina y habitaciones'], ['Superficie intervenida', '75 m²'], ['Tipo de inmueble', 'Apartamento']], 1750, 2769)],
    { w: 4519, bottom: NONE, margins: { top: 280, bottom: 0, left: 0, right: 0 } }),
  cell(para('', { after: 0 }), { w: 600, bottom: NONE }),
  cell([h3('Planificación', { before: 0 }), dl([['Duración base', '10–12 semanas'], ['Inicio previsto', '2 de noviembre de 2026'], ['Responsable', 'Sebastián Vanegas · Jefe de obra'], ['Contacto', '624 892 643']], 1500, 3019)],
    { w: 4519, bottom: NONE, margins: { top: 280, bottom: 0, left: 0, right: 0 } }),
] })], [4519, 600, 4519]));

const destacado = (titulo, cuerpo, before = 300) => tabla([new TableRow({ cantSplit: true, children: [cell([
  etiqueta(titulo, { size: 14, after: 40 }), texto(cuerpo, { after: 0 })],
  { w: W, fill: C.oroClaro, bottom: NONE, margins: { top: 180, bottom: 180, left: 280, right: 280 } })] })], [W]);
portada.push(para('', { after: 0, before: 0 }));
portada.push(destacado('Siguiente paso', 'Para avanzar, revisamos juntos el alcance, resolvemos las dudas y confirmamos las opciones elegidas antes de formalizar la aceptación. Sebastián Vanegas le llamará para acordar esa revisión; también puede contactarle directamente en el 624 892 643 o en renovaredyb@gmail.com. Oferta válida hasta el 07/11/2026.'));

// ── 01 · Alcance ────────────────────────────────────────────────
const alcance = [...seccion('01 · Proyecto y resumen ejecutivo', 'Alcance y coordinación')];
alcance.push(h3('Qué vamos a transformar', { before: 0 }));
alcance.push(texto('Realizaremos una reforma integral de la vivienda para renovar sus espacios, instalaciones y acabados. Actualizaremos la cocina y el baño, incluyendo mobiliario y equipamiento. Renovaremos la electricidad y la fontanería, nivelaremos los suelos y aplicaremos microcemento. Completaremos la transformación con alisado y pintura, sustitución de las puertas y ventanas indicadas e instalación de aire acondicionado, para lograr una vivienda más funcional y confortable.'));
const caja = (titulo, cuerpo, color, w) => cell([h3(titulo, { before: 0, color }), texto(cuerpo, { after: 40 })],
  { w, fill: C.papel, borders: { top: linea(color, 8), bottom: NONE, left: NONE, right: NONE }, margins: { top: 160, bottom: 120, left: 220, right: 220 } });
alcance.push(tabla([new TableRow({ cantSplit: true, children: [
  caja('Incluido en el proyecto base', [['Los trabajos, materiales y suministros detallados en la tabla del apartado '], ['02 · Inversión', true], [', según las condiciones indicadas en cada partida. Las partidas opcionales se incorporarán únicamente si el cliente las acepta expresamente.']], C.oro, 4669),
  cell(para('', { after: 0 }), { w: 300, bottom: NONE }),
  caja('No incluido', 'Los trabajos y suministros que no estén expresamente descritos en este presupuesto. Tampoco se incluyen electrodomésticos, luminarias, licencias, tasas, proyecto técnico ni dirección facultativa, cuando estos sean necesarios.', C.gris, 4669),
] })], [4669, 300, 4669]));
alcance.push(h3('Decisiones de materiales'));
alcance.push(texto('Los suelos, alicatados, muebles y puertas de cocina, así como las encimeras, se elegirán entre la variedad de modelos ofrecidos por la empresa dentro del presupuesto. Sebastián comunicará las fechas de elección según el avance de la obra. Si el cliente prefiere una opción cuyo precio supere el importe previsto, se comunicará la diferencia para su aprobación antes de realizar el pedido.'));
alcance.push(h3('Cómo coordinamos su obra'));
alcance.push(texto('El responsable, Sebastián Vanegas, centraliza las consultas y coordina los oficios. Compartimos un seguimiento con los avances y las decisiones pendientes. Los cambios se registran por escrito con su coste y efecto en el plazo. Al finalizar, revisamos la obra juntos y documentamos los remates y la entrega.'));
alcance.push(texto('Seguimiento visual: fotografías periódicas del avance con un resumen de trabajos realizados y próximos pasos. Si la obra lo permite y se autoriza expresamente, puede añadirse una cámara fija con acceso restringido, sin audio y sin captar espacios ajenos a la actuación.'));
const PASOS = [['Revisión', 'Visita, medición y definición de necesidades'], ['Planificación', 'Fases, coordinación y previsión de medios'], ['Preparación', 'Protecciones y organización de la zona de trabajo'], ['Ejecución', 'Desarrollo de los trabajos y seguimiento acordado'], ['Entrega', 'Revisión final, limpieza y cierre del proyecto']];
alcance.push(tabla([new TableRow({ cantSplit: true, children: PASOS.flatMap(([t, d], i) => {
  const c = cell([para(run(`0${i + 1}`, { size: 14, bold: true, color: C.oroTexto }), { after: 10 }), para(run(t, { size: 17, bold: true }), { after: 10 }), para(run(d, { size: 15, color: C.gris }), { after: 0, line: 240 })],
    { w: 1771, borders: { top: linea(C.oro, 8), bottom: NONE, left: NONE, right: NONE }, margins: { top: 80, bottom: 40, left: 0, right: 60 } });
  return i < 4 ? [c, cell(para('', { after: 0 }), { w: 196, bottom: NONE })] : [c];
}) })], [1771, 196, 1771, 196, 1771, 196, 1771, 196, 1770]));
alcance.push(h3('Datos para la ejecución', { before: 240 }));
const dato = (l, v, w) => cell([etiqueta(l, { size: 13, color: C.gris, after: 10 }), para(run(v, { size: 19, bold: true }), { after: 0 })], { w, margins: { top: 70, bottom: 70, left: 0, right: 100 } });
alcance.push(tabla([
  new TableRow({ cantSplit: true, children: [dato('Cliente', 'Cristian Nohalez García · 607 23 86 30', 4819), dato('Empresa', 'Renovare Design & Build SL · CIF B-88775341', 4819)] }),
  new TableRow({ cantSplit: true, children: [dato('Domicilio', 'Calle Creu Roja 1, bajo · Benetússer', 4819), dato('Contacto comercial', 'Sebastián Vanegas', 4819)] }),
  new TableRow({ cantSplit: true, children: [new TableCell({ columnSpan: 2, width: { size: W, type: WidthType.DXA },
    borders: { top: NONE, left: NONE, right: NONE, bottom: linea() }, margins: { top: 70, bottom: 70, left: 0, right: 100 },
    children: [etiqueta('Acceso, horarios y ocupación del inmueble', { size: 13, color: C.gris, after: 10 }), para(run('Lunes a viernes, de 8:00 a 17:00', { size: 19, bold: true }), { after: 0 })] })] }),
], [4819, 4819], { borders: { ...SIN_BORDES, top: linea() } }));

// ── 02 · Inversión ──────────────────────────────────────────────
const inversion = [...seccion('02 · Inversión', 'Resumen económico')];
inversion.push(texto('Dónde se invierte cada euro del proyecto base, agrupado por capítulos. El detalle de cada partida figura a continuación.', { after: 140 }));
const wc = [3500, 1300, 2300, 900, 1638];
const barra = (pc, ancho) => { const lleno = Math.max(60, Math.round(pc / 24.2 * ancho)); const resto = ancho - lleno;
  const c = (w, fill) => cell(para(run('', { size: 4 }), { after: 0, line: 120 }), { w, fill, bottom: NONE, margins: { top: 0, bottom: 0, left: 0, right: 0 } });
  return tabla([new TableRow({ height: { value: 130, rule: HeightRule.EXACT }, children: resto > 0 ? [c(lleno, C.barra), c(resto)] : [c(lleno, C.barra)] })], resto > 0 ? [lleno, resto] : [lleno]); };
inversion.push(tabla([
  cabecera(['Capítulo', 'Partidas', 'Peso sobre el total', '', 'Sin IVA'], wc, [null, null, null, R, R]),
  ...CAPITULOS.map(([n, pt, pc, s]) => new TableRow({ cantSplit: true, children: [
    cell(para(run(n, { size: 18, bold: true }), { after: 0 }), { w: wc[0], v: VerticalAlign.CENTER }),
    cell(para(run(pt, { size: 16, color: C.gris }), { after: 0 }), { w: wc[1], v: VerticalAlign.CENTER }),
    // Barra: tabla de dos celdas; para editarla, arrastrar el borde entre la celda dorada y la vacía.
    cell(barra(pc, wc[2] - 240), { w: wc[2], v: VerticalAlign.CENTER }),
    cell(para(run(`${pc.toFixed(1).replace('.', ',')} %`, { size: 17, color: C.gris }), { after: 0, align: R }), { w: wc[3], v: VerticalAlign.CENTER }),
    cell(para(run(s, { size: 18, bold: true }), { after: 0, align: R }), { w: wc[4], v: VerticalAlign.CENTER }),
  ] })),
  new TableRow({ cantSplit: true, children: [
    cell(para(run('Total proyecto base', { size: 18, bold: true }), { after: 0 }), { w: wc[0], borders: { top: linea(C.oro, 10), bottom: NONE, left: NONE, right: NONE } }),
    cell(para('', { after: 0 }), { w: wc[1], borders: { top: linea(C.oro, 10), bottom: NONE, left: NONE, right: NONE } }),
    cell(para('', { after: 0 }), { w: wc[2], borders: { top: linea(C.oro, 10), bottom: NONE, left: NONE, right: NONE } }),
    cell(para(run('100 %', { size: 18, bold: true }), { after: 0, align: R }), { w: wc[3], borders: { top: linea(C.oro, 10), bottom: NONE, left: NONE, right: NONE } }),
    cell(para(run('46.359 €', { size: 18, bold: true }), { after: 0, align: R }), { w: wc[4], borders: { top: linea(C.oro, 10), bottom: NONE, left: NONE, right: NONE } }),
  ] }),
], wc));

const resumen = (filas, widths) => tabla([
  cabecera(['Concepto', 'Importe'], widths, [null, R]),
  ...filas.map(([l, v, total]) => new TableRow({ cantSplit: true, children: [
    cell(para(run(l, { size: total ? 20 : 18, bold: total }), { after: 0 }), { w: widths[0], fill: total ? C.oroClaro : undefined, bottom: total ? linea(C.oro, 10) : linea() }),
    cell(para(run(v, { size: total ? 20 : 18, bold: total }), { after: 0, align: R }), { w: widths[1], fill: total ? C.oroClaro : undefined, bottom: total ? linea(C.oro, 10) : linea() }),
  ] })),
], widths);
inversion.push(para('', { after: 120 }));
inversion.push(tabla([new TableRow({ cantSplit: true, children: [
  cell(resumen([['Subtotal proyecto base', '46.359,00 €'], ['IVA 10 %', '4.635,90 €'], ['Total proyecto con IVA', '50.994,90 €', true]], [3000, 2100]), { w: 5100, bottom: NONE, margins: { top: 0, bottom: 0, left: 0, right: 0 } }),
  cell([texto('El total es cerrado para las mediciones, trabajos y calidades definidos en esta oferta. Cualquier modificación se tramita conforme al procedimiento de cambios de la página de condiciones.', { size: 17, color: C.gris }),
    texto('Opción no incluida: puerta principal, 1.186 € sin IVA (partida 27).', { size: 17, color: C.gris, after: 0 })], { w: 4538, bottom: NONE, margins: { top: 0, bottom: 0, left: 400, right: 0 } }),
] })], [5100, 4538]));

// Detalle de partidas (página nueva)
inversion.push(new Paragraph({ style: 'Titulo3', pageBreakBefore: true, spacing: { before: 0, after: 60 }, children: [run('■  ', { size: 16, color: C.oro, bold: true }), new TextRun('Detalle de partidas')] }));
inversion.push(texto('Las partidas siguientes corresponden exclusivamente al proyecto base.', { after: 120 }));
const wp = [620, 5518, 950, 1050, 1500];
const descripcion = d => Array.isArray(d) ? para(d.map(([s, b]) => run(s, { size: 18, bold: b })), { after: 0, line: 252 }) : para(run(d, { size: 18 }), { after: 0, line: 252 });
inversion.push(tabla([
  cabecera(['Nº', 'Descripción', 'Unidad', 'Cantidad', 'Importe sin IVA'], wp, [CEN, null, CEN, CEN, R]),
  ...PARTIDAS.map(([n, d, u, q, i], k) => { const f = k % 2 ? C.papel : undefined; return new TableRow({ cantSplit: true, children: [
    cell(para(run(String(n), { size: 18, bold: true, color: C.oroTexto }), { after: 0, align: CEN }), { w: wp[0], fill: f }),
    cell(descripcion(d), { w: wp[1], fill: f }),
    cell(para(run(u, { size: 18 }), { after: 0, align: CEN }), { w: wp[2], fill: f }),
    cell(para(run(String(q), { size: 18 }), { after: 0, align: CEN }), { w: wp[3], fill: f }),
    cell(para(run(i, { size: 18, bold: true }), { after: 0, align: R }), { w: wp[4], fill: f }),
  ] }); }),
  new TableRow({ cantSplit: true, children: [
    cell(para('', { after: 0 }), { w: wp[0], borders: { top: linea(C.oro, 10), bottom: NONE, left: NONE, right: NONE } }),
    new TableCell({ columnSpan: 3, width: { size: wp[1] + wp[2] + wp[3], type: WidthType.DXA }, borders: { top: linea(C.oro, 10), bottom: NONE, left: NONE, right: NONE }, margins: { top: 120, bottom: 90, left: 120, right: 120 },
      children: [para(run('Total proyecto base sin IVA', { size: 20, bold: true }), { after: 0, align: R })] }),
    cell(para(run('46.359,00 €', { size: 20, bold: true }), { after: 0, align: R }), { w: wp[4], borders: { top: linea(C.oro, 10), bottom: NONE, left: NONE, right: NONE }, margins: { top: 120, bottom: 90, left: 120, right: 120 } }),
  ] }),
  new TableRow({ cantSplit: true, children: [
    cell(para('', { after: 0 }), { w: wp[0], bottom: linea(C.oro, 6), margins: { top: 260, bottom: 40, left: 120, right: 120 } }),
    new TableCell({ columnSpan: 4, width: { size: wp[1] + wp[2] + wp[3] + wp[4], type: WidthType.DXA }, borders: { top: NONE, bottom: linea(C.oro, 6), left: NONE, right: NONE }, margins: { top: 260, bottom: 40, left: 120, right: 120 },
      children: [etiqueta('Opción no incluida en el total · requiere aceptación expresa', { size: 14, after: 0 })] }),
  ] }),
  new TableRow({ cantSplit: true, children: [
    cell(para(run('27', { size: 18, bold: true, color: C.oroTexto }), { after: 0, align: CEN }), { w: wp[0] }),
    cell(para([run('OPCIONAL  ', { size: 14, bold: true, color: C.oroTexto, spacing: 20 }), run('Puerta principal: suministro e instalación', { size: 18, color: C.gris })], { after: 0 }), { w: wp[1] }),
    cell(para(run('ud.', { size: 18, color: C.gris }), { after: 0, align: CEN }), { w: wp[2] }),
    cell(para(run('1', { size: 18, color: C.gris }), { after: 0, align: CEN }), { w: wp[3] }),
    cell(para(run('1.186 €', { size: 18, color: C.gris }), { after: 0, align: R }), { w: wp[4] }),
  ] }),
], wp));

// ── 03 · Plazos y pagos ─────────────────────────────────────────
const plazos = [...seccion('03 · Plazos', 'Planificación y forma de pago')];
plazos.push(texto('Inicio previsto el 2 de noviembre de 2026. Duración del proyecto base: 10–12 semanas. El cronograma detallado y la fecha de terminación se confirman antes del inicio, con materiales, accesos y decisiones de cliente coordinados.', { after: 140 }));
// Cronograma: cada semana es una celda; para mover una fase, cambiar el sombreado de las celdas.
const ws = 428, wg = [3330, 1170, ...Array(12).fill(ws)];
wg[13] = W - wg.slice(0, 13).reduce((a, b) => a + b, 0);
const semBorde = { top: NONE, bottom: linea(), left: { style: BorderStyle.SINGLE, size: 2, color: C.semana }, right: NONE };
plazos.push(tabla([
  cabecera(['Fase y resultado previsto', 'Semanas', ...Array.from({ length: 12 }, (_, i) => String(i + 1))], wg, [null, null, ...Array(12).fill(CEN)]),
  ...FASES.map(([f, r, a, b]) => new TableRow({ cantSplit: true, height: { value: 620, rule: HeightRule.ATLEAST }, children: [
    cell([para(run(f, { size: 18, bold: true }), { after: 10 }), para(run(r, { size: 16, color: C.gris }), { after: 0 })], { w: wg[0], v: VerticalAlign.CENTER }),
    cell(para(run(`Sem. ${a}–${b}`, { size: 18, bold: true, color: C.oroTexto }), { after: 0 }), { w: wg[1], v: VerticalAlign.CENTER }),
    ...Array.from({ length: 12 }, (_, i) => {
      const on = i + 1 >= a && i + 1 <= b;
      return new TableCell({ width: { size: wg[i + 2], type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
        borders: semBorde, margins: { top: on ? 150 : 0, bottom: on ? 150 : 0, left: 0, right: 0 },
        children: [on ? tabla([new TableRow({ children: [cell(para(run(' ', { size: 6 }), { after: 0, line: 160 }), { w: wg[i + 2], fill: C.barra, bottom: NONE, margins: { top: 40, bottom: 40, left: 0, right: 0 } })] })], [wg[i + 2]]) : para('', { after: 0 })] });
    }),
  ] })),
], wg));

plazos.push(h3('Pagos vinculados a la obra', { before: 320 }));
plazos.push(texto('Los porcentajes se calculan sobre el total contratado con IVA, incluidos únicamente los opcionales aceptados. La reserva se descuenta del precio y forma parte del 40 % previo al inicio.', { after: 140 }));
const wpg = [1800, 3038, 800, 1350, 1150, 1500];
const celdaTotal = (c, w, al) => cell(para(run(c, { size: 18, bold: true }), { after: 0, align: al }), { w, borders: { top: linea(C.oro, 10), bottom: NONE, left: NONE, right: NONE } });
plazos.push(tabla([
  cabecera(['Pago', 'Hito verificable', '%', 'Base', 'IVA 10 %', 'Total'], wpg, [null, null, CEN, R, R, R]),
  ...PAGOS.map(([n, t, h]) => new TableRow({ cantSplit: true, children: [
    cell(para([run(`${n}  `, { size: 18, bold: true, color: C.oroTexto }), run(t, { size: 18, bold: true })], { after: 0 }), { w: wpg[0] }),
    cell(para(run(h, { size: 18 }), { after: 0, line: 252 }), { w: wpg[1] }),
    cell(para(run('20 %', { size: 18 }), { after: 0, align: CEN }), { w: wpg[2] }),
    cell(para(run('9.271,80 €', { size: 18 }), { after: 0, align: R }), { w: wpg[3] }),
    cell(para(run('927,18 €', { size: 18 }), { after: 0, align: R }), { w: wpg[4] }),
    cell(para(run('10.198,98 €', { size: 18, bold: true }), { after: 0, align: R }), { w: wpg[5] }),
  ] })),
  new TableRow({ cantSplit: true, children: [celdaTotal('', wpg[0]), celdaTotal('Total proyecto base', wpg[1]), celdaTotal('100 %', wpg[2], CEN),
    celdaTotal('46.359,00 €', wpg[3], R), celdaTotal('4.635,90 €', wpg[4], R), celdaTotal('50.994,90 €', wpg[5], R)] }),
], wpg));
plazos.push(para('', { after: 100 }));
plazos.push(texto('Cada solicitud de pago se acompaña de la factura correspondiente y, en los avances, del registro de trabajos realizados. Medio de pago: transferencia bancaria a la cuenta de Renovare Design & Build SL que figura en cada factura.'));
plazos.push(texto('Si se acepta la puerta principal, cada pago pasa a 9.509,00 € + 950,90 € de IVA = 10.459,90 €.', { size: 17, color: C.gris }));

// ── 04 · Condiciones ────────────────────────────────────────────
const condiciones = [...seccion('04 · Condiciones', 'Condiciones de la propuesta')];
CONDICIONES.forEach(([t, ps], i) => { condiciones.push(h3(t, { before: i ? 200 : 0 })); ps.forEach(p => condiciones.push(texto(p, { size: 19 }))); });

// ── 05 · Aceptación ─────────────────────────────────────────────
const aceptacion = [...seccion('05 · Aceptación', 'Aceptación de la propuesta')];
aceptacion.push(tabla([['Cliente', 'Cristian Nohalez García · DNI o NIF 03151845V'], ['Obra', 'Calle Barig 3, Benicalap · 46025'], ['Oferta', 'SV-0045-03 · Fecha 07/10/2026']]
  .map(([l, v]) => new TableRow({ cantSplit: true, children: [
    cell(para(run(l, { color: C.gris }), { after: 0 }), { w: 2800, margins: { top: 90, bottom: 90, left: 0, right: 0 } }),
    cell(para(run(v, { bold: true }), { after: 0 }), { w: 6838, margins: { top: 90, bottom: 90, left: 0, right: 0 } })] })),
  [2800, 6838], { borders: { ...SIN_BORDES, top: linea() } }));
aceptacion.push(para(run('Se acepta el proyecto base y únicamente las opciones marcadas a continuación. Las alternativas no marcadas quedan fuera del encargo.'), { before: 200, after: 140, line: 276 }));
const wsel = [1900, 5638, 2100];
aceptacion.push(tabla([
  cabecera(['Selección', 'Alcance', 'Total antes de IVA'], wsel, [null, null, R]),
  new TableRow({ cantSplit: true, children: [cell(para(run('Base incluida', { bold: true, color: C.oroTexto, size: 19 }), { after: 0 }), { w: wsel[0] }),
    cell(para(run('Proyecto base', { size: 19 }), { after: 0 }), { w: wsel[1] }), cell(para(run('46.359,00 €', { size: 19 }), { after: 0, align: R }), { w: wsel[2] })] }),
  new TableRow({ cantSplit: true, children: [cell(para([run('☐ ', { font: 'Segoe UI Symbol', size: 22 }), run('Sí    ', { size: 19 }), run('☐ ', { font: 'Segoe UI Symbol', size: 22 }), run('No', { size: 19 })], { after: 0 }), { w: wsel[0] }),
    cell(para(run('Opción · Partida 27. Puerta principal: suministro e instalación', { size: 19 }), { after: 0 }), { w: wsel[1] }), cell(para(run('1.186,00 €', { size: 19 }), { after: 0, align: R }), { w: wsel[2] })] }),
], wsel));
aceptacion.push(para('', { after: 140 }));
const wcmp = [4638, 2500, 2500];
aceptacion.push(tabla([
  cabecera(['Importe contratado', 'Proyecto base', 'Con puerta principal'], wcmp, [null, R, R]),
  ...[['Base imponible', '46.359,00 €', '47.545,00 €'], ['IVA 10 %', '4.635,90 €', '4.754,50 €'], ['Total con IVA', '50.994,90 €', '52.299,50 €', true], ['Reserva del 20 % (IVA incluido)', '10.198,98 €', '10.459,90 €']]
    .map(([l, a, b, t]) => new TableRow({ cantSplit: true, children: [l, a, b].map((v, i) => cell(para(run(v, { size: 19, bold: t }), { after: 0, align: i ? R : undefined }),
      { w: wcmp[i], fill: t ? C.oroClaro : undefined, bottom: t ? linea(C.oro, 10) : linea() })) })),
], wcmp));
aceptacion.push(tabla([new TableRow({ cantSplit: true, children: [
  cell([etiqueta('Inicio acordado', { size: 13, color: C.gris, after: 160 }), para('', { after: 0, border: { bottom: linea(C.tinta, 6) } })], { w: 4219, margins: { top: 200, bottom: 90, left: 0, right: 600 } }),
  cell([etiqueta('Duración acordada', { size: 13, color: C.gris, after: 20 }), para(run('12 semanas', { bold: true }), { after: 0 })], { w: 5419, margins: { top: 200, bottom: 90, left: 400, right: 0 } }),
] })], [4219, 5419]));
aceptacion.push(para(run('Declaramos haber revisado el alcance, las exclusiones, los materiales, los importes con IVA, el calendario y los hitos de pago. Los puntos que afectaban al precio o al alcance están resueltos y reflejados en esta versión.'), { before: 220, after: 200, line: 276 }));
const firma = (por, nombre) => cell([etiqueta(por, { size: 14, after: 0 }), para('', { after: 0, before: 900, border: { bottom: linea(C.tinta, 6) } }),
  para(run(nombre, { bold: true }), { before: 100, after: 20 }), para([run('Fecha  ', { color: C.gris }), run('______________________', { color: C.gris })], { after: 0 })],
  { w: 4519, bottom: NONE, margins: { top: 0, bottom: 0, left: 0, right: 0 } });
aceptacion.push(tabla([new TableRow({ cantSplit: true, children: [firma('Por el cliente', 'Cristian Nohalez García'), cell(para('', { after: 0 }), { w: 600, bottom: NONE }),
  firma('Por Renovare Design & Build SL', 'Sebastián Vanegas · Administrador')] })], [4519, 600, 4519]));
aceptacion.push(para('', { after: 200 }));
aceptacion.push(destacado('Después de la firma', 'Tras la firma y el pago de reserva, confirmamos por escrito la fecha de inicio y coordinamos el calendario definitivo y las elecciones necesarias.'));

// ── Cabecera y pie ──────────────────────────────────────────────
const header = new Header({ children: [
  new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: W }], border: { bottom: linea(C.linea, 4) }, spacing: { after: 0 },
    children: [new ImageRun({ type: 'png', data: LOGO, transformation: { width: 92, height: Math.round(92 * LOGO_RATIO) } }),
      run('\tPresupuesto de reforma · Ref. SV-0045-03', { size: 15, color: C.gris })] }),
] });
const footer = new Footer({ children: [
  new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: W }], spacing: { before: 0, after: 0 }, children: [
    run('Renovare Design & Build SL · CIF B-88775341 · Calle Creu Roja 1, bajo · Benetússer · www.renovaredyb.com', { size: 14, color: C.gris }),
    new TextRun({ children: ['\t', PageNumber.CURRENT, ' / ', PageNumber.TOTAL_PAGES], font: F.texto, size: 15, bold: true, color: C.oroTexto }),
  ] }),
] });

// ── Documento ───────────────────────────────────────────────────
const doc = new Document({
  creator: 'Renovare Design & Build SL', title: 'Presupuesto de reforma · SV-0045-03', description: 'Presupuesto de reforma integral · Cristian Nohalez García',
  styles: {
    default: { document: { run: { font: F.texto, size: 20, color: C.tinta }, paragraph: { spacing: { line: 276, lineRule: 'auto' } } } },
    paragraphStyles: [
      { id: 'Titulo1', name: 'Título presupuesto', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: F.titulo, size: 62, color: C.tinta }, paragraph: { spacing: { before: 0, after: 40 }, outlineLevel: 0 } },
      { id: 'Seccion', name: 'Rótulo de sección', basedOn: 'Normal', next: 'Titulo2', quickFormat: true,
        run: { font: F.texto, size: 16, bold: true, color: C.oroTexto, allCaps: true, characterSpacing: 36 },
        paragraph: { spacing: { before: 0, after: 140 }, keepNext: true, border: { bottom: linea(C.oro, 6) } } },
      { id: 'Titulo2', name: 'Título de sección', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: F.titulo, size: 46, color: C.tinta }, paragraph: { spacing: { before: 120, after: 200 }, keepNext: true, outlineLevel: 0 } },
      { id: 'Titulo3', name: 'Subtítulo', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: F.texto, size: 21, bold: true, color: C.tinta }, paragraph: { keepNext: true, outlineLevel: 1 } },
    ],
  },
  sections: [{
    properties: { titlePage: true, page: { size: { width: 11906, height: 16838 },
      margin: { top: 1500, bottom: 1250, left: 1134, right: 1134, header: 560, footer: 560 } } },
    headers: { default: header, first: new Header({ children: [para('', { after: 0 })] }) },
    footers: { default: footer, first: footer },
    children: [...portada, ...alcance, ...inversion, ...plazos, ...condiciones, ...aceptacion],
  }],
});

const salida = path.join(__dirname, '..', 'PRESUPUESTO NOHALEZ - SV-0045-03.docx');
Packer.toBuffer(doc).then(b => { fs.writeFileSync(salida, b); console.log('Word generado:', salida); });
