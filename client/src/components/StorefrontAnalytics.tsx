import { useEffect } from "react";
import { useLocation } from "wouter";
import { getAnalyticsIdentity } from "@/lib/analytics";
import { trpc } from "@/lib/trpc";

export default function StorefrontAnalytics() {
  const [location] = useLocation();
  const record = trpc.analytics.record.useMutation();

  useEffect(() => {
    // Preview and test sessions must never be counted as customer traffic.
    if (!import.meta.env.PROD) return;
    if (location === "/admin") return;
    const { visitorId, sessionId } = getAnalyticsIdentity();
    record.mutate({ visitorId, sessionId, eventType: "page_view", route: location });
  }, [location]);

  return null;
}
