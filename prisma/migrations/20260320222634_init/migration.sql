-- CreateTable
CREATE TABLE "Response" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "questionIndex" INTEGER NOT NULL,
    "selectedOption" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "timeSpentMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Response_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Response_questionIndex_idx" ON "Response"("questionIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Response_username_questionIndex_key" ON "Response"("username", "questionIndex");
