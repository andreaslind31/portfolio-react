"use client";

import { useEffect, useState } from "react";
import {
  Membership,
  getMembershipStatus,
  getDaysUntilExpiry,
} from "@/lib/memberships";

interface NotificationBannerProps {
  memberships: Membership[];
}

export default function NotificationBanner({
  memberships,
}: NotificationBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [notificationSent, setNotificationSent] = useState(false);

  const expiring = memberships.filter((m) => {
    const status = getMembershipStatus(m.expirationDate);
    return status === "expiring" || status === "expiring-soon";
  });

  const expired = memberships.filter(
    (m) => getMembershipStatus(m.expirationDate) === "expired"
  );

  const urgent = memberships.filter(
    (m) => getMembershipStatus(m.expirationDate) === "expiring"
  );

  // Request browser notification permission and send notifications for urgent items
  useEffect(() => {
    if (notificationSent) return;
    if (urgent.length === 0 && expired.length === 0) return;

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    if ("Notification" in window && Notification.permission === "granted") {
      const total = urgent.length + expired.length;
      const notification = new Notification("West Coast Jiu-Jitsu", {
        body: `${total} medlemskap kräver uppmärksamhet! ${expired.length} utgångna, ${urgent.length} går ut denna vecka.`,
        tag: "membership-alert",
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      setNotificationSent(true);
    }
  }, [urgent.length, expired.length, notificationSent]);

  if (dismissed || (expiring.length === 0 && expired.length === 0)) {
    return null;
  }

  return (
    <div className="notification-banner">
      <div className="notification-banner__content">
        <div className="notification-banner__icon">!</div>
        <div className="notification-banner__text">
          <strong>Medlemsaviseringar</strong>
          <span>
            {expired.length > 0 && (
              <span className="notification-banner__expired">
                {expired.length} utgångna
              </span>
            )}
            {expired.length > 0 && expiring.length > 0 && " · "}
            {expiring.length > 0 && (
              <span className="notification-banner__expiring">
                {expiring.length} går ut snart
              </span>
            )}
          </span>
          <ul className="notification-banner__list">
            {[...expired, ...urgent].slice(0, 5).map((m) => {
              const days = getDaysUntilExpiry(m.expirationDate);
              return (
                <li key={m.id}>
                  {m.name} —{" "}
                  {days < 0
                    ? `utgick för ${Math.abs(days)} dagar sedan`
                    : days === 0
                      ? "går ut idag"
                      : `går ut om ${days} dagar`}
                </li>
              );
            })}
          </ul>
        </div>
        <button
          className="notification-banner__dismiss"
          onClick={() => setDismissed(true)}
          aria-label="Stäng aviseringar"
        >
          ×
        </button>
      </div>
    </div>
  );
}
