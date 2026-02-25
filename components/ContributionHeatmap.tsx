import { ContributionDay } from "@/lib/github";

const LEVEL_COLORS = [
  "bg-[#ebedf0] dark:bg-[#161b22]",
  "bg-[#9be9a8] dark:bg-[#0e4429]",
  "bg-[#40c463] dark:bg-[#006d32]",
  "bg-[#30a14e] dark:bg-[#26a641]",
  "bg-[#216e39] dark:bg-[#39d353]",
];

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

export default function ContributionHeatmap({
  contributions,
}: {
  contributions: ContributionDay[];
}) {
  if (contributions.length === 0) return null;

  const totalContributions = contributions.reduce((sum, d) => sum + d.count, 0);

  // Build the grid: 7 rows (Sun-Sat), columns = weeks
  // First, figure out what day of week the first date falls on
  const firstDate = new Date(contributions[0].date + "T00:00:00");
  const startDow = firstDate.getUTCDay(); // 0=Sun

  // Null-pad the beginning so the first contribution lands on the correct row
  const cells: (ContributionDay | null)[] = [];
  for (let i = 0; i < startDow; i++) {
    cells.push(null);
  }
  for (const day of contributions) {
    cells.push(day);
  }

  // Calculate total columns (weeks)
  const totalWeeks = Math.ceil(cells.length / 7);

  // Calculate month label positions, skipping labels that would overlap
  const COL_WIDTH = 18; // 14px cell + 4px gap
  const MIN_LABEL_PX = 36; // minimum pixels between labels to stay readable
  const monthPositions: { label: string; col: number }[] = [];
  let lastMonth = -1;
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (!cell) continue;
    const month = new Date(cell.date + "T00:00:00").getUTCMonth();
    if (month !== lastMonth) {
      const col = Math.floor(i / 7);
      const prevCol = monthPositions.length > 0
        ? monthPositions[monthPositions.length - 1].col
        : -Infinity;
      // Only place label if there's enough space since the last one
      if ((col - prevCol) * COL_WIDTH >= MIN_LABEL_PX) {
        monthPositions.push({ label: MONTH_LABELS[month], col });
      }
      lastMonth = month;
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Contributions
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {totalContributions.toLocaleString()} contributions in the last year
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* Month labels */}
          <div
            className="relative h-5 mb-2"
            style={{
              marginLeft: 36,
              width: totalWeeks * COL_WIDTH,
            }}
          >
            {monthPositions.map(({ label, col }) => (
              <span
                key={`${label}-${col}`}
                className="absolute text-sm text-gray-500 dark:text-gray-400"
                style={{ left: col * COL_WIDTH }}
              >
                {label}
              </span>
            ))}
          </div>

          <div className="flex">
            {/* Day-of-week labels */}
            <div
              className="grid gap-[4px] mr-2 shrink-0"
              style={{
                gridTemplateRows: "repeat(7, 14px)",
                width: 32,
              }}
            >
              {DAY_LABELS.map((label, i) => (
                <span
                  key={i}
                  className="text-xs text-gray-500 dark:text-gray-400 leading-[14px]"
                >
                  {label}
                </span>
              ))}
            </div>

            {/* Contribution grid */}
            <div
              className="grid gap-[4px]"
              style={{
                gridTemplateRows: "repeat(7, 14px)",
                gridAutoFlow: "column",
                gridAutoColumns: 14,
              }}
            >
              {cells.map((cell, i) =>
                cell ? (
                  <div
                    key={i}
                    className={`w-[14px] h-[14px] rounded-sm ${LEVEL_COLORS[cell.level]}`}
                    title={`${cell.count} contribution${cell.count !== 1 ? "s" : ""} on ${cell.date}`}
                  />
                ) : (
                  <div key={i} className="w-[14px] h-[14px]" />
                )
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-1.5 mt-3">
            <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">
              Less
            </span>
            {LEVEL_COLORS.map((color, i) => (
              <div
                key={i}
                className={`w-[14px] h-[14px] rounded-sm ${color}`}
              />
            ))}
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
              More
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
