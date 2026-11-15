import { todayInBogota } from "./formatters";

export function fortnightEnd(period, half) {
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(period)) return "";
  const [year, month] = period.split("-").map(Number);
  const day = half === "1" ? 15 : new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${period}-${day}`;
}

export function latestClosedFortnight(today = todayInBogota()) {
  const period = today.slice(0, 7), day = Number(today.slice(8));
  if (today >= fortnightEnd(period, "2")) return { period, half: "2" };
  if (day >= 15) return { period, half: "1" };
  const [year, month] = period.split("-").map(Number);
  return { period: new Date(Date.UTC(year, month - 1, 0)).toISOString().slice(0, 7), half: "2" };
}
