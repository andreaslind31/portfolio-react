"use client";

import { useEffect, useState } from "react";

interface AnalyticsData {
  pageViews: number;
  uniqueVisitors: number;
  daily: Array<{ date: string; views: number; visitors: number }>;
  topReferrers: Array<{ host: string; views: number }>;
  topPages: Array<{ path: string; views: number }>;
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function DailyChart({
  daily,
}: {
  daily: Array<{ date: string; views: number }>;
}) {
  const max = Math.max(...daily.map((d) => d.views), 1);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
        Daily Page Views
      </h2>
      <div className="flex items-end gap-[2px] h-48">
        {daily.map((d) => (
          <div
            key={d.date}
            className="flex-1 group relative"
            style={{ height: "100%" }}
          >
            <div
              className="absolute bottom-0 w-full bg-blue-500 dark:bg-blue-400 rounded-t transition-all hover:bg-blue-600 dark:hover:bg-blue-300"
              style={{
                height: `${Math.max((d.views / max) * 100, 2)}%`,
              }}
            />
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs px-2 py-1 rounded whitespace-nowrap z-10">
              {d.views} views
              <br />
              {d.date}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-xs text-gray-400 dark:text-gray-500">
        <span>{daily[0]?.date ?? ""}</span>
        <span>{daily[daily.length - 1]?.date ?? ""}</span>
      </div>
    </div>
  );
}

function ListCard({
  title,
  items,
  labelKey,
}: {
  title: string;
  items: Array<{ views: number; [key: string]: string | number }>;
  labelKey: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">
          No data yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li
              key={i}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-gray-700 dark:text-gray-300 truncate mr-4">
                {String(item[labelKey]) || "(direct)"}
              </span>
              <span className="text-gray-500 dark:text-gray-400 tabular-nums flex-shrink-0">
                {Number(item.views).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(d.error));
        return res.json();
      })
      .then((d: AnalyticsData) => setData(d))
      .catch((err) => setError(typeof err === "string" ? err : "Failed to load analytics."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="relative z-10 max-w-5xl mx-auto px-4 py-12">
      <div className="mb-8">
        <a
          href="/"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          &larr; Back to portfolio
        </a>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
          Analytics Dashboard
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Visitor stats for the last 30 days
        </p>
      </div>

      {loading && (
        <div className="text-center py-20">
          <div className="inline-block w-8 h-8 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            Loading analytics...
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <p className="text-red-600 dark:text-red-400 font-medium">
            {error}
          </p>
          <p className="text-sm text-red-500 dark:text-red-400/80 mt-2">
            Analytics requires Cloudflare environment variables to be
            configured.
          </p>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard label="Page Views" value={data.pageViews} />
            <StatCard label="Unique Visitors" value={data.uniqueVisitors} />
          </div>

          {data.daily.length > 0 && <DailyChart daily={data.daily} />}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ListCard
              title="Top Referrers"
              items={data.topReferrers}
              labelKey="host"
            />
            <ListCard
              title="Top Pages"
              items={data.topPages}
              labelKey="path"
            />
          </div>
        </div>
      )}
    </main>
  );
}
