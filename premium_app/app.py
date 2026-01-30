"""
FRC 16D Premium Report Web Application
With Stripe payment, Gemini image generation, and downloadable 16D tokens
"""
import os
import sys
import json
import uuid
import asyncio
from datetime import datetime
from functools import wraps

# Add parent directory for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, render_template, request, jsonify, redirect, url_for, send_file, session
import stripe

from config import (
    STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET,
    PRODUCTS, APP_NAME, BASE_URL, SECRET_KEY, PDF_OUTPUT_DIR
)

# Initialize Flask
app = Flask(__name__)
app.secret_key = SECRET_KEY

# Initialize Stripe
stripe.api_key = STRIPE_SECRET_KEY

# Ensure output directory exists
os.makedirs(f"generated", exist_ok=True)


# ============ CORE 16D COMPUTATION ============

def compute_16d_vector(birth_data: dict) -> dict:
    """Compute 16D vector from birth data."""
    try:
        from core_16d import compute_16d_profile
        return compute_16d_profile(
            year=birth_data['year'],
            month=birth_data['month'],
            day=birth_data['day'],
            hour=birth_data.get('hour', 12),
            minute=birth_data.get('minute', 0),
            lat=birth_data.get('latitude', 0),
            lon=birth_data.get('longitude', 0),
            tz_offset=birth_data.get('timezone_offset', 0)
        )
    except Exception as e:
        print(f"Error computing 16D: {e}")
        # Fallback computation
        import math
        import ephem
        from datetime import datetime as dt

        # Simplified computation
        birth_dt = dt(
            birth_data['year'],
            birth_data['month'],
            birth_data['day'],
            birth_data.get('hour', 12),
            birth_data.get('minute', 0)
        )

        # Use day of year as seed for reproducible results
        day_of_year = birth_dt.timetuple().tm_yday
        year_factor = (birth_data['year'] - 1900) / 150

        # Generate 8 dimensions based on date
        dims = []
        for i in range(8):
            angle = (day_of_year + i * 45 + year_factor * 30) * math.pi / 180
            value = (math.cos(angle * (i + 1)) + 1) / 2
            dims.append(round(value, 3))

        # Normalize
        max_val = max(dims)
        dims = [round(d / max_val, 3) for d in dims]

        dim_names = ['P', 'E', 'μ', 'V', 'N', 'Δ', 'R', 'Φ']
        dimensions = {}
        for i, (sym, val) in enumerate(zip(dim_names, dims)):
            dimensions[sym] = {
                'value': val,
                'name': ['Phase', 'Existence', 'Cognition', 'Value', 'Expansion', 'Action', 'Relational', 'Field'][i],
                'rank': 0
            }

        # Assign ranks
        sorted_dims = sorted(dimensions.items(), key=lambda x: x[1]['value'], reverse=True)
        for rank, (sym, data) in enumerate(sorted_dims, 1):
            dimensions[sym]['rank'] = rank

        return {
            'vector': dims,
            'dimensions': dimensions
        }


def compute_personality(vector: list) -> dict:
    """Derive personality frameworks from 16D vector."""
    try:
        from personality_derivation import derive_all_frameworks
        return derive_all_frameworks(vector)
    except Exception as e:
        print(f"Error deriving personality: {e}")
        return {
            'mbti': {'type': 'INFJ', 'name': 'The Advocate'},
            'enneagram': {'type': '2w3', 'name': 'The Helper'},
            'disc': {'primary': 'S'},
            'big_five': {'scores': {'Openness': 50, 'Conscientiousness': 50, 'Extraversion': 50, 'Agreeableness': 50, 'Neuroticism': 50}},
            'strengths_finder': {'top_5': ['Relator', 'Empathy', 'Includer', 'Developer', 'Harmony']},
            'love_language': {'primary': 'Quality Time'},
        }


def find_archetypes(vector: list) -> list:
    """Find matching archetypes and historical figures."""
    from historical_figures import find_historical_matches

    matches = find_historical_matches(vector, top_n=10)
    return matches


# ============ ROUTES ============

@app.route('/')
def index():
    """Landing page."""
    return render_template('index.html',
                         app_name=APP_NAME,
                         stripe_key=STRIPE_PUBLISHABLE_KEY,
                         products=PRODUCTS)


@app.route('/checkout', methods=['POST'])
def create_checkout_session():
    """Create Stripe checkout session."""
    try:
        data = request.json
        product_id = data.get('product_id', 'premium_16d_report')
        birth_data = data.get('birth_data', {})

        # Store birth data in session for webhook
        order_id = str(uuid.uuid4())
        session['order_id'] = order_id
        session['birth_data'] = birth_data
        session['name'] = data.get('name', 'Unknown')

        # Create Stripe checkout session
        product = PRODUCTS.get(product_id, PRODUCTS['premium_16d_report'])

        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': product['currency'],
                    'unit_amount': product['price'],
                    'product_data': {
                        'name': product['name'],
                        'description': product['description'],
                    },
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{BASE_URL}/success?session_id={{CHECKOUT_SESSION_ID}}&order_id={order_id}",
            cancel_url=f"{BASE_URL}/cancel",
            metadata={
                'order_id': order_id,
                'name': data.get('name', 'Unknown'),
                'birth_data': json.dumps(birth_data)
            }
        )

        return jsonify({'id': checkout_session.id, 'url': checkout_session.url})

    except Exception as e:
        return jsonify(error=str(e)), 403


@app.route('/success')
def success():
    """Payment success page - generate the report."""
    session_id = request.args.get('session_id')
    order_id = request.args.get('order_id')

    try:
        # Retrieve session from Stripe
        checkout_session = stripe.checkout.Session.retrieve(session_id)

        if checkout_session.payment_status == 'paid':
            # Get metadata
            name = checkout_session.metadata.get('name', 'Unknown')
            birth_data = json.loads(checkout_session.metadata.get('birth_data', '{}'))

            # Generate report asynchronously
            return render_template('generating.html',
                                 name=name,
                                 order_id=order_id)
        else:
            return render_template('error.html', message="Payment not completed")

    except Exception as e:
        return render_template('error.html', message=str(e))


@app.route('/generate/<order_id>', methods=['POST'])
def generate_report(order_id):
    """Generate the report (called via AJAX from success page)."""
    try:
        data = request.json
        name = data.get('name', 'Unknown')
        birth_data = data.get('birth_data', {})
        include_images = data.get('include_images', True)

        # Compute 16D
        profile = compute_16d_vector(birth_data)
        vector = profile['vector']
        dimensions = profile['dimensions']

        # Get personality mappings
        personality = compute_personality(vector)

        # Get historical matches
        archetypes = find_archetypes(vector)

        # Generate images if requested
        images = None
        if include_images:
            try:
                from gemini_images import FRC16DImageGenerator
                generator = FRC16DImageGenerator()

                # Find dominant dimension
                sorted_dims = sorted(dimensions.items(), key=lambda x: x[1]['rank'])
                dominant = sorted_dims[0][0]

                # Generate images (this could take a while)
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                images = loop.run_until_complete(
                    generator.generate_all_report_images(
                        name=name,
                        vector=vector,
                        dimensions=dimensions,
                        dominant=dominant,
                        archetypes=archetypes
                    )
                )
                loop.close()
            except Exception as img_error:
                print(f"Image generation error: {img_error}")
                images = None

        # Generate PDF
        from premium_pdf import generate_premium_report

        output_path = f"generated/{order_id}_report.pdf"
        generate_premium_report(
            name=name,
            birth_data=birth_data,
            vector=vector,
            dimensions=dimensions,
            archetypes=archetypes,
            personality=personality,
            output_path=output_path,
            images=images
        )

        # Generate downloadable 16D JSON
        identity_token = {
            "schema": "FRC-16D-v1",
            "name": name,
            "vector": vector,
            "dimensions": dimensions,
            "generated_at": datetime.utcnow().isoformat(),
            "birth_data": {
                "year": birth_data.get('year'),
                "month": birth_data.get('month'),
                "day": birth_data.get('day')
            },
            "archetypes": [
                {"name": a['name'], "resonance": a['resonance']}
                for a in archetypes[:5]
            ],
            "personality": {
                "mbti": personality.get('mbti', {}).get('type'),
                "enneagram": personality.get('enneagram', {}).get('type')
            },
            "usage": {
                "for_ai_models": "Load this JSON to give AI systems your 16D shape",
                "for_humans": "Share your cosmic signature with others"
            }
        }

        json_path = f"generated/{order_id}_16d.json"
        with open(json_path, 'w') as f:
            json.dump(identity_token, f, indent=2)

        return jsonify({
            'success': True,
            'pdf_url': f"/download/{order_id}/pdf",
            'json_url': f"/download/{order_id}/json",
            'vector': vector,
            'dominant': sorted_dims[0][1]['name'] if sorted_dims else 'Unknown',
            'archetypes': [a['name'] for a in archetypes[:3]]
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/download/<order_id>/<file_type>')
def download_file(order_id, file_type):
    """Download generated files."""
    if file_type == 'pdf':
        path = f"generated/{order_id}_report.pdf"
        filename = f"FRC_16D_Premium_Report.pdf"
        mimetype = 'application/pdf'
    elif file_type == 'json':
        path = f"generated/{order_id}_16d.json"
        filename = f"my_16d_identity.json"
        mimetype = 'application/json'
    else:
        return "Invalid file type", 400

    if os.path.exists(path):
        return send_file(path, as_attachment=True, download_name=filename, mimetype=mimetype)
    else:
        return "File not found", 404


@app.route('/preview', methods=['POST'])
def preview():
    """Free preview - show primary archetype only."""
    try:
        data = request.json
        birth_data = data.get('birth_data', {})

        # Compute 16D
        profile = compute_16d_vector(birth_data)
        vector = profile['vector']
        dimensions = profile['dimensions']

        # Get top archetype only (free tier)
        archetypes = find_archetypes(vector)
        primary = archetypes[0] if archetypes else None

        # Find dominant dimension
        sorted_dims = sorted(dimensions.items(), key=lambda x: x[1]['rank'])
        dominant = sorted_dims[0] if sorted_dims else None

        return jsonify({
            'success': True,
            'vector': vector,
            'dominant': {
                'symbol': dominant[0] if dominant else '?',
                'name': dominant[1]['name'] if dominant else 'Unknown',
                'value': dominant[1]['value'] if dominant else 0
            },
            'primary_archetype': {
                'name': primary['name'] if primary else 'Unknown',
                'culture': primary.get('culture', 'Unknown') if primary else 'Unknown',
                'resonance': primary['match_percent'] if primary else '0%',
                'quote': primary.get('quote', '') if primary else ''
            },
            'teaser': "Unlock your full report to see all 10 historical matches, detailed personality analysis, and AI-generated art unique to your cosmic signature."
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/webhook', methods=['POST'])
def webhook():
    """Handle Stripe webhooks."""
    payload = request.data
    sig_header = request.headers.get('Stripe-Signature')

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        return 'Invalid payload', 400
    except stripe.error.SignatureVerificationError as e:
        return 'Invalid signature', 400

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        # Payment confirmed - could trigger email here
        print(f"Payment completed for order: {session.metadata.get('order_id')}")

    return '', 200


@app.route('/cancel')
def cancel():
    """Payment cancelled."""
    return render_template('cancel.html')


# ============ PHYSICAL PRODUCTS ============

@app.route('/products')
def products_page():
    """Page for physical products (prints, booklets)."""
    return render_template('products.html', products={
        'art_print': {
            'name': 'Custom 16D Art Print',
            'price': 14900,  # $149
            'description': 'Museum-quality giclée print of your unique 16D visualization',
            'sizes': ['12x16', '18x24', '24x32']
        },
        'booklet': {
            'name': 'Premium Hardcover Booklet',
            'price': 29900,  # $299
            'description': 'Your complete report as a luxury hardcover booklet with gilded edges',
            'pages': '48 pages'
        },
        'complete_bundle': {
            'name': 'Complete Identity Bundle',
            'price': 69700,  # $697
            'description': 'PDF Report + Art Print + Hardcover Booklet + 16D Identity Token',
            'includes': ['Premium PDF', '18x24 Print', 'Hardcover Booklet', 'Identity JSON']
        }
    })


# ============ API FOR AI MODELS ============

@app.route('/api/v1/load_identity', methods=['POST'])
def load_identity():
    """
    API endpoint for AI models to load a user's 16D identity.
    Users can share their JSON token and AI models can understand them better.
    """
    try:
        data = request.json
        identity = data.get('identity', {})

        if identity.get('schema') != 'FRC-16D-v1':
            return jsonify({'error': 'Invalid identity schema'}), 400

        vector = identity.get('vector', [])
        name = identity.get('name', 'Unknown')

        # Return interpretation for AI to use
        return jsonify({
            'success': True,
            'interpretation': {
                'name': name,
                'vector': vector,
                'dominant_energies': [
                    d for d, v in sorted(
                        zip(['P', 'E', 'μ', 'V', 'N', 'Δ', 'R', 'Φ'], vector),
                        key=lambda x: x[1], reverse=True
                    )[:3]
                ],
                'communication_style': interpret_communication_style(vector),
                'preferred_interaction': interpret_interaction_style(vector)
            }
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


def interpret_communication_style(vector):
    """Interpret how to communicate with this person based on 16D."""
    P, E, μ, V, N, Δ, R, Φ = vector

    style = []
    if μ > 0.7:
        style.append("appreciates clear, logical explanations")
    if R > 0.7:
        style.append("values emotional connection and warmth")
    if Δ > 0.7:
        style.append("prefers direct, action-oriented communication")
    if V > 0.7:
        style.append("responds to beauty and aesthetic presentation")
    if Φ > 0.7:
        style.append("appreciates depth and philosophical exploration")

    return style if style else ["balanced communication style"]


def interpret_interaction_style(vector):
    """Interpret preferred interaction patterns."""
    P, E, μ, V, N, Δ, R, Φ = vector

    if R > 0.8:
        return "Seeks deep connection. Give space for emotional expression."
    elif Δ > 0.8:
        return "Action-oriented. Keep discussions focused on outcomes."
    elif μ > 0.8:
        return "Intellectually curious. Engage with ideas and concepts."
    elif Φ > 0.8:
        return "Contemplative. Allow silence and depth."
    else:
        return "Balanced. Adapt to context."


# ============ TEMPLATES ============

# Create templates directory
os.makedirs('templates', exist_ok=True)


# ============ MAIN ============

if __name__ == '__main__':
    app.run(debug=True, port=5000)
