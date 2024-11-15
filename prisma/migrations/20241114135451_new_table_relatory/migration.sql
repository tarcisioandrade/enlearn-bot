/*
  Warnings:

  - You are about to drop the `Question` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "responses" DROP CONSTRAINT "responses_question_id_fkey";

-- DropTable
DROP TABLE "Question";

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "theme" TEXT NOT NULL,
    "correct_answer" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "difficulty" "Difficulty" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relatories" (
    "id" TEXT NOT NULL,
    "week_start" TIMESTAMP(3) NOT NULL,
    "week_end" TIMESTAMP(3) NOT NULL,
    "questions_length" INTEGER NOT NULL,
    "correct_answers" INTEGER NOT NULL,
    "incorrect_answers" INTEGER NOT NULL,
    "winner_id" TEXT NOT NULL,
    "total_score" INTEGER NOT NULL,
    "most_common_theme" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relatories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "questions_id_key" ON "questions"("id");

-- CreateIndex
CREATE UNIQUE INDEX "relatories_id_key" ON "relatories"("id");

-- CreateIndex
CREATE INDEX "relatories_week_start_week_end_idx" ON "relatories"("week_start", "week_end");

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
