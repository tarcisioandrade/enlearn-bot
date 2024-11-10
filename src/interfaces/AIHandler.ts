import { Difficulty, QuestionType } from "@prisma/client";
import { QuestionCreateInput } from "../services/question.service";

export interface IAnswerValidation {
  winnersIds: string[];
  content: string;
}

export interface AIHandler {
  question_id: string;
  createQuestion: (type: QuestionType, difficulty: Difficulty, theme: string) => Promise<QuestionCreateInput>;
  validateAnswer: () => Promise<IAnswerValidation>;
}
