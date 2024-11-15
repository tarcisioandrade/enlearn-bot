import { prisma } from "../prisma";

export interface CreateRelatoryInput {
  week_start: Date;
  week_end: Date;
  questions_length: number;
  correct_answers: number;
  incorrect_answers: number;
  winner_id: string;
  total_score: number;
  most_common_theme: string;
}

export class RelatoryService {
  constructor() {}

  public create = async (data: CreateRelatoryInput) => {
    await prisma.relatory.create({ data });
  };

  public getAllByMonth = async () => {
    return await prisma.relatory.findMany({
      where: {
        week_start: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    });
  };

  public getCommonThemeInMonth = async () => {
    const commonTheme = await prisma.relatory.groupBy({
      by: ["most_common_theme"],
      where: {
        week_start: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      _count: {
        most_common_theme: true,
      },
      orderBy: {
        _count: {
          most_common_theme: "desc",
        },
      },
      take: 1,
    });

    return commonTheme[0].most_common_theme;
  };
}
