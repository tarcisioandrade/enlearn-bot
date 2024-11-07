import { BaileysEventMap, WASocket } from "@whiskeysockets/baileys";
import { OpenAIHandler } from "./open-ai.handler";
import { UserService } from "../services/user.service";
import { env } from "../env";
import { ScoreService } from "../services/score.service";
import { ResponseService } from "../services/response.service";
import { QuestionService } from "../services/question.service";

export class MessageHandler {
  private taskTimeout: NodeJS.Timeout | null = null;
  private duration = 10000;

  constructor(
    private sock: WASocket,
    private openAi: OpenAIHandler,
    private userHandler: UserService,
    private scoreHandler: ScoreService,
    private responseHandler: ResponseService,
    private questionService: QuestionService
  ) {}

  sendTranslationMessage = async (question: any, jid: string) => {
    this.sock.sendMessage(jid, {
      text: `O Desafio vai começar 📢📢📢\n\nVocês tem ${
        this.duration / 1000
      } segundos para responder:\n\nDificuldade *${
        question.difficulty
      }*\n\nTraduza a seguinte frase para o português:\n\n*${question.content}*`,
    });
  };

  sendMultipleChoiceMessage = async (question: any, jid: string) => {
    this.sock.sendMessage(jid, {
      text: `O Desafio vai começar 📢📢📢\n\nVocês tem ${
        this.duration / 1000
      } segundos para responder:\n\nDificuldade: *${question.difficulty}*\n\n**${
        question.content
      }**\n\nEscolha a alternativa correta: ${question.options.join(", ")}`,
    });
  };

  async create(jid: string) {
    const question = await this.openAi.createQuestion();

    switch (question.type) {
      case "TRANSLATION":
        this.sendTranslationMessage(question, jid);
        break;
      case "MULTIPLE_CHOICE":
        this.sendMultipleChoiceMessage(question, jid);
        break;
    }

    this.sock.ev.on("messages.upsert", this.answerHandler);

    this.taskTimeout = setTimeout(async () => {
      await this.messageTimeoutFinish(jid);
    }, this.duration);
  }

  private answerHandler = async (answerUpsert: BaileysEventMap["messages.upsert"]) => {
    const msg = answerUpsert.messages[0];
    const messageContent = msg.message?.conversation;

    if (!msg.message || msg.key.remoteJid !== env.GROUP_TARGET_JID) return;

    const users = await this.userHandler.getAll();
    const currentUser = users.find((u) => u.jid === msg.key.participant);
    if (currentUser) {
      await this.responseHandler.create(messageContent, this.openAi.question_id, currentUser.id);
    }

    const responses = await this.responseHandler.getAll(this.openAi.question_id);

    const allUsersAnswered = users.every((user) => responses.some((response) => response.user_id === user.id));

    console.log("users", users);
    console.log("allUsersAnswered", allUsersAnswered);
    if (allUsersAnswered) {
      this.sendToValidate();
      this.sock.ev.off("messages.upsert", this.answerHandler);
    }
  };

  private messageTimeoutFinish = async (remoteJid: string) => {
    const question = await this.questionService.get(this.openAi.question_id);
    const hasAnswers = question?.responses.length;

    await this.sock.sendMessage(remoteJid, {
      text: hasAnswers ? "Tempo esgotado!!!" : "Tempo esgotado, ninguém respondeu ☹️.",
    });
    if (hasAnswers) this.sendToValidate();
  };

  private sendToValidate = async () => {
    // return id of winner and increment score them
    const response = await this.openAi.validateAnswer();
    // const winnerId = this.extractWinnerId(response);

    // if (winnerId) {
    //   await this.scoreHandler.create(response, 10);
    // }

    this.sock.sendMessage(env.GROUP_TARGET_JID, {
      text: `${response}`,
    });
    this.cleanUp();
  };

  private cleanUp = () => {
    clearTimeout(this.taskTimeout);
    this.taskTimeout = null;
  };

  private extractWinnerId(validationText: string): string | null {
    // Implementar lógica para extrair o ID do vencedor do texto de validação
    // Isso pode ser feito através de regex ou outro método de parsing
    return null; // Retornar o ID do vencedor ou null se não encontrado
  }
}
