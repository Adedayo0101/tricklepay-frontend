// Builds a CSV export of a list of streams (the dashboard's "Export CSV"
// button — see app/page.tsx). Kept free of the DOM so it can be unit tested
// headlessly; lib/csv-download.ts turns the string this produces into an
// actual file download.
//
// Amounts go through formatAmount (BigInt-based, see lib/format.ts), never
// Number()/parseFloat, so a balance beyond Number.MAX_SAFE_INTEGER is never
// silently truncated into a float. Times go through the same exact-UTC
// formatter used everywhere else in the app (lib/timezone.ts's
// formatUtcFromUnixSeconds) rather than a locale-dependent Date string, so a
// row opened in any spreadsheet, in any timezone, reads the same instant.

import { formatAmount } from "@/lib/format";
import { formatUtcFromUnixSeconds } from "@/lib/timezone";
import type { StreamView } from "@/types/stream";

const CSV_COLUMNS = [
  "Stream ID",
  "Status",
  "Sender",
  "Recipient",
  "Token",
  "Total Amount",
  "Vested",
  "Withdrawn",
  "Withdrawable",
  "Locked",
  "Start Time (UTC)",
  "End Time (UTC)",
  "Cliff Time (UTC)",
] as const;

/**
 * Escapes one CSV field per RFC 4180: a value containing a comma, a double
 * quote, or a line break (`\n` or `\r`) is wrapped in double quotes, with
 * every double quote inside it doubled first. A value with none of those is
 * returned unchanged, so most fields in practice (ids, addresses, amounts)
 * pass straight through.
 *
 * @example
 * escapeCsvField("GABC...") // → "GABC..." (unchanged)
 * escapeCsvField("1,000")   // → "\"1,000\""
 * escapeCsvField('5" pipe') // → "\"5\"\" pipe\""
 */
export function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function streamRow(stream: StreamView): string[] {
  return [
    stream.id,
    stream.status,
    stream.sender,
    stream.recipient,
    stream.token,
    formatAmount(stream.totalAmount),
    formatAmount(stream.vested),
    formatAmount(stream.withdrawn),
    formatAmount(stream.withdrawable),
    formatAmount(stream.locked),
    formatUtcFromUnixSeconds(stream.startTime),
    formatUtcFromUnixSeconds(stream.endTime),
    formatUtcFromUnixSeconds(stream.cliffTime),
  ];
}

/**
 * Builds a complete CSV document for the given streams: a header row, then
 * one row per stream in the order given — the caller decides that order
 * (e.g. whichever streams are currently visible, already filtered). Lines
 * are joined with CRLF per RFC 4180, including a trailing CRLF after the
 * last row.
 */
export function streamsToCsv(streams: StreamView[]): string {
  const rows = [[...CSV_COLUMNS], ...streams.map(streamRow)];
  return rows.map((row) => row.map(escapeCsvField).join(",")).join("\r\n") + "\r\n";
}
