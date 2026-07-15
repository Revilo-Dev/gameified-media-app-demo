const DAILY_POST_XP_LIMIT = 10;
const POST_COOLDOWN_SECONDS = 60;

export function canAwardDailyPostXp(postCountToday: number) {
  return postCountToday < DAILY_POST_XP_LIMIT;
}

export function hasPostingCooldownElapsed(lastAwardedAt: Date | null, now: Date) {
  if (!lastAwardedAt) {
    return true;
  }

  return now.getTime() - lastAwardedAt.getTime() >= POST_COOLDOWN_SECONDS * 1000;
}

export function shouldAwardPostXp(postCountToday: number, lastAwardedAt: Date | null, now: Date) {
  return canAwardDailyPostXp(postCountToday) && hasPostingCooldownElapsed(lastAwardedAt, now);
}
