import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const STAGE_LABELS: Record<string, string> = {
  booked: "Booked",
  researched: "Researched",
  call_complete: "Call Complete",
  writing_analyzed: "Writing Analyzed",
  draft_ready: "Draft Ready",
  in_review: "In Review",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
  complete: "Complete",
};

export const STAGE_COLORS: Record<string, string> = {
  booked: "bg-gray-100 text-gray-800",
  researched: "bg-blue-100 text-blue-800",
  call_complete: "bg-indigo-100 text-indigo-800",
  writing_analyzed: "bg-purple-100 text-purple-800",
  draft_ready: "bg-yellow-100 text-yellow-800",
  in_review: "bg-orange-100 text-orange-800",
  approved: "bg-green-100 text-green-800",
  scheduled: "bg-teal-100 text-teal-800",
  published: "bg-emerald-100 text-emerald-800",
  complete: "bg-gray-200 text-gray-600",
};

export const GIFT_STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  ordered: "Ordered",
  shipped: "Shipped",
  delivered: "Delivered",
};

export const STAGES_ORDER = [
  "booked",
  "researched",
  "call_complete",
  "writing_analyzed",
  "draft_ready",
  "in_review",
  "approved",
  "scheduled",
  "published",
  "complete",
] as const;

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function daysInStage(updatedAt: Date | string): number {
  const now = new Date();
  const updated = new Date(updatedAt);
  return Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
}
