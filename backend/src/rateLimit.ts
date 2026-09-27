import { redis } from './redis';

function getHourKey(sender: string): string {
  const now = new Date();
  const window = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}`;
  return `rate:sender:${sender}:${window}`;
}

/** Returns true if under limit and increments counter. False if over limit. */
export async function checkAndIncrement(sender: string, limit: number): Promise<boolean> {
  const key = getHourKey(sender);
  const current = await redis.incr(key);
  await redis.expire(key, 7200); // TTL 2 hours

  if (current > limit) {
    await redis.decr(key); // roll back — don't count this failed attempt
    return false;
  }
  return true;
}

/** Ms until the start of the next UTC hour */
export function msUntilNextHour(): number {
  const now = new Date();
  const next = new Date(now);
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(next.getUTCHours() + 1);
  return next.getTime() - now.getTime();
}
