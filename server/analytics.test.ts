import { describe, expect, it } from "vitest";
import { sanitizeAnalyticsInput } from "./analytics";

describe("analytics event sanitization", () => {
  it("keeps only bounded first-party event fields and normalizes search terms", () => {
    const event = sanitizeAnalyticsInput({
      visitorId: " visitor-001 ",
      sessionId: " session-001 ",
      eventType: "search",
      route: " /shop ",
      searchTerm: "  Noise Cancelling Headphones  ",
      category: " Electronics ",
    });

    expect(event).toEqual({
      visitorId: "visitor-001",
      sessionId: "session-001",
      eventType: "search",
      route: "/shop",
      searchTerm: "noise cancelling headphones",
      category: "Electronics",
    });
  });

  it("removes blank optional fields instead of storing meaningless metric labels", () => {
    const event = sanitizeAnalyticsInput({ visitorId: "visitor-002", sessionId: "session-002", eventType: "page_view", route: "" });
    expect(event.route).toBe("/");
    expect(event.category).toBeUndefined();
    expect(event.searchTerm).toBeUndefined();
  });
});
