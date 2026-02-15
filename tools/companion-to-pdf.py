#!/usr/bin/env python3
"""
Generate a beautifully formatted PDF from a single markdown document.

Designed for companion documents and guides. Uses the same styling as
textbook-to-pdf.py for visual consistency.

Features:
- Automatic table of contents generation from headers
- Page numbers in footer
- Code block formatting with syntax highlighting
- Table support
- Professional typography matching the main textbook

Usage:
    python companion-to-pdf.py <input.md> [output.pdf]
    python companion-to-pdf.py brownfield-companion-revised.md BROWNFIELD-COMPANION.pdf
"""

import sys
import re
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional

try:
    from reportlab.lib.pagesizes import LETTER
    from reportlab.lib.units import inch
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Image as RLImage,
        PageBreak, KeepTogether, Table, TableStyle, Preformatted,
        ListFlowable, ListItem
    )
    from reportlab.lib import colors
except ImportError as e:
    print(f"Error: Required packages missing. Install with:")
    print("  pip install reportlab")
    print(f"\nDetails: {e}")
    sys.exit(1)


# Page dimensions
PAGE_WIDTH, PAGE_HEIGHT = LETTER
MARGIN = 0.75 * inch
USABLE_WIDTH = PAGE_WIDTH - (2 * MARGIN)
USABLE_HEIGHT = PAGE_HEIGHT - (2 * MARGIN) - 0.5 * inch  # Leave room for footer


@dataclass
class TOCEntry:
    """Table of contents entry."""
    level: int
    text: str
    anchor: str


def escape_xml(text: str) -> str:
    """Escape special XML characters for ReportLab."""
    return (text
        .replace('&', '&amp;')
        .replace('<', '&lt;')
        .replace('>', '&gt;')
        .replace('"', '&quot;')
    )


def format_inline_markdown(text: str) -> str:
    """Format inline markdown (bold, italic, code, links)."""
    # First, handle inline code to protect underscores inside code spans
    code_spans = []
    def save_code(match):
        code_spans.append(match.group(1))
        return f'\x00CODE{len(code_spans)-1}\x00'

    text = re.sub(r'`([^`]+)`', save_code, text)

    # Bold: **text** or __text__
    text = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'__([^_]+)__', r'<b>\1</b>', text)

    # Italic: *text* (only asterisks, not underscores)
    text = re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)', r'<i>\1</i>', text)

    # Links: [text](url) - just show text underlined
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'<u>\1</u>', text)

    # Restore code spans
    def restore_code(match):
        idx = int(match.group(1))
        code_text = code_spans[idx]
        return f'<font face="Courier" size="9">{code_text}</font>'

    text = re.sub(r'\x00CODE(\d+)\x00', restore_code, text)

    return text


def create_table(rows: list[list[str]], styles: dict):
    """Create a ReportLab table from parsed rows."""
    if not rows:
        return Spacer(1, 0)

    # Format cells
    formatted_rows = []
    for i, row in enumerate(rows):
        formatted_row = []
        for cell in row:
            cell_text = escape_xml(cell)
            cell_text = format_inline_markdown(cell_text)
            if i == 0:  # Header row
                formatted_row.append(Paragraph(cell_text, styles['table_header']))
            else:
                formatted_row.append(Paragraph(cell_text, styles['table_cell']))
        formatted_rows.append(formatted_row)

    # Calculate column widths
    num_cols = max(len(row) for row in formatted_rows)
    col_width = USABLE_WIDTH / num_cols

    table = Table(formatted_rows, colWidths=[col_width] * num_cols)

    table_style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.9, 0.9, 0.95)),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ])
    table.setStyle(table_style)

    return table


def markdown_to_flowables(content: str, styles: dict, doc_dir: Path, toc_entries: list[TOCEntry]) -> list:
    """Convert markdown content to ReportLab flowables."""
    flowables = []
    lines = content.split('\n')

    i = 0
    in_code_block = False
    code_lines = []
    code_lang = ''
    in_table = False
    table_rows = []

    while i < len(lines):
        line = lines[i]

        # Handle code blocks
        if line.startswith('```'):
            if not in_code_block:
                in_code_block = True
                code_lang = line[3:].strip()
                code_lines = []
            else:
                in_code_block = False
                if code_lines:
                    code_text = '\n'.join(code_lines)
                    flowables.append(Spacer(1, 6))
                    flowables.append(Preformatted(code_text, styles['code']))
                    flowables.append(Spacer(1, 6))
            i += 1
            continue

        if in_code_block:
            code_lines.append(line)
            i += 1
            continue

        # Handle tables
        if '|' in line and line.strip().startswith('|'):
            if not in_table:
                in_table = True
                table_rows = []

            # Parse table row
            cells = [c.strip() for c in line.split('|')[1:-1]]

            # Skip separator rows
            if all(set(c) <= {'-', ':', ' '} for c in cells):
                i += 1
                continue

            table_rows.append(cells)
            i += 1
            continue
        elif in_table:
            in_table = False
            if table_rows:
                flowables.append(create_table(table_rows, styles))
                flowables.append(Spacer(1, 12))

        # Handle headers (and collect for TOC)
        if line.startswith('# '):
            text = line[2:].strip()
            anchor = re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')
            toc_entries.append(TOCEntry(level=1, text=text, anchor=anchor))
            flowables.append(Paragraph(escape_xml(text), styles['h1']))
            flowables.append(Spacer(1, 12))
        elif line.startswith('## '):
            text = line[3:].strip()
            anchor = re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')
            toc_entries.append(TOCEntry(level=2, text=text, anchor=anchor))
            flowables.append(Paragraph(escape_xml(text), styles['h2']))
            flowables.append(Spacer(1, 8))
        elif line.startswith('### '):
            text = line[4:].strip()
            anchor = re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')
            toc_entries.append(TOCEntry(level=3, text=text, anchor=anchor))
            flowables.append(Paragraph(escape_xml(text), styles['h3']))
            flowables.append(Spacer(1, 6))
        elif line.startswith('#### '):
            text = line[5:].strip()
            flowables.append(Paragraph(escape_xml(text), styles['h4']))
            flowables.append(Spacer(1, 4))

        # Handle horizontal rules
        elif line.strip() in ['---', '***', '___']:
            flowables.append(Spacer(1, 6))
            flowables.append(Table([['']], colWidths=[USABLE_WIDTH],
                                   style=TableStyle([('LINEBELOW', (0,0), (-1,-1), 0.5, colors.lightgrey)])))
            flowables.append(Spacer(1, 6))

        # Handle blockquotes
        elif line.strip().startswith('>'):
            text = escape_xml(line.strip()[1:].strip())
            text = format_inline_markdown(text)
            flowables.append(Paragraph(text, styles['blockquote']))

        # Handle list items
        elif line.strip().startswith('- ') or line.strip().startswith('* '):
            text = escape_xml(line.strip()[2:])
            text = format_inline_markdown(text)
            flowables.append(Paragraph(f"• {text}", styles['list_item']))
        elif line.strip().startswith('- [ ] '):
            text = escape_xml(line.strip()[6:])
            text = format_inline_markdown(text)
            flowables.append(Paragraph(f"☐ {text}", styles['list_item']))
        elif line.strip().startswith('- [x] ') or line.strip().startswith('- [X] '):
            text = escape_xml(line.strip()[6:])
            text = format_inline_markdown(text)
            flowables.append(Paragraph(f"☑ {text}", styles['list_item']))
        elif re.match(r'^\d+\.\s', line.strip()):
            match = re.match(r'^(\d+)\.\s(.*)$', line.strip())
            if match:
                num = match.group(1)
                text = escape_xml(match.group(2))
                text = format_inline_markdown(text)
                flowables.append(Paragraph(f"{num}. {text}", styles['list_item']))

        # Handle regular paragraphs
        elif line.strip():
            text = escape_xml(line.strip())
            text = format_inline_markdown(text)
            flowables.append(Paragraph(text, styles['body']))

        # Handle empty lines
        elif not line.strip() and flowables:
            if not isinstance(flowables[-1], Spacer):
                flowables.append(Spacer(1, 6))

        i += 1

    # Handle any remaining table
    if in_table and table_rows:
        flowables.append(create_table(table_rows, styles))

    return flowables


def add_page_number(canvas, doc):
    """Add page number to footer."""
    page_num = canvas.getPageNumber()
    if page_num > 2:  # Skip title page and TOC
        text = f"— {page_num} —"
        canvas.saveState()
        canvas.setFont('Helvetica', 9)
        canvas.setFillColor(colors.grey)
        canvas.drawCentredString(PAGE_WIDTH / 2, 0.4 * inch, text)
        canvas.restoreState()


def create_styles():
    """Create custom paragraph styles matching textbook-to-pdf.py."""
    styles = getSampleStyleSheet()

    custom_styles = {
        'title': ParagraphStyle(
            'CustomTitle',
            parent=styles['Title'],
            fontSize=32,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.Color(0.1, 0.1, 0.3),
        ),
        'subtitle': ParagraphStyle(
            'Subtitle',
            parent=styles['Normal'],
            fontSize=16,
            spaceAfter=12,
            alignment=TA_CENTER,
            textColor=colors.grey,
        ),
        'h1': ParagraphStyle(
            'CustomH1',
            parent=styles['Heading1'],
            fontSize=24,
            spaceBefore=24,
            spaceAfter=12,
            textColor=colors.Color(0.1, 0.2, 0.4),
            borderPadding=(0, 0, 6, 0),
        ),
        'h2': ParagraphStyle(
            'CustomH2',
            parent=styles['Heading2'],
            fontSize=18,
            spaceBefore=18,
            spaceAfter=8,
            textColor=colors.Color(0.2, 0.3, 0.5),
        ),
        'h3': ParagraphStyle(
            'CustomH3',
            parent=styles['Heading3'],
            fontSize=14,
            spaceBefore=12,
            spaceAfter=6,
            textColor=colors.Color(0.3, 0.3, 0.5),
        ),
        'h4': ParagraphStyle(
            'CustomH4',
            parent=styles['Heading4'],
            fontSize=12,
            spaceBefore=10,
            spaceAfter=4,
            textColor=colors.Color(0.3, 0.4, 0.5),
            fontName='Helvetica-BoldOblique',
        ),
        'body': ParagraphStyle(
            'CustomBody',
            parent=styles['Normal'],
            fontSize=10,
            spaceAfter=6,
            leading=14,
            alignment=TA_JUSTIFY,
        ),
        'code': ParagraphStyle(
            'Code',
            parent=styles['Code'],
            fontSize=8,
            fontName='Courier',
            backColor=colors.Color(0.95, 0.95, 0.97),
            borderColor=colors.Color(0.8, 0.8, 0.85),
            borderWidth=0.5,
            borderPadding=8,
            leftIndent=12,
            rightIndent=12,
            spaceAfter=6,
            leading=11,
        ),
        'blockquote': ParagraphStyle(
            'Blockquote',
            parent=styles['Normal'],
            fontSize=10,
            leftIndent=24,
            rightIndent=24,
            spaceBefore=6,
            spaceAfter=6,
            textColor=colors.Color(0.3, 0.3, 0.4),
            fontName='Helvetica-Oblique',
            borderColor=colors.Color(0.7, 0.7, 0.8),
            borderWidth=2,
            borderPadding=(0, 0, 0, 12),
        ),
        'list_item': ParagraphStyle(
            'ListItem',
            parent=styles['Normal'],
            fontSize=10,
            leftIndent=24,
            spaceAfter=4,
            leading=14,
        ),
        'caption': ParagraphStyle(
            'Caption',
            parent=styles['Normal'],
            fontSize=9,
            alignment=TA_CENTER,
            textColor=colors.grey,
            fontName='Helvetica-Oblique',
            spaceBefore=4,
            spaceAfter=8,
        ),
        'table_header': ParagraphStyle(
            'TableHeader',
            parent=styles['Normal'],
            fontSize=9,
            fontName='Helvetica-Bold',
        ),
        'table_cell': ParagraphStyle(
            'TableCell',
            parent=styles['Normal'],
            fontSize=9,
        ),
        'toc_h1': ParagraphStyle(
            'TOC_H1',
            parent=styles['Normal'],
            fontSize=12,
            fontName='Helvetica-Bold',
            spaceBefore=12,
            leftIndent=0,
        ),
        'toc_h2': ParagraphStyle(
            'TOC_H2',
            parent=styles['Normal'],
            fontSize=10,
            leftIndent=24,
            spaceBefore=4,
        ),
        'toc_h3': ParagraphStyle(
            'TOC_H3',
            parent=styles['Normal'],
            fontSize=9,
            leftIndent=48,
            spaceBefore=2,
            textColor=colors.Color(0.4, 0.4, 0.4),
        ),
    }

    return custom_styles


def extract_title_from_content(content: str) -> tuple[str, str]:
    """Extract title and subtitle from markdown content."""
    lines = content.split('\n')
    title = "Document"
    subtitle = ""

    for line in lines[:20]:  # Check first 20 lines
        if line.startswith('# '):
            title = line[2:].strip()
            break

    # Look for subtitle pattern (document type, audience, etc.)
    for line in lines[:30]:
        if line.startswith('**Document Type:**') or line.startswith('**Audience:**'):
            subtitle = line.replace('**', '').strip()
            break

    return title, subtitle


def create_title_page(title: str, subtitle: str, styles: dict) -> list:
    """Create the title page flowables."""
    flowables = []

    flowables.append(Spacer(1, 2 * inch))
    flowables.append(Paragraph(title, styles['title']))

    if subtitle:
        flowables.append(Paragraph(subtitle, styles['subtitle']))

    flowables.append(Spacer(1, 0.5 * inch))
    flowables.append(Paragraph("Companion to the Vroom Angular Textbook", styles['body']))
    flowables.append(Spacer(1, 2 * inch))
    flowables.append(Paragraph("URL-First State Management • Brownfield Migration • Angular 13",
                               styles['caption']))
    flowables.append(PageBreak())

    return flowables


def create_toc(toc_entries: list[TOCEntry], styles: dict) -> list:
    """Create table of contents flowables."""
    flowables = []

    flowables.append(Paragraph("Table of Contents", styles['h1']))
    flowables.append(Spacer(1, 0.25 * inch))

    for entry in toc_entries:
        if entry.level == 1:
            flowables.append(Paragraph(f"<b>{entry.text}</b>", styles['toc_h1']))
        elif entry.level == 2:
            flowables.append(Paragraph(entry.text, styles['toc_h2']))
        elif entry.level == 3:
            flowables.append(Paragraph(entry.text, styles['toc_h3']))

    flowables.append(PageBreak())
    return flowables


def build_document(content: str, doc_dir: Path, output_path: Path):
    """Build the complete PDF document."""

    styles = create_styles()

    # First pass: collect TOC entries
    toc_entries = []

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=LETTER,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN + 0.25 * inch,
        title="Brownfield Companion Guide",
        author="Generated from Markdown",
    )

    story = []

    # Extract title
    title, subtitle = extract_title_from_content(content)

    # We need to parse content first to get TOC entries
    # Do a preliminary parse just to collect headers
    lines = content.split('\n')
    for line in lines:
        if line.startswith('# '):
            text = line[2:].strip()
            anchor = re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')
            toc_entries.append(TOCEntry(level=1, text=text, anchor=anchor))
        elif line.startswith('## '):
            text = line[3:].strip()
            anchor = re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')
            toc_entries.append(TOCEntry(level=2, text=text, anchor=anchor))
        elif line.startswith('### '):
            text = line[4:].strip()
            anchor = re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')
            toc_entries.append(TOCEntry(level=3, text=text, anchor=anchor))

    # Title page
    story.extend(create_title_page(title, subtitle, styles))

    # Table of contents
    story.extend(create_toc(toc_entries, styles))

    # Convert main content (will re-add headers as flowables)
    toc_entries_for_content = []  # New list since we already have TOC
    content_flowables = markdown_to_flowables(content, styles, doc_dir, toc_entries_for_content)
    story.extend(content_flowables)

    # Build the PDF
    print(f"Building PDF with {len(story)} flowables...")
    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)

    print(f"\nCreated: {output_path}")
    print(f"TOC entries: {len(toc_entries)}")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    input_path = Path(sys.argv[1]).resolve()

    if not input_path.is_file():
        print(f"Error: File not found: {input_path}")
        sys.exit(1)

    # Determine output path
    if len(sys.argv) >= 3:
        output_path = Path(sys.argv[2]).resolve()
    else:
        output_path = input_path.parent / f"{input_path.stem}.pdf"

    if output_path.suffix.lower() != '.pdf':
        output_path = output_path.with_suffix('.pdf')

    print(f"Input: {input_path}")
    print(f"Output: {output_path}")
    print()

    # Read markdown content
    print("Reading markdown...")
    content = input_path.read_text(encoding='utf-8')
    print(f"Content length: {len(content)} characters")

    # Build document
    print("Generating PDF...")
    build_document(content, input_path.parent, output_path)


if __name__ == '__main__':
    main()
