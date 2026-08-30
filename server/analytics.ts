export type AnalyticsEventInput = {
  visitorId: string;
  sessionId: string;
  eventType: "page_view" | "search" | "category_interest";
  route: string;
  category?: string;
  searchTerm?: string;
};

export function sanitizeAnalyticsInput(input: AnalyticsEventInput): AnalyticsEventInput {
  return {
    visitorId: input.visitorId.trim().slice(0, 64),
    sessionId: input.sessionId.trim().slice(0, 64),
    eventType: input.eventType,
    route: input.route.trim().slice(0, 128) || "/",
    category: input.category?.trim().slice(0, 100) || undefined,
    searchTerm: input.searchTerm?.trim().toLowerCase().slice(0, 100) || undefined,
  };
}

function getFirebaseConfig() {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  const apiKey = process.env.VITE_FIREBASE_API_KEY;
  if (!projectId || !apiKey) return null;
  return { projectId, apiKey };
}

export async function recordAnalyticsEvent(input: AnalyticsEventInput) {
  const config = getFirebaseConfig();
  if (!config) return { stored: false } as const;

  const event = sanitizeAnalyticsInput(input);
  const { projectId, apiKey } = config;

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/analytics_events?key=${apiKey}`;

  const fields: any = {
    visitorId: { stringValue: event.visitorId },
    sessionId: { stringValue: event.sessionId },
    eventType: { stringValue: event.eventType },
    route: { stringValue: event.route },
    timestamp: { integerValue: String(Date.now()) },
  };

  if (event.category) fields.category = { stringValue: event.category };
  if (event.searchTerm) fields.searchTerm = { stringValue: event.searchTerm };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
    if (!res.ok) console.error("Failed to record analytics", await res.text());
  } catch (err) {
    console.error("Failed to push analytics event", err);
  }

  return { stored: true } as const;
}

export async function getAnalyticsSummary() {
  const config = getFirebaseConfig();
  if (!config) return { available: false };

  const { projectId, apiKey } = config;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/analytics_events?pageSize=5000&key=${apiKey}`;

  let documents: any[] = [];
  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      documents = data.documents || [];
    }
  } catch (err) {
    console.error("Failed to fetch analytics summary", err);
  }

  const events = documents.map((doc: any) => {
    const f = doc.fields || {};
    return {
      visitorId: f.visitorId?.stringValue,
      sessionId: f.sessionId?.stringValue,
      eventType: f.eventType?.stringValue,
      route: f.route?.stringValue,
      category: f.category?.stringValue,
      searchTerm: f.searchTerm?.stringValue,
      timestamp: Number(f.timestamp?.integerValue) || new Date(doc.createTime).getTime(),
    };
  });

  const now = Date.now();
  const activeSince = now - 5 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  let totalPageViews = 0;
  const visitors = new Set<string>();
  const sessions = new Set<string>();
  const activeVisitors = new Set<string>();
  const visitorSessions: Record<string, Set<string>> = {};
  
  const categoryCount: Record<string, number> = {};
  const searchCount: Record<string, number> = {};
  const pageCount: Record<string, number> = {};
  
  const sessionPageViews: Record<string, number> = {};
  const hourlyCount: Record<number, number> = {};
  const dailyCount: Record<string, { visitors: Set<string>; pageViews: number }> = {};

  for (const ev of events) {
    if (!ev.visitorId || !ev.sessionId) continue;
    
    visitors.add(ev.visitorId);
    sessions.add(ev.sessionId);
    
    if (!visitorSessions[ev.visitorId]) visitorSessions[ev.visitorId] = new Set();
    visitorSessions[ev.visitorId].add(ev.sessionId);

    if (ev.timestamp >= activeSince) {
      activeVisitors.add(ev.visitorId);
    }

    if (ev.timestamp >= sevenDaysAgo) {
      const dateStr = new Date(ev.timestamp).toISOString().split("T")[0];
      if (!dailyCount[dateStr]) dailyCount[dateStr] = { visitors: new Set(), pageViews: 0 };
      dailyCount[dateStr].visitors.add(ev.visitorId);

      const hour = new Date(ev.timestamp).getHours();
      hourlyCount[hour] = (hourlyCount[hour] || 0) + 1;
    }

    if (ev.eventType === "page_view") {
      totalPageViews++;
      sessionPageViews[ev.sessionId] = (sessionPageViews[ev.sessionId] || 0) + 1;
      
      const route = ev.route || "/";
      pageCount[route] = (pageCount[route] || 0) + 1;
      
      if (ev.timestamp >= sevenDaysAgo) {
        const dateStr = new Date(ev.timestamp).toISOString().split("T")[0];
        if (dailyCount[dateStr]) dailyCount[dateStr].pageViews++;
      }
    } else if (ev.eventType === "category_interest" && ev.category) {
      categoryCount[ev.category] = (categoryCount[ev.category] || 0) + 1;
    } else if (ev.eventType === "search" && ev.searchTerm) {
      searchCount[ev.searchTerm] = (searchCount[ev.searchTerm] || 0) + 1;
    }
  }

  let returningCount = 0;
  for (const v in visitorSessions) {
    if (visitorSessions[v].size > 1) returningCount++;
  }

  const newCount = Math.max(0, visitors.size - returningCount);

  let bouncedSessions = 0;
  for (const s in sessionPageViews) {
    if (sessionPageViews[s] === 1) bouncedSessions++;
  }
  const bounceRate = sessions.size > 0 ? Math.round((bouncedSessions / sessions.size) * 100) : 0;
  const avgSessionDepth = sessions.size > 0 ? Math.round((totalPageViews / sessions.size) * 10) / 10 : 0;

  const sortedCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]).map(x => ({ label: x[0], count: x[1] }));
  const sortedSearches = Object.entries(searchCount).sort((a, b) => b[1] - a[1]).map(x => ({ label: x[0], count: x[1] }));
  const sortedPages = Object.entries(pageCount).sort((a, b) => b[1] - a[1]).map(x => ({ label: x[0], count: x[1] }));

  const trafficLast7Days = Object.entries(dailyCount)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, stats]) => ({
      date,
      visitors: stats.visitors.size,
      pageViews: stats.pageViews,
    }));

  return {
    available: true,
    totalVisitors: visitors.size,
    totalVisits: sessions.size,
    totalPageViews,
    returningVisitors: returningCount,
    activeVisitors: activeVisitors.size,
    topCategory: sortedCategories[0] || null,
    topSearch: sortedSearches[0] || null,
    categoryInterest: sortedCategories.slice(0, 6),
    topPages: sortedPages.slice(0, 8),
    recentSearches: sortedSearches.slice(0, 10),
    hourlyTraffic: Array.from({ length: 24 }).map((_, hour) => ({ hour, count: hourlyCount[hour] || 0 })),
    bounceRate,
    avgSessionDepth,
    newVsReturning: { new: newCount, returning: returningCount },
    trafficLast7Days,
  };
}
