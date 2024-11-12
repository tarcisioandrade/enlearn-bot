import { BaileysEventMap, WASocket } from "@whiskeysockets/baileys";
import { UserService } from "../services/user.service";
import { env } from "../env";
import { ResponseService } from "../services/response.service";
import { QuestionCreateInput } from "../services/question.service";
import { Difficulty, QuestionType } from "@prisma/client";
import { compoundMessage } from "../utils/compound-message";
import { MessageFinishEvent } from "../events/message-finish.event";
import { AIHandler } from "../interfaces/AIHandler";
import { cacheKeys, QUESTION_THEMES } from "../constants";
import { ScoreHandler } from "./score.handler";
import { ICacheService } from "../interfaces/CacheService";

interface QuestionInfo {
  theme: string;
  type: QuestionType;
  difficulty: Difficulty;
}

interface UserAnswered {
  id: string;
  timeTaken: number;
  response_id: string;
}

export class MessageHandler {
  private userService = new UserService();
  private scoreHandler: ScoreHandler;
  private responseService = new ResponseService();
  private taskTimeout: NodeJS.Timeout | null = null;
  private duration = 180000;
  private questionStartTime = 0;
  private questionInfo: QuestionInfo;
  private usersAnswered: UserAnswered[] = [];
  private messageFinishEvent = new MessageFinishEvent();

  constructor(
    private sock: WASocket,
    private openAi: AIHandler,
    private cacheService: ICacheService,
    private GROUP_TARGET_JID: string
  ) {
    this.questionInfo = this.getQuestionInfo();
    this.scoreHandler = new ScoreHandler(this.cacheService, this.sock, this.GROUP_TARGET_JID);
  }

  async init() {
    console.log("questionType", this.questionInfo.type);
    console.log("questionTheme", this.questionInfo.theme);
    console.log("questionDifficulty", this.questionInfo.difficulty);

    const question = await this.openAi.createQuestion(
      this.questionInfo.type,
      this.questionInfo.difficulty,
      this.questionInfo.theme
    );

    switch (question.type) {
      case "TRANSLATION":
        this.sendTranslationMessage(question, this.GROUP_TARGET_JID);
        break;
      case "MULTIPLE_CHOICE":
        this.sendMultipleChoiceMessage(question, this.GROUP_TARGET_JID);
        break;
    }

    this.sock.ev.on("messages.upsert", this.answerHandler);
    this.questionStartTime = Date.now();

    this.taskTimeout = setTimeout(async () => {
      await this.messageTimeoutFinish(this.GROUP_TARGET_JID);
    }, this.duration);

    return await new Promise((resolve) => this.messageFinishEvent.on(resolve));
  }

  private answerHandler = async (answerUpsert: BaileysEventMap["messages.upsert"]) => {
    const msg = answerUpsert.messages[0];
    const messageContent = msg.message?.conversation;

    if (!msg.message || msg.key.remoteJid !== this.GROUP_TARGET_JID || !messageContent) return;

    const users = await this.cacheService.getOrCreateCache(cacheKeys.ALL_USERS, () => this.userService.getAll(), 86400);
    if (!users.length) return;

    const currentUser = users.find((u) => u.jid === msg.key.participant);
    if (!currentUser) return;

    const userAlreadyAnswered = this.usersAnswered.some((user) => user.id === currentUser.id);
    console.log("userAlreadyAnswered", userAlreadyAnswered);
    if (userAlreadyAnswered) return;

    const response = await this.responseService.create(messageContent, this.openAi.question_id, currentUser.id);

    this.usersAnswered.push({
      id: currentUser.id,
      response_id: response.id,
      timeTaken: (Date.now() - this.questionStartTime) / 1000,
    });

    const responses = await this.cacheService.getOrCreateCache(cacheKeys.QUESTION_RESPONSES, () =>
      this.responseService.getAll(this.openAi.question_id)
    );

    const allUsersAnswered = users.every((user) => responses.some((response) => response.user_id === user.id));
    console.log("allUsersAnswered", allUsersAnswered);

    if (allUsersAnswered) {
      console.log("this.usersAnswered", this.usersAnswered);
      this.sendToValidate();
    }
  };

  private messageTimeoutFinish = async (remoteJid: string) => {
    const hasAnswers = this.usersAnswered.length;

    await this.sock.sendMessage(remoteJid, {
      text: compoundMessage(hasAnswers ? "Tempo esgotado!!!" : "Tempo esgotado, ninguém respondeu ☹️."),
    });
    if (hasAnswers) this.sendToValidate();
    await this.scoreHandler.resetUsersWeeklyParticipationDays(this.openAi.question_id);
    if (this.questionInfo.difficulty === "HARD") {
      await this.scoreHandler.resetConsecutiveHardCorrectAnswers(this.openAi.question_id);
    }
    this.messageFinishEvent.emit();
  };

  private sendToValidate = async () => {
    this.cleanUp();

    const response = await this.openAi.validateAnswer();
    if (!response) return;

    console.log("response.winnerId", response.winnersIds);

    if (response.winnersIds.length) {
      response.winnersIds.forEach(async (winnerId) => {
        const userAnswered = this.usersAnswered.find((user) => user.id === winnerId);
        if (!userAnswered) return;

        await Promise.all([
          this.scoreHandler.createOrUpdate({
            status: "WINNER",
            user_id: winnerId,
            questionType: this.questionInfo.type,
            questionDifficulty: this.questionInfo.difficulty,
            timeTaken: userAnswered.timeTaken,
          }),
          this.responseService.setCorrect(userAnswered.response_id),
        ]);
      });
    }

    if (response.losersIds.length) {
      response.losersIds.forEach(async (loserId) => {
        const userAnswered = this.usersAnswered.find((user) => user.id === loserId);
        if (!userAnswered) return;
        await this.scoreHandler.createOrUpdate({
          status: "LOSER",
          user_id: loserId,
          questionType: this.questionInfo.type,
          questionDifficulty: this.questionInfo.difficulty,
          timeTaken: userAnswered.timeTaken,
        });
      });

      if (this.questionInfo.difficulty === "HARD") {
        await this.scoreHandler.resetConsecutiveHardCorrectAnswers(this.openAi.question_id);
      }
    }

    await this.sock.sendMessage(env.GROUP_TARGET_JID, {
      text: compoundMessage(`${response.content}`),
    });

    this.messageFinishEvent.emit();
  };

  private sendTranslationMessage = async (question: QuestionCreateInput, jid: string) => {
    this.sock.sendMessage(jid, {
      text: compoundMessage(
        `O Desafio vai começar 📢📢📢\n\nVocês tem ${this.duration / 1000} segundos para responder\n\nDificuldade: *${
          question.difficulty
        }*\n\nTema: *${this.questionInfo.theme}*\n\nTraduza a seguinte frase para o português:\n\n*${question.content}*`
      ),
    });
  };

  private sendMultipleChoiceMessage = async (question: QuestionCreateInput, jid: string) => {
    console.log("question.options", question.options);
    this.sock.sendMessage(jid, {
      text: compoundMessage(
        `O Desafio vai começar 📢📢📢\n\nVocês tem ${this.duration / 1000} segundos para responder\n\nDificuldade: *${
          question.difficulty
        }*\n\nTema: *${this.questionInfo.theme}*\n\n*${
          question.content
        }*\n\nEscolha a alternativa correta:\n\n${question.options.map((option) => `- ${option}`).join("\n")}`
      ),
    });
  };

  private cleanUp = () => {
    if (this.taskTimeout) clearTimeout(this.taskTimeout);
    this.taskTimeout = null;
    this.sock.ev.off("messages.upsert", this.answerHandler);
  };

  private getQuestionInfo = () => {
    const randomIndex = Math.floor(Math.random() * QUESTION_THEMES.length);
    const questionType: QuestionType = Math.random() < 0.5 ? "TRANSLATION" : "MULTIPLE_CHOICE";
    const questionDifficulty: Difficulty = Math.random() < 0.5 ? "MEDIUM" : "HARD";

    return {
      theme: QUESTION_THEMES[randomIndex],
      type: questionType,
      difficulty: questionDifficulty,
    };
  };

  public sendRelatory = async () => {
    await this.scoreHandler.generateRelatory();
  };
}
