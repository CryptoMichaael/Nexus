export interface WalletInfo {
  address: string;
  privateKey: string;
  referrerAddress?: string;
  level?: number;
}

export interface GeneratedWallets {
  admin: WalletInfo;
  depositors: WalletInfo[];
}

export interface TransactionLog {
  timestamp: string;
  wallet: string;
  action: string;
  txHash: string;
  gasUsed?: string;
  status: "success" | "failure";
  error?: string;
}

export interface BalanceSnapshot {
  timestamp: string;
  wallets: {
    [address: string]: {
      bnb: string;
      usdt: string;
      deposited?: string;
      earned?: string;
      rank?: string;
    };
  };
}

export interface IntegrityViolation {
  wallet: string;
  rule: string;
  observed: string;
  expected: string;
  severity: "CRITICAL" | "WARNING";
}

export interface SummaryReport {
  status: "PASS" | "FAIL";
  mode: "live" | "fork";
  startTime: string;
  endTime: string;
  duration: string;
  totalWallets: number;
  transactions: {
    total: number;
    successful: number;
    failed: number;
  };
  gasUsed: {
    total: string;
    average: string;
  };
  violations: number;
}

export interface RankPercentages {
  L1: number;
  L2: number;
  L3: number;
  L4: number;
  L5: number;
  L6: number;
  L7: number;
}

export const DEFAULT_RANK_PERCENTAGES: RankPercentages = {
  L1: 35,
  L2: 20,
  L3: 15,
  L4: 10,
  L5: 8,
  L6: 7,
  L7: 5,
};
