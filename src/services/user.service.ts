import { prisma } from "../prisma";

export class UserService {
  public create = async (jid: string, push_name: string) => {
    await prisma.user.upsert({
      where: { jid },
      update: { push_name },
      create: { jid, push_name },
    });
  };

  public getAll = async () => {
    return prisma.user.findMany();
  };
}
