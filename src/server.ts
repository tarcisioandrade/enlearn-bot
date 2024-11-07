import { startSock } from "./config/start-sock";
import { env } from "./env";
import { OpenAIHandler } from "./handlers/open-ai.handler";
import { MessageHandler } from "./handlers/message.handler";
import { ScoreService } from "./services/score.service";
import { TaskHandler } from "./handlers/task.handler";
import { UserService } from "./services/user.service";
import { ResponseService } from "./services/response.service";
import { QuestionService } from "./services/question.service";

const bootstrap = async () => {
  const sock = await startSock();
  const userService = new UserService();
  const scoreService = new ScoreService();
  const questionService = new QuestionService();
  const responseService = new ResponseService();

  // new TaskHandler(sock, userService);
  const openAiHandler = new OpenAIHandler(questionService);
  const messageHandler = new MessageHandler(
    sock,
    openAiHandler,
    userService,
    scoreService,
    responseService,
    questionService
  );
  messageHandler.create(env.GROUP_TARGET_JID);
};

bootstrap();
