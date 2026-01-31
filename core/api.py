"""
FastAPI Backend for The Realm of Patterns
Provides HTTP API for 16D Universal Vector calculations
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import logging

# Import our FRC calculation engine
from frc_16d_full_spec import (
    compute_full_16d_profile,
    compute_inner_8d_full,
    compute_outer_8d,
    compute_global_kappa,
    compute_RU,
    get_planetary_longitudes,
    get_vedic_dasha,
    activation
)
import ephem
import numpy as np


# Helper function to get planetary positions
def get_planetary_positions(dt: datetime) -> dict:
    """Get planetary positions for a given datetime"""
    observer = ephem.Observer()
    observer.date = dt

    planets = {
        'Sun': ephem.Sun(),
        'Moon': ephem.Moon(),
        'Mercury': ephem.Mercury(),
        'Venus': ephem.Venus(),
        'Mars': ephem.Mars(),
        'Jupiter': ephem.Jupiter(),
        'Saturn': ephem.Saturn(),
        'Uranus': ephem.Uranus(),
        'Neptune': ephem.Neptune(),
        'Pluto': ephem.Pluto()
    }

    positions = {}
    for name, planet in planets.items():
        planet.compute(observer)
        # Convert from radians to degrees (ecliptic longitude)
        lon_deg = float(ephem.Ecliptic(planet).lon) * 180 / np.pi
        lat_deg = float(ephem.Ecliptic(planet).lat) * 180 / np.pi

        positions[name] = {
            'longitude': lon_deg % 360,  # Normalize to 0-360
            'latitude': lat_deg,
            'distance': float(planet.earth_distance)
        }

    return positions


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="The Realm of Patterns - 16D API",
    description="FRC 16D Universal Vector calculation engine",
    version="1.0.0"
)

# CORS middleware (allow Cloudflare Pages to call this)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://therealmofpatterns.pages.dev",
        "https://*.therealmofpatterns.pages.dev",
        "http://localhost:8788",  # Local development
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response Models
class BirthData(BaseModel):
    """Birth data for natal chart calculation"""
    year: int = Field(..., ge=1900, le=2100, description="Birth year")
    month: int = Field(..., ge=1, le=12, description="Birth month")
    day: int = Field(..., ge=1, le=31, description="Birth day")
    hour: int = Field(default=12, ge=0, le=23, description="Birth hour (24h format)")
    minute: int = Field(default=0, ge=0, le=59, description="Birth minute")
    latitude: float = Field(default=0.0, ge=-90, le=90, description="Birth latitude")
    longitude: float = Field(default=0.0, ge=-180, le=180, description="Birth longitude")
    timezone: str = Field(default="UTC", description="Timezone (e.g., 'America/New_York')")


class TransitRequest(BaseModel):
    """Request to calculate transits for a specific datetime"""
    year: int = Field(..., ge=1900, le=2100)
    month: int = Field(..., ge=1, le=12)
    day: int = Field(..., ge=1, le=31)
    hour: int = Field(default=12, ge=0, le=23)
    minute: int = Field(default=0, ge=0, le=59)


class Calculate16DRequest(BaseModel):
    """Full 16D calculation request"""
    birth_data: BirthData
    transit_data: Optional[TransitRequest] = None
    include_vedic: bool = Field(default=True, description="Include Vedic Dasha in outer octave")


class Full16DResponse(BaseModel):
    """Complete 16D profile response"""
    inner_8d: List[float] = Field(..., description="Inner Octave (Karma) - 8 dimensions")
    outer_8d: List[float] = Field(..., description="Outer Octave (Dharma) - 8 dimensions")
    u_16: List[float] = Field(..., description="Full 16D Universal Vector")
    kappa_bar: float = Field(..., description="Mean coupling coefficient")
    kappa_dims: List[float] = Field(..., description="Per-dimension coupling coefficients")
    RU: float = Field(..., description="Resonance Units (0-100)")
    W: float = Field(..., description="Witness magnitude")
    C: float = Field(..., description="Coherence score")
    dominant: dict = Field(..., description="Dominant dimension info")
    failure_mode: str = Field(..., description="Failure mode classification")
    elder_progress: float = Field(..., description="Elder Attractor progress (0-100)")
    timestamp: str = Field(..., description="Calculation timestamp (ISO format)")
    natal_positions: dict = Field(..., description="Planetary positions at birth")
    transit_positions: Optional[dict] = Field(None, description="Current transit positions")


# API Endpoints

@app.get("/")
async def root():
    """API root - health check"""
    return {
        "service": "The Realm of Patterns - 16D API",
        "status": "operational",
        "version": "1.0.0",
        "endpoints": {
            "/health": "Health check",
            "/calculate-16d": "Full 16D profile calculation (POST)",
            "/calculate-inner": "Inner Octave only (POST)",
            "/calculate-outer": "Outer Octave only (POST)",
            "/docs": "API documentation (Swagger UI)",
            "/redoc": "API documentation (ReDoc)"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    try:
        # Test that our calculation engine is working
        import numpy as np
        import ephem

        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "dependencies": {
                "numpy": np.__version__,
                "ephem": ephem.__version__
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")


@app.post("/calculate-16d", response_model=Full16DResponse)
async def calculate_16d(request: Calculate16DRequest):
    """
    Calculate full 16D Universal Vector profile

    Returns Inner Octave (natal chart), Outer Octave (transits + Vedic),
    and all derived metrics (κ, RU, W, C, failure mode, elder progress)
    """
    try:
        logger.info(f"Calculating 16D for birth: {request.birth_data.year}-{request.birth_data.month}-{request.birth_data.day}")

        # Build birth datetime
        birth_datetime = datetime(
            request.birth_data.year,
            request.birth_data.month,
            request.birth_data.day,
            request.birth_data.hour,
            request.birth_data.minute
        )

        # Build transit datetime (default to now if not provided)
        if request.transit_data:
            transit_datetime = datetime(
                request.transit_data.year,
                request.transit_data.month,
                request.transit_data.day,
                request.transit_data.hour,
                request.transit_data.minute
            )
        else:
            transit_datetime = None  # Will use current time in compute function

        # Call our calculation engine
        profile = compute_full_16d_profile(
            birth_datetime=birth_datetime,
            latitude=request.birth_data.latitude,
            longitude=request.birth_data.longitude,
            timezone_offset=0,  # Assuming UTC input
            transit_datetime=transit_datetime
        )

        # Get planetary positions for reference
        natal_positions = get_planetary_positions(birth_datetime)
        transit_positions = get_planetary_positions(transit_datetime or datetime.utcnow())

        # Format response
        response = Full16DResponse(
            inner_8d=profile['inner_8d'],
            outer_8d=profile['outer_8d'],
            u_16=profile['U_16'],
            kappa_bar=float(profile['kappa_bar']),
            kappa_dims=profile['kappa_dims'],
            RU=float(profile['RU']),
            W=float(profile['W']),
            C=float(profile['C']),
            dominant={
                'index': int(profile['dominant']['index']),
                'symbol': profile['dominant']['symbol'],
                'value': float(profile['dominant']['value']),
                'name': profile['dominant']['name']
            },
            failure_mode=profile['failure_mode'],
            elder_progress=float(profile['elder_progress']),
            timestamp=datetime.utcnow().isoformat() + 'Z',
            natal_positions={
                planet: {
                    'longitude': float(pos['longitude']),
                    'latitude': float(pos['latitude']),
                    'distance': float(pos['distance'])
                }
                for planet, pos in natal_positions.items()
            },
            transit_positions={
                planet: {
                    'longitude': float(pos['longitude']),
                    'latitude': float(pos['latitude']),
                    'distance': float(pos['distance'])
                }
                for planet, pos in transit_positions.items()
            }
        )

        logger.info(f"16D calculation complete: κ̄={profile['kappa_bar']:.3f}, RU={profile['RU']:.2f}, mode={profile['failure_mode']}")
        return response

    except Exception as e:
        logger.error(f"Calculation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")


@app.post("/calculate-inner")
async def calculate_inner_octave(birth_data: BirthData):
    """
    Calculate Inner Octave (natal chart) only

    Returns 8D vector representing your karma/birth pattern
    """
    try:
        birth_datetime = datetime(
            birth_data.year,
            birth_data.month,
            birth_data.day,
            birth_data.hour,
            birth_data.minute
        )

        # Get planetary positions
        natal_positions = get_planetary_positions(birth_datetime)

        # Extract longitudes, signs, houses (simplified - real impl would calculate houses)
        natal_longitudes = [pos['longitude'] for pos in natal_positions.values()]
        # For now, use simplified sign/house calculation
        planetary_signs = [int(lon // 30) for lon in natal_longitudes]  # 12 signs
        planetary_houses = [((int(lon // 30) + 1) % 12) + 1 for lon in natal_longitudes]  # Simple house assignment

        # Calculate Inner Octave
        inner_8d = compute_inner_8d_full(natal_longitudes, planetary_signs, planetary_houses)

        return {
            "inner_8d": inner_8d.tolist(),
            "natal_positions": {
                planet: {
                    'longitude': float(pos['longitude']),
                    'sign': int(pos['longitude'] // 30),
                    'degree_in_sign': float(pos['longitude'] % 30)
                }
                for planet, pos in natal_positions.items()
            },
            "timestamp": datetime.utcnow().isoformat() + 'Z'
        }

    except Exception as e:
        logger.error(f"Inner octave calculation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")


@app.post("/calculate-outer")
async def calculate_outer_octave(request: TransitRequest, birth_data: BirthData):
    """
    Calculate Outer Octave (transits + Vedic Dasha) only

    Returns 8D vector representing current cosmic weather
    """
    try:
        transit_datetime = datetime(
            request.year,
            request.month,
            request.day,
            request.hour,
            request.minute
        )

        birth_datetime = datetime(
            birth_data.year,
            birth_data.month,
            birth_data.day,
            birth_data.hour,
            birth_data.minute
        )

        # Get transit positions
        transit_positions = get_planetary_positions(transit_datetime)
        transit_longitudes = np.array([pos['longitude'] for pos in transit_positions.values()])

        # Calculate Outer Octave (50% transits + 50% Vedic Dasha)
        outer_8d = compute_outer_8d(transit_longitudes, birth_datetime)

        # Get current Vedic Dasha
        mahadasha, antardasha = get_vedic_dasha(birth_datetime)

        return {
            "outer_8d": outer_8d.tolist(),
            "transit_positions": {
                planet: {
                    'longitude': float(pos['longitude']),
                    'sign': int(pos['longitude'] // 30),
                    'degree_in_sign': float(pos['longitude'] % 30)
                }
                for planet, pos in transit_positions.items()
            },
            "vedic_dasha": {
                "mahadasha": mahadasha,
                "antardasha": antardasha
            },
            "timestamp": datetime.utcnow().isoformat() + 'Z'
        }

    except Exception as e:
        logger.error(f"Outer octave calculation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")


# Run with: uvicorn api:app --host 0.0.0.0 --port 8000 --reload
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
