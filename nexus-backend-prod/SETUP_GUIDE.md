╔════════════════════════════════════════════════════════════════════════════╗
║                   NEXUS BACKEND - LOCAL DEV SETUP GUIDE                    ║
║                      (Senior Backend Engineer Edition)                      ║
╚════════════════════════════════════════════════════════════════════════════╝

OVERVIEW
────────────────────────────────────────────────────────────────────────────
This backend uses:
  • Node.js 20 LTS
  • TypeScript 5.5
  • Fastify 4.20 (web framework)
  • PostgreSQL 15 (database)
  • ts-node (TypeScript execution for scripts)
  • Zod (environment validation)
  • pg (PostgreSQL client)

PHASES COMPLETED
────────────────────────────────────────────────────────────────────────────

✅ PHASE 1: Diagnostic Helper Script
   - Created: src/scripts/check-db.ts
   - Detects PostgreSQL connectivity issues
   - Suggests specific fixes for macOS/Homebrew
   - Validates database existence

✅ PHASE 2: Improved Migration DX
   - Updated: src/scripts/migrate.ts
   - Catches ECONNREFUSED with helpful instructions
   - Detects missing database and prints createdb command
   - Better logging with ✅/❌ indicators
   - Masks passwords in connection strings

✅ PHASE 3: Environment Validation Split
   - Created: src/config/envMigrate.ts
     └─ Only requires: DATABASE_URL (with default)
   - Created: src/config/envServer.ts
     └─ Requires: DATABASE_URL, JWT_SECRET, WEBHOOK_SECRET, KEY_ENCRYPTION_SECRET,
                  TREASURY_ENCRYPTED_KEY, ALLOWED_ORIGINS, ALLOWED_ORIGINS, PG_BOSS_SCHEMA
   - migrate.ts now imports envMigrate only
   - Server runtime enforces full validation

✅ PHASE 4: Helpful Console Instructions
   - Embedded macOS fix steps in error messages
   - Clear, step-by-step commands for:
     • Adding PostgreSQL to PATH
     • Starting the service
     • Creating the database

✅ PHASE 5: DATABASE_URL Defaults
   - Defaults to: postgresql://localhost:5432/nexus
   - Logs warning when using default
   - Works seamlessly for local development

✅ PHASE 6: Health Endpoint Verification
   - Verified existing: GET /health → { ok: true }
   - Also: GET /v1/health → { ok: true }
   - Ready for load balancer health checks

GETTING STARTED (MACOS + HOMEBREW)
────────────────────────────────────────────────────────────────────────────

1) INSTALL POSTGRESQL
   brew install postgresql@15

2) START THE SERVICE
   brew services start postgresql@15
   # Or manually:
   pg_ctl -D /usr/local/var/postgres start

3) ADD TO PATH (if not already)
   export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
   # Add to ~/.zshrc or ~/.bash_profile for persistence

4) CREATE THE DATABASE
   createdb nexus

5) VERIFY CONNECTION
   npm run check:db
   # Expected output: ✅ All checks passed! Ready to run migrations.

6) RUN MIGRATIONS
   npm run migrate
   # Expected output: ✅ applied 001_init.sql
   #                  ✅ applied 002_seed.sql
   #                  ✨ Migrations complete!

7) START THE SERVER
   npm run dev
   # Expected output: 🚀 Server listening on http://localhost:3000

8) TEST THE HEALTH ENDPOINT
   curl http://localhost:3000/health
   # Expected: {"ok":true}

AVAILABLE NPM SCRIPTS
────────────────────────────────────────────────────────────────────────────

npm run dev                 Start development server (ts-node-dev with auto-reload)
npm run build              Compile TypeScript to JavaScript (dist/)
npm run start              Run compiled server (uses dist/)
npm run check:db           ⭐ NEW: Diagnose database connection issues
npm run migrate            Run database migrations
npm run migrate:status     Show applied migrations
npm run encrypt:key        Helper to encrypt private keys
npm run worker             Run withdrawal worker (background job)

ENVIRONMENT VARIABLES (.env)
────────────────────────────────────────────────────────────────────────────

REQUIRED FOR MIGRATIONS:
  DATABASE_URL              PostgreSQL connection string
                            Default: postgresql://localhost:5432/nexus

REQUIRED FOR SERVER RUNTIME:
  PORT                      Server port (default: 3000)
  JWT_SECRET                JWT signing secret for session tokens
  WEBHOOK_SECRET            HMAC secret for webhook verification
  KEY_ENCRYPTION_SECRET     AES-256-GCM encryption key (min 32 chars)
  TREASURY_ENCRYPTED_KEY    Encrypted treasury private key (base64)
  ALLOWED_ORIGINS           Comma-separated CORS origins
  PG_BOSS_SCHEMA            Job queue schema (default: pgboss)
  CHAIN_RPC_URL             (Optional) Blockchain RPC for withdrawals

CURRENT .env (Existing values preserved):
  DATABASE_URL=postgresql://localhost:5432/nexus
  PORT=3000
  JWT_SECRET=dev_jwt_secret_change_later
  WEBHOOK_SECRET=dev_webhook_secret
  KEY_ENCRYPTION_SECRET=dev_key_encryption_secret_32_chars_minimum
  TREASURY_ENCRYPTED_KEY=dev_dummy
  ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174

FILE STRUCTURE
────────────────────────────────────────────────────────────────────────────

src/
├── config/
│   ├── env.ts                  ⚠️  DEPRECATED (use envServer/envMigrate instead)
│   ├── envServer.ts            ✨ NEW: Runtime validation (all env vars)
│   ├── envMigrate.ts           ✨ NEW: Migration validation (DATABASE_URL only)
│   ├── logger.ts               Logger configuration
│   └── ...
├── scripts/
│   ├── check-db.ts             ✨ NEW: Database diagnostics
│   ├── migrate.ts              ✅ UPDATED: Better error messages
│   └── encryptKey.ts           Key encryption helper
├── db/
│   ├── pool.ts                 Connection pool
│   └── migrations/
│       ├── 001_init.sql
│       └── 002_seed.sql
├── modules/
│   ├── auth/
│   ├── users/
│   ├── deposits/
│   ├── withdrawals/
│   └── admin/
├── middlewares/
│   ├── auth.ts
│   ├── errorHandler.ts
│   └── rateLimit.ts
├── utils/
│   └── ...
├── app.ts                      ✅ UPDATED: Uses envServer
└── server.ts                   ✅ UPDATED: Uses envServer

TROUBLESHOOTING
────────────────────────────────────────────────────────────────────────────

❌ "command not found: pg_isready"
   → Add to PATH: export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
   → Add to ~/.zshrc for persistence
   → Restart terminal or: source ~/.zshrc

❌ "Connection refused 127.0.0.1:5432"
   → PostgreSQL not running: brew services start postgresql@15
   → Or check status: brew services list | grep postgres

❌ "Database 'nexus' does not exist"
   → Create it: createdb nexus
   → Verify: psql -l | grep nexus

❌ "ECONNREFUSED" on npm run migrate
   → Run: npm run check:db (shows detailed diagnostics)
   → Follow on-screen instructions

❌ Can't connect to PostgreSQL on different host?
   → Update DATABASE_URL in .env
   → Example: postgresql://user:password@prod-db.example.com:5432/nexus

TYPESCRIPT COMPILATION
────────────────────────────────────────────────────────────────────────────

Check for migration-related TypeScript errors:
  npx tsc --noEmit src/config/envMigrate.ts src/config/envServer.ts \
                    src/scripts/check-db.ts src/scripts/migrate.ts

Note: app.ts has pre-existing TypeScript errors (unrelated to this setup).
These are logger/Fastify type compatibility issues outside this task scope.

DEPLOYMENT CHECKLIST
────────────────────────────────────────────────────────────────────────────

Pre-deployment:
  ☐ Create production PostgreSQL database
  ☐ Set all environment variables (don't use defaults)
  ☐ Run: npm run migrate (against production database)
  ☐ Verify: npm run check:db (points to production database)
  ☐ Test: curl http://[server]:3000/health

CI/CD:
  ☐ Run migrations before deploying new versions
  ☐ Use managed PostgreSQL (RDS, CloudSQL, Supabase, etc.)
  ☐ Rotate JWT_SECRET and WEBHOOK_SECRET regularly
  ☐ Use secrets management (AWS Secrets Manager, HashiCorp Vault, etc.)
  ☐ Monitor migration failures in CI logs

NEXT STEPS
────────────────────────────────────────────────────────────────────────────

1. Install PostgreSQL (if not done):
   brew install postgresql@15

2. Start PostgreSQL:
   brew services start postgresql@15

3. Create database:
   createdb nexus

4. Verify setup:
   npm run check:db

5. Run migrations:
   npm run migrate

6. Start development server:
   npm run dev

7. Test health:
   curl http://localhost:3000/health

────────────────────────────────────────────────────────────────────────────
For issues: Review .env configuration and run `npm run check:db` for diagnostics
────────────────────────────────────────────────────────────────────────────
