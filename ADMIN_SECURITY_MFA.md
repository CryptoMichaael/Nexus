# 🔒 ADMIN SECURITY & MFA IMPLEMENTATION

## Overview
This document describes the multi-layered admin security system implemented with wallet detection guards, secret key authentication, and 2FA/MFA for sensitive operations.

---

## 🛡️ SECURITY LAYERS

### Layer 1: Wallet Provider Detection

#### User Frontend (`nexus-frontend-prod`)
**Component:** `WalletProviderGuard.tsx`

**Features:**
- Detects MetaMask, Trust Wallet, Coinbase Wallet
- Shows friendly installation modal if no provider found
- Prevents application crashes
- Auto-retry detection after 1 second (async provider injection)

**User Experience:**
```
No Wallet → Installation Modal → Download Links → Reload Page
```

#### Admin Frontend (`nexus-admin-frontend-prod`)
**Component:** `AdminWalletGuard.tsx`

**Features:**
- Strict wallet detection (MetaMask/Trust/Coinbase required)
- JWT token verification
- Admin allowlist database check via `/v1/admin/verify-allowlist`
- 403 Unauthorized page for non-admin wallets
- Security audit logging for failed attempts

**Admin Journey:**
```
No Wallet → Download Required Screen
Wrong Role → 403 Unauthorized (Logged)
Valid Admin → Access Granted
```

---

### Layer 2: Admin Secret Key (Header Authentication)

**Middleware:** `adminAuth.ts` → `requireAdmin()`

**Implementation:**
```typescript
X-Admin-Secret: your_64_character_secret_key
```

**Checks:**
1. ✅ JWT token valid (from `@fastify/jwt`)
2. ✅ `X-Admin-Secret` header matches `ADMIN_SECRET_KEY` env var
3. ✅ Wallet address exists in `admin_allowlist` table
4. ✅ Admin role is `ADMIN` or `SUPER_ADMIN`
5. ✅ `is_active = true` in allowlist

**On Failure:**
- HTTP 403 Forbidden
- Security audit log entry created
- Admin attempt logged with IP + User-Agent

---

### Layer 3: MFA/2FA (Sensitive Operations)

**Middleware:** `adminAuth.ts` → `requireAdminMFA()`

**Required for:**
- ❌ **Reward Config Updates** (changing ROI rates, MLM commissions)
- ❌ **Manual Withdrawals** (force-processing stuck withdrawals)
- ❌ **Ledger Adjustments** (crediting/debiting user balances)
- ❌ **Withdrawal Address Override** (changing withdrawal destination)
- ❌ **Manual Rank Upgrades** (bypassing rank requirements)

**Implementation:**
```typescript
X-Admin-MFA: 123456  // TOTP 6-digit code
```

**TOTP Algorithm:**
- Standard: RFC 6238 (Time-based One-Time Password)
- Window: 30 seconds
- Digits: 6
- Algorithm: HMAC-SHA1
- Tolerance: ±1 window (60 seconds total)

**Authentication Flow:**
```
1. Admin authenticates with JWT + X-Admin-Secret
2. Admin attempts sensitive operation
3. Backend requires X-Admin-MFA header
4. Validates TOTP code against:
   - Global ADMIN_MFA_SECRET (env var), OR
   - Per-user mfa_secret (admin_allowlist.mfa_secret)
5. Logs operation in security_audit_log
6. Proceeds with operation
```

---

## 📊 DATABASE SCHEMA

### `admin_allowlist` Table
```sql
CREATE TABLE admin_allowlist (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    wallet_address VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(20) CHECK (role IN ('ADMIN', 'SUPER_ADMIN')),
    is_active BOOLEAN DEFAULT true,
    mfa_secret VARCHAR(255),  -- TOTP secret (base32)
    mfa_enabled BOOLEAN DEFAULT false,
    added_by UUID REFERENCES users(id),
    added_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    mfa_setup_at TIMESTAMPTZ,
    mfa_backup_codes TEXT[],  -- Backup codes for recovery
    notes TEXT
);
```

### `security_audit_log` Table
```sql
CREATE TABLE security_audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    event_type VARCHAR(50),  -- ADMIN_ACCESS_DENIED, MFA_FAILED, etc.
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexed Events:**
- `ADMIN_ACCESS_DENIED` - Failed admin panel access
- `MFA_FAILED` - Invalid TOTP code
- `SENSITIVE_OPERATION_AUTHORIZED` - Successful MFA operation
- `ADMIN_LOGIN` - Successful admin login
- `WITHDRAWAL_OVERRIDE` - Address override action

---

## 🔧 ENVIRONMENT VARIABLES

### Required for Admin Panel

```bash
# .env.local / .env.production
ADMIN_SECRET_KEY=your_64_character_random_secret_key_change_in_production
ADMIN_MFA_SECRET=your_32_character_totp_secret_optional_can_be_per_user
```

**Generate Keys:**
```bash
# Admin secret key (64 chars)
openssl rand -base64 48

# MFA secret (32 chars)
openssl rand -base64 24
```

---

## 🚀 SETUP INSTRUCTIONS

### 1. Backend Configuration

```bash
cd nexus-backend-prod

# Add admin security keys to .env.local
echo "ADMIN_SECRET_KEY=$(openssl rand -base64 48)" >> .env.local
echo "ADMIN_MFA_SECRET=$(openssl rand -base64 24)" >> .env.local

# Run migration 007
npm run migrate

# Verify tables created
psql $DATABASE_URL -c "SELECT * FROM admin_allowlist;"
```

### 2. Add First Admin to Allowlist

```sql
-- Connect to database
psql postgresql://localhost:5432/nexus_testnet

-- Add your wallet as super admin
INSERT INTO admin_allowlist (user_id, wallet_address, role, is_active, notes)
SELECT 
    id,
    wallet_address,
    'SUPER_ADMIN',
    true,
    'First admin - added manually'
FROM users
WHERE wallet_address = '0xYourWalletAddressHere'
LIMIT 1;

-- Verify
SELECT * FROM admin_allowlist;
```

### 3. Frontend Configuration (Admin Panel)

```bash
cd nexus-admin-frontend-prod

# No env vars needed - uses X-Admin-Secret header from login
npm install
npm run dev
```

### 4. Test Admin Access

**Login to Admin Panel:**
1. Open http://localhost:5175
2. Connect MetaMask
3. Sign message
4. **Important:** Include `X-Admin-Secret` header in API requests

**Frontend automatically adds header via axios interceptor:**
```typescript
// In admin-frontend/src/lib/api.ts
apiClient.interceptors.request.use((config) => {
  const adminSecret = localStorage.getItem('adminSecret') // User enters on first login
  if (adminSecret) {
    config.headers['X-Admin-Secret'] = adminSecret
  }
  return config
})
```

---

## 🔐 MFA SETUP (Google Authenticator)

### Option 1: Global MFA Secret (Simple)
All admins share same TOTP secret

```bash
# In .env.local
ADMIN_MFA_SECRET=shared_secret_base32_encoded
```

### Option 2: Per-User MFA (Recommended)
Each admin has unique TOTP secret

```sql
-- Generate secret for specific admin
UPDATE admin_allowlist
SET 
    mfa_secret = 'BASE32_ENCODED_SECRET',
    mfa_enabled = true,
    mfa_setup_at = NOW()
WHERE wallet_address = '0xAdminWallet';
```

**QR Code Generation (for Google Authenticator):**
```typescript
// Backend: Generate TOTP QR code
import * as speakeasy from 'speakeasy'
import * as QRCode from 'qrcode'

const secret = speakeasy.generateSecret({
  name: 'Nexus Admin',
  length: 32
})

const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url)
// Send qrCodeUrl to admin to scan
```

---

## 📡 API USAGE EXAMPLES

### Standard Admin Request (No MFA)
```bash
curl -X GET \
  http://localhost:3000/v1/admin/users \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "X-Admin-Secret: your_64_char_secret"
```

### Sensitive Operation (Requires MFA)
```bash
curl -X POST \
  http://localhost:3000/v1/admin/ledger/adjust \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "X-Admin-Secret: your_64_char_secret" \
  -H "X-Admin-MFA: 123456" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "uuid",
    "token": "USDT",
    "amount": "100",
    "reason": "Refund for error"
  }'
```

### Check Admin Allowlist
```bash
curl -X GET \
  http://localhost:3000/v1/admin/verify-allowlist \
  -H "Authorization: Bearer JWT_TOKEN"
```

**Response:**
```json
{
  "allowed": true,
  "walletAddress": "0x...",
  "role": "ADMIN"
}
```

---

## 🚨 SECURITY MONITORING

### Query Failed Admin Attempts
```sql
SELECT 
    user_id,
    event_type,
    ip_address,
    created_at,
    details
FROM security_audit_log
WHERE event_type IN ('ADMIN_ACCESS_DENIED', 'MFA_FAILED')
ORDER BY created_at DESC
LIMIT 50;
```

### Check Recent Sensitive Operations
```sql
SELECT 
    user_id,
    event_type,
    ip_address,
    details->>'path' as endpoint,
    created_at
FROM security_audit_log
WHERE event_type = 'SENSITIVE_OPERATION_AUTHORIZED'
ORDER BY created_at DESC
LIMIT 20;
```

### Admin Login Activity
```sql
SELECT 
    aa.wallet_address,
    aa.role,
    aa.last_login_at,
    COUNT(sal.id) as failed_attempts_24h
FROM admin_allowlist aa
LEFT JOIN security_audit_log sal ON sal.user_id = aa.user_id
    AND sal.event_type = 'ADMIN_ACCESS_DENIED'
    AND sal.created_at > NOW() - INTERVAL '24 hours'
GROUP BY aa.id, aa.wallet_address, aa.role, aa.last_login_at
ORDER BY failed_attempts_24h DESC;
```

---

## ⚠️ PRODUCTION CHECKLIST

### Before Deployment
- [ ] Generate strong `ADMIN_SECRET_KEY` (64+ characters)
- [ ] Generate unique `ADMIN_MFA_SECRET` per admin
- [ ] Store secrets in AWS Secrets Manager / Vault
- [ ] Add production admin wallets to allowlist
- [ ] Test MFA flow with Google Authenticator
- [ ] Verify 403 page for non-admin wallets
- [ ] Enable security audit log monitoring
- [ ] Setup alerts for failed admin attempts
- [ ] Document admin onboarding process
- [ ] Create backup MFA recovery codes

### Security Best Practices
1. **Never commit** `ADMIN_SECRET_KEY` or `ADMIN_MFA_SECRET` to Git
2. **Rotate secrets** every 90 days
3. **Limit admin count** (principle of least privilege)
4. **Monitor audit logs** daily
5. **Require MFA** for all sensitive operations
6. **Use hardware keys** (YubiKey) for super admins
7. **Enable IP whitelisting** for admin panel access
8. **Setup rate limiting** on admin endpoints (100 req/min)

---

## 🐛 TROUBLESHOOTING

### Issue: "Admin Secret Key Invalid"
**Solution:**
```bash
# Check .env.local has ADMIN_SECRET_KEY
cat .env.local | grep ADMIN_SECRET_KEY

# Verify header is sent
# In browser DevTools → Network → Request Headers
X-Admin-Secret: should_be_present
```

### Issue: "MFA Token Invalid"
**Solution:**
```bash
# Check system time is synchronized
ntpdate -s time.apple.com  # macOS
sudo ntpdate pool.ntp.org  # Linux

# Verify TOTP secret is base32 encoded
# Verify Google Authenticator app time is auto-synced
```

### Issue: "Not in Admin Allowlist"
**Solution:**
```sql
-- Check if wallet exists in allowlist
SELECT * FROM admin_allowlist WHERE wallet_address = '0xYour...';

-- Add wallet if missing
INSERT INTO admin_allowlist (user_id, wallet_address, role, is_active)
SELECT id, wallet_address, 'ADMIN', true
FROM users WHERE wallet_address = '0xYour...';
```

---

## 📚 REFERENCES

- TOTP RFC: https://tools.ietf.org/html/rfc6238
- Google Authenticator: https://support.google.com/accounts/answer/1066447
- Speakeasy Library: https://www.npmjs.com/package/speakeasy
- OWASP Auth Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

---

**Last Updated:** 2024-02-28  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
