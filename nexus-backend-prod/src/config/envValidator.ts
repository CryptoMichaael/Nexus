/**
 * ✅ ENVIRONMENT VALIDATION
 * Validates all required environment variables on startup
 */

import { logger } from './logger';

interface EnvConfig {
  // Database
  DATABASE_URL: string;

  // Server
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  
  // Security
  JWT_SECRET: string;
  WEBHOOK_SECRET?: string;
  
  // Wallet (optional - only if using withdrawal features)
  ENCRYPTED_WALLET_KEY?: string;
  WALLET_PASSPHRASE?: string;
  
  // Blockchain RPC (optional)
  RPC_URL?: string;
  CHAIN_ID?: number;
  
  // Rate Limiting
  RATE_LIMIT_MAX?: number;
  RATE_LIMIT_WINDOW_MS?: number;
}

class EnvironmentValidator {
  private errors: string[] = [];
  private warnings: string[] = [];

  /**
   * Validate and parse environment variables
   */
  validate(): EnvConfig {
    this.errors = [];
    this.warnings = [];

    // Required variables
    const config: Partial<EnvConfig> = {
      DATABASE_URL: this.required('DATABASE_URL'),
      PORT: this.requiredNumber('PORT', 3000),
      NODE_ENV: this.validateNodeEnv(),
      JWT_SECRET: this.required('JWT_SECRET'),
    };

    // Optional but recommended
    config.WEBHOOK_SECRET = this.optional('WEBHOOK_SECRET');
    if (!config.WEBHOOK_SECRET) {
      this.warnings.push('WEBHOOK_SECRET not set - webhook verification disabled');
    }

    // Wallet configuration (optional)
    config.ENCRYPTED_WALLET_KEY = this.optional('ENCRYPTED_WALLET_KEY');
    config.WALLET_PASSPHRASE = this.optional('WALLET_PASSPHRASE');
    
    if (config.ENCRYPTED_WALLET_KEY && !config.WALLET_PASSPHRASE) {
      this.errors.push('WALLET_PASSPHRASE is required when ENCRYPTED_WALLET_KEY is set');
    }

    // Blockchain configuration (optional)
    config.RPC_URL = this.optional('RPC_URL');
    config.CHAIN_ID = this.optionalNumber('CHAIN_ID');

    // Rate limiting
    config.RATE_LIMIT_MAX = this.optionalNumber('RATE_LIMIT_MAX', 100);
    config.RATE_LIMIT_WINDOW_MS = this.optionalNumber('RATE_LIMIT_WINDOW_MS', 60000);

    // JWT Secret strength validation
    if (config.JWT_SECRET && config.JWT_SECRET.length < 32) {
      this.warnings.push('JWT_SECRET should be at least 32 characters long for security');
    }

    // Log results
    if (this.errors.length > 0) {
      logger.error({ errors: this.errors }, 'Environment validation failed');
      throw new Error(`Environment validation failed:\n${this.errors.join('\n')}`);
    }

    if (this.warnings.length > 0) {
      logger.warn({ warnings: this.warnings }, 'Environment validation warnings');
    }

    logger.info('Environment validation passed');
    return config as EnvConfig;
  }

  private required(key: string): string {
    const value = process.env[key];
    if (!value) {
      this.errors.push(`Missing required environment variable: ${key}`);
      return '';
    }
    return value;
  }

  private optional(key: string, defaultValue?: string): string | undefined {
    return process.env[key] || defaultValue;
  }

  private requiredNumber(key: string, defaultValue?: number): number {
    const value = process.env[key];
    if (!value) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      this.errors.push(`Missing required environment variable: ${key}`);
      return 0;
    }
    
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      this.errors.push(`Invalid number for ${key}: ${value}`);
      return 0;
    }
    
    return parsed;
  }

  private optionalNumber(key: string, defaultValue?: number): number | undefined {
    const value = process.env[key];
    if (!value) return defaultValue;
    
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      this.warnings.push(`Invalid number for ${key}: ${value}, using default`);
      return defaultValue;
    }
    
    return parsed;
  }

  private validateNodeEnv(): 'development' | 'production' | 'test' {
    const env = process.env.NODE_ENV || 'development';
    if (!['development', 'production', 'test'].includes(env)) {
      this.warnings.push(`Invalid NODE_ENV: ${env}, defaulting to development`);
      return 'development';
    }
    return env as 'development' | 'production' | 'test';
  }
}

// Export singleton instance
const validator = new EnvironmentValidator();
export const envConfig = validator.validate();

/**
 * Re-validate environment (useful for testing)
 */
export function revalidateEnv(): EnvConfig {
  return new EnvironmentValidator().validate();
}
