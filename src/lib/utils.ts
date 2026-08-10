import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAmount(value: number, digits = 2) {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue)) return "0";
  if (Math.abs(numericValue) >= 1_000_000) {
    return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: digits }).format(numericValue);
  }
  return numericValue.toLocaleString("en", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
