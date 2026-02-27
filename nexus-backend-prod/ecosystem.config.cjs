/**
 * PM2 config for Namecheap VPS (low-RAM friendly)
 * Build first: npm run build
 * Start: pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: "nexus-api",
      script: "dist/server.js",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "nexus-worker",
      script: "dist/workers/withdrawalWorker.js",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
}
