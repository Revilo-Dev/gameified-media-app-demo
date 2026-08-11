import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAmount(value: number, digits = 2) {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue)) return "0";
  const absValue = Math.abs(numericValue);
  const compactSuffixes: Array<[number, string]> = [
    [1_000_000_000, "B"],
    [1_000_000, "M"],
    [1_000, "K"],
  ];

  for (const [threshold, suffix] of compactSuffixes) {
    if (absValue >= threshold) {
      const compactValue = numericValue / threshold;
      const rounded = Number(compactValue.toFixed(compactValue >= 100 ? 0 : compactValue >= 10 ? Math.max(0, digits - 1) : digits));
      return `${rounded.toLocaleString("en", { maximumFractionDigits: digits })}${suffix}`;
    }
  }

  return numericValue.toLocaleString("en", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
