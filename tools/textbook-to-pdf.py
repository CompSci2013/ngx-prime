#!/usr/bin/env python3
"""
Generate a beautifully formatted PDF textbook from markdown chapter files.

Parses markdown files organized by chapter (NNN-pNN.md format), combines them
into a cohesive document with table of contents, page numbers, and professional
formatting.

Features:
- Automatic table of contents generation
- Page numbers in footer
- Chapter and section headers
- Code block formatting with syntax highlighting
- Image embedding with captions
- Professional typography

Usage:
    python textbook-to-pdf.py <chapters_dir> [output.pdf]
    python textbook-to-pdf.py ~/projects/vvroom/textbook-revised/ TEXTBOOK.pdf
"""

import sys
import re
from pathlib import Path
from collections import defaultdict
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
        ListFlowable, ListItem, NextPageTemplate,
        PageTemplate, Frame, BaseDocTemplate
    )
    from reportlab.lib import colors
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    # TableOfContents import removed - using manual TOC
    from PIL import Image
except ImportError as e:
    print(f"Error: Required packages missing. Install with:")
    print("  pip install reportlab pillow")
    print(f"\nDetails: {e}")
    sys.exit(1)


# Page dimensions
PAGE_WIDTH, PAGE_HEIGHT = LETTER
MARGIN = 0.75 * inch
USABLE_WIDTH = PAGE_WIDTH - (2 * MARGIN)
USABLE_HEIGHT = PAGE_HEIGHT - (2 * MARGIN) - 0.5 * inch  # Leave room for footer


@dataclass
class Chapter:
    """Represents a chapter with its pages."""
    number: str
    title: str
    pages: list[tuple[int, str]] = field(default_factory=list)  # (page_num, content)

    @property
    def sort_key(self):
        """Return sort key for ordering chapters."""
        # Handle special prefixes like 'A' for appendix
        if self.number.startswith('A'):
            return (1, int(self.number[1:]))
        return (0, int(self.number))


@dataclass
class TOCEntry:
    """Table of contents entry."""
    level: int
    text: str
    page_num: int


# Chapter title mapping based on chapter numbers
CHAPTER_TITLES = {
    '000': 'Introduction',
    '051': 'API Overview',
    '052': 'API Endpoints',
    '053': 'Naming Conventions',
    '101': 'Project Setup',
    '102': 'App Shell',
    '103': 'Routing',
    '104': 'Environment Configuration',
    '150': 'TypeScript Generics Primer',
    '202': 'Domain Config Interface',
    '203': 'Filter Definition Interface',
    '204': 'Table Config Interface',
    '205': 'Chart Config Interface',
    '206': 'Picker Config Interface',
    '207': 'Query Control Config Interface',
    '208': 'Statistics Model Interface',
    '209': 'Error Notification Interface',
    '250': 'RxJS Patterns Primer',
    '301': 'URL State Service',
    '302': 'API Service',
    '303': 'Request Coordinator Service',
    '304': 'Domain Config Registry',
    '305': 'Domain Config Validator',
    '306': 'Resource Management Service',
    '307': 'Highlight State Service',
    '308': 'Statistics Processor Service',
    '309': 'Export Service',
    '310': 'Keyboard Shortcuts Service',
    '311': 'Theme Service',
    '312': 'Notification Service',
    '313': 'Window Communication Service',
    '314': 'Popout Manager Service',
    '315': 'Analytics Service',
    '401': 'Automobile Filter Model',
    '402': 'Automobile Data Model',
    '403': 'Automobile Statistics Model',
    '501': 'Automobile API Adapter',
    '502': 'Automobile URL Mapper',
    '503': 'Automobile Cache Key Builder',
    '601': 'Filter Definitions Config',
    '602': 'Table Config',
    '603': 'Picker Configs',
    '604': 'Query Control Filters Config',
    '605': 'Highlight Filters Config',
    '606': 'Chart Configs',
    '607': 'Domain Config Assembly',
    '608': 'Domain Provider Registration',
    '651': 'Manufacturer Chart Source',
    '652': 'Year Chart Source',
    '653': 'Body Class Chart Source',
    '654': 'Top Models Chart Source',
    '801': 'Base Chart Component',
    '802': 'Base Picker Component',
    '803': 'Results Table Component',
    '804': 'Query Panel Component',
    '805': 'Query Control Component',
    '806': 'Statistics Panel Component',
    '807': 'Search Component',
    '808': 'Pagination Component',
    '809': 'Export Button Component',
    '901': 'Home Component',
    '902': 'Automobile Component',
    '903': 'Automobile Discover Component',
    '904': 'Popout Component',
    '905': 'Route Configuration',
    '906': 'Module Assembly',
    '907': 'Final Integration',
    '951': 'Unit Testing Setup',
    '952': 'Integration Testing',
    '953': 'E2E Testing',
    '954': 'Performance Testing',
    'A01': 'Appendix: Angular CLI Reference',
    'A02': 'Appendix: TypeScript Tips',
}

# Phase groupings
PHASES = {
    '0': ('Phase 0: API Contract', ['051', '052', '053']),
    '1': ('Phase 1: Foundation', ['101', '102', '103', '104']),
    '1.5': ('Interlude A: TypeScript Generics', ['150']),
    '2': ('Phase 2: Framework Models', ['202', '203', '204', '205', '206', '207', '208', '209']),
    '2.5': ('Interlude B: RxJS Patterns', ['250']),
    '3': ('Phase 3: Framework Services', ['301', '302', '303', '304', '305', '306', '307', '308', '309', '310', '311', '312', '313', '314', '315']),
    '4': ('Phase 4: Domain Models', ['401', '402', '403']),
    '5': ('Phase 5: Domain Adapters', ['501', '502', '503']),
    '6': ('Phase 6: Domain Configs', ['601', '602', '603', '604', '605', '606', '607', '608']),
    '6.5': ('Phase 6B: Chart Data Sources', ['651', '652', '653', '654']),
    '8': ('Phase 8: Framework Components', ['801', '802', '803', '804', '805', '806', '807', '808', '809']),
    '9': ('Phase 9: Feature Components', ['901', '902', '903', '904', '905', '906', '907']),
    '9.5': ('Phase 9B: Testing', ['951', '952', '953', '954']),
    'A': ('Appendices', ['A01', 'A02']),
}


def get_phase_for_chapter(chapter_num: str) -> Optional[tuple[str, str]]:
    """Return (phase_key, phase_title) for a chapter number."""
    for phase_key, (phase_title, chapters) in PHASES.items():
        if chapter_num in chapters:
            return (phase_key, phase_title)
    return None


def parse_markdown_files(chapters_dir: Path) -> dict[str, Chapter]:
    """Parse all markdown files and organize by chapter."""
    chapters = {}

    # Find all markdown files matching pattern NNN-pNN.md
    pattern = re.compile(r'^([A0-9]+)-p(\d+)\.md$')

    for md_file in sorted(chapters_dir.glob('*.md')):
        # Skip non-chapter files
        if md_file.name == 'visual-content-guidelines.md':
            continue

        match = pattern.match(md_file.name)
        if not match:
            continue

        chapter_num = match.group(1)
        page_num = int(match.group(2))

        content = md_file.read_text(encoding='utf-8')

        if chapter_num not in chapters:
            # Extract title from first line or use default
            title = CHAPTER_TITLES.get(chapter_num, f'Chapter {chapter_num}')
            chapters[chapter_num] = Chapter(number=chapter_num, title=title)

        chapters[chapter_num].pages.append((page_num, content))

    # Sort pages within each chapter
    for chapter in chapters.values():
        chapter.pages.sort(key=lambda x: x[0])

    return chapters


def escape_xml(text: str) -> str:
    """Escape special XML characters for ReportLab."""
    return (text
        .replace('&', '&amp;')
        .replace('<', '&lt;')
        .replace('>', '&gt;')
        .replace('"', '&quot;')
    )


def markdown_to_flowables(content: str, styles: dict, chapters_dir: Path) -> list:
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
                    # Use preformatted text for code
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
            # End of table
            in_table = False
            if table_rows:
                flowables.append(create_table(table_rows, styles))
                flowables.append(Spacer(1, 12))

        # Handle headers
        if line.startswith('# '):
            text = escape_xml(line[2:].strip())
            flowables.append(Paragraph(text, styles['h1']))
            flowables.append(Spacer(1, 12))
        elif line.startswith('## '):
            text = escape_xml(line[3:].strip())
            flowables.append(Paragraph(text, styles['h2']))
            flowables.append(Spacer(1, 8))
        elif line.startswith('### '):
            text = escape_xml(line[4:].strip())
            flowables.append(Paragraph(text, styles['h3']))
            flowables.append(Spacer(1, 6))
        elif line.startswith('#### '):
            text = escape_xml(line[5:].strip())
            flowables.append(Paragraph(text, styles['h4']))
            flowables.append(Spacer(1, 4))

        # Handle horizontal rules
        elif line.strip() in ['---', '***', '___']:
            flowables.append(Spacer(1, 6))
            # Add a thin line
            flowables.append(Table([['']], colWidths=[USABLE_WIDTH],
                                   style=TableStyle([('LINEBELOW', (0,0), (-1,-1), 0.5, colors.lightgrey)])))
            flowables.append(Spacer(1, 6))

        # Handle images
        elif line.strip().startswith('!['):
            match = re.match(r'!\[([^\]]*)\]\(([^)]+)\)', line.strip())
            if match:
                alt_text = match.group(1)
                img_path = match.group(2)

                # Resolve image path
                if img_path.startswith('../'):
                    full_path = (chapters_dir / img_path).resolve()
                else:
                    full_path = chapters_dir / img_path

                if full_path.exists():
                    flowables.extend(create_image_flowable(full_path, alt_text, styles))
                else:
                    flowables.append(Paragraph(f"[Image not found: {img_path}]", styles['caption']))

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
            # Only add spacer if last item wasn't already a spacer
            if not isinstance(flowables[-1], Spacer):
                flowables.append(Spacer(1, 6))

        i += 1

    # Handle any remaining table
    if in_table and table_rows:
        flowables.append(create_table(table_rows, styles))

    return flowables


def format_inline_markdown(text: str) -> str:
    """Format inline markdown (bold, italic, code, links)."""
    # First, handle inline code to protect underscores inside code spans
    # Replace backtick code with a placeholder
    code_spans = []
    def save_code(match):
        code_spans.append(match.group(1))
        return f'\x00CODE{len(code_spans)-1}\x00'

    text = re.sub(r'`([^`]+)`', save_code, text)

    # Bold: **text** or __text__
    text = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'__([^_]+)__', r'<b>\1</b>', text)

    # Italic: *text* (only asterisks, not underscores - they conflict with identifiers)
    text = re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)', r'<i>\1</i>', text)

    # Links: [text](url) - just show text
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


def create_image_flowable(img_path: Path, alt_text: str, styles: dict) -> list:
    """Create flowables for an image with caption."""
    flowables = []

    try:
        with Image.open(img_path) as img:
            img_width, img_height = img.size

            # Scale to fit width with max height constraint
            max_width = USABLE_WIDTH - 0.5 * inch
            max_height = 4 * inch

            scale = min(max_width / img_width, max_height / img_height)
            final_width = img_width * scale
            final_height = img_height * scale

            flowables.append(Spacer(1, 6))
            flowables.append(RLImage(str(img_path), width=final_width, height=final_height))
            if alt_text:
                flowables.append(Paragraph(alt_text, styles['caption']))
            flowables.append(Spacer(1, 6))

    except Exception as e:
        flowables.append(Paragraph(f"[Error loading image: {e}]", styles['caption']))

    return flowables


class NumberedCanvas:
    """Canvas wrapper that adds page numbers."""

    def __init__(self, canvas, doc):
        self._canvas = canvas
        self._doc = doc

    def __getattr__(self, name):
        return getattr(self._canvas, name)

    def showPage(self):
        self._add_page_number()
        self._canvas.showPage()

    def save(self):
        self._add_page_number()
        self._canvas.save()

    def _add_page_number(self):
        page_num = self._canvas.getPageNumber()
        # Skip page numbers on first few pages (title, TOC)
        if page_num > 3:
            text = f"Page {page_num}"
            self._canvas.saveState()
            self._canvas.setFont('Helvetica', 9)
            self._canvas.setFillColor(colors.grey)
            self._canvas.drawCentredString(PAGE_WIDTH / 2, 0.5 * inch, text)
            self._canvas.restoreState()


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
    """Create custom paragraph styles."""
    styles = getSampleStyleSheet()

    custom_styles = {
        'title': ParagraphStyle(
            'CustomTitle',
            parent=styles['Title'],
            fontSize=36,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.Color(0.1, 0.1, 0.3),
        ),
        'subtitle': ParagraphStyle(
            'Subtitle',
            parent=styles['Normal'],
            fontSize=18,
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
        'phase_title': ParagraphStyle(
            'PhaseTitle',
            parent=styles['Heading1'],
            fontSize=28,
            spaceBefore=0,
            spaceAfter=20,
            alignment=TA_CENTER,
            textColor=colors.Color(0.15, 0.25, 0.45),
        ),
    }

    return custom_styles


def create_title_page(styles: dict) -> list:
    """Create the title page flowables."""
    flowables = []

    flowables.append(Spacer(1, 2 * inch))
    flowables.append(Paragraph("VVroom", styles['title']))
    flowables.append(Paragraph("Angular Framework Development Guide", styles['subtitle']))
    flowables.append(Spacer(1, 0.5 * inch))
    flowables.append(Paragraph("A Comprehensive Textbook for Building", styles['body']))
    flowables.append(Paragraph("Domain-Driven Angular Applications", styles['body']))
    flowables.append(Spacer(1, 2 * inch))
    flowables.append(Paragraph("URL-First State Management • Generic Components • Domain Configuration",
                               styles['caption']))
    flowables.append(PageBreak())

    return flowables


def create_toc(chapters: dict[str, Chapter], styles: dict) -> list:
    """Create table of contents flowables."""
    flowables = []

    flowables.append(Paragraph("Table of Contents", styles['h1']))
    flowables.append(Spacer(1, 0.25 * inch))

    # Group chapters by phase
    current_phase = None
    page_estimate = 4  # Start after title, copyright, TOC

    for phase_key in ['0', '1', '1.5', '2', '2.5', '3', '4', '5', '6', '6.5', '8', '9', '9.5', 'A']:
        if phase_key not in PHASES:
            continue

        phase_title, chapter_nums = PHASES[phase_key]

        # Check if any chapters in this phase exist
        phase_chapters = [chapters[num] for num in chapter_nums if num in chapters]
        if not phase_chapters:
            continue

        # Phase header
        flowables.append(Spacer(1, 8))
        flowables.append(Paragraph(f"<b>{phase_title}</b>", styles['toc_h1']))

        for chapter in phase_chapters:
            # Estimate pages per chapter (rough: 1 page per 2 source pages)
            chapter_pages = len(chapter.pages)

            # Create TOC entry with dotted leader
            entry_text = f"{chapter.number}. {chapter.title}"
            flowables.append(Paragraph(entry_text, styles['toc_h2']))

            page_estimate += max(1, chapter_pages // 2)

    flowables.append(PageBreak())
    return flowables


def build_document(chapters: dict[str, Chapter], chapters_dir: Path, output_path: Path):
    """Build the complete PDF document."""

    styles = create_styles()

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=LETTER,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN + 0.25 * inch,  # Extra space for page numbers
        title="VVroom Angular Framework Development Guide",
        author="Generated from Markdown",
    )

    story = []

    # Title page
    story.extend(create_title_page(styles))

    # Table of contents
    story.extend(create_toc(chapters, styles))

    # Process chapters by phase
    current_phase = None

    for phase_key in ['0', '1', '1.5', '2', '2.5', '3', '4', '5', '6', '6.5', '8', '9', '9.5', 'A']:
        if phase_key not in PHASES:
            continue

        phase_title, chapter_nums = PHASES[phase_key]

        # Check if any chapters in this phase exist
        phase_chapters = [(num, chapters[num]) for num in chapter_nums if num in chapters]
        if not phase_chapters:
            continue

        # Phase title page
        story.append(PageBreak())
        story.append(Spacer(1, 2.5 * inch))
        story.append(Paragraph(phase_title, styles['phase_title']))
        story.append(Spacer(1, 0.5 * inch))

        # List chapters in this phase
        for num, chapter in phase_chapters:
            story.append(Paragraph(f"Chapter {num}: {chapter.title}", styles['body']))

        story.append(PageBreak())

        # Process each chapter
        for num, chapter in phase_chapters:
            # Chapter title
            story.append(Paragraph(f"Chapter {chapter.number}", styles['h1']))
            story.append(Paragraph(chapter.title, styles['h2']))
            story.append(Spacer(1, 0.25 * inch))

            # Process all pages in the chapter
            for page_num, content in chapter.pages:
                page_flowables = markdown_to_flowables(content, styles, chapters_dir)
                story.extend(page_flowables)

            # Page break after each chapter
            story.append(PageBreak())

    # Build the PDF
    print(f"Building PDF with {len(story)} flowables...")
    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)

    print(f"\nCreated: {output_path}")
    print(f"Chapters: {len(chapters)}")
    total_pages = sum(len(c.pages) for c in chapters.values())
    print(f"Source pages: {total_pages}")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    chapters_dir = Path(sys.argv[1]).resolve()

    if not chapters_dir.is_dir():
        print(f"Error: Directory not found: {chapters_dir}")
        sys.exit(1)

    # Determine output path
    if len(sys.argv) >= 3:
        output_path = Path(sys.argv[2]).resolve()
    else:
        output_path = chapters_dir / "TEXTBOOK.pdf"

    if output_path.suffix.lower() != '.pdf':
        output_path = output_path.with_suffix('.pdf')

    print(f"Source directory: {chapters_dir}")
    print(f"Output: {output_path}")
    print()

    # Parse markdown files
    print("Parsing markdown files...")
    chapters = parse_markdown_files(chapters_dir)
    print(f"Found {len(chapters)} chapters")

    # List chapters
    for num in sorted(chapters.keys(), key=lambda x: (0 if x[0].isdigit() else 1, x)):
        chapter = chapters[num]
        print(f"  {num}: {chapter.title} ({len(chapter.pages)} pages)")

    print()

    # Build document
    print("Generating PDF...")
    build_document(chapters, chapters_dir, output_path)


if __name__ == '__main__':
    main()
