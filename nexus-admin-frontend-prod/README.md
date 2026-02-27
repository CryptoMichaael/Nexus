# Nexus Admin Frontend

This repository contains a separate frontend application for administrative users of the Nexus rewards system. It is intentionally isolated from the main user-facing application and is meant to be deployed to a restricted subdomain (e.g. `admin.nexus.example.com`).

## Features

- Login page placeholder
- Sidebar navigation for dashboard, users, ledger adjustments, and withdrawals
- Base setup with React, Vite, TypeScript, Tailwind CSS, React Router, and React Query
- Environment support via `.env` (API URL, mocks)

## Getting Started

1. Copy the example environment file and update values:
   ```sh
   cp .env .env.local
   # edit VITE_API_URL etc.
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Run the development server:
   ```sh
   npm run dev
   ```

4. Build for production:
   ```sh
   npm run build
   ```

## Next Steps

- Implement authentication guard and login form
- Connect pages to real API endpoints
- Add pagination and table components as needed
- Apply styling and branding consistent with main application

## Domain
- Admin app (prod): **nradmin.stackmeridian.com**

## Environment
Copy `.env.example` to `.env` and set `VITE_API_URL`.

## Deployment (Nginx)

```bash
npm install
npm run build
```

```nginx
server {
  server_name nradmin.stackmeridian.com;
  root /var/www/nradmin.stackmeridian.com/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```
