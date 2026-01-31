#!/bin/bash
set -e

echo "🚀 Setting up The Realm of Patterns Python Backend on VPS"
echo "=========================================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "⚠️  This script should be run as root (or with sudo)"
    echo "Run: sudo bash setup-vps.sh"
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y

# Install Docker
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
else
    echo "✅ Docker already installed"
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "🐙 Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    echo "✅ Docker Compose already installed"
fi

# Install Nginx
if ! command -v nginx &> /dev/null; then
    echo "🌐 Installing Nginx..."
    apt-get install -y nginx
    systemctl enable nginx
    systemctl start nginx
else
    echo "✅ Nginx already installed"
fi

# Install Certbot for SSL
if ! command -v certbot &> /dev/null; then
    echo "🔒 Installing Certbot (Let's Encrypt)..."
    apt-get install -y certbot python3-certbot-nginx
else
    echo "✅ Certbot already installed"
fi

# Install useful tools
echo "🛠️  Installing utilities..."
apt-get install -y curl git htop nano vim

# Create application directory
echo "📁 Creating application directory..."
APP_DIR="/opt/therealmofpatterns"
mkdir -p $APP_DIR
cd $APP_DIR

# Clone or update repository
if [ -d ".git" ]; then
    echo "🔄 Updating repository..."
    git pull
else
    echo "📥 Cloning repository..."
    git clone https://github.com/FractalResonance/therealmofpatterns.git .
fi

# Navigate to core directory
cd core

# Make deployment script executable
chmod +x deploy.sh

# Deploy backend
echo "🚀 Deploying Python backend..."
./deploy.sh

echo ""
echo "=========================================================="
echo "✅ Backend deployed successfully!"
echo ""
echo "📍 Next steps:"
echo ""
echo "1. Configure Nginx reverse proxy:"
echo "   Edit: core/nginx.conf"
echo "   Change 'api.yourdomain.com' to your actual domain"
echo "   Then run:"
echo "   sudo cp core/nginx.conf /etc/nginx/sites-available/frc-backend"
echo "   sudo ln -s /etc/nginx/sites-available/frc-backend /etc/nginx/sites-enabled/"
echo "   sudo nginx -t"
echo "   sudo systemctl reload nginx"
echo ""
echo "2. Get SSL certificate:"
echo "   sudo certbot --nginx -d api.yourdomain.com"
echo ""
echo "3. Update Cloudflare secret:"
echo "   wrangler pages secret put PYTHON_BACKEND_URL --project-name=therealmofpatterns"
echo "   Value: https://api.yourdomain.com"
echo ""
echo "4. Test the API:"
echo "   curl https://api.yourdomain.com/health"
echo ""
echo "=========================================================="
echo ""
echo "🎉 Setup complete!"
echo ""
