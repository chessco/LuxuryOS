from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas
from datetime import date
import os

OUT = r"C:\PitayaCode\LuxuryOS\output\pdf\cotizacion_impresoras_etiquetas_cared.pdf"
os.makedirs(os.path.dirname(OUT), exist_ok=True)

PAGE_W, PAGE_H = A4
NAVY = HexColor("#0A2647")
GRAY = HexColor("#68737E")
LIGHT = HexColor("#F3F6F8")
TEAL = HexColor("#2BB59A")
PINK = HexColor("#E64283")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="TitleBig", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=28, leading=32, textColor=NAVY, spaceAfter=8))
styles.add(ParagraphStyle(name="Subtitle", parent=styles["Normal"], fontName="Helvetica", fontSize=15, leading=20, textColor=GRAY, spaceAfter=16))
styles.add(ParagraphStyle(name="H1x", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=18, leading=22, textColor=NAVY, spaceBefore=4, spaceAfter=10))
styles.add(ParagraphStyle(name="H2x", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=12, leading=16, textColor=GRAY, spaceBefore=8, spaceAfter=5))
styles.add(ParagraphStyle(name="Bodyx", parent=styles["BodyText"], fontName="Helvetica", fontSize=10.5, leading=15, textColor=GRAY, spaceAfter=8))
styles.add(ParagraphStyle(name="Smallx", parent=styles["BodyText"], fontName="Helvetica", fontSize=8.5, leading=11, textColor=GRAY))
styles.add(ParagraphStyle(name="CenterSmall", parent=styles["BodyText"], fontName="Helvetica", fontSize=9, leading=12, alignment=TA_CENTER, textColor=GRAY))


def header_footer(c: canvas.Canvas, doc):
    c.saveState()
    c.setFillColor(LIGHT)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # Decorative curved lines inspired by the example document.
    c.setStrokeColor(HexColor("#9AAABD"))
    c.setLineWidth(0.7)
    for i in range(8):
        c.arc(PAGE_W - 125*mm - i*3*mm, PAGE_H - 20*mm - i*2*mm, PAGE_W + 25*mm + i*3*mm, PAGE_H + 48*mm + i*2*mm, 205, 330)
    c.setFillColor(GRAY)
    c.setFont("Helvetica", 8.5)
    c.drawString(25*mm, PAGE_H - 23*mm, "PITAYACODE - CARED")
    c.setStrokeColor(HexColor("#D6DEE5"))
    c.line(25*mm, 17*mm, PAGE_W - 25*mm, 17*mm)
    c.setFillColor(GRAY)
    c.setFont("Helvetica", 8)
    c.drawString(25*mm, 10*mm, "PITAYACODE - CARED")
    c.drawRightString(PAGE_W - 25*mm, 10*mm, f"PAGINA {doc.page}")
    c.restoreState()


def money(v):
    return f"${v:,.2f} MXN"


def make_pdf():
    doc = SimpleDocTemplate(OUT, pagesize=A4, rightMargin=25*mm, leftMargin=25*mm, topMargin=29*mm, bottomMargin=24*mm, title="Cotizacion Impresoras de Etiquetas CARED", author="PitayaCode Team")
    story = []

    # Cover
    story += [Spacer(1, 35*mm), Paragraph("Propuesta Económica -<br/>Impresoras de Etiquetas", styles["TitleBig"]), Paragraph("Proyecto de impresión de etiquetas CARED", styles["Subtitle"]), Spacer(1, 16*mm)]
    info = [[Paragraph("Dirigida a", styles["H2x"]), Paragraph("De parte de", styles["H2x"]), Paragraph("Fecha", styles["H2x"])], [Paragraph("Juan Carlos Navarro", styles["Bodyx"]), Paragraph("Francisco Garcia", styles["Bodyx"]), Paragraph("11/octubre/2026", styles["Bodyx"])]]
    t = Table(info, colWidths=[58*mm, 52*mm, 35*mm])
    t.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 0), ("RIGHTPADDING", (0,0), (-1,-1), 10)]))
    story.append(t)
    story.append(Spacer(1, 25*mm))
    story.append(Paragraph("Resumen de la propuesta", styles["H1x"]))
    story.append(Paragraph("Se presentan cuatro alternativas de impresoras térmicas compatibles con el proyecto de etiquetas CARED. La selección considera el código QR, textos informativos, una dimensión aproximada de 50 x 80 mm a 60 x 95 mm y la disponibilidad regional consultada.", styles["Bodyx"]))
    story.append(Spacer(1, 18*mm))
    story.append(PageBreak())

    # Scope and recommendation
    story += [Paragraph("Alcance de la solución", styles["H1x"]), Paragraph("La impresora será utilizada para producir etiquetas con identificación del cliente, número de orden, concepto, detalle del producto y código QR. La dimensión física exacta deberá confirmarse con la etiqueta final antes de comprar el rollo, pero las cuatro opciones soportan el formato requerido.", styles["Bodyx"])]
    spec_data = [[Paragraph("Requisito", styles["Smallx"]), Paragraph("Consideración", styles["Smallx"])], ["Contenido", "Texto, datos de orden y código QR"], ["Formato estimado", "50 x 80 mm a 60 x 95 mm"], ["Tecnología", "Térmica directa, sin tinta"], ["Prioridad logística", "Ciudad Obregón; después Hermosillo"], ["Entrega", "Obregón: inmediata. Otra sucursal: 1 a 2 días"]]
    st = Table(spec_data, colWidths=[44*mm, 116*mm], repeatRows=1)
    st.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,0), NAVY), ("TEXTCOLOR", (0,0), (-1,0), colors.white), ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"), ("FONTNAME", (0,1), (-1,-1), "Helvetica"), ("FONTSIZE", (0,0), (-1,-1), 9), ("TEXTCOLOR", (0,1), (-1,-1), GRAY), ("BACKGROUND", (0,1), (-1,-1), colors.white), ("GRID", (0,0), (-1,-1), 0.3, HexColor("#D6DEE5")), ("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7), ("TOPPADDING", (0,0), (-1,-1), 7), ("BOTTOMPADDING", (0,0), (-1,-1), 7)]))
    story += [Spacer(1, 4*mm), st, Spacer(1, 9*mm), Paragraph("Clasificación de opciones", styles["H1x"])]
    recs = [
        [Paragraph("1. Profesional Plus", styles["H2x"]), Paragraph("Zebra ZD421D", styles["H2x"]), Paragraph("USB, sin WiFi en esta configuración. Mejor balance para uso continuo, calidad, compatibilidad con QR y soporte profesional. Entrega inmediata en Ciudad Obregón.", styles["Bodyx"])],
        [Paragraph("2. Alternativa económica", styles["H2x"]), Paragraph("EVOTEC EV-3004", styles["H2x"]), Paragraph("Adecuada para iniciar con el menor presupuesto. Entrega inmediata en Ciudad Obregón.", styles["Bodyx"])],
        [Paragraph("3. Si se requiere WiFi", styles["H2x"]), Paragraph("Brother QL810W", styles["H2x"]), Paragraph("WiFi y USB. Conveniente si se necesita imprimir desde varios equipos sin cable. Su ancho de impresión es menor, por lo que conviene validar la etiqueta final.", styles["Bodyx"])]
    ]
    rt = Table(recs, colWidths=[39*mm, 42*mm, 79*mm])
    rt.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "TOP"), ("BACKGROUND", (0,0), (-1,-1), colors.white), ("BOX", (0,0), (-1,-1), 0.4, HexColor("#D6DEE5")), ("INNERGRID", (0,0), (-1,-1), 0.3, HexColor("#D6DEE5")), ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7), ("TOPPADDING", (0,0), (-1,-1), 6), ("BOTTOMPADDING", (0,0), (-1,-1), 2)]))
    story += [rt, PageBreak()]

    # Pricing page
    story += [Paragraph("Propuesta económica", styles["H1x"]), Paragraph("Precios de venta al público con IVA incluido. Los costos internos y el margen no se muestran en esta versión de la cotización.", styles["Bodyx"]), Spacer(1, 4*mm)]
    def cell(text):
        return Paragraph(str(text).replace("\n", "<br/>"), styles["Smallx"])

    rows = [[cell("Opción"), cell("Modelo"), cell("Características"), cell("Disponibilidad"), cell("Precio")],
            [cell("Económica"), cell("EVOTEC EV-3004"), cell("203 dpi, QR, USB, 152 mm/s"), cell("Ciudad Obregón\nEntrega inmediata"), cell(money(2346))],
            [cell("WiFi"), cell("Brother QL810W"), cell("WiFi, USB, QR, 300 dpi"), cell("Hermosillo\nSobre pedido 1 a 2 días"), cell(money(4099))],
            [cell("Profesional amplia"), cell("Brother QL1110NWB"), cell("WiFi, Bluetooth, Ethernet, USB, QR, hasta 10.4 cm"), cell("Otra sucursal\nSobre pedido 1 a 2 días"), cell(money(7299))],
            [cell("Profesional Plus"), cell("Zebra ZD421D"), cell("203 dpi, QR, USB, sin WiFi, hasta 10.4 cm"), cell("Ciudad Obregón\nEntrega inmediata"), cell(money(7999))],
            [cell("Consumible"), cell("PCM ACCPCM1790"), cell("Térmica directa, 4x2 pulgadas, caja con 12 rollos"), cell("Ciudad Obregón\nEntrega inmediata"), cell(money(999))]]
    pt = Table(rows, colWidths=[24*mm, 31*mm, 43*mm, 36*mm, 26*mm], repeatRows=1)
    pt.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,0), NAVY), ("TEXTCOLOR", (0,0), (-1,0), colors.white), ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"), ("FONTSIZE", (0,0), (-1,-1), 8.2), ("TEXTCOLOR", (0,1), (-1,-1), GRAY), ("BACKGROUND", (0,1), (-1,-1), colors.white), ("BACKGROUND", (0,4), (-1,4), HexColor("#E7F6F1")), ("BOX", (0,0), (-1,-1), 0.5, HexColor("#C9D3DC")), ("INNERGRID", (0,0), (-1,-1), 0.3, HexColor("#D6DEE5")), ("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("LEFTPADDING", (0,0), (-1,-1), 5), ("RIGHTPADDING", (0,0), (-1,-1), 5), ("TOPPADDING", (0,0), (-1,-1), 9), ("BOTTOMPADDING", (0,0), (-1,-1), 9), ("ALIGN", (-1,1), (-1,-1), "RIGHT")]))
    story += [pt, Spacer(1, 12*mm), Paragraph("Clasificación para el proyecto", styles["H1x"]), Paragraph("La Zebra ZD421D se presenta como opción Profesional Plus para trabajar de forma continua y tiene existencia inmediata en Ciudad Obregón. Si el presupuesto es la prioridad, la EVOTEC EV-3004 cumple con la función requerida y también está disponible en Obregón. Se incluye como consumible compatible la etiqueta PCM ACCPCM1790, con precio de lista competitivo.", styles["Bodyx"]), Paragraph("Condiciones", styles["H2x"]), Paragraph("Los precios están expresados en pesos mexicanos e incluyen IVA. La existencia puede cambiar sin previo aviso. La entrega inmediata aplica únicamente mientras se conserve inventario en Ciudad Obregón. Para mercancía ubicada en otra sucursal se considera un tiempo estimado de 1 a 2 días.", styles["Bodyx"]), Spacer(1, 8*mm), Paragraph("Francisco Garcia\nPITAYACODE - CARED", styles["CenterSmall"])]
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)


if __name__ == "__main__":
    make_pdf()
    print(OUT)
