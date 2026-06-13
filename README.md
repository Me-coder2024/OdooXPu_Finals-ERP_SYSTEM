# Shiv Furniture Works ERP

A comprehensive Mini ERP system built for Shiv Furniture Works, managing products, sales, purchases, manufacturing, and inventory.

## Team

- **Krish Kumar Gupta** — Backend, Database, All APIs
- **Aksh Narwani** — Frontend: Auth, Dashboard, Products, Sales, Purchase, Audit
- **Dixit Malviya** — Frontend: Manufacturing, BoM, Work Orders, Stock Ledger

## Tech Stack

### Backend
- Node.js + Express.js
- PostgreSQL + Prisma ORM
- JWT (httpOnly cookies) + bcrypt (r=12)
- Helmet.js + rate-limiter-flexible
- express-validator

### Frontend
- Next.js 14 (App Router)
- Tailwind CSS v4
- Radix UI + shadcn/ui
- Framer Motion
- React Hook Form + Zod
- Recharts
- Zustand + TanStack Query

## Core Business Logic

1. **free_to_use_qty** = on_hand_qty − reserved_qty (NEVER stored, always computed)
2. **Atomic SO Confirm** — Single Prisma transaction: reserve stock + auto MTO procurement
3. **MO Produce** — Locked until ALL work orders are DONE
4. **Audit Logging** — Every mutation tracked with old/new values
5. **Module RBAC** — Access checked before every service call

## Getting Started

### Backend
```bash
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

See `backend/.env.example` and `frontend/.env.local.example`
