import { env } from "../env";
import axios from "axios";
import { QuestionCreateInput, QuestionService } from "../services/question.service";

const instance = axios.create({
  baseURL: "https://api.openai.com/v1",
  headers: {
    Authorization: `Bearer ${env.AI_TOKEN}`,
    "Content-Type": "application/json",
  },
});

export class OpenAIHandler {
  readonly prompt =
    "Crie uma pergunta que pode ser de dois tipos: tradução (você escreve uma frase e os usuários deve chegar o mais perto da tradução) ou multipla escolha, você decide qual vai ser, mande apenas uma pergunta, a pergunta é para testar os conhecimentos de inglês de um usuário, se for uma TRANSLATION, voce manda a frase em inglês para ser traduzida para português, dificuldade: MEDIUM. Mande um json com as seguintes informações: content, options (array vazio se for do tipo TRANSLATION), correct_answer, type, difficulty. (type: TRANSLATION ou MULTIPLE_CHOICE), (difficulty: EASY, MEDIUM, HARD)";

  public question_id: string;

  constructor(private questionService: QuestionService) {}
  async createQuestion() {
    const { data } = await instance.post("/chat/completions", {
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: this.prompt }],
    });
    console.log("data", data.choices[0].message.content);
    const question = data.choices[0].message.content;
    const questionParsed: QuestionCreateInput = JSON.parse(question.replace("```json", "").replace("```", ""));

    console.log("questionParsed", questionParsed);
    const createdQuestion = await this.questionService.create(questionParsed);

    this.question_id = createdQuestion.id;

    return { content: questionParsed.content, difficulty: questionParsed.difficulty, type: questionParsed.type };
  }

  async validateAnswer() {
    const question = await this.questionService.get(this.question_id);

    const prompt = `Para validar as respostas dos usuários, siga este formato: 1. Se a pergunta for do tipo 'TRANSLATION', responda assim: Análise das respostas dos usuários: - *{user.name}*: Forneça um feedback detalhado sobre a resposta desse usuário, explicando os erros e acertos específicos na tradução. Indique se a tradução contém palavras ou estruturas incorretas ou menos apropriadas e se ela captou a ideia principal. - *{user.name}*: Avalie a tradução deste usuário, destacando onde ele acertou ou errou na estrutura ou no sentido. Mencione se ele usou palavras próximas ao significado correto ou se houve algum deslize relevante. Conclua indicando qual usuário chegou mais perto da tradução correta, mesmo que não tenha sido perfeita. Tradução correta: Escreva a tradução completa da frase em inglês fornecida na pergunta. - Se a pergunta for do tipo 'MULTIPLE_CHOICE', responda assim: Análise das respostas dos usuários: - *{user.name}*: Indique se o usuário escolheu a resposta correta ou incorreta, mencionando brevemente o motivo da escolha errada, se houver. - *{user.name}*: Repita para cada usuário. Conclua indicando quantos usuários acertaram a resposta e quantos erraram. Exemplo para 'TRANSLATION': 'Análise das respostas dos usuários: 1. Henrique Neto: A resposta contém uma tradução incorreta de \"convey\" como \"converter\" e também usa a palavra \"utterring\", que é um erro. Portanto, essa resposta não está correta. - *Ana Paula*: A resposta traduz \"convey\" como \"converter\", que não é o termo mais adequado. No entanto, ela acertou ao manter a ideia principal e a estrutura da frase. A tradução \"sem uma única palavra\" também é aceitável, mas \"sem dizer uma única palavra\" é mais precisa. Portanto, a resposta de *Henrique Neto* é a que chegou mais perto da resposta correta, apesar de não ser perfeita. Tradução correta: [Tradução completa da frase aqui]' Exemplo para 'MULTIPLE_CHOICE': 'Análise das respostas dos usuários: - Henrique Neto: Escolheu a resposta incorreta. A opção selecionada indicava uma ação contínua, mas a pergunta queria um resultado específico. - *Ana Paula*: Escolheu a resposta correta. Total: 1 usuário acertou, 1 usuário errou.'. 
    Informações que voce precisa: 
    Tipo da pergunta: ${question?.type}
    Pergunta: ${question?.content}
    Resposta dos usuários: ${question?.responses.map((r) => `${r.user.push_name}: ${r.answer}`).join("\n")}
    Resposta correta: ${question?.correct_answer}`;

    const { data } = await instance.post("/chat/completions", {
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    console.log("data.choices[0].message.content", data.choices[0].message.content);

    return data.choices[0].message.content;
  }
}
