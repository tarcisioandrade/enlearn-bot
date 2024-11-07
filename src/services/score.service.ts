import { prisma } from "../prisma";

export class ScoreService {
  async create(user_id: string, score?: number) {
    const current = await this.getCurrentWeek(user_id);

    return prisma.score.upsert({
      where: { id: current.id },
      create: {
        user_id,
        week_start: new Date(),
        week_end: new Date(new Date().setDate(new Date().getDate() + 7)),
      },
      update: {
        score: {
          increment: score,
        },
      },
    });
  }

  async getCurrentWeek(user_id: string) {
    return prisma.score.findFirst({
      where: { user_id, week_start: { lte: new Date() }, week_end: { gte: new Date() } },
    });
  }

  async increment(score_id: string, score: number) {
    return prisma.score.update({
      where: { id: score_id },
      data: { score: { increment: score } },
    });
  }
}
