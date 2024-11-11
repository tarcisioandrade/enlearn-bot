import { WASocket } from "@whiskeysockets/baileys";
import { compoundMessage } from "../utils/compound-message";
import { ScoreService } from "../services/score.service";
import { ResponseService } from "../services/response.service";
import { QuestionService } from "../services/question.service";
import { Difficulty, QuestionType } from "@prisma/client";
import { calculateScore } from "../utils/calculate-score";
import { UserService } from "../services/user.service";

interface CreateOrUpdateScoreInput {
  winnerId: string;
  questionType: QuestionType;
  questionDifficulty: Difficulty;
  timeTaken: number;
}

export class ScoreHandler {
  private userHandler = new UserService();
  private scoreService = new ScoreService();
  private responseHandler = new ResponseService();
  private questionService = new QuestionService();

  constructor(private sock: WASocket, private GROUP_TARGET_JID: string) {}

  public createOrUpdate = async (input: CreateOrUpdateScoreInput) => {
    const currentScore = await this.scoreService.getCurrentWeek(input.winnerId);

    const score = calculateScore({
      questionType: input.questionType,
      difficulty: input.questionDifficulty,
      timeTaken: input.timeTaken,
      weeklyParticipationDays: currentScore?.weekly_participation_days ?? 0,
      consecutiveHardCorrectAnswers: currentScore?.consecutive_hard_correct_answers ?? 0,
    });

    await this.scoreService.createOrUpdate({ user_id: input.winnerId, score: score.value, ...score });
  };

  public generateRelatory = async () => {
    await this.sock.sendMessage(this.GROUP_TARGET_JID, {
      text: compoundMessage("Gerando relatório..."),
    });
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const scores = await this.scoreService.getAllScoresToCurrentWeek();
    const scoresUserSorted = scores.sort((a, b) => b.score - a.score);
    const question = await this.questionService.getAll();
    const responses = await this.responseHandler.getAllByCurrentWeek();

    const totalCorrectAnswers = responses.filter((r) => r.is_correct).length;
    const totalIncorrectAnswers = responses.filter((r) => !r.is_correct).length;

    const message = `*Relatório Semanal de Pontuação*

Olá, pessoal! 👋

Parabéns por mais uma semana de dedicação e prática! Aqui está o relatório com o desempenho de cada um e o nosso ranking semanal:

Resumo de Pontuação:

Total de Perguntas Respondidas: ${question.length}
Respostas Corretas: ${totalCorrectAnswers}
Respostas Incorretas: ${totalIncorrectAnswers}

Ranking Semanal 🏆:

${scoresUserSorted
  .map((score, index) => {
    let medal = "";
    if (index === 0) medal = "🥇 ";
    else if (index === 1) medal = "🥈 ";
    else if (index === 2) medal = "🥉 ";
    return `- ${medal}*${score.user.push_name}*: ${score.score} pontos`;
  })
  .join("\n")}

Continuem participando ativamente, pois cada ponto conquistado faz a diferença no nosso ranking! Na próxima semana, teremos novas perguntas e mais oportunidades de aprender e acumular pontos.

Bons estudos e até a próxima semana! 📚✨`;

    await this.sock.sendMessage(this.GROUP_TARGET_JID, {
      text: compoundMessage(message),
    });
  };

  public resetUsersWeeklyScore = async (questionId: string) => {
    const users = await this.userHandler.getAll();
    const responses = await this.responseHandler.getAll(questionId);

    const usersNotAnswered = users.filter((user) => !responses.some((response) => response.user_id === user.id));
    console.log("usersNotAnswered", usersNotAnswered);

    usersNotAnswered.forEach(async (user) => {
      const currentScore = await this.scoreService.getCurrentWeek(user.id);
      if (currentScore) {
        await this.scoreService.createOrUpdate({
          user_id: user.id,
          weeklyParticipationDays: 0,
        });
      }
    });
  };
}
