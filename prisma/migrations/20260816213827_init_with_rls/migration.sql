-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('trial', 'active', 'suspended', 'cancelled');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'DISPATCHER', 'TECHNICIAN');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('starter', 'professional', 'business');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('low', 'normal', 'high', 'urgent');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "CompanyStatus" NOT NULL DEFAULT 'trial',
    "industry" TEXT NOT NULL DEFAULT 'general',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "taxRate" DECIMAL(65,30) NOT NULL DEFAULT 21.00,
    "jobPrefix" TEXT NOT NULL DEFAULT 'JOB-',
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV-',
    "locale" TEXT NOT NULL DEFAULT 'es',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Madrid',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "authId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "role" "UserRole" NOT NULL DEFAULT 'TECHNICIAN',
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "avatarUrl" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubId" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'starter',
    "status" TEXT NOT NULL DEFAULT 'active',
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvitationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvitationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "zip" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'scheduled',
    "priority" "Priority" NOT NULL DEFAULT 'normal',
    "serviceType" TEXT NOT NULL DEFAULT 'General',
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "scheduledTime" TEXT NOT NULL DEFAULT '09:00',
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "address" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "completionNotes" TEXT NOT NULL DEFAULT '',
    "customerId" TEXT NOT NULL,
    "technicianId" TEXT,
    "companyId" TEXT NOT NULL,
    "customerSignature" TEXT,
    "signedByName" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobPhoto" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_authId_key" ON "User"("authId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE INDEX "User_authId_idx" ON "User"("authId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_companyId_key" ON "Subscription"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "InvitationToken_token_key" ON "InvitationToken"("token");

-- CreateIndex
CREATE INDEX "Customer_companyId_idx" ON "Customer"("companyId");

-- CreateIndex
CREATE INDEX "Job_companyId_idx" ON "Job"("companyId");

-- CreateIndex
CREATE INDEX "Job_technicianId_idx" ON "Job"("technicianId");

-- CreateIndex
CREATE INDEX "Job_customerId_idx" ON "Job"("customerId");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Job_companyId_scheduledDate_idx" ON "Job"("companyId", "scheduledDate");

-- CreateIndex
CREATE INDEX "Job_companyId_technicianId_idx" ON "Job"("companyId", "technicianId");

-- CreateIndex
CREATE INDEX "ChecklistItem_jobId_idx" ON "ChecklistItem"("jobId");

-- CreateIndex
CREATE INDEX "JobPhoto_jobId_idx" ON "JobPhoto"("jobId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationToken" ADD CONSTRAINT "InvitationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPhoto" ADD CONSTRAINT "JobPhoto_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable Row Level Security on tenant tables
ALTER TABLE "Company" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Job" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;

-- Super admin can access all rows
CREATE POLICY "superadmin_all" ON "Company" USING (true) WITH CHECK (true);
CREATE POLICY "superadmin_all" ON "Customer" USING (true) WITH CHECK (true);
CREATE POLICY "superadmin_all" ON "Job" USING (true) WITH CHECK (true);
CREATE POLICY "superadmin_all" ON "User" USING (true) WITH CHECK (true);
CREATE POLICY "superadmin_all" ON "Subscription" USING (true) WITH CHECK (true);

-- Regular users see only their company rows (session variable myapp.current_company_id must be set)
CREATE POLICY "company_isolation" ON "Company" USING ("id" = current_setting('myapp.current_company_id')::text) WITH CHECK ("id" = current_setting('myapp.current_company_id')::text);
CREATE POLICY "company_isolation" ON "Customer" USING ("companyId" = current_setting('myapp.current_company_id')::text) WITH CHECK ("companyId" = current_setting('myapp.current_company_id')::text);
CREATE POLICY "company_isolation" ON "Job" USING ("companyId" = current_setting('myapp.current_company_id')::text) WITH CHECK ("companyId" = current_setting('myapp.current_company_id')::text);
CREATE POLICY "company_isolation" ON "User" USING ("companyId" = current_setting('myapp.current_company_id')::text) WITH CHECK ("companyId" = current_setting('myapp.current_company_id')::text);
CREATE POLICY "company_isolation" ON "Subscription" USING ("companyId" = current_setting('myapp.current_company_id')::text) WITH CHECK ("companyId" = current_setting('myapp.current_company_id')::text);
