export interface ICacheService {
  getOrCreateCache<T>(key: string, factory: () => Promise<T>, expireTime?: number): Promise<T>;
  removeCache(key: string): void;
}
