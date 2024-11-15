import { env } from "../../env";
import axios from "axios";
import { QuestionCreateInput, QuestionService } from "../../services/question.service";
import { Difficulty, QuestionType } from "@prisma/client";
import { AIHandler, IAnswerValidation } from "../../interfaces/AIHandler";
import { ICacheService } from "../../interfaces/CacheService";
import { CACHE_KEYS } from "../../constants";
import { QUESTION_CREATION_PROMPT, RESPONSE_VALIDATION_PROMPT } from "./prompts";

const instance = axios.create({
  baseURL: "https://api.openai.com/v1",
  headers: {
    Authorization: `Bearer ${env.AI_TOKEN}`,
    "Content-Type": "application/json",
  },
});

export class OpenAIHandler implements AIHandler {
  public question_id = "";
  private questionService = new QuestionService();

  constructor(private cacheService: ICacheService) {}

  async createQuestion(type: QuestionType, difficulty: Difficulty, theme: string): Promise<QuestionCreateInput> {
    const { data } = await instance.post("/chat/completions", {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: QUESTION_CREATION_PROMPT.system,
        },
        {
          role: "assistant",
          content: QUESTION_CREATION_PROMPT.assistant,
        },
        { role: "user", content: QUESTION_CREATION_PROMPT.user(type, difficulty, theme) },
      ],
    });
    console.log("data", data.choices[0].message.content);
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content.replace("```json", "").replace("```", ""));

    const questionToCreate: QuestionCreateInput = Object.assign(parsed, { theme });

    console.log("questionParsed", questionToCreate);
    const createdQuestion = await this.questionService.create(questionToCreate);

    this.question_id = createdQuestion.id;

    return questionToCreate;
  }

  async validateAnswer() {
    const question = await this.cacheService.getOrCreateCache(CACHE_KEYS.QUESTION, () =>
      this.questionService.get(this.question_id)
    );

    if (!question?.responses.length) return null;

    const usersAnswersFormatter = question.responses.map((r) => ({
      id: r.user.id,
      pushName: r.user.push_name,
      answer: r.answer,
    }));

    const { data } = await instance.post("/chat/completions", {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: RESPONSE_VALIDATION_PROMPT.system,
        },
        {
          role: "assistant",
          content: RESPONSE_VALIDATION_PROMPT.assistant,
        },
        { role: "user", content: RESPONSE_VALIDATION_PROMPT.user(question, usersAnswersFormatter) },
      ],
    });

    const responseContent = data.choices[0].message.content;

    console.log("responseContent", responseContent);

    const result = this.extractWinner(responseContent);
    const losersIds = question.responses.map((r) => r.user.id).filter((id) => !result.winnersIds.includes(id));

    return {
      winnersIds: result.winnersIds,
      content: result.content,
      losersIds,
    };
  }

  private extractWinner(validationText: string): Omit<IAnswerValidation, "losersIds"> {
    const winnerMatch = validationText.split("VENCEDOR: ")[1];
    const winnersIds = winnerMatch ? winnerMatch.split(", ") : [];

    const responseWithoutWinner = validationText.replace(/VENCEDOR: .*/, "").trim();

    return { winnersIds, content: responseWithoutWinner };
  }
}
