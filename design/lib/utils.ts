// lib/utils.ts — 沿用原專案 cn helper（如已存在則跳過）
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
