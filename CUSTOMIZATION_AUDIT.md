# 🎯 SINGLE POINT OF ENTRY - CUSTOMIZATION AUDIT

## ✅ CONFIRMED: NO CODE CHANGES NEEDED FOR CUSTOMIZATION

This document identifies the **exact files** where UI and business logic can be modified **without touching application code**.

---

## 🎨 1. UI CUSTOMIZATION - SINGLE FILE

### **Primary Brand Colors & Login Button**

**📁 File:** `nexus-frontend-prod/tailwind.config.ts`

```typescript
// Lines 14-30: PRIMARY BRAND COLORS
primary: {
  50: '#eff6ff',
  100: '#dbeafe',
  200: '#bfdbfe',
  300: '#93c5fd',
  400: '#60a5fa',
  500: '#3b82f6', // ⬅️ CHANGE THIS for main primary color
  600: '#2563eb',
  700: '#1d4ed8',
  800: '#1e40af',
  900: '#1e3a8a',
},

// Lines 31-43: SECONDARY COLORS (Success/Green)
secondary: {
  50: '#f0fdf4',
  100: '#dcfce7',
  200: '#bbf7d0',
  300: '#86efac',
  400: '#4ade80',
  500: '#22c55e', // ⬅️ CHANGE THIS for secondary color
  600: '#16a34a',
  700: '#15803d',
  800: '#166534',
  900: '#14532d',
},

// Lines 44-56: ACCENT COLORS (Warning/Highlight)
accent: {
  50: '#fffbeb',
  100: '#fef3c7',
  200: '#fde68a',
  300: '#fcd34d',
  400: '#fbbf24',
  500: '#f59e0b', // ⬅️ CHANGE THIS for accent/warning
  600: '#d97706',
  700: '#b45309',
  800: '#92400e',
  900: '#78350f',
},
```

**Login Button automatically inherits these colors via:**
- `nexus-frontend-prod/src/components/WalletLoginButton.tsx`
- Uses `className="bg-primary-500 hover:bg-primary-600"`
- Changes to `primary.500` in `tailwind.config.ts` **automatically apply**

---

### **Brand Name & Logo**

**📁 File:** `nexus-frontend-prod/src/contexts/ThemeContext.tsx`

```typescript
// Lines 16-22: DEFAULT THEME
const defaultTheme: ThemeConfig = {
  primaryColor: '#3b82f6',
  secondaryColor: '#22c55e',
  accentColor: '#f59e0b',
  brandName: 'Nexus Rewards', // ⬅️ CHANGE THIS for brand name
  logo: '/logo.svg',           // ⬅️ CHANGE THIS for logo path
  darkMode: true,
};
```

**Where it's used:**
- Header component displays `theme.brandName`
- Logo component reads `theme.logo`
- No code changes needed - just update these values

---

### **Complete Rebranding Steps**

1. **Change colors** in `tailwind.config.ts` (lines 14-56)
2. **Change brand name** in `ThemeContext.tsx` (line 21)
3. **Replace logo** at `nexus-frontend-prod/public/logo.svg`
4. **Rebuild frontend:**
   ```bash
   cd nexus-frontend-prod
   npm run build
   ```

**Total Time: ~5 minutes**  
**Files Modified: 2**  
**No Code Changes Required: ✅**

---

## 🔧 2. BUSINESS LOGIC - DATABASE ONLY

### **Reward Rates Configuration**

**📁 Database Table:** `reward_config`

**Location:** PostgreSQL database (no code files)

**Access via SQL:**

```sql
-- View current configuration
SELECT * FROM reward_config ORDER BY config_type, level;

-- ========================================
-- DAILY ROI RATE CHANGES
-- ========================================

-- Change from 0.3% to 0.5% daily ROI
UPDATE reward_config 
SET daily_rate_bps = 50 
WHERE config_type = 'roi';

-- Change standard cap from 200% to 250%
UPDATE reward_config 
SET standard_cap_percent = 250 
WHERE config_type = 'roi';

-- Change ranked cap from 300% to 400%
UPDATE reward_config 
SET ranked_cap_percent = 400 
WHERE config_type = 'roi';

-- ========================================
-- MLM COMMISSION CHANGES
-- ========================================

-- Change Level 1 commission from 1% to 1.5%
UPDATE reward_config 
SET commission_rate_bps = 150 
WHERE config_type = 'mlm_level' AND level = 1;

-- Change Level 2 commission from 0.5% to 0.75%
UPDATE reward_config 
SET commission_rate_bps = 75 
WHERE config_type = 'mlm_level' AND level = 2;

-- Disable Level 7 commissions
UPDATE reward_config 
SET is_active = FALSE 
WHERE config_type = 'mlm_level' AND level = 7;

-- ========================================
-- RANK REQUIREMENTS CHANGES
-- ========================================

-- Change L1 requirement from 5 to 3 direct referrals
UPDATE reward_config 
SET required_directs = 3 
WHERE config_type = 'rank' AND rank_level = 1;

-- View all rank requirements
SELECT rank_name, required_directs, required_direct_rank 
FROM reward_config 
WHERE config_type = 'rank' 
ORDER BY rank_level;
```

---

### **How It Works (No Code Deployment)**

1. **Services Read Config Dynamically:**
   - `ROICalculatorService.getROIConfig()` - Reads from database
   - `credit_mlm_tree()` function - Queries `reward_config` table
   - No hardcoded values in application code

2. **Changes Apply Immediately:**
   ```sql
   -- Update commission
   UPDATE reward_config SET commission_rate_bps = 150 WHERE level = 1;
   
   -- Next deposit processes with new rate (no restart needed)
   ```

3. **Verification:**
   ```bash
   # Check if backend picked up changes
   curl https://api.stackmeridian.com/api/config/rewards
   ```

**Files Modified: 0**  
**Backend Restart: Not required**  
**Database Restart: Not required**

---

## 🎯 3. CUSTOMIZATION POINTS SUMMARY

| Component | File Location | Changes Needed | Restart Required |
|-----------|---------------|----------------|------------------|
| **Primary Color** | `tailwind.config.ts` (line 20) | Change hex value | Frontend rebuild |
| **Secondary Color** | `tailwind.config.ts` (line 37) | Change hex value | Frontend rebuild |
| **Brand Name** | `ThemeContext.tsx` (line 21) | Change string | Frontend rebuild |
| **Logo** | `public/logo.svg` | Replace file | Frontend rebuild |
| **ROI Rate** | Database: `reward_config` table | SQL UPDATE | No |
| **MLM Commissions** | Database: `reward_config` table | SQL UPDATE | No |
| **Rank Requirements** | Database: `reward_config` table | SQL UPDATE | No |

---

## 🚫 4. WHAT DOESN'T REQUIRE CODE CHANGES

### ✅ **Confirmed Zero-Code Customizations:**

1. **All visual styling** - Tailwind config only
2. **ROI daily rate** - Database SQL
3. **ROI caps (200%/300%)** - Database SQL
4. **All 7 MLM commission levels** - Database SQL
5. **Rank requirements** - Database SQL
6. **Brand name display** - ThemeContext only
7. **Logo image** - File replacement only

### ❌ **What WOULD Require Code Changes:**

1. **Changing from 7 to 10 MLM levels** - Recursive CTE modification
2. **Adding new reward types** - Service layer changes
3. **Changing blockchain (BSC to Ethereum)** - RPC config only (not code)
4. **Adding new user roles** - Database + middleware changes
5. **Changing withdrawal approval logic** - Service modification

---

## 📋 5. CUSTOMIZATION CHECKLIST

### **Pre-Launch Branding:**
- [ ] Update `primary.500` color in `tailwind.config.ts`
- [ ] Update `secondary.500` color in `tailwind.config.ts`
- [ ] Update `brandName` in `ThemeContext.tsx`
- [ ] Replace `/public/logo.svg` with custom logo
- [ ] Run `npm run build` in frontend

### **Business Logic Tuning:**
- [ ] Review ROI daily rate in `reward_config` table
- [ ] Verify MLM commission structure (7 levels)
- [ ] Confirm rank requirements match business plan
- [ ] Test configuration changes on staging first

### **Verification:**
- [ ] Login button shows correct brand color
- [ ] Header displays correct brand name
- [ ] Logo appears correctly
- [ ] New deposits use updated ROI rate
- [ ] MLM commissions calculated with new rates

---

## 🎓 6. FOR NON-TECHNICAL ADMINS

### **To Change Brand Colors:**

1. Open file: `nexus-frontend-prod/tailwind.config.ts`
2. Find line 20: `500: '#3b82f6',`
3. Change `#3b82f6` to your color (use https://htmlcolorcodes.com)
4. Run in terminal:
   ```bash
   cd nexus-frontend-prod
   npm run build
   pm2 reload all
   ```

### **To Change ROI Rate:**

1. Connect to database:
   ```bash
   psql nexus_production
   ```
2. Run SQL:
   ```sql
   UPDATE reward_config 
   SET daily_rate_bps = 50  -- 0.5% daily (change number as needed)
   WHERE config_type = 'roi';
   ```
3. Exit: `\q`
4. **No server restart needed** - takes effect immediately

### **To Change Level 1 Commission:**

```sql
UPDATE reward_config 
SET commission_rate_bps = 150  -- 1.5% (was 100 = 1%)
WHERE config_type = 'mlm_level' AND level = 1;
```

---

## ✅ AUDIT RESULT

**CONFIRMED:** 
- ✅ UI customization requires **2 files only** (`tailwind.config.ts`, `ThemeContext.tsx`)
- ✅ Business logic changes via **SQL only** (no code deployment)
- ✅ Login button color **automatically inherits** from theme
- ✅ Rank rewards **100% database-driven** (no hardcoded values)

**STATUS:** ✅ SINGLE POINT OF ENTRY VERIFIED
