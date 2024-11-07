import { startSock } from "./config/start-sock";
import { TaskHandler } from "./handlers/task.handler";
import { UserHandler } from "./handlers/user.handler";

const bootstrap = async () => {
  const sock = await startSock();
  const userHandler = new UserHandler();
  new TaskHandler(sock, userHandler);
};

bootstrap();
