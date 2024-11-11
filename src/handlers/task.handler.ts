import { BaileysEventMap, WASocket } from "@whiskeysockets/baileys";
import { env } from "process";
import { UserService } from "../services/user.service";
import { RULES_TEXT } from "../constants";
import { compoundMessage } from "../utils/compound-message";

export class TaskHandler {
  private taskParticipants: Set<string> = new Set();
  private taskTimeout: NodeJS.Timeout | null = null;
  private duration = 180000;
  private userService = new UserService();

  constructor(private sock: WASocket) {}

  async init() {
    this.sock.ev.on("messages.upsert", async (upsert) => {
      const msg = upsert.messages[0];
      if (!msg.message || msg.key.remoteJid !== env.GROUP_TARGET_JID) return;

      const messageContent = msg.message?.conversation;

      if (messageContent?.startsWith("!create")) {
        await this.sock.sendMessage(msg.key.remoteJid!, {
          text: compoundMessage(
            "Você iniciou uma task!\n\nQuem serão os participantes?\n\nDigite `!join` para ingressar"
          ),
        });

        this.sock.ev.on("messages.upsert", this.joinHandler);

        if (this.taskTimeout) {
          clearTimeout(this.taskTimeout);
        }

        this.taskTimeout = setTimeout(async () => {
          await this.taskTimeoutFinish(msg.key.remoteJid!);
        }, this.duration);
      }
    });
  }

  private joinHandler = async (joinUpsert: BaileysEventMap["messages.upsert"]) => {
    const msg = joinUpsert.messages[0];
    const messageContent = msg.message?.conversation;
    if (!msg.message || msg.key.remoteJid !== env.GROUP_TARGET_JID) return;

    if (messageContent === "!join") {
      const participant = msg.key.participant;
      try {
        await this.userService.create(participant, msg.pushName);
        this.taskParticipants.add(msg.pushName);
      } catch (error) {
        console.error(error);
        this.cleanUp();
        return;
      }

      await this.sock.sendMessage(msg.key.remoteJid!, {
        text: compoundMessage(`*${msg.pushName}* entrou!`),
      });
    }

    if (messageContent.startsWith("!end")) {
      await this.sock.sendMessage(msg.key.remoteJid!, {
        text: compoundMessage(
          `Inscrições Encerradas!\n\nParticipantes:\n${Array.from(this.taskParticipants).map((p) => `- ${p}`.trim())}`
        ),
      });

      this.cleanUp();
      await this.sendRules(msg.key.remoteJid);

      // @ts-ignore
      this.sock.end();
    }
  };

  private taskTimeoutFinish = async (remoteJid: string) => {
    await this.sock.sendMessage(remoteJid, {
      text: compoundMessage(`Tempo esgotado!\n\nParticipantes finais:\n${Array.from(this.taskParticipants)}`),
    });
    this.cleanUp();
    await this.sendRules(remoteJid);

    // @ts-ignore
    this.sock.end();
  };

  private sendRules = async (remoteJid: string) => {
    await this.sock.sendMessage(remoteJid, {
      text: RULES_TEXT,
    });
  };

  private cleanUp = () => {
    this.taskParticipants.clear();
    this.sock.ev.off("messages.upsert", this.joinHandler);
    clearTimeout(this.taskTimeout);
    this.taskTimeout = null;
  };
}
