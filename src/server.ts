// @ts-nocheck
import { startSock } from "./config/start-sock";
import { env } from "./env";
import { OpenAIHandler } from "./handlers/open-ai.handler";
import { MessageHandler } from "./handlers/message.handler";
import { TaskHandler } from "./handlers/task.handler";
import cron from "node-cron";
import fs from "fs";
import { startHttpServer } from "./config/http";

const bootstrap = async () => {
  if (!fs.existsSync("sessions/")) {
    const sock = await startSock();
    // const openAiHandler = new OpenAIHandler();
    // const taskHandler = new TaskHandler(sock);
    // await taskHandler.init();

    // const messageHandler = new MessageHandler(sock, openAiHandler, env.GROUP_TARGET_JID);
    // await messageHandler.init();
  }
};

bootstrap();

async function initMessageEvent() {
  const sock = await startSock();
  const openAiHandler = new OpenAIHandler();
  const messageHandler = new MessageHandler(sock, openAiHandler, env.GROUP_TARGET_JID);

  await messageHandler.init();
  // @ts-ignore
  sock.end();
}

// Cron job to start the server every day at 10:00 AM
cron.schedule("0 10 * * *", async () => {
  console.log("EVENT STARTED");
  await initMessageEvent();
  console.log("EVENT FINISHED");
});

// Cron job to start the server every day at 18:00 PM
cron.schedule("0 19 * * *", async () => {
  console.log("EVENT STARTED");
  await initMessageEvent();
  console.log("EVENT FINISHED");
});

startHttpServer();
