/**
 * ✅ PM2 ECOSYSTEM CONFIGURATION
 * Optimized for Namecheap VPS with memory limits and automated workers
 * Build first: npm run build
 * Start: pm2 start ecosystem.config.cjs --env production
 */
module.exports = {
  apps: [
    {
      name: "nexus-api",
      script: "dist/server.js",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "500M", // ✅ Increased for API
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "./logs/api-error.log",
      out_file: "./logs/api-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
    },
    {
      name: "deposit-scanner",
      script: "dist/workers/depositScanner.worker.js",
      instances: 1,
      exec_mode: "fork",
      cron_restart: "*/5 * * * *", // ✅ Every 5 minutes
      autorestart: false,
      max_memory_restart: "200M",
      env: {
        NODE_ENV: "production",
      },
      error_file: "./logs/deposit-scanner-error.log",
      out_file: "./logs/deposit-scanner-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
    {
      name: "roi-calculator",
      script: "dist/workers/roiCalculator.worker.js",
      instances: 1,
      exec_mode: "fork",
      cron_restart: "0 0 * * *", // ✅ Daily at 00:00 UTC
      autorestart: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
      },
      error_file: "./logs/roi-calculator-error.log",
      out_file: "./logs/roi-calculator-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
    {
      name: "withdrawal-processor",
      script: "dist/workers/withdrawalWorker.js",
      instances: 1,
      exec_mode: "fork",
      cron_restart: "*/10 * * * *", // ✅ Every 10 minutes
      autorestart: false,
      max_memory_restart: "200M",
      env: {
        NODE_ENV: "production",
      },
      error_file: "./logs/withdrawal-processor-error.log",
      out_file: "./logs/withdrawal-processor-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
}
