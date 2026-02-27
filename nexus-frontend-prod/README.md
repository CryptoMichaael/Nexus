# Nexus Rewards Frontend

A production-ready, fully dynamic MLM rewards system frontend built with React, Vite, TypeScript, and Tailwind CSS.

## Key Features

✅ **Fully Dynamic Architecture** - No hardcoded levels; all levels come from API  
✅ **Cursor-Based Pagination** - Scales to 100k+ users  
✅ **Tree View** - Lazy-loaded with pagination per node  
✅ **Mock Mode** - Built-in fallback for development  
✅ **Beginner-Friendly** - All components <200 lines  
✅ **Production Ready** - Static deployment to Nginx/Apache  

## Tech Stack

- **React 18** + **Vite** (fastest build)
- **TypeScript** (strict mode)
- **Tailwind CSS** (no custom CSS needed)
- **TanStack React Query** (data fetching & caching)
- **Axios** (API calls with string URLs)
- **React Router** (navigation)

## Project Structure

```
nexus-frontend/
├── src/
│   ├── lib/
│   ├── components/
│   └── pages/
```

## Setup & Installation

```bash
cd nexus-frontend
npm install
npm run dev
```

## Mock Mode

Set `VITE_USE_MOCKS=true` in `.env` to enable mock responses.

---

> **Admin UI migrated:** The admin panel has been removed from this user-facing
> application. A separate frontend project (`nexus-admin-frontend`) now hosts
> the admin dashboard on a hidden subdomain. This repository no longer contains
> any admin-specific code or navigation.  


## Domains
- User app (prod): **nr.stackmeridian.com**
- Admin app (prod): **nradmin.stackmeridian.com**

## Environment
Copy `.env.example` to `.env` and set:
- `VITE_API_URL` (backend base URL)
- `VITE_USE_MOCKS` (false when backend is ready)

