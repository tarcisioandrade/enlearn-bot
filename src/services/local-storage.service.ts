import { SessionsStorageService } from "../interfaces/SessionStorageService";
import fs from "fs/promises";
import path from "path";
import { env } from "../env";
import { fixFileName } from "../utils/fix-filename";

export class LocalStorageService implements SessionsStorageService {
  private localFolder: string;

  constructor() {
    this.localFolder = path.join(process.cwd(), "sessions", env.SESSION_NAME);

    (async () => {
      await this.init();
    })();
  }

  private async init() {
    await fs.mkdir(this.localFolder, { recursive: true });
  }

  async create(key: string, data: any) {
    await fs.writeFile(this.getFileKey(key), data);
  }

  async get(key: string) {
    return await fs.readFile(this.getFileKey(key), { encoding: "utf-8" });
  }

  async remove(key: string) {
    await fs.unlink(this.getFileKey(key));
  }

  async exists(file: string) {
    const stat = await fs.stat(file);
    if (stat.isFile()) return true;
    return false;
  }

  getFileKey(key: string) {
    return path.join(this.localFolder, fixFileName(key) + ".json");
  }
}
