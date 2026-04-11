"use client";

import { useState, useEffect } from "react";
import {
  Membership,
  BeltRank,
  MembershipPlan,
  BELT_RANKS,
  MEMBERSHIP_PLANS,
} from "@/lib/memberships";

interface MembershipFormProps {
  membership?: Membership | null;
  onSubmit: (data: Omit<Membership, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function MembershipForm({
  membership,
  onSubmit,
  onCancel,
  isLoading,
}: MembershipFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [beltRank, setBeltRank] = useState<BeltRank>("white");
  const [plan, setPlan] = useState<MembershipPlan>("monthly");
  const [membershipSince, setMembershipSince] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (membership) {
      setName(membership.name);
      setEmail(membership.email);
      setPhone(membership.phone || "");
      setBeltRank(membership.beltRank);
      setPlan(membership.plan);
      setMembershipSince(membership.membershipSince);
      setExpirationDate(membership.expirationDate);
      setNotes(membership.notes || "");
    }
  }, [membership]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Valid email is required");
      return;
    }
    if (!membershipSince) {
      setError("Membership since date is required");
      return;
    }
    if (!expirationDate) {
      setError("Expiration date is required");
      return;
    }

    onSubmit({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      beltRank,
      plan,
      membershipSince,
      expirationDate,
      notes: notes.trim(),
    });
  }

  return (
    <div className="membership-form-overlay" onClick={onCancel}>
      <div
        className="membership-form"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="membership-form__title">
          {membership ? "Edit Member" : "Add New Member"}
        </h2>

        <form onSubmit={handleSubmit}>
          {error && <div className="membership-form__error">{error}</div>}

          <div className="membership-form__grid">
            <div className="membership-form__field">
              <label htmlFor="mbr-name">Full Name *</label>
              <input
                id="mbr-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                maxLength={100}
                required
              />
            </div>

            <div className="membership-form__field">
              <label htmlFor="mbr-email">Email *</label>
              <input
                id="mbr-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                required
              />
            </div>

            <div className="membership-form__field">
              <label htmlFor="mbr-phone">Phone</label>
              <input
                id="mbr-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="membership-form__field">
              <label htmlFor="mbr-belt">Belt Rank *</label>
              <select
                id="mbr-belt"
                value={beltRank}
                onChange={(e) => setBeltRank(e.target.value as BeltRank)}
              >
                {BELT_RANKS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="membership-form__field">
              <label htmlFor="mbr-plan">Plan *</label>
              <select
                id="mbr-plan"
                value={plan}
                onChange={(e) => setPlan(e.target.value as MembershipPlan)}
              >
                {MEMBERSHIP_PLANS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="membership-form__field">
              <label htmlFor="mbr-since">Member Since *</label>
              <input
                id="mbr-since"
                type="date"
                value={membershipSince}
                onChange={(e) => setMembershipSince(e.target.value)}
                required
              />
            </div>

            <div className="membership-form__field">
              <label htmlFor="mbr-expires">Expiration Date *</label>
              <input
                id="mbr-expires"
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                required
              />
            </div>

            <div className="membership-form__field membership-form__field--full">
              <label htmlFor="mbr-notes">Notes</label>
              <textarea
                id="mbr-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
          </div>

          <div className="membership-form__actions">
            <button
              type="button"
              className="membership-form__btn membership-form__btn--cancel"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="membership-form__btn membership-form__btn--submit"
              disabled={isLoading}
            >
              {isLoading
                ? "Saving..."
                : membership
                  ? "Update Member"
                  : "Add Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
