import { prisma } from "src/prisma";

export class SessionService {
  constructor() {}

  async deleteAll() {
    await prisma.session.deleteMany();
  }
}
