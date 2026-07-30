import os
import sys
import re
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY

def build_pdf(md_file_path, pdf_file_path):
    with open(md_file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    doc = SimpleDocTemplate(
        pdf_file_path,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Title'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#1e3a8a'),
        alignment=TA_LEFT,
        spaceAfter=12
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=colors.HexColor('#1e40af'),
        spaceBefore=10,
        spaceAfter=6,
        keepWithNext=True
    )

    h3_style = ParagraphStyle(
        'Heading3_Custom',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=colors.HexColor('#334155'),
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#1e293b'),
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=3
    )

    code_style = ParagraphStyle(
        'Code_Custom',
        fontName='Courier',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=0
    )

    story = []

    lines = content.splitlines()
    in_code_block = False
    code_lines = []
    in_table = False
    table_lines = []

    def flush_code_block():
        nonlocal code_lines
        if code_lines:
            code_text = "<br/>".join([line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace(' ', '&nbsp;') for line in code_lines])
            p = Paragraph(code_text, code_style)
            t = Table([[p]], colWidths=[540])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
                ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
                ('TOPPADDING', (0,0), (-1,-1), 6),
                ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                ('LEFTPADDING', (0,0), (-1,-1), 8),
                ('RIGHTPADDING', (0,0), (-1,-1), 8),
            ]))
            story.append(t)
            story.append(Spacer(1, 6))
            code_lines = []

    def flush_table():
        nonlocal table_lines
        if not table_lines:
            return
        
        # Parse table lines
        parsed_rows = []
        for tline in table_lines:
            if re.match(r'^\s*\|?\s*:?-+:?\s*\|', tline):
                continue # Header separator line
            cells = [c.strip() for c in tline.strip().strip('|').split('|')]
            if cells:
                parsed_rows.append(cells)

        if parsed_rows:
            num_cols = max(len(row) for row in parsed_rows)
            formatted_data = []
            for row in parsed_rows:
                row_paras = []
                for cell in row:
                    # Escape HTML characters in cells except bold/code
                    clean_cell = cell.replace('`', '')
                    clean_cell = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', clean_cell)
                    p = Paragraph(clean_cell, ParagraphStyle('TableCell', parent=body_style, fontSize=8, leading=10))
                    row_paras.append(p)
                while len(row_paras) < num_cols:
                    row_paras.append(Paragraph('', body_style))
                formatted_data.append(row_paras)

            col_w = 540 / num_cols
            t = Table(formatted_data, colWidths=[col_w] * num_cols)
            t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#e2e8f0')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#0f172a')),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
                ('TOPPADDING', (0,0), (-1,-1), 4),
                ('BOTTOMPADDING', (0,0), (-1,-1), 4),
                ('LEFTPADDING', (0,0), (-1,-1), 6),
                ('RIGHTPADDING', (0,0), (-1,-1), 6),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ]))
            story.append(t)
            story.append(Spacer(1, 8))
        table_lines = []

    for line in lines:
        if line.startswith('```'):
            if in_code_block:
                in_code_block = False
                flush_code_block()
            else:
                if in_table:
                    in_table = False
                    flush_table()
                in_code_block = True
            continue

        if in_code_block:
            code_lines.append(line)
            continue

        if line.strip().startswith('|') and '|' in line.strip()[1:]:
            if not in_table:
                in_table = True
            table_lines.append(line)
            continue

        if in_table:
            in_table = False
            flush_table()

        if not line.strip():
            story.append(Spacer(1, 4))
            continue

        if line.startswith('# '):
            text = line[2:].strip()
            story.append(Paragraph(text, title_style))
            story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#1e3a8a'), spaceAfter=8))
        elif line.startswith('## '):
            text = line[3:].strip()
            story.append(Paragraph(text, h1_style))
        elif line.startswith('### '):
            text = line[4:].strip()
            story.append(Paragraph(text, h2_style))
        elif line.startswith('#### '):
            text = line[5:].strip()
            story.append(Paragraph(text, h3_style))
        elif line.startswith('---'):
            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#cbd5e1'), spaceBefore=6, spaceAfter=6))
        elif line.strip().startswith('* ') or line.strip().startswith('- '):
            bullet_text = line.strip()[2:].strip()
            bullet_text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', bullet_text)
            bullet_text = re.sub(r'`(.*?)`', r'<font face="Courier">\1</font>', bullet_text)
            story.append(Paragraph(f"• {bullet_text}", bullet_style))
        elif re.match(r'^\s*\d+\.\s', line.strip()):
            match = re.match(r'^\s*(\d+\.)\s*(.*)', line.strip())
            num_prefix = match.group(1)
            item_text = match.group(2)
            item_text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', item_text)
            item_text = re.sub(r'`(.*?)`', r'<font face="Courier">\1</font>', item_text)
            story.append(Paragraph(f"<b>{num_prefix}</b> {item_text}", bullet_style))
        else:
            text = line.strip()
            text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
            text = re.sub(r'`(.*?)`', r'<font face="Courier">\1</font>', text)
            story.append(Paragraph(text, body_style))

    if in_code_block:
        flush_code_block()
    if in_table:
        flush_table()

    doc.build(story)
    print(f"Successfully generated PDF at: {pdf_file_path}")

if __name__ == '__main__':
    md_file = sys.argv[1]
    pdf_file = sys.argv[2]
    build_pdf(md_file, pdf_file)
