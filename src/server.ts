import { startSock } from "./config/start-sock";
import { env } from "./env";
import { OpenAIHandler } from "./handlers/open-ai/open-ai.handler";
import { MessageHandler } from "./handlers/message.handler";
import { TaskHandler } from "./handlers/task.handler";
import cron from "node-cron";
import { startHttpServer } from "./config/http";
import { NodeCacheService } from "./services/node-cache.service";
import { DateValidate } from "./utils/date-validate";

async function initMessage(generateWeekRelatory = false, generateMonthRelatory = false) {
  console.log("EVENT STARTED");
  const sock = await startSock();

  const cacheService = new NodeCacheService();
  const openAiHandler = new OpenAIHandler(cacheService);
  const messageHandler = new MessageHandler(sock, openAiHandler, cacheService, env.GROUP_TARGET_JID);

  await messageHandler.init();

  if (generateWeekRelatory) await messageHandler.sendWeekRelatory();
  if (generateMonthRelatory) await messageHandler.sendMonthRelatory();

  // @ts-ignore
  sock.end();
  console.log("EVENT FINISHED");
}

const bootstrap = async () => {
  if (env.CREATE_SESSION) {
    const disconnectAfterCreateSession = true;
    await startSock(disconnectAfterCreateSession);
    return;
  }

  if (env.START_CREATE_TASK) {
    const sock = await startSock();
    const taskHandler = new TaskHandler(sock);
    await taskHandler.init();
    return;
  }

  if (process.env.NODE_ENV === "development") {
    initMessage();
  }
};

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Cron job to start the server every day at 10:00 AM
cron.schedule("0 10 * * *", async () => await initMessage(), {
  timezone: "America/Sao_Paulo",
});

// Cron job to start the server every day at 18:00 PM
cron.schedule(
  "0 18 * * *",
  async () => {
    const today = new Date();
    const isLastDayOfWeek = DateValidate.isLastDayOfWeek();
    const isLastDayOfLastWeekOfMonth = DateValidate.isLastDayOfLastWeekOfMonth(today);

    await initMessage(isLastDayOfWeek, isLastDayOfLastWeekOfMonth);
  },
  {
    timezone: "America/Sao_Paulo",
  }
);

startHttpServer();
bootstrap();
