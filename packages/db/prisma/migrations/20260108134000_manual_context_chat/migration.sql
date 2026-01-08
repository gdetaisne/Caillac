-- CreateEnum
CREATE TYPE "ManualContextKind" AS ENUM ('note', 'scenario', 'decision');

-- CreateEnum
CREATE TYPE "ManualContextStatus" AS ENUM ('draft', 'validated');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('user', 'assistant', 'system');

-- CreateTable
CREATE TABLE "ManualContextItem" (
    "id" TEXT NOT NULL,
    "caseFileId" TEXT NOT NULL,
    "kind" "ManualContextKind" NOT NULL DEFAULT 'note',
    "status" "ManualContextStatus" NOT NULL DEFAULT 'draft',
    "title" TEXT,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualContextItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "caseFileId" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "mode" TEXT,
    "savedContextItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatMessage_caseFileId_createdAt_idx" ON "ChatMessage"("caseFileId", "createdAt");

-- AddForeignKey
ALTER TABLE "ManualContextItem" ADD CONSTRAINT "ManualContextItem_caseFileId_fkey" FOREIGN KEY ("caseFileId") REFERENCES "CaseFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_caseFileId_fkey" FOREIGN KEY ("caseFileId") REFERENCES "CaseFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_savedContextItemId_fkey" FOREIGN KEY ("savedContextItemId") REFERENCES "ManualContextItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

