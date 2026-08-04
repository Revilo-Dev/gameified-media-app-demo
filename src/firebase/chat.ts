import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where, type Unsubscribe } from "firebase/firestore";
import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/firestore";
import type { Conversation, Message } from "@/types/models";

function normalizeDate(value: unknown) {
  return value && typeof value === "object" && "toDate" in value && typeof (value as { toDate: unknown }).toDate === "function"
    ? (value as { toDate: () => Date }).toDate().toISOString()
    : typeof value === "string" ? value : new Date().toISOString();
}

function normalizeConversation(snapshot: { id: string; data: () => Record<string, unknown> }): Conversation {
  const data = snapshot.data();
  return { id: snapshot.id, participantIds: Array.isArray(data.participantIds) ? data.participantIds.map(String) : [], title: String(data.title ?? "Conversation"), unreadCount: 0, lastMessage: String(data.lastMessage ?? ""), updatedAt: normalizeDate(data.updatedAt), lastSenderId: typeof data.lastSenderId === "string" ? data.lastSenderId : null };
}

function normalizeMessage(snapshot: { id: string; data: () => Record<string, unknown> }): Message {
  const data = snapshot.data();
  return { id: snapshot.id, conversationId: String(data.conversationId), senderId: String(data.senderId), recipientId: typeof data.recipientId === "string" ? data.recipientId : undefined, body: String(data.body ?? ""), createdAt: normalizeDate(data.createdAt) };
}

export function conversationIdFor(firstUserId: string, secondUserId: string) {
  return [firstUserId, secondUserId].sort().join("_");
}

export function subscribeToConversations(userId: string, onChange: (items: Conversation[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, COLLECTIONS.conversations), where("participantIds", "array-contains", userId), orderBy("updatedAt", "desc")), (snapshot) => onChange(snapshot.docs.map(normalizeConversation)));
}

export function subscribeToAllConversations(onChange: (items: Conversation[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, COLLECTIONS.conversations), orderBy("updatedAt", "desc")), (snapshot) => onChange(snapshot.docs.map(normalizeConversation)));
}

export function subscribeToConversationMessages(conversationId: string | null, onChange: (items: Message[]) => void): Unsubscribe | undefined {
  if (!conversationId) return undefined;
  return onSnapshot(query(collection(db, COLLECTIONS.messages), where("conversationId", "==", conversationId), orderBy("createdAt", "asc")), (snapshot) => onChange(snapshot.docs.map(normalizeMessage)));
}

export async function startConversation(senderId: string, recipientId: string, title: string) {
  const id = conversationIdFor(senderId, recipientId);
  const ref = doc(db, COLLECTIONS.conversations, id);
  const existing = await getDoc(ref);
  if (!existing.exists()) {
    await setDoc(ref, { participantIds: [senderId, recipientId].sort(), title, lastMessage: "", lastSenderId: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  }
  return id;
}

export async function sendDirectMessage(conversation: Conversation, senderId: string, body: string) {
  const trimmedBody = body.trim();
  if (!trimmedBody) return;
  const recipientId = conversation.participantIds.find((id) => id !== senderId);
  if (!recipientId) throw new Error("A direct message needs another participant.");
  await addDoc(collection(db, COLLECTIONS.messages), { conversationId: conversation.id, senderId, recipientId, body: trimmedBody.slice(0, 2000), createdAt: serverTimestamp() });
  await updateDoc(doc(db, COLLECTIONS.conversations, conversation.id), { lastMessage: trimmedBody.slice(0, 2000), lastSenderId: senderId, updatedAt: serverTimestamp() });
}
