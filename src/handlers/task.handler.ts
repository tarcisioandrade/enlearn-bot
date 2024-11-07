import { BaileysEventMap, WASocket } from "@whiskeysockets/baileys";
import { env } from "process";
import { UserHandler } from "./user.handler";

export class TaskHandler {
  private taskParticipants: Set<string> = new Set();
  private taskTimeout: NodeJS.Timeout | null = null;
  private duration = 10000;

  constructor(private sock: WASocket, private userHandler: UserHandler) {
    this.initialize();
  }

  private initialize = () => {
    this.createTask();
  };

  private createTask = async () => {
    this.sock.ev.on("messages.upsert", async (upsert) => {
      const msg = upsert.messages[0];
      if (!msg.message || msg.key.remoteJid !== env.GROUP_TARGET_JID) return;

      const messageContent = msg.message?.conversation;

      if (messageContent?.startsWith("!create")) {
        await this.sock.sendMessage(msg.key.remoteJid!, {
          text: "Você iniciou uma task!\n\nQuem serão os participantes?\n\nDigite `!join` para ingressar",
        });

        this.sock.ev.on("messages.upsert", this.joinHandler);

        // Clear previous timeout if exists
        if (this.taskTimeout) {
          clearTimeout(this.taskTimeout);
        }

        // Set new timeout
        this.taskTimeout = setTimeout(async () => {
          await this.taskTimeoutFinish(msg.key.remoteJid!);
        }, this.duration);
      }
    });
  };

  private joinHandler = async (joinUpsert: BaileysEventMap["messages.upsert"]) => {
    const msg = joinUpsert.messages[0];
    const messageContent = msg.message?.conversation;
    if (!msg.message || msg.key.remoteJid !== env.GROUP_TARGET_JID) return;

    if (messageContent === "!join") {
      const participant = msg.key.participant;
      try {
        await this.userHandler.create(participant, msg.pushName);
        this.taskParticipants.add(msg.pushName);
      } catch (error) {
        console.error(error);
        this.cleanUp();
        return;
      }

      await this.sock.sendMessage(msg.key.remoteJid!, {
        text: `${msg.pushName} entrou na task!\n\nParticipantes atuais:\n${Array.from(this.taskParticipants)
          .map((p) => `- ${p}`)
          .join("\n")}`,
      });
    }

    if (messageContent.startsWith("!end")) {
      await this.sock.sendMessage(msg.key.remoteJid!, {
        text: `Inscrições Encerradas!\n\nParticipantes:\n${Array.from(this.taskParticipants)
          .map((p) => `- ${p}`)
          .join("\n")}`,
      });

      this.cleanUp();
    }
  };

  private taskTimeoutFinish = async (remoteJid: string) => {
    await this.sock.sendMessage(remoteJid, {
      text: `Tempo esgotado!\n\nParticipantes finais:\n${Array.from(this.taskParticipants).join("\n")}`,
    });

    this.cleanUp();
  };

  private cleanUp = () => {
    this.taskParticipants.clear();
    this.sock.ev.off("messages.upsert", this.joinHandler);
    clearTimeout(this.taskTimeout);
    this.taskTimeout = null;
  };
}
