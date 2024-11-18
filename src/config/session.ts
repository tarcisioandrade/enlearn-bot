// @ts-nocheck
// Code by erickythierry
// https://github.com/erickythierry/baileys-com-DB/blob/master/usePrismaDBAuthStore.js
import fs from "fs/promises";
import path from "path";
import { WAProto as proto, initAuthCreds, BufferJSON } from "@whiskeysockets/baileys";
import { prisma } from "../prisma";
import { CloudflareBucketStorage } from "../services/cloudflare-bucket-storage.service";
import { env } from "../env";
import { LocalStorageService } from "../services/local-storage.service";

type KeyData = {
  [key: string]: any;
};

const storageService =
  process.env.NODE_ENV === "development" ? new LocalStorageService() : new CloudflareBucketStorage();

const fixFileName = (file: string | undefined) => {
  if (!file) {
    return undefined;
  }
  const replacedSlash = file.replace(/\//g, "__");
  const replacedColon = replacedSlash.replace(/:/g, "-");
  return replacedColon;
};

export async function keyExists(sessionID: string) {
  try {
    let key = await prisma.session.findUnique({
      where: { sessionID: sessionID },
    });
    return !!key;
  } catch (error) {
    // console.log("ERROR IN SESSION keyExists", error);
    return false;
  }
}

export async function saveKey(sessionID: string, keyJson: string) {
  const jaExiste = await keyExists(sessionID);
  try {
    if (!jaExiste)
      return await prisma.session.create({
        data: { sessionID: sessionID, creds: JSON.stringify(keyJson) },
      });
    await prisma.session.update({
      where: { sessionID: sessionID },
      data: { creds: JSON.stringify(keyJson) },
    });
  } catch (error) {
    // console.log("ERROR IN SESSION saveKey", error);
    return null;
  }
}

export async function getAuthKey(sessionID: string) {
  try {
    let registro = await keyExists(sessionID);
    if (!registro) return null;
    let auth = await prisma.session.findUnique({
      where: { sessionID: sessionID },
    });
    return JSON.parse(auth?.creds);
  } catch (error) {
    // console.log("ERROR IN SESSION getAuthKey", error);
    return null;
  }
}

export async function deleteAuthKey(sessionID: string) {
  try {
    let registro = await keyExists(sessionID);
    if (!registro) return;
    await prisma.session.delete({ where: { sessionID: sessionID } });
  } catch (error) {
    // console.log("ERROR IN SESSION deleteAuthKey", error);
  }
}

async function fileExists(file) {
  console.log("file", file);
  try {
    return await storageService.exists(file);
  } catch (error) {
    // console.log("ERROR IN SESSION fileExists", error);
    return;
  }
}

export default async function useSession(sessionID: string) {
  async function writeData(data: any, key: string) {
    const dataString = JSON.stringify(data, BufferJSON.replacer);

    if (key != "creds") {
      await storageService.create(key, dataString);
      return;
    }
    await saveKey(sessionID, dataString);
    return;
  }

  async function readData(key: string) {
    try {
      let rawData: string | null = null;

      if (key != "creds") {
        if (!(await fileExists(key))) return null;
        rawData = await storageService.get(key);
        console.log("rawData", rawData);
      } else {
        rawData = await getAuthKey(sessionID);
      }

      return rawData ? JSON.parse(rawData, BufferJSON.reviver) : null;
    } catch (error) {
      // console.log("ERROR IN SESSION readData", error);
      return null;
    }
  }

  async function removeData(key: string) {
    try {
      if (key != "creds") {
        await storageService.remove(key);
      } else {
        await deleteAuthKey(sessionID);
      }
    } catch (error) {
      // console.log("ERROR IN SESSION removeData", error);
      return;
    }
  }

  let creds = await readData("creds");
  if (!creds) {
    creds = initAuthCreds();
    await writeData(creds, "creds");
  }

  return {
    state: {
      creds,
      keys: {
        get: async (type: string, ids: string[]): Promise<KeyData> => {
          const data: Record<string, any> = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === "app-state-sync-key" && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }

              data[id] = value;
            })
          );
          return data;
        },
        set: async (data: Record<string, any>) => {
          const tasks: Promise<void>[] = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const key = `${category}-${id}`;

              tasks.push(value ? writeData(value, key) : removeData(key));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: () => {
      return writeData(creds, "creds");
    },
  };
}
