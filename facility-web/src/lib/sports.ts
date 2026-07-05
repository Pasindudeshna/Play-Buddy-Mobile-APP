/**
 * Must stay in sync with app/(auth)/registration/SignupSports.tsx's SPORTS
 * list and functions/src/venues.ts's SPORT_KEYWORDS keys.
 */
export const SPORTS = [
  { id: "badminton", label: "Badminton", emoji: "🏸" },
  { id: "table_tennis", label: "Table Tennis", emoji: "🏓" },
  { id: "tennis", label: "Tennis", emoji: "🎾" },
  { id: "cricket", label: "Cricket", emoji: "🏏" },
  { id: "football", label: "Football", emoji: "⚽" },
  { id: "basketball", label: "Basketball", emoji: "🏀" },
  { id: "volleyball", label: "Volleyball", emoji: "🏐" },
  { id: "swimming", label: "Swimming", emoji: "🏊" },
] as const;

export type SportId = (typeof SPORTS)[number]["id"];
