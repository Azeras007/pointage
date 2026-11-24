import { Redis } from "@upstash/redis";
import { DEFAULT_SETTINGS, type Settings } from "./types";

const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

// Repli en mémoire pour le développement local sans Redis.
const g = globalThis as unknown as { __mem?: { punches: Set<number>; settings: Settings; rev?: number } };
const mem = (g.__mem ??= { punches: new Set(), settings: DEFAULT_SETTINGS });

const KEY = "punches";
const REV = "rev";

/** Marque un changement des pointages (pour le rafraîchissement des clients). */
async function bump(): Promise<void> {
  if (redis) await redis.set(REV, Date.now());
  else mem.rev = Date.now();
}

export async function getRev(): Promise<number> {
  if (redis) return Number((await redis.get<number>(REV)) ?? 0);
  return mem.rev ?? 0;
}

export async function addPunch(ms: number): Promise<void> {
  if (redis) await redis.zadd(KEY, { score: ms, member: String(ms) });
  else mem.punches.add(ms);
  await bump();
}

export async function deletePunch(ms: number): Promise<void> {
  if (redis) await redis.zrem(KEY, String(ms));
  else mem.punches.delete(ms);
  await bump();
}

export async function listPunches(fromMs: number, toMs: number): Promise<number[]> {
  if (redis) {
    const res = await redis.zrange<string[]>(KEY, fromMs, toMs, { byScore: true });
    return res.map(Number);
  }
  return [...mem.punches].filter((p) => p >= fromMs && p <= toMs).sort((a, b) => a - b);
}

export async function getSettings(): Promise<Settings> {
  if (redis) {
    const s = await redis.get<Settings>("settings");
    return { ...DEFAULT_SETTINGS, ...(s ?? {}) };
  }
  return mem.settings;
}

export async function saveSettings(s: Settings): Promise<void> {
  if (redis) await redis.set("settings", s);
  else mem.settings = s;
  await bump();
}
