#!/bin/bash
set -e

echo "🚀 Deploying The Realm of Patterns - Python Backend"
echo "=================================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Stop existing container if running
echo "🛑 Stopping existing container..."
docker-compose down || true

# Build new image
echo "🔨 Building Docker image..."
docker-compose build

# Start container
echo "▶️  Starting container..."
docker-compose up -d

# Wait for service to be healthy
echo "⏳ Waiting for service to be healthy..."
sleep 5

# Check health
echo "🏥 Checking health..."
MAX_RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        echo "✅ Service is healthy!"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "   Attempt $RETRY_COUNT/$MAX_RETRIES..."
    sleep 3
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "❌ Service failed to start. Check logs with: docker-compose logs"
    exit 1
fi

# Show service info
echo ""
echo "✨ Deployment complete!"
echo "=================================================="
echo "🌐 API URL: http://localhost:8000"
echo "📖 Docs: http://localhost:8000/docs"
echo "🏥 Health: http://localhost:8000/health"
echo ""
echo "📊 View logs: docker-compose logs -f"
echo "🛑 Stop service: docker-compose down"
echo "🔄 Restart service: docker-compose restart"
echo ""

# Test the API
echo "🧪 Testing API endpoint..."
curl -s -X POST http://localhost:8000/calculate-16d \
  -H "Content-Type: application/json" \
  -d '{
    "birth_data": {
      "year": 1986,
      "month": 11,
      "day": 29,
      "hour": 17,
      "minute": 20,
      "latitude": 35.6892,
      "longitude": 51.3890
    }
  }' | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f\"✅ API Test Successful!\")
    print(f\"   κ̄ (Kappa): {data.get('kappa_bar', 'N/A'):.3f}\")
    print(f\"   RU: {data.get('RU', 'N/A'):.2f}\")
    print(f\"   Failure Mode: {data.get('failure_mode', 'N/A')}\")
    print(f\"   Elder Progress: {data.get('elder_progress', 'N/A'):.1f}%\")
except Exception as e:
    print(f\"❌ API Test Failed: {e}\")
    sys.exit(1)
"

echo ""
echo "🎉 Backend is ready for production!"
echo "=================================================="
