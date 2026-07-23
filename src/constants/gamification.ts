export const XP_REWARDS = {
  DAILY_LOGIN: 10,
  CREATE_POST: 5,
  RECEIVE_REACTION: 2,
  RECEIVE_REPLY: 3,
  COMPLETE_PROFILE: 50,
  GAIN_FOLLOWER: 5,
  COMPLETE_DAILY_CHALLENGE: 25,
} as const;

export function xpRequiredForLevel(level: number) {
  return Math.floor(100 * Math.pow(level, 1.45));
}

export function getLevelForXp(xp: number) {
  let level = 1;

  while (xp >= xpRequiredForLevel(level + 1)) {
    level += 1;
  }

  return level;
}

export function getXpProgress(xp: number, level: number) {
  const safeLevel = Math.max(level, getLevelForXp(xp));
  const currentLevelFloor = safeLevel <= 1 ? 0 : xpRequiredForLevel(safeLevel);
  const nextLevelCeiling = xpRequiredForLevel(safeLevel + 1);
  const earned = Math.max(0, xp - currentLevelFloor);
  const needed = nextLevelCeiling - currentLevelFloor;

  return {
    earned: Math.min(needed, earned),
    needed,
    percentage: Math.min(100, Math.round((Math.min(needed, earned) / needed) * 100)),
  };
}
