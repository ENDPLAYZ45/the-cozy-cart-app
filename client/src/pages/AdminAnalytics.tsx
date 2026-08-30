import React, { useMemo, useState, useEffect } from "react";
import {
  Activity, ArrowLeft, BarChart2, Clock, Hash, LogOut, CircleAlert,
  MousePointer2, ShieldCheck, TrendingDown, TrendingUp, Users,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const ACCENT  = "#7c3aed";
const BLUE    = "#2563eb";
const CYAN    = "#0891b2";
const GREEN   = "#059669";
const AMBER   = "#d97706";
const ROSE    = "#e11d48";
const CHART   = "#818cf8";
const BG      = "#09090b";
const SURFACE = "#111113";
const BORDER  = "rgba(255,255,255,0.07)";
const MUTED   = "#52525b";
const TEXT    = "#e4e4e7";
const SUBTEXT = "#71717a";

const CATS = [
  { fill: "#7c3aed", light: "rgba(124,58,237,0.12)" },
  { fill: "#2563eb", light: "rgba(37,99,235,0.12)" },
  { fill: "#0891b2", light: "rgba(8,145,178,0.12)" },
  { fill: "#059669", light: "rgba(5,150,105,0.12)" },
  { fill: "#d97706", light: "rgba(217,119,6,0.12)" },
  { fill: "#e11d48", light: "rgba(225,29,72,0.12)" },
];

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: SURFACE, border: "1px solid " + BORDER, borderRadius: 16, ...style }}>{children}</div>;
}

function AreaChart({ data, metric }: { data: any[]; metric: "visitors" | "pageViews" }) {
  if (!data.length) return <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: SUBTEXT, fontSize: 13 }}>No data yet</div>;
  const vals: number[] = data.map((d: any) => Number(d[metric]));
  const max = Math.max(...vals, 1);
  const W = 800; const H = 100;
  const pts: [number, number][] = vals.map((v, i) => [data.length > 1 ? (i / (data.length - 1)) * W : W / 2, H - (v / max) * (H - 8) - 4]);
  const pathD = pts.map(([x, y], i) => (i === 0 ? "M" : "L") + x + "," + y).join(" ");
  const areaD = "M" + pts[0][0] + "," + H + " " + pathD + " L" + pts[pts.length - 1][0] + "," + H + "Z";
  const peakIdx = vals.indexOf(Math.max(...vals));
  const [px, py] = pts[peakIdx] || [0, 0];
  return (
    <div>
      <svg viewBox={"0 0 " + W + " " + H} style={{ width: "100%", height: 130, overflow: "visible", display: "block" }} preserveAspectRatio="none">
        <defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CHART} stopOpacity=".2" /><stop offset="100%" stopColor={CHART} stopOpacity="0" /></linearGradient></defs>
        {[25, 50, 75].map(p => { const y = H - (p / 100) * (H - 8) - 4; return <line key={p} x1={0} y1={y} x2={W} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />; })}
        <path d={areaD} fill="url(#areaGrad)" />
        <path d={pathD} fill="none" stroke={CHART} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={3} fill={CHART} opacity={0.7} />)}
        <circle cx={px} cy={py} r={5} fill={CHART} /><circle cx={px} cy={py} r={10} fill={CHART} opacity={0.15} />
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 2px 0" }}>
        {data.map((d: any, i: number) => { const dt = new Date(d.date); const show = i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 5) === 0; return show ? <span key={i} style={{ fontSize: 10, color: SUBTEXT }}>{(dt.getMonth() + 1) + "/" + dt.getDate()}</span> : <span key={i} />; })}
      </div>
    </div>
  );
}

function HourlyBars({ data }: { data: { hour: number; count: number }[] }) {
  const map: Record<number, number> = {};
  data.forEach(d => { map[d.hour] = d.count; });
  const maxV = Math.max(...Object.values(map), 1);
  const peakEntry = Object.entries(map).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  const peakHour = peakEntry ? Number(peakEntry[0]) : -1;
  const lbl = (h: number) => h === 0 ? "12a" : h < 12 ? h + "a" : h === 12 ? "12p" : (h - 12) + "p";
  return (
    <div>
      {peakEntry && <p style={{ fontSize: 12, color: SUBTEXT, margin: "0 0 12px" }}>Peak at <span style={{ color: TEXT, fontWeight: 600 }}>{lbl(peakHour)}</span> · <span style={{ color: CHART, fontWeight: 600 }}>{Number(peakEntry[1]).toLocaleString()}</span> sessions</p>}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 64 }}>
        {Array.from({ length: 24 }, (_, h) => { const v = map[h] || 0; const pct = v / maxV; const isPeak = h === peakHour; return <div key={h} title={lbl(h) + ": " + v + " sessions"} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}><div style={{ width: "100%", height: Math.max(3, pct * 56), background: isPeak ? CHART : "rgba(129,140,248," + (0.15 + pct * 0.5) + ")", borderRadius: "2px 2px 0 0" }} /></div>; })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>{["12a", "6a", "12p", "6p", "11p"].map(l => <span key={l} style={{ fontSize: 9, color: SUBTEXT }}>{l}</span>)}</div>
    </div>
  );
}

function CategoryBreakdown({ categories }: { categories: { label: string; count: number }[] }) {
  const total = categories.reduce((s, c) => s + c.count, 0) || 1;
  const top = categories.slice(0, 6);
  let cum = 0;
  const segs = top.map((cat, i) => { const pct = (cat.count / total) * 100; const s = (CATS[i]?.fill || MUTED) + " " + cum.toFixed(2) + "% " + (cum + pct).toFixed(2) + "%"; cum += pct; return s; });
  if (cum < 100) segs.push(MUTED + " " + cum.toFixed(2) + "% 100%");
  const conicBg = "conic-gradient(" + segs.join(", ") + ")";
  return (
    <div style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>
      <div style={{ flexShrink: 0, position: "relative", width: 170, height: 170 }}>
        <div style={{ width: 170, height: 170, borderRadius: "50%", background: conicBg, mask: "radial-gradient(circle at 50%, transparent 44%, black 45%)", WebkitMask: "radial-gradient(circle at 50%, transparent 44%, black 45%)" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: TEXT }}>{top.length}</span>
          <span style={{ fontSize: 11, color: SUBTEXT }}>categories</span>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 13 }}>
        {top.map((cat, i) => {
          const pct = ((cat.count / total) * 100).toFixed(1);
          const barW = Math.round((cat.count / total) * 100);
          const pal = CATS[i] || { fill: MUTED, light: "#33333320" };
          return (
            <div key={cat.label}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: pal.fill, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: TEXT, fontWeight: i === 0 ? 600 : 400 }}>{cat.label}</span>
                  {i === 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", background: pal.light, color: pal.fill, borderRadius: 4 }}>#1</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontSize: 12, color: SUBTEXT }}>{cat.count.toLocaleString()} visits</span>
                  <span style={{ fontSize: 17, fontWeight: 800, color: pal.fill, minWidth: 52, textAlign: "right" }}>{pct}%</span>
                </div>
              </div>
              <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}><div style={{ height: "100%", width: barW + "%", background: pal.fill, borderRadius: 99, transition: "width 0.8s cubic-bezier(.4,0,.2,1)" }} /></div>
            </div>
          );
        })}
        <div style={{ paddingTop: 12, borderTop: "1px solid " + BORDER }}><span style={{ fontSize: 12, color: MUTED }}>Total: <span style={{ color: SUBTEXT, fontWeight: 600 }}>{total.toLocaleString()}</span> category visits</span></div>
      </div>
    </div>
  );
}

function PageList({ pages }: { pages: { label: string; count: number }[] }) {
  const total = pages.reduce((s, p) => s + p.count, 0) || 1;
  return (
    <div>
      <div style={{ display: "flex", padding: "0 0 10px", borderBottom: "1px solid " + BORDER }}>
        <span style={{ flex: 1, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: MUTED }}>Page</span>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: MUTED, minWidth: 52, textAlign: "right" }}>Views</span>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: MUTED, minWidth: 44, textAlign: "right" }}>Share</span>
      </div>
      {pages.slice(0, 8).map((page, i) => {
        const pct = ((page.count / total) * 100).toFixed(1);
        const barW = Math.round((page.count / total) * 100);
        const lbl = page.label === "/" ? "Home" : page.label.replace(/^\//, "").replace(/-/g, " ").replace(/\//g, " › ");
        return (
          <div key={page.label} style={{ position: "relative", padding: "10px 0", borderBottom: "1px solid " + BORDER, overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, width: barW + "%", background: "rgba(129,140,248,0.06)", borderRadius: 4, pointerEvents: "none" }} />
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, color: MUTED, minWidth: 18 }}>{i + 1}</span>
              <span style={{ fontSize: 13, color: TEXT, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lbl}</span>
              <span style={{ fontSize: 12, color: SUBTEXT, minWidth: 52, textAlign: "right" }}>{page.count.toLocaleString()}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: CHART, minWidth: 44, textAlign: "right" }}>{pct}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SearchList({ searches }: { searches: { label: string; count: number }[] }) {
  const max = searches[0]?.count || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
      {searches.slice(0, 8).map(s => {
        const pct = Math.round((s.count / max) * 100);
        return (
          <div key={s.label}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><Hash size={11} color={CYAN} /><span style={{ fontSize: 13, color: TEXT }}>{s.label}</span></div><span style={{ fontSize: 12, color: SUBTEXT }}>{s.count}x</span></div>
            <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}><div style={{ height: "100%", width: pct + "%", background: CYAN, borderRadius: 99, transition: "width 0.6s ease" }} /></div>
          </div>
        );
      })}
    </div>
  );
}

function Metric({ label, value, sub, color, icon: Icon, trend, note }: { label: string; value: string | number; sub?: string; color: string; icon: React.ComponentType<any>; trend?: "up" | "down"; note?: string; }) {
  return (
    <Card style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={16} color={color} /></div>
        {trend && note && <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: trend === "up" ? GREEN : ROSE }}>{trend === "up" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{note}</div>}
      </div>
      <div>
        <div style={{ fontSize: 30, fontWeight: 800, color: TEXT, letterSpacing: "-1px", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: SUBTEXT, marginTop: 5 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{sub}</div>}
      </div>
    </Card>
  );
}

function Dashboard({ idToken }: { idToken: string }) {
  const [metric, setMetric] = useState<"visitors" | "pageViews">("visitors");
  const input = useMemo(() => ({ idToken: idToken || "inactive" }), [idToken]);
  const q = trpc.analytics.summary.useQuery(input, { enabled: Boolean(idToken), refetchInterval: 60_000 });
  const data = q.data; const d = data as any;
  const weekVisitors = (d?.trafficLast7Days || []).reduce((s: number, x: any) => s + x.visitors, 0);
  const weekViews = (d?.trafficLast7Days || []).reduce((s: number, x: any) => s + x.pageViews, 0);
  const bounceRate = d?.bounceRate ?? 0;
  const avgDepth = d?.avgSessionDepth ?? 0;
  const returningPct = data?.totalVisitors ? Math.round((data.returningVisitors / data.totalVisitors) * 100) : 0;

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "'Inter',system-ui,sans-serif" }}>
      <nav style={{ position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 56, background: "rgba(9,9,11,0.92)", backdropFilter: "blur(16px)", borderBottom: "1px solid " + BORDER }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <a href="/admin" style={{ display: "flex", alignItems: "center", gap: 7, color: SUBTEXT, textDecoration: "none", fontSize: 13, fontWeight: 500 }}><ArrowLeft size={14} /> Admin</a>
          <div style={{ width: 1, height: 18, background: BORDER }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg," + ACCENT + "," + BLUE + ")", display: "flex", alignItems: "center", justifyContent: "center" }}><BarChart2 size={14} color="#fff" /></div>
            <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>Analytics</span>
            <span style={{ fontSize: 12, color: MUTED, display: "flex", alignItems: "center", gap: 6 }}>
              <img src="/logo.png" alt="The Cozy Cart Logo" style={{ width: 18, height: 18, objectFit: "contain" }} />
              The Cozy Cart
            </span>
          </div>
        </div>
      </nav>

      <div style={{ padding: "32px 32px 64px", maxWidth: 1380, margin: "0 auto" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: TEXT, margin: 0, letterSpacing: "-0.5px" }}>Website Analytics</h1>
          <p style={{ fontSize: 13, color: SUBTEXT, margin: "6px 0 0" }}>Privacy-first, first-party events · auto-updates every 60 s</p>
        </div>

        {q.isLoading && <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 20 }}>{Array.from({ length: 5 }).map((_, i) => <div key={i} style={{ height: 110, background: SURFACE, borderRadius: 16, animation: "pulse 1.5s ease-in-out infinite" }} />)}</div>}

        {q.isError && (
          <div style={{ padding: "32px", textAlign: "center", background: SURFACE, borderRadius: 16, border: "1px solid " + BORDER }}>
            <CircleAlert size={36} color={ROSE} style={{ marginBottom: 16 }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, marginBottom: 8 }}>Failed to load analytics</h2>
            <p style={{ fontSize: 14, color: SUBTEXT, marginBottom: 16 }}>{q.error?.message || "Your session may have expired. Please return to the Admin page to log in again."}</p>
            <a href="/admin" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", background: ACCENT, color: "#fff", borderRadius: 8, textDecoration: "none", fontWeight: 600, fontSize: 13 }}><ArrowLeft size={16} /> Go to Admin Dashboard</a>
          </div>
        )}

        {!q.isLoading && !q.isError && !data?.available && (
          <div style={{ padding: "32px", textAlign: "center", background: SURFACE, borderRadius: 16, border: "1px solid " + BORDER }}>
            <ShieldCheck size={36} color={AMBER} style={{ marginBottom: 16 }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, marginBottom: 8 }}>Analytics Storage Unavailable</h2>
            <p style={{ fontSize: 14, color: SUBTEXT }}>Metrics will appear once first-party events can be stored.</p>
          </div>
        )}

        {data?.available && !data.totalVisits && (
          <div style={{ padding: "32px", textAlign: "center", background: SURFACE, borderRadius: 16, border: "1px solid " + BORDER, marginBottom: 20 }}>
            <BarChart2 size={36} color={CYAN} style={{ marginBottom: 16 }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, marginBottom: 8 }}>No verified production traffic yet</h2>
            <p style={{ fontSize: 14, color: SUBTEXT }}>Publish the site to begin collecting real visitor, search, and category-interest data.</p>
          </div>
        )}

        {data?.available && data.totalVisits > 0 && <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 20 }}>
            <Metric icon={Users}         label="Unique Visitors"  value={data.totalVisitors.toLocaleString()}                     color={ACCENT} />
            <Metric icon={Activity}      label="Page Views"       value={(d.totalPageViews || data.totalVisits).toLocaleString()} color={BLUE}   />
            <Metric icon={MousePointer2} label="Sessions"         value={data.totalVisits.toLocaleString()}                       color={CYAN}   />
            <Metric icon={TrendingDown}  label="Bounce Rate"      value={bounceRate + "%"} sub="Lower is better" color={bounceRate > 65 ? ROSE : GREEN} trend={bounceRate > 65 ? "down" : "up"} note={bounceRate > 65 ? "High" : "Good"} />
            <Metric icon={Clock}         label="Pages / Session"  value={String(avgDepth)} sub="Avg. depth" color={AMBER} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 440px", gap: 16, marginBottom: 16 }}>
            <Card>
              <div style={{ padding: "20px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: MUTED, margin: 0 }}>Traffic</p><h3 style={{ fontSize: 16, fontWeight: 700, color: TEXT, margin: "4px 0 0" }}>7-Day Overview</h3></div>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["visitors", "pageViews"] as const).map(m => <button key={m} onClick={() => setMetric(m)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid " + (metric === m ? ACCENT : BORDER), background: metric === m ? ACCENT + "18" : "transparent", color: metric === m ? CHART : SUBTEXT, cursor: "pointer", fontWeight: 600 }}>{m === "visitors" ? "Visitors" : "Views"}</button>)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 28, padding: "16px 24px 0" }}>
                <div><span style={{ fontSize: 26, fontWeight: 800, color: TEXT, letterSpacing: "-1px" }}>{weekVisitors.toLocaleString()}</span><span style={{ fontSize: 12, color: SUBTEXT, marginLeft: 8 }}>visitors this week</span></div>
                <div><span style={{ fontSize: 26, fontWeight: 800, color: TEXT, letterSpacing: "-1px" }}>{weekViews.toLocaleString()}</span><span style={{ fontSize: 12, color: SUBTEXT, marginLeft: 8 }}>views this week</span></div>
              </div>
              <div style={{ padding: "16px 20px 20px" }}><AreaChart data={d.trafficLast7Days || []} metric={metric} /></div>
            </Card>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Card style={{ flex: 1, padding: "20px 24px" }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: MUTED, margin: "0 0 14px" }}>Audience Split</p>
                <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
                  <div style={{ flex: 1, textAlign: "center", padding: "14px 10px", background: ACCENT + "10", border: "1px solid " + ACCENT + "30", borderRadius: 12 }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: ACCENT }}>{(d.newVsReturning?.new || 0).toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: SUBTEXT, marginTop: 4 }}>New visitors</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: ACCENT, marginTop: 2 }}>{100 - returningPct}%</div>
                  </div>
                  <div style={{ flex: 1, textAlign: "center", padding: "14px 10px", background: GREEN + "10", border: "1px solid " + GREEN + "30", borderRadius: 12 }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: GREEN }}>{(d.newVsReturning?.returning || 0).toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: SUBTEXT, marginTop: 4 }}>Returning</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: GREEN, marginTop: 2 }}>{returningPct}%</div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 11, color: SUBTEXT }}>Retention rate</span><span style={{ fontSize: 11, fontWeight: 700, color: returningPct > 30 ? GREEN : AMBER }}>{returningPct}%</span></div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}><div style={{ height: "100%", width: returningPct + "%", background: "linear-gradient(to right," + GREEN + "," + CYAN + ")", borderRadius: 99 }} /></div>
              </Card>
              <Card style={{ padding: "20px 24px" }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: MUTED, margin: "0 0 10px" }}>Activity by Hour</p>
                <HourlyBars data={d.hourlyTraffic || []} />
              </Card>
            </div>
          </div>

          <Card style={{ padding: "24px", marginBottom: 16 }}>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: MUTED, margin: 0 }}>Where users browse</p>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: TEXT, margin: "4px 0 6px" }}>Category Traffic Breakdown</h3>
              <p style={{ fontSize: 12, color: SUBTEXT, margin: 0 }}>Percentage share of total category page visits</p>
            </div>
            {data.categoryInterest.length > 0 ? <CategoryBreakdown categories={data.categoryInterest} /> : <p style={{ color: SUBTEXT, fontSize: 13, textAlign: "center", padding: "32px 0" }}>No category data yet. Tracked when users visit category pages.</p>}
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
            <Card style={{ padding: "20px 24px" }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: MUTED, margin: "0 0 4px" }}>Content</p>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: TEXT, margin: "0 0 16px" }}>Top Pages</h3>
              {d.topPages?.length ? <PageList pages={d.topPages} /> : <p style={{ color: SUBTEXT, fontSize: 13 }}>No page view data yet.</p>}
            </Card>
            <Card style={{ padding: "20px 24px" }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: MUTED, margin: "0 0 4px" }}>Discovery</p>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: TEXT, margin: "0 0 16px" }}>Top Search Terms</h3>
              {d.recentSearches?.length ? <SearchList searches={d.recentSearches} /> : <p style={{ color: SUBTEXT, fontSize: 13 }}>No search data yet.</p>}
            </Card>
          </div>
        </>}
      </div>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'); @keyframes pulse{0%,100%{opacity:.3}50%{opacity:.6}}"}</style>
    </div>
  );
}

export default function AdminAnalytics() {
  const [authorized, setAuthorized] = useState(
    () => (localStorage.getItem("admin_app_token") || "").length > 20
  );
  const C: React.CSSProperties = { minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',system-ui,sans-serif" };
  if (!authorized) return <div style={C}><div style={{ textAlign: "center", color: SUBTEXT }}><ShieldCheck size={36} color={ROSE} style={{ marginBottom: 16 }} /><h2 style={{ color: TEXT, marginBottom: 16 }}>Not authorized</h2></div></div>;
  return <Dashboard idToken={localStorage.getItem("admin_app_token") || ""} />;
}
