export interface Membership {
  id: string;
  name: string;
  email: string;
  phone: string;
  beltRank: BeltRank;
  plan: MembershipPlan;
  membershipSince: string; // ISO date string (YYYY-MM-DD)
  expirationDate: string; // ISO date string (YYYY-MM-DD)
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type BeltRank = "white" | "blue" | "purple" | "brown" | "black";
export type MembershipPlan = "monthly" | "3-months" | "6-months" | "annual" | "drop-in";

export type MembershipStatus = "active" | "expiring-soon" | "expiring" | "expired";

export const BELT_RANKS: { value: BeltRank; label: string; color: string }[] = [
  { value: "white", label: "Vitt", color: "#f5f5f5" },
  { value: "blue", label: "Blått", color: "#3b82f6" },
  { value: "purple", label: "Lila", color: "#8b5cf6" },
  { value: "brown", label: "Brunt", color: "#92400e" },
  { value: "black", label: "Svart", color: "#171717" },
];

export const MEMBERSHIP_PLANS: { value: MembershipPlan; label: string }[] = [
  { value: "monthly", label: "Månadsvis" },
  { value: "3-months", label: "3 månader" },
  { value: "6-months", label: "6 månader" },
  { value: "annual", label: "Årsvis" },
  { value: "drop-in", label: "Drop-in" },
];

export function getMembershipStatus(expirationDate: string): MembershipStatus {
  const now = new Date();
  const expiry = new Date(expirationDate);
  const daysUntilExpiry = Math.ceil(
    (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilExpiry < 0) return "expired";
  if (daysUntilExpiry <= 7) return "expiring";
  if (daysUntilExpiry <= 30) return "expiring-soon";
  return "active";
}

export function getDaysUntilExpiry(expirationDate: string): number {
  const now = new Date();
  const expiry = new Date(expirationDate);
  return Math.ceil(
    (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function generateId(): string {
  return `mbr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function getStatusLabel(status: MembershipStatus): string {
  switch (status) {
    case "active":
      return "Aktivt";
    case "expiring-soon":
      return "Går ut snart";
    case "expiring":
      return "Går ut denna vecka";
    case "expired":
      return "Utgånget";
  }
}
