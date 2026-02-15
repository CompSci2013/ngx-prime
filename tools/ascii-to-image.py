#!/usr/bin/env python3
"""
Convert ASCII art diagrams to beautiful images for textbook insertion.

Features:
- Renders ASCII art with monospace fonts (JetBrains Mono, Fira Code, etc.)
- Supports light and dark themes
- Adds padding, rounded corners, and optional shadows
- Extracts diagrams from markdown code blocks
- Batch processing of directories

Usage:
    # Convert single ASCII file to image
    python ascii-to-image.py input.txt output.png

    # Extract diagrams from markdown and convert
    python ascii-to-image.py --extract docs/ARCHITECTURE.md --output-dir ./diagrams

    # Batch process all markdown files in a directory
    python ascii-to-image.py --extract-dir docs/ --output-dir ./diagrams

    # Use dark theme
    python ascii-to-image.py input.txt output.png --theme dark

Options:
    --theme         light (default) or dark
    --font-size     Font size in pixels (default: 14)
    --padding       Padding around diagram in pixels (default: 24)
    --extract       Extract diagrams from a markdown file
    --extract-dir   Extract diagrams from all markdown files in directory
    --output-dir    Output directory for extracted diagrams
    --font          Font name (default: auto-detect best available)
"""

import sys
import os
import re
import argparse
from pathlib import Path
from typing import Optional

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Error: Pillow is required. Install with:")
    print("  pip install Pillow")
    sys.exit(1)


# Theme configurations
THEMES = {
    'light': {
        'background': (250, 250, 250),      # Off-white
        'text': (45, 45, 45),                # Dark gray
        'border': (220, 220, 220),           # Light gray border
        'shadow': (0, 0, 0, 25),             # Subtle shadow
    },
    'dark': {
        'background': (30, 30, 35),          # Dark background
        'text': (220, 220, 220),             # Light text
        'border': (60, 60, 65),              # Darker border
        'shadow': (0, 0, 0, 50),             # Stronger shadow
    },
    'github': {
        'background': (246, 248, 250),       # GitHub code block background
        'text': (36, 41, 47),                # GitHub text
        'border': (208, 215, 222),           # GitHub border
        'shadow': (0, 0, 0, 15),
    },
    'monokai': {
        'background': (39, 40, 34),          # Monokai background
        'text': (248, 248, 242),             # Monokai foreground
        'border': (60, 61, 55),
        'shadow': (0, 0, 0, 40),
    }
}

# Preferred monospace fonts in order of preference
PREFERRED_FONTS = [
    'JetBrains Mono',
    'JetBrainsMono-Regular',
    'Fira Code',
    'FiraCode-Regular',
    'Source Code Pro',
    'SourceCodePro-Regular',
    'Cascadia Code',
    'CascadiaCode-Regular',
    'Consolas',
    'Monaco',
    'DejaVu Sans Mono',
    'DejaVuSansMono',
    'Liberation Mono',
    'LiberationMono-Regular',
    'Ubuntu Mono',
    'UbuntuMono-Regular',
    'Courier New',
    'Courier',
    'monospace',
]

# Common font paths to search
FONT_PATHS = [
    '/usr/share/fonts',
    '/usr/local/share/fonts',
    '~/.local/share/fonts',
    '~/.fonts',
    '/System/Library/Fonts',
    '/Library/Fonts',
    '~/Library/Fonts',
    'C:\\Windows\\Fonts',
]


def find_monospace_font(preferred_name: Optional[str] = None) -> Optional[str]:
    """Find a monospace font on the system."""
    search_names = [preferred_name] if preferred_name else PREFERRED_FONTS

    for font_name in search_names:
        if not font_name:
            continue

        # Try loading directly (works for system fonts on some platforms)
        try:
            font = ImageFont.truetype(font_name, 14)
            return font_name
        except (OSError, IOError):
            pass

        # Search in common font directories
        for font_dir in FONT_PATHS:
            font_dir = Path(font_dir).expanduser()
            if not font_dir.exists():
                continue

            for font_file in font_dir.rglob('*.ttf'):
                if font_name.lower().replace(' ', '').replace('-', '') in font_file.stem.lower().replace('-', ''):
                    try:
                        font = ImageFont.truetype(str(font_file), 14)
                        return str(font_file)
                    except (OSError, IOError):
                        continue

            for font_file in font_dir.rglob('*.otf'):
                if font_name.lower().replace(' ', '').replace('-', '') in font_file.stem.lower().replace('-', ''):
                    try:
                        font = ImageFont.truetype(str(font_file), 14)
                        return str(font_file)
                    except (OSError, IOError):
                        continue

    return None


def load_font(font_path: Optional[str], size: int) -> ImageFont.FreeTypeFont:
    """Load a font, falling back to default if necessary."""
    if font_path:
        try:
            return ImageFont.truetype(font_path, size)
        except (OSError, IOError):
            pass

    # Try to find a system monospace font
    found_font = find_monospace_font()
    if found_font:
        try:
            return ImageFont.truetype(found_font, size)
        except (OSError, IOError):
            pass

    # Fall back to default
    print("Warning: No monospace font found, using default font")
    return ImageFont.load_default()


def measure_text(text: str, font: ImageFont.FreeTypeFont) -> tuple[int, int]:
    """Measure the size of text when rendered."""
    lines = text.split('\n')

    # Get font metrics
    bbox = font.getbbox('M')  # Use 'M' as reference character
    char_height = bbox[3] - bbox[1]
    line_height = int(char_height * 1.2)  # Add some line spacing

    max_width = 0
    for line in lines:
        bbox = font.getbbox(line) if line else (0, 0, 0, 0)
        line_width = bbox[2] - bbox[0]
        max_width = max(max_width, line_width)

    total_height = len(lines) * line_height

    return max_width, total_height


def render_ascii_to_image(
    text: str,
    output_path: Path,
    theme: str = 'light',
    font_size: int = 14,
    padding: int = 24,
    font_name: Optional[str] = None,
    corner_radius: int = 8,
    add_shadow: bool = True
) -> None:
    """Render ASCII text to an image."""

    colors = THEMES.get(theme, THEMES['light'])

    # Load font
    font_path = find_monospace_font(font_name)
    font = load_font(font_path, font_size)

    # Measure text
    text_width, text_height = measure_text(text, font)

    # Calculate image dimensions
    img_width = text_width + (padding * 2)
    img_height = text_height + (padding * 2)

    # Add space for shadow
    shadow_offset = 4 if add_shadow else 0
    total_width = img_width + shadow_offset
    total_height = img_height + shadow_offset

    # Create image with transparency for shadow
    img = Image.new('RGBA', (total_width, total_height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Draw shadow if enabled
    if add_shadow:
        shadow_color = colors['shadow']
        draw.rounded_rectangle(
            [shadow_offset, shadow_offset, img_width + shadow_offset - 1, img_height + shadow_offset - 1],
            radius=corner_radius,
            fill=shadow_color
        )

    # Draw main background
    bg_color = colors['background'] + (255,)  # Add alpha
    draw.rounded_rectangle(
        [0, 0, img_width - 1, img_height - 1],
        radius=corner_radius,
        fill=bg_color,
        outline=colors['border'] + (255,),
        width=1
    )

    # Draw text
    text_color = colors['text'] + (255,)
    lines = text.split('\n')

    bbox = font.getbbox('M')
    char_height = bbox[3] - bbox[1]
    line_height = int(char_height * 1.2)

    y = padding
    for line in lines:
        draw.text((padding, y), line, font=font, fill=text_color)
        y += line_height

    # Convert to RGB for saving as PNG (keeps transparency) or JPEG
    if output_path.suffix.lower() in ['.jpg', '.jpeg']:
        # For JPEG, composite onto white background
        background = Image.new('RGB', img.size, (255, 255, 255))
        background.paste(img, mask=img.split()[3])  # Use alpha channel as mask
        img = background

    # Save
    img.save(output_path)
    print(f"Created: {output_path}")


def extract_ascii_diagrams_from_markdown(markdown_path: Path) -> list[tuple[str, str]]:
    """
    Extract ASCII diagrams from markdown code blocks.

    Returns list of (diagram_text, label) tuples.
    """
    content = markdown_path.read_text(encoding='utf-8')

    diagrams = []

    # Pattern to match code blocks (``` or ```language)
    # We look for blocks that appear to contain ASCII art (box-drawing chars, etc.)
    code_block_pattern = re.compile(
        r'```(?:\w*)\n(.*?)```',
        re.DOTALL
    )

    # Characters that indicate ASCII art/diagrams
    ascii_art_indicators = ['┌', '┐', '└', '┘', '│', '─', '├', '┤', '┬', '┴', '┼',
                           '╔', '╗', '╚', '╝', '║', '═', '╠', '╣', '╦', '╩', '╬',
                           '┏', '┓', '┗', '┛', '┃', '━', '┣', '┫', '┳', '┻', '╋',
                           '▲', '▼', '◄', '►', '◆', '●', '○', '■', '□', '▪', '▫',
                           '↑', '↓', '←', '→', '↔', '↕', '⇐', '⇒', '⇔', '⇑', '⇓',
                           '+--', '|  ', '---', '===', '***']

    for i, match in enumerate(code_block_pattern.finditer(content)):
        block_content = match.group(1).strip()

        # Check if this looks like ASCII art
        is_ascii_art = False
        for indicator in ascii_art_indicators:
            if indicator in block_content:
                is_ascii_art = True
                break

        # Also check for patterns like boxes made with regular characters
        if not is_ascii_art:
            lines = block_content.split('\n')
            if len(lines) >= 3:
                # Check for box-like patterns
                has_horizontal_lines = any(line.count('-') > 10 or line.count('=') > 10 for line in lines)
                has_vertical_bars = sum(1 for line in lines if '|' in line) >= 2
                if has_horizontal_lines and has_vertical_bars:
                    is_ascii_art = True

        if is_ascii_art:
            # Try to find a label from preceding text
            # Look for headers or descriptions before the code block
            preceding_text = content[:match.start()]

            # Find the last heading or paragraph before this block
            label_match = re.search(r'(?:^|\n)(?:#{1,6}\s*(.+?)\n|(?:^|\n)([A-Z][^\n]{10,50})\n)\s*$',
                                   preceding_text)

            if label_match:
                label = (label_match.group(1) or label_match.group(2)).strip()
                # Clean up the label for filename
                label = re.sub(r'[^\w\s-]', '', label)
                label = re.sub(r'\s+', '-', label).lower()
            else:
                label = f"diagram-{i+1}"

            diagrams.append((block_content, label))

    return diagrams


def process_markdown_file(
    markdown_path: Path,
    output_dir: Path,
    theme: str = 'light',
    font_size: int = 14,
    padding: int = 24,
    font_name: Optional[str] = None
) -> list[Path]:
    """Process a markdown file and extract/convert all ASCII diagrams."""

    diagrams = extract_ascii_diagrams_from_markdown(markdown_path)

    if not diagrams:
        print(f"No ASCII diagrams found in {markdown_path.name}")
        return []

    print(f"Found {len(diagrams)} diagram(s) in {markdown_path.name}")

    output_dir.mkdir(parents=True, exist_ok=True)

    # Use markdown filename as prefix
    prefix = markdown_path.stem.lower().replace(' ', '-')

    created_files = []
    for i, (diagram_text, label) in enumerate(diagrams):
        output_filename = f"{prefix}-{label}.png"
        output_path = output_dir / output_filename

        # Avoid overwriting - add number if exists
        counter = 1
        while output_path.exists():
            output_filename = f"{prefix}-{label}-{counter}.png"
            output_path = output_dir / output_filename
            counter += 1

        render_ascii_to_image(
            diagram_text,
            output_path,
            theme=theme,
            font_size=font_size,
            padding=padding,
            font_name=font_name
        )
        created_files.append(output_path)

    return created_files


def process_directory(
    input_dir: Path,
    output_dir: Path,
    theme: str = 'light',
    font_size: int = 14,
    padding: int = 24,
    font_name: Optional[str] = None
) -> list[Path]:
    """Process all markdown files in a directory."""

    all_created = []

    for md_file in input_dir.glob('*.md'):
        created = process_markdown_file(
            md_file,
            output_dir,
            theme=theme,
            font_size=font_size,
            padding=padding,
            font_name=font_name
        )
        all_created.extend(created)

    return all_created


def main():
    parser = argparse.ArgumentParser(
        description='Convert ASCII art to beautiful images',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )

    parser.add_argument('input', nargs='?', help='Input ASCII text file')
    parser.add_argument('output', nargs='?', help='Output image file (PNG/JPEG)')

    parser.add_argument('--theme', choices=list(THEMES.keys()), default='light',
                       help='Color theme (default: light)')
    parser.add_argument('--font-size', type=int, default=14,
                       help='Font size in pixels (default: 14)')
    parser.add_argument('--padding', type=int, default=24,
                       help='Padding around diagram (default: 24)')
    parser.add_argument('--font', type=str, default=None,
                       help='Font name or path')
    parser.add_argument('--no-shadow', action='store_true',
                       help='Disable shadow effect')
    parser.add_argument('--corner-radius', type=int, default=8,
                       help='Corner radius (default: 8, use 0 for square)')

    parser.add_argument('--extract', type=Path, metavar='MARKDOWN_FILE',
                       help='Extract diagrams from a markdown file')
    parser.add_argument('--extract-dir', type=Path, metavar='DIR',
                       help='Extract diagrams from all markdown files in directory')
    parser.add_argument('--output-dir', type=Path, default=Path('./diagrams'),
                       help='Output directory for extracted diagrams')

    parser.add_argument('--list-fonts', action='store_true',
                       help='List available monospace fonts and exit')

    args = parser.parse_args()

    # List fonts mode
    if args.list_fonts:
        print("Searching for monospace fonts...")
        found_fonts = []
        for font_name in PREFERRED_FONTS:
            font_path = find_monospace_font(font_name)
            if font_path:
                found_fonts.append((font_name, font_path))

        if found_fonts:
            print("\nAvailable monospace fonts:")
            for name, path in found_fonts:
                print(f"  {name}")
                print(f"    → {path}")
        else:
            print("\nNo monospace fonts found. Will use system default.")
        return

    # Extract from markdown directory
    if args.extract_dir:
        if not args.extract_dir.is_dir():
            print(f"Error: {args.extract_dir} is not a directory")
            sys.exit(1)

        created = process_directory(
            args.extract_dir,
            args.output_dir,
            theme=args.theme,
            font_size=args.font_size,
            padding=args.padding,
            font_name=args.font
        )

        print(f"\nCreated {len(created)} images in {args.output_dir}")
        return

    # Extract from single markdown file
    if args.extract:
        if not args.extract.is_file():
            print(f"Error: {args.extract} not found")
            sys.exit(1)

        created = process_markdown_file(
            args.extract,
            args.output_dir,
            theme=args.theme,
            font_size=args.font_size,
            padding=args.padding,
            font_name=args.font
        )

        print(f"\nCreated {len(created)} images in {args.output_dir}")
        return

    # Single file conversion
    if not args.input or not args.output:
        parser.print_help()
        print("\nError: Either provide input/output files or use --extract/--extract-dir")
        sys.exit(1)

    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.is_file():
        print(f"Error: Input file not found: {input_path}")
        sys.exit(1)

    # Read input
    text = input_path.read_text(encoding='utf-8')

    # Render
    render_ascii_to_image(
        text,
        output_path,
        theme=args.theme,
        font_size=args.font_size,
        padding=args.padding,
        font_name=args.font,
        corner_radius=args.corner_radius,
        add_shadow=not args.no_shadow
    )


if __name__ == '__main__':
    main()
