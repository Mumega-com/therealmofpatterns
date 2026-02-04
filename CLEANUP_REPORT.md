# Codebase Cleanup & Analysis Report

**Date:** February 4, 2026
**Scope:** Root directory, `core/`, `premium_app/`, `art/`, `lambda_field/`

## 1. Executive Summary
The codebase contains a mix of active production services (`core`, `premium_app`, `cosmic-channel`) and legacy/experimental prototypes. Significant cleanup opportunities exist in the root directory and the `lambda_field` module. There is also architectural duplication between Python and TypeScript implementations of the core engine.

## 2. Immediate Cleanup Opportunities (Safe to Delete)

These files appear to be legacy prototypes superseded by the `premium_app` module or `core` backend.

| File/Directory | Status | Recommendation | Reason |
| :--- | :--- | :--- | :--- |
| `forecast_pdf.py` | **Dead** | Delete | Superseded by `premium_app/premium_pdf.py` (identical imports, less features). |
| `generate_forecast.py` | **Dead** | Delete | CLI wrapper for the legacy `forecast_pdf.py`. |
| `generate_report.py` | **Dead** | Delete | Legacy CLI script. |
| `lambda_field/` | **Abandoned** | Delete | Standalone module with no references in `core`, `premium_app`, or `src`. |

## 3. Redundant Components & Architectural Debt

These areas represent functional duplication. While not immediately "dead," they represent maintenance overhead.

### A. Dual 16D Engine Implementation
*   **Python:** `core/frc_16d.py` & `core/frc_16d_full_spec.py` (Backend/Research)
*   **TypeScript:** `src/lib/16d-engine.ts` & `src/lib/16d-engine-full.ts` (Frontend/Workers)
*   **Impact:** Any change to the FRC algorithm must be implemented twice.
*   **Recommendation:** Treat Python as the "Source of Truth" for complex calculations/research. If performance allows, consider consolidating or using WASM, but for now, verify parity via tests.

### B. Image Generation Logic
*   **Active:** `premium_app/gemini_images.py` (Gemini 2.0 Flash) - Likely used in production.
*   **Research:** `art/grok_images.py` (xAI Grok) - Likely an experiment or alternative implementation.
*   **Recommendation:** Move `art/` scripts to `tools/` or `scripts/research/` to clarify they are not part of the active request path, or consolidate if multi-model support is desired in `premium_app`.

## 4. Integration Status

| Module | Status | Role |
| :--- | :--- | :--- |
| `core/` | **Active** | Primary Python FastAPI backend (Dockerized). |
| `premium_app/` | **Active** | Flask-based premium report generator (Stripe, PDF, Gemini). |
| `cosmic-channel/` | **Active** | Cloudflare Worker for real-time/theater features. |
| `functions/` | **Active** | Cloudflare Pages Functions (API endpoints, webhooks). |

## 5. Action Plan

1.  **Delete** the legacy root scripts: `forecast_pdf.py`, `generate_forecast.py`, `generate_report.py`.
2.  **Delete** the unused `lambda_field/` directory.
3.  **Consolidate** `art/` scripts. Suggest creating a `research/` or `tools/` directory if you wish to keep the Grok implementation, otherwise confirm if it can be archived.
