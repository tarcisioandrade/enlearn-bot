import { prisma } from "../prisma";

export class ClearDataService {
  constructor() {}

  public clear = async () => {
    await Promise.all([prisma.question.deleteMany(), prisma.response.deleteMany()]);
  };
}
