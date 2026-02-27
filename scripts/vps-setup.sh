#!/bin/bash
# ========================================
# NAMECHEAP VPS DEPLOYMENT SCRIPT
# Optimized for Low RAM (2GB) VPS
# ========================================

set -e  # Exit on error

echo "🚀 Nexus Rewards - VPS Deployment Starting..."
echo "================================================"
echo ""

# Configuration
DOMAIN_USER="nr.stackmeridian.com"
DOMAIN_ADMIN="nradmin.stackmeridian.com"
DB_NAME="nexus_production"
DB_USER="nexus_user"
APP_DIR="/var/www/nexus"

# ========================================
# 1. SYSTEM UPDATE & DEPENDENCIES
# ========================================
echo "📦 Step 1: Installing system dependencies..."

sudo apt update
sudo apt upgrade -y

# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Caddy (reverse proxy)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy

# Install PM2 globally
sudo npm install -g pm2

echo "✅ Dependencies installed"
echo ""

# ========================================
# 2. DATABASE SETUP
# ========================================
echo "🗄️  Step 2: Setting up PostgreSQL..."

# Create database user
sudo -u postgres psql <<EOF
CREATE USER ${DB_USER} WITH PASSWORD 'CHANGE_THIS_PASSWORD_IN_PRODUCTION';
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
\q
EOF

# Allow local connections
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" /etc/postgresql/*/main/postgresql.conf

# Restart PostgreSQL
sudo systemctl restart postgresql
sudo systemctl enable postgresql

echo "✅ PostgreSQL configured"
echo ""

# ========================================
# 3. APPLICATION SETUP
# ========================================
echo "📁 Step 3: Setting up application directory..."

# Create app directory
sudo mkdir -p ${APP_DIR}
sudo chown -R $USER:$USER ${APP_DIR}

echo "✅ Application directory created: ${APP_DIR}"
echo ""
echo "📝 NEXT MANUAL STEPS:"
echo "1. Clone repository:"
echo "   cd ${APP_DIR}"
echo "   git clone https://github.com/CryptoMichaael/Nexus.git ."
echo ""
echo "2. Install backend dependencies:"
echo "   cd ${APP_DIR}/nexus-backend-prod"
echo "   npm install"
echo ""
echo "3. Create .env.production (see next script)"
echo ""
echo "4. Run migrations:"
echo "   npm run build"
echo "   npm run migrate"
echo ""
echo "5. Build frontends:"
echo "   cd ${APP_DIR}/nexus-frontend-prod && npm install && npm run build"
echo "   cd ${APP_DIR}/nexus-admin-frontend-prod && npm install && npm run build"
echo ""
echo "6. Run: ./scripts/vps-configure-caddy.sh"
echo ""
