interface Env {
  CF_API_TOKEN: string;
  CF_ACCOUNT_TAG: string;
  CF_SITE_TAG: string;
}

interface GraphQLResponse {
  data?: {
    viewer: {
      accounts: Array<{
        rumPageloadEventsAdaptiveGroups: Array<{
          count: number;
          dimensions: {
            date?: string;
            refererHost?: string;
            requestPath?: string;
          };
          sum: {
            visits: number;
          };
        }>;
      }>;
    };
  };
  errors?: Array<{ message: string }>;
}

const GRAPHQL_ENDPOINT = "https://api.cloudflare.com/client/v4/graphql";

async function queryAnalytics(
  token: string,
  accountTag: string,
  siteTag: string
): Promise<{
  pageViews: number;
  uniqueVisitors: number;
  daily: Array<{ date: string; views: number; visitors: number }>;
  topReferrers: Array<{ host: string; views: number }>;
  topPages: Array<{ path: string; views: number }>;
}> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dateStart = thirtyDaysAgo.toISOString().split("T")[0];
  const dateEnd = now.toISOString().split("T")[0];

  const filter = {
    AND: [
      { datetime_geq: `${dateStart}T00:00:00Z` },
      { datetime_leq: `${dateEnd}T23:59:59Z` },
      { siteTag: siteTag },
    ],
  };

  // Fetch all three queries in parallel
  const [totalsRes, dailyRes, referrersRes, pagesRes] = await Promise.all([
    // Totals
    fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `query {
          viewer {
            accounts(filter: { accountTag: "${accountTag}" }) {
              rumPageloadEventsAdaptiveGroups(filter: ${JSON.stringify(filter)}, limit: 1) {
                count
                sum { visits }
              }
            }
          }
        }`,
      }),
    }),
    // Daily breakdown
    fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `query {
          viewer {
            accounts(filter: { accountTag: "${accountTag}" }) {
              rumPageloadEventsAdaptiveGroups(filter: ${JSON.stringify(filter)}, limit: 31, orderBy: [date_ASC]) {
                count
                dimensions { date }
                sum { visits }
              }
            }
          }
        }`,
      }),
    }),
    // Top referrers
    fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `query {
          viewer {
            accounts(filter: { accountTag: "${accountTag}" }) {
              rumPageloadEventsAdaptiveGroups(filter: ${JSON.stringify(filter)}, limit: 10, orderBy: [count_DESC]) {
                count
                dimensions { refererHost }
                sum { visits }
              }
            }
          }
        }`,
      }),
    }),
    // Top pages
    fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `query {
          viewer {
            accounts(filter: { accountTag: "${accountTag}" }) {
              rumPageloadEventsAdaptiveGroups(filter: ${JSON.stringify(filter)}, limit: 10, orderBy: [count_DESC]) {
                count
                dimensions { requestPath }
                sum { visits }
              }
            }
          }
        }`,
      }),
    }),
  ]);

  const [totals, daily, referrers, pages]: GraphQLResponse[] =
    await Promise.all([
      totalsRes.json(),
      dailyRes.json(),
      referrersRes.json(),
      pagesRes.json(),
    ]);

  const totalsData =
    totals.data?.viewer.accounts[0]?.rumPageloadEventsAdaptiveGroups[0];
  const dailyData =
    daily.data?.viewer.accounts[0]?.rumPageloadEventsAdaptiveGroups ?? [];
  const referrersData =
    referrers.data?.viewer.accounts[0]?.rumPageloadEventsAdaptiveGroups ?? [];
  const pagesData =
    pages.data?.viewer.accounts[0]?.rumPageloadEventsAdaptiveGroups ?? [];

  return {
    pageViews: totalsData?.count ?? 0,
    uniqueVisitors: totalsData?.sum.visits ?? 0,
    daily: dailyData.map((d) => ({
      date: d.dimensions.date ?? "",
      views: d.count,
      visitors: d.sum.visits,
    })),
    topReferrers: referrersData
      .filter((r) => r.dimensions.refererHost)
      .map((r) => ({
        host: r.dimensions.refererHost!,
        views: r.count,
      })),
    topPages: pagesData
      .filter((p) => p.dimensions.requestPath)
      .map((p) => ({
        path: p.dimensions.requestPath!,
        views: p.count,
      })),
  };
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { CF_API_TOKEN, CF_ACCOUNT_TAG, CF_SITE_TAG } = context.env;

  if (!CF_API_TOKEN || !CF_ACCOUNT_TAG || !CF_SITE_TAG) {
    return new Response(
      JSON.stringify({
        error: "Analytics not configured. Set CF_API_TOKEN, CF_ACCOUNT_TAG, and CF_SITE_TAG environment variables.",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const data = await queryAnalytics(CF_API_TOKEN, CF_ACCOUNT_TAG, CF_SITE_TAG);
    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch analytics data." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
