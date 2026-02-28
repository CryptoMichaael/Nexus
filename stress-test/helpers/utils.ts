import * as fs from "fs";
import * as path from "path";
import { ethers } from "ethers";

export const FIXED_DEPOSITOR0_ADDRESS = "0x20a06814e50c8aD5D466D81c5bB56461720a30c3";

export function ensureOutDir(): void {
  const outDir = path.join(process.cwd(), "out");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Check if .gitignore exists and includes out/
  const gitignorePath = path.join(process.cwd(), ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, "utf8");
    if (!gitignoreContent.includes("out/")) {
      console.warn("⚠️  WARNING: ./out directory is NOT in .gitignore!");
      console.warn("⚠️  Private keys will be stored in ./out - ensure it's ignored!");
    }
  } else {
    console.warn("⚠️  WARNING: No .gitignore found. Private keys in ./out may be exposed!");
  }
}

export function writeJSON(filename: string, data: any): void {
  const outPath = path.join(process.cwd(), "out", filename);
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
}

export function readJSON(filename: string): any {
  const outPath = path.join(process.cwd(), "out", filename);
  if (!fs.existsSync(outPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(outPath, "utf8"));
}

export function appendJSONL(filename: string, data: any): void {
  const outPath = path.join(process.cwd(), "out", filename);
  fs.appendFileSync(outPath, JSON.stringify(data) + "\n");
}

export function writeCSV(filename: string, headers: string[], rows: string[][]): void {
  const outPath = path.join(process.cwd(), "out", filename);
  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  fs.writeFileSync(outPath, csvContent);
}

export function writeEnv(filename: string, vars: Record<string, string>): void {
  const outPath = path.join(process.cwd(), "out", filename);
  const envContent = Object.entries(vars)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  fs.writeFileSync(outPath, envContent);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isRetryable =
        error.code === "TIMEOUT" ||
        error.code === "SERVER_ERROR" ||
        error.code === "NETWORK_ERROR" ||
        error.message?.includes("429") ||
        error.message?.includes("nonce");

      if (!isRetryable || i === maxRetries - 1) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, i);
      console.log(`   ⏳ Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw lastError;
}

export function formatBN(bn: ethers.BigNumber, decimals: number = 18): string {
  return ethers.utils.formatUnits(bn, decimals);
}

export function parseBN(amount: string, decimals: number = 18): ethers.BigNumber {
  return ethers.utils.parseUnits(amount, decimals);
}

export class NonceManager {
  private nonces: Map<string, number> = new Map();

  async initialize(provider: ethers.providers.Provider, addresses: string[]): Promise<void> {
    for (const address of addresses) {
      const nonce = await provider.getTransactionCount(address, "pending");
      this.nonces.set(address.toLowerCase(), nonce);
    }
  }

  getNonce(address: string): number {
    const addr = address.toLowerCase();
    const nonce = this.nonces.get(addr) || 0;
    this.nonces.set(addr, nonce + 1);
    return nonce;
  }

  reset(address: string, nonce: number): void {
    this.nonces.set(address.toLowerCase(), nonce);
  }
}

export class ConcurrencyLimiter {
  private running: number = 0;
  private queue: Array<() => void> = [];

  constructor(private limit: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    while (this.running >= this.limit) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }

    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

export function validateAddress(address: string, expectedAddress: string, label: string): void {
  if (address.toLowerCase() !== expectedAddress.toLowerCase()) {
    console.error(`❌ ${label} validation FAILED!`);
    console.error(`   Expected: ${expectedAddress}`);
    console.error(`   Got: ${address}`);
    throw new Error(`${label} address mismatch`);
  }
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
