/** Public attribution: first name plus last initial. */
export function formatReviewDisplayName(firstName: string, lastName: string): string {
  const first = firstName.trim();
  const last = lastName.trim();
  if (!first && !last) return 'Viajero';
  if (!last) return first;
  return `${first} ${last[0]!.toUpperCase()}.`;
}
