import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebase/config";

export const functionNames = {
  createPostReward: "createPostReward",
  claimArcadeReward: "claimArcadeReward",
  reserveHandle: "reserveHandle",
  banUserAccount: "banUserAccount",
  deletePostCascade: "deletePostCascade",
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
