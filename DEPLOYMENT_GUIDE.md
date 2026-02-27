# 🚀 NEXUS REWARDS - PRODUCTION DEPLOYMENT GUIDE

## 📦 Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- PM2 (for production): `npm install -g pm2`
- Nginx (for SSL/reverse proxy)

---

## 🛠️ SETUP INSTRUCTIONS

### 1. Clone and Install

```bash
cd nexus-backend-prod
npm install
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb nexus_production

# Set DATABASE_URL in .env
cp .env.example .env
nano .env
```

**.env.production Example:**
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/nexus_production

# Server
PORT=3000
NODE_ENV=production

# Security
JWT_SECRET=your_64_character_random_string_here_use_strong_generator
WEBHOOK_SECRET=your_webhook_secret_from_payment_provider

# Hot Wallet (ENCRYPTED - see setup below)
ENCRYPTED_WALLET_KEY=salt:iv:authTag:ciphertext
WALLET_PASSPHRASE=stored_in_aws_secrets_manager_or_vault

# Optional: Blockchain RPC
RPC_URL=https://bsc-dataseed.binance.org/
CHAIN_ID=56

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
```

### 3. Encrypt Hot Wallet Private Key

```bash
# Build first
npm run build

# Run encryption script
node -e "
const {encryptPrivateKey} = require('./dist/utils/secureWallet');
const encrypted = encryptPrivateKey('YOUR_PRIVATE_KEY_HERE', 'YOUR_STRONG_PASSPHRASE');
console.log('ENCRYPTED_WALLET_KEY=' + encrypted);
"
```

**⚠️ IMPORTANT:**
- Store passphrase in AWS Secrets Manager or similar vault
- Never commit passphrase to git
- Keep encrypted key separate from passphrase

### 4. Run Migrations

```bash
# Backup existing database first (if any)
pg_dump nexus_production > backup_$(date +%Y%m%d).sql

# Run migrations
npm run migrate
```

### 5. Build TypeScript

```bash
npm run build
```

### 6. Start with PM2

```bash
# Start all processes
pm2 start ecosystem.config.cjs --env production

# Save PM2 config
pm2 save

# Setup auto-restart on reboot
pm2 startup
# Follow the command output

# Check status
pm2 status
```

**Expected PM2 Processes:**
- `nexus-api` - Main API server (always running)
- `deposit-scanner` - Scans for deposits (cron: every 5 min)
- `roi-calculator` - Daily ROI calculation (cron: 00:00 UTC)
- `withdrawal-processor` - Process withdrawals (cron: every 10 min)

---

## 🔍 VERIFICATION

### Health Checks

```bash
# Liveness (should return 200)
curl http://localhost:3000/health/live

# Detailed health
curl http://localhost:3000/health

# Readiness
curl http://localhost:3000/health/ready
```

### Monitor Logs

```bash
# All logs
pm2 logs

# Specific process
pm2 logs nexus-api
pm2 logs roi-calculator

# Last 100 lines
pm2 logs --lines 100

# Real-time monitoring
pm2 monit
```

### Test Endpoints

```bash
# Test nonce generation
curl http://localhost:3000/api/auth/nonce?walletAddress=0xYOUR_ADDRESS

# Check database
psql nexus_production -c "SELECT COUNT(*) FROM users;"
```

---

## 🎨 FRONTEND SETUP

### User Frontend (nexus-frontend-prod)

```bash
cd nexus-frontend-prod
npm install

# Development
npm run dev

# Production build
npm run build
# Deploy dist/ folder to CDN or static hosting
```

### Admin Frontend (nexus-admin-frontend-prod)

```bash
cd nexus-admin-frontend-prod
npm install

# Development
npm run dev

# Production build
npm run build
# Deploy dist/ folder (restricted access recommended)
```

---

## 🔐 SECURITY HARDENING

### 1. Nginx Reverse Proxy with SSL

```nginx
# /etc/nginx/sites-available/nexus

server {
    listen 80;
    server_name api.nexusrewards.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.nexusrewards.com;

    ssl_certificate /etc/letsencrypt/live/api.nexusrewards.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.nexusrewards.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
}
```

### 2. Firewall Setup

```bash
# UFW (Ubuntu)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp  # SSH only
sudo ufw enable

# Block direct access to Node.js port
sudo ufw deny 3000/tcp
```

### 3. SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.nexusrewards.com
sudo certbot renew --dry-run  # Test auto-renewal
```

---

## 📊 MONITORING & MAINTENANCE

### Daily Tasks
```bash
# Check PM2 processes
pm2 status

# Check logs for errors
pm2 logs --lines 50 --err

# Check health
curl https://api.nexusrewards.com/health
```

### Weekly Tasks
```bash
# Database backup
pg_dump nexus_production | gzip > backup_$(date +%Y%m%d).sql.gz

# Check disk usage
df -h

# Review error logs
pm2 logs --lines 1000 --err > errors_$(date +%Y%m%d).log
```

### Monthly Tasks
```bash
# Update dependencies
npm outdated
npm update

# Security audit
npm audit
npm audit fix

# Review and rotate logs
pm2 flush  # Clear old logs
```

---

## 🐛 TROUBLESHOOTING

### PM2 Process Won't Start

```bash
# Check logs
pm2 logs nexus-api --lines 100

# Delete and restart
pm2 delete nexus-api
pm2 start ecosystem.config.cjs --only nexus-api

# Check environment
pm2 env 0
```

### Database Connection Failed

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### High Memory Usage

```bash
# Check memory
pm2 monit

# Restart specific process
pm2 restart nexus-api

# Increase memory limit in ecosystem.config.cjs
max_memory_restart: "1G"
```

### ROI Not Calculating Daily

```bash
# Check cron schedule
pm2 logs roi-calculator

# Manually trigger
pm2 restart roi-calculator

# Check PostgreSQL function
psql nexus_production -c "SELECT * FROM calculate_daily_roi();"
```

---

## 🔄 UPDATING THE APPLICATION

```bash
# 1. Backup database
pg_dump nexus_production > backup_before_update.sql

# 2. Pull latest code
git pull origin main

# 3. Install dependencies
npm install

# 4. Run new migrations (if any)
npm run migrate

# 5. Build
npm run build

# 6. Reload PM2 (zero-downtime)
pm2 reload ecosystem.config.cjs
```

---

## 📈 SCALING TIPS

### For Higher Traffic
1. **Database:** Use connection pooling (already configured)
2. **API:** Increase PM2 instances to `instances: 2`
3. **Caching:** Add Redis for session/data caching
4. **CDN:** Serve static assets via CloudFlare or AWS CloudFront

### For Multiple Servers
1. Use PostgreSQL with read replicas
2. Load balancer (Nginx/HAProxy) in front of multiple API instances
3. Centralized logging (ELK stack, DataDog)
4. Distributed PM2 with Keymetrics

---

## 📞 SUPPORT

- **Security Issues:** Report privately to security@nexusrewards.com
- **Bug Reports:** Open GitHub issue
- **Documentation:** See `/docs` folder

---

**Deployment Date:** February 28, 2026  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
