import { prisma } from "../prisma";

interface IScoreCreateInput {
  id?: string;
  user_id: string;
  score?: number;
  weeklyParticipationDays: number;
  consecutiveHardCorrectAnswers: number;
}

export class ScoreService {
  async createOrUpdate({
    id,
    user_id,
    score,
    weeklyParticipationDays,
    consecutiveHardCorrectAnswers,
  }: IScoreCreateInput) {
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
        consecutive_hard_correct_answers: consecutiveHardCorrectAnswers,
      },
      where: { id: id ?? "" },
    });
  }

  async getCurrentWeek(user_id: string) {
    return prisma.score.findFirst({
      where: { user_id, week_start: { lte: new Date() }, week_end: { gte: new Date() } },
    });
  }

  async getAllScoresToCurrentWeek() {
    return prisma.score.findMany({
      where: { week_start: { lte: new Date() }, week_end: { gte: new Date() } },
      include: { user: true },
    });
  }

  async resetConsecutiveHardCorrectAnswers(id: string, user_id: string) {
    return prisma.score.update({
      where: { id, user_id },
      data: { consecutive_hard_correct_answers: 0 },
    });
  }

  async resetConsecutiveWeeklyParticipationDays(id: string, user_id: string) {
    return prisma.score.update({
      where: { id, user_id },
      data: { weekly_participation_days: 0 },
    });
  }
}
