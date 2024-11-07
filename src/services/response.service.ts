import { prisma } from "../prisma";

export class ResponseService {
  public create = async (answer: string, question_id: string, user_id: string) => {
    return prisma.response.create({ data: { answer, question_id, user_id } });
  };

  public getAll = async (question_id: string) => {
    return prisma.response.findMany({ where: { question_id } });
  };
}
