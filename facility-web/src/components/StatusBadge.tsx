import type { FacilityStatus } from "../lib/facility";

const LABELS: Record<FacilityStatus, string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
};

export default function StatusBadge({ status }: { status: FacilityStatus }) {
  return <span className={`badge badge-${status}`}>{LABELS[status]}</span>;
}
