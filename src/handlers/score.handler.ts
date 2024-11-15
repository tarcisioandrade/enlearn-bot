import { WASocket } from "@whiskeysockets/baileys";
import { compoundMessage } from "../utils/compound-message";
import { ScoreService } from "../services/score.service";
import { ResponseService } from "../services/response.service";
import { QuestionService } from "../services/question.service";
import { Difficulty, QuestionType } from "@prisma/client";
import { calculateScore } from "../utils/calculate-score";
import { UserService } from "../services/user.service";
import { ICacheService } from "../interfaces/CacheService";
import { CACHE_KEYS } from "../constants";
import { RelatoryService } from "../services/relatory.service";
import { ClearDataService } from "../services/clear-data.service";
import { setTimeout as setTimeoutPromise } from "timers/promises";

interface CreateOrUpdateScoreInput {
  status: "WINNER" | "LOSER";
  user_id: string;
  questionType: QuestionType;
  questionDifficulty: Difficulty;
  timeTaken: number;
}

interface TotalScoreWeek {
  push_name: string;
  score: number;
  user_id: string;
}

export class ScoreHandler {
  private userHandler = new UserService();
  private scoreService = new ScoreService();
  private responseService = new ResponseService();
  private questionService = new QuestionService();
  private relatoryService = new RelatoryService();
  private clearDataService = new ClearDataService();

  constructor(private cacheService: ICacheService, private sock: WASocket, private GROUP_TARGET_JID: string) {}

  public createOrUpdate = async (input: CreateOrUpdateScoreInput) => {
    const currentScore = await this.cacheService.getOrCreateCache(CACHE_KEYS.CURRENT_SCORE, () =>
      this.scoreService.getCurrentWeek(input.user_id)
    );

    const score = calculateScore({
      status: input.status,
      questionType: input.questionType,
      difficulty: input.questionDifficulty,
      timeTaken: input.timeTaken,
      weeklyParticipationDays: currentScore?.weekly_participation_days,
      consecutiveHardCorrectAnswers: currentScore?.consecutive_hard_correct_answers,
    });

    await this.scoreService.createOrUpdate({
      id: currentScore?.id,
      user_id: input.user_id,
      score: score.value,
      ...score,
    });
  };

  public generateWeekRelatory = async () => {
    await this.sock.sendMessage(this.GROUP_TARGET_JID, {
      text: compoundMessage("Gerando relatório semanal..."),
    });
    await setTimeoutPromise(5000);

    const scores = await this.cacheService.getOrCreateCache(CACHE_KEYS.ALL_SCORES_TO_CURRENT_WEEK, async () =>
      this.scoreService.getAllScoresToCurrentWeek()
    );
    const scoresUserSorted = scores.sort((a, b) => b.score - a.score);

    const [question, responses, mostCommonTheme] = await Promise.all([
      this.questionService.getAll(),
      this.responseService.getAllByCurrentWeek(),
      this.questionService.getMostCommonTheme({ weekStart: scores[0].week_start, weekEnd: scores[0].week_end }),
    ]);

    const totalCorrectAnswers = responses.filter((r) => r.is_correct).length;
    const totalIncorrectAnswers = responses.filter((r) => !r.is_correct).length;

    await this.relatoryService.create({
      questions_length: question.length,
      correct_answers: totalCorrectAnswers,
      incorrect_answers: totalIncorrectAnswers,
      winner_id: scoresUserSorted[0].user_id,
      total_score: scoresUserSorted.reduce((acc, score) => acc + score.score, 0),
      most_common_theme: mostCommonTheme,
      week_start: scores[0].week_start,
      week_end: scores[0].week_end,
    });

    const message = `*Relatório Semanal de Pontuação*

Olá, pessoal! 👋

Parabéns por mais uma semana de dedicação e prática! Aqui está o relatório com o desempenho de cada um e o nosso ranking semanal:

Resumo de Pontuação:  

- *Total de Perguntas Respondidas:* ${question.length}
- *Respostas Corretas:* ${totalCorrectAnswers}
- *Respostas Incorretas:* ${totalIncorrectAnswers}

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

    await Promise.all([
      this.sock.sendMessage(this.GROUP_TARGET_JID, {
        text: compoundMessage(message),
      }),
      this.clearDataService.clear(),
    ]);
  };

  public generateMonthRelatory = async () => {
    await this.sock.sendMessage(this.GROUP_TARGET_JID, {
      text: compoundMessage("Gerando relatório mensal..."),
    });
    await setTimeoutPromise(5000);

    const relatories = await this.relatoryService.getAllByMonth();

    const totalQuestions = relatories.reduce((acc, relatory) => acc + relatory.questions_length, 0);
    const totalCorrectAnswers = relatories.reduce((acc, relatory) => acc + relatory.correct_answers, 0);
    const totalIncorrectAnswers = relatories.reduce((acc, relatory) => acc + relatory.incorrect_answers, 0);
    const totalScore = relatories.reduce((acc, relatory) => acc + relatory.total_score, 0);

    const [mostCommonTheme, scores] = await Promise.all([
      this.relatoryService.getCommonThemeInMonth(),
      this.cacheService.getOrCreateCache(CACHE_KEYS.ALL_SCORES_TO_CURRENT_WEEK, async () =>
        this.scoreService.getAllScoresToCurrentWeek()
      ),
    ]);

    const totalScoreWeek = scores
      .reduce<TotalScoreWeek[]>((acc, score) => {
        const userScore = acc.find((s) => s.user_id === score.user_id);
        if (userScore) {
          userScore.score += score.score;
        } else {
          acc.push({ push_name: score.user.push_name, score: score.score, user_id: score.user_id });
        }
        return acc;
      }, [])
      .sort((a, b) => b.score - a.score);

    console.log("totalScoreWeek", totalScoreWeek);
    const usersScoresWithoutWinner = totalScoreWeek.filter((user) => user.user_id !== totalScoreWeek[0].user_id);

    const message = `📅 Relatório Mensal de Desempenho do Desafio de Inglês 📅

- *Período:* ${new Date().toLocaleDateString("pt-BR", { month: "numeric", year: "numeric" })}
- *Total de Perguntas Feitas:* ${totalQuestions}
- *Participantes Ativos:* ${relatories.length}

🎯 Resultados Gerais

- ✅ *Respostas Corretas:* ${totalCorrectAnswers}
- ❌ *Respostas Incorretas:* ${totalIncorrectAnswers}
- 🏆 *Pontuação Total Distribuída:* ${totalScore} pontos

📚 Análise de Temas

- *Tema Mais Frequente:* ${mostCommonTheme}

🏅 Vencedor do Mês

- *Usuário:* ${totalScoreWeek[0].push_name}
- *Pontuação Total:* ${totalScoreWeek[0].score}

📈 Desempenho dos Outros Participantes

${usersScoresWithoutWinner.map((user) => `- *${user.push_name}* - ${user.score}`).join("\n")}

Obrigado a todos por participarem! Continuem praticando e se desafiando. Preparados para o próximo mês? 💪`;

    await this.sock.sendMessage(this.GROUP_TARGET_JID, {
      text: compoundMessage(message),
    });
  };

  public resetUsersWeeklyParticipationDays = async (questionId: string) => {
    const [users, responses] = await Promise.all([
      this.cacheService.getOrCreateCache(CACHE_KEYS.ALL_USERS, () => this.userHandler.getAll()),
      this.cacheService.getOrCreateCache(CACHE_KEYS.QUESTION_RESPONSES, () => this.responseService.getAll(questionId)),
    ]);

    const usersNotAnswered = users.filter((user) => !responses.some((response) => response.user_id === user.id));

    usersNotAnswered.forEach(async (user) => {
      const currentScore = await this.cacheService.getOrCreateCache(CACHE_KEYS.CURRENT_SCORE, () =>
        this.scoreService.getCurrentWeek(user.id)
      );
      if (currentScore) {
        await this.scoreService.resetConsecutiveWeeklyParticipationDays(currentScore.id);
      }
    });
  };

  public resetConsecutiveHardCorrectAnswers = async (questionId: string) => {
    const usersIdsToReset = new Set<string>();

    const [users, responses] = await Promise.all([
      this.cacheService.getOrCreateCache(CACHE_KEYS.ALL_USERS, () => this.userHandler.getAll()),
      this.cacheService.getOrCreateCache(CACHE_KEYS.QUESTION_RESPONSES, () => this.responseService.getAll(questionId)),
    ]);

    const usersNotAnswered = users
      .filter((user) => !responses.some((response) => response.user_id === user.id))
      .map((user) => user.id);
    const usersLosers = responses.filter((response) => !response.is_correct).map((response) => response.user_id);

    usersNotAnswered.forEach((id) => usersIdsToReset.add(id));
    usersLosers.forEach((id) => usersIdsToReset.add(id));

    await Promise.all(
      Array.from(usersIdsToReset).map(async (loserId) => {
        const currentScore = await this.cacheService.getOrCreateCache(CACHE_KEYS.CURRENT_SCORE, () =>
          this.scoreService.getCurrentWeek(loserId)
        );

        console.log("currentScore", currentScore);
        if (currentScore) {
          await this.scoreService.resetConsecutiveHardCorrectAnswers(currentScore.id);
        }
      })
    );
  };
}
