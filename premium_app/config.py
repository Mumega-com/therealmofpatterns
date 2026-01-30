"""
Configuration for FRC 16D Premium Report System
"""
import os

# Stripe Configuration
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "sk_test_...")
STRIPE_PUBLISHABLE_KEY = os.environ.get("STRIPE_PUBLISHABLE_KEY", "pk_test_...")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "whsec_...")

# Gemini Configuration
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

# Product Pricing
PRODUCTS = {
    "premium_16d_report": {
        "name": "FRC 16D Premium Natal Report",
        "price": 49700,  # $497 in cents
        "currency": "usd",
        "description": "Complete 40+ page personalized cosmic identity report with AI-generated imagery"
    },
    "couples_resonance": {
        "name": "FRC 16D Couples Resonance Report",
        "price": 79700,  # $797 in cents
        "currency": "usd",
        "description": "Comprehensive relationship analysis with dual 16D profiles"
    }
}

# App Configuration
APP_NAME = "FRC 16D Premium Reports"
BASE_URL = os.environ.get("BASE_URL", "http://localhost:5000")
SECRET_KEY = os.environ.get("FLASK_SECRET_KEY", "dev-key-change-in-production")

# PDF Settings
PDF_OUTPUT_DIR = "generated"
COMPANY_NAME = "FRC Institute"
REPORT_VERSION = "1.0"
