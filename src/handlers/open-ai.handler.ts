import { env } from "../env";
import axios from "axios";
import { QuestionCreateInput, QuestionService } from "../services/question.service";
import { Difficulty, QuestionType } from "@prisma/client";
import { AIHandler, IAnswerValidation } from "../interfaces/AIHandler";
import { ICacheService } from "../interfaces/CacheService";
import { cacheKeys } from "../constants";

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
    const prompt = `Crie uma pergunta que do tipo ${type} e com o tema ${theme}, mande apenas uma pergunta, a pergunta é para testar os conhecimentos de inglês de um usuário, se for uma TRANSLATION, voce manda a frase em inglês para ser traduzida para português, se for MULTIPLE_CHOICE, crie uma pergunta para testar os conhecimentos de inglês de um usuário com uma resposta correta e três opções incorretas (coloque-as em alternativas (Ex: a), b), c)). Dificuldade: ${difficulty}. Mande um json com as seguintes informações: content, options (array vazio se for do tipo TRANSLATION), correct_answer, type, difficulty. (type: TRANSLATION ou MULTIPLE_CHOICE), (difficulty: EASY, MEDIUM, HARD)`;

    const { data } = await instance.post("/chat/completions", {
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });
    console.log("data", data.choices[0].message.content);
    const question = data.choices[0].message.content;
    const questionParsed: QuestionCreateInput = JSON.parse(question.replace("```json", "").replace("```", ""));

    console.log("questionParsed", questionParsed);
    const createdQuestion = await this.questionService.create(questionParsed);

    this.question_id = createdQuestion.id;

    return {
      content: questionParsed.content,
      difficulty: questionParsed.difficulty,
      type: questionParsed.type,
      options: questionParsed.options,
      correct_answer: questionParsed.correct_answer,
    };
  }

  async validateAnswer() {
    const question = await this.cacheService.getOrCreateCache(cacheKeys.QUESTION, () =>
      this.questionService.get(this.question_id)
    );

    if (!question?.responses.length) return null;

    const usersAnswersFormatter = question.responses.map((r) => ({
      id: r.user.id,
      pushName: r.user.push_name,
      answer: r.answer,
    }));

    const prompt = `Para validar as respostas dos usuários, siga este formato: 1. Se a pergunta for do tipo 'TRANSLATION', responda assim: Análise das respostas dos usuários:\n - *{user.name}*: Forneça um feedback detalhado sobre a resposta desse usuário, explicando os erros e acertos específicos na tradução. Indique se a tradução contém palavras ou estruturas incorretas ou menos apropriadas e se ela captou a ideia principal. Se houver mais de um usuário conclua indicando qual usuário chegou mais perto da tradução correta, mesmo que não tenha sido perfeita. Eu tambem preciso que você sempre escreva a tradução em português da pergunta fornecida caso for do tipo TRANSLATION, se for MULTIPLE_CHOICE, informe qual é a alternativa correta. - Se a pergunta for do tipo 'MULTIPLE_CHOICE', responda assim: Análise das respostas dos usuários: - *{user.name}*: Indique se o usuário escolheu a resposta correta ou incorreta, mencionando brevemente o motivo da escolha errada, se houver. - *{user.name}*: Repita para cada usuário. No final da análise, inclua 'VENCEDOR: {id}' para indicar o usuário vencedor, em caso perguntas do tipo TRANSLATION, verifique quem teve a resposta mais próxima da correta, mas sem exibi-lo no texto principal, se houver apenas um usúario (se houver mais um vencedor, separe os {id} por vírgula e um espaço), mas ele não acertou, não inclua o vencedor.
    Informações que voce precisa: Tipo da pergunta: ${question?.type} Pergunta: ${
      question?.content
    } Resposta dos usuários: ${JSON.stringify(usersAnswersFormatter)}\n
     Resposta correta: ${question?.correct_answer}`;

    const { data } = await instance.post("/chat/completions", {
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
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
    const winnerMatch = validationText.match(/VENCEDOR: (\w{25})/);
    const winnersIds = winnerMatch ? winnerMatch[1].split(", ") : [];

    const responseWithoutWinner = validationText.replace(/VENCEDOR: .*/, "").trim();

    return { winnersIds, content: responseWithoutWinner };
  }
}
