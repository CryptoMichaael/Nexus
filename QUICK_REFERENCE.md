# ⚡ NEXUS REWARDS - QUICK REFERENCE

## 🚀 Quick Start Commands

### Development
```bash
# Backend
cd nexus-backend-prod
npm install
cp .env.example .env
# Edit .env with your DATABASE_URL
npm run migrate
npm run dev

# Frontend
cd nexus-frontend-prod
npm install
npm run dev
```

### Production Deployment
```bash
# 1. Setup
cd nexus-backend-prod
npm install
npm run build

# 2. Run migrations
npm run migrate

# 3. Start with PM2
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup

# 4. Verify
pm2 status
curl http://localhost:3000/health
```

---

## 📁 Project Structure

```
Nexus/
├── nexus-backend-prod/          # Fastify API server
│   ├── src/
│   │   ├── db/migrations/       # Database migrations
│   │   ├── services/            # Business logic
│   │   ├── utils/               # Utilities (BigInt, encryption)
│   │   └── workers/             # Background workers
│   └── ecosystem.config.cjs     # PM2 configuration
│
├── nexus-frontend-prod/         # User-facing React app
│   └── src/
│       ├── components/          # Reusable components
│       ├── contexts/            # Theme, Auth contexts
│       └── pages/               # Route pages
│
├── nexus-admin-frontend-prod/   # Admin dashboard
│   └── src/
│
├── SECURITY_AUDIT.md            # Full security audit report
├── DEPLOYMENT_GUIDE.md          # Step-by-step deployment
└── AUDIT_SUMMARY.md             # Executive summary
```

---

## 🔑 Key Files Reference

### Backend

**Security:**
- `src/utils/bigintMath.ts` - Financial precision (BigInt)
- `src/utils/secureWallet.ts` - Wallet encryption (AES-256-GCM)
- `src/config/envValidator.ts` - Environment validation

**Core Services:**
- `src/services/depositProcessor.service.ts` - Idempotent deposit processing
- `src/services/roiCalculator.service.ts` - Daily ROI calculations

**Database:**
- `src/db/migrations/003_security_audit_fixes.sql` - Security constraints
- `src/db/migrations/004_mlm_tree_function.sql` - MLM optimization

**Workers:**
- `src/workers/roiCalculator.worker.ts` - Daily ROI (cron: 00:00 UTC)
- `src/workers/depositScanner.worker.ts` - Deposit scanner (cron: */5)
- `src/workers/withdrawalWorker.ts` - Withdrawals (cron: */10)

### Frontend

**Theming:**
- `tailwind.config.ts` - Brand colors (change here to rebrand)
- `src/contexts/ThemeContext.tsx` - Runtime theme switching
- `src/components/common/Button.tsx` - Reusable button
- `src/components/common/Card.tsx` - Reusable card

---

## 💻 Common Tasks

### Change ROI Rate
```sql
-- From 0.3% to 0.5% daily
UPDATE reward_config 
SET daily_rate_bps = 50 
WHERE config_type = 'roi';
```

### Change MLM Commission
```sql
-- Level 1 from 1% to 1.5%
UPDATE reward_config 
SET commission_rate_bps = 150 
WHERE config_type = 'mlm_level' AND level = 1;
```

### Encrypt Wallet Key
```bash
node -e "
const {encryptPrivateKey} = require('./dist/utils/secureWallet');
console.log(encryptPrivateKey('PRIVATE_KEY', 'PASSPHRASE'));
"
```

### Manual ROI Calculation
```bash
pm2 restart roi-calculator
# OR
psql nexus_production -c "SELECT * FROM calculate_daily_roi();"
```

### View Logs
```bash
pm2 logs                 # All logs
pm2 logs nexus-api       # API only
pm2 logs --lines 100     # Last 100 lines
pm2 logs --err           # Errors only
```

### Backup Database
```bash
pg_dump nexus_production | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Restore Database
```bash
gunzip < backup_20260228.sql.gz | psql nexus_production
```

---

## 🎨 Rebranding Guide

### 1. Change Colors (5 minutes)
Edit `nexus-frontend-prod/tailwind.config.ts`:
```typescript
primary: {
  500: '#YOUR_PRIMARY_COLOR',
},
secondary: {
  500: '#YOUR_SECONDARY_COLOR',
},
```

### 2. Change Brand Name (2 minutes)
Edit `nexus-frontend-prod/src/contexts/ThemeContext.tsx`:
```typescript
brandName: 'Your Brand Name',
logo: '/your-logo.svg',
```

### 3. Deploy (1 minute)
```bash
npm run build
# Upload dist/ to your hosting
```

**Total time: ~8 minutes** ✅

---

## 🔍 Health Check Endpoints

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `GET /health/live` | Liveness probe | Always 200 if running |
| `GET /health` | Detailed status | Health metrics |
| `GET /health/ready` | Readiness probe | 200 if dependencies OK |

---

## 🐛 Troubleshooting

### PM2 Process Won't Start
```bash
pm2 logs nexus-api --lines 100
pm2 delete nexus-api
pm2 start ecosystem.config.cjs --only nexus-api
```

### Database Connection Failed
```bash
psql $DATABASE_URL -c "SELECT 1;"
sudo systemctl restart postgresql
```

### High Memory Usage
```bash
pm2 monit
pm2 restart all
```

### Deposits Not Processing
```bash
pm2 logs deposit-scanner --lines 50
# Check webhook secret matches
```

---

## 📊 PM2 Commands Cheat Sheet

```bash
# Status
pm2 status
pm2 monit

# Logs
pm2 logs
pm2 logs nexus-api
pm2 flush              # Clear logs

# Control
pm2 start all
pm2 stop all
pm2 restart all
pm2 reload all         # Zero-downtime
pm2 delete all

# Specific process
pm2 restart nexus-api
pm2 stop roi-calculator

# Startup
pm2 save
pm2 startup
pm2 unstartup
```

---

## 🔐 Security Checklist

**Before Production:**
- [ ] Change all default passwords
- [ ] Generate strong JWT_SECRET (64+ chars)
- [ ] Encrypt wallet private key
- [ ] Store passphrase in AWS Secrets Manager
- [ ] Enable SSL/TLS (Nginx + Let's Encrypt)
- [ ] Configure firewall (UFW)
- [ ] Setup database backups
- [ ] Enable rate limiting
- [ ] Review all environment variables

**Post-Deployment:**
- [ ] Verify health checks
- [ ] Test deposit webhook
- [ ] Monitor PM2 logs for 24h
- [ ] Run security scan (`npm audit`)
- [ ] Schedule third-party audit

---

## 📞 Need Help?

- **Security Issues:** security@nexusrewards.com
- **Documentation:** See `/docs` folder
- **Full Audit:** [SECURITY_AUDIT.md](SECURITY_AUDIT.md)
- **Deployment:** [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- **Summary:** [AUDIT_SUMMARY.md](AUDIT_SUMMARY.md)

---

**Repository:** https://github.com/CryptoMichaael/Nexus  
**Latest Version:** 1.0.0  
**Status:** ✅ Production Ready
