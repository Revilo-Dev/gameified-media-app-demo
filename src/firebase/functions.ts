import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebase/config";

export const functionNames = {
  createPostReward: "createPostReward",
  claimArcadeReward: "claimArcadeReward",
  reserveHandle: "reserveHandle",
  banUserAccount: "banUserAccount",
  removePostEmbed: "removePostEmbed",
  checkIpBan: "checkIpBan",
  registerUserDeviceIp: "registerUserDeviceIp",
  deletePostCascade: "deletePostCascade",
  resetAllGems: "resetAllGems",
  resetAllCrypto: "resetAllCrypto",
  claimDailyReward: "claimDailyReward",
  recordPostView: "recordPostView",
} as const;

export async function checkIpBan() {
  const callable = httpsCallable<undefined, { banned: boolean }>(functions, functionNames.checkIpBan);
  return (await callable()).data;
}

export async function registerUserDeviceIp() {
  const callable = httpsCallable<undefined, { banned: boolean }>(functions, functionNames.registerUserDeviceIp);
  return (await callable()).data;
}

export async function banUserAccount(targetUserId: string) {
  const callable = httpsCallable<{ targetUserId: string }, { ok: boolean }>(functions, functionNames.banUserAccount);
  const result = await callable({ targetUserId });
  return result.data;
}

export async function removePostEmbed(postId: string) {
  const callable = httpsCallable<{ postId: string }, { ok: boolean }>(functions, functionNames.removePostEmbed);
  return (await callable({ postId })).data;
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

export async function recordPostView(postId: string) {
  const callable = httpsCallable<{ postId: string }, { counted: boolean }>(functions, functionNames.recordPostView);
  return (await callable({ postId })).data;
}
