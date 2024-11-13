import { Difficulty, Question, QuestionType } from "@prisma/client";

export const RESPONSE_VALIDATION_PROMPT = {
  system:
    "Você é um moderador de perguntas e respostas, você precisa analisar as respostas dos usuários e determinar o vencedor ou vencedores.",
  assistant: `Para validar as respostas dos usuários, siga este formato:
1. Se a pergunta for do tipo 'TRANSLATION', responda assim:
   Analisando as respostas dos usuários:
   
   1. *{user.name}*: Forneça um feedback detalhado sobre a resposta desse usuário, explicando os erros e acertos específicos na tradução. Indique se a tradução contém palavras ou estruturas incorretas ou menos apropriadas e se ela captou a ideia principal.
   
   2. *{user.name}*: Avalie a tradução deste usuário, destacando onde ele acertou ou errou na estrutura ou no sentido. Mencione se ele usou palavras próximas ao significado correto ou se houve algum deslize relevante.
   
   Conclua indicando qual usuário chegou mais perto da tradução correta, mesmo que não tenha sido perfeita.
   
   Tradução correta: Escreva a tradução completa da frase em inglês fornecida na pergunta.
   
2. Se a pergunta for do tipo 'MULTIPLE_CHOICE', responda assim:
   Analisando as respostas dos usuários:
   
   1. *{user.name}*: Indique se o usuário escolheu a resposta correta ou incorreta, mencionando brevemente o motivo da escolha errada, se houver.
   
   2. *{user.name}*: Repita para cada usuário.
   
   Conclua indicando quantos usuários acertaram a resposta e quantos erraram.
   
Exemplo para 'TRANSLATION':

Analisando as respostas dos usuários:

1. *Henrique Neto*: A resposta contém uma tradução incorreta de "convey" como "converter" e também usa a palavra "utterring", que é um erro. Portanto, essa resposta não está correta.

2. *Ana Paula*: A resposta traduz "convey" como "converter", que não é o termo mais adequado. No entanto, ela acertou ao manter a ideia principal e a estrutura da frase. A tradução "sem uma única palavra" também é aceitável, mas "sem dizer uma única palavra" é mais precisa.

Portanto, a resposta de *Henrique Neto* é a que chegou mais perto da resposta correta, apesar de não ser perfeita.

Tradução correta: [Tradução completa da frase aqui]' 

VENCEDOR: (aqui você coloca o id do usuário que acertou a pergunta, se houver mais de um vencedor, coloque o id de cada um separado por vírgula e espaço)

Exemplo para 'MULTIPLE_CHOICE':

Analisando as respostas dos usuários:

1. *Henrique Neto*: Escolheu a resposta incorreta. A opção selecionada indicava uma ação contínua, mas a pergunta queria um resultado específico.

2. *Ana Paula*: Escolheu a resposta correta.

Total: 1 usuário acertou, 1 usuário errou.'

VENCEDOR: (aqui você coloca o id do usuário que acertou a pergunta, se houver mais de um vencedor, coloque o id de cada um separado por vírgula e espaço)`,

  user: (question: Question, usersAnswersFormatter: { id: string; pushName: string; answer: string }[]) => {
    return `Informações que voce precisa: Tipo da pergunta: ${question?.type} Pergunta: ${
      question?.content
    } Resposta dos usuários: ${JSON.stringify(usersAnswersFormatter)}\n
     Resposta correta: ${question?.correct_answer}`;
  },
};

export const QUESTION_CREATION_PROMPT = {
  system:
    "Você precisa criar uma pergunta ou frase que seja adequada para o tipo e a dificuldade informada, e as perguntas devem fazer sentido para testar os conhecimentos desses usuários que estão aprendendo o idioma inglês.",
  assistant: `Se a pergunta for do tipo TRANSLATION, voce manda a frase em inglês para ser traduzida para português, se for MULTIPLE_CHOICE, crie uma pergunta para testar os conhecimentos de inglês de um usuário com uma resposta correta e três opções incorretas (coloque-as em alternativas (Ex: a), b), c), d)). Mande um json com as seguintes informações: content, options (array vazio se for do tipo TRANSLATION), correct_answer, type, difficulty. (type: TRANSLATION ou MULTIPLE_CHOICE), (difficulty: EASY, MEDIUM, HARD)`,
  user: (type: QuestionType, difficulty: Difficulty, theme: string) => {
    return `Crie uma pergunta que do tipo ${type} e com o tema ${theme} na dificuldade ${difficulty}`;
  },
};
