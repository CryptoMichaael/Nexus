#!/bin/bash
# ========================================
# CADDY REVERSE PROXY CONFIGURATION
# Routes domains to User App and Admin App
# ========================================

set -e

echo "🌐 Configuring Caddy Reverse Proxy..."
echo ""

DOMAIN_USER="nr.stackmeridian.com"
DOMAIN_ADMIN="nradmin.stackmeridian.com"
APP_DIR="/var/www/nexus"

# Create Caddyfile
sudo tee /etc/caddy/Caddyfile > /dev/null <<EOF
# ========================================
# USER APP - nr.stackmeridian.com
# ========================================
${DOMAIN_USER} {
    # Serve frontend static files
    root * ${APP_DIR}/nexus-frontend-prod/dist
    file_server
    
    # API reverse proxy
    handle /api/* {
        reverse_proxy localhost:3000
    }
    
    # Health checks
    handle /health* {
        reverse_proxy localhost:3000
    }
    
    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
    
    # Compression
    encode gzip zstd
    
    # SPA fallback (for React Router)
    try_files {path} /index.html
}

# ========================================
# ADMIN APP - nradmin.stackmeridian.com
# ========================================
${DOMAIN_ADMIN} {
    # Serve admin frontend static files
    root * ${APP_DIR}/nexus-admin-frontend-prod/dist
    file_server
    
    # API reverse proxy (same backend)
    handle /api/* {
        reverse_proxy localhost:3000
    }
    
    # Health checks
    handle /health* {
        reverse_proxy localhost:3000
    }
    
    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "no-referrer"
    }
    
    # Compression
    encode gzip zstd
    
    # SPA fallback
    try_files {path} /index.html
    
    # Optional: IP whitelist for admin (uncomment to restrict)
    # @blocked not remote_ip 1.2.3.4 5.6.7.8
    # handle @blocked {
    #     abort
    # }
}
EOF

# Test Caddy configuration
echo "🧪 Testing Caddy configuration..."
sudo caddy validate --config /etc/caddy/Caddyfile

# Reload Caddy
echo "🔄 Reloading Caddy..."
sudo systemctl reload caddy
sudo systemctl enable caddy

echo ""
echo "✅ Caddy configured successfully!"
echo ""
echo "📝 IMPORTANT DNS CONFIGURATION:"
echo "================================================"
echo "Add these A records in Namecheap DNS:"
echo ""
echo "1. User App:"
echo "   Host: nr"
echo "   Value: YOUR_VPS_IP_ADDRESS"
echo "   Type: A Record"
echo ""
echo "2. Admin App:"
echo "   Host: nradmin"
echo "   Value: YOUR_VPS_IP_ADDRESS"
echo "   Type: A Record"
echo ""
echo "Wait 5-10 minutes for DNS propagation"
echo "================================================"
echo ""
echo "🔍 Verify SSL certificates:"
echo "   sudo caddy list-certificates"
echo ""
echo "📊 Check Caddy logs:"
echo "   sudo journalctl -u caddy -f"
echo ""
