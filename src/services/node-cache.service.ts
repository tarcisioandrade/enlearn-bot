import NodeCache from "node-cache";
import { ICacheService } from "../interfaces/CacheService";

export class NodeCacheService implements ICacheService {
  private _cache = new NodeCache();

  public getOrCreateCache = async <T>(key: string, factory: () => Promise<T>, expireTime = 3600): Promise<T> => {
    const cachedValue = this._cache.get<T>(key);
    if (cachedValue) {
      console.log("CACHED: ", key);
      return cachedValue;
    }
    const value = await factory();
    this._cache.set(key, value, expireTime);
    return value;
  };

  public removeCache = (key: string) => this._cache.del(key);
}
