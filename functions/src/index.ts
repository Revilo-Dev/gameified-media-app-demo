import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onCall } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";

initializeApp();

export const awardXpOnPostCreate = onDocumentCreated("posts/{postId}", async () => {
  return;
});

export const reserveHandle = onCall(async () => {
  return { ok: true };
});
