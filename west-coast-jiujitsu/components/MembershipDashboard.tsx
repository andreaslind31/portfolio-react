"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Membership,
  MembershipStatus,
  getMembershipStatus,
  getDaysUntilExpiry,
} from "@/lib/memberships";
import MembershipCard from "./MembershipCard";
import MembershipForm from "./MembershipForm";
import NotificationBanner from "./NotificationBanner";

type SortField = "name" | "expirationDate" | "membershipSince" | "beltRank";
type SortDir = "asc" | "desc";
type FilterStatus = "all" | MembershipStatus;

const API_BASE = "/api/memberships";

export default function MembershipDashboard() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingMembership, setEditingMembership] = useState<Membership | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sortField, setSortField] = useState<SortField>("expirationDate");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchMemberships = useCallback(async () => {
    try {
      setError("");
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error("Failed to fetch memberships");
      const data = await res.json();
      setMemberships(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load memberships");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemberships();
  }, [fetchMemberships]);

  async function handleCreate(
    data: Omit<Membership, "id" | "createdAt" | "updatedAt">
  ) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create membership");
      }
      await fetchMemberships();
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(
    data: Omit<Membership, "id" | "createdAt" | "updatedAt">
  ) {
    if (!editingMembership) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(API_BASE, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, id: editingMembership.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update membership");
      }
      await fetchMemberships();
      setEditingMembership(null);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      return;
    }
    setError("");
    try {
      const res = await fetch(`${API_BASE}?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete membership");
      }
      await fetchMemberships();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleteConfirm(null);
    }
  }

  function handleEdit(membership: Membership) {
    setEditingMembership(membership);
    setShowForm(true);
  }

  // Filter and sort
  const filtered = memberships
    .filter((m) => {
      if (filterStatus !== "all" && getMembershipStatus(m.expirationDate) !== filterStatus)
        return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          (m.phone && m.phone.includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "expirationDate":
          cmp = getDaysUntilExpiry(a.expirationDate) - getDaysUntilExpiry(b.expirationDate);
          break;
        case "membershipSince":
          cmp = new Date(a.membershipSince).getTime() - new Date(b.membershipSince).getTime();
          break;
        case "beltRank": {
          const order = ["white", "blue", "purple", "brown", "black"];
          cmp = order.indexOf(a.beltRank) - order.indexOf(b.beltRank);
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

  // Stats
  const stats = {
    total: memberships.length,
    active: memberships.filter(
      (m) => getMembershipStatus(m.expirationDate) === "active"
    ).length,
    expiringSoon: memberships.filter((m) => {
      const s = getMembershipStatus(m.expirationDate);
      return s === "expiring-soon" || s === "expiring";
    }).length,
    expired: memberships.filter(
      (m) => getMembershipStatus(m.expirationDate) === "expired"
    ).length,
  };

  if (loading) {
    return (
      <div className="membership-loading">
        <div className="membership-loading__spinner" />
        <p>Loading memberships...</p>
      </div>
    );
  }

  return (
    <div className="membership-dashboard">
      <NotificationBanner memberships={memberships} />

      {/* Stats */}
      <div className="membership-stats">
        <div className="membership-stats__card membership-stats__card--total">
          <span className="membership-stats__number">{stats.total}</span>
          <span className="membership-stats__label">Total Members</span>
        </div>
        <div className="membership-stats__card membership-stats__card--active">
          <span className="membership-stats__number">{stats.active}</span>
          <span className="membership-stats__label">Active</span>
        </div>
        <div className="membership-stats__card membership-stats__card--warning">
          <span className="membership-stats__number">{stats.expiringSoon}</span>
          <span className="membership-stats__label">Expiring Soon</span>
        </div>
        <div className="membership-stats__card membership-stats__card--danger">
          <span className="membership-stats__number">{stats.expired}</span>
          <span className="membership-stats__label">Expired</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="membership-toolbar">
        <div className="membership-toolbar__left">
          <input
            type="text"
            className="membership-toolbar__search"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="membership-toolbar__filter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="expiring-soon">Expiring Soon</option>
            <option value="expiring">Expiring This Week</option>
            <option value="expired">Expired</option>
          </select>
          <select
            className="membership-toolbar__sort"
            value={`${sortField}-${sortDir}`}
            onChange={(e) => {
              const [field, dir] = e.target.value.split("-") as [SortField, SortDir];
              setSortField(field);
              setSortDir(dir);
            }}
          >
            <option value="expirationDate-asc">Expiration (Soonest)</option>
            <option value="expirationDate-desc">Expiration (Latest)</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="membershipSince-asc">Member Since (Oldest)</option>
            <option value="membershipSince-desc">Member Since (Newest)</option>
            <option value="beltRank-asc">Belt (White to Black)</option>
            <option value="beltRank-desc">Belt (Black to White)</option>
          </select>
        </div>
        <button
          className="membership-toolbar__add-btn"
          onClick={() => {
            setEditingMembership(null);
            setShowForm(true);
          }}
        >
          + Add Member
        </button>
      </div>

      {error && (
        <div className="membership-error">
          {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="membership-empty">
          {memberships.length === 0 ? (
            <>
              <p className="membership-empty__title">No members yet</p>
              <p>Click &quot;+ Add Member&quot; to get started tracking your gym memberships.</p>
            </>
          ) : (
            <p>No members match your search or filter criteria.</p>
          )}
        </div>
      ) : (
        <div className="membership-grid">
          {filtered.map((m) => (
            <MembershipCard
              key={m.id}
              membership={m}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <MembershipForm
          membership={editingMembership}
          onSubmit={editingMembership ? handleUpdate : handleCreate}
          onCancel={() => {
            setShowForm(false);
            setEditingMembership(null);
          }}
          isLoading={saving}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div
          className="membership-form-overlay"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="membership-delete-confirm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Confirm Delete</h3>
            <p>
              Are you sure you want to remove{" "}
              <strong>
                {memberships.find((m) => m.id === deleteConfirm)?.name}
              </strong>
              ?
            </p>
            <div className="membership-delete-confirm__actions">
              <button
                className="membership-form__btn membership-form__btn--cancel"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="membership-form__btn membership-form__btn--delete"
                onClick={() => handleDelete(deleteConfirm)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
