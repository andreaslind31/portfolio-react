"use client";

import {
  Membership,
  getMembershipStatus,
  getDaysUntilExpiry,
  formatDate,
  getStatusLabel,
  BELT_RANKS,
  MEMBERSHIP_PLANS,
} from "@/lib/memberships";

interface MembershipCardProps {
  membership: Membership;
  onEdit: (membership: Membership) => void;
  onDelete: (id: string) => void;
}

export default function MembershipCard({
  membership,
  onEdit,
  onDelete,
}: MembershipCardProps) {
  const status = getMembershipStatus(membership.expirationDate);
  const daysLeft = getDaysUntilExpiry(membership.expirationDate);
  const belt = BELT_RANKS.find((b) => b.value === membership.beltRank);
  const plan = MEMBERSHIP_PLANS.find((p) => p.value === membership.plan);

  return (
    <div className={`membership-card membership-card--${status}`}>
      <div className="membership-card__header">
        <div className="membership-card__identity">
          <div
            className="membership-card__belt"
            style={{ backgroundColor: belt?.color || "#ccc" }}
            title={`${belt?.label || ""} Belt`}
          />
          <div>
            <h3 className="membership-card__name">{membership.name}</h3>
            <p className="membership-card__email">{membership.email}</p>
          </div>
        </div>
        <div className={`membership-card__status membership-card__status--${status}`}>
          {getStatusLabel(status)}
        </div>
      </div>

      <div className="membership-card__details">
        <div className="membership-card__detail">
          <span className="membership-card__label">Plan</span>
          <span className="membership-card__value">{plan?.label || membership.plan}</span>
        </div>
        <div className="membership-card__detail">
          <span className="membership-card__label">Member Since</span>
          <span className="membership-card__value">
            {formatDate(membership.membershipSince)}
          </span>
        </div>
        <div className="membership-card__detail">
          <span className="membership-card__label">Expires</span>
          <span className="membership-card__value">
            {formatDate(membership.expirationDate)}
          </span>
        </div>
        <div className="membership-card__detail">
          <span className="membership-card__label">
            {daysLeft >= 0 ? "Days Left" : "Overdue"}
          </span>
          <span
            className={`membership-card__value membership-card__days--${status}`}
          >
            {daysLeft >= 0 ? daysLeft : Math.abs(daysLeft)} days
          </span>
        </div>
        {membership.phone && (
          <div className="membership-card__detail">
            <span className="membership-card__label">Phone</span>
            <span className="membership-card__value">{membership.phone}</span>
          </div>
        )}
        {membership.notes && (
          <div className="membership-card__detail membership-card__detail--full">
            <span className="membership-card__label">Notes</span>
            <span className="membership-card__value">{membership.notes}</span>
          </div>
        )}
      </div>

      <div className="membership-card__actions">
        <button
          className="membership-card__btn membership-card__btn--edit"
          onClick={() => onEdit(membership)}
        >
          Edit
        </button>
        <button
          className="membership-card__btn membership-card__btn--delete"
          onClick={() => onDelete(membership.id)}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
