import NodeCache from "node-cache";
import {
  DisconnectReason,
  makeWASocket,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  isJidBroadcast,
  WASocket,
} from "@whiskeysockets/baileys";
import useSession from "./session";
import logger from "../utils/logger";
import { Boom } from "@hapi/boom";
import { env } from "../env";
import { SessionService } from "../services/session.service";

// external map to store retry counts of messages when decryption/encryption fails
// keep this out of the socket itself, so as to prevent a message decryption/encryption loop across socket restarts
const msgRetryCounterCache = new NodeCache();

export const startSock = async (disconnectAfterCreateSession = false): Promise<WASocket> => {
  const { state, saveCreds } = await useSession(env.SESSION_NAME);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`using WA v${version.join(".")}, isLatest: ${isLatest}`);

  let isManualDisconnect = false;

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: true,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    msgRetryCounterCache,
    generateHighQualityLinkPreview: true,
    shouldIgnoreJid: (jid) => isJidBroadcast(jid),
  });

  sock.end = () => {
    isManualDisconnect = true;
    sock.ws.close();
  };

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut && !isManualDisconnect;
      console.log("ERROR STATUS_CODE", (lastDisconnect.error as Boom)?.output?.statusCode);
      console.log("connection closed due to ", lastDisconnect.error, ", reconnecting ", shouldReconnect);

      if ((lastDisconnect.error as Boom)?.output?.payload.error === "Unauthorized") {
        const sessionService = new SessionService();
        await sessionService.deleteAll();
        startSock(true);
      }

      if (shouldReconnect) {
        startSock();
      }
    } else if (connection === "open") {
      console.log("opened connection");
      if (disconnectAfterCreateSession) {
        // @ts-ignore
        sock.end();
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  return sock;
};
