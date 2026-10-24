-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('BILLING', 'ACCOUNT_ACCESS', 'TECHNICAL_ISSUE', 'FEATURE_REQUEST', 'HOW_TO', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketSentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'FRUSTRATED');

-- CreateTable
CREATE TABLE "AiTriage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "reviewedById" TEXT,
    "category" "TicketCategory" NOT NULL,
    "sentiment" "TicketSentiment" NOT NULL,
    "suggestedPriority" "TicketPriority" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "summary" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "model" TEXT,
    "status" "DraftStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiTriage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiTriage_ticketId_createdAt_idx" ON "AiTriage"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "AiTriage_status_createdAt_idx" ON "AiTriage"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "AiTriage" ADD CONSTRAINT "AiTriage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTriage" ADD CONSTRAINT "AiTriage_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
