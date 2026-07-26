const DAILY_POST_XP_LIMIT = 10;
export const POST_COOLDOWN_SECONDS = 10;
export const MAX_REPLIES_PER_USER = 4;

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

export function getPostingCooldownRemainingSeconds(lastPostedAt: Date | null, now: Date) {
  if (!lastPostedAt) {
    return 0;
  }

  const remainingMs = POST_COOLDOWN_SECONDS * 1000 - (now.getTime() - lastPostedAt.getTime());
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

export function canUserReplyToPost(existingReplyCount: number) {
  return existingReplyCount < MAX_REPLIES_PER_USER;
}
