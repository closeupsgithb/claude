# Presupuesto Nohalez · Renovare Design & Build — nota de revisión

**Estado: BORRADOR PARA REVISIÓN.** No enviar al cliente hasta resolver los puntos E1–E3 y C1–C5.

Archivos de esta carpeta:
- `PRESUPUESTO NOHALEZ - BORRADOR PARA REVISION.pdf`: PDF optimizado (A4, 7 páginas; el original tenía 8).
- `fuente/`: HTML y CSS editables, fuentes (Inter, EB Garamond), logotipo y `exportar.py` (WeasyPrint). Para regenerarlo: `python3 fuente/exportar.py`.
- `original/PRESUPUESTO NOHALEZ.pdf`: copia sin modificar.

Cuando todo esté resuelto, quita `class="borrador"` del `<body>`. Así desaparecen la banda roja y las notas de revisión. Después, exporta el PDF con un nombre definitivo.

---

## A. Incidencias económicas (bloquean el envío)

**E1. El subtotal no coincide con las partidas.**
| Cálculo | Importe |
|---|---|
| Suma de las partidas 1–26 | **46.359 €** |
| Suma de las partidas 1–27 (con la puerta) | 47.545 € |
| «Total estimado sin IVA» declarado | **46.119 €** |
| Diferencia entre 1–26 y el total declarado | −240 € |

El total declarado no coincide con ninguna de las dos sumas. Ninguna partida vale 240 €, así que no parece un simple olvido de una partida. Además, el IVA (4.611,90 €), el total con IVA (50.730,90 €), los pagos (9.223,80 €) y el saldo (36.895,20 €) se calculan sobre 46.119 €. **No he cambiado ninguna cifra.** Hay que confirmar si el error está en el importe de alguna partida o en el total. Después se recalculan en cadena la portada, el resumen, los pagos y la aceptación.

**E2. La puerta principal (partida 27, 1.186 €).** En el original estaba dentro de la tabla, encima del total, pero no se sumaba en ningún cálculo. La aceptación no la mencionaba. En el borrador aparece como **«Opcional»**, separada visualmente y sin sumar. Así queda coherente con el texto: «las partidas opcionales se incorporarán únicamente si el cliente las acepta expresamente». También aparece como casilla Sí/No en la aceptación. Confirmad si está **excluida** del total base, que es como se presenta ahora.

**E3. Los pagos: base o total con IVA.** El texto dice «los porcentajes se calculan sobre el total contratado con IVA», pero la tabla muestra «importe antes de IVA» (20 % × 46.119 = 9.223,80 €). Numéricamente son equivalentes (9.223,80 € + 10 % de IVA = 10.146,18 € = 20 % de 50.730,90 €), pero el lector no sabe cuánto paga en cada hito. Cuando se confirme el criterio, propongo que la tabla muestre tres columnas: **Base · IVA 10 % · Total del pago** (por ejemplo, 9.223,80 € · 922,38 € · 10.146,18 €). No lo he aplicado todavía.

## B. Datos y coherencia (contenido)

**C1. Campos sin completar.** No he encontrado estos datos en la documentación de Renovare (repositorio `renovare-web`, Drive RENOVARE, Guía Comercial +Reformas). Aparecen en rojo entre corchetes:
- Frecuencia y canal del seguimiento (p. ej., «semanal por WhatsApp»).
- Seguimiento visual (fotografías u otro sistema).
- Fechas de inicio y terminación, y duración en la página de plazos.
- Inicio acordado en la aceptación.
- **IBAN y titular.**

El **responsable** («[nombre]» en el original) lo he completado como *Sebastián Vanegas*, porque el propio documento lo identifica en la portada como responsable y jefe de obra. Revisadlo si no es correcto.

**C2. Referencia.** Aparecía de tres formas: «SV -0045—03» en la portada, «SV 2026-001 · 045-003» en los pies y «SV-0045-03» en la aceptación. He unificado todo como **SV-0045-03**. Confirmad cuál es la correcta.

**C3. Fechas y duración.** En la portada pone «10–12 semanas» y «inicio 2 de noviembre». En la aceptación pone «12 semanas». La página de plazos tiene los campos vacíos. El cronograma solo detalla las semanas 1, 5–6, 8–9 y 11–12, con huecos en las semanas 2–4, 7 y 10. Lo he conservado tal cual.

**C4. Otros datos.**
- Las fechas de firma vienen rellenadas con 07/10/2026, la misma fecha de emisión. ¿Deben quedar en blanco?
- Sebastián Vanegas figura como «Jefe de obra» en la portada, «Contacto comercial» en datos y «Administrador» en la firma. ¿Son correctos los tres cargos?
- En la póliza de responsabilidad civil, el identificador «8-11.477.641-F» no tiene formato de CIF. Lo he mantenido literal; conviene verificarlo con la póliza.
- El asterisco de «Total estimado sin IVA*» no tiene nota. Además, «estimado» convive con «el total es cerrado». No lo he modificado.
- «Condiciones · Materiales» menciona «anexos», pero el presupuesto no incluye ninguno.

**C5. Opción A y Opción B a 0 €.** No representan nada identificable en el documento ni en la documentación. Son restos de la plantilla. La única opción real es la partida 27, así que en el borrador **se sustituyen por la puerta principal (1.186 €)** y el total contratado queda como «46.119,00 € + opción marcada». Confirmad.

**C6. Textos internos de plantilla retirados del documento comercial.** No afectan a ninguna condición contractual. Se pueden recuperar si lo preferís:
- «Los importes de este resumen deben coincidir con los subtotales de las partidas detalladas.» (instrucción interna de comprobación).
- «Si se propone una cámara, definir previamente ubicación, acceso y condiciones de uso.» (instrucción interna).
- «[completar y verificar]» junto al IBAN. Lo he sustituido por el campo pendiente.

## C. Correcciones de forma, sin cambio de significado
- Ortografía:
  - «Sebastán» → «Sebastián».
  - «Calle Cru Roja» → «Creu Roja».
  - «inlcuyen» → «incluyen»; «NO… SI» → «No… Sí».
  - «Jhonson» → «Johnson» (marca; confirmadlo).
  - «Accesos permisos» → «Accesos, permisos».
  - «Reaseguros» y «semanas» con mayúscula/espaciado correctos.
  - «5m²» → «5 m²».
  - «Superficie intervenida75» → «Superficie intervenida 75».
- Formato numérico homogéneo: «50.730,9» → «50.730,90 €»; «9223.8» → «9.223,80 €»; «36.895,2» → «36.895,20 €»; teléfonos como «624 892 643»; «02 de Noviembre» → «2 de noviembre».
- Partida 9: «puerta nueva de baño, habitación visita» → «de baño y habitación de visita». Cantidad: 2.
- Cliente: «Nohalez» → «Cristian Nohalez García» en datos y aceptación, como en la portada.
- Pago 4: el rótulo «Segundo avance», que estaba partido, queda unificado.

## D. Mejoras visuales
- Logotipo **original** de Renovare (`renovare-web/public/logo-renovare.png`, PNG transparente de 633 px, dorado #BA9A58). Va a 52 mm en la portada (unos 310 ppp) y a 9,5 mm de alto en las cabeceras, con sus proporciones y su espacio libre. Sustituye a la marca de agua aclarada de 406 px del original.
- Sistema editorial:
  - Dorado de marca para filetes y acentos, y un dorado oscurecido para el texto pequeño (contraste 5,1:1, legible al imprimir).
  - Tinta casi negra y neutros cálidos.
  - EB Garamond en los títulos (eco de la serif del logotipo) e Inter en el texto y las cifras, con numerales tabulares.
- Portada con la ficha del cliente, el resumen y un bloque de **inversión destacado** (base, IVA y total), las claves de alcance y planificación, y el siguiente paso.
- Tabla de partidas:
  - Columnas Nº, Unidad, Cantidad e Importe con anchos fijos; las cabeceras ya no se parten.
  - Importes alineados a la derecha.
  - Cabecera repetida en la página 4 y filas completas, sin cortes.
  - Total al final, sin repetirse en cada página.
- Incluido y no incluido presentados en dos columnas. Pagos con hitos numerados.
- Cabecera y pie discretos y consistentes, con paginación «n / 7».
- Sin páginas residuales: el resumen económico cabe con las partidas y las condiciones ocupan una sola página. El orden de las secciones y el tamaño de letra (texto de 9,3–9,6 pt) se mantienen.

## Control de calidad realizado
- Comparación automática de las 27 partidas (unidad, cantidad e importe) con el original: **0 discrepancias**. Las diferencias en las cifras del texto se explican por formato, paginación, referencia unificada y notas de revisión.
- Las 7 páginas, renderizadas e inspeccionadas completas y ampliadas en tres rondas. Corregí estos defectos:
  - Bloque de inversión descompuesto.
  - Pie de total repetido al final de la página 3.
  - Página residual con el resumen económico.
  - Tildes desplazadas en la primera fuente serif, sustituida por EB Garamond.
  - Rótulo de sección con tamaño incorrecto.
  - Espacio que faltaba antes de «€».
