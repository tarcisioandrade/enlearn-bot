import { startSock } from "./config/start-sock";
import { env } from "./env";
import { OpenAIHandler } from "./handlers/open-ai.handler";
import { MessageHandler } from "./handlers/message.handler";
import { TaskHandler } from "./handlers/task.handler";
import cron from "node-cron";
import { startHttpServer } from "./config/http";

async function initMessageEvent(generateRelatory = false) {
  console.log("EVENT STARTED");
  const sock = await startSock();
  const openAiHandler = new OpenAIHandler();
  const messageHandler = new MessageHandler(sock, openAiHandler, env.GROUP_TARGET_JID);

  await messageHandler.init();

  if (generateRelatory) await messageHandler.sendRelatory();

  // @ts-ignore
  sock.end();
  console.log("EVENT FINISHED");
}

const bootstrap = async () => {
  if (env.CREATE_SESSION) {
    const disconnectAfterCreateSession = true;
    await startSock(disconnectAfterCreateSession);
  }

  if (env.START_CREATE_TASK) {
    const sock = await startSock();
    const taskHandler = new TaskHandler(sock);
    await taskHandler.init();
  }

  if (process.env.NODE_ENV === "development") {
    initMessageEvent();
  }
};

// Cron job to start the server every day at 10:00 AM
cron.schedule("0 10 * * *", async () => await initMessageEvent(), {
  timezone: "America/Sao_Paulo",
});

// Cron job to start the server every day at 18:00 PM
cron.schedule("0 18 * * *", async () => await initMessageEvent(true), {
  timezone: "America/Sao_Paulo",
});

startHttpServer();
bootstrap();
