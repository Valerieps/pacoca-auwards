// The award's times are in Brasília time, with no other time zone (docs/spec/premiacao.md).
// Brasília has been UTC−3 all year since Brazil dropped daylight saving time in 2019 (ADR-010).

const OFFSET_MS = 3 * 60 * 60 * 1000;
const LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** "2026-12-01T20:00" in Brasília as a UTC ISO instant, or null when it is not a real time. */
export function fromBrasiliaLocal(local: string): string | null {
  const match = LOCAL.exec(local);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const utc = Date.UTC(year, month - 1, day, hour, minute) + OFFSET_MS;
  // Date.UTC rolls 30 February over into March; refuse instead.
  return toBrasiliaLocal(new Date(utc).toISOString()) === local ? new Date(utc).toISOString() : null;
}

/** A UTC ISO instant as "YYYY-MM-DDTHH:mm" in Brasília, the format of a datetime-local input. */
export function toBrasiliaLocal(iso: string): string {
  return new Date(Date.parse(iso) - OFFSET_MS).toISOString().slice(0, 16);
}

/** "1 de dezembro de 2026, 20:00", in Brasília. */
export function formatBrasilia(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export interface TimeLeft {
  readonly days: number;
  readonly hours: number;
  readonly minutes: number;
}

/** How long until `iso`, rounded down to the minute; null once it has passed. */
export function timeLeft(iso: string, now: Date): TimeLeft | null {
  const ms = Date.parse(iso) - now.getTime();
  if (ms <= 0) return null;
  const minutes = Math.floor(ms / 60000);
  return { days: Math.floor(minutes / 1440), hours: Math.floor((minutes % 1440) / 60), minutes: minutes % 60 };
}
