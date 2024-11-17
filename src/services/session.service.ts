import { prisma } from "../prisma";

export class SessionService {
  async deleteAll() {
    await prisma.session.deleteMany();
  }
}
