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

export function getXpProgress(xp: number, level: number) {
  const currentLevelFloor = level <= 1 ? 0 : xpRequiredForLevel(level - 1);
  const nextLevelCeiling = xpRequiredForLevel(level);
  const earned = xp - currentLevelFloor;
  const needed = nextLevelCeiling - currentLevelFloor;

  return {
    earned,
    needed,
    percentage: Math.min(100, Math.round((earned / needed) * 100)),
  };
}
