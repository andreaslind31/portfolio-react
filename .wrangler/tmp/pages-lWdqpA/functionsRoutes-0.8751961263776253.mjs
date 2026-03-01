import { onRequest as __api_analytics_ts_onRequest } from "/Users/andreaslind/dev/private/portfolio-react/functions/api/analytics.ts"
import { onRequest as __api_leaderboard_ts_onRequest } from "/Users/andreaslind/dev/private/portfolio-react/functions/api/leaderboard.ts"

export const routes = [
    {
      routePath: "/api/analytics",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_analytics_ts_onRequest],
    },
  {
      routePath: "/api/leaderboard",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_leaderboard_ts_onRequest],
    },
  ]