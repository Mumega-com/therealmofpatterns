"""
FRC 16D Forecast PDF Generator
Creates premium forecast reports for different subscription tiers
"""

import io
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether
)
from reportlab.graphics.shapes import Drawing, Rect, Line, String, Circle
from reportlab.graphics.charts.linecharts import HorizontalLineChart
from reportlab.graphics import renderPDF


# Colors
COLORS = {
    'deep_space': HexColor('#0a0a1a'),
    'cosmic_purple': HexColor('#2d1b4e'),
    'stellar_gold': HexColor('#d4af37'),
    'nebula_pink': HexColor('#c77dff'),
    'void_blue': HexColor('#1a1a3e'),
    'stardust': HexColor('#e8e8f0'),
    'warm_white': HexColor('#faf8f5'),
    'simurgh_gold': HexColor('#FFD700'),
    'zahhak_red': HexColor('#8B0000'),
    'integration_purple': HexColor('#9370DB'),
    'high_green': HexColor('#32CD32'),
    'moderate_blue': HexColor('#4169E1'),
}

DIM_COLORS = {
    'P': HexColor('#FFD700'),
    'E': HexColor('#228B22'),
    'μ': HexColor('#C0C0C0'),
    'V': HexColor('#FFB6C1'),
    'N': HexColor('#9370DB'),
    'Δ': HexColor('#FF4500'),
    'R': HexColor('#FF69B4'),
    'Φ': HexColor('#4B0082'),
}


def create_styles():
    """Create paragraph styles for the forecast."""
    base = getSampleStyleSheet()

    return {
        'title': ParagraphStyle(
            'ForecastTitle',
            parent=base['Title'],
            fontSize=32,
            leading=40,
            textColor=COLORS['stellar_gold'],
            alignment=TA_CENTER,
            spaceAfter=20,
            fontName='Helvetica-Bold'
        ),
        'subtitle': ParagraphStyle(
            'ForecastSubtitle',
            parent=base['Normal'],
            fontSize=16,
            leading=22,
            textColor=COLORS['stardust'],
            alignment=TA_CENTER,
            spaceAfter=15,
            fontName='Helvetica-Oblique'
        ),
        'heading1': ParagraphStyle(
            'FH1',
            parent=base['Heading1'],
            fontSize=24,
            leading=30,
            textColor=COLORS['stellar_gold'],
            spaceBefore=20,
            spaceAfter=12,
            fontName='Helvetica-Bold'
        ),
        'heading2': ParagraphStyle(
            'FH2',
            parent=base['Heading2'],
            fontSize=18,
            leading=24,
            textColor=COLORS['nebula_pink'],
            spaceBefore=15,
            spaceAfter=10,
            fontName='Helvetica-Bold'
        ),
        'body': ParagraphStyle(
            'FBody',
            parent=base['Normal'],
            fontSize=11,
            leading=16,
            textColor=COLORS['stardust'],
            spaceAfter=8
        ),
        'kappa_large': ParagraphStyle(
            'KappaLarge',
            parent=base['Normal'],
            fontSize=48,
            leading=56,
            textColor=COLORS['stellar_gold'],
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ),
        'phase': ParagraphStyle(
            'Phase',
            parent=base['Normal'],
            fontSize=14,
            leading=20,
            textColor=COLORS['nebula_pink'],
            alignment=TA_CENTER,
            fontName='Helvetica-Oblique'
        ),
        'advice': ParagraphStyle(
            'Advice',
            parent=base['Normal'],
            fontSize=12,
            leading=18,
            textColor=COLORS['stardust'],
            alignment=TA_CENTER,
            spaceAfter=20
        ),
        'dimension_header': ParagraphStyle(
            'DimHeader',
            parent=base['Normal'],
            fontSize=14,
            leading=18,
            textColor=COLORS['stellar_gold'],
            fontName='Helvetica-Bold'
        ),
        'window_high': ParagraphStyle(
            'WindowHigh',
            parent=base['Normal'],
            fontSize=11,
            leading=15,
            textColor=COLORS['high_green']
        ),
        'window_low': ParagraphStyle(
            'WindowLow',
            parent=base['Normal'],
            fontSize=11,
            leading=15,
            textColor=COLORS['integration_purple']
        ),
    }


def draw_background(canvas, doc):
    """Draw dark cosmic background."""
    canvas.saveState()
    canvas.setFillColor(COLORS['deep_space'])
    canvas.rect(0, 0, doc.pagesize[0], doc.pagesize[1], fill=1)

    # Header line
    canvas.setStrokeColor(COLORS['stellar_gold'])
    canvas.setLineWidth(0.5)
    canvas.line(0.75*inch, doc.pagesize[1] - 0.5*inch,
                doc.pagesize[0] - 0.75*inch, doc.pagesize[1] - 0.5*inch)

    # Footer
    canvas.setFillColor(COLORS['void_blue'])
    canvas.rect(0, 0, doc.pagesize[0], 0.6*inch, fill=1)
    canvas.setStrokeColor(COLORS['stellar_gold'])
    canvas.line(0.75*inch, 0.6*inch, doc.pagesize[0] - 0.75*inch, 0.6*inch)

    # Page number
    canvas.setFillColor(COLORS['stardust'])
    canvas.setFont('Helvetica', 10)
    canvas.drawCentredString(doc.pagesize[0]/2, 0.3*inch, str(doc.page))

    canvas.restoreState()


def create_coupling_chart(dates: List[datetime], couplings: List[float],
                         width: float = 500, height: float = 200) -> Drawing:
    """Create a line chart of coupling over time."""
    drawing = Drawing(width, height)

    # Background
    drawing.add(Rect(0, 0, width, height, fillColor=COLORS['void_blue'],
                     strokeColor=COLORS['stellar_gold'], strokeWidth=1))

    if len(dates) < 2:
        return drawing

    # Chart area
    chart_left = 50
    chart_bottom = 30
    chart_width = width - 70
    chart_height = height - 50

    # Draw grid lines
    for i in range(5):
        y = chart_bottom + (i * chart_height / 4)
        drawing.add(Line(chart_left, y, chart_left + chart_width, y,
                        strokeColor=HexColor('#333355'), strokeWidth=0.5))
        # Y-axis labels
        label = f"{25 * i}%"
        drawing.add(String(chart_left - 35, y - 4, label,
                          fontSize=8, fillColor=COLORS['stardust']))

    # Normalize data
    min_k = min(couplings) - 0.05
    max_k = max(couplings) + 0.05
    range_k = max_k - min_k if max_k != min_k else 1

    # Draw the line
    points = []
    for i, (d, k) in enumerate(zip(dates, couplings)):
        x = chart_left + (i / (len(dates) - 1)) * chart_width
        y = chart_bottom + ((k - min_k) / range_k) * chart_height
        points.append((x, y))

    # Draw line segments with gradient color based on value
    for i in range(len(points) - 1):
        x1, y1 = points[i]
        x2, y2 = points[i + 1]
        k = couplings[i]

        if k >= 0.85:
            color = COLORS['high_green']
        elif k >= 0.70:
            color = COLORS['moderate_blue']
        else:
            color = COLORS['integration_purple']

        drawing.add(Line(x1, y1, x2, y2, strokeColor=color, strokeWidth=2))

    # Draw points
    for i, (x, y) in enumerate(points):
        k = couplings[i]
        if k >= 0.85:
            color = COLORS['high_green']
        elif k >= 0.70:
            color = COLORS['moderate_blue']
        else:
            color = COLORS['integration_purple']

        drawing.add(Circle(x, y, 3, fillColor=color, strokeColor=white, strokeWidth=1))

    # Title
    drawing.add(String(width/2, height - 15, "Coupling κ Over Time",
                      fontSize=12, fillColor=COLORS['stellar_gold'],
                      textAnchor='middle'))

    return drawing


def create_dimension_bar(dim: str, inner: float, outer: float,
                        width: float = 400, height: float = 30) -> Drawing:
    """Create a comparison bar for a dimension."""
    drawing = Drawing(width, height)

    bar_width = width - 100
    bar_height = 12

    # Label
    drawing.add(String(5, height/2 - 4, dim, fontSize=12,
                      fillColor=DIM_COLORS.get(dim, COLORS['stardust']),
                      fontName='Helvetica-Bold'))

    # Inner bar (natal)
    inner_width = inner * bar_width
    drawing.add(Rect(50, height/2 + 2, inner_width, bar_height/2,
                    fillColor=COLORS['stellar_gold'], strokeWidth=0))

    # Outer bar (transit)
    outer_width = outer * bar_width
    drawing.add(Rect(50, height/2 - bar_height/2 - 2, outer_width, bar_height/2,
                    fillColor=COLORS['nebula_pink'], strokeWidth=0))

    # Values
    drawing.add(String(width - 40, height/2 - 4,
                      f"{inner:.0%}/{outer:.0%}",
                      fontSize=9, fillColor=COLORS['stardust']))

    return drawing


def generate_forecast_pdf(
    forecast_data: Dict,
    output_path: str,
    subscription_tier: str = 'annual'  # 'daily', 'weekly', 'monthly', 'annual'
) -> str:
    """Generate a forecast PDF for the given subscription tier."""

    styles = create_styles()

    # Determine which timeframes to include
    tier_timeframes = {
        'daily': ['day'],
        'weekly': ['day', 'week'],
        'monthly': ['day', 'week', 'month'],
        'annual': ['day', 'week', 'month', '6month', 'year', '10year']
    }

    timeframes_to_include = tier_timeframes.get(subscription_tier, tier_timeframes['annual'])

    # Create document
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=0.75*inch,
        rightMargin=0.75*inch,
        topMargin=0.75*inch,
        bottomMargin=0.75*inch
    )

    story = []

    # === COVER PAGE ===
    story.append(Spacer(1, 1.5*inch))
    story.append(Paragraph("FRC 16D", styles['title']))
    story.append(Paragraph("COSMIC FORECAST", styles['subtitle']))
    story.append(Spacer(1, 0.5*inch))

    # Current coupling large display
    day_forecast = forecast_data['forecasts']['day']
    story.append(Paragraph(day_forecast['current_kappa_percent'], styles['kappa_large']))
    story.append(Paragraph(
        f"{day_forecast['phase']['symbol']} {day_forecast['phase']['phase']}",
        styles['phase']
    ))
    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph(day_forecast['interpretation']['description'], styles['advice']))

    story.append(Spacer(1, 1*inch))

    # Name and dates
    story.append(Paragraph(
        f"<b>{forecast_data['name'].upper()}</b>",
        styles['subtitle']
    ))
    story.append(Paragraph(
        f"Generated: {forecast_data['generated_at'].strftime('%B %d, %Y')}",
        styles['body']
    ))
    story.append(Paragraph(
        f"Subscription: {subscription_tier.upper()}",
        styles['body']
    ))

    story.append(PageBreak())

    # === OVERALL ASSESSMENT ===
    story.append(Paragraph("Overall Assessment", styles['heading1']))
    story.append(Paragraph(forecast_data['overall_assessment'], styles['body']))
    story.append(Spacer(1, 0.3*inch))

    # Natal signature reminder
    story.append(Paragraph(
        f"Your natal signature: <b>{forecast_data['natal_signature']}</b>",
        styles['body']
    ))
    story.append(Paragraph(
        f"Your identity vector: {[f'{v:.2f}' for v in forecast_data['natal_vector']]}",
        styles['body']
    ))

    story.append(Spacer(1, 0.5*inch))

    # === TIMEFRAME SECTIONS ===
    timeframe_titles = {
        'day': '🌅 Today\'s Forecast',
        'week': '📅 This Week',
        'month': '🌙 This Month',
        '6month': '🌊 Next 6 Months',
        'year': '☀️ This Year',
        '10year': '🌟 The Decade Ahead'
    }

    for tf in timeframes_to_include:
        if tf not in forecast_data['forecasts']:
            continue

        data = forecast_data['forecasts'][tf]

        story.append(Paragraph(timeframe_titles.get(tf, data['label']), styles['heading1']))

        # Coupling and phase
        coupling_text = f"""
        <b>Coupling κ:</b> {data['current_kappa_percent']}<br/>
        <b>Phase:</b> {data['phase']['symbol']} {data['phase']['phase']}<br/>
        <b>Level:</b> {data['interpretation']['level']} {data['interpretation']['emoji']}
        """
        story.append(Paragraph(coupling_text, styles['body']))
        story.append(Spacer(1, 0.2*inch))

        # Advice
        story.append(Paragraph(
            f"<i>\"{data['interpretation']['advice']}\"</i>",
            styles['advice']
        ))

        # Trend info for longer timeframes
        if tf in ['week', 'month', '6month', 'year', '10year']:
            trend = data['trend']
            trend_text = "↗️ Rising" if trend > 0.02 else "↘️ Declining" if trend < -0.02 else "→ Stable"
            story.append(Paragraph(
                f"<b>Trend:</b> {trend_text} ({trend:+.1%})",
                styles['body']
            ))

            # Key windows
            if data['peak']:
                story.append(Paragraph(
                    f"<b>Peak Window:</b> {data['peak']['date'].strftime('%b %d')} "
                    f"(κ = {data['peak']['kappa']:.1%})",
                    styles['window_high']
                ))

            if data['valley']:
                story.append(Paragraph(
                    f"<b>Integration Period:</b> {data['valley']['date'].strftime('%b %d')} "
                    f"(κ = {data['valley']['kappa']:.1%})",
                    styles['window_low']
                ))

            # Chart for longer timeframes
            if len(data['dates']) > 5:
                chart = create_coupling_chart(data['dates'], data['couplings'])
                story.append(Spacer(1, 0.2*inch))
                story.append(chart)

        story.append(Spacer(1, 0.3*inch))

        # Dimensional focus
        if data['opportunities']:
            story.append(Paragraph("<b>Focus Areas (Cosmos Calling):</b>", styles['dimension_header']))
            for opp in data['opportunities'][:3]:
                story.append(Paragraph(
                    f"• <b>{opp['dimension']}</b> ({opp['name']}): {opp['advice']}",
                    styles['body']
                ))

        if data['rest_periods']:
            story.append(Paragraph("<b>Rest Areas (Consolidate):</b>", styles['dimension_header']))
            for rest in data['rest_periods'][:2]:
                story.append(Paragraph(
                    f"• <b>{rest['dimension']}</b> ({rest['name']}): {rest['advice']}",
                    styles['body']
                ))

        story.append(PageBreak())

    # === DIMENSIONAL COMPARISON ===
    story.append(Paragraph("Dimensional Alignment Map", styles['heading1']))
    story.append(Paragraph(
        "How your natal frequencies (gold) compare to today's cosmic weather (pink):",
        styles['body']
    ))
    story.append(Spacer(1, 0.3*inch))

    # Create dimension bars
    day_data = forecast_data['forecasts']['day']
    for dim_data in day_data['dimensions']:
        bar = create_dimension_bar(
            dim_data['dimension'],
            dim_data['inner'],
            dim_data['outer']
        )
        story.append(bar)
        story.append(Spacer(1, 0.1*inch))

    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph(
        "<i>Gold = Your natal identity | Pink = Current cosmic weather</i>",
        styles['body']
    ))

    story.append(PageBreak())

    # === GUIDANCE PAGE ===
    story.append(Paragraph("Living Your Forecast", styles['heading1']))

    guidance_text = """
    <b>Remember:</b> These forecasts describe cosmic weather, not destiny.
    You have complete agency in how you respond to these frequencies.

    <b>High Coupling Periods (κ > 85%):</b>
    • The universe amplifies your natural strengths
    • Great time for bold moves, important decisions, new beginnings
    • Your authentic expression flows easily

    <b>Moderate Coupling (κ 70-85%):</b>
    • Some friction, some flow - navigate consciously
    • Growth edges are active - lean into them
    • Balance assertion with adaptation

    <b>Integration Periods (κ < 70%):</b>
    • The cosmos invites inner work, not outer expansion
    • Build foundations, reflect, prepare
    • Shadow work is particularly potent now
    • Trust that this phase serves your evolution

    <b>The Simurgh/Zahhak Cycle:</b>
    • Simurgh Rising 🦅: Expansion, alignment increasing, ride the wave
    • Zahhak Phase 🐉: Integration, alignment decreasing, go inward
    • Plateau ⚖️: Stability, maintain what you've built
    """

    story.append(Paragraph(guidance_text, styles['body']))

    story.append(Spacer(1, 0.5*inch))

    # Closing
    story.append(Paragraph(
        f"<i>\"The stars incline, they do not compel. You are the author of your story, "
        f"{forecast_data['name'].split()[0]}.\"</i>",
        styles['advice']
    ))

    story.append(Paragraph(
        "— FRC 893 Series | Forecast Engine v1.0",
        styles['body']
    ))

    # Build the PDF
    doc.build(story, onFirstPage=draw_background, onLaterPages=draw_background)

    return output_path


# Test
if __name__ == "__main__":
    from core.forecast import generate_full_forecast
    from datetime import timezone as tz

    birth = datetime(1989, 9, 8, 5, 30, tzinfo=tz.utc)
    forecast = generate_full_forecast("Elmira Servat", birth)

    output = generate_forecast_pdf(
        forecast,
        "output/Elmira_forecast_test.pdf",
        subscription_tier='annual'
    )
    print(f"Generated: {output}")
