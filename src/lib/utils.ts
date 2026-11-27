import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatWeight(kg: number): string {
  if (kg >= 1000) {
    const tons = kg / 1000;
    return `${kg.toLocaleString("en-IN")} kg (${tons.toFixed(tons % 1 === 0 ? 0 : 1)} t)`;
  }
  return `${kg.toLocaleString("en-IN")} kg`;
}

export function formatShortDate(dateString: string): string {
  try {
    const parsed = parseISO(dateString);
    return format(parsed, "dd MMM yyyy");
  } catch {
    return dateString;
  }
}

export function formatTimeShort(timeString: string): string {
  if (!timeString) return "";
  const [hoursStr, minutesStr] = timeString.split(":");
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return timeString;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${suffix}`;
}

export function formatRelativeTime(isoString: string): string {
  try {
    return formatDistanceToNow(parseISO(isoString), { addSuffix: true });
  } catch {
    return isoString;
  }
}

export function formatDistanceKm(meters: number | null | undefined): string | null {
  if (!meters || meters <= 0) return null;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}

