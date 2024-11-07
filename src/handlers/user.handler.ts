import { prisma } from "../prisma";

export class UserHandler {
  public create = async (jid: string, push_name: string) => {
    prisma.$transaction(async (ctx) => {
      const user = await ctx.user.upsert({
        where: { jid },
        update: { push_name },
        create: { jid, push_name },
      });

      // await ctx.score.create({
      //   data: {
      //     user_id: user.id,
      //     week_start: new Date(),
      //     week_end: new Date(new Date().setDate(new Date().getDate() + 7)),
      //   },
      // });
    });
  };

  public getAll = async () => {
    return prisma.user.findMany();
  };
}
