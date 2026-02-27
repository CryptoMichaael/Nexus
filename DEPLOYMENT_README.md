# 🚀 NEXUS REWARDS - COMPLETE DEPLOYMENT GUIDE

## 📋 TABLE OF CONTENTS

1. [Local Development Setup (BSC Testnet)](#1-local-development-setup-bsc-testnet)
2. [Production Deployment (Namecheap VPS)](#2-production-deployment-namecheap-vps)
3. [Single Point of Entry Customization](#3-single-point-of-entry-customization)
4. [Troubleshooting](#4-troubleshooting)

---

## 1. LOCAL DEVELOPMENT SETUP (BSC TESTNET)

### **Prerequisites**
- Node.js 18+
- PostgreSQL 14+
- Git

### **Step 1: Clone & Install**

```bash
cd /path/to/your/projects
git clone https://github.com/CryptoMichaael/Nexus.git
cd Nexus

# Install backend dependencies
cd nexus-backend-prod
npm install

# Install ethers for wallet generation
npm install --save-dev ethers
```

### **Step 2: Generate Admin Wallet**

```bash
# Build backend first (needed for wallet encryption)
npm run build

# Generate BSC Testnet admin wallet
npm run generate:wallet
```

**Output Example:**
```
✅ Private Key Generated:
0x1234567890abcdef...

✅ Public Address:
0xYourWalletAddress123...

📝 COPY THESE TO YOUR .env.local FILE:
==========================================
TREASURY_WALLET_ADDRESS=0xYourWalletAddress123...
TREASURY_ENCRYPTED_KEY=salt:iv:authTag:ciphertext
AES_SECRET_KEY=base64_encoded_secret
==========================================

⚠️  SECURITY WARNINGS:
1. NEVER commit the AES_SECRET_KEY to git
2. Store AES_SECRET_KEY in a password manager
3. Fund this wallet with testnet BNB
```

### **Step 3: Configure Environment**

```bash
# Copy example to .env.local
cp .env.local.example .env.local

# Edit with your values
nano .env.local
```

**Required Variables:**
```env
# Database
DATABASE_URL=postgresql://localhost:5432/nexus_testnet

# BSC Testnet
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.bnbchain.org:8545
CHAIN_ID=97

# Treasury Wallet (from generate:wallet output)
TREASURY_WALLET_ADDRESS=0xYourAddress
TREASURY_ENCRYPTED_KEY=salt:iv:authTag:ciphertext
AES_SECRET_KEY=your_aes_secret

# USDT Contract (BSC Testnet)
USDT_CONTRACT_ADDRESS=0x337610d27c682E347C9cD60BD4b3b107C9d34dDd

# Security
JWT_SECRET=your_local_jwt_secret_64_chars_minimum
```

### **Step 4: Database Setup**

```bash
# Create database
createdb nexus_testnet

# Run migrations
npm run migrate
```

**Expected Output:**
```
✅ Migration 001_init.sql completed
✅ Migration 002_seed.sql completed
✅ Migration 003_security_audit_fixes.sql completed
✅ Migration 004_mlm_tree_function.sql completed
```

### **Step 5: Fund Wallet with Testnet BNB**

1. Visit: https://testnet.bnbchain.org/faucet-smart
2. Enter your `TREASURY_WALLET_ADDRESS`
3. Request 0.5 BNB (for gas fees)

### **Step 6: Test Blockchain Connection**

```bash
npm run test:blockchain
```

**Expected Output:**
```
🧪 Testing BSC Testnet Connection...

1️⃣ Testing RPC Provider...
   ✅ Connected to BSC Testnet (Chain ID: 97)
   ✅ Latest Block: 38945123

2️⃣ Testing Wallet Manager...
   ✅ Wallet Address: 0xYourAddress

3️⃣ Testing Wallet Balance...
   💰 Balance: 0.5 BNB
   ✅ Wallet funded

4️⃣ Testing USDT Contract...
   ✅ Contract Found: Tether USD (USDT)
   ✅ Decimals: 18

═══════════════════════════════════════
✅ ALL TESTS PASSED - READY FOR DEVELOPMENT
═══════════════════════════════════════
```

### **Step 7: Start Development Server**

```bash
# Start backend
npm run dev

# In new terminal: Start frontend
cd ../nexus-frontend-prod
npm install
npm run dev

# In new terminal: Start admin frontend
cd ../nexus-admin-frontend-prod
npm install
npm run dev
```

**Access:**
- User App: http://localhost:5173
- Admin App: http://localhost:5174
- API: http://localhost:3000
- Health: http://localhost:3000/health

---

## 2. PRODUCTION DEPLOYMENT (NAMECHEAP VPS)

### **VPS Requirements**
- **RAM:** 2GB minimum (4GB recommended)
- **Storage:** 20GB SSD
- **OS:** Ubuntu 22.04 LTS
- **CPU:** 1 core (2 cores recommended)

### **Step 1: Initial VPS Setup**

```bash
# SSH into VPS
ssh root@your-vps-ip

# Run automated setup script
curl -sSL https://raw.githubusercontent.com/CryptoMichaael/Nexus/main/scripts/vps-setup.sh | bash
```

**Or manually download and run:**
```bash
wget https://raw.githubusercontent.com/CryptoMichaael/Nexus/main/scripts/vps-setup.sh
chmod +x vps-setup.sh
./vps-setup.sh
```

**Script installs:**
- Node.js 18 LTS
- PostgreSQL 14
- Caddy (reverse proxy)
- PM2 (process manager)

### **Step 2: Clone Repository**

```bash
cd /var/www/nexus
git clone https://github.com/CryptoMichaael/Nexus.git .
```

### **Step 3: Configure Environment**

```bash
cd /var/www/nexus/nexus-backend-prod
cp .env.production.example .env.production
nano .env.production
```

**Production Environment Variables:**
```env
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://nexus_user:STRONG_PASSWORD@localhost:5432/nexus_production

# Security (CHANGE THESE!)
JWT_SECRET=$(openssl rand -base64 64)
WEBHOOK_SECRET=your_payment_provider_webhook_secret

# BSC Mainnet
BSC_MAINNET_RPC_URL=https://bsc-dataseed.binance.org/
CHAIN_ID=56

# Treasury Wallet (Generate new for production!)
TREASURY_WALLET_ADDRESS=0xProductionWallet
TREASURY_ENCRYPTED_KEY=production_encrypted_key
AES_SECRET_KEY=STORE_IN_AWS_SECRETS_MANAGER

# USDT Contract (BSC Mainnet)
USDT_CONTRACT_ADDRESS=0x55d398326f99059fF775485246999027B3197955
```

### **Step 4: Initialize Database**

```bash
# Run initialization script
psql -U nexus_user -d nexus_production -f /var/www/nexus/scripts/vps-init-database.sql

# Run MLM function migration
psql -U nexus_user -d nexus_production -f /var/www/nexus/nexus-backend-prod/src/db/migrations/004_mlm_tree_function.sql
```

**Verify:**
```bash
psql -U nexus_user -d nexus_production -c "SELECT * FROM reward_config;"
```

### **Step 5: Build Applications**

```bash
# Build backend
cd /var/www/nexus/nexus-backend-prod
npm install --production
npm run build

# Build user frontend
cd /var/www/nexus/nexus-frontend-prod
npm install
npm run build

# Build admin frontend
cd /var/www/nexus/nexus-admin-frontend-prod
npm install
npm run build
```

### **Step 6: Configure Caddy (Reverse Proxy)**

```bash
# Run Caddy configuration script
cd /var/www/nexus
./scripts/vps-configure-caddy.sh
```

**DNS Configuration (Namecheap):**

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A Record | nr | YOUR_VPS_IP | Automatic |
| A Record | nradmin | YOUR_VPS_IP | Automatic |

**Wait 5-10 minutes for DNS propagation**

### **Step 7: Start PM2 Processes**

```bash
cd /var/www/nexus/nexus-backend-prod
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

**Verify all processes running:**
```bash
pm2 status
```

**Expected Output:**
```
┌─────┬──────────────────────┬─────────┬─────────┐
│ id  │ name                 │ status  │ restart │
├─────┼──────────────────────┼─────────┼─────────┤
│ 0   │ nexus-api            │ online  │ 0       │
│ 1   │ deposit-scanner      │ online  │ 0       │
│ 2   │ roi-calculator       │ online  │ 0       │
│ 3   │ withdrawal-processor │ online  │ 0       │
└─────┴──────────────────────┴─────────┴─────────┘
```

### **Step 8: Verify Deployment**

```bash
# Test health endpoints
curl https://nr.stackmeridian.com/health
curl https://nradmin.stackmeridian.com/health

# Check SSL certificates
sudo caddy list-certificates

# Monitor logs
pm2 logs --lines 50
```

### **Step 9: Firewall Setup**

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

---

## 3. SINGLE POINT OF ENTRY CUSTOMIZATION

### **UI Customization (No Code Changes)**

#### **Change Brand Colors:**

**File:** `nexus-frontend-prod/tailwind.config.ts`

```typescript
// Line 20: Change primary color
primary: {
  500: '#YOUR_HEX_COLOR', // ⬅️ Main button color
}

// Line 37: Change secondary color  
secondary: {
  500: '#YOUR_HEX_COLOR', // ⬅️ Success/green color
}
```

**Rebuild:**
```bash
cd nexus-frontend-prod
npm run build
pm2 reload all
```

#### **Change Brand Name & Logo:**

**File:** `nexus-frontend-prod/src/contexts/ThemeContext.tsx`

```typescript
// Line 21
brandName: 'Your Brand Name',
logo: '/your-logo.svg',
```

Replace logo file: `nexus-frontend-prod/public/logo.svg`

### **Business Logic Customization (SQL Only)**

#### **Change ROI Daily Rate:**

```sql
-- From 0.3% to 0.5%
UPDATE reward_config 
SET daily_rate_bps = 50 
WHERE config_type = 'roi';
```

#### **Change MLM Commission Rates:**

```sql
-- Level 1: 1% to 1.5%
UPDATE reward_config 
SET commission_rate_bps = 150 
WHERE config_type = 'mlm_level' AND level = 1;

-- View all levels
SELECT level, commission_rate_bps 
FROM reward_config 
WHERE config_type = 'mlm_level';
```

#### **Change Rank Requirements:**

```sql
-- L1: 5 directs to 3 directs
UPDATE reward_config 
SET required_directs = 3 
WHERE config_type = 'rank' AND rank_level = 1;
```

**⚠️ NO SERVER RESTART NEEDED - Changes apply immediately**

---

## 4. TROUBLESHOOTING

### **Issue: Blockchain connection failed**

```bash
# Test RPC
curl https://data-seed-prebsc-1-s1.bnbchain.org:8545

# Try alternative RPC
# Edit .env.local:
BSC_TESTNET_RPC_URL=https://bsc-testnet.public.blastapi.io
```

### **Issue: Wallet decryption failed**

```bash
# Regenerate wallet
npm run generate:wallet

# Copy new keys to .env.local
# Restart server
npm run dev
```

### **Issue: PM2 process won't start**

```bash
# Check logs
pm2 logs nexus-api --lines 100

# Restart specific process
pm2 restart nexus-api

# Check environment
pm2 env 0
```

### **Issue: Database connection failed**

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### **Issue: Caddy SSL not working**

```bash
# Check DNS propagation
dig nr.stackmeridian.com

# Check Caddy logs
sudo journalctl -u caddy -f

# Reload Caddy
sudo systemctl reload caddy
```

---

## 📊 ARCHITECTURE SUMMARY

### **Tech Stack:**
- **Backend:** Fastify (Node.js)
- **Database:** PostgreSQL 14
- **Frontend:** React + Vite + Tailwind
- **Process Manager:** PM2
- **Reverse Proxy:** Caddy (auto SSL)
- **Blockchain:** BSC (Testnet/Mainnet)

### **Security Features:**
- ✅ AES-256-GCM wallet encryption
- ✅ PBKDF2 key derivation (100k iterations)
- ✅ BigInt financial precision
- ✅ Database-level double-spend prevention
- ✅ Auto-SSL with Caddy
- ✅ Rate limiting
- ✅ CORS protection

### **Performance Optimizations:**
- ✅ Single recursive CTE for MLM tree
- ✅ Database connection pooling
- ✅ PM2 with memory limits
- ✅ Gzip compression via Caddy
- ✅ Indexed database columns

---

## 📞 SUPPORT

- **Documentation:** See `/docs` folder
- **Security Audit:** [SECURITY_AUDIT.md](SECURITY_AUDIT.md)
- **Customization Guide:** [CUSTOMIZATION_AUDIT.md](CUSTOMIZATION_AUDIT.md)
- **Quick Reference:** [QUICK_REFERENCE.md](QUICK_REFERENCE.md)

---

## ✅ DEPLOYMENT CHECKLIST

### **Pre-Production:**
- [ ] Generate production wallet (separate from testnet)
- [ ] Store AES_SECRET_KEY in AWS Secrets Manager
- [ ] Configure strong database password
- [ ] Generate 64+ char JWT_SECRET
- [ ] Setup DNS A records
- [ ] Fund production wallet with BNB

### **Post-Production:**
- [ ] Verify health endpoints
- [ ] Test deposit webhook
- [ ] Monitor PM2 logs for 24h
- [ ] Setup database backups
- [ ] Configure monitoring (Sentry/DataDog)
- [ ] Schedule third-party security audit

---

**Repository:** https://github.com/CryptoMichaael/Nexus  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
