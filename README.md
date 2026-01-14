# Luxury OS - Enterprise Jewelry Command Center

Vertical SaaS for luxury jewelry ateliers. Multi-tenant by design.

## Architecture
- **Backend:** NestJS, Prisma, MySQL 8
- **Frontend:** Next.js 15 (App Router), Tailwind, shadcn/ui, dnd-kit

## Setup instructions

### 1. Prerequisites
- Docker & Docker Compose
- Node.js 18+

### 2. Backend Setup
```bash
cd api
npm install
# The container will handle migrations and seeding if configured, 
# but you can run them manually:
npx prisma generate
```

### 3. Infrastructure
```bash
docker-compose up --build
```

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Demo Credentials (Development)
- **URL:** `http://localhost:3000/login`
- **Email:** `admin@pitayacode.io`
- **Password:** `pitaya123`

## Deployment to Production (Hetzner)

To deploy the API to a Hetzner Cloud VPS:

1. **Prepare Server:** Ensure Docker and Docker Compose are installed on the VPS.
2. **Setup Folder:** Create a directory (e.g., `/var/www/luxuryos`) and copy the contents of this repository.
3. **Configure Environment:**
   - Copy `env-production-template.txt` to `.env.prod`.
   - Update the values in `.env.prod` with secure credentials.
4. **Deploy:**
   - Run `bash scripts/deploy-api.sh` to build and start the containers.

## Features
- Strict Multi-tenant isolation (Guards/Interceptors)
- Kanban operational workflow (Spanish UI)
- Executive Dashboard
- Client Management
