"""Exporta el presupuesto a PDF.  Uso:  python3 exportar.py [salida.pdf]
Requiere WeasyPrint (pip install weasyprint). Rutas relativas a esta carpeta."""
import sys, pathlib, weasyprint
aqui = pathlib.Path(__file__).resolve().parent
salida = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else aqui.parent / "PRESUPUESTO NOHALEZ - BORRADOR PARA REVISION.pdf"
weasyprint.HTML(aqui / "presupuesto-nohalez.html").write_pdf(salida)
print("PDF generado:", salida)
