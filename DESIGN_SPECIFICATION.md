# Nexus Rewards - Elite UI/UX Design Specification
**Version:** 2.0  
**Date:** February 28, 2026  
**Level:** PhD-Grade Systems Architecture

---

## 1. VISUAL IDENTITY: "Deep Space Trust"

### 1.1 Color System (Tailwind Extension)

```typescript
// tailwind.config.ts - UPDATED THEME
export default {
  theme: {
    extend: {
      colors: {
        // Deep Space Background
        'space': {
          50: '#1a1f3a',
          100: '#151a30',
          900: '#0A0E27', // Primary background
        },
        // Trust Blue (Primary Actions)
        'trust': {
          50: '#e6f0ff',
          100: '#cce0ff',
          400: '#4d94ff',
          500: '#0066FF', // Main CTA
          600: '#0052cc',
          700: '#003d99',
        },
        // Growth Green (Earnings/Success)
        'growth': {
          50: '#e6fff9',
          100: '#ccfff3',
          400: '#33ffe6',
          500: '#00D4AA', // Earnings indicator
          600: '#00a888',
          700: '#007d66',
        },
        // Achievement Gold (Ranks)
        'achievement': {
          50: '#fffef0',
          100: '#fffce0',
          400: '#ffe680',
          500: '#FFD700', // Rank milestones
          600: '#ccac00',
          700: '#998100',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
        glass: '16px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #0066FF, 0 0 10px #0066FF' },
          '100%': { boxShadow: '0 0 10px #0066FF, 0 0 20px #0066FF, 0 0 30px #0066FF' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
}
```

### 1.2 Typography Rules

**Headers (Poppins Bold):**
- Hero: 48px / 3rem (font-bold)
- H1: 36px / 2.25rem (font-bold)
- H2: 24px / 1.5rem (font-semibold)
- H3: 18px / 1.125rem (font-medium)

**Financial Values (JetBrains Mono):**
- All USDT amounts: `font-mono text-2xl font-bold`
- Wallet addresses: `font-mono text-sm text-gray-400`
- Percentages: `font-mono text-lg font-semibold`

**Body Text (Poppins Regular):**
- Primary: 16px / 1rem
- Secondary: 14px / 0.875rem
- Caption: 12px / 0.75rem

---

## 2. GLASSMORPHISM COMPONENTS

### 2.1 Card System (Base Component)

```tsx
// components/common/GlassCard.tsx
export const GlassCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}> = ({ children, className = '', glow = false }) => (
  <div className={`
    bg-white/5 
    backdrop-blur-glass 
    border border-white/10 
    rounded-xl 
    shadow-2xl 
    ${glow ? 'animate-glow' : ''}
    ${className}
  `}>
    {children}
  </div>
);
```

### 2.2 Progress Bar (Animated)

```tsx
// components/common/AnimatedProgress.tsx
export const AnimatedProgress: React.FC<{
  value: number; // 0-100
  max: number;
  label: string;
  color?: 'trust' | 'growth' | 'achievement';
}> = ({ value, max, label, color = 'trust' }) => {
  const percent = (value / max) * 100;
  const colorClasses = {
    trust: 'from-trust-500 to-trust-600',
    growth: 'from-growth-500 to-growth-600',
    achievement: 'from-achievement-500 to-achievement-600',
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-300">{label}</span>
        <span className="font-mono text-white font-bold">{percent.toFixed(1)}%</span>
      </div>
      <div className="h-3 bg-space-100 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${colorClasses[color]} transition-all duration-1000 ease-out`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-xs font-mono text-gray-400">
        <span>${value.toLocaleString()}</span>
        <span>${max.toLocaleString()}</span>
      </div>
    </div>
  );
};
```

---

## 3. PAGE-SPECIFIC DESIGNS

### 3.1 Dashboard: "Central Command"

**Layout Structure:**
```
┌─────────────────────────────────────────────┐
│  Live Earnings Counter (Pulsing)           │  ← Animated heartbeat
├──────────┬──────────┬──────────┬───────────┤
│ Balance  │ Earned   │ Withdrawn│ Pending   │  ← 4-column KPI grid
├──────────┴──────────┴──────────┴───────────┤
│  ROI Progress Bar (300% Cap Indicator)     │  ← Full-width progress
├─────────────────────────────────────────────┤
│  Rank Status Card (Glow on Achieved)       │  ← Achievement tracker
├─────────────────────────────────────────────┤
│  Active Deposits Table (Mobile: Cards)     │  ← Responsive table
└─────────────────────────────────────────────┘
```

**Key Features:**
- **Live Earnings Counter:** Updates every 5 seconds, uses `animate-pulse-slow`
- **ROI Progress:** Shows current earnings vs 200%/300% cap with gradient fill
- **Mobile Transformation:** Tables become vertical cards with horizontal scroll

### 3.2 Rank Page: "Achievement Tree"

**Visual Concept:**
```
        ⭐ L7 Legend (Locked/Grayscale)
              ↑
        👑 L6 Master (Locked)
              ↑
        💠 L5 Diamond (Locked)
              ↑
        💎 L4 Platinum (Current - GLOWING)
              ↑
        🥇 L3 Gold (Achieved ✓)
              ↑
        🥈 L2 Silver (Achieved ✓)
              ↑
        🥉 L1 Bronze (Achieved ✓)
```

**Implementation:**
```tsx
// components/RankTimeline.tsx
export const RankTimeline: React.FC<{ currentRank: number }> = ({ currentRank }) => {
  const ranks = [
    { level: 7, name: 'Legend', icon: '⭐', color: 'red' },
    { level: 6, name: 'Master', icon: '👑', color: 'purple' },
    { level: 5, name: 'Diamond', icon: '💠', color: 'blue' },
    { level: 4, name: 'Platinum', icon: '💎', color: 'cyan' },
    { level: 3, name: 'Gold', icon: '🥇', color: 'yellow' },
    { level: 2, name: 'Silver', icon: '🥈', color: 'gray' },
    { level: 1, name: 'Bronze', icon: '🥉', color: 'orange' },
  ];

  return (
    <div className="relative py-8">
      {/* Vertical Line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-achievement-500 to-space-100" />
      
      {ranks.map((rank, idx) => {
        const isAchieved = rank.level <= currentRank;
        const isCurrent = rank.level === currentRank;
        
        return (
          <div key={rank.level} className="relative mb-12">
            <div className={`
              flex items-center justify-center w-24 h-24 mx-auto rounded-full
              ${isAchieved ? 'bg-achievement-500 animate-glow' : 'bg-gray-700 grayscale'}
              ${isCurrent ? 'ring-4 ring-trust-500 animate-float' : ''}
              border-4 border-space-900
              transition-all duration-500
            `}>
              <span className="text-5xl">{rank.icon}</span>
            </div>
            <div className="text-center mt-4">
              <div className={`text-xl font-bold ${isAchieved ? 'text-white' : 'text-gray-500'}`}>
                {rank.name}
              </div>
              {isCurrent && (
                <span className="inline-block mt-2 px-3 py-1 bg-trust-500 text-white text-xs rounded-full">
                  CURRENT RANK
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

### 3.3 Referral Tree: "Network Leadership"

**Interactive Hierarchy:**
- Use `react-d3-tree` or custom SVG visualization
- Show 3 generations by default, expand on click
- Color-code by rank level
- Show deposit volume on hover

```tsx
// components/NetworkTree.tsx
interface TreeNode {
  name: string; // wallet address (shortened)
  rank: number;
  volume: number;
  children?: TreeNode[];
}

export const NetworkTree: React.FC<{ data: TreeNode }> = ({ data }) => {
  return (
    <div className="overflow-auto p-8">
      {/* Custom SVG tree or react-d3-tree integration */}
      <Tree
        data={data}
        orientation="vertical"
        pathFunc="step"
        nodeSize={{ x: 200, y: 150 }}
        renderCustomNodeElement={({ nodeDatum }) => (
          <g>
            <circle r={30} fill={getRankColor(nodeDatum.rank)} />
            <text y={50} textAnchor="middle" className="font-mono text-xs">
              {shortenAddress(nodeDatum.name)}
            </text>
            <text y={65} textAnchor="middle" className="text-xs text-gray-400">
              ${nodeDatum.volume.toLocaleString()}
            </text>
          </g>
        )}
      />
    </div>
  );
};
```

---

## 4. RESPONSIVE BREAKPOINTS

```typescript
// Mobile-First Architecture
const breakpoints = {
  sm: '640px',  // Mobile landscape
  md: '768px',  // Tablet
  lg: '1024px', // Desktop
  xl: '1280px', // Large desktop
};

// Navigation Strategy:
// Mobile (<768px): Bottom navigation bar (fixed)
// Desktop (≥768px): Left sidebar (persistent)
```

### 4.1 Mobile Bottom Nav

```tsx
// components/layout/MobileNav.tsx
export const MobileNav: React.FC = () => (
  <nav className="fixed bottom-0 left-0 right-0 bg-space-900/95 backdrop-blur-glass border-t border-white/10 md:hidden z-50">
    <div className="flex justify-around items-center h-16">
      {['Dashboard', 'Network', 'Rank', 'Deposits'].map((item) => (
        <NavLink
          key={item}
          to={`/${item.toLowerCase()}`}
          className={({ isActive }) => `
            flex flex-col items-center justify-center flex-1 h-full
            ${isActive ? 'text-trust-500' : 'text-gray-400'}
          `}
        >
          <Icon name={item} className="w-6 h-6" />
          <span className="text-xs mt-1">{item}</span>
        </NavLink>
      ))}
    </div>
  </nav>
);
```

### 4.2 Desktop Sidebar

```tsx
// components/layout/Sidebar.tsx
export const Sidebar: React.FC = () => (
  <aside className="hidden md:flex flex-col w-64 bg-space-900 border-r border-white/10 min-h-screen">
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white">Nexus Rewards</h1>
    </div>
    <nav className="flex-1 px-4 space-y-2">
      {menuItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => `
            flex items-center gap-3 px-4 py-3 rounded-lg transition-all
            ${isActive 
              ? 'bg-trust-500 text-white' 
              : 'text-gray-400 hover:bg-white/5'
            }
          `}
        >
          <item.icon className="w-5 h-5" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  </aside>
);
```

---

## 5. WALLET STATES (Comprehensive UX)

### 5.1 State Machine

```tsx
type WalletState = 
  | 'disconnected'      // No wallet detected
  | 'wrong_network'     // Not on BSC Testnet
  | 'connecting'        // MetaMask popup open
  | 'signing'           // Awaiting signature
  | 'connected'         // Fully authenticated
  | 'error';            // Connection failed

export const WalletStateIndicator: React.FC<{ state: WalletState }> = ({ state }) => {
  const states = {
    disconnected: {
      icon: '🔌',
      text: 'Connect Wallet',
      color: 'bg-gray-600',
      action: 'Click to connect MetaMask',
    },
    wrong_network: {
      icon: '⚠️',
      text: 'Wrong Network',
      color: 'bg-yellow-600',
      action: 'Switch to BSC Testnet',
      autoSwitch: true,
    },
    connecting: {
      icon: '⏳',
      text: 'Connecting...',
      color: 'bg-blue-600 animate-pulse',
    },
    signing: {
      icon: '✍️',
      text: 'Sign Message',
      color: 'bg-purple-600 animate-pulse',
    },
    connected: {
      icon: '✅',
      text: 'Connected',
      color: 'bg-growth-500',
    },
    error: {
      icon: '❌',
      text: 'Connection Failed',
      color: 'bg-red-600',
      action: 'Try again',
    },
  };

  const current = states[state];
  
  return (
    <div className={`${current.color} text-white px-4 py-2 rounded-lg flex items-center gap-2`}>
      <span className="text-xl">{current.icon}</span>
      <div className="flex-1">
        <div className="font-semibold">{current.text}</div>
        {current.action && (
          <div className="text-xs opacity-90">{current.action}</div>
        )}
      </div>
    </div>
  );
};
```

### 5.2 Auto Network Switch

```tsx
// lib/wallet.ts
export async function ensureBSCTestnet() {
  const chainId = await window.ethereum.request({ method: 'eth_chainId' });
  
  if (chainId !== '0x61') { // BSC Testnet = 97 = 0x61
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x61' }],
      });
    } catch (switchError: any) {
      // Chain not added, add it
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x61',
            chainName: 'BSC Testnet',
            nativeCurrency: { name: 'BNB', symbol: 'tBNB', decimals: 18 },
            rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
            blockExplorerUrls: ['https://testnet.bscscan.com'],
          }],
        });
      }
    }
  }
}
```

---

## 6. DEPOSIT VALIDATION FLOW

### 6.1 Multi-Step Validation

```tsx
// components/DepositForm.tsx
export const DepositForm: React.FC = () => {
  const [amount, setAmount] = useState('');
  const [stage, setStage] = useState<'input' | 'approve' | 'deposit' | 'success'>('input');
  
  const validations = {
    minAmount: amount >= 100,
    hasAllowance: allowance >= amount,
    hasBalance: balance >= amount,
  };

  return (
    <GlassCard className="p-6">
      <h3 className="text-xl font-bold text-white mb-4">Make a Deposit</h3>
      
      {/* Amount Input */}
      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-300">Amount (USDT)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full mt-1 px-4 py-3 bg-space-100 border border-white/10 rounded-lg text-white font-mono text-2xl focus:ring-2 focus:ring-trust-500"
            placeholder="100.00"
          />
          
          {/* Live Validation Feedback */}
          <div className="mt-2 space-y-1">
            <ValidationCheck 
              passed={validations.minAmount} 
              text="Minimum $100 USDT" 
            />
            <ValidationCheck 
              passed={validations.hasBalance} 
              text={`Wallet balance: $${balance}`} 
            />
            <ValidationCheck 
              passed={validations.hasAllowance} 
              text="Token allowance approved" 
            />
          </div>
        </div>

        {/* Action Buttons */}
        {!validations.hasAllowance ? (
          <button
            onClick={handleApprove}
            disabled={!validations.minAmount || !validations.hasBalance}
            className="w-full py-4 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white font-bold rounded-lg transition-all"
          >
            1️⃣ Approve USDT
          </button>
        ) : (
          <button
            onClick={handleDeposit}
            disabled={!Object.values(validations).every(v => v)}
            className="w-full py-4 bg-gradient-to-r from-trust-500 to-trust-600 hover:from-trust-600 hover:to-trust-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-lg transition-all animate-glow"
          >
            2️⃣ Deposit ${amount} USDT
          </button>
        )}
      </div>
    </GlassCard>
  );
};

const ValidationCheck: React.FC<{ passed: boolean; text: string }> = ({ passed, text }) => (
  <div className={`flex items-center gap-2 text-sm ${passed ? 'text-growth-500' : 'text-gray-400'}`}>
    <span>{passed ? '✅' : '⏳'}</span>
    <span>{text}</span>
  </div>
);
```

---

## 7. BACKEND: RANK CHECKER CRON JOB

### 7.1 Pseudo-Code Logic

```typescript
/**
 * RANK UPGRADE CRON JOB
 * Runs: Every hour (0 * * * *)
 * Purpose: Check all users for rank upgrades and update ROI cap
 */

async function rankUpgradeChecker() {
  const client = await pool.connect();
  
  try {
    // 1. Get all users who are NOT at max rank (L7)
    const users = await client.query(`
      SELECT id, current_rank, wallet_address 
      FROM users 
      WHERE current_rank < 7
    `);

    for (const user of users.rows) {
      const userId = user.id;
      const currentRank = user.current_rank;
      const nextRank = currentRank + 1;

      // 2. Get requirements for next rank
      const reqResult = await client.query(`
        SELECT required_directs, required_direct_rank, min_deposit_atomic
        FROM reward_config
        WHERE config_type = 'rank' AND rank_level = $1
      `, [nextRank]);

      if (reqResult.rows.length === 0) continue; // No next rank defined

      const requirements = reqResult.rows[0];
      const minDeposit = BigInt(requirements.min_deposit_atomic);
      const requiredDirects = requirements.required_directs;
      const requiredDirectRank = requirements.required_direct_rank;

      // 3. Count qualified direct referrals
      const qualifiedCount = await client.query(`
        SELECT COUNT(*) as count
        FROM users d
        JOIN user_balances ub ON ub.user_id = d.id
        WHERE d.sponsor_id = $1
          AND ub.total_deposited_atomic >= $2
          AND d.current_rank >= $3
      `, [userId, minDeposit.toString(), requiredDirectRank || 0]);

      const qualified = parseInt(qualifiedCount.rows[0].count);

      // 4. Check if user meets requirements
      if (qualified >= requiredDirects) {
        // UPGRADE USER
        await client.query('BEGIN');
        
        try {
          // Update user rank
          await client.query(`
            UPDATE users 
            SET current_rank = $1, updated_at = NOW()
            WHERE id = $2
          `, [nextRank, userId]);

          // Update ROI cap to 300% (if moving from L0 to L1)
          if (currentRank === 0 && nextRank === 1) {
            await client.query(`
              UPDATE roi_ledger
              SET max_roi_atomic = principal_atomic * 3
              WHERE user_id = $1 AND status = 'active'
            `, [userId]);
          }

          // Log rank achievement
          await client.query(`
            INSERT INTO rank_achievements 
            (user_id, rank_level, achieved_at)
            VALUES ($1, $2, NOW())
          `, [userId, nextRank]);

          await client.query('COMMIT');
          
          console.log(`✅ Upgraded user ${user.wallet_address} to rank L${nextRank}`);
        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`❌ Failed to upgrade user ${userId}:`, err);
        }
      }
    }
  } finally {
    client.release();
  }
}

// Schedule with node-cron
import cron from 'node-cron';
cron.schedule('0 * * * *', rankUpgradeChecker); // Every hour
```

### 7.2 Weekly Pool Distribution Logic

```typescript
/**
 * WEEKLY RANK POOL DISTRIBUTOR
 * Runs: Every Monday at 00:00 UTC (0 0 * * 1)
 * Purpose: Distribute 0.3% of ecosystem deposits to ranked users
 */

async function weeklyRankPoolDistributor() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. Calculate total pool (0.3% of all deposits from last week)
    const poolResult = await client.query(`
      SELECT SUM(amount_atomic) * 0.003 as pool_total
      FROM deposits
      WHERE created_at >= NOW() - INTERVAL '7 days'
        AND status = 'confirmed'
    `);
    
    const totalPool = BigInt(poolResult.rows[0]?.pool_total || '0');
    
    if (totalPool === 0n) {
      console.log('No pool to distribute this week');
      return;
    }

    // 2. Define rank percentages
    const rankShares = {
      1: 0.35, // L1 Bronze: 35%
      2: 0.25, // L2 Silver: 25%
      3: 0.17, // L3 Gold: 17%
      4: 0.10, // L4 Platinum: 10%
      5: 0.07, // L5 Diamond: 7%
      6: 0.04, // L6 Master: 4%
      7: 0.02, // L7 Legend: 2%
    };

    // 3. For each rank level
    for (let rank = 1; rank <= 7; rank++) {
      const rankPoolAmount = totalPool * BigInt(Math.floor(rankShares[rank] * 1e18)) / BigInt(1e18);
      
      // Get all users at this rank level
      const usersAtRank = await client.query(`
        SELECT id, wallet_address 
        FROM users 
        WHERE current_rank = $1
      `, [rank]);

      if (usersAtRank.rows.length === 0) continue;

      // 4. Split equally among all users at this rank
      const perUserAmount = rankPoolAmount / BigInt(usersAtRank.rows.length);

      // 5. Credit each user
      for (const user of usersAtRank.rows) {
        await client.query(`
          INSERT INTO ledger_entries 
          (user_id, entry_type, amount_atomic, description, source_type)
          VALUES ($1, 'credit', $2, $3, 'weekly_rank_pool')
        `, [
          user.id,
          perUserAmount.toString(),
          `Weekly Rank Pool - L${rank} Share`,
        ]);

        // Update user balance
        await client.query(`
          UPDATE user_balances
          SET total_rank_rewards_atomic = total_rank_rewards_atomic + $1
          WHERE user_id = $2
        `, [perUserAmount.toString(), user.id]);
      }

      console.log(`✅ Distributed ${rankPoolAmount} to ${usersAtRank.rows.length} L${rank} users`);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Weekly pool distribution failed:', err);
  } finally {
    client.release();
  }
}

cron.schedule('0 0 * * 1', weeklyRankPoolDistributor); // Every Monday midnight
```

---

## 8. BIGINT PRECISION RULES

### 8.1 Conversion Functions

```typescript
// utils/bigint.ts

/**
 * Convert human-readable USDT to atomic units (18 decimals)
 * Example: 100 USDT → 100000000000000000000n
 */
export function toAtomic(amount: number | string): bigint {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return BigInt(Math.floor(num * 1e18));
}

/**
 * Convert atomic units to human-readable USDT
 * Example: 100000000000000000000n → "100.00"
 */
export function fromAtomic(atomic: bigint | string): string {
  const bi = typeof atomic === 'string' ? BigInt(atomic) : atomic;
  const whole = bi / BigInt(1e18);
  const fraction = bi % BigInt(1e18);
  const fractionStr = fraction.toString().padStart(18, '0').slice(0, 2);
  return `${whole}.${fractionStr}`;
}

/**
 * Calculate 0.3% daily ROI with BigInt precision
 */
export function calculateDailyROI(principalAtomic: bigint): bigint {
  // 0.3% = 0.003 = 3/1000
  return (principalAtomic * BigInt(3)) / BigInt(1000);
}

/**
 * Check if ROI cap reached (200% or 300%)
 */
export function hasReachedCap(
  accumulatedROI: bigint,
  principal: bigint,
  capPercent: 200 | 300
): boolean {
  const maxROI = (principal * BigInt(capPercent)) / BigInt(100);
  return accumulatedROI >= maxROI;
}
```

### 8.2 Database Schema (NUMERIC Type)

```sql
-- All financial columns use NUMERIC(78, 0) for arbitrary precision
CREATE TABLE deposits (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  amount_atomic NUMERIC(78, 0) NOT NULL, -- 18 decimal precision
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE roi_ledger (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  deposit_id UUID NOT NULL,
  principal_atomic NUMERIC(78, 0) NOT NULL,
  accumulated_roi_atomic NUMERIC(78, 0) DEFAULT 0,
  max_roi_atomic NUMERIC(78, 0) NOT NULL, -- 200% or 300% of principal
  daily_rate NUMERIC(10, 6) DEFAULT 0.003, -- 0.3%
  status VARCHAR(20) DEFAULT 'active',
  last_calculated_at TIMESTAMP
);
```

---

## 9. ADMIN SECURITY (2FA + Secret Key)

### 9.1 Multi-Layer Auth Flow

```typescript
// middlewares/adminAuth.ts

export async function requireAdminMFA(req: any, res: any, next: any) {
  // Layer 1: JWT Token
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).send({ error: 'No token' });

  const decoded = jwt.verify(token, JWT_SECRET);
  if (decoded.role !== 'ADMIN') return res.status(403).send({ error: 'Not admin' });

  // Layer 2: Secret Key Header
  const secretKey = req.headers['x-admin-secret'];
  if (secretKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).send({ error: 'Invalid secret key' });
  }

  // Layer 3: TOTP Code (2FA)
  const totpCode = req.headers['x-totp-code'];
  if (!totpCode) return res.status(403).send({ error: 'TOTP required' });

  const user = await getUserById(decoded.userId);
  const isValid = speakeasy.totp.verify({
    secret: user.totpSecret,
    encoding: 'base32',
    token: totpCode,
    window: 2, // Allow 2 time steps (60s window)
  });

  if (!isValid) return res.status(403).send({ error: 'Invalid TOTP' });

  // All layers passed
  req.user = decoded;
  next();
}
```

---

## 10. COMPONENT MAP (File Structure)

```
src/
├── components/
│   ├── common/
│   │   ├── GlassCard.tsx              # Glassmorphism container
│   │   ├── AnimatedProgress.tsx       # ROI progress bars
│   │   ├── ValidationCheck.tsx        # Deposit validation UI
│   │   ├── LiveCounter.tsx            # Pulsing earnings counter
│   │   └── Table.tsx                  # Responsive table/card hybrid
│   ├── wallet/
│   │   ├── WalletStateIndicator.tsx   # Connection status
│   │   ├── NetworkSwitcher.tsx        # Auto BSC switch
│   │   └── DepositForm.tsx            # Multi-step deposit
│   ├── rank/
│   │   ├── RankTimeline.tsx           # Achievement tree visual
│   │   ├── RankCard.tsx               # Current rank display
│   │   └── RequirementsTable.tsx      # All rank requirements
│   ├── network/
│   │   ├── NetworkTree.tsx            # Interactive referral tree
│   │   ├── TeamStats.tsx              # Generation breakdown
│   │   └── DirectReferrals.tsx        # First-level referrals
│   └── layout/
│       ├── PageShell.tsx              # Main wrapper
│       ├── Sidebar.tsx                # Desktop nav
│       ├── MobileNav.tsx              # Bottom bar
│       └── Header.tsx                 # Top bar with wallet
├── pages/
│   ├── Dashboard.tsx                  # Central command
│   ├── Deposits.tsx                   # Deposit history + form
│   ├── Withdrawals.tsx                # Withdrawal management
│   ├── Ledger.tsx                     # Transaction history
│   ├── NetworkOverview.tsx            # Team summary
│   ├── Team.tsx                       # Generation levels
│   ├── Tree.tsx                       # Visual hierarchy
│   └── Rank.tsx                       # Achievement tracker
└── lib/
    ├── bigint.ts                      # Precision math
    ├── wallet.ts                      # Web3 helpers
    └── api.ts                         # Backend client
```

---

## 11. CSS UTILITY CLASSES (Custom)

```css
/* globals.css - Additional utilities */

@layer utilities {
  .glass-effect {
    @apply bg-white/5 backdrop-blur-glass border border-white/10;
  }

  .text-financial {
    @apply font-mono text-2xl font-bold;
  }

  .text-address {
    @apply font-mono text-sm text-gray-400;
  }

  .btn-primary {
    @apply px-6 py-3 bg-gradient-to-r from-trust-500 to-trust-600 
           hover:from-trust-600 hover:to-trust-700 
           text-white font-bold rounded-lg 
           transition-all duration-300 
           shadow-lg hover:shadow-trust-500/50;
  }

  .btn-secondary {
    @apply px-6 py-3 bg-white/10 hover:bg-white/20 
           text-white font-semibold rounded-lg 
           transition-all duration-300 
           border border-white/20;
  }

  .card-glow {
    @apply shadow-2xl shadow-trust-500/20 
           hover:shadow-trust-500/40 
           transition-shadow duration-500;
  }

  .rank-achieved {
    @apply bg-achievement-500 text-white 
           animate-glow shadow-achievement-500/50;
  }

  .rank-locked {
    @apply bg-gray-700 text-gray-400 grayscale;
  }
}
```

---

## 12. IMPLEMENTATION PRIORITY

### Phase 1: Foundation (Week 1)
1. ✅ Update Tailwind theme with Deep Space colors
2. ✅ Create GlassCard base component
3. ✅ Implement Sidebar + MobileNav responsive layout
4. ✅ Add Poppins + JetBrains Mono fonts

### Phase 2: Core Features (Week 2)
1. ✅ Build AnimatedProgress component
2. ✅ Create RankTimeline achievement tree
3. ✅ Implement WalletStateIndicator
4. ✅ Build DepositForm with validation

### Phase 3: Advanced (Week 3)
1. ⏳ Integrate NetworkTree visualization
2. ⏳ Add LiveCounter with pulse animation
3. ⏳ Implement auto network switching
4. ⏳ Build admin 2FA flow

### Phase 4: Polish (Week 4)
1. ⏳ Mobile optimization (test all pages)
2. ⏳ Add loading skeletons
3. ⏳ Performance audit (React.memo)
4. ⏳ Accessibility (WCAG 2.1 AA)

---

## 13. TESTING CHECKLIST

### Visual Testing
- [ ] All colors match Deep Space theme
- [ ] Financial values use JetBrains Mono
- [ ] Glassmorphism effects render correctly
- [ ] Animations don't lag on mobile

### Functional Testing
- [ ] ROI calculations match 0.3% daily exactly
- [ ] Rank upgrades trigger cap change (200% → 300%)
- [ ] Weekly pool distributes correct percentages
- [ ] Deposit form blocks <$100 amounts

### Responsive Testing
- [ ] Tables collapse to cards on mobile (<768px)
- [ ] Bottom nav appears only on mobile
- [ ] Sidebar hidden on mobile, visible on desktop
- [ ] All text readable on 375px width (iPhone SE)

### Security Testing
- [ ] Admin actions require Secret Key + TOTP
- [ ] Wrong network triggers auto-switch
- [ ] Unsigned messages rejected
- [ ] SQL injection prevented (parameterized queries)

---

## END OF SPECIFICATION

**Status:** Ready for Implementation  
**Estimated Development Time:** 4 weeks  
**Technologies:** React 18, Tailwind 3, TypeScript 5, PostgreSQL 14  
**Design System:** Deep Space Trust (Glassmorphism)
