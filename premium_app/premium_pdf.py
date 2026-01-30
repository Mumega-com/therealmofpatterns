"""
FRC 16D Premium Report Generator
Generates museum-quality 40+ page personalized reports
"""
import io
import os
import sys
from datetime import datetime
from typing import Dict, List, Optional, Tuple

# Add parent directory for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.units import inch, mm
from reportlab.lib.colors import HexColor, Color, black, white
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image,
    Table, TableStyle, Frame, PageTemplate, BaseDocTemplate,
    NextPageTemplate, FrameBreak, KeepTogether
)
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing, Rect, Circle, Line, String
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics import renderPDF

# Color Palette - Cosmic Luxury
COLORS = {
    'deep_space': HexColor('#0a0a1a'),
    'cosmic_purple': HexColor('#2d1b4e'),
    'stellar_gold': HexColor('#d4af37'),
    'nebula_pink': HexColor('#c77dff'),
    'void_blue': HexColor('#1a1a3e'),
    'stardust': HexColor('#e8e8f0'),
    'warm_white': HexColor('#faf8f5'),
    'accent_copper': HexColor('#b87333'),
    'sacred_teal': HexColor('#2dd4bf'),
}

# Dimension colors
DIM_COLORS = {
    'P': HexColor('#FFD700'),  # Gold - Phase/Identity
    'E': HexColor('#228B22'),  # Forest Green - Existence
    'μ': HexColor('#C0C0C0'),  # Silver - Cognition
    'V': HexColor('#FFB6C1'),  # Rose - Value/Beauty
    'N': HexColor('#9370DB'),  # Purple - Expansion
    'Δ': HexColor('#FF4500'),  # Orange-Red - Action
    'R': HexColor('#FF69B4'),  # Pink - Relational
    'Φ': HexColor('#4B0082'),  # Indigo - Field/Witness
}


class PremiumReportGenerator:
    """Generate luxury 40+ page FRC 16D reports."""

    def __init__(self, output_path: str):
        self.output_path = output_path
        self.width, self.height = letter
        self.margin = 0.75 * inch
        self.styles = self._create_styles()

    def _create_styles(self) -> Dict[str, ParagraphStyle]:
        """Create custom paragraph styles for luxury feel."""
        base_styles = getSampleStyleSheet()

        styles = {
            'title': ParagraphStyle(
                'CustomTitle',
                parent=base_styles['Title'],
                fontSize=36,
                leading=44,
                textColor=COLORS['stellar_gold'],
                alignment=TA_CENTER,
                spaceAfter=30,
                fontName='Helvetica-Bold'
            ),
            'subtitle': ParagraphStyle(
                'CustomSubtitle',
                parent=base_styles['Normal'],
                fontSize=18,
                leading=24,
                textColor=COLORS['stardust'],
                alignment=TA_CENTER,
                spaceAfter=20,
                fontName='Helvetica-Oblique'
            ),
            'heading1': ParagraphStyle(
                'CustomH1',
                parent=base_styles['Heading1'],
                fontSize=28,
                leading=34,
                textColor=COLORS['stellar_gold'],
                spaceBefore=20,
                spaceAfter=16,
                fontName='Helvetica-Bold'
            ),
            'heading2': ParagraphStyle(
                'CustomH2',
                parent=base_styles['Heading2'],
                fontSize=20,
                leading=26,
                textColor=COLORS['nebula_pink'],
                spaceBefore=16,
                spaceAfter=12,
                fontName='Helvetica-Bold'
            ),
            'heading3': ParagraphStyle(
                'CustomH3',
                parent=base_styles['Heading3'],
                fontSize=16,
                leading=22,
                textColor=COLORS['sacred_teal'],
                spaceBefore=12,
                spaceAfter=8,
                fontName='Helvetica-Bold'
            ),
            'body': ParagraphStyle(
                'CustomBody',
                parent=base_styles['Normal'],
                fontSize=11,
                leading=18,
                textColor=COLORS['stardust'],
                alignment=TA_JUSTIFY,
                spaceBefore=6,
                spaceAfter=12,
                fontName='Helvetica'
            ),
            'body_center': ParagraphStyle(
                'CustomBodyCenter',
                parent=base_styles['Normal'],
                fontSize=11,
                leading=18,
                textColor=COLORS['stardust'],
                alignment=TA_CENTER,
                spaceBefore=6,
                spaceAfter=12,
                fontName='Helvetica'
            ),
            'quote': ParagraphStyle(
                'CustomQuote',
                parent=base_styles['Normal'],
                fontSize=14,
                leading=22,
                textColor=COLORS['stellar_gold'],
                alignment=TA_CENTER,
                spaceBefore=20,
                spaceAfter=20,
                fontName='Helvetica-Oblique',
                leftIndent=40,
                rightIndent=40
            ),
            'dimension_name': ParagraphStyle(
                'DimensionName',
                parent=base_styles['Normal'],
                fontSize=24,
                leading=30,
                textColor=COLORS['stellar_gold'],
                alignment=TA_LEFT,
                spaceBefore=10,
                spaceAfter=6,
                fontName='Helvetica-Bold'
            ),
            'small': ParagraphStyle(
                'Small',
                parent=base_styles['Normal'],
                fontSize=9,
                leading=12,
                textColor=COLORS['stardust'],
                alignment=TA_CENTER,
                fontName='Helvetica'
            ),
            'footer': ParagraphStyle(
                'Footer',
                parent=base_styles['Normal'],
                fontSize=8,
                leading=10,
                textColor=HexColor('#666666'),
                alignment=TA_CENTER,
                fontName='Helvetica'
            ),
        }

        return styles

    def _draw_background(self, canvas, doc):
        """Draw cosmic gradient background on each page."""
        canvas.saveState()

        # Deep space gradient
        canvas.setFillColor(COLORS['deep_space'])
        canvas.rect(0, 0, self.width, self.height, fill=1)

        # Subtle cosmic overlay
        canvas.setFillColor(COLORS['cosmic_purple'])
        canvas.setFillAlpha(0.3)
        canvas.rect(0, 0, self.width, self.height * 0.3, fill=1)

        # Top accent line
        canvas.setStrokeColor(COLORS['stellar_gold'])
        canvas.setLineWidth(0.5)
        canvas.line(self.margin, self.height - 0.5*inch,
                   self.width - self.margin, self.height - 0.5*inch)

        # Bottom accent line
        canvas.line(self.margin, 0.5*inch,
                   self.width - self.margin, 0.5*inch)

        # Page number
        canvas.setFillColor(COLORS['stardust'])
        canvas.setFillAlpha(0.6)
        canvas.setFont('Helvetica', 9)
        page_num = canvas.getPageNumber()
        canvas.drawCentredString(self.width/2, 0.3*inch, str(page_num))

        canvas.restoreState()

    def _draw_cover_background(self, canvas, doc):
        """Draw special cover page background."""
        canvas.saveState()

        # Deep cosmic gradient
        canvas.setFillColor(COLORS['deep_space'])
        canvas.rect(0, 0, self.width, self.height, fill=1)

        # Radial gradient effect (approximated with circles)
        center_x, center_y = self.width/2, self.height * 0.6
        for i in range(20, 0, -1):
            radius = i * 30
            alpha = 0.02
            canvas.setFillColor(COLORS['cosmic_purple'])
            canvas.setFillAlpha(alpha)
            canvas.circle(center_x, center_y, radius, fill=1, stroke=0)

        # Golden border
        canvas.setStrokeColor(COLORS['stellar_gold'])
        canvas.setLineWidth(2)
        canvas.rect(0.5*inch, 0.5*inch,
                   self.width - inch, self.height - inch, fill=0)

        # Inner border
        canvas.setLineWidth(0.5)
        canvas.rect(0.6*inch, 0.6*inch,
                   self.width - 1.2*inch, self.height - 1.2*inch, fill=0)

        canvas.restoreState()

    def _create_vector_visualization(self, vector: List[float], width: float = 400, height: float = 300) -> Drawing:
        """Create a beautiful visualization of the 16D vector."""
        d = Drawing(width, height)

        # Background
        d.add(Rect(0, 0, width, height, fillColor=COLORS['void_blue'], strokeColor=None))

        # Dimension labels
        dims = ['P', 'E', 'μ', 'V', 'N', 'Δ', 'R', 'Φ']

        # Bar chart
        bar_width = (width - 80) / 8
        max_height = height - 60

        for i, (dim, val) in enumerate(zip(dims, vector)):
            x = 40 + i * bar_width
            bar_height = val * (max_height - 40)

            # Bar
            color = DIM_COLORS.get(dim, COLORS['stellar_gold'])
            d.add(Rect(x + 5, 30, bar_width - 10, bar_height,
                      fillColor=color, strokeColor=None))

            # Glow effect
            d.add(Rect(x + 5, 30, bar_width - 10, bar_height,
                      fillColor=None, strokeColor=color, strokeWidth=0.5))

            # Label
            d.add(String(x + bar_width/2, 15, dim,
                        fontSize=12, fillColor=COLORS['stardust'],
                        textAnchor='middle'))

            # Value
            d.add(String(x + bar_width/2, bar_height + 35, f'{val:.0%}',
                        fontSize=9, fillColor=COLORS['stardust'],
                        textAnchor='middle'))

        return d

    def _create_radar_chart(self, vector: List[float], width: float = 300, height: float = 300) -> Drawing:
        """Create a radar/spider chart of the 16D vector."""
        import math

        d = Drawing(width, height)

        center_x, center_y = width/2, height/2
        radius = min(width, height) * 0.35

        dims = ['P', 'E', 'μ', 'V', 'N', 'Δ', 'R', 'Φ']
        n = len(dims)

        # Draw concentric circles
        for r in [0.25, 0.5, 0.75, 1.0]:
            d.add(Circle(center_x, center_y, radius * r,
                        fillColor=None, strokeColor=HexColor('#333355'),
                        strokeWidth=0.5))

        # Draw axis lines and labels
        for i, dim in enumerate(dims):
            angle = (i / n) * 2 * math.pi - math.pi/2
            x_end = center_x + radius * math.cos(angle)
            y_end = center_y + radius * math.sin(angle)

            d.add(Line(center_x, center_y, x_end, y_end,
                      strokeColor=HexColor('#333355'), strokeWidth=0.5))

            # Label
            label_x = center_x + (radius + 15) * math.cos(angle)
            label_y = center_y + (radius + 15) * math.sin(angle)
            d.add(String(label_x, label_y, dim,
                        fontSize=11, fillColor=DIM_COLORS.get(dim, COLORS['stardust']),
                        textAnchor='middle'))

        # Draw the data polygon
        points = []
        for i, val in enumerate(vector):
            angle = (i / n) * 2 * math.pi - math.pi/2
            x = center_x + radius * val * math.cos(angle)
            y = center_y + radius * val * math.sin(angle)
            points.append((x, y))

        # Fill polygon
        from reportlab.graphics.shapes import Polygon
        poly_points = []
        for p in points:
            poly_points.extend(p)
        d.add(Polygon(poly_points,
                     fillColor=HexColor('#9370DB'),
                     fillOpacity=0.3,
                     strokeColor=COLORS['stellar_gold'],
                     strokeWidth=2))

        # Draw points
        for i, (x, y) in enumerate(points):
            d.add(Circle(x, y, 4,
                        fillColor=DIM_COLORS.get(dims[i], COLORS['stellar_gold']),
                        strokeColor=white, strokeWidth=1))

        return d

    def generate(
        self,
        name: str,
        birth_data: dict,
        vector: List[float],
        dimensions: dict,
        archetypes: List[dict],
        personality: dict,
        images: dict = None,
        include_images: bool = True,
        full_16d_data: dict = None,
        velocity_data: dict = None,
        shadow_data: dict = None
    ):
        """Generate the complete premium report with Full 16D."""

        story = []

        # ========== COVER PAGE ==========
        story.append(Spacer(1, 2*inch))
        story.append(Paragraph("FRC 16D", self.styles['title']))
        story.append(Paragraph("COSMIC IDENTITY REPORT", self.styles['subtitle']))
        story.append(Spacer(1, 0.5*inch))

        # Cover image placeholder
        if images and 'cover' in images and include_images:
            cover_img = Image(io.BytesIO(images['cover']), width=4*inch, height=5*inch)
            cover_img.hAlign = 'CENTER'
            story.append(cover_img)
        else:
            story.append(Spacer(1, 3*inch))

        story.append(Spacer(1, 0.5*inch))
        story.append(Paragraph(name.upper(), self.styles['heading1']))
        story.append(Paragraph(
            f"Born: {birth_data.get('month', '?')}/{birth_data.get('day', '?')}/{birth_data.get('year', '?')}",
            self.styles['body_center']
        ))
        story.append(Paragraph(
            f"Generated: {datetime.now().strftime('%B %d, %Y')}",
            self.styles['small']
        ))
        story.append(PageBreak())

        # ========== TABLE OF CONTENTS ==========
        story.append(Paragraph("Contents", self.styles['heading1']))
        story.append(Spacer(1, 0.25*inch))

        toc_items = [
            ("I.", "Your Cosmic Signature", "3"),
            ("II.", "The 8 Dimensions Explained", "5"),
            ("III.", "Your Dimensional Profile", "8"),
            ("IV.", "Archetype Resonance", "18"),
            ("V.", "Personality Mapping", "24"),
            ("VI.", "Life Domains & Applications", "30"),
            ("VII.", "Shadow Work & Integration", "35"),
            ("VIII.", "Current Transits & Timing", "38"),
            ("IX.", "Daily Practices", "40"),
            ("X.", "Your 16D Identity Token", "42"),
        ]

        for num, title, page in toc_items:
            story.append(Paragraph(
                f'<font color="#d4af37">{num}</font>  {title} '
                f'<font color="#666666">{"." * (50 - len(title))}</font> {page}',
                self.styles['body']
            ))

        story.append(PageBreak())

        # ========== SECTION I: COSMIC SIGNATURE ==========
        story.append(Paragraph("I. Your Cosmic Signature", self.styles['heading1']))
        story.append(Spacer(1, 0.25*inch))

        story.append(Paragraph(
            f"At the moment of your birth, {name}, the cosmos encoded a unique signature into your being. "
            f"This signature—your 16D vector—represents the fundamental frequencies that define your identity, "
            f"your gifts, your shadows, and your path of evolution.",
            self.styles['body']
        ))

        # Vector visualization
        vector_chart = self._create_vector_visualization(vector)
        story.append(Spacer(1, 0.25*inch))
        story.append(vector_chart)
        story.append(Spacer(1, 0.25*inch))

        # Radar chart
        radar = self._create_radar_chart(vector)
        story.append(radar)

        # Dominant dimension highlight
        sorted_dims = sorted(dimensions.items(), key=lambda x: x[1]['value'], reverse=True)
        dominant = sorted_dims[0]
        lowest = sorted_dims[-1]

        story.append(Spacer(1, 0.25*inch))
        story.append(Paragraph(
            f'"Your soul speaks loudest through {dominant[1]["name"]}."',
            self.styles['quote']
        ))

        story.append(Paragraph(
            f"<b>Dominant Dimension:</b> {dominant[0]} ({dominant[1]['name']}) at {dominant[1]['value']:.0%}",
            self.styles['body']
        ))
        story.append(Paragraph(
            f"<b>Growth Edge:</b> {lowest[0]} ({lowest[1]['name']}) at {lowest[1]['value']:.0%}",
            self.styles['body']
        ))

        story.append(PageBreak())

        # ========== SECTION II: 8 DIMENSIONS EXPLAINED ==========
        story.append(Paragraph("II. The 8 Dimensions Explained", self.styles['heading1']))
        story.append(Spacer(1, 0.25*inch))

        dimension_explanations = {
            'P': {
                'name': 'Phase (Identity)',
                'symbol': '☉',
                'domain': 'Will, Purpose, Self-Expression',
                'high': 'Strong sense of self, clear direction, natural leadership',
                'low': 'Identity confusion, seeking validation, unclear purpose',
                'question': 'Who am I becoming?'
            },
            'E': {
                'name': 'Existence (Structure)',
                'symbol': '♄',
                'domain': 'Stability, Form, Boundaries',
                'high': 'Grounded, reliable, excellent at building lasting structures',
                'low': 'Rigid patterns, fear of change, or chaotic lack of form',
                'question': 'What am I building?'
            },
            'μ': {
                'name': 'Mu (Cognition)',
                'symbol': '☿',
                'domain': 'Thought, Communication, Perception',
                'high': 'Quick mind, articulate, excellent pattern recognition',
                'low': 'Overthinking, communication blocks, scattered attention',
                'question': 'How do I understand?'
            },
            'V': {
                'name': 'Value (Beauty)',
                'symbol': '♀',
                'domain': 'Aesthetics, Worth, Harmony',
                'high': 'Natural eye for beauty, strong values, harmonious relationships',
                'low': 'Self-worth issues, difficulty receiving, aesthetic numbness',
                'question': 'What do I treasure?'
            },
            'N': {
                'name': 'Nu (Expansion)',
                'symbol': '♃',
                'domain': 'Growth, Meaning, Possibility',
                'high': 'Optimistic, growth-oriented, natural teacher',
                'low': 'Stagnation, nihilism, fear of expansion',
                'question': 'Where am I growing?'
            },
            'Δ': {
                'name': 'Delta (Action)',
                'symbol': '♂',
                'domain': 'Will, Drive, Transformation',
                'high': 'Decisive, courageous, excellent at initiation',
                'low': 'Aggression/passivity, blocked will, fear of conflict',
                'question': 'What am I fighting for?'
            },
            'R': {
                'name': 'Rho (Relational)',
                'symbol': '☽',
                'domain': 'Connection, Emotion, Attunement',
                'high': 'Deep empathy, emotional intelligence, strong bonds',
                'low': 'Codependency, emotional flooding, isolation',
                'question': 'Who do I love?'
            },
            'Φ': {
                'name': 'Phi (Field/Witness)',
                'symbol': '♆',
                'domain': 'Presence, Transcendence, Unity',
                'high': 'Profound presence, spiritual depth, sees the whole',
                'low': 'Dissociation, spiritual bypassing, loss of self',
                'question': 'What is witnessing?'
            },
        }

        for symbol, info in dimension_explanations.items():
            story.append(Paragraph(
                f'<font color="{DIM_COLORS[symbol].hexval()}">{info["symbol"]}</font>  '
                f'{info["name"]}',
                self.styles['heading2']
            ))
            story.append(Paragraph(f"<b>Domain:</b> {info['domain']}", self.styles['body']))
            story.append(Paragraph(f"<b>High Expression:</b> {info['high']}", self.styles['body']))
            story.append(Paragraph(f"<b>Low Expression:</b> {info['low']}", self.styles['body']))
            story.append(Paragraph(f'<i>Core Question: "{info["question"]}"</i>', self.styles['body']))
            story.append(Spacer(1, 0.15*inch))

        story.append(PageBreak())

        # ========== SECTION III: YOUR DIMENSIONAL PROFILE ==========
        story.append(Paragraph("III. Your Dimensional Profile", self.styles['heading1']))
        story.append(Spacer(1, 0.25*inch))

        story.append(Paragraph(
            f"Now we examine how each dimension manifests specifically in you, {name}. "
            f"These are not abstract concepts—they are the living frequencies that shape "
            f"your experience of reality.",
            self.styles['body']
        ))
        story.append(Spacer(1, 0.25*inch))

        # Detailed analysis of each dimension
        for symbol, data in sorted_dims:
            value = data['value']
            rank = data['rank']
            info = dimension_explanations.get(symbol, {})

            story.append(Paragraph(
                f'{symbol} — {info.get("name", "Unknown")}',
                self.styles['dimension_name']
            ))

            # Visual bar
            story.append(Paragraph(
                f'<font color="#333355">{"█" * int(value * 20)}{"░" * (20 - int(value * 20))}</font>  '
                f'<font color="#d4af37">{value:.0%}</font>  (Rank #{rank})',
                self.styles['body']
            ))

            # Interpretation based on level
            if value > 0.8:
                level = "DOMINANT"
                interp = f"This is a core pillar of your identity. {info.get('high', '')} You naturally embody this frequency and others look to you for it."
            elif value > 0.6:
                level = "STRONG"
                interp = f"This dimension flows naturally for you. While not your absolute peak, it's a reliable source of strength."
            elif value > 0.4:
                level = "MODERATE"
                interp = f"This dimension is available to you but requires conscious cultivation. It's neither a peak nor a valley."
            else:
                level = "GROWTH EDGE"
                interp = f"This represents an area of potential growth. {info.get('low', '')} The invitation here is integration, not judgment."

            story.append(Paragraph(f"<b>{level}:</b> {interp}", self.styles['body']))

            # Image for top dimensions
            if images and f'dim_{symbol}' in images and include_images and rank <= 4:
                dim_img = Image(io.BytesIO(images[f'dim_{symbol}']), width=5*inch, height=2.5*inch)
                dim_img.hAlign = 'CENTER'
                story.append(dim_img)

            story.append(Spacer(1, 0.2*inch))

            if rank % 2 == 0:  # Page break every 2 dimensions
                story.append(PageBreak())

        # ========== SECTION IV: ARCHETYPE RESONANCE ==========
        story.append(Paragraph("IV. Archetype Resonance", self.styles['heading1']))
        story.append(Spacer(1, 0.25*inch))

        story.append(Paragraph(
            "Your 16D vector resonates with certain mythological archetypes—figures that have "
            "carried similar frequencies across human history. These are not role models to "
            "imitate but mirrors to recognize yourself in.",
            self.styles['body']
        ))
        story.append(Spacer(1, 0.25*inch))

        for i, arch in enumerate(archetypes[:5]):
            story.append(Paragraph(
                f'#{i+1}: {arch["name"]} ({arch.get("tradition", "Unknown")})',
                self.styles['heading2']
            ))

            match_pct = arch.get('match_percent', arch.get('resonance', 0))
            if isinstance(match_pct, float) and match_pct < 1:
                match_pct = f"{match_pct:.1%}"

            story.append(Paragraph(
                f"<b>Resonance:</b> {match_pct}",
                self.styles['body']
            ))

            if 'description' in arch:
                story.append(Paragraph(arch['description'], self.styles['body']))

            if 'domains' in arch:
                domains = ", ".join(arch['domains'])
                story.append(Paragraph(f"<b>Domains:</b> {domains}", self.styles['body']))

            # Archetype image
            if images and f'archetype_{i}' in images and include_images and i < 2:
                arch_img = Image(io.BytesIO(images[f'archetype_{i}']), width=3*inch, height=3*inch)
                arch_img.hAlign = 'CENTER'
                story.append(arch_img)

            story.append(Spacer(1, 0.2*inch))

        story.append(PageBreak())

        # ========== SECTION V: PERSONALITY MAPPING ==========
        story.append(Paragraph("V. Personality Mapping", self.styles['heading1']))
        story.append(Spacer(1, 0.25*inch))

        story.append(Paragraph(
            "Your 16D vector can be translated into familiar personality frameworks. "
            "These are approximations—your full identity is richer than any single system can capture.",
            self.styles['body']
        ))

        if personality:
            # MBTI
            if 'mbti' in personality:
                mbti = personality['mbti']
                story.append(Paragraph("Myers-Briggs Type Indicator", self.styles['heading2']))
                story.append(Paragraph(
                    f"<b>Type:</b> {mbti.get('type', 'Unknown')} — {mbti.get('name', '')}",
                    self.styles['body']
                ))
                if 'description' in mbti:
                    story.append(Paragraph(mbti['description'], self.styles['body']))
                story.append(Spacer(1, 0.15*inch))

            # Big Five
            if 'big_five' in personality:
                bf = personality['big_five']
                story.append(Paragraph("Big Five (OCEAN)", self.styles['heading2']))
                for trait in ['Openness', 'Conscientiousness', 'Extraversion', 'Agreeableness', 'Neuroticism']:
                    val = bf.get('scores', {}).get(trait, 50)
                    story.append(Paragraph(
                        f"<b>{trait}:</b> {val}%",
                        self.styles['body']
                    ))
                story.append(Spacer(1, 0.15*inch))

            # Enneagram
            if 'enneagram' in personality:
                enn = personality['enneagram']
                story.append(Paragraph("Enneagram", self.styles['heading2']))
                story.append(Paragraph(
                    f"<b>Type:</b> {enn.get('type', 'Unknown')} — {enn.get('name', '')}",
                    self.styles['body']
                ))
                if 'wing' in enn:
                    story.append(Paragraph(f"<b>Wing:</b> {enn['wing']}", self.styles['body']))
                story.append(Spacer(1, 0.15*inch))

            # DISC
            if 'disc' in personality:
                disc = personality['disc']
                story.append(Paragraph("DISC Profile", self.styles['heading2']))
                story.append(Paragraph(
                    f"<b>Primary:</b> {disc.get('primary', 'Unknown')}",
                    self.styles['body']
                ))
                if 'secondary' in disc:
                    story.append(Paragraph(f"<b>Secondary:</b> {disc['secondary']}", self.styles['body']))
                story.append(Spacer(1, 0.15*inch))

            # StrengthsFinder
            if 'strengths_finder' in personality:
                sf = personality['strengths_finder']
                story.append(Paragraph("CliftonStrengths (Top 5)", self.styles['heading2']))
                top5 = sf.get('top_5', [])
                for i, strength in enumerate(top5, 1):
                    story.append(Paragraph(f"{i}. {strength}", self.styles['body']))
                story.append(Spacer(1, 0.15*inch))

            # Love Languages
            if 'love_language' in personality:
                ll = personality['love_language']
                story.append(Paragraph("Love Languages", self.styles['heading2']))
                story.append(Paragraph(
                    f"<b>Primary:</b> {ll.get('primary', 'Unknown')}",
                    self.styles['body']
                ))
                if 'secondary' in ll:
                    story.append(Paragraph(f"<b>Secondary:</b> {ll['secondary']}", self.styles['body']))

        story.append(PageBreak())

        # ========== SECTION VI: LIFE DOMAINS ==========
        story.append(Paragraph("VI. Life Domains & Applications", self.styles['heading1']))
        story.append(Spacer(1, 0.25*inch))

        domains = [
            ("Career & Work", f"With {dominant[0]} ({dominant[1]['name']}) as your dominant dimension, you thrive in roles that allow you to express this frequency. Consider careers that value {dimension_explanations[dominant[0]]['domain'].lower()}."),
            ("Relationships", f"Your {sorted_dims[6][0]} ({sorted_dims[6][1]['name']}) score of {sorted_dims[6][1]['value']:.0%} shapes how you connect. " + ("High R means deep attunement to others." if sorted_dims[6][1]['value'] > 0.6 else "Growing your R dimension will deepen your connections.")),
            ("Health & Wellness", "Your dimensional profile suggests practices that ground (E), expand (N), and integrate (Φ). Balance active (Δ) and receptive (R) practices."),
            ("Creativity", f"Your unique combination of {sorted_dims[0][0]} and {sorted_dims[1][0]} creates a creative signature. Express through {dimension_explanations[sorted_dims[0][0]]['domain'].lower()}."),
            ("Spirituality", f"With Φ at {dimensions['Φ']['value']:.0%}, " + ("your field awareness is highly developed. Witness consciousness comes naturally." if dimensions['Φ']['value'] > 0.6 else "developing witness consciousness through meditation will be transformative.")),
        ]

        for domain, guidance in domains:
            story.append(Paragraph(domain, self.styles['heading2']))
            story.append(Paragraph(guidance, self.styles['body']))
            story.append(Spacer(1, 0.15*inch))

        story.append(PageBreak())

        # ========== SECTION VII: SHADOW WORK ==========
        story.append(Paragraph("VII. Shadow Work & Integration", self.styles['heading1']))
        story.append(Spacer(1, 0.25*inch))

        story.append(Paragraph(
            "Your lowest dimensions are not weaknesses—they are invitations. The shadow lives "
            "where light has not yet reached.",
            self.styles['quote']
        ))

        # Bottom 3 dimensions
        for symbol, data in sorted_dims[-3:]:
            info = dimension_explanations.get(symbol, {})
            story.append(Paragraph(
                f'{symbol} — {info.get("name", "Unknown")} ({data["value"]:.0%})',
                self.styles['heading2']
            ))
            story.append(Paragraph(
                f"<b>Shadow Pattern:</b> {info.get('low', 'Underdeveloped expression of this frequency.')}",
                self.styles['body']
            ))
            story.append(Paragraph(
                f"<b>Integration Practice:</b> Ask yourself daily: \"{info.get('question', 'How can I grow here?')}\"",
                self.styles['body']
            ))
            story.append(Spacer(1, 0.15*inch))

        story.append(PageBreak())

        # ========== SECTION VIII: FULL 16D — KARMA ↔ DHARMA ==========
        story.append(Paragraph("VIII. The Full Equation: Karma ↔ Dharma", self.styles['heading1']))
        story.append(Spacer(1, 0.25*inch))

        story.append(Paragraph(
            "Your natal vector (Karma) is only half the story. The other half is the current sky (Dharma). "
            "The relationship between them determines your alignment with the moment.",
            self.styles['body']
        ))

        if full_16d_data:
            # Outer Octave
            story.append(Paragraph("The Outer Octave (Current Sky)", self.styles['heading2']))
            outer_str = ", ".join([f"{v:.3f}" for v in full_16d_data['outer_octave']])
            story.append(Paragraph(
                f'<font name="Courier" size="9" color="#9370DB">Dharma = [{outer_str}]</font>',
                self.styles['body_center']
            ))
            story.append(Spacer(1, 0.15*inch))

            # Coupling coefficient
            story.append(Paragraph("Coupling Coefficient (κ)", self.styles['heading2']))
            kappa = full_16d_data['coupling']
            kappa_pct = full_16d_data['coupling_percent']
            story.append(Paragraph(
                f'<font size="18" color="#d4af37">κ = {kappa:.4f} ({kappa_pct})</font>',
                self.styles['body_center']
            ))
            story.append(Paragraph(
                f"<i>{full_16d_data['interpretation']}</i>",
                self.styles['body_center']
            ))
            story.append(Spacer(1, 0.15*inch))

            # Alignment / Gap Analysis
            story.append(Paragraph("Alignment Analysis", self.styles['heading2']))
            story.append(Paragraph(
                "Where you differ from the moment creates tension. Tension is not bad—it's the engine of growth.",
                self.styles['body']
            ))

            for align in full_16d_data['alignment'][:4]:
                gap_color = "#2dd4bf" if align['gap'] > 0 else "#FF4500"
                gap_sign = "+" if align['gap'] > 0 else ""
                story.append(Paragraph(
                    f"<b>{align['dimension']}</b>: Inner={align['inner']:.2f} | Outer={align['outer']:.2f} | "
                    f'<font color="{gap_color}">Gap={gap_sign}{align["gap"]:.2f}</font>',
                    self.styles['body']
                ))
                story.append(Paragraph(f"<i>→ {align['interpretation']}</i>", self.styles['small']))

        story.append(PageBreak())

        # ========== SECTION VIII-B: VELOCITY & MOMENTUM ==========
        if velocity_data:
            story.append(Paragraph("VIII-B. Velocity: The Rate of Becoming", self.styles['heading1']))
            story.append(Spacer(1, 0.25*inch))

            story.append(Paragraph(
                "You are not static. Your alignment with the cosmos is always changing. "
                "Here is your current momentum:",
                self.styles['body']
            ))

            # Coupling Trend
            trend = velocity_data['coupling_trend']
            story.append(Paragraph("Coupling Trend (dκ/dt)", self.styles['heading2']))

            trend_data = [
                ['Past (7 days ago)', f"{trend['past']:.3f}"],
                ['Now', f"{trend['now']:.3f}"],
                ['Future (7 days)', f"{trend['future']:.3f}"],
            ]
            trend_table = Table(trend_data, colWidths=[2.5*inch, 1.5*inch])
            trend_table.setStyle(TableStyle([
                ('TEXTCOLOR', (0, 0), (-1, -1), COLORS['stardust']),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            ]))
            story.append(trend_table)
            story.append(Spacer(1, 0.1*inch))

            # Phase interpretation
            phase_color = "#2dd4bf" if "Simurgh" in trend['phase'] else "#FF4500"
            story.append(Paragraph(
                f'<font color="{phase_color}"><b>{trend["phase"]}</b></font>',
                self.styles['body_center']
            ))
            story.append(Spacer(1, 0.2*inch))

            # Dimension forecasts
            story.append(Paragraph("Dimension Forecasts", self.styles['heading2']))
            for forecast in velocity_data['forecasts'][:4]:
                story.append(Paragraph(forecast['advice'], self.styles['body']))

            story.append(PageBreak())

        # ========== SECTION VIII-C: SHADOW ANALYSIS ==========
        if shadow_data:
            story.append(Paragraph("VIII-C. Shadow Analysis", self.styles['heading1']))
            story.append(Spacer(1, 0.25*inch))

            story.append(Paragraph(
                '"The shadow is not your enemy—it is your untapped potential."',
                self.styles['quote']
            ))

            story.append(Paragraph(
                f"<b>Total Shadow Score:</b> {shadow_data['total_shadow_score']}",
                self.styles['body']
            ))
            story.append(Paragraph(
                f"<i>{shadow_data['interpretation']}</i>",
                self.styles['body']
            ))
            story.append(Spacer(1, 0.2*inch))

            # Primary shadows
            for shadow in shadow_data['shadows'][:3]:
                story.append(Paragraph(
                    f"{shadow['dimension']} — {shadow['name']} (Score: {shadow['shadow_score']})",
                    self.styles['heading3']
                ))
                for pattern in shadow['patterns'][:2]:
                    story.append(Paragraph(
                        f"<b>{pattern['type'].replace('_', ' ').title()}:</b> {pattern['description']}",
                        self.styles['body']
                    ))
                    story.append(Paragraph(
                        f"<i>Integration: {pattern['integration']}</i>",
                        self.styles['small']
                    ))
                story.append(Spacer(1, 0.1*inch))

            story.append(PageBreak())

        # ========== SECTION IX: DAILY PRACTICES ==========
        story.append(Paragraph("IX. Daily Practices", self.styles['heading1']))
        story.append(Spacer(1, 0.25*inch))

        practices = [
            ("Morning Attunement", "Upon waking, feel into your dominant dimension. Ask: 'How will I express my " + dimension_explanations[dominant[0]]['name'] + " today?'"),
            ("Midday Check-in", "Notice which dimension is active. Are you in your strengths or being pulled into shadow?"),
            ("Evening Integration", f"Before sleep, acknowledge one way you expressed {dominant[0]} and one way you stretched into {lowest[0]}."),
            ("Weekly Review", "Each week, review your 16D vector. Notice: Am I overusing my strengths? Am I avoiding my growth edges?"),
        ]

        for practice, description in practices:
            story.append(Paragraph(practice, self.styles['heading3']))
            story.append(Paragraph(description, self.styles['body']))
            story.append(Spacer(1, 0.1*inch))

        story.append(PageBreak())

        # ========== SECTION X: YOUR 16D IDENTITY TOKEN ==========
        story.append(Paragraph("X. Your 16D Identity Token", self.styles['heading1']))
        story.append(Spacer(1, 0.25*inch))

        story.append(Paragraph(
            "This is your unique 16D signature—a quantum fingerprint of your cosmic identity. "
            "You can share this with AI systems to help them understand and attune to you.",
            self.styles['body']
        ))

        story.append(Spacer(1, 0.25*inch))

        # The actual vector in a nice format
        vector_str = ", ".join([f"{v:.4f}" for v in vector])
        story.append(Paragraph(
            f'<font name="Courier" size="10" color="#d4af37">[{vector_str}]</font>',
            self.styles['body_center']
        ))

        story.append(Spacer(1, 0.25*inch))

        # Dimension breakdown table
        table_data = [['Dimension', 'Value', 'Rank']]
        for symbol, data in sorted_dims:
            table_data.append([
                f"{symbol} ({dimension_explanations[symbol]['name']})",
                f"{data['value']:.2%}",
                f"#{data['rank']}"
            ])

        t = Table(table_data, colWidths=[3*inch, 1.5*inch, 1*inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), COLORS['cosmic_purple']),
            ('TEXTCOLOR', (0, 0), (-1, 0), COLORS['stellar_gold']),
            ('TEXTCOLOR', (0, 1), (-1, -1), COLORS['stardust']),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, COLORS['void_blue']),
        ]))
        story.append(t)

        story.append(Spacer(1, 0.5*inch))

        # Final blessing
        story.append(Paragraph(
            f'"May you walk fully as yourself, {name}. '
            f'The universe shaped itself to create your unique frequency. '
            f'There has never been another exactly like you, and there never will be."',
            self.styles['quote']
        ))

        story.append(Spacer(1, 0.5*inch))
        story.append(Paragraph(
            "— FRC 893 Series | Generated with cosmic mathematics",
            self.styles['small']
        ))

        # ========== BUILD THE PDF ==========
        doc = SimpleDocTemplate(
            self.output_path,
            pagesize=letter,
            leftMargin=self.margin,
            rightMargin=self.margin,
            topMargin=self.margin,
            bottomMargin=self.margin
        )

        doc.build(story, onFirstPage=self._draw_cover_background, onLaterPages=self._draw_background)

        return self.output_path


def generate_premium_report(
    name: str,
    birth_data: dict,
    vector: list,
    dimensions: dict,
    archetypes: list,
    personality: dict,
    output_path: str,
    images: dict = None,
    full_16d_data: dict = None,
    velocity_data: dict = None,
    shadow_data: dict = None
) -> str:
    """
    Main entry point for generating a premium report.

    Args:
        name: Person's name
        birth_data: Dict with year, month, day, hour, minute, lat, lon, tz
        vector: 8-element 16D vector (Inner Octave / Karma)
        dimensions: Dict of dimension data with values and ranks
        archetypes: List of archetype matches
        personality: Dict of personality framework mappings
        output_path: Where to save the PDF
        images: Dict of pre-generated images (optional)
        full_16d_data: Full 16D data with outer octave, coupling, gap (optional)
        velocity_data: Velocity/momentum forecasts (optional)
        shadow_data: Shadow analysis (optional)

    Returns:
        Path to generated PDF
    """
    generator = PremiumReportGenerator(output_path)
    return generator.generate(
        name=name,
        birth_data=birth_data,
        vector=vector,
        dimensions=dimensions,
        archetypes=archetypes,
        personality=personality,
        images=images,
        include_images=images is not None,
        full_16d_data=full_16d_data,
        velocity_data=velocity_data,
        shadow_data=shadow_data
    )


if __name__ == "__main__":
    # Test with Hadi's data
    test_vector = [0.549, 0.411, 0.421, 0.705, 0.327, 0.760, 1.000, 0.692]
    test_dims = {
        'P': {'value': 0.549, 'name': 'Phase (Identity)', 'rank': 5},
        'E': {'value': 0.411, 'name': 'Existence (Structure)', 'rank': 7},
        'μ': {'value': 0.421, 'name': 'Mu (Cognition)', 'rank': 6},
        'V': {'value': 0.705, 'name': 'Value (Beauty)', 'rank': 3},
        'N': {'value': 0.327, 'name': 'Nu (Expansion)', 'rank': 8},
        'Δ': {'value': 0.760, 'name': 'Delta (Action)', 'rank': 2},
        'R': {'value': 1.000, 'name': 'Rho (Relational)', 'rank': 1},
        'Φ': {'value': 0.692, 'name': 'Phi (Field/Witness)', 'rank': 4},
    }
    test_archetypes = [
        {'name': 'Freya', 'tradition': 'Norse', 'match_percent': '89.2%', 'description': 'Goddess of love, beauty, and war', 'domains': ['love', 'beauty', 'magic']},
        {'name': 'Mithra', 'tradition': 'Persian', 'match_percent': '87.1%', 'description': 'God of covenant, light, and truth', 'domains': ['contracts', 'light', 'friendship']},
    ]
    test_personality = {
        'mbti': {'type': 'INFJ', 'name': 'The Advocate'},
        'enneagram': {'type': '2w3', 'name': 'The Helper'},
        'disc': {'primary': 'S', 'secondary': 'D'},
        'big_five': {'scores': {'Openness': 56, 'Conscientiousness': 65, 'Extraversion': 42, 'Agreeableness': 84, 'Neuroticism': 38}},
        'strengths_finder': {'top_5': ['Relator', 'Empathy', 'Includer', 'Developer', 'Harmony']},
        'love_language': {'primary': 'Quality Time', 'secondary': 'Words of Affirmation'},
    }

    output = generate_premium_report(
        name="Hadi Servat",
        birth_data={'year': 1990, 'month': 11, 'day': 29, 'hour': 17, 'minute': 20},
        vector=test_vector,
        dimensions=test_dims,
        archetypes=test_archetypes,
        personality=test_personality,
        output_path="/sessions/affectionate-wizardly-einstein/mnt/Hadi/AI-Family/astrology/premium_app/generated/test_premium_report.pdf"
    )
    print(f"Generated: {output}")
