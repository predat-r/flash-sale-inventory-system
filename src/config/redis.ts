import Redis from 'ioredis';
import { config } from './index';

class RedisClient {
  private client: Redis;

  constructor() {
    const url = new URL(config.redis.url);
    const password = url.password || '';
    this.client = new Redis({
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: password || undefined,
      tls: { servername: url.hostname },
      maxRetriesPerRequest: 3,
    });

    this.client.on('connect', () => {
      console.log('Connected to Redis');
    });

    this.client.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    this.client.on('close', () => {
      console.log('Redis connection closed');
    });
  }

  public getClient(): Redis {
    return this.client;
  }

  public async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  public async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  public async exists(key: string): Promise<number> {
    return this.client.exists(key);
  }

  public async decrBy(key: string, decrement: number): Promise<number> {
    return this.client.decrby(key, decrement);
  }

  public async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  public async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  public async mget(keys: string[]): Promise<(string | null)[]> {
    return this.client.mget(keys);
  }

  public async close(): Promise<void> {
    await this.client.quit();
  }
}

export const redisClient = new RedisClient();