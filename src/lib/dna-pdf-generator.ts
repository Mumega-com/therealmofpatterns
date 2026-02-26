/**
 * DNA Profile PDF Generator
 *
 * Generates a 6-page "Cosmic DNA Profile" PDF — a personal AI context
 * document built from real planetary data.
 *
 * Pages:
 *   1. Cover
 *   2. 8-Dimension Map
 *   3. Cosmic Signature (archetype + stage)
 *   4. Patterns & Timing
 *   5. AI Context Block  ← the product's centerpiece
 *   6. Daily Practice
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export interface DnaProfileData {
  name: string;
  dob: string;           // YYYY-MM-DD
  vector: number[];      // 8 values 0–1
}

interface Archetype {
  title: string;
  icon: string;
  gift: string;
  shadow: string;
  quest: string;
}

// ─────────────────────────────────────────────────────────
// Data Tables
// ─────────────────────────────────────────────────────────

const ARCHETYPES: Archetype[] = [
  { title: 'The Hero',      icon: '☀', gift: 'Authentic self-expression and the courage to be seen',                        shadow: 'Ego inflation or hiding your light entirely',           quest: 'authentic power vs. ego' },
  { title: 'The Ruler',     icon: '♄', gift: 'Building lasting structures and holding things together',                      shadow: 'Rigidity — controlling because letting go feels like collapse', quest: 'order vs. letting go' },
  { title: 'The Sage',      icon: '☿', gift: 'Seeing patterns others miss and communicating complex truths simply',           shadow: 'Overthinking — living in your head while life passes by', quest: 'truth vs. paralysis' },
  { title: 'The Creator',   icon: '♀', gift: 'Creating beauty and bringing harmony to chaos',                                 shadow: 'Losing yourself in others — codependency disguised as love', quest: 'beauty vs. self-worth' },
  { title: 'The Explorer',  icon: '♃', gift: 'Finding meaning in everything and expanding horizons',                          shadow: 'Restlessness — always chasing the next thing',           quest: 'meaning vs. grounding' },
  { title: 'The Warrior',   icon: '♂', gift: 'Moving decisively when others hesitate — getting things done',                 shadow: 'Burning out — mistaking aggression for strength',        quest: 'will vs. surrender' },
  { title: 'The Caregiver', icon: '☽', gift: 'Deep empathy and the ability to make others feel truly seen',                  shadow: 'Losing your boundaries — giving until nothing remains',  quest: 'love vs. boundaries' },
  { title: 'The Mystic',    icon: '♅', gift: 'Presence and the ability to sense what others cannot see',                     shadow: 'Dissociation — escaping into the transcendent',          quest: 'transcendence vs. embodiment' },
];

const DIM_NAMES   = ['Identity','Structure','Mind','Heart','Growth','Drive','Connection','Awareness'];
const DIM_ICONS   = ['☀','♄','☿','♀','♃','♂','☽','♅'];
const DIM_RULERS  = ['Sun','Saturn','Mercury','Venus','Jupiter','Mars','Moon','Uranus / Neptune'];
const DIM_DOMAINS = [
  'Self-expression, confidence, creative authority',
  'Discipline, stability, long-term structure',
  'Communication, analysis, pattern recognition',
  'Beauty, harmony, relational intelligence',
  'Expansion, meaning, philosophical range',
  'Action, courage, decisive movement',
  'Empathy, intimacy, deep connection',
  'Intuition, presence, field awareness',
];

const STAGE_NAMES = ['Nigredo', 'Albedo', 'Citrinitas', 'Rubedo'];
const STAGE_TAGS  = ['Reset', 'Clarity', 'Growth', 'Flow'];
const STAGE_DESCRIPTIONS = [
  'You are in a period of dissolution — old structures breaking down to make space for something new. This is composting, not failure. Trust the process.',
  'The chaos has settled enough to see clearly. A period of purification and discernment. Reflect honestly on what serves you and what does not.',
  'An illumination phase — insights arriving faster than you can integrate them. Solar energy is high. Your window for bold action and creative output.',
  'The Great Work approaching completion. What was fragmented is becoming whole. Deepen commitments rather than chasing new beginnings.',
];
const STAGE_PRACTICE = [
  'Journaling, solitude, releasing what no longer serves.',
  'Meditation, reflection, honest self-assessment.',
  'Bold action, creative projects, public commitments.',
  'Integration, deepening, completing what you started.',
];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ─────────────────────────────────────────────────────────
// Color palette (RGB triples for jsPDF)
// ─────────────────────────────────────────────────────────

type RGB = [number, number, number];

const C = {
  dark:    [10,  9,   8  ] as RGB,
  dark2:   [18,  16,  11 ] as RGB,
  dark3:   [26,  23,  15 ] as RGB,
  dark4:   [35,  31,  20 ] as RGB,
  gold:    [212, 168, 84 ] as RGB,
  goldDim: [140, 110, 50 ] as RGB,
  text:    [240, 232, 216] as RGB,
  muted:   [160, 148, 128] as RGB,
  dim:     [100, 92,  75 ] as RGB,
  red:     [200, 90,  80 ] as RGB,
  line:    [45,  40,  28 ] as RGB,
  blockBg: [14,  12,  8  ] as RGB,
  amber:   [232, 200, 138] as RGB,
};

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function dominantIdx(v: number[]): number {
  return v.reduce((best, val, i) => val > v[best] ? i : best, 0);
}

function weakestIdx(v: number[]): number {
  return v.reduce((best, val, i) => val < v[best] ? i : best, 0);
}

function stageIndex(v: number[]): number {
  const avg = v.reduce((a, b) => a + b, 0) / (v.length || 1);
  return avg > 0.75 ? 3 : avg > 0.55 ? 2 : avg > 0.35 ? 1 : 0;
}

function pct(v: number): number {
  return Math.round(v * 100);
}

function block(doc: jsPDF, x: number, y: number, w: number, h: number, fill: RGB, stroke?: RGB, lineW = 0.3) {
  doc.setFillColor(...fill);
  doc.rect(x, y, w, h, 'F');
  if (stroke) {
    doc.setDrawColor(...stroke);
    doc.setLineWidth(lineW);
    doc.rect(x, y, w, h, 'S');
  }
}

function hline(doc: jsPDF, x1: number, y: number, x2: number, color: RGB = C.line, w = 0.25) {
  doc.setDrawColor(...color);
  doc.setLineWidth(w);
  doc.line(x1, y, x2, y);
}

function label(doc: jsPDF, text: string, x: number, y: number, color: RGB = C.dim, size = 7.5) {
  doc.setFontSize(size);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...color);
  doc.text(text, x, y);
}

function heading(doc: jsPDF, text: string, x: number, y: number, size = 13) {
  doc.setFontSize(size);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text(text.toUpperCase(), x, y);
}

function body(doc: jsPDF, text: string, x: number, y: number, maxW: number, color: RGB = C.text, size = 9.5): number {
  doc.setFontSize(size);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(text, maxW) as string[];
  doc.text(lines, x, y);
  return lines.length * (size * 0.42 + 0.5);   // returns height used
}

function pageBackground(doc: jsPDF, W: number, H: number) {
  block(doc, 0, 0, W, H, C.dark);
}

function pageFooter(doc: jsPDF, W: number, H: number, name: string, pageNum: number, total: number) {
  block(doc, 0, H - 10, W, 10, C.dark2);
  hline(doc, 0, H - 10, W, C.line, 0.2);
  label(doc, `Cosmic DNA Profile · ${name} · therealmofpatterns.com`, 18, H - 3.5, C.dim, 7);
  label(doc, `${pageNum} / ${total}`, W - 18, H - 3.5, C.dim, 7);
}

function sectionHeader(doc: jsPDF, text: string, x: number, y: number, W: number, M: number): number {
  heading(doc, text, x, y);
  hline(doc, x, y + 2.5, W - M, C.goldDim, 0.25);
  return y + 10;
}

// ─────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────

export function generateDnaPdf(data: DnaProfileData): void {
  const { name, dob, vector } = data;
  const [year, month, day] = dob.split('-').map(Number);
  const dom   = dominantIdx(vector);
  const weak  = weakestIdx(vector);
  const stage = stageIndex(vector);
  const arch  = ARCHETYPES[dom];

  const sorted = vector
    .map((v, i) => ({ i, v }))
    .sort((a, b) => b.v - a.v);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W  = doc.internal.pageSize.getWidth();   // 210
  const H  = doc.internal.pageSize.getHeight();  // 297
  const M  = 18;
  const CW = W - 2 * M;   // content width

  // ══════════════════════════════════════════════════════
  // PAGE 1 — COVER
  // ══════════════════════════════════════════════════════
  pageBackground(doc, W, H);

  // Gold top bar
  block(doc, 0, 0, W, 3, C.gold);

  // Subtle grid pattern (horizontal lines)
  doc.setDrawColor(...C.dark3);
  doc.setLineWidth(0.15);
  for (let yy = 30; yy < H - 20; yy += 12) {
    doc.line(0, yy, W, yy);
  }

  // Large archetype symbol
  doc.setFontSize(52);
  doc.setTextColor(...C.gold);
  doc.text(arch.icon, W / 2, 72, { align: 'center' });

  // Title block
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.dim);
  doc.text('T H E   R E A L M   O F   P A T T E R N S', W / 2, 85, { align: 'center' });

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.text);
  doc.text('COSMIC DNA PROFILE', W / 2, 97, { align: 'center' });

  // Thin gold rule
  hline(doc, M + 25, 102, W - M - 25, C.gold, 0.4);

  // Name
  doc.setFontSize(17);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.text);
  doc.text(name, W / 2, 115, { align: 'center' });

  // Archetype badge
  block(doc, M + 30, 122, CW - 60, 14, C.dark3, C.goldDim);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text(`${arch.icon}  ${arch.title}`, W / 2, 130, { align: 'center' });

  // Stage
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text(`${STAGE_NAMES[stage]}  ·  ${STAGE_TAGS[stage]}`, W / 2, 143, { align: 'center' });

  // Date of birth
  doc.setFontSize(9);
  doc.setTextColor(...C.dim);
  doc.text(`Born  ${MONTHS[month - 1]} ${day}, ${year}`, W / 2, 152, { align: 'center' });

  // Pages list (TOC style)
  const toc = [
    ['01', '8-Dimension Map'],
    ['02', 'Cosmic Signature'],
    ['03', 'Patterns & Timing'],
    ['04', 'AI Context Block'],
    ['05', 'Daily Practice'],
  ];

  let ty = 174;
  block(doc, M + 20, ty - 6, CW - 40, toc.length * 9 + 10, C.dark2, C.line);
  doc.setFontSize(7.5);
  doc.setTextColor(...C.dim);
  doc.text('CONTENTS', W / 2, ty, { align: 'center' });
  ty += 6;
  toc.forEach(([num, title]) => {
    doc.setFont('courier', 'normal');
    doc.setTextColor(...C.goldDim);
    doc.text(num, M + 26, ty);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    doc.text(title, M + 34, ty);
    ty += 8.5;
  });

  // Bottom tagline
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.dim);
  doc.text('Personal AI Context Document', W / 2, H - 20, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(60, 54, 40);
  doc.text('therealmofpatterns.com', W / 2, H - 14, { align: 'center' });

  // ══════════════════════════════════════════════════════
  // PAGE 2 — 8-DIMENSION MAP
  // ══════════════════════════════════════════════════════
  doc.addPage();
  pageBackground(doc, W, H);
  let y = M;

  y = sectionHeader(doc, '8-Dimension Map', M, y, W, M);

  // Intro sentence
  const introH = body(doc,
    `Your energy profile across 8 dimensions — computed from planetary positions at your birth. Ranked by strength. Your dominant dimension shapes your archetype; your weakest dimension is your growth edge.`,
    M, y, CW, C.muted, 8.5
  );
  y += introH + 7;

  // Dimension rows — custom rendered (not autoTable) for dark theme + bars
  sorted.forEach(({ i, v }) => {
    const p = pct(v);
    const barFull = 90;
    const barFill = barFull * v;
    const isDom   = i === dom;
    const isWeak  = i === weak;

    // Row background
    block(doc, M, y - 4, CW, 12, isDom ? C.dark4 : C.dark2);
    if (isDom) {
      hline(doc, M, y - 4, M, C.gold, 0);  // left accent
      block(doc, M, y - 4, 2, 12, C.gold); // gold left stripe
    }

    // Icon
    doc.setFontSize(10);
    doc.setTextColor(...(isDom ? C.gold : C.muted));
    doc.text(DIM_ICONS[i], M + 5, y + 3.5);

    // Name
    doc.setFontSize(9);
    doc.setFont('helvetica', isDom ? 'bold' : 'normal');
    doc.setTextColor(...(isDom ? C.text : C.muted));
    doc.text(DIM_NAMES[i], M + 13, y + 3.5);

    // Ruler (small)
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.dim);
    doc.text(DIM_RULERS[i], M + 13, y + 7.5);

    // Bar track
    const barX = M + 48;
    block(doc, barX, y, barFull, 4, C.dark3);
    // Bar fill — gold gradient approximation (solid gold, inner highlight)
    block(doc, barX, y, barFill, 4, isDom ? C.gold : C.goldDim);
    if (barFill > 6) {
      block(doc, barX, y, barFill, 1.5, C.amber);
    }

    // Percentage
    doc.setFontSize(8.5);
    doc.setFont('courier', 'bold');
    doc.setTextColor(...(isDom ? C.gold : C.muted));
    doc.text(`${p}%`, barX + barFull + 3, y + 3.5);

    // Tag
    if (isDom) {
      block(doc, barX + barFull + 14, y - 0.5, 16, 5, C.dark3, C.goldDim);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.gold);
      doc.text('DOMINANT', barX + barFull + 14.5, y + 3);
    } else if (isWeak) {
      block(doc, barX + barFull + 14, y - 0.5, 14, 5, C.dark3, C.line);
      doc.setFontSize(6);
      doc.setTextColor(...C.dim);
      doc.text('GROWTH', barX + barFull + 15, y + 3);
    }

    y += 14;
  });

  y += 4;
  hline(doc, M, y, W - M, C.line);
  y += 6;

  // Legend note
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.dim);
  doc.text('Scores computed from geocentric ephemeris data. Dominant dimension determines your primary archetype. Weakest is your growth edge.', M, y, { maxWidth: CW });

  pageFooter(doc, W, H, name, 2, 6);

  // ══════════════════════════════════════════════════════
  // PAGE 3 — COSMIC SIGNATURE
  // ══════════════════════════════════════════════════════
  doc.addPage();
  pageBackground(doc, W, H);
  y = M;

  y = sectionHeader(doc, 'Cosmic Signature', M, y, W, M);

  // Archetype card
  block(doc, M, y, CW, 38, C.dark2, C.goldDim, 0.3);
  block(doc, M, y, 3, 38, C.gold);  // left accent bar

  doc.setFontSize(22);
  doc.setTextColor(...C.gold);
  doc.text(arch.icon, M + 9, y + 15);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.text);
  doc.text(arch.title, M + 19, y + 13);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text(`Dominant dimension: ${DIM_NAMES[dom]} (${DIM_ICONS[dom]})  ·  ${pct(vector[dom])}%`, M + 19, y + 20);
  doc.text(`Quest: ${arch.quest}`, M + 19, y + 27);

  y += 44;

  // Gift / Shadow
  const giftShadowRows = [
    { label: 'GIFT',   color: C.gold,  text: arch.gift   },
    { label: 'SHADOW', color: C.red,   text: arch.shadow },
  ];
  giftShadowRows.forEach(({ label: lbl, color, text }) => {
    block(doc, M, y, CW, 14, C.dark3, C.line, 0.2);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...color);
    doc.text(lbl, M + 4, y + 9);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.text);
    const wrapped = doc.splitTextToSize(text, CW - 30) as string[];
    doc.text(wrapped[0] || '', M + 22, y + 9);
    y += 16;
  });

  y += 8;
  hline(doc, M, y, W - M, C.line);
  y += 10;

  // Alchemical Stage
  heading(doc, 'Alchemical Stage', M, y, 12);
  hline(doc, M, y + 2.5, W - M, C.goldDim, 0.2);
  y += 10;

  // Stage progress bar (4 segments)
  const segW = CW / 4;
  STAGE_NAMES.forEach((s, idx) => {
    const sx = M + idx * segW;
    const active = idx <= stage;
    const current = idx === stage;
    block(doc, sx, y, segW - 1, 7, active ? C.dark4 : C.dark2, C.line, 0.2);
    if (current) block(doc, sx, y, segW - 1, 7, C.dark3, C.gold, 0.4);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', current ? 'bold' : 'normal');
    doc.setTextColor(...(current ? C.gold : (active ? C.muted : C.dim)));
    doc.text(s, sx + (segW - 1) / 2, y + 4.5, { align: 'center' });
  });
  y += 13;

  // Stage name + tag
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.text);
  doc.text(STAGE_NAMES[stage], M, y);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.gold);
  doc.text(`— ${STAGE_TAGS[stage]}`, M + 32, y);
  y += 9;

  const stageH = body(doc, STAGE_DESCRIPTIONS[stage], M, y, CW, C.muted, 9.5);
  y += stageH + 8;

  // Practice
  block(doc, M, y, CW, 12, C.dark2, C.line, 0.2);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text('PRACTICE THIS PHASE:', M + 4, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text(STAGE_PRACTICE[stage], M + 44, y + 8);
  y += 18;

  pageFooter(doc, W, H, name, 3, 6);

  // ══════════════════════════════════════════════════════
  // PAGE 4 — PATTERNS & TIMING
  // ══════════════════════════════════════════════════════
  doc.addPage();
  pageBackground(doc, W, H);
  y = M;

  y = sectionHeader(doc, 'Patterns & Timing', M, y, W, M);

  const peakHours  = dom <= 2 ? '9–11 am, 3–5 pm' : dom <= 5 ? '10 am–12 pm, 4–6 pm' : '7–9 am, 8–10 pm';
  const commStyle  = dom === 0 ? 'Direct and vision-led — you communicate through bold statements' :
                     dom === 1 ? 'Structured and precise — you prefer frameworks and clear logic' :
                     dom === 2 ? 'Analytical and layered — you explain through patterns and models' :
                     dom === 3 ? 'Aesthetic and empathic — you communicate through feeling and beauty' :
                     dom === 4 ? 'Expansive and meaning-driven — you lead with the big picture' :
                     dom === 5 ? 'Direct and decisive — you communicate through action and brevity' :
                     dom === 6 ? 'Warm and relational — you lead with emotional intelligence' :
                                 'Intuitive and symbolic — you communicate through image and implication';
  const recovery   = dom >= 6 ? 'Solitude, nature, minimal stimulation' :
                     dom >= 4 ? 'Movement, variety, change of environment' :
                                'Deep focus, completion, structured time';
  const stressTell = ARCHETYPES[weak].shadow.split(' — ')[0];
  const bestDecDay = dom % 2 === 0 ? 'Thursday or Sunday' : 'Tuesday or Saturday';

  const patterns = [
    { k: 'Archetype',          v: arch.title },
    { k: 'Dominant dimension', v: `${DIM_NAMES[dom]} (${DIM_ICONS[dom]}) — ${pct(vector[dom])}%` },
    { k: 'Growth edge',        v: `${DIM_NAMES[weak]} (${DIM_ICONS[weak]}) — ${pct(vector[weak])}%` },
    { k: 'Communication',      v: commStyle },
    { k: 'Peak windows',       v: peakHours },
    { k: 'Recovery mode',      v: recovery },
    { k: 'Stress signature',   v: stressTell },
    { k: 'Shadow tendency',    v: arch.shadow.split(' — ')[0] },
    { k: 'Best day for decisions', v: bestDecDay },
    { k: 'Alchemical stage',   v: `${STAGE_NAMES[stage]} — ${STAGE_TAGS[stage]}` },
  ];

  patterns.forEach(({ k, v }, idx) => {
    const rowBg = idx % 2 === 0 ? C.dark2 : C.dark3;
    block(doc, M, y, CW, 11, rowBg);
    hline(doc, M, y + 11, W - M, C.line, 0.15);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.gold);
    doc.text(k, M + 4, y + 7.5);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.text);
    const lines = doc.splitTextToSize(v, CW - 58) as string[];
    doc.text(lines[0], M + 54, y + 7.5);

    y += 12;
  });

  y += 10;
  hline(doc, M, y, W - M, C.line);
  y += 8;

  // Short interpretive paragraph
  const interpText =
    `Your ${DIM_NAMES[dom].toLowerCase()} energy is your primary operating frequency — the dimension through which you naturally process experience and express yourself. When you are in flow, this dimension is fully engaged. When you are depleted, you will often find yourself attempting to operate from your shadow: ${arch.shadow.toLowerCase().split(' — ')[0]}. Your growth edge lies in the ${DIM_NAMES[weak].toLowerCase()} dimension (${pct(vector[weak])}%), which represents where your greatest untapped potential lives.`;

  body(doc, interpText, M, y, CW, C.muted, 8.5);

  pageFooter(doc, W, H, name, 4, 6);

  // ══════════════════════════════════════════════════════
  // PAGE 5 — AI CONTEXT BLOCK  (the product centrepiece)
  // ══════════════════════════════════════════════════════
  doc.addPage();
  pageBackground(doc, W, H);
  y = M;

  // Header banner
  block(doc, 0, 0, W, 12, C.dark2);
  block(doc, 0, 0, W, 2, C.gold);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text('AI CONTEXT BLOCK', W / 2, 8, { align: 'center' });

  y = 18;

  // Instruction box
  block(doc, M, y, CW, 16, C.dark3, C.line, 0.2);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text('HOW TO USE', M + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  const instrText = 'Copy the entire block below and paste it at the beginning of any conversation with ChatGPT, Claude, Gemini, or any other AI. The AI will calibrate its responses to your profile.';
  const instrLines = doc.splitTextToSize(instrText, CW - 30) as string[];
  doc.text(instrLines, M + 27, y + 6);
  y += 22;

  // ── THE BLOCK ──────────────────────────────────────────
  const blockLines = [
    '═══════════════════════════════════════════════════════════════',
    `COSMIC DNA PROFILE — ${name.toUpperCase()}`,
    `Born: ${MONTHS[month - 1]} ${day}, ${year}`,
    `Archetype: ${arch.title}`,
    `Stage: ${STAGE_NAMES[stage]} (${STAGE_TAGS[stage]})`,
    '',
    'ENERGY DIMENSIONS (strongest → weakest):',
    ...sorted.map(({ i, v: val }) =>
      `  ${DIM_ICONS[i]} ${DIM_NAMES[i].padEnd(12)} ${String(pct(val) + '%').padStart(4)}   ${DIM_DOMAINS[i].split(',')[0]}`
    ),
    '',
    `SHADOW PATTERN:   ${arch.shadow}`,
    `GROWTH EDGE:      ${DIM_NAMES[weak]} (${DIM_ICONS[weak]}) — ${pct(vector[weak])}% — work in progress`,
    `PEAK WINDOWS:     ${peakHours}`,
    `RECOVERY:         ${recovery}`,
    '',
    'USAGE: Paste this block before your question in any AI chat.',
    `       Example: "Given my profile above, [your question here]"`,
    '═══════════════════════════════════════════════════════════════',
  ];

  const blockText = blockLines.join('\n');
  const blockH = blockLines.length * 4.8 + 10;

  // Block outer container
  block(doc, M, y, CW, blockH, C.blockBg, C.gold, 0.5);
  // Inner top accent line
  block(doc, M, y, CW, 1.5, C.gold);

  // Terminal dot decorations
  const dotColors: RGB[] = [[200, 80, 80], [240, 180, 50], [80, 200, 80]];
  dotColors.forEach((col, k) => {
    doc.setFillColor(...col);
    doc.circle(M + 5 + k * 7, y + 5.5, 2, 'F');
  });
  doc.setFontSize(7);
  doc.setFont('courier', 'normal');
  doc.setTextColor(...C.dim);
  doc.text('AI Context Block — copy everything below this line', M + 28, y + 6.5);

  // Block content
  y += 11;
  doc.setFontSize(8);
  doc.setFont('courier', 'normal');
  doc.setTextColor(200, 192, 170);

  blockLines.forEach((line) => {
    // Highlight header lines
    if (line.startsWith('═')) {
      doc.setTextColor(...C.goldDim);
    } else if (line.startsWith('COSMIC DNA') || line.startsWith('Born:') || line.startsWith('Archetype:') || line.startsWith('Stage:')) {
      doc.setTextColor(...C.amber);
    } else if (line.startsWith('ENERGY') || line.startsWith('SHADOW') || line.startsWith('GROWTH') || line.startsWith('PEAK') || line.startsWith('RECOVERY') || line.startsWith('USAGE')) {
      doc.setTextColor(...C.gold);
    } else if (line.startsWith('  ')) {
      doc.setTextColor(200, 192, 170);
    } else if (line === '') {
      // skip
    } else {
      doc.setTextColor(...C.muted);
    }
    if (line !== '' || line === '') {
      doc.text(line, M + 4, y);
    }
    y += 4.8;
  });

  y += 4;

  // ── Prompt suggestions ─────────────────────────────────
  heading(doc, 'Prompt Suggestions', M, y, 10);
  y += 8;

  const prompts = [
    ['Decisions',   '"Given my profile above, should I take on [opportunity]?"'],
    ['Planning',    '"Given my profile above, plan an ideal work week for peak output."'],
    ['Blind spots', '"Given my profile above, what is my biggest blind spot right now?"'],
    ['Writing',     '"Given my profile above, help me write [email / message / post]."'],
    ['Conflict',    '"Given my profile above, how should I handle conflict with [person]?"'],
  ];

  prompts.forEach(([tag, prompt]) => {
    block(doc, M, y - 2, CW, 8, C.dark2);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.goldDim);
    doc.text(tag, M + 3, y + 3.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    doc.text(prompt, M + 28, y + 3.5);
    y += 9;
  });

  pageFooter(doc, W, H, name, 5, 6);

  // ══════════════════════════════════════════════════════
  // PAGE 6 — DAILY PRACTICE
  // ══════════════════════════════════════════════════════
  doc.addPage();
  pageBackground(doc, W, H);
  y = M;

  y = sectionHeader(doc, 'Daily Practice', M, y, W, M);

  const practices = [
    {
      time: 'Morning',
      action: `Ask yourself: "Am I expressing my ${DIM_NAMES[dom].toLowerCase()} today, or am I suppressing it?" A 10-second check-in before the day starts.`,
    },
    {
      time: 'Before decisions',
      action: `Run the shadow check: "Am I acting from ${arch.title} clarity — or from my shadow (${arch.shadow.split(' — ')[0].toLowerCase()})?" One question cuts through noise.`,
    },
    {
      time: 'With AI tools',
      action: `Paste your AI Context Block (page 5) before asking for advice, writing help, planning, or conflict resolution. The AI calibrates to your energy.`,
    },
    {
      time: 'Peak windows',
      action: `Protect ${peakHours} for your most demanding work. These are your high-coherence windows. Guard them from meetings and admin.`,
    },
    {
      time: 'Stress signals',
      action: `When you notice "${stressTell.toLowerCase()}" appearing in your behaviour, that is your ${DIM_NAMES[weak].toLowerCase()} dimension under pressure. Pause, recover, realign.`,
    },
    {
      time: 'Weekly',
      action: `Reflect: when did I feel most in flow this week? Most drained? Map those moments to your dimensions. Patterns emerge quickly.`,
    },
    {
      time: 'Monthly',
      action: `Your stage may shift. If your energy has moved to a new phase, update your AI Context Block to reflect the new stage and adjusted kappa.`,
    },
  ];

  practices.forEach(({ time, action }, idx) => {
    const rowBg = idx % 2 === 0 ? C.dark2 : C.dark3;
    const lineCount = doc.splitTextToSize(action, CW - 46).length as number;
    const rowH = Math.max(14, lineCount * 5 + 7);

    block(doc, M, y, CW, rowH, rowBg, C.line, 0.15);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.gold);
    doc.text(time, M + 4, y + 9);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    const lines = doc.splitTextToSize(action, CW - 46) as string[];
    doc.text(lines, M + 44, y + 6);

    y += rowH + 1;
  });

  y += 10;

  // App upsell card
  block(doc, M, y, CW, 28, C.dark2, C.goldDim, 0.4);
  block(doc, M, y, CW, 1.5, C.gold);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.text);
  doc.text('Track your energy as it evolves — free', M + 5, y + 11);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text('Daily check-ins · 8D energy history · Streak tracking · Personalized AI forecasts', M + 5, y + 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text('therealmofpatterns.com', M + 5, y + 24);

  pageFooter(doc, W, H, name, 6, 6);

  // ── Save ──────────────────────────────────────────────
  const filename = `cosmic-dna-${name.toLowerCase().replace(/\s+/g, '-')}-${dob}.pdf`;
  doc.save(filename);
}
