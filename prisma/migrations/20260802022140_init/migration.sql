-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "bot_user" (
    "id" BIGINT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "username" TEXT,
    "contactShared" BOOLEAN NOT NULL DEFAULT false,
    "onboardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funnel_session" (
    "userId" BIGINT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'idle',
    "broker" TEXT,
    "identifier" TEXT,
    "screenshotFileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funnel_session_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "broker" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "found" BOOLEAN NOT NULL DEFAULT false,
    "deposits" DECIMAL(18,2),
    "volumeLots" DECIMAL(18,4),
    "eligible" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending_admin',
    "screenshotFileId" TEXT,
    "adminMessageId" INTEGER,
    "decidedBy" BIGINT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referred_client" (
    "id" TEXT NOT NULL,
    "broker" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "deposits" DECIMAL(18,2),
    "volumeLots" DECIMAL(18,4),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referred_client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_grant" (
    "id" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "inviteLink" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "joined" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_grant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "funnel_session_state_idx" ON "funnel_session"("state");

-- CreateIndex
CREATE INDEX "verification_userId_idx" ON "verification"("userId");

-- CreateIndex
CREATE INDEX "verification_status_idx" ON "verification"("status");

-- CreateIndex
CREATE INDEX "referred_client_broker_idx" ON "referred_client"("broker");

-- CreateIndex
CREATE UNIQUE INDEX "referred_client_broker_identifier_key" ON "referred_client"("broker", "identifier");

-- CreateIndex
CREATE INDEX "channel_grant_userId_idx" ON "channel_grant"("userId");

-- AddForeignKey
ALTER TABLE "funnel_session" ADD CONSTRAINT "funnel_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "bot_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification" ADD CONSTRAINT "verification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "bot_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_grant" ADD CONSTRAINT "channel_grant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "bot_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

