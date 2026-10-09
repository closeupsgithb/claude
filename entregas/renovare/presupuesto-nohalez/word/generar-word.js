// Genera la versión Word del presupuesto, calcada del PDF (fuente/estilos.css).
// Uso:  NODE_PATH=$(npm root -g) node generar-word.js && python3 incrustar-fuentes.py
// Todas las medidas se convierten desde la hoja de estilos del PDF (mm → twips, pt → medios puntos).
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, Header, Footer,
  AlignmentType, WidthType, BorderStyle, ShadingType, VerticalAlign, PageNumber, TabStopType,
  TableLayoutType, HeightRule, LineRuleType,
} = require('docx');

// ── Unidades ─────────────────────────────────────────────────────
const mm = v => Math.round(v * 56.693);           // mm → twips
const pt = v => Math.round(v * 2);                // pt → medios puntos (tamaño de letra)
const ls = v => Math.round(v * 20);               // pt → twips (interlineado)
const bw = v => Math.max(2, Math.round(v * 8));   // grosor de borde en pt → octavos de punto

// ── Marca (mismos tokens que el PDF) ─────────────────────────────
const C = { tinta: '1C1A16', oro: 'BA9A58', oroTexto: '85692F', gris: '625B50', linea: 'E2DBCD',
            papel: 'FAF8F4', oroClaro: 'F3ECDD', barra: 'A3843F', blanco: 'FFFFFF', semana: 'EFEAE0' };
const F = { G: 'EB Garamond Medium', I: 'Inter', IM: 'Inter Medium', IS: 'Inter SemiBold', S: 'Arial' };
const W = 11906 - 2 * mm(20);                       // ancho útil
const LOGO = fs.readFileSync(path.join(__dirname, '..', 'fuente', 'assets', 'logo-renovare.png'));
const LOGO_R = 246 / 633;
const px = v => Math.round(v * 96 / 25.4);          // mm → píxeles (imágenes)

// ── Primitivas ───────────────────────────────────────────────────
const NIL = { style: BorderStyle.NIL, size: 0, color: 'auto' };
const SB = { top: NIL, bottom: NIL, left: NIL, right: NIL, insideHorizontal: NIL, insideVertical: NIL };
const B = (grosor, color) => ({ style: BorderStyle.SINGLE, size: bw(grosor), color });
const LINEA = B(.5, C.linea);

const nb = t => t.replace(/ (€|%|cm|m²|m\b)/g, '\u00A0$1').replace(/(\d)–(\d)/g, '$1\u2060–\u2060$2')
  .replace(/\b(\d{3}) (\d{2}) (\d{2}) (\d{2})\b/g, '$1\u00A0$2\u00A0$3\u00A0$4').replace(/\b(\d{3}) (\d{3}) (\d{3})\b/g, '$1\u00A0$2\u00A0$3');
const r = (text, o = {}) => new TextRun({ text: nb(text), kern: 2, font: o.f || F.I, size: pt(o.s || 9.6), color: o.c || C.tinta,
  bold: o.b, italics: o.i, allCaps: o.caps, characterSpacing: o.sp != null ? Math.round(o.sp * 20) : undefined,
  border: o.border, shading: o.sh ? { type: ShadingType.CLEAR, fill: o.sh, color: 'auto' } : undefined, underline: o.u });
// Párrafo: interlineado "al menos" (equivale a line-height del PDF sin recortar)
const P = (runs, o = {}) => new Paragraph({
  children: (Array.isArray(runs) ? runs : [runs]).map(x => typeof x === 'string' ? r(x, o) : x),
  alignment: o.al, keepNext: o.kn, keepLines: true, pageBreakBefore: o.pb, border: o.bd, tabStops: o.tabs,
  spacing: { before: o.bf || 0, after: o.af ?? 0, line: o.lh != null ? ls(o.lh) : undefined,
             lineRule: o.lh != null ? (o.exact ? LineRuleType.EXACT : LineRuleType.AT_LEAST) : undefined },
});
const vacio = (o = {}) => P(r('', { s: o.s || 2 }), { lh: o.lh || 1, exact: true, ...o });

const R = AlignmentType.RIGHT, CEN = AlignmentType.CENTER;
const celda = (hijos, o = {}) => new TableCell({
  children: Array.isArray(hijos) ? hijos : [hijos],
  width: { size: o.w, type: WidthType.DXA }, columnSpan: o.span, rowSpan: o.rspan,
  verticalAlign: o.va || VerticalAlign.TOP,
  shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
  borders: { top: o.bt || NIL, bottom: o.bb || NIL, left: o.bl || NIL, right: o.br || NIL },
  margins: { top: o.pt ?? 0, bottom: o.pb ?? 0, left: o.pl ?? 0, right: o.pr ?? 0 },
});
const tabla = (filas, anchos) => new Table({ rows: filas, columnWidths: anchos, layout: TableLayoutType.FIXED,
  width: { size: anchos.reduce((a, b) => a + b, 0), type: WidthType.DXA }, borders: SB, indent: { size: 0, type: WidthType.DXA },
  margins: { top: 0, bottom: 0, left: 0, right: 0 } });
const fila = (celdas, o = {}) => new TableRow({ children: celdas, cantSplit: true, tableHeader: o.th,
  height: o.h ? { value: o.h, rule: o.exact ? HeightRule.EXACT : HeightRule.ATLEAST } : undefined });

// ── Piezas tipográficas del PDF ──────────────────────────────────
// .num-seccion: 7.8pt seminegrita, mayúsculas, tracking .16em, filete dorado .6pt, 4 mm debajo
const numSeccion = t => P(r(t, { f: F.IS, s: 7.8, c: C.oroTexto, caps: true, sp: 1.25 }),
  { pb: true, kn: true, lh: 11, af: mm(4), bd: { bottom: { ...B(.6, C.oro), space: 6 } } });
// h2: EB Garamond 22pt, line-height 1.1, 5 mm debajo
const h2 = (t, o = {}) => P(r(t, { f: F.G, s: o.s || 22 }), { kn: true, lh: (o.s || 22) * 1.15, af: o.af ?? mm(6), bf: o.bf ?? mm(1) });
// h3: Inter 10pt seminegrita, cuadro dorado + separación
const h3 = (t, o = {}) => P([r('■', { f: F.S, s: 11, c: o.c || C.oro }), r(' ' + t, { f: F.IS, s: 10 })],
  { kn: true, lh: 14, bf: o.bf ?? mm(7), af: o.af ?? mm(2.2), pb: o.pb });
// Texto corrido: 9.6pt, line-height 1.5, 2,6 mm entre párrafos
const T = (t, o = {}) => P(Array.isArray(t) ? t.map(([s, b]) => r(s, { f: b ? F.IS : (o.f || F.I), s: o.s || 9.6, c: o.c })) : r(t, { s: o.s || 9.6, c: o.c, f: o.f }),
  { lh: (o.s || 9.6) * 1.5, af: o.af ?? mm(3.2), bf: o.bf, al: o.al, kn: o.kn });
// Rótulo pequeño (eyebrow / dt): mayúsculas con tracking
const rot = (t, o = {}) => P(r(t, { f: o.f || F.IS, s: o.s || 7.6, c: o.c || C.oroTexto, caps: true, sp: o.sp ?? 1 }),
  { lh: (o.s || 7.6) * 1.4, af: o.af ?? 0, bf: o.bf, kn: o.kn ?? true, al: o.al });

// Tablas de datos (.partidas, .pagos…): cabecera 7.3pt, celdas 8.9pt, rellenos 2,3/1,75 × 2,4 mm
const TD = { s: 8.9, lh: 12.6, pv: mm(1.75), ph: mm(2.4) };
const th = (t, w, o = {}) => celda(P(r(t, { f: F.IS, s: 7, c: C.blanco, caps: true, sp: .5 }), { al: o.al, lh: 10 }),
  { w, span: o.span, fill: C.tinta, va: VerticalAlign.BOTTOM, pt: mm(2.3), pb: mm(2.3), pl: o.ph ?? TD.ph, pr: o.ph ?? TD.ph });
const td = (cont, w, o = {}) => celda(Array.isArray(cont) && cont[0] instanceof Table ? cont : P(typeof cont === 'string' ? r(cont, { s: o.s || TD.s, f: o.f, c: o.c }) : cont, { al: o.al, lh: o.lh || TD.lh }),
  { w, span: o.span, fill: o.fill, va: o.va, bb: o.bb === undefined ? LINEA : o.bb, bt: o.bt, pt: o.pt ?? TD.pv, pb: o.pb ?? TD.pv, pl: o.pl ?? TD.ph, pr: o.pr ?? TD.ph });
const cierre = { bt: B(1.2, C.oro), bb: NIL, pt: mm(2.6) };

// ── Datos ────────────────────────────────────────────────────────
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

// ════════ PORTADA (sección 1: sin cabecera, margen superior 16 mm) ════════
const portada = [];
portada.push(tabla([fila([
  celda(P(new ImageRun({ type: 'png', data: LOGO, transformation: { width: px(52), height: Math.round(px(52) * LOGO_R) } })),
    { w: W / 2, va: VerticalAlign.BOTTOM, bb: B(.6, C.oro), pb: mm(5) }),
  celda([P(r('Renovare Design & Build SL', { f: F.IS, s: 7.6 }), { al: R, lh: 11.8 }),
    ...['CIF B-88775341', 'Calle Creu Roja 1, bajo · Benetússer', 'www.renovaredyb.com', '624 892 643 · renovaredyb@gmail.com']
      .map(t => P(r(t, { s: 7.6, c: C.gris }), { al: R, lh: 11.8 }))],
    { w: W / 2, va: VerticalAlign.BOTTOM, bb: B(.6, C.oro), pb: mm(5) }),
])], [W / 2, W / 2]));
portada.push(rot('Propuesta comercial', { s: 7.8, sp: 1.25, bf: mm(7), af: mm(2.5) }));
portada.push(P(r('Presupuesto de reforma', { f: F.G, s: 29 }), { lh: 33, af: mm(1) }));
portada.push(P(r('Reforma integral en Valencia', { f: F.G, s: 13.5, i: true, c: C.oroTexto }), { lh: 17, af: mm(5) }));
const fichaC = (l, v, w, o = {}) => celda([rot(l, { f: F.IM, s: 6.9, c: C.gris, sp: .7, kn: false }),
  P(r(v, { f: o.big ? F.IS : F.IM, s: o.big ? 12 : 9.6 }), { lh: o.big ? 16 : 14, bf: mm(.5) })],
  { w, span: o.span, pt: o.pt ?? 0, pb: o.pb ?? 0, pr: mm(3), bt: o.bt, bb: o.bb });
const wf = [mm(64), mm(31), mm(28), W - mm(64) - mm(31) - mm(28)];
portada.push(tabla([
  fila([fichaC('Preparado para', 'Cristian Nohalez García', W, { big: true, span: 4, bt: B(.6, C.linea), pt: mm(3), pb: mm(2) })]),
  fila([fichaC('Obra', 'Calle Barig 3, Benicalap · 46025', wf[0], { bb: B(.6, C.linea), pb: mm(3) }),
    fichaC('Referencia', 'SV-0045-03', wf[1], { bb: B(.6, C.linea), pb: mm(3) }), fichaC('Emisión', '07/10/2026', wf[2], { bb: B(.6, C.linea), pb: mm(3) }),
    fichaC('Válido hasta', '07/11/2026', wf[3], { bb: B(.6, C.linea), pb: mm(3) })]),
], wf));
portada.push(h2('Su proyecto en una página', { s: 16, bf: mm(6), af: mm(2.5) }));
portada.push(T('Reforma integral de su vivienda de 75 m²: suelos de microcemento, electricidad y fontanería nuevas, cocina y baño completos, puertas y ventanas, alisado y pintura, aire acondicionado y retirada de residuos. La oferta recoge los trabajos, materiales y acabados definidos tras la visita realizada in situ, según su planteamiento.', { s: 9.4, af: mm(5) }));
const desg = (l, v, total) => fila([
  td(r(l, { f: total ? F.IS : F.I, s: 9.6, c: total ? C.tinta : C.gris }), mm(40), { bb: total ? NIL : LINEA, bt: total ? B(.8, C.oro) : undefined, pl: 0, pr: 0, pt: mm(1.2), pb: mm(1.2), lh: 14 }),
  td(r(v, { f: total ? F.IS : F.I, s: 9.6 }), mm(32), { al: R, bb: total ? NIL : LINEA, bt: total ? B(.8, C.oro) : undefined, pl: 0, pr: 0, pt: mm(1.2), pb: mm(1.2), lh: 14 }),
]);
portada.push(tabla([fila([
  celda([rot('Inversión del proyecto base', { s: 7.6, sp: 1.06 }),
    P([r('46.359 €', { f: F.G, s: 31 }), r('  + IVA', { f: F.IM, s: 12, c: C.gris })], { lh: 36, bf: mm(2) })],
    { w: W / 2, fill: C.papel, va: VerticalAlign.CENTER, bl: B(4, C.oro), bt: B(.6, C.linea), bb: B(.6, C.linea), pt: mm(4.5), pb: mm(4.5), pl: mm(6), pr: mm(2) }),
  celda(tabla([desg('Base imponible', '46.359,00 €'), desg('IVA 10 %', '4.635,90 €'), desg('Total IVA incluido', '50.994,90 €', true)], [mm(40), mm(32)]),
    { w: W / 2, fill: C.papel, va: VerticalAlign.CENTER, br: B(.6, C.linea), bt: B(.6, C.linea), bb: B(.6, C.linea), pt: mm(4), pb: mm(4), pl: mm(5), pr: mm(6) }),
])], [W / 2, W / 2]));
// Alcance principal / Planificación: una sola tabla de 5 columnas para que las filas queden alineadas
const wk = [mm(37), mm(44), mm(8), mm(29), 0]; wk[4] = W - wk.slice(0, 4).reduce((x, y) => x + y, 0);
const IZQ = [['Espacios', 'Salón, baño, cocina y habitaciones'], ['Superficie intervenida', '75 m²'], ['Tipo de inmueble', 'Apartamento'], ['', '']];
const DER = [['Duración base', '10–12 semanas'], ['Inicio previsto', '2 de noviembre de 2026'], ['Responsable', 'Sebastián Vanegas · Jefe de obra'], ['Contacto', '624 892 643']];
const kv = (t, w, o = {}) => td(r(t, { f: o.v ? F.IM : F.I, s: 9.6, c: o.v ? C.tinta : C.gris }), w, { pl: 0, pr: mm(2), pt: mm(1.5), pb: mm(1.5), lh: 14, bb: o.bb, va: VerticalAlign.CENTER });
portada.push(vacio({ bf: mm(6) }));
portada.push(tabla([
  fila([celda(h3('Alcance principal', { bf: 0, af: mm(1.5) }), { w: wk[0] + wk[1], span: 2 }), celda(vacio(), { w: wk[2] }),
    celda(h3('Planificación', { bf: 0, af: mm(1.5) }), { w: wk[3] + wk[4], span: 2 })]),
  ...IZQ.map(([l1, v1], i) => { const [l2, v2] = DER[i]; const bi = l1 ? LINEA : NIL;
    return fila([kv(l1, wk[0], { bb: bi }), kv(v1, wk[1], { v: true, bb: bi }), celda(vacio(), { w: wk[2] }), kv(l2, wk[3]), kv(v2, wk[4], { v: true })]); }),
], wk));
const caja = (titulo, cuerpo, bf) => [vacio({ bf }), tabla([fila([celda([rot(titulo, { s: 7.4, sp: 1.04, af: mm(1) }), T(cuerpo, { af: 0 })],
  { w: W, fill: C.oroClaro, pt: mm(3.6), pb: mm(3.6), pl: mm(5), pr: mm(5) })])], [W])];
portada.push(...caja('Siguiente paso', 'Para avanzar, revisamos juntos el alcance, resolvemos las dudas y confirmamos las opciones elegidas antes de formalizar la aceptación. Sebastián Vanegas le llamará para acordar esa revisión; también puede contactarle directamente en el 624 892 643 o en renovaredyb@gmail.com. Oferta válida hasta el 07/11/2026.', mm(5)));

// ════════ 01 · ALCANCE ════════
const s1 = [numSeccion('01 · Proyecto y resumen ejecutivo'), h2('Alcance y coordinación', { af: mm(4.5) })];
const h3a = (t, o = {}) => h3(t, { bf: mm(5), ...o });
const Ta = (t, o = {}) => T(t, { af: mm(2.4), ...o });
s1.push(h3a('Qué vamos a transformar', { bf: 0 }));
s1.push(Ta('Realizaremos una reforma integral de la vivienda para renovar sus espacios, instalaciones y acabados. Actualizaremos la cocina y el baño, incluyendo mobiliario y equipamiento. Renovaremos la electricidad y la fontanería, nivelaremos los suelos y aplicaremos microcemento. Completaremos la transformación con alisado y pintura, sustitución de las puertas y ventanas indicadas e instalación de aire acondicionado, para lograr una vivienda más funcional y confortable.'));
const wInc = Math.round((W - mm(6)) / 2);
const cajaInc = (t, cuerpo, color) => celda([h3(t, { bf: 0, c: color }), Ta(cuerpo, { af: mm(.8) })],
  { w: wInc, fill: C.papel, bt: B(.8, color), pt: mm(3), pb: mm(1), pl: mm(4), pr: mm(4) });
s1.push(vacio({ bf: mm(.5) }));
s1.push(tabla([fila([
  cajaInc('Incluido en el proyecto base', [['Los trabajos, materiales y suministros detallados en la tabla del apartado '], ['02 · Inversión', true], [', según las condiciones indicadas en cada partida. Las partidas opcionales se incorporarán únicamente si el cliente las acepta expresamente.']], C.oro),
  celda(vacio(), { w: W - 2 * wInc }),
  cajaInc('No incluido', 'Los trabajos y suministros que no estén expresamente descritos en este presupuesto. Tampoco se incluyen electrodomésticos, luminarias, licencias, tasas, proyecto técnico ni dirección facultativa, cuando estos sean necesarios.', C.gris),
])], [wInc, W - 2 * wInc, wInc]));
s1.push(h3a('Decisiones de materiales'));
s1.push(Ta('Los suelos, alicatados, muebles y puertas de cocina, así como las encimeras, se elegirán entre la variedad de modelos ofrecidos por la empresa dentro del presupuesto. Sebastián comunicará las fechas de elección según el avance de la obra. Si el cliente prefiere una opción cuyo precio supere el importe previsto, se comunicará la diferencia para su aprobación antes de realizar el pedido.'));
s1.push(h3a('Cómo coordinamos su obra'));
s1.push(Ta('El responsable, Sebastián Vanegas, centraliza las consultas y coordina los oficios. Compartimos un seguimiento con los avances y las decisiones pendientes. Los cambios se registran por escrito con su coste y efecto en el plazo. Al finalizar, revisamos la obra juntos y documentamos los remates y la entrega.'));
s1.push(Ta('Seguimiento visual: fotografías periódicas del avance con un resumen de trabajos realizados y próximos pasos. Si la obra lo permite y se autoriza expresamente, puede añadirse una cámara fija con acceso restringido, sin audio y sin captar espacios ajenos a la actuación.'));
const PASOS = [['Revisión', 'Visita, medición y definición de necesidades'], ['Planificación', 'Fases, coordinación y previsión de medios'], ['Preparación', 'Protecciones y organización de la zona de trabajo'], ['Ejecución', 'Desarrollo de los trabajos y seguimiento acordado'], ['Entrega', 'Revisión final, limpieza y cierre del proyecto']];
const gap = mm(2.5), wPaso = Math.floor((W - 4 * gap) / 5), wUlt = W - 4 * gap - 4 * wPaso;
s1.push(vacio({ bf: mm(3) }));
s1.push(tabla([fila(PASOS.flatMap(([t, d], i) => {
  const c = celda([P(r(`0${i + 1}`, { f: F.IS, s: 7, c: C.oroTexto, sp: .56 }), { lh: 10 }), P(r(t, { f: F.IS, s: 8.6 }), { lh: 12, bf: mm(.5), af: mm(.6) }), P(r(d, { s: 7.9, c: C.gris }), { lh: 10.7 })],
    { w: i < 4 ? wPaso : wUlt, bt: B(.8, C.oro), pt: mm(1.5) });
  return i < 4 ? [c, celda(vacio(), { w: gap })] : [c];
}))], [wPaso, gap, wPaso, gap, wPaso, gap, wPaso, gap, wUlt]));
s1.push(h3a('Datos para la ejecución'));
const dato = (l, v, w, span) => celda([rot(l, { f: F.IM, s: 6.9, c: C.gris, sp: .7, kn: false }), P(r(v, { f: F.IM, s: 9.6 }), { lh: 14, bf: mm(.4) })],
  { w, span, bb: LINEA, pt: mm(1.2), pb: mm(1.2), pr: mm(2) });
const wd = [mm(66), mm(40), 0]; wd[2] = W - wd[0] - wd[1];
s1.push(tabla([
  fila([dato('Cliente', 'Cristian Nohalez García · 607 23 86 30', wd[0]), dato('Empresa', 'Renovare Design & Build SL · CIF B-88775341', wd[1] + wd[2], 2)]),
  fila([dato('Domicilio', 'Calle Creu Roja 1, bajo · Benetússer', wd[0]), dato('Contacto comercial', 'Sebastián Vanegas', wd[1]),
    dato('Acceso, horarios y ocupación del inmueble', 'Lunes a viernes, de 8:00 a 17:00', wd[2])]),
], wd));

// ════════ 02 · INVERSIÓN ════════
const s2 = [numSeccion('02 · Inversión'), h2('Resumen económico')];
s2.push(T('Dónde se invierte cada euro del proyecto base, agrupado por capítulos. El detalle de cada partida figura a continuación.'));
const wc = [0, mm(28), mm(28), mm(30)]; wc[0] = W - wc.slice(1).reduce((a, b) => a + b, 0);
s2.push(tabla([
  fila([th('Capítulo', wc[0]), th('Partidas', wc[1]), th('% del total', wc[2], { al: R }), th('Sin IVA', wc[3], { al: R })], { th: true }),
  ...CAPITULOS.map(([n, p, pc, s]) => fila([
    td(r(n, { f: F.IM, s: 8.9 }), wc[0], { va: VerticalAlign.CENTER }),
    td(r(p, { s: 8.6, c: C.gris }), wc[1], { va: VerticalAlign.CENTER }),
    td(r(`${pc.toFixed(1).replace('.', ',')} %`, { s: 8.9, c: C.gris }), wc[2], { al: R, va: VerticalAlign.CENTER }),
    td(r(s, { f: F.IS, s: 8.9 }), wc[3], { al: R, va: VerticalAlign.CENTER }),
  ])),
  fila([td(r('Total proyecto base', { s: 8.9, b: true }), wc[0], cierre), td('', wc[1], cierre),
    td(r('100 %', { s: 8.9, b: true }), wc[2], { ...cierre, al: R }), td(r('46.359 €', { s: 8.9, b: true }), wc[3], { ...cierre, al: R })]),
], wc));
// Gráfico de barras nativo de Word: se inserta en este marcador (insertar-grafico.py).
// Sus datos se editan con clic derecho › Editar datos; los % se recalculan solos a partir de los importes.
s2.push(rot('Peso de cada capítulo sobre el total', { f: F.IS, s: 7.4, sp: .9, bf: mm(7), af: mm(1.5) }));
s2.push(P(r('§GRAFICO_CAPITULOS§', { s: 8 }), { lh: 12 }));
const wr = [mm(95) - mm(32), mm(32)];
const resumen = tabla([
  fila([th('Concepto', wr[0]), th('Importe', wr[1], { al: R })], { th: true }),
  fila([td('Subtotal proyecto base', wr[0]), td('46.359,00 €', wr[1], { al: R })]),
  fila([td('IVA 10 %', wr[0]), td('4.635,90 €', wr[1], { al: R })]),
  fila([td(r('Total proyecto con IVA', { s: 10, b: true }), wr[0], { fill: C.oroClaro, bb: B(1.2, C.oro), pt: mm(2.8), pb: mm(2.8) }),
    td(r('50.994,90 €', { s: 10, b: true }), wr[1], { fill: C.oroClaro, bb: B(1.2, C.oro), al: R, pt: mm(2.8), pb: mm(2.8) })]),
], wr);
const nota = (t, o = {}) => P(r(t, { s: 8.8, c: C.gris }), { lh: 13.2, af: o.af ?? mm(2.6), bf: o.bf });
s2.push(vacio({ bf: mm(7) }));
s2.push(tabla([fila([celda(resumen, { w: mm(95) }), celda(vacio(), { w: mm(8) }),
  celda([nota('El total es cerrado para las mediciones, trabajos y calidades definidos en esta oferta. Cualquier modificación se tramita conforme al procedimiento de cambios de la página de condiciones.', { bf: mm(1) }),
    nota('Opción no incluida: puerta principal, 1.186 € sin IVA (partida 27).', { af: 0 })], { w: W - mm(103) })])], [mm(95), mm(8), W - mm(103)]));
s2.push(h3('Detalle de partidas', { pb: true, bf: 0 }));
s2.push(T('Las partidas siguientes corresponden exclusivamente al proyecto base.'));
const wp = [mm(10), 0, mm(17), mm(21), mm(33)]; wp[1] = W - wp[0] - wp[2] - wp[3] - wp[4];
const desc = d => Array.isArray(d) ? d.map(([s, b]) => r(s, { s: 8.9, f: b ? F.IS : F.I })) : r(d, { s: 8.9 });
s2.push(tabla([
  fila([th('Nº', wp[0], { al: CEN }), th('Descripción', wp[1]), th('Unidad', wp[2], { al: CEN }), th('Cantidad', wp[3], { al: CEN }), th('Importe sin IVA', wp[4], { al: R })], { th: true }),
  ...PARTIDAS.map(([n, d, u, q, i], k) => { const fill = k % 2 ? C.papel : undefined; return fila([
    td(r(String(n), { f: F.IS, s: 8.9, c: C.oroTexto }), wp[0], { al: CEN, fill }), td(desc(d), wp[1], { fill }),
    td(u, wp[2], { al: CEN, fill }), td(String(q), wp[3], { al: CEN, fill }), td(r(i, { f: F.IM, s: 8.9 }), wp[4], { al: R, fill })]); }),
  fila([td('', wp[0], cierre), td(r('Total proyecto base sin IVA', { f: F.IS, s: 9.6 }), wp[1] + wp[2] + wp[3], { ...cierre, span: 3, al: R }),
    td(r('46.359,00 €', { f: F.IS, s: 9.6 }), wp[4], { ...cierre, al: R })]),
  fila([td('', wp[0], { bb: B(.6, C.oro), pt: mm(5), pb: mm(1) }),
    td(r('Opción no incluida en el total · requiere aceptación expresa', { f: F.IS, s: 7.2, c: C.oroTexto, caps: true, sp: .72 }), wp[1] + wp[2] + wp[3] + wp[4], { span: 4, bb: B(.6, C.oro), pt: mm(5), pb: mm(1) })]),
  fila([td(r('27', { f: F.IS, s: 8.9, c: C.oroTexto }), wp[0], { al: CEN }),
    td([r(' OPCIONAL ', { f: F.IS, s: 6.6, c: C.oroTexto, sp: .66, border: B(.6, C.oro) }), r(' Puerta principal: suministro e instalación', { s: 8.9, c: C.gris })], wp[1]),
    td(r('ud.', { s: 8.9, c: C.gris }), wp[2], { al: CEN }), td(r('1', { s: 8.9, c: C.gris }), wp[3], { al: CEN }), td(r('1.186 €', { s: 8.9, c: C.gris }), wp[4], { al: R })]),
], wp));

// ════════ 03 · PLAZOS ════════
const s3 = [numSeccion('03 · Plazos'), h2('Planificación y forma de pago')];
s3.push(T('Inicio previsto el 2 de noviembre de 2026. Duración del proyecto base: 10–12 semanas. El cronograma detallado y la fecha de terminación se confirman antes del inicio, con materiales, accesos y decisiones de cliente coordinados.'));
// Cronograma: 3 filas por fase; la central lleva la barra. Para mover una fase, sombrear o quitar el sombreado de sus celdas.
const wg = [mm(72), mm(22)]; const wsem = Math.floor((W - wg[0] - wg[1]) / 12);
const wgs = [...wg, ...Array(11).fill(wsem), W - wg[0] - wg[1] - 11 * wsem];
const gridL = B(.5, C.semana);
const filasFase = ([f, res, a, b]) => {
  const sem = (i, fill, last) => celda(vacio(), { w: wgs[i + 2], fill, bl: fill && i + 1 > a ? NIL : gridL, bb: last ? LINEA : NIL });
  const fx = k => Array.from({ length: 12 }, (_, i) => sem(i, k === 1 && i + 1 >= a && i + 1 <= b ? C.barra : undefined, k === 2));
  return [
    fila([celda([P(r(f, { f: F.IS, s: 8.6 }), { lh: 12 }), P(r(res, { s: 8, c: C.gris }), { lh: 11.5 })], { w: wgs[0], rspan: 3, va: VerticalAlign.CENTER, bb: LINEA, pl: mm(2), pr: mm(2), pt: mm(2), pb: mm(2) }),
      celda(P(r(`Sem. ${a}–${b}`, { f: F.IS, s: 8.6, c: C.oroTexto }), { lh: 12 }), { w: wgs[1], rspan: 3, va: VerticalAlign.CENTER, bb: LINEA, pl: mm(2) }), ...fx(0)], { h: mm(3) }),
    fila(fx(1), { h: mm(3.4), exact: true }),
    fila(fx(2), { h: mm(3) }),
  ];
};
s3.push(tabla([
  fila([th('Fase y resultado previsto', wgs[0]), th('Semanas', wgs[1]), ...Array.from({ length: 12 }, (_, i) =>
    celda(P(r(String(i + 1), { f: F.IS, s: 7.2, c: C.blanco }), { al: CEN, lh: 10 }), { w: wgs[i + 2], fill: C.tinta, va: VerticalAlign.BOTTOM, pt: mm(2.2), pb: mm(2.2) }))], { th: true }),
  ...FASES.flatMap(filasFase),
], wgs));
s3.push(h3('Pagos vinculados a la obra', { bf: mm(8) }));
s3.push(T('Los porcentajes se calculan sobre el total contratado con IVA, incluidos únicamente los opcionales aceptados. La reserva se descuenta del precio y forma parte del 40 % previo al inicio.'));
const wpg = [mm(34), 0, mm(13), mm(22), mm(20), mm(23)]; wpg[1] = W - wpg.reduce((a, b) => a + b, 0);
const tdp = (c, w, o = {}) => td(c, w, { pl: mm(2), pr: mm(2), s: 8.6, lh: 12.2, ...o });
s3.push(tabla([
  fila([th('Pago', wpg[0]), th('Hito verificable', wpg[1]), th('%', wpg[2], { al: CEN }), th('Base', wpg[3], { al: R }), th('IVA 10 %', wpg[4], { al: R }), th('Total', wpg[5], { al: R })], { th: true }),
  ...PAGOS.map(([n, t, h]) => fila([
    tdp([r(n, { f: F.IS, s: 8.6, c: C.oroTexto }), r(`\u2002${t}`, { f: F.IS, s: 8.6 })], wpg[0]),
    tdp(r(h, { s: 8.6 }), wpg[1]), tdp(r('20 %', { s: 8.6 }), wpg[2], { al: CEN }),
    tdp(r('9.271,80 €', { s: 8.6 }), wpg[3], { al: R }), tdp(r('927,18 €', { s: 8.6 }), wpg[4], { al: R }), tdp(r('10.198,98 €', { f: F.IS, s: 8.6 }), wpg[5], { al: R })])),
  fila([tdp('', wpg[0], cierre), tdp(r('Total proyecto base', { f: F.IS, s: 8.6 }), wpg[1], cierre), tdp(r('100 %', { f: F.IS, s: 8.6 }), wpg[2], { ...cierre, al: CEN }),
    tdp(r('46.359,00 €', { f: F.IS, s: 8.6 }), wpg[3], { ...cierre, al: R }), tdp(r('4.635,90 €', { f: F.IS, s: 8.6 }), wpg[4], { ...cierre, al: R }),
    tdp(r('50.994,90 €', { s: 8.6, b: true }), wpg[5], { ...cierre, al: R })]),
], wpg));
s3.push(T('Cada solicitud de pago se acompaña de la factura correspondiente y, en los avances, del registro de trabajos realizados. Medio de pago: transferencia bancaria a la cuenta de Renovare Design & Build SL que figura en cada factura.', { bf: mm(6) }));
s3.push(nota('Si se acepta la puerta principal, cada pago pasa a 9.509,00 € + 950,90 € de IVA = 10.459,90 €.'));

// ════════ 04 · CONDICIONES ════════
const s4 = [numSeccion('04 · Condiciones'), h2('Condiciones de la propuesta')];
CONDICIONES.forEach(([t, ps], i) => { s4.push(h3(t, { bf: i ? mm(4.2) : 0 })); ps.forEach(p => s4.push(T(p, { s: 9, af: mm(2.2) }))); });

// ════════ 05 · ACEPTACIÓN ════════
const s5 = [numSeccion('05 · Aceptación'), h2('Aceptación de la propuesta')];
s5.push(tabla([['Cliente', 'Cristian Nohalez García · DNI o NIF 03151845V'], ['Obra', 'Calle Barig 3, Benicalap · 46025'], ['Oferta', 'SV-0045-03 · Fecha 07/10/2026']]
  .map(([l, v], i) => fila([td(r(l, { s: 9.6, c: C.gris }), mm(52), { pl: 0, pt: mm(1.4), pb: mm(1.4), lh: 14, bt: i ? undefined : LINEA }),
    td(r(v, { f: F.IM, s: 9.6 }), W - mm(52), { pl: 0, pt: mm(1.4), pb: mm(1.4), lh: 14, bt: i ? undefined : LINEA })])), [mm(52), W - mm(52)]));
s5.push(T('Se acepta el proyecto base y únicamente las opciones marcadas a continuación. Las alternativas no marcadas quedan fuera del encargo.', { bf: mm(4), af: mm(3) }));
const wsel = [mm(34), 0, mm(38)]; wsel[1] = W - wsel[0] - wsel[2];
const casilla = () => r('□', { f: F.S, s: 11 });
s5.push(tabla([
  fila([th('Selección', wsel[0]), th('Alcance', wsel[1]), th('Total antes de IVA', wsel[2], { al: R })], { th: true }),
  fila([td(r('Base incluida', { f: F.IS, s: 8.9, c: C.oroTexto }), wsel[0]), td('Proyecto base', wsel[1]), td('46.359,00 €', wsel[2], { al: R })]),
  fila([td([casilla(), r(' Sí      ', { s: 8.9 }), casilla(), r(' No', { s: 8.9 })], wsel[0]), td('Opción · Partida 27. Puerta principal: suministro e instalación', wsel[1]), td('1.186,00 €', wsel[2], { al: R })]),
], wsel));
const wcmp = [0, mm(42), mm(42)]; wcmp[0] = W - wcmp[1] - wcmp[2];
s5.push(vacio({ bf: mm(5) }));
s5.push(tabla([
  fila([th('Importe contratado', wcmp[0]), th('Proyecto base', wcmp[1], { al: R }), th('Con puerta principal', wcmp[2], { al: R })], { th: true }),
  ...[['Base imponible', '46.359,00 €', '47.545,00 €'], ['IVA 10 %', '4.635,90 €', '4.754,50 €'], ['Total con IVA', '50.994,90 €', '52.299,50 €', true], ['Reserva del 20 % (IVA incluido)', '10.198,98 €', '10.459,90 €']]
    .map(([l, a, b, t]) => fila([l, a, b].map((v, i) => td(r(v, { s: 9, b: t }), wcmp[i], { al: i ? R : undefined, fill: t ? C.oroClaro : undefined, bb: t ? B(1.2, C.oro) : LINEA, pt: mm(1.9), pb: mm(1.9) })))),
], wcmp));
s5.push(vacio({ bf: mm(5) }));
s5.push(tabla([fila([
  celda([rot('Inicio acordado', { f: F.IM, s: 6.9, c: C.gris, sp: .7, kn: false }), P(r('', { s: 9.6 }), { lh: 14, bf: mm(1.5), bd: { bottom: B(.8, C.tinta) } })], { w: W / 2, bt: LINEA, bb: LINEA, pt: mm(2.2), pb: mm(2.2), pr: mm(8) }),
  celda([rot('Duración acordada', { f: F.IM, s: 6.9, c: C.gris, sp: .7, kn: false }), P(r('12 semanas', { f: F.IS, s: 9.6 }), { lh: 14, bf: mm(.6) })], { w: W / 2, bt: LINEA, bb: LINEA, pt: mm(2.2), pb: mm(2.2) }),
])], [W / 2, W / 2]));
s5.push(T('Declaramos haber revisado el alcance, las exclusiones, los materiales, los importes con IVA, el calendario y los hitos de pago. Los puntos que afectaban al precio o al alcance están resueltos y reflejados en esta versión.', { bf: mm(5) }));
const wfir = Math.round((W - mm(14)) / 2);
const firma = (por, nombre) => celda([rot(por, { s: 7.6, sp: .9, kn: false }), P(r('', { s: 9.6 }), { lh: 14, bf: mm(11), bd: { bottom: B(.8, C.tinta) } }),
  P(r(nombre, { f: F.IS, s: 9.6 }), { lh: 14, bf: mm(2) }),
  P(r('Fecha   ______ / ______ / ____________', { s: 9.6, c: C.gris }), { lh: 14, bf: mm(1.5) })], { w: wfir });
s5.push(vacio({ bf: mm(6) }));
s5.push(tabla([fila([firma('Por el cliente', 'Cristian Nohalez García'), celda(vacio(), { w: W - 2 * wfir }), firma('Por Renovare Design & Build SL', 'Sebastián Vanegas · Administrador')])], [wfir, W - 2 * wfir, wfir]));
s5.push(...caja('Después de la firma', 'Tras la firma y el pago de reserva, confirmamos por escrito la fecha de inicio y coordinamos el calendario definitivo y las elecciones necesarias.', mm(5)));

// ════════ Cabecera y pie ════════
const pie = () => new Footer({ children: [P([
  r('Renovare Design & Build SL · CIF B-88775341 · Calle Creu Roja 1, bajo · Benetússer · www.renovaredyb.com', { s: 7, c: C.gris }),
  new TextRun({ children: ['\t', PageNumber.CURRENT, ' / ', PageNumber.TOTAL_PAGES], font: F.IS, size: pt(7.5), color: C.oroTexto }),
], { tabs: [{ type: TabStopType.RIGHT, position: W }], lh: 10 })] });
const cab = new Header({ children: [tabla([fila([
  celda(P(new ImageRun({ type: 'png', data: LOGO, transformation: { width: Math.round(px(9.5) / LOGO_R), height: px(9.5) } })), { w: W / 2, va: VerticalAlign.BOTTOM, bb: LINEA, pb: mm(2.4) }),
  celda(P(r('Presupuesto de reforma · Ref. SV-0045-03', { f: F.IM, s: 7.5, c: C.gris }), { al: R, lh: 10 }), { w: W / 2, va: VerticalAlign.BOTTOM, bb: LINEA, pb: mm(2.4) }),
])], [W / 2, W / 2]), vacio()] });

const pagina = top => ({ size: { width: 11906, height: 16838 },
  margin: { top, bottom: mm(21), left: mm(20), right: mm(20), header: mm(9), footer: mm(12) } });
const doc = new Document({
  creator: 'Renovare Design & Build SL', title: 'Presupuesto de reforma · SV-0045-03',
  styles: { default: { document: { run: { font: F.I, size: pt(9.6), color: C.tinta }, paragraph: { spacing: { after: 0, line: 240, lineRule: LineRuleType.AUTO } } } } },
  sections: [
    { properties: { page: pagina(mm(16)) }, headers: { default: new Header({ children: [vacio()] }) }, footers: { default: pie() }, children: portada },
    { properties: { page: pagina(mm(27)) }, headers: { default: cab }, footers: { default: pie() }, children: [...s1, ...s2, ...s3, ...s4, ...s5] },
  ],
});
const salida = path.join(__dirname, '..', 'PRESUPUESTO NOHALEZ - SV-0045-03.docx');
Packer.toBuffer(doc).then(b => { fs.writeFileSync(salida, b); console.log('Word generado:', salida); });
