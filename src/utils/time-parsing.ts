/**
 * Parse time input in JIRA-style format:
 * - "30" or "30m" = 30 minutes
 * - "2h" = 2 hours = 120 minutes
 * - "2h 30m" = 2 hours 30 minutes = 150 minutes
 * Returns undefined if input is invalid
 */
export function parseTimeInput(input: string): number | undefined {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return undefined;

  // Pattern: optional hours, optional minutes
  // e.g., "2h", "30m", "2h 30m", "2h30m", or just "30"
  const match = trimmed.match(/^(?:(\d+)h)?\s*(?:(\d+)m?)?$/);
  if (!match) return undefined;

  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const mins = match[2] ? parseInt(match[2], 10) : 0;

  // If just a plain number with no h/m suffix, treat as minutes
  if (!trimmed.includes('h') && !trimmed.includes('m')) {
    const plainNumber = parseInt(trimmed, 10);
    if (!isNaN(plainNumber) && plainNumber > 0) {
      return plainNumber;
    }
    return undefined;
  }

  const total = hours * 60 + mins;
  return total > 0 ? total : undefined;
}
