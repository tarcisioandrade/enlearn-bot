import { prisma } from "../prisma";

export class SessionService {
  constructor() {}

  async deleteAll() {
    await prisma.session.deleteMany();
  }
}
