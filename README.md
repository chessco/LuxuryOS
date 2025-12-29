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

## Demo Credentials
- **URL:** `http://localhost:3000/login`
- **Email:** `admin@luxuryos.com`
- **Password:** `luxury123`

## Features
- Strict Multi-tenant isolation (Guards/Interceptors)
- Kanban operational workflow (Spanish UI)
- Executive Dashboard
- Client Management
