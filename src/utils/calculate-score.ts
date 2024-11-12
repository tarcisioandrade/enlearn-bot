import { Difficulty, QuestionType } from "@prisma/client";

export interface ICaculateStoreInput {
  status: "WINNER" | "LOSER";
  questionType: QuestionType;
  difficulty: Difficulty;
  timeTaken: number;
  weeklyParticipationDays?: number;
  consecutiveHardCorrectAnswers?: number;
}

export function calculateScore({
  status,
  questionType,
  difficulty,
  timeTaken,
  weeklyParticipationDays = 0,
  consecutiveHardCorrectAnswers = 0,
}: ICaculateStoreInput) {
  let baseScore = 0;

  const scoreMap: Record<QuestionType, Record<Difficulty, number>> = {
    MULTIPLE_CHOICE: {
      EASY: 5,
      MEDIUM: 8,
      HARD: 12,
    },
    TRANSLATION: {
      EASY: 10,
      MEDIUM: 15,
      HARD: 20,
    },
  };

  if (status === "WINNER") {
    baseScore = scoreMap[questionType][difficulty] || 0;

    const timeBonus = timeTaken <= 30 ? 5 : timeTaken <= 60 ? 3 : timeTaken <= 120 ? 1 : 0;
    baseScore += timeBonus;

    const frequencyBonus = weeklyParticipationDays >= 7 ? 20 : weeklyParticipationDays >= 5 ? 10 : 0;
    baseScore += frequencyBonus;

    const consecutiveBonus = difficulty === "HARD" && consecutiveHardCorrectAnswers >= 3 ? 15 : 0;
    baseScore += consecutiveBonus;
  }

  return {
    value: Math.round(baseScore),
    weeklyParticipationDays: weeklyParticipationDays + 1,
    consecutiveHardCorrectAnswers: difficulty === "HARD" ? consecutiveHardCorrectAnswers + 1 : 0,
  };
}
