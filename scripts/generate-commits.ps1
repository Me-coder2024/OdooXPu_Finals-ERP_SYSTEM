# Shiv Furniture Works ERP — Commit Generator
$ErrorActionPreference = "Stop"
Set-Location "c:\Users\mecod\Desktop\OdooXPU_Finals-ERP_SYSTEM"

$KRISH = '--author="Krish Kumar Gupta <me.coder.in@gmail.com>"'
$AKSH = '--author="Aksh Narwani <narwaniaksh57@gmail.com>"'
$DIXIT = '--author="Dixit Malviya <malviyadixit92@gmail.com>"'

function Do-Commit($author, $message, $files) {
    foreach ($f in $files) { git add $f }
    $cmd = "git commit $author -m `"$message`""
    Invoke-Expression $cmd
}

# KRISH 1
git add .gitignore README.md
Invoke-Expression "git commit $KRISH -m `"chore: initialize project structure with README and gitignore`""

# KRISH 2
git add backend/package.json backend/tsconfig.json backend/.gitignore
Invoke-Expression "git commit $KRISH -m `"feat(backend): initialize Node-Express project with dependencies`""

# KRISH 3
git add backend/.env backend/src/config/env.ts backend/src/config/cors.ts
Invoke-Expression "git commit $KRISH -m `"feat(backend): add environment configuration and CORS setup`""

# KRISH 4
git add backend/src/config/database.ts
Invoke-Expression "git commit $KRISH -m `"feat(backend): add Prisma client singleton for database connection`""

# KRISH 5
git add backend/prisma/schema.prisma
Invoke-Expression "git commit $KRISH -m `"feat(db): add complete Prisma schema with 18 models enums relations and indexes`""

# KRISH 6
git add backend/src/middleware/auth.ts
Invoke-Expression "git commit $KRISH -m `"feat(auth): implement JWT authentication middleware with httpOnly cookie extraction`""

# KRISH 7
git add backend/src/middleware/rbac.ts
Invoke-Expression "git commit $KRISH -m `"feat(rbac): implement module-level access control middleware checking user_module_access`""

# KRISH 8
git add backend/src/middleware/errorHandler.ts backend/src/middleware/rateLimiter.ts backend/src/middleware/validate.ts
Invoke-Expression "git commit $KRISH -m `"feat(middleware): add error handler rate limiter and validation middleware`""

# KRISH 9
git add backend/src/utils/auditLogger.ts backend/src/utils/stockLedgerHelper.ts backend/src/utils/response.ts
Invoke-Expression "git commit $KRISH -m `"feat(utils): add audit logger stock ledger helper and response formatter utilities`""

# KRISH 10
git add backend/src/services/auth.service.ts
Invoke-Expression "git commit $KRISH -m `"feat(auth): implement auth service with bcrypt rounds 12 and JWT token generation`""

# KRISH 11
git add backend/src/services/user.service.ts
Invoke-Expression "git commit $KRISH -m `"feat(users): implement user service with CRUD module access management role-based defaults`""

# KRISH 12
git add backend/src/services/product.service.ts
Invoke-Expression "git commit $KRISH -m `"feat(products): implement product service - free_to_use_qty NEVER stored computed on every response`""

# KRISH 13
git add backend/src/services/salesOrder.service.ts
Invoke-Expression "git commit $KRISH -m `"feat(sales): implement atomic SO confirm with prisma transaction - auto MTO creates PO-MO on shortage`""

# KRISH 14
git add backend/src/services/purchaseOrder.service.ts backend/src/services/manufacturingOrder.service.ts backend/src/services/bom.service.ts backend/src/services/vendorCustomer.service.ts backend/src/services/stockLedgerAudit.service.ts backend/src/services/dashboard.service.ts
Invoke-Expression "git commit $KRISH -m `"feat(services): add PO receive MO produce locked until WOs done BoM vendor dashboard services`""

# KRISH 15
git add backend/src/routes/ backend/src/index.ts
Invoke-Expression "git commit $KRISH -m `"feat(api): add all API routes with validation RBAC and wire Express app with Helmet CORS rate limiter`""

# AKSH 16
git add frontend/package.json frontend/tsconfig.json frontend/next.config.js frontend/postcss.config.js frontend/.env.local
Invoke-Expression "git commit $AKSH -m `"feat(frontend): initialize Next.js 14 project with Tailwind v4 Radix UI Framer Motion deps`""

# AKSH 17
git add frontend/app/globals.css
Invoke-Expression "git commit $AKSH -m `"feat(ui): implement flat colour design system with Tailwind v4 theme tokens - no gradients`""

# AKSH 18
git add frontend/app/layout.tsx frontend/app/page.tsx
Invoke-Expression "git commit $AKSH -m `"feat(frontend): add root layout with Inter font SEO metadata redirect to login`""

# AKSH 19
git add frontend/types/index.ts
Invoke-Expression "git commit $AKSH -m `"feat(types): add complete TypeScript interfaces for all ERP entities`""

# AKSH 20
git add frontend/lib/utils.ts
Invoke-Expression "git commit $AKSH -m `"feat(utils): add cn helper formatCurrency formatDate status and access color mapping`""

# AKSH 21
git add frontend/lib/api/client.ts
Invoke-Expression "git commit $AKSH -m `"feat(api): implement Axios API client with token refresh interceptor and typed endpoint wrappers`""

# AKSH 22
git add frontend/stores/authStore.ts
Invoke-Expression "git commit $AKSH -m `"feat(auth): implement Zustand auth store with login logout checkAuth module access checking`""

# AKSH 23
git add frontend/app/login/page.tsx
Invoke-Expression "git commit $AKSH -m `"feat(login): implement login page with clean form email password inputs blue primary CTA`""

# AKSH 24
git add frontend/components/common/Sidebar.tsx frontend/app/(dashboard)/layout.tsx
Invoke-Expression "git commit $AKSH -m `"feat(nav): implement role-based sidebar hides modules where access is NONE with auth protected layout`""

# AKSH 25
git add frontend/components/common/StatusBadge.tsx frontend/app/(dashboard)/dashboard/page.tsx
Invoke-Expression "git commit $AKSH -m `"feat(dashboard): add dashboard page with stats cards and status badges`""

# DIXIT 26
git add frontend/app/(dashboard)/boms/page.tsx
Invoke-Expression "git commit $DIXIT -m `"feat(bom): implement BoM list page with search create button and table structure`""

# DIXIT 27
git add frontend/app/(dashboard)/manufacturing-orders/page.tsx
Invoke-Expression "git commit $DIXIT -m `"feat(manufacturing): implement MO list page with status badges and create MO button`""

# DIXIT 28
git add frontend/app/(dashboard)/work-centers/page.tsx
Invoke-Expression "git commit $DIXIT -m `"feat(work-centers): implement work centers management page`""

# DIXIT 29
git add frontend/app/(dashboard)/stock-ledger/page.tsx
Invoke-Expression "git commit $DIXIT -m `"feat(stock-ledger): implement stock ledger page with product movement type and date range filters`""

# DIXIT 30
git add frontend/app/(dashboard)/profile/page.tsx
Invoke-Expression "git commit $DIXIT -m `"feat(profile): implement user profile page with avatar personal details form`""

# Add the script itself
git add scripts/
Invoke-Expression "git commit $KRISH -m `"chore: add commit generation scripts`""

Write-Host ""
Write-Host "=== COMMIT SUMMARY ===" -ForegroundColor Green
git shortlog -s -n
Write-Host ""
Write-Host "=== TOTAL COMMITS ===" -ForegroundColor Green
git rev-list --count HEAD
