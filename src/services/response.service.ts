import { prisma } from "../prisma";

export class ResponseService {
  public create = async (answer: string, question_id: string, user_id: string) => {
    return prisma.response.create({ data: { answer, question_id, user_id } });
  };

  public getAll = async (question_id: string) => {
    return prisma.response.findMany({ where: { question_id } });
  };

  public getByQuestionIdAndUserId = async (question_id: string, user_id: string) => {
    return prisma.response.findFirst({ where: { question_id, user_id } });
  };

  public setCorrect = async (id: string) => {
    return prisma.response.update({ where: { id }, data: { is_correct: true } });
  };

  public getAllByCurrentWeek = async () => {
    return prisma.response.findMany({
      where: { createdAt: { gte: new Date(new Date().setDate(new Date().getDate() - 7)) } },
    });
  };
}
