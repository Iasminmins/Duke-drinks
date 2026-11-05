import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = "") {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${prefix}${Date.now().toString(36)}${rnd}`;
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}
