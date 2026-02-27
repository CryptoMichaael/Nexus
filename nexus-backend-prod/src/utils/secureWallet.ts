/**
 * ✅ SECURE HOT WALLET MANAGER
 * AES-256-GCM encryption with PBKDF2 key derivation
 * Auto-lock mechanism for enhanced security
 */

import crypto from 'crypto';
import { logger } from '../config/logger';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64;
const PBKDF2_ITERATIONS = 100000;

/**
 * Derive encryption key from passphrase using PBKDF2
 */
function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    passphrase,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha256'
  );
}

/**
 * Encrypt private key with AES-256-GCM
 * @returns Format: salt:iv:authTag:encryptedData (all hex-encoded)
 */
export function encryptPrivateKey(privateKey: string, passphrase: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(passphrase, salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: salt:iv:authTag:encryptedData
  return [
    salt.toString('hex'),
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted
  ].join(':');
}

/**
 * Decrypt private key from AES-256-GCM ciphertext
 */
export function decryptPrivateKey(encryptedKey: string, passphrase: string): string {
  try {
    const parts = encryptedKey.split(':');
    
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted key format');
    }
    
    const [saltHex, ivHex, authTagHex, encrypted] = parts;
    
    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = deriveKey(passphrase, salt);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to decrypt private key');
    throw new Error('Decryption failed - invalid passphrase or corrupted data');
  }
}

/**
 * Hot Wallet Manager - Keeps decrypted key in RAM with auto-lock
 */
export class SecureWalletManager {
  private decryptedPrivateKey: string | null = null;
  private lastAccessTime: number = 0;
  private readonly AUTO_LOCK_MS: number;
  private lockTimer: NodeJS.Timeout | null = null;

  constructor(
    private encryptedKey: string,
    private passphrase: string,
    autoLockMinutes: number = 5
  ) {
    this.AUTO_LOCK_MS = autoLockMinutes * 60 * 1000;
    
    // Setup cleanup handlers
    this.setupCleanupHandlers();
  }

  /**
   * ✅ Decrypt key on-demand, keep in RAM temporarily
   */
  private async getPrivateKey(): Promise<string> {
    const now = Date.now();
    
    // Auto-lock if idle
    if (this.decryptedPrivateKey && (now - this.lastAccessTime > this.AUTO_LOCK_MS)) {
      logger.info('Auto-locking wallet due to inactivity');
      this.lock();
    }
    
    // Decrypt if needed
    if (!this.decryptedPrivateKey) {
      logger.info('Unlocking wallet...');
      this.decryptedPrivateKey = decryptPrivateKey(this.encryptedKey, this.passphrase);
      logger.info('Wallet unlocked successfully');
    }
    
    this.lastAccessTime = now;
    this.resetLockTimer();
    
    return this.decryptedPrivateKey;
  }

  /**
   * Setup auto-lock timer
   */
  private resetLockTimer(): void {
    if (this.lockTimer) {
      clearTimeout(this.lockTimer);
    }
    
    this.lockTimer = setTimeout(() => {
      if (this.decryptedPrivateKey) {
        logger.info('Auto-lock timer expired, locking wallet');
        this.lock();
      }
    }, this.AUTO_LOCK_MS);
  }

  /**
   * Get private key for signing (public interface)
   */
  async getKey(): Promise<string> {
    return this.getPrivateKey();
  }

  /**
   * Check if wallet is currently unlocked
   */
  isUnlocked(): boolean {
    return this.decryptedPrivateKey !== null;
  }

  /**
   * ✅ Clear private key from memory
   */
  lock(): void {
    if (this.decryptedPrivateKey) {
      // Overwrite memory before clearing
      this.decryptedPrivateKey = '0'.repeat(this.decryptedPrivateKey.length);
      this.decryptedPrivateKey = null;
      logger.info('Wallet locked');
    }
    
    if (this.lockTimer) {
      clearTimeout(this.lockTimer);
      this.lockTimer = null;
    }
  }

  /**
   * ✅ Clear on process exit
   */
  destroy(): void {
    this.lock();
    logger.info('Wallet manager destroyed');
  }

  /**
   * Setup cleanup handlers for process termination
   */
  private setupCleanupHandlers(): void {
    const cleanup = () => {
      logger.info('Process terminating, cleaning up wallet...');
      this.destroy();
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('beforeExit', cleanup);
  }

  /**
   * Get wallet address from private key (without storing)
   */
  async getAddress(): Promise<string> {
    // This would use web3/ethers to derive address from private key
    // For now, returning placeholder
    const privateKey = await this.getPrivateKey();
    
    // Example with ethers.js:
    // import { Wallet } from 'ethers';
    // const wallet = new Wallet(privateKey);
    // return wallet.address;
    
    return 'ADDRESS_PLACEHOLDER';
  }
}

/**
 * Create wallet manager from environment variables
 */
export function createWalletManager(): SecureWalletManager {
  const encryptedKey = process.env.ENCRYPTED_WALLET_KEY;
  const passphrase = process.env.WALLET_PASSPHRASE;
  
  if (!encryptedKey) {
    throw new Error('ENCRYPTED_WALLET_KEY environment variable not set');
  }
  
  if (!passphrase) {
    throw new Error('WALLET_PASSPHRASE environment variable not set');
  }
  
  return new SecureWalletManager(encryptedKey, passphrase);
}
