import { env } from "../env";

export function compoundMessage(message: string) {
  return `\`${env.BOT_NAME}\`\n\n${message}`;
}
