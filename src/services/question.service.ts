import { Difficulty, QuestionType } from "@prisma/client";
import { prisma } from "../prisma";

export interface QuestionCreateInput {
  content: string;
  difficulty: Difficulty;
  type: QuestionType;
  options: string[];
  correct_answer: string;
}

export class QuestionService {
  public create = async (data: QuestionCreateInput) => {
    return prisma.question.create({ data });
  };

  public get = async (id: string) => {
    return prisma.question.findUnique({
      where: { id },
      include: {
        responses: {
          include: {
            user: true,
          },
        },
      },
    });
  };

  public getAll = async () => {
    return prisma.question.findMany({
      where: {
        responses: {
          some: {},
        },
      },
    });
  };
}
