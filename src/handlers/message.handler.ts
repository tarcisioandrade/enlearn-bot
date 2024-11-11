import { BaileysEventMap, WASocket } from "@whiskeysockets/baileys";
import { UserService } from "../services/user.service";
import { env } from "../env";
import { ResponseService } from "../services/response.service";
import { QuestionCreateInput, QuestionService } from "../services/question.service";
import { Difficulty, QuestionType } from "@prisma/client";
import { compoundMessage } from "../utils/compound-message";
import { MessageFinishEvent } from "../events/message-finish.event";
import { AIHandler } from "../interfaces/AIHandler";
import { QUESTION_THEMES } from "../constants";
import { ScoreHandler } from "./score.handler";

interface QuestionInfo {
  theme: string;
  type: QuestionType;
  difficulty: Difficulty;
}

export class MessageHandler {
  private userHandler = new UserService();
  private scoreHandler: ScoreHandler;
  private responseService = new ResponseService();
  private questionService = new QuestionService();
  private taskTimeout: NodeJS.Timeout | null = null;
  private duration = 180000;
  private questionStartTime = 0;
  private questionInfo: QuestionInfo;
  private usersAnswered = new Set<string>();
  private messageFinishEvent = new MessageFinishEvent();

  constructor(private sock: WASocket, private openAi: AIHandler, private GROUP_TARGET_JID: string) {
    this.questionInfo = this.getQuestionInfo();
    this.scoreHandler = new ScoreHandler(this.sock, this.GROUP_TARGET_JID);
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

    if (!msg.message || msg.key.remoteJid !== this.GROUP_TARGET_JID) return;

    const users = await this.userHandler.getAll();
    if (!users.length) return;

    const currentUser = users.find((u) => u.jid === msg.key.participant);
    if (!currentUser) return;

    const userAlreadyAnswered = this.usersAnswered.has(currentUser.id);
    console.log("userAlreadyAnswered", userAlreadyAnswered);
    if (userAlreadyAnswered) return;

    await this.responseService.create(messageContent, this.openAi.question_id, currentUser.id);

    const responses = await this.responseService.getAll(this.openAi.question_id);

    const allUsersAnswered = users.every((user) => responses.some((response) => response.user_id === user.id));
    console.log("allUsersAnswered", allUsersAnswered);

    if (allUsersAnswered) {
      this.usersAnswered.add(currentUser.id);
      console.log("this.usersAnswered", this.usersAnswered);
      this.sendToValidate();
    }
  };

  private messageTimeoutFinish = async (remoteJid: string) => {
    const question = await this.questionService.get(this.openAi.question_id);
    const hasAnswers = question?.responses.length;

    await this.sock.sendMessage(remoteJid, {
      text: compoundMessage(hasAnswers ? "Tempo esgotado!!!" : "Tempo esgotado, ninguém respondeu ☹️."),
    });
    if (hasAnswers) this.sendToValidate();
    await this.scoreHandler.resetUsersWeeklyScore(this.openAi.question_id);
    this.messageFinishEvent.emit();
  };

  private sendToValidate = async () => {
    this.cleanUp();

    const response = await this.openAi.validateAnswer();

    console.log("response.winnerId", response.winnersIds);

    if (response.winnersIds.length) {
      response.winnersIds.forEach(async (winnerId) => {
        const userResponse = await this.responseService.getByQuestionIdAndUserId(this.openAi.question_id, winnerId);

        const responseTimeInSeconds = (Date.now() - this.questionStartTime) / 1000;
        await this.scoreHandler.createOrUpdate({
          winnerId,
          questionType: this.questionInfo.type,
          questionDifficulty: this.questionInfo.difficulty,
          timeTaken: responseTimeInSeconds,
        });

        await this.responseService.setCorrect(userResponse.id);
      });
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
    clearTimeout(this.taskTimeout);
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
