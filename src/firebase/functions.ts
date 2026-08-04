import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebase/config";

export const functionNames = {
  createPostReward: "createPostReward",
  claimArcadeReward: "claimArcadeReward",
  reserveHandle: "reserveHandle",
  banUserAccount: "banUserAccount",
  deletePostCascade: "deletePostCascade",
  resetAllGems: "resetAllGems",
  resetAllCrypto: "resetAllCrypto",
  claimDailyReward: "claimDailyReward",
} as const;

export async function banUserAccount(targetUserId: string) {
  const callable = httpsCallable<{ targetUserId: string }, { ok: boolean }>(functions, functionNames.banUserAccount);
  const result = await callable({ targetUserId });
  return result.data;
}

export async function deletePostCascade(postId: string) {
  const callable = httpsCallable<{ postId: string }, { ok: boolean }>(functions, functionNames.deletePostCascade);
  const result = await callable({ postId });
  return result.data;
}

export async function resetAllGems() {
  const callable = httpsCallable<undefined, { ok: boolean }>(functions, functionNames.resetAllGems);
  const result = await callable();
  return result.data;
}

export async function resetAllCrypto() {
  const callable = httpsCallable<undefined, { ok: boolean }>(functions, functionNames.resetAllCrypto);
  const result = await callable();
  return result.data;
}

export async function claimDailyReward() {
  const callable = httpsCallable<undefined, { reward: number; streak: number }>(functions, functionNames.claimDailyReward);
  const result = await callable();
  return result.data;
}
