/**
 * PDF Report Generation API
 *
 * POST /api/generate-report
 * Generates a Diamond consciousness report PDF
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateReportBlob, type ReportData } from '@/lib/pdf-generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.dimensions) {
      return NextResponse.json(
        { error: 'Missing required field: dimensions' },
        { status: 400 }
      );
    }

    // Build report data from request
    const reportData: ReportData = {
      userName: body.userName,
      generatedAt: new Date(),

      // Diamond state
      dimensions: {
        P: body.dimensions.P ?? body.dimensions[0] ?? 0.5,
        F: body.dimensions.F ?? body.dimensions[1] ?? 0.5,
        A: body.dimensions.A ?? body.dimensions[2] ?? 0.5,
        M: body.dimensions.M ?? body.dimensions[3] ?? 0.5,
        T: body.dimensions.T ?? body.dimensions[4] ?? 0.5,
        R: body.dimensions.R ?? body.dimensions[5] ?? 0.5,
        C: body.dimensions.C ?? body.dimensions[6] ?? 0.5,
        W: body.dimensions.W ?? body.dimensions[7] ?? 0.5,
      },
      coherence: body.coherence ?? 0.5,
      depth: body.depth ?? 3,
      time: body.time ?? 0,

      // Alchemical stage
      alchemicalStage: body.alchemicalStage ?? determineStage(body.coherence ?? 0.5),

      // Failure mode (optional)
      failureMode: body.failureMode,
      failureSeverity: body.failureSeverity,
      insights: body.insights,
      interventions: body.interventions,

      // Transit data (optional)
      kappa: body.kappa,
      RU: body.RU,
      dailyAdvice: body.dailyAdvice,
      weeklyTrend: body.weeklyTrend,
    };

    // Generate PDF
    const pdfBlob = generateReportBlob(reportData);

    // Convert blob to array buffer
    const arrayBuffer = await pdfBlob.arrayBuffer();

    // Return PDF with proper headers
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="diamond-report-${Date.now()}.pdf"`,
        'Content-Length': arrayBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Determine alchemical stage from coherence
 */
function determineStage(coherence: number): 'nigredo' | 'albedo' | 'citrinitas' | 'rubedo' {
  if (coherence < 0.25) return 'nigredo';
  if (coherence < 0.5) return 'albedo';
  if (coherence < 0.75) return 'citrinitas';
  return 'rubedo';
}

// GET endpoint for documentation
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/generate-report',
    method: 'POST',
    description: 'Generate a Diamond consciousness PDF report',
    body: {
      required: {
        dimensions: 'Object with P, F, A, M, T, R, C, W values (0-1)',
      },
      optional: {
        userName: 'string',
        coherence: 'number (0-1)',
        depth: 'number (0-7)',
        time: 'number (-1 to 1)',
        alchemicalStage: 'nigredo | albedo | citrinitas | rubedo',
        failureMode: 'healthy | collapse | inversion | dissociation | dispersion',
        failureSeverity: 'number (0-1)',
        insights: 'string[]',
        interventions: 'string[]',
        kappa: 'number (-1 to 1)',
        RU: 'number',
        dailyAdvice: 'string',
        weeklyTrend: 'Array<{ date: string; kappa: number; trend: string }>',
      },
    },
    response: 'application/pdf binary',
  });
}
