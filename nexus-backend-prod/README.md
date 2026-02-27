# Nexus Rewards Backend (Fastify + PostgreSQL)

Centralized reward system (no smart contracts).  
Blockchain interaction is limited to:
- **Webhook-driven deposit detection**
- **Worker-signed withdrawals** (ethers v6)

## Requirements
- Node.js LTS
- PostgreSQL 14+
- (Optional) PM2 for VPS

## Local Setup

```bash
cp .env.example .env
npm install
npm run migrate
npm run dev
```

API runs on: `http://localhost:3000`

Health:
- `GET /health`
- `GET /v1/health`

## Encrypt treasury private key (AES-256-GCM)
The backend stores an encrypted private key in `TREASURY_ENCRYPTED_KEY`.

```bash
# 1) choose a strong passphrase
export KEY_ENCRYPTION_SECRET="your-long-secret"

# 2) generate encrypted payload
npm run encrypt:key -- "0xYOUR_PRIVATE_KEY"
```

Copy the printed base64 string into `.env` as `TREASURY_ENCRYPTED_KEY`.

## Running the withdrawal worker
In dev you can run API only, or both:

```bash
npm run dev
# in another terminal after build:
npm run build
npm run worker
```

## Deployment (Namecheap VPS)
### 1) Build and run with PM2
```bash
npm install
cp .env.example .env
# edit .env with production values

npm run build
npm run migrate

npm i -g pm2
pm2 start ecosystem.config.cjs
pm2 save
```

### 2) Nginx reverse proxy (recommended)
You can run the API behind nginx (HTTPS termination). Example server block:

```nginx
server {
  server_name api.stackmeridian.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

> If you prefer, use a dedicated subdomain like `nrapi.stackmeridian.com`.

### 3) CORS
Set `ALLOWED_ORIGINS` in `.env` to include:

- `https://nr.stackmeridian.com`
- `https://nradmin.stackmeridian.com`
- your local dev origins (5173/5174/5175)

## Frontend endpoints used
- `POST /v1/auth/wallet/nonce`
- `POST /v1/auth/wallet/verify`
- `GET  /v1/me` (alias) or `/v1/auth/me`
- `POST /v1/webhooks/deposit`
- `POST /v1/withdrawals`
- `GET /v1/*` list endpoints (cursor pagination)

