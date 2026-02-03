/**
 * PDF Report Generator for The Realm of Patterns
 *
 * Generates comprehensive Diamond state analysis reports
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Types
interface DiamondDimensions {
  P: number; // Potential
  F: number; // Form
  A: number; // Awareness
  M: number; // Meaning
  T: number; // Telos
  R: number; // Response
  C: number; // Connection
  W: number; // Witness
}

interface ReportData {
  // User info
  userName?: string;
  generatedAt: Date;

  // Diamond state
  dimensions: DiamondDimensions;
  coherence: number;
  depth: number;
  time: number;

  // Derived metrics
  alchemicalStage: 'nigredo' | 'albedo' | 'citrinitas' | 'rubedo';
  dominantOperator?: string;

  // Failure diagnostics
  failureMode?: 'healthy' | 'collapse' | 'inversion' | 'dissociation' | 'dispersion';
  failureSeverity?: number;
  insights?: string[];
  interventions?: string[];

  // Transit data
  kappa?: number;
  RU?: number;
  dailyAdvice?: string;
  weeklyTrend?: Array<{ date: string; kappa: number; trend: string }>;
}

// Constants
const COLORS = {
  background: '#0a0a0f',
  gold: '#d4af37',
  amber: '#f59e0b',
  white: '#ffffff',
  gray: '#6b7280',
  green: '#10b981',
  yellow: '#eab308',
  red: '#ef4444',
  purple: '#8b5cf6',
};

const DIMENSION_NAMES: Record<keyof DiamondDimensions, string> = {
  P: 'Potential',
  F: 'Form',
  A: 'Awareness',
  M: 'Meaning',
  T: 'Telos',
  R: 'Response',
  C: 'Connection',
  W: 'Witness',
};

const STAGE_INFO = {
  nigredo: { name: 'Nigredo', desc: 'Dissolution & Shadow Work', emoji: '🌑' },
  albedo: { name: 'Albedo', desc: 'Purification & Clarity', emoji: '⚪' },
  citrinitas: { name: 'Citrinitas', desc: 'Illumination & Awakening', emoji: '🌟' },
  rubedo: { name: 'Rubedo', desc: 'Integration & Wholeness', emoji: '🔴' },
};

const FAILURE_INFO = {
  healthy: { name: 'Healthy', color: COLORS.green },
  collapse: { name: 'Collapse', color: COLORS.gray },
  inversion: { name: 'Inversion', color: COLORS.red },
  dissociation: { name: 'Dissociation', color: COLORS.purple },
  dispersion: { name: 'Dispersion', color: COLORS.yellow },
};

/**
 * Generate a PDF report from Diamond state data
 */
export function generateReport(data: ReportData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = margin;

  // Header
  y = addHeader(doc, data, y, pageWidth, margin);

  // Diamond State Section
  y = addDiamondSection(doc, data, y, pageWidth, margin);

  // Coherence Metrics
  y = addCoherenceSection(doc, data, y, pageWidth, margin);

  // Alchemical Stage
  y = addAlchemicalSection(doc, data, y, pageWidth, margin);

  // Failure Mode (if not healthy)
  if (data.failureMode && data.failureMode !== 'healthy') {
    y = addFailureSection(doc, data, y, pageWidth, margin);
  }

  // Transit Forecast (if available)
  if (data.kappa !== undefined || data.weeklyTrend) {
    y = addTransitSection(doc, data, y, pageWidth, margin);
  }

  // Insights & Recommendations
  if (data.insights?.length || data.interventions?.length) {
    y = addInsightsSection(doc, data, y, pageWidth, margin);
  }

  // Footer
  addFooter(doc, pageWidth, pageHeight, margin);

  return doc;
}

function addHeader(doc: jsPDF, data: ReportData, y: number, pageWidth: number, margin: number): number {
  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(33, 33, 33);
  doc.text('Diamond Consciousness Report', pageWidth / 2, y, { align: 'center' });
  y += 10;

  // Subtitle
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('The Realm of Patterns', pageWidth / 2, y, { align: 'center' });
  y += 8;

  // User & Date
  const dateStr = data.generatedAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (data.userName) {
    doc.text(`Prepared for: ${data.userName}`, margin, y);
  }
  doc.text(`Generated: ${dateStr}`, pageWidth - margin, y, { align: 'right' });
  y += 5;

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  return y;
}

function addDiamondSection(doc: jsPDF, data: ReportData, y: number, pageWidth: number, margin: number): number {
  // Section title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(33, 33, 33);
  doc.text('Diamond State', margin, y);
  y += 8;

  // Dimensions table
  const tableData = Object.entries(data.dimensions).map(([key, value]) => {
    const dimKey = key as keyof DiamondDimensions;
    const percentage = Math.round(value * 100);
    const bar = '█'.repeat(Math.round(value * 10)) + '░'.repeat(10 - Math.round(value * 10));
    return [key, DIMENSION_NAMES[dimKey], `${percentage}%`, bar];
  });

  autoTable(doc, {
    startY: y,
    head: [['Sym', 'Dimension', 'Value', 'Level']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [212, 175, 55],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 40 },
      2: { cellWidth: 25, halign: 'right' },
      3: { cellWidth: 50, fontStyle: 'bold', textColor: [139, 92, 246] },
    },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 10;
  return y;
}

function addCoherenceSection(doc: jsPDF, data: ReportData, y: number, pageWidth: number, margin: number): number {
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(33, 33, 33);
  doc.text('Coherence Metrics', margin, y);
  y += 8;

  const coherencePercent = Math.round(data.coherence * 100);
  const depthLevel = data.depth;
  const timeAxis = data.time > 0 ? 'Dharmic' : data.time < 0 ? 'Karmic' : 'Balanced';

  const metricsData = [
    ['Coherence (λ)', `${coherencePercent}%`, coherencePercent > 50 ? 'Strong' : 'Building'],
    ['Depth (μ)', `Level ${depthLevel}/7`, depthLevel > 4 ? 'Deep' : 'Surface'],
    ['Time Axis (θ)', `${data.time.toFixed(2)}`, timeAxis],
  ];

  if (data.kappa !== undefined) {
    metricsData.push(['Coupling (κ)', data.kappa.toFixed(3), data.kappa > 0.5 ? 'Aligned' : 'Neutral']);
  }
  if (data.RU !== undefined) {
    metricsData.push(['Resonance (RU)', data.RU.toFixed(1), data.RU > 30 ? 'High' : 'Moderate']);
  }

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value', 'Status']],
    body: metricsData,
    theme: 'grid',
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: [255, 255, 255],
    },
    styles: { fontSize: 10, cellPadding: 4 },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 10;
  return y;
}

function addAlchemicalSection(doc: jsPDF, data: ReportData, y: number, pageWidth: number, margin: number): number {
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(33, 33, 33);
  doc.text('Alchemical Stage', margin, y);
  y += 8;

  const stage = STAGE_INFO[data.alchemicalStage];

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`${stage.emoji} ${stage.name}`, margin, y);
  y += 6;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(stage.desc, margin, y);
  y += 10;

  // Stage progression bar
  const stages = ['nigredo', 'albedo', 'citrinitas', 'rubedo'];
  const currentIdx = stages.indexOf(data.alchemicalStage);
  const barWidth = (pageWidth - 2 * margin) / 4;

  stages.forEach((s, i) => {
    const x = margin + i * barWidth;
    const isActive = i <= currentIdx;
    const isCurrent = i === currentIdx;

    doc.setFillColor(isActive ? 212 : 200, isActive ? 175 : 200, isActive ? 55 : 200);
    doc.rect(x, y, barWidth - 2, 5, 'F');

    if (isCurrent) {
      doc.setFontSize(8);
      doc.setTextColor(33, 33, 33);
      doc.text(STAGE_INFO[s as keyof typeof STAGE_INFO].name, x + barWidth / 2 - 1, y + 10, { align: 'center' });
    }
  });

  y += 18;
  return y;
}

function addFailureSection(doc: jsPDF, data: ReportData, y: number, pageWidth: number, margin: number): number {
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(33, 33, 33);
  doc.text('Failure Mode Analysis', margin, y);
  y += 8;

  const mode = FAILURE_INFO[data.failureMode!];
  const severity = data.failureSeverity ?? 0;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Mode: ${mode.name}`, margin, y);
  doc.text(`Severity: ${Math.round(severity * 100)}%`, pageWidth - margin - 40, y);
  y += 10;

  return y;
}

function addTransitSection(doc: jsPDF, data: ReportData, y: number, pageWidth: number, margin: number): number {
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(33, 33, 33);
  doc.text('Transit Forecast', margin, y);
  y += 8;

  if (data.dailyAdvice) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    const lines = doc.splitTextToSize(data.dailyAdvice, pageWidth - 2 * margin);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 5;
  }

  if (data.weeklyTrend?.length) {
    const trendData = data.weeklyTrend.map(t => [
      t.date,
      t.kappa.toFixed(3),
      t.trend === 'rising' ? '↗' : t.trend === 'falling' ? '↘' : '→',
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Date', 'κ', 'Trend']],
      body: trendData,
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246] },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 2: { halign: 'center' } },
      margin: { left: margin, right: margin },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  return y;
}

function addInsightsSection(doc: jsPDF, data: ReportData, y: number, pageWidth: number, margin: number): number {
  // Check if we need a new page
  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(33, 33, 33);
  doc.text('Insights & Recommendations', margin, y);
  y += 8;

  if (data.insights?.length) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Key Insights:', margin, y);
    y += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    data.insights.slice(0, 3).forEach(insight => {
      const lines = doc.splitTextToSize(`• ${insight}`, pageWidth - 2 * margin - 5);
      doc.text(lines, margin + 5, y);
      y += lines.length * 5 + 2;
    });
    y += 5;
  }

  if (data.interventions?.length) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Recommended Actions:', margin, y);
    y += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    data.interventions.slice(0, 3).forEach((action, i) => {
      const lines = doc.splitTextToSize(`${i + 1}. ${action}`, pageWidth - 2 * margin - 5);
      doc.text(lines, margin + 5, y);
      y += lines.length * 5 + 2;
    });
  }

  return y;
}

function addFooter(doc: jsPDF, pageWidth: number, pageHeight: number, margin: number): void {
  const y = pageHeight - 15;

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y - 5, pageWidth - margin, y - 5);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text('The Realm of Patterns | Diamond Consciousness Framework', pageWidth / 2, y, { align: 'center' });
  doc.text('Generated by FRC Engine', pageWidth / 2, y + 4, { align: 'center' });
}

/**
 * Generate report and return as Blob
 */
export function generateReportBlob(data: ReportData): Blob {
  const doc = generateReport(data);
  return doc.output('blob');
}

/**
 * Generate report and return as base64
 */
export function generateReportBase64(data: ReportData): string {
  const doc = generateReport(data);
  return doc.output('datauristring');
}

/**
 * Generate report and trigger download
 */
export function downloadReport(data: ReportData, filename?: string): void {
  const doc = generateReport(data);
  const name = filename || `diamond-report-${Date.now()}.pdf`;
  doc.save(name);
}

export type { ReportData, DiamondDimensions };
