import NodeCache from "node-cache";
import {
  DisconnectReason,
  makeWASocket,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  isJidBroadcast,
} from "@whiskeysockets/baileys";
import useSession from "./session";
import logger from "../utils/logger";
import { Boom } from "@hapi/boom";
import { env } from "../env";

// external map to store retry counts of messages when decryption/encryption fails
// keep this out of the socket itself, so as to prevent a message decryption/encryption loop across socket restarts
const msgRetryCounterCache = new NodeCache();

export const startSock = async () => {
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

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut && !isManualDisconnect;
      console.log("ERROR STATUS_CODE", (lastDisconnect.error as Boom)?.output?.statusCode);
      console.log("connection closed due to ", lastDisconnect.error, ", reconnecting ", shouldReconnect);
      // reconnect if not logged out
      if (shouldReconnect) {
        startSock();
      }
    } else if (connection === "open") {
      console.log("opened connection");
    }
  });

  sock.end = () => {
    isManualDisconnect = true;
    sock.ws.close();
  };

  sock.ev.on("creds.update", saveCreds);
  return sock;
};
