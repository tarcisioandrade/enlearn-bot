import { startSock } from "./config/start-sock";
import { env } from "./env";
import { OpenAIHandler } from "./handlers/open-ai.handler";
import { MessageHandler } from "./handlers/message.handler";
import { TaskHandler } from "./handlers/task.handler";
import cron from "node-cron";

const bootstrap = async () => {
  const sock = await startSock();
  const openAiHandler = new OpenAIHandler();
  // await taskHandler.init();

  const messageHandler = new MessageHandler(sock, openAiHandler, env.GROUP_TARGET_JID);
  await messageHandler.init();
};
bootstrap();

// async function initMessageEvent() {
//   const sock = await startSock();
//   const openAiHandler = new OpenAIHandler();
//   const messageHandler = new MessageHandler(sock, openAiHandler, env.GROUP_TARGET_JID);

//   await messageHandler.init();
//   // @ts-ignore
//   sock.end();
// }
// // Cron job to start the server every day at 10:00 AM
// cron.schedule("0 10 * * *", async () => {
//   console.log("EVENT STARTED");
//   await initMessageEvent();
//   console.log("EVENT FINISHED");
// });

// cron.schedule("0 18 * * *", async () => {
//   console.log("EVENT STARTED");
//   await initMessageEvent();
//   console.log("EVENT FINISHED");
// });
