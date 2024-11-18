export interface SessionsStorageService {
  exists: (file: string) => Promise<boolean>;
  create: (key: string, data: any) => Promise<void>;
  get: (key: string) => Promise<string | null>;
  remove: (key: string) => Promise<void>;
  getFileKey: (key: string) => string;
}
