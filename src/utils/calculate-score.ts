import { Difficulty, QuestionType } from "@prisma/client";

export interface ICaculateStoreInput {
  questionType: QuestionType;
  difficulty: Difficulty;
  timeTaken: number;
  weeklyParticipationDays: number;
  consecutiveHardCorrectAnswers: number;
}

export function calculateScore({
  questionType,
  difficulty,
  timeTaken,
  weeklyParticipationDays,
  consecutiveHardCorrectAnswers,
}: ICaculateStoreInput) {
  let baseScore = 0;

  // 1. Pontuação base por tipo de pergunta e dificuldade
  if (questionType === QuestionType.MULTIPLE_CHOICE) {
    switch (difficulty) {
      case Difficulty.EASY:
        baseScore = 5;
        break;
      case Difficulty.MEDIUM:
        baseScore = 8;
        break;
      case Difficulty.HARD:
        baseScore = 12;
        break;
    }
  } else if (questionType === QuestionType.TRANSLATION) {
    switch (difficulty) {
      case Difficulty.EASY:
        baseScore = 10;
        break;
      case Difficulty.MEDIUM:
        baseScore = 15;
        break;
      case Difficulty.HARD:
        baseScore = 20;
        break;
    }
  }

  // 2. Bônus de velocidade
  if (timeTaken <= 30) baseScore += 5;
  else if (timeTaken <= 60) baseScore += 3;
  else if (timeTaken <= 120) baseScore += 1;

  // 4. Bônus de frequência semanal
  if (weeklyParticipationDays >= 5) baseScore += 10; // Participou 5 dias
  if (weeklyParticipationDays === 7) baseScore += 20; // Participou todos os dias

  // 5. Bônus por acertos consecutivos em perguntas difíceis
  if (consecutiveHardCorrectAnswers >= 3) baseScore += 15;

  return {
    value: Math.round(baseScore),
    weeklyParticipationDays: weeklyParticipationDays + 1,
    consecutiveHardCorrectAnswers:
      difficulty === "HARD" ? consecutiveHardCorrectAnswers + 1 : consecutiveHardCorrectAnswers,
  };
}
