-- AlterTable
ALTER TABLE "scores" ADD COLUMN     "consecutive_hard_correct_answers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "weekly_participation_days" INTEGER NOT NULL DEFAULT 1;
