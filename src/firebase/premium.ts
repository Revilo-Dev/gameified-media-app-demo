import { collection, limit, onSnapshot, query, where, type Unsubscribe } from "firebase/firestore";
import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/firestore";
import type { PremiumPaymentRequest } from "@/types/models";

function mapPremiumPayment(id: string, data: Record<string, unknown>): PremiumPaymentRequest {
  return {
    ...(data as Omit<PremiumPaymentRequest, "id">),
    id,
  };
}

function sortNewestFirst(payments: PremiumPaymentRequest[]) {
  return payments.sort((a, b) => Number(b.createdAtMs ?? 0) - Number(a.createdAtMs ?? 0));
}

export function subscribeToPremiumPaymentsForUser(userId: string, onChange: (payments: PremiumPaymentRequest[]) => void): Unsubscribe {
  const paymentsQuery = query(collection(db, COLLECTIONS.premiumPayments), where("userId", "==", userId), limit(12));
  return onSnapshot(paymentsQuery, (snapshot) => {
    onChange(sortNewestFirst(snapshot.docs.map((payment) => mapPremiumPayment(payment.id, payment.data()))));
  });
}

export function subscribeToPendingPremiumPayments(onChange: (payments: PremiumPaymentRequest[]) => void): Unsubscribe {
  const paymentsQuery = query(collection(db, COLLECTIONS.premiumPayments), where("status", "==", "pending"), limit(50));
  return onSnapshot(paymentsQuery, (snapshot) => {
    onChange(sortNewestFirst(snapshot.docs.map((payment) => mapPremiumPayment(payment.id, payment.data()))));
  });
}
