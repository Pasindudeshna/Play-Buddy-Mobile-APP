/** A player earns one point per matched game once its ground is successfully booked (see netlify/functions/_shared/payments.ts). */
export const TIERS = [
  { name: "Bronze", min: 0 },
  { name: "Silver", min: 10 },
  { name: "Gold", min: 25 },
  { name: "Platinum", min: 50 },
] as const;

export type TierProgress = {
  tier: string;
  nextTier: string | null;
  pointsIntoTier: number;
  pointsForNextTier: number | null;
  progress: number;
};

/** Resolves a points total into its current tier and progress toward the next one. */
export function getTierProgress(points: number): TierProgress {
  let currentIndex = 0;
  for (let i = 0; i < TIERS.length; i++) {
    if (points >= TIERS[i].min) currentIndex = i;
  }

  const current = TIERS[currentIndex];
  const next = TIERS[currentIndex + 1] ?? null;

  return {
    tier: current.name,
    nextTier: next?.name ?? null,
    pointsIntoTier: points - current.min,
    pointsForNextTier: next ? next.min - current.min : null,
    progress: next ? (points - current.min) / (next.min - current.min) : 1,
  };
}
