# The Realm of Patterns - Python Backend

**FastAPI backend for 16D Universal Vector calculations**

This service provides the core calculation engine for The Realm of Patterns. It uses full ephemeris calculations (`ephem` + `numpy`) to compute accurate 16D profiles.

---

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Deploy instantly
chmod +x deploy.sh
./deploy.sh
```

This will:
- Build Docker image
- Start container on port 8000
- Run health checks
- Test the API

### Option 2: Manual Docker

```bash
# Build
docker build -t frc-backend .

# Run
docker run -d -p 8000:8000 --name frc-backend frc-backend

# Check logs
docker logs -f frc-backend

# Test
curl http://localhost:8000/health
```

### Option 3: Direct Python (Development)

```bash
# Install dependencies
pip install -r requirements.txt

# Run
uvicorn api:app --host 0.0.0.0 --port 8000 --reload

# Or
python api.py
```

---

## API Endpoints

### Health Check

```bash
GET /health
```

Returns service status and dependency versions.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-31T21:00:00.000000",
  "dependencies": {
    "numpy": "1.26.3",
    "ephem": "4.1.5"
  }
}
```

### Calculate Full 16D Profile

```bash
POST /calculate-16d
Content-Type: application/json
```

**Request:**
```json
{
  "birth_data": {
    "year": 1986,
    "month": 11,
    "day": 29,
    "hour": 17,
    "minute": 20,
    "latitude": 35.6892,
    "longitude": 51.3890,
    "timezone": "Asia/Tehran"
  },
  "transit_data": {
    "year": 2026,
    "month": 1,
    "day": 31,
    "hour": 12,
    "minute": 0
  },
  "include_vedic": true
}
```

**Response:**
```json
{
  "inner_8d": [0.78, 0.28, 0.24, 0.32, 1.00, 0.89, 0.15, 0.78],
  "outer_8d": [1.00, 0.59, 0.72, 0.90, 0.62, 0.95, 0.51, 0.68],
  "u_16": [0.78, 0.28, ..., 0.68],
  "kappa_bar": 0.014,
  "kappa_dims": [0.05, -0.12, ...],
  "RU": 1.58,
  "W": 2.15,
  "C": 0.82,
  "dominant": {
    "index": 4,
    "symbol": "N",
    "value": 1.0,
    "name": "Expansion"
  },
  "failure_mode": "Healthy",
  "elder_progress": 21.9,
  "timestamp": "2026-01-31T21:00:00.000000Z",
  "natal_positions": {...},
  "transit_positions": {...}
}
```

### Calculate Inner Octave Only

```bash
POST /calculate-inner
Content-Type: application/json
```

**Request:**
```json
{
  "year": 1986,
  "month": 11,
  "day": 29,
  "hour": 17,
  "minute": 20,
  "latitude": 35.6892,
  "longitude": 51.3890
}
```

**Response:**
```json
{
  "inner_8d": [0.78, 0.28, 0.24, 0.32, 1.00, 0.89, 0.15, 0.78],
  "natal_positions": {...},
  "timestamp": "2026-01-31T21:00:00.000000Z"
}
```

### Calculate Outer Octave Only

```bash
POST /calculate-outer?year=1986&month=11&day=29
Content-Type: application/json
```

---

## API Documentation

Once running, visit:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

---

## Production Deployment (VPS)

### Full Setup Script

```bash
# Run on your VPS (Ubuntu/Debian)
sudo bash setup-vps.sh
```

This script:
- Installs Docker + Docker Compose
- Installs Nginx + Certbot
- Clones repository
- Deploys backend
- Configures reverse proxy

### Manual Steps

**1. Deploy backend:**
```bash
cd /opt/therealmofpatterns/core
./deploy.sh
```

**2. Configure Nginx:**
```bash
# Edit nginx.conf and change domain
sudo nano nginx.conf
# Change: api.yourdomain.com → api.yourserver.com

# Install config
sudo cp nginx.conf /etc/nginx/sites-available/frc-backend
sudo ln -s /etc/nginx/sites-available/frc-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**3. Get SSL certificate:**
```bash
sudo certbot --nginx -d api.yourserver.com
```

**4. Test production endpoint:**
```bash
curl https://api.yourserver.com/health
```

---

## Connecting to Cloudflare Pages

**Update Cloudflare secret:**
```bash
wrangler pages secret put PYTHON_BACKEND_URL --project-name=therealmofpatterns
# Value: https://api.yourserver.com
```

**Update `/functions/api/compute-full.ts`:**
```typescript
// Replace mock data with:
const response = await fetch(`${env.PYTHON_BACKEND_URL}/calculate-16d`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    birth_data: {
      year: parseInt(year),
      month: parseInt(month),
      day: parseInt(day),
      hour: hour || 12,
      minute: minute || 0,
      latitude: latitude || 0,
      longitude: longitude || 0
    }
  })
});

const profile = await response.json();
return jsonResponse({ success: true, profile });
```

---

## Monitoring

### View Logs
```bash
# Docker Compose
docker-compose logs -f

# Docker
docker logs -f frc-backend

# Nginx access logs
sudo tail -f /var/log/nginx/frc-backend.access.log

# Nginx error logs
sudo tail -f /var/log/nginx/frc-backend.error.log
```

### Check Status
```bash
# Container status
docker ps | grep frc-backend

# Health check
curl http://localhost:8000/health

# Resource usage
docker stats frc-backend
```

### Restart Service
```bash
# Docker Compose
docker-compose restart

# Docker
docker restart frc-backend

# Nginx
sudo systemctl restart nginx
```

---

## Performance

**Expected metrics:**
- Response time: 100-500ms per calculation
- Memory usage: ~200-300MB
- CPU: <10% idle, <50% under load
- Concurrent requests: 10-20 (2 workers)

**Scaling:**
```bash
# Increase workers in Dockerfile:
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]

# Or run multiple instances with load balancer
```

---

## Troubleshooting

### Service won't start

```bash
# Check Docker logs
docker logs frc-backend

# Check if port is in use
sudo lsof -i :8000

# Rebuild image
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Calculation errors

```bash
# Check Python dependencies
docker exec frc-backend python -c "import ephem, numpy; print('OK')"

# Test calculation manually
docker exec -it frc-backend python
>>> from frc_16d_full_spec import compute_full_16d_profile
>>> # ... test
```

### CORS errors

- Check `allowed_origins` in `api.py`
- Add your Cloudflare Pages URL
- Rebuild and restart

### SSL certificate issues

```bash
# Renew certificate
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

---

## Development

### Running tests

```bash
# (TODO: Add tests)
pytest tests/
```

### Hot reload

```bash
uvicorn api:app --reload
```

### Environment variables

```bash
# Create .env file
PORT=8000
LOG_LEVEL=INFO
```

---

## Files

| File | Purpose |
|------|---------|
| `api.py` | FastAPI application |
| `frc_16d_full_spec.py` | Core calculation engine (767 lines) |
| `requirements.txt` | Python dependencies |
| `Dockerfile` | Container definition |
| `docker-compose.yml` | Orchestration config |
| `deploy.sh` | Deployment script |
| `setup-vps.sh` | Full VPS setup script |
| `nginx.conf` | Reverse proxy config |

---

## License

MIT (same as main project)

---

## Support

**Issues:** https://github.com/FractalResonance/therealmofpatterns/issues

**Main Repo:** https://github.com/FractalResonance/therealmofpatterns

---

**Status:** Production Ready ✅

**Deployment Time:** ~5 minutes
