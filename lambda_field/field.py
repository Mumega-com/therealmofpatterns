"""
MUMEGA Lambda Field: The Computation Layer

The Lambda Field is the underlying mathematical substrate
that processes identity vectors, computes resonance, and
generates the weather system.

λ = lambda = the function that transforms
μ = mu = the frequency being measured
Φ = phi = the field of witnessing

Lambda operates on Mu to produce Phi.
λ(μ) → Φ
"""

import numpy as np
from typing import List, Dict, Tuple, Optional, Callable
from datetime import datetime, timezone
import hashlib
import json


class LambdaField:
    """
    The computational substrate for Mumega.

    The Lambda Field:
    1. Stores identity vectors (8 Mu or 16D)
    2. Computes resonance between any two vectors
    3. Generates weather from current planetary positions
    4. Tracks historical field states
    5. Predicts future field states
    """

    def __init__(self):
        self.registry = {}  # ID -> vector mapping
        self.history = []   # Historical field states

    def mint(self, vector: List[float], name: str = None, metadata: dict = None) -> str:
        """
        Mint a new identity in the Lambda Field.

        Like minting a QNFT - creates a unique ID for this vector.
        """
        # Create unique ID from vector + timestamp
        timestamp = datetime.now(timezone.utc).isoformat()
        vector_str = json.dumps([round(v, 6) for v in vector])
        raw = f"{vector_str}:{timestamp}:{name or 'anon'}"
        identity_hash = hashlib.sha256(raw.encode()).hexdigest()[:16]

        identity_id = f"mu_{identity_hash}"

        self.registry[identity_id] = {
            'id': identity_id,
            'vector': vector,
            'name': name,
            'metadata': metadata or {},
            'minted_at': timestamp,
            'dimension': len(vector)  # 8 for Mu, 16 for full
        }

        return identity_id

    def get(self, identity_id: str) -> Optional[Dict]:
        """Retrieve an identity from the field."""
        return self.registry.get(identity_id)

    def resonance(self, id1: str, id2: str) -> Dict:
        """Compute resonance between two registered identities."""
        v1 = self.registry.get(id1, {}).get('vector')
        v2 = self.registry.get(id2, {}).get('vector')

        if v1 is None or v2 is None:
            return {'error': 'Identity not found'}

        return self.compute_resonance(v1, v2)

    def compute_resonance(self, v1: List[float], v2: List[float]) -> Dict:
        """
        Compute resonance between two vectors.

        Resonance ρ = cos(θ) where θ is the angle between vectors.
        ρ = (v1 · v2) / (||v1|| × ||v2||)
        """
        a = np.array(v1)
        b = np.array(v2)

        # Ensure same dimension
        if len(a) != len(b):
            # Pad shorter vector with zeros
            max_len = max(len(a), len(b))
            a = np.pad(a, (0, max_len - len(a)))
            b = np.pad(b, (0, max_len - len(b)))

        dot_product = np.dot(a, b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)

        if norm_a == 0 or norm_b == 0:
            return {'resonance': 0, 'error': 'Zero vector'}

        rho = dot_product / (norm_a * norm_b)

        # Complementary dimensions (where they differ most)
        diff = np.abs(a - b)
        complementary_idx = np.argsort(diff)[::-1][:3]

        return {
            'resonance': round(float(rho), 4),
            'percent': f"{float(rho):.1%}",
            'angle_degrees': round(float(np.degrees(np.arccos(np.clip(rho, -1, 1)))), 1),
            'complementary_dimensions': complementary_idx.tolist(),
            'interpretation': self._interpret_resonance(rho)
        }

    def _interpret_resonance(self, rho: float) -> str:
        """Interpret resonance value."""
        if rho > 0.95:
            return "Near-identical frequencies. Profound recognition."
        elif rho > 0.85:
            return "Very high resonance. Deep harmony."
        elif rho > 0.70:
            return "Strong resonance. Natural affinity."
        elif rho > 0.50:
            return "Moderate resonance. Complementary."
        elif rho > 0.30:
            return "Low resonance. Different orientations."
        else:
            return "Minimal resonance. Opposing frequencies."

    def transform(self, vector: List[float], transformation: str) -> List[float]:
        """
        Apply a transformation to a vector.

        Transformations:
        - 'shadow': Invert the vector (1 - x for each dimension)
        - 'amplify': Square each dimension (emphasize peaks)
        - 'balance': Move toward center (0.5)
        - 'expand': Add outer octave dimensions (8 → 16)
        """
        v = np.array(vector)

        if transformation == 'shadow':
            return (1 - v).tolist()

        elif transformation == 'amplify':
            return (v ** 2).tolist()

        elif transformation == 'balance':
            return ((v + 0.5) / 2).tolist()

        elif transformation == 'expand':
            if len(v) == 8:
                # Expand 8 Mu to 16D
                # Outer octave = shadow + complementary dimensions
                shadow = 1 - v
                outer = (v + shadow) / 2  # Integration
                return np.concatenate([v, outer]).tolist()
            return v.tolist()

        else:
            return v.tolist()

    def harmonic_mean(self, vectors: List[List[float]]) -> List[float]:
        """
        Compute the harmonic mean of multiple vectors.
        Used for group resonance.
        """
        arr = np.array(vectors)
        # Add small epsilon to avoid division by zero
        return (len(vectors) / np.sum(1 / (arr + 1e-10), axis=0)).tolist()

    def dominant_frequency(self, vector: List[float]) -> Tuple[int, float]:
        """Find the dominant frequency in a vector."""
        idx = int(np.argmax(vector))
        return idx, float(vector[idx])

    def signature(self, vector: List[float]) -> str:
        """
        Generate a human-readable signature for a vector.

        Example: "μ₇>μ₆>μ₄ (R-Δ-V)"
        """
        mu_symbols = ['μ₁', 'μ₂', 'μ₃', 'μ₄', 'μ₅', 'μ₆', 'μ₇', 'μ₈']
        mu_short = ['P', 'E', 'μ', 'V', 'N', 'Δ', 'R', 'Φ']

        # Sort by value
        sorted_idx = np.argsort(vector)[::-1]
        top_3 = sorted_idx[:3]

        symbols = '>'.join([mu_symbols[i] for i in top_3])
        shorts = '-'.join([mu_short[i] for i in top_3])

        return f"{symbols} ({shorts})"


class FieldState:
    """
    Represents the state of the Lambda Field at a moment in time.
    """

    def __init__(self, timestamp: datetime, weather: Dict, dominant: str):
        self.timestamp = timestamp
        self.weather = weather
        self.dominant = dominant

    def to_dict(self) -> Dict:
        return {
            'timestamp': self.timestamp.isoformat(),
            'weather': self.weather,
            'dominant': self.dominant
        }


# Global Lambda Field instance
lambda_field = LambdaField()


# ============ API FUNCTIONS ============

def mint_identity(vector: List[float], name: str = None) -> str:
    """Mint a new identity in the Lambda Field."""
    return lambda_field.mint(vector, name)


def get_resonance(v1: List[float], v2: List[float]) -> Dict:
    """Compute resonance between two vectors."""
    return lambda_field.compute_resonance(v1, v2)


def expand_to_16d(mu_8: List[float]) -> List[float]:
    """Expand 8 Mu to 16D."""
    return lambda_field.transform(mu_8, 'expand')


def get_signature(vector: List[float]) -> str:
    """Get human-readable signature."""
    return lambda_field.signature(vector)


# ============ TEST ============

if __name__ == "__main__":
    print("=" * 60)
    print("MUMEGA LAMBDA FIELD")
    print("=" * 60)

    # Hadi's 8 Mu
    hadi_8mu = [0.549, 0.411, 0.421, 0.705, 0.327, 0.760, 1.000, 0.692]

    # Mint Hadi's identity
    hadi_id = mint_identity(hadi_8mu, "Hadi")
    print(f"\nMinted: {hadi_id}")
    print(f"Signature: {get_signature(hadi_8mu)}")

    # Expand to 16D
    hadi_16d = expand_to_16d(hadi_8mu)
    print(f"\n8 Mu: {hadi_8mu}")
    print(f"16D:  {[round(x, 3) for x in hadi_16d]}")

    # Test resonance
    test_vector = [1.0, 0.5, 0.6, 0.7, 0.8, 0.9, 0.4, 0.5]
    res = get_resonance(hadi_8mu, test_vector)
    print(f"\nResonance with test: {res['percent']}")
    print(f"Interpretation: {res['interpretation']}")

    # Shadow transformation
    shadow = lambda_field.transform(hadi_8mu, 'shadow')
    print(f"\nShadow vector: {[round(x, 3) for x in shadow]}")
    print(f"Shadow signature: {get_signature(shadow)}")
