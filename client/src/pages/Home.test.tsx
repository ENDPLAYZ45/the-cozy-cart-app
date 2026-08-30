// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { brandSpotlights } from "@/lib/brandSpotlight";

vi.mock("@/components/StoreLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("wouter", () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => <a href={href} {...props}>{children}</a>,
}));

import Home from "./Home";

describe("homepage brand spotlight", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T12:00:00Z"));
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    class DecodedImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) { queueMicrotask(() => this.onload?.()); }
      get complete() { return false; }
      decode() { return Promise.resolve(); }
    }
    vi.stubGlobal("Image", DecodedImage);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("preloads product visuals and rotates featured products without exposing schedule details", async () => {
    render(<Home />);
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole("heading", { name: brandSpotlights[0].title })).toBeTruthy();
    expect(screen.queryByText("Changes every 2 days")).toBeNull();
    expect(screen.queryByText(/Featured through the next window/i)).toBeNull();
    expect(screen.queryByRole("link", { name: /admin sign in/i })).toBeNull();
    act(() => vi.advanceTimersByTime(7000));
    expect(screen.getByRole("heading", { name: brandSpotlights[1].title })).toBeTruthy();
  });
});
