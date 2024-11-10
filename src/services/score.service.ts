import { prisma } from "../prisma";

interface IScoreCreateInput {
  user_id: string;
  score?: number;
  weeklyParticipationDays: number;
  consecutiveHardCorrectAnswers?: number;
}

export class ScoreService {
  async create({ user_id, score, weeklyParticipationDays, consecutiveHardCorrectAnswers }: IScoreCreateInput) {
    const current = await this.getCurrentWeek(user_id);

    return prisma.score.upsert({
      create: {
        user_id,
        week_start: new Date(),
        week_end: new Date(new Date().setDate(new Date().getDate() + 7)),
        score: score,
      },
      update: {
        score: {
          increment: score,
        },
        weekly_participation_days: weeklyParticipationDays,
        consecutive_hard_correct_answers: consecutiveHardCorrectAnswers ?? 0,
      },
      where: { id: current?.id ?? "" },
    });
  }

  async getCurrentWeek(user_id: string) {
    return prisma.score.findFirst({
      where: { user_id, week_start: { lte: new Date() }, week_end: { gte: new Date() } },
    });
  }
}
