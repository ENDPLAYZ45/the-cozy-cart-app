import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  CircleAlert,
  Edit3,
  ExternalLink,
  ImageIcon,
  Link2,
  LoaderCircle,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  emptyProductForm,
  storefrontCategories,
  toProductWritePayload,
} from "@/lib/firebaseAdmin";
import { type FirebaseCatalogRecord } from "@/lib/firebase";
import { trpc } from "@/lib/trpc";
import { type ProductFormState } from "@/lib/firebaseAdmin";

function toForm(id: string, record: FirebaseCatalogRecord): ProductFormState {
  return {
    id,
    name: record.name || record.title || "",
    category: record.category || "",
    brand: record.brand || "",
    description: record.description || "",
    editorialVerdict: record.editorialVerdict || "",
    editorialScore:
      record.editorialScore?.toString() ||
      record.editorial_score?.toString() ||
      "",
    priceAmount: record.price?.amount?.toString() || "",
    mrpAmount: (record.price as any)?.mrp?.toString() || "",
    priceCurrency: record.price?.currency || "USD",
    bestFor: (record.bestFor || []).join(", "),
    affiliateLink: record.affiliate_link || record.affiliateUrl || "",
    imageUrl: record.imageUrl || record.images?.[0] || "",
    imageFocusX: record.imageFocusX?.toString() || "50",
    imageFocusY: record.imageFocusY?.toString() || "50",
    status: record.status || "published",
  };
}

function ProductForm({
  value,
  onChange,
  onSubmit,
  submitting,
  onCancel,
  idToken,
}: {
  value: ProductFormState;
  onChange: (value: ProductFormState) => void;
  onSubmit: (event: FormEvent) => void;
  submitting: boolean;
  onCancel: () => void;
  idToken?: string;
}) {
  const set = (key: keyof ProductFormState, next: string) =>
    onChange({ ...value, [key]: next });
  const [uploading, setUploading] = useState(false);
  const uploadMutation = trpc.catalog.uploadImage.useMutation();

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !idToken) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const base64Url = e.target?.result as string;
        const base64Data = base64Url.split(",")[1];
        if (!base64Data) throw new Error("Could not parse file");

        const result = await uploadMutation.mutateAsync({
          idToken,
          filename: file.name,
          contentType: file.type,
          data: base64Data,
        });
        set("imageUrl", result.url);
        toast.success("Image uploaded successfully");
      } catch (err: any) {
        console.error("Upload failed:", err);
        toast.error(`Failed to upload image: ${err.message || err.toString()}`);
      } finally {
        setUploading(false);
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const categoryOptions =
    value.category &&
    !storefrontCategories.includes(
      value.category as (typeof storefrontCategories)[number]
    )
      ? [value.category, ...storefrontCategories]
      : storefrontCategories;
  return (
    <form className="product-form" onSubmit={onSubmit}>
      <div className="form-heading">
        <div>
          <p className="admin-kicker">
            {value.id ? "EDIT PRODUCT" : "NEW PRODUCT"}
          </p>
          <h2>{value.id ? "Update catalog record" : "Add catalog record"}</h2>
          <p className="form-subtitle">
            Changes are saved directly to the live catalog.
          </p>
        </div>
        <button
          type="button"
          className="form-close"
          onClick={onCancel}
          aria-label="Close product editor"
        >
          <X size={18} />
        </button>
      </div>
      <div className="form-grid">
        <label>
          Product name
          <input
            required
            value={value.name}
            onChange={event => set("name", event.target.value)}
          />
        </label>
        <label>
          Category
          <select
            required
            value={value.category}
            onChange={event => set("category", event.target.value)}
          >
            <option value="" disabled>
              Select an existing category
            </option>
            {categoryOptions.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label>
          Brand
          <input
            value={value.brand}
            onChange={event => set("brand", event.target.value)}
          />
        </label>
        <label>
          Publishing status
          <select
            value={value.status}
            onChange={event => set("status", event.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label>
          Editorial score
          <input
            inputMode="decimal"
            placeholder="e.g. 8.4"
            value={value.editorialScore}
            onChange={event => set("editorialScore", event.target.value)}
          />
        </label>
        <label>
          Price amount
          <input
            inputMode="decimal"
            placeholder="e.g. 4999"
            value={value.priceAmount}
            onChange={event => set("priceAmount", event.target.value)}
          />
        </label>
        <label>
          MRP amount (optional)
          <input
            inputMode="decimal"
            placeholder="e.g. 8999"
            value={value.mrpAmount}
            onChange={event => set("mrpAmount", event.target.value)}
          />
        </label>
        <label>
          Currency
          <input
            placeholder="USD"
            value={value.priceCurrency}
            onChange={event => set("priceCurrency", event.target.value)}
          />
        </label>
        <label>
          Best for (comma separated)
          <input
            value={value.bestFor}
            onChange={event => set("bestFor", event.target.value)}
          />
        </label>
        <label className="span-two">
          Approved Amazon affiliate link
          <input
            type="url"
            placeholder="https://www.amazon..."
            value={value.affiliateLink}
            onChange={event => set("affiliateLink", event.target.value)}
          />
        </label>
        <label
          className="span-two"
          style={{ display: "flex", flexDirection: "column", gap: "8px" }}
        >
          Product image URL (optional)
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input type="text" placeholder="https://..." value={value.imageUrl} onChange={(event) => set("imageUrl", event.target.value)} style={{ flex: 1, minWidth: 0 }} />
          <span style={{ fontSize: '11px', color: '#687269' }}>OR</span>
            <label
              style={{
                margin: 0,
                padding: "9px 12px",
                background: "rgba(0,0,0,0.05)",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: 600,
                whiteSpace: "nowrap",
                border: "1px solid rgba(0,0,0,0.1)",
              }}
            >
              {uploading ? "Uploading..." : "Upload File"}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: "none" }}
                disabled={uploading || !idToken}
              />
            </label>
          </div>
        </label>
        <section
          className="image-editor span-two"
          aria-label="Product image framing"
        >
          <div className="image-preview-frame">
            {value.imageUrl ? (
              <img
                src={value.imageUrl}
                style={{
                  objectPosition: `${value.imageFocusX || 50}% ${value.imageFocusY || 50}%`,
                }}
                alt="Product crop preview"
              />
            ) : (
              <div className="image-preview-empty">
                <ImageIcon size={21} />
                <span>Add an image URL above</span>
              </div>
            )}
          </div>
          <div className="image-editor-controls">
            <div>
              <p className="image-editor-kicker">IMAGE FRAMING</p>
              <h3>Frame linked product image</h3>
              <p>
                Paste a direct image URL above, then choose the part of the
                image shown in The Cozy Cart product cards. Your crop position is saved
                with this product.
              </p>
            </div>
            <div className="image-focus-controls">
              <div>
                <SlidersHorizontal size={14} />
                <span>What appears in the product card</span>
              </div>
              <label>
                Horizontal focus <b>{value.imageFocusX || 50}%</b>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={value.imageFocusX || "50"}
                  onChange={event => set("imageFocusX", event.target.value)}
                />
              </label>
              <label>
                Vertical focus <b>{value.imageFocusY || 50}%</b>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={value.imageFocusY || "50"}
                  onChange={event => set("imageFocusY", event.target.value)}
                />
              </label>
            </div>
          </div>
        </section>
        <label className="span-two">
          Product description
          <textarea
            rows={3}
            value={value.description}
            onChange={event => set("description", event.target.value)}
          />
        </label>
        <label className="span-two">
          Editorial verdict
          <textarea
            rows={2}
            value={value.editorialVerdict}
            onChange={event => set("editorialVerdict", event.target.value)}
          />
        </label>
      </div>
      <div className="form-actions">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button disabled={submitting} type="submit">
          {submitting
            ? "Saving…"
            : value.id
              ? "Save changes"
              : "Create product"}
        </button>
      </div>
    </form>
  );
}

function BulkImportModal({
  idToken,
  nextIdNum,
  onClose,
  onComplete,
}: {
  idToken: string;
  nextIdNum: number;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [links, setLinks] = useState("");
  const [category, setCategory] = useState("Electronics");
  const [status, setStatus] = useState("published");
  const [running, setRunning] = useState(false);
  const cancelRequestedRef = useRef(false);
  const [results, setResults] = useState<Array<{ url: string; status: "pending" | "ok" | "error"; title?: string; error?: string }>>([]);
  const [progress, setProgress] = useState(0);

  const fetchMutation = trpc.catalog.fetchAmazonDetails.useMutation();
  const saveMutation = trpc.catalog.saveProduct.useMutation();

  const startImport = async () => {
    const rawLinks = links
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("http"));

    if (!rawLinks.length) { toast.error("Please paste at least one valid Amazon link."); return; }

    setRunning(true);
    cancelRequestedRef.current = false;
    setProgress(0);
    const initial = rawLinks.map((url) => ({ url, status: "pending" as const }));
    setResults(initial);

    // Compute the starting sequential ID for bulk upload
    let currentIdNum = nextIdNum;

    let done = 0;
    for (let i = 0; i < rawLinks.length; i++) {
      if (cancelRequestedRef.current) {
        toast.info("Import cancelled by user");
        break;
      }
      const url = rawLinks[i];
      try {
        // 1. Fetch product details from Amazon
        const details = await fetchMutation.mutateAsync({ token: idToken, url });

        // 2. Parse price carefully
        const priceNum = parseFloat(details.priceAmount || "0");
        const mrpNum = parseFloat(details.mrpAmount || "0");

        const priceObj: any = { amount: priceNum, currency: "INR" };
        if (mrpNum > 0) priceObj.mrp = mrpNum;

        // 3. Build payload
        const payload = {
          name: details.title,
          category,
          brand: details.brand || "",
          description: details.description || "",
          editorialVerdict: details.description ? details.description.split(" | ")[0] || "" : "",
          editorialScore: null,
          price: priceNum > 0 ? priceObj : null,
          bestFor: details.bestFor || [],
          affiliate_link: url,
          imageUrl: details.imageUrl || null,
          images: details.imageUrl ? [details.imageUrl] : [],
          imageFocusX: 50,
          imageFocusY: 50,
          status: status,
        };

        // 4. Save
        try {
          const nextId = "CC" + String(currentIdNum++).padStart(8, '0');
          await saveMutation.mutateAsync({ token: idToken, id: nextId, payload });
          done++;
          setResults((prev) =>
            prev.map((r) =>
              r.url === url ? { url, status: "ok", title: details.title } : r
            )
          );
        } catch (err: any) {
          throw new Error(err?.message || "Failed to save");
        }
      } catch (err: any) {
        const msg = err?.message || "Failed";
        setResults((prev) =>
          prev.map((r) =>
            r.url === url ? { url, status: "error", error: msg } : r
          )
        );
      }
      setProgress(Math.round(((i + 1) / rawLinks.length) * 100));
      // Small delay to avoid rate limiting
      if (i < rawLinks.length - 1) await new Promise((r) => setTimeout(r, 600));
    }

    setRunning(false);
    if (done > 0) {
      toast.success(`Imported ${done} of ${rawLinks.length} products!`);
      onComplete();
    } else {
      toast.error("No products were imported. Check the links above.");
    }
  };

  const O: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" };
  const M: React.CSSProperties = { background: "#fff", borderRadius: 16, width: "100%", maxWidth: 640, maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column" };

  return (
    <div style={O} onClick={(e) => { if (e.target === e.currentTarget && !running) onClose(); }}>
      <div style={M}>
        {/* Header */}
        <div style={{ padding: "24px 28px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Link2 size={16} color="#7c3aed" />
              </div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#111" }}>Bulk Link Import</h2>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#6b7280", paddingLeft: 44 }}>Paste your SiteStripe affiliate links below — one per line.</p>
          </div>
          {!running && (
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4 }}>
              <X size={20} />
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: "20px 28px", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={running}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, color: "#111", background: "#f9fafb", cursor: "pointer", outline: "none" }}
              >
                {storefrontCategories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={running}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, color: "#111", background: "#f9fafb", cursor: "pointer", outline: "none" }}
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Links textarea */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
              Affiliate links <span style={{ fontWeight: 400, color: "#9ca3af" }}>(one per line, e.g. https://amzn.to/... or https://www.amazon.in/dp/...)</span>
            </label>
            <textarea
              value={links}
              onChange={(e) => setLinks(e.target.value)}
              disabled={running}
              placeholder={`https://amzn.to/3XyZ123\nhttps://amzn.to/4AbC456\nhttps://www.amazon.in/dp/B0XXXXXXX/...`}
              rows={10}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 12, fontFamily: "monospace", resize: "vertical", background: running ? "#f9fafb" : "#fff", boxSizing: "border-box", outline: "none", lineHeight: 1.6 }}
            />
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
              {links.split("\n").filter((l) => l.trim().startsWith("http")).length} link(s) ready to import
            </p>
          </div>

          {/* Progress bar */}
          {results.length > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Progress</span>
                <span style={{ fontSize: 12, color: "#6b7280" }}>{progress}%</span>
              </div>
              <div style={{ height: 6, background: "#f3f4f6", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(to right, #7c3aed, #2563eb)", borderRadius: 99, transition: "width 0.3s ease" }} />
              </div>

              {/* Results list */}
              <div style={{ marginTop: 12, maxHeight: 200, overflow: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                {results.map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 10px", borderRadius: 8, background: r.status === "ok" ? "#f0fdf4" : r.status === "error" ? "#fef2f2" : "#f9fafb", border: `1px solid ${r.status === "ok" ? "#bbf7d0" : r.status === "error" ? "#fecaca" : "#e5e7eb"}` }}>
                    <span style={{ marginTop: 1, flexShrink: 0 }}>
                      {r.status === "pending" && <LoaderCircle size={14} color="#9ca3af" className="spin" />}
                      {r.status === "ok" && <CheckCircle2 size={14} color="#16a34a" />}
                      {r.status === "error" && <CircleAlert size={14} color="#dc2626" />}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: r.status === "ok" ? "#15803d" : r.status === "error" ? "#dc2626" : "#374151", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {r.title || r.url}
                      </p>
                      {r.error && <p style={{ margin: 0, fontSize: 11, color: "#dc2626" }}>{r.error}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div style={{ padding: "0 28px 24px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          {!running && results.length === 0 && (
            <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancel</button>
          )}
          {!running && results.every((r) => r.status !== "pending") && results.length > 0 && (
            <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Close</button>
          )}
          {!running && (
            <button
              onClick={startImport}
              disabled={running || !links.trim()}
              style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #7c3aed, #2563eb)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, opacity: !links.trim() ? 0.5 : 1 }}
            >
              <Link2 size={14} /> Start Import
            </button>
          )}
          {running && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6b7280", fontWeight: 500 }}>
                <LoaderCircle size={16} className="spin" /> Importing... please wait
              </div>
              <button
                onClick={() => { cancelRequestedRef.current = true; }}
                style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #ef4444", background: "#fef2f2", color: "#ef4444", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
              >
                Cancel Import
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AnalyticsPanel({ idToken }: { idToken: string }) {
  const input = useMemo(() => ({ idToken: idToken || "inactive" }), [idToken]);
  const metrics = trpc.analytics.summary.useQuery(input, {
    enabled: Boolean(idToken),
  });
  const data = metrics.data;
  const returningRate = data?.totalVisitors
    ? Math.round((data.returningVisitors / data.totalVisitors) * 100)
    : 0;
  return (
    <section className="admin-analytics" aria-labelledby="audience-heading">
      <div className="admin-analytics-head">
        <div>
          <p className="admin-kicker">LIVE STOREFRONT SIGNALS</p>
          <h2 id="audience-heading">Audience and intent</h2>
          <p>
            First-party, privacy-conscious events from the public storefront.
            “Live” reflects viewers seen in the last five minutes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => metrics.refetch()}
          disabled={metrics.isFetching || !idToken}
        >
          <RefreshCw size={14} className={metrics.isFetching ? "spin" : ""} />{" "}
          Refresh
        </button>
      </div>
      {!idToken || metrics.isLoading ? (
        <p className="analytics-empty">
          <LoaderCircle size={16} className="spin" /> Loading live storefront
          metrics…
        </p>
      ) : metrics.error || !data?.available ? (
        <p className="analytics-empty">
          <CircleAlert size={16} /> Analytics storage is not available yet.
          Metrics will appear once first-party events can be stored.
        </p>
      ) : !data.totalVisits ? (
        <p className="analytics-empty">
          <BarChart3 size={16} /> No verified production traffic yet. Publish
          the site to begin collecting real visitor, search, and
          category-interest data.
        </p>
      ) : (
        <>
          <div className="analytics-metrics">
            <div>
              <span>Live viewers</span>
              <strong>{data.activeVisitors}</strong>
              <small>Seen in last 5 min</small>
            </div>
            <div>
              <span>Unique viewers</span>
              <strong>{data.totalVisitors}</strong>
              <small>Anonymous visitor IDs</small>
            </div>
            <div>
              <span>Return rate</span>
              <strong>{data.totalVisitors ? `${returningRate}%` : "—"}</strong>
              <small>{data.returningVisitors} returning viewers</small>
            </div>
            <div>
              <span>Total visits</span>
              <strong>{data.totalVisits}</strong>
              <small>Distinct browsing sessions</small>
            </div>
          </div>
          <div className="analytics-insights">
            <div>
              <Search size={17} />
              <span>Most searched</span>
              <strong>{data.topSearch?.label || "No searches yet"}</strong>
              {data.topSearch && <small>{data.topSearch.count} searches</small>}
            </div>
            <div>
              <BarChart3 size={17} />
              <span>Top category</span>
              <strong>
                {data.topCategory?.label || "No category interest yet"}
              </strong>
              {data.topCategory && (
                <small>{data.topCategory.count} selections</small>
              )}
            </div>
            <div>
              <Users size={17} />
              <span>Category interest</span>
              {data.categoryInterest.length ? (
                <ol>
                  {data.categoryInterest.slice(0, 3).map(item => (
                    <li key={item.label}>
                      <b>{item.label}</b>
                      <em>{item.count}</em>
                    </li>
                  ))}
                </ol>
              ) : (
                <strong>No selections yet</strong>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default function AdminCatalog() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [records, setRecords] = useState<
    Array<{ id: string; data: FirebaseCatalogRecord }>
  >([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [form, setForm] = useState<ProductFormState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [analyticsToken, setAnalyticsToken] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "published" | "draft" | "archived">("all");
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [authorized, setAuthorized] = useState(
    () => (localStorage.getItem("admin_app_token") || "").length > 20
  );
  const [showBulkImport, setShowBulkImport] = useState(false);
  const publishedCount = useMemo(
    () =>
      records.filter(({ data }) => (data.status || "published") === "published")
        .length,
    [records]
  );
  
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const { data } of records) {
      if (data.category) cats.add(data.category);
    }
    return Array.from(cats).sort();
  }, [records]);
  const filteredRecords = useMemo(() => {
    let filtered = records.filter(({ data }) => {
      if (activeTab !== "all" && (data.status || "published") !== activeTab) return false;
      if (activeCategory !== "all" && (data.category || "Uncategorized") !== activeCategory) return false;
      return true;
    });

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.id.toLowerCase().includes(q) ||
        r.data.name?.toLowerCase().includes(q) || 
        r.data.title?.toLowerCase().includes(q)
      );
    }

    const searchTokens = searchQuery
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map(t => {
        if (t.length > 4 && t.endsWith("ies")) return t.slice(0, -3) + "y";
        if (t.length > 3 && t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1);
        return t;
      });

    if (searchTokens.length > 0) {
      filtered = filtered.filter(({ data }) => {
        const text = `${data.name || data.title || ""} ${data.category || ""} ${data.brand || ""}`.toLowerCase();
        return searchTokens.every(t => {
          const t2 = t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t;
          return text.includes(t) || text.includes(t2);
        });
      });
    }

    return filtered;
  }, [records, activeTab, searchQuery, activeCategory]);

  const groupedRecords = useMemo(() => {
    const groups: Record<string, typeof records> = {};
    for (const record of filteredRecords) {
      const cat = record.data.category || "Uncategorized";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(record);
    }
    return Object.keys(groups)
      .sort()
      .reduce((acc, key) => {
        acc[key] = groups[key];
        return acc;
      }, {} as Record<string, typeof records>);
  }, [filteredRecords]);
  useEffect(() => {
    if (!authorized) {
      setAnalyticsToken("");
      return;
    }
    setAnalyticsToken(localStorage.getItem("admin_app_token") || "");
  }, [authorized]);
  const trpcUtils = trpc.useUtils();

  useEffect(() => {
    if (!authorized) return;
    setRecordsLoading(true);
    const token = localStorage.getItem("admin_app_token") || "";
    trpcUtils.catalog.adminProducts.fetch({ token })
      .then(r => setRecords(r.map(product => ({ id: product.id, data: product as any }))))
      .catch(err => {
        console.error("Failed to load admin products:", err);
        toast.error("Session expired or failed to load products. Please log in again.");
        localStorage.removeItem("admin_app_token");
        setAuthorized(false);
      })
      .finally(() => setRecordsLoading(false));
  }, [authorized, trpcUtils.catalog.adminProducts]);

  useEffect(() => {
    if (!authorized) return;
    const params = new URLSearchParams(window.location.search);
    const importDataParam = params.get("importData");
    if (importDataParam) {
      try {
        const parsed = JSON.parse(importDataParam);
        const prefilledForm = emptyProductForm();
        prefilledForm.name = parsed.title || "";
        prefilledForm.brand = parsed.brand || "";
        prefilledForm.priceAmount = parsed.priceAmount ? parsed.priceAmount.toString() : "";
        prefilledForm.mrpAmount = parsed.mrpAmount ? parsed.mrpAmount.toString() : "";
        prefilledForm.imageUrl = parsed.imageUrl || "";
        prefilledForm.affiliateLink = parsed.affiliateUrl || "";
        
        // Auto-assign category for fashion
        if (prefilledForm.name.toLowerCase().match(/shirt|pant|dress|shoe|kurta|wear|top|t-shirt|jeans/)) {
           prefilledForm.category = "Fashion";
        }
        
        setForm(prefilledForm);
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        toast.success("Imported product data from Amazon!");
      } catch (e) {
        toast.error("Failed to parse imported data.");
      }
    }
  }, [authorized]);
  const loginMutation = trpc.catalog.loginAdmin.useMutation();
  const refreshTokenMutation = trpc.catalog.refreshAdminToken.useMutation();
  const saveMutation = trpc.catalog.saveProduct.useMutation();
  const deleteMutation = trpc.catalog.deleteProduct.useMutation();

  // ── Auto-refresh the Firebase token every 45 min so bulk imports never time out ──
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silentRefresh = useCallback(async () => {
    const storedRefreshToken = localStorage.getItem("admin_refresh_token");
    if (!storedRefreshToken) return;
    try {
      const result = await refreshTokenMutation.mutateAsync({ refreshToken: storedRefreshToken });
      localStorage.setItem("admin_app_token", result.token);
      localStorage.setItem("admin_refresh_token", result.refreshToken);
      setAnalyticsToken(result.token);
    } catch {
      // silent – if refresh fails the user will naturally hit the auth wall next time they save
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!authorized) {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      return;
    }
    // Fire once immediately when session starts, then every 45 min
    silentRefresh();
    refreshIntervalRef.current = setInterval(silentRefresh, 45 * 60 * 1000);
    return () => { if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current); };
  }, [authorized]); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setSigningIn(true);
    try {
      const result = await loginMutation.mutateAsync({ email, password });
      if (result.success && result.token) {
        localStorage.setItem("admin_app_token", result.token);
        if (result.refreshToken) {
          localStorage.setItem("admin_refresh_token", result.refreshToken);
        }
        setAuthorized(true);
        setPassword("");
        toast.success("Admin access granted");
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid email or password.");
      console.error(err);
    } finally {
      setSigningIn(false);
    }
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form || !authorized) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem("admin_app_token") || "";
      const payload = toProductWritePayload(form);
      
      let productId = form.id;
      if (!productId) {
        const ccRecords = records.filter(r => r.id.startsWith("CC"));
        let nextIdNum = 1;
        if (ccRecords.length > 0) {
          const nums = ccRecords.map(r => parseInt(r.id.replace("CC", ""), 10)).filter(n => !isNaN(n));
          if (nums.length > 0) nextIdNum = Math.max(...nums) + 1;
        }
        productId = "CC" + String(nextIdNum).padStart(8, '0');
      }

      await saveMutation.mutateAsync({ token, id: productId, payload });
      
      toast.success(form.id ? "Product updated" : "Product created");
      setForm(null);
      const nextRecords = await trpcUtils.catalog.adminProducts.fetch({ token });
      setRecords(nextRecords.map(product => ({ id: product.id, data: product as any })));
    } catch {
      toast.error("Could not save this record.");
    } finally {
      setSubmitting(false);
    }
  };
  const remove = async (id: string, name: string) => {
    if (!window.confirm(`Delete “${name}”? This cannot be undone.`)) return;
    try {
      setDeletingIds(prev => new Set(prev).add(id));
      const token = localStorage.getItem("admin_app_token") || "";
      await deleteMutation.mutateAsync({ token, id });
      
      toast.success("Product deleted");
      const nextRecords = await trpcUtils.catalog.adminProducts.fetch({ token });
      setRecords(nextRecords.map(product => ({ id: product.id, data: product as any })));
    } catch {
      toast.error("Could not delete this record.");
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const bulkUpdateStatusMutation = trpc.catalog.bulkUpdateStatus.useMutation();
  const handleBulkStatusUpdate = async (newStatus: "published" | "draft" | "archived") => {
    if (selectedIds.size === 0) return;
    try {
      const token = localStorage.getItem("admin_app_token") || "";
      setSubmitting(true);
      toast.loading(`Updating ${selectedIds.size} products to ${newStatus}...`, { id: "bulk-update" });
      await bulkUpdateStatusMutation.mutateAsync({ token, ids: Array.from(selectedIds), status: newStatus });
      toast.success(`Updated ${selectedIds.size} products to ${newStatus}`, { id: "bulk-update" });
      setSelectedIds(new Set());
      const nextRecords = await trpcUtils.catalog.adminProducts.fetch({ token });
      setRecords(nextRecords.map(product => ({ id: product.id, data: product as any })));
    } catch {
      toast.error("Failed to update status", { id: "bulk-update" });
    } finally {
      setSubmitting(false);
    }
  };

  const bulkDeleteProductsMutation = trpc.catalog.bulkDeleteProducts.useMutation();
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} products? This cannot be undone.`)) return;
    try {
      const token = localStorage.getItem("admin_app_token") || "";
      setSubmitting(true);
      setDeletingIds(prev => new Set(Array.from(prev).concat(Array.from(selectedIds))));
      toast.loading(`Deleting ${selectedIds.size} products...`, { id: "bulk-delete" });
      await bulkDeleteProductsMutation.mutateAsync({ token, ids: Array.from(selectedIds) });
      toast.success(`Deleted ${selectedIds.size} products`, { id: "bulk-delete" });
      setSelectedIds(new Set());
      const nextRecords = await trpcUtils.catalog.adminProducts.fetch({ token });
      setRecords(nextRecords.map(product => ({ id: product.id, data: product as any })));
    } catch {
      toast.error("Failed to delete selected products", { id: "bulk-delete" });
    } finally {
      setSubmitting(false);
      setDeletingIds(new Set());
    }
  };

  const handleMigrateIds = async () => {
    if (!window.confirm(`Are you sure you want to migrate all old IDs to the new CC format? This will take a moment.`)) return;
    try {
      const token = localStorage.getItem("admin_app_token") || "";
      setSubmitting(true);
      
      const oldRecords = records.filter(r => !r.id.startsWith("CC"));
      const ccRecords = records.filter(r => r.id.startsWith("CC"));
      
      let nextIdNum = 1;
      if (ccRecords.length > 0) {
        const nums = ccRecords.map(r => parseInt(r.id.replace("CC", ""), 10)).filter(n => !isNaN(n));
        if (nums.length > 0) nextIdNum = Math.max(...nums) + 1;
      }

      toast.loading(`Migrating ${oldRecords.length} products...`, { id: "migrate" });
      
      let done = 0;
      for (const record of oldRecords) {
        const newId = "CC" + String(nextIdNum++).padStart(8, '0');
        // Save new record
        const payload = toProductWritePayload(toForm(record.id, record.data));
        await saveMutation.mutateAsync({ token, id: newId, payload });
        // Delete old record
        await deleteMutation.mutateAsync({ token, id: record.id });
        done++;
      }
      
      toast.success(`Successfully migrated ${done} products!`, { id: "migrate" });
      const nextRecords = await trpcUtils.catalog.adminProducts.fetch({ token });
      setRecords(nextRecords.map(product => ({ id: product.id, data: product as any })));
    } catch (err: any) {
      toast.error(`Migration failed: ${err.message}`, { id: "migrate" });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteAllMutation = trpc.catalog.deleteAllProducts.useMutation();
  const removeAll = async () => {
    const confirmText = window.prompt("Are you sure you want to delete ALL products? Type DELETE to confirm.");
    if (confirmText !== "DELETE") return;
    
    try {
      const token = localStorage.getItem("admin_app_token") || "";
      toast.loading("Deleting all products...", { id: "delete-all" });
      setSubmitting(true);
      const res = await deleteAllMutation.mutateAsync({ token });
      toast.success(`Deleted ${res.count} products successfully.`, { id: "delete-all" });
      const nextRecords = await trpcUtils.catalog.adminProducts.fetch({ token });
      setRecords(nextRecords.map(product => ({ id: product.id, data: product as any })));
    } catch {
      toast.error("Failed to delete all products.", { id: "delete-all" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authorized) return;
    
    // reset input
    e.target.value = "";
    
    const text = await file.text();
    const rows = text.split("\n").filter(r => r.trim());
    if (rows.length < 2) {
      toast.error("CSV must have a header row and at least one data row");
      return;
    }
    
    const headers = rows[0].split(",").map(h => h.trim().replace(/"/g, "").toLowerCase());
    
    let successCount = 0;
    toast.loading("Uploading products... Please wait", { id: "csv-upload" });
    const token = localStorage.getItem("admin_app_token") || "";
    setSubmitting(true);
    
    try {
      for (let i = 1; i < rows.length; i++) {
        const rowText = rows[i].trim();
        if (!rowText) continue;
        
        // Split by comma, handling quotes correctly
        const cols = rowText.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, "").replace(/""/g, '"'));
        
        const rawProduct: any = {};
        headers.forEach((h, idx) => {
          rawProduct[h] = cols[idx] || "";
        });
        
        if (!rawProduct.name && !rawProduct.title) continue;
        
        const formPayload: ProductFormState = {
          id: "",
          name: rawProduct.name || rawProduct.title || "",
          category: rawProduct.category || "Uncategorized",
          brand: rawProduct.brand || "",
          description: rawProduct.description || "",
          editorialVerdict: rawProduct.editorialverdict || rawProduct.verdict || "",
          editorialScore: rawProduct.editorialscore || rawProduct.score || "",
          priceAmount: rawProduct.priceamount || rawProduct.price || "",
          priceCurrency: rawProduct.pricecurrency || rawProduct.price || "INR",
          bestFor: rawProduct.bestfor || "",
          affiliateLink: rawProduct.affiliatelink || rawProduct.affiliateurl || "",
          imageUrl: rawProduct.imageurl || rawProduct.image || "",
          imageFocusX: rawProduct.imagefocusx || "50",
          imageFocusY: rawProduct.imagefocusy || "50",
          status: "published",
          mrpAmount: ""
        };
        
        const payload = toProductWritePayload(formPayload);
        await saveMutation.mutateAsync({ token, id: "", payload });
        successCount++;
      }
      
      toast.success(`Successfully uploaded ${successCount} products!`, { id: "csv-upload" });
      const nextRecords = await trpcUtils.catalog.adminProducts.fetch({ token });
      setRecords(nextRecords.map(product => ({ id: product.id, data: product as any })));
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("An error occurred during bulk upload", { id: "csv-upload" });
    } finally {
      setSubmitting(false);
    }
  };
  if (!authorized)
    return (
      <main className="firebase-admin-shell login-shell">
        <form className="firebase-login" onSubmit={login}>
          <ShieldCheck size={27} />
          <p className="admin-kicker">SYSTEM ADMIN</p>
          <h1>Sign in</h1>
          <p>
            Use your administrator email and password to access the catalog.
          </p>
          <label>
            Email address
            <input
              required
              type="email"
              autoComplete="username"
              value={email}
              onChange={event => setEmail(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
            />
          </label>
          <button disabled={signingIn} type="submit">
            {signingIn ? "Signing in…" : "Sign in securely"}
          </button>
        </form>
      </main>
    );
  if (!authorized)
    return (
      <main className="firebase-admin-shell">
        <div className="admin-gate">
          <CircleAlert size={25} />
          <h1>This account is not authorized.</h1>
          <p>
            Sign out and use the approved administrator password for this
            environment.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem("admin_app_token");
              localStorage.removeItem("admin_refresh_token");
              setAuthorized(false);
              toast.success("Signed out");
            }}
            className="admin-logout"
          >
            Sign out
          </button>
        </div>
      </main>
    );
  return (
    <main className="firebase-admin-shell">
      <header className="admin-topbar">
        <a href="/" className="admin-wordmark">
          <img src="/logo.png" alt="The Cozy Cart Logo" />
          The Cozy Cart <span>ADMIN</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <a
            href="/admin/analytics"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#111827",
              textDecoration: "none",
              marginRight: 16,
            }}
          >
            Analytics
          </a>
          <button
            onClick={() => {
              localStorage.removeItem("admin_app_token");
              localStorage.removeItem("admin_refresh_token");
              setAuthorized(false);
              toast.success("Signed out");
            }}
            type="button"
          >
            Sign out
          </button>
        </div>
      </header>
      <section className="admin-workspace">
        <div className="admin-heading">
          <div>
            <p className="admin-kicker">PRODUCT MANAGEMENT</p>
            <h1>Run the catalog.</h1>
            <p>
              Create, edit, publish, archive, and remove products. Retailer
              destinations stay in the database and become active in the storefront
              as approved links.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {selectedIds.size > 0 && (
              <button
                className="create-product"
                onClick={handleBulkDelete}
                disabled={submitting}
                style={{ background: "#fef2f2", color: "#ef4444", border: "1px solid #fca5a5" }}
              >
                <Trash2 size={15} /> Delete Selected ({selectedIds.size})
              </button>
            )}
            {records.length > 0 && (
              <button
                className="create-product"
                onClick={removeAll}
                disabled={submitting}
                style={{ background: "#fef2f2", color: "#ef4444", border: "1px solid #fca5a5" }}
              >
                <Trash2 size={15} /> Delete All
              </button>
            )}
            {records.some(r => !r.id.startsWith("CC")) && (
              <button
                className="create-product"
                onClick={handleMigrateIds}
                disabled={submitting}
                style={{ background: "#eff6ff", color: "#3b82f6", border: "1px solid #bfdbfe" }}
              >
                Migrate Old IDs
              </button>
            )}
            <button
              className="create-product"
              onClick={() => setShowBulkImport(true)}
              style={{ background: "linear-gradient(135deg,#7c3aed,#2563eb)", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Link2 size={17} /> Bulk Import
            </button>
            <a
              href="javascript:(function(){try{var q=function(s){return document.querySelector(s);};var t=q('#productTitle')?.innerText.trim()||'';var p=q('.a-price-whole')?.innerText.replace(/[^\d]/g,'');var m=q('.a-text-price .a-offscreen')?.innerText.replace(/[^\d.]/g,'');var i=q('#landingImage');var ia=i?(i.dataset.oldHires||i.src):'';var b=q('#bylineInfo')?.innerText.replace(/Visit the\s*/i,'').replace(/\s+Store$/i,'').trim()||'';var d={title:t,priceAmount:p?parseInt(p):null,mrpAmount:m?parseInt(m):null,imageUrl:ia,brand:b,affiliateUrl:window.location.href};window.location.href='https://cozycart.bond/admin?importData='+encodeURIComponent(JSON.stringify(d));}catch(e){alert('CozyCart: '+e.message);}})();"
              className="bulk-import-btn"
              style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", textDecoration: "none", display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, padding: "0 14px", height: "34px", borderRadius: "6px", fontSize: "13px" }}
              title="Drag me to your Bookmarks Bar!"
              onClick={(e) => { e.preventDefault(); toast.info("Drag this button to your Bookmarks Bar! Then click it when viewing an Amazon product.", { duration: 8000 }); }}
            >
              <ExternalLink size={17} /> CozyCart Importer
            </a>
            <label
              className="create-product"
              style={{ background: "#e5e7eb", color: "#374151", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 14px", height: "34px", borderRadius: "6px", fontSize: "13px", fontWeight: 600 }}
            >
              Upload CSV
              <input
                type="file"
                accept=".csv"
                style={{ display: "none" }}
                onChange={handleCsvUpload}
                disabled={submitting}
              />
            </label>
            <button
              className="create-product"
              onClick={() => setForm({ ...emptyProductForm })}
            >
              <Plus size={17} /> Add product
            </button>
          </div>
        </div>
        <div className="admin-metrics">
          <div>
            <span>Total records</span>
            <strong>{records.length}</strong>
          </div>
          <div>
            <span>Published</span>
            <strong>{publishedCount}</strong>
          </div>
          <div>
            <span>Needs affiliate link</span>
            <strong>
              {
                records.filter(
                  ({ data }) => !(data.affiliate_link || data.affiliateUrl)
                ).length
              }
            </strong>
          </div>
        </div>
        <AnalyticsPanel idToken={analyticsToken} />
        <section className="admin-products">
          <div className="admin-records-head">
            <div>
              <p className="admin-kicker">LIVE PRODUCTS</p>
              <h2>Manage every product record.</h2>
            </div>
          </div>
          {recordsLoading ? (
            <p className="admin-loading">Loading products…</p>
          ) : (
            <div className="admin-table-wrap">
              <div className="admin-catalog-filters" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 16 }}>
                <div className="admin-tabs" style={{ display: "flex", gap: 8 }}>
                  {["all", "published", "draft", "archived"].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab as any)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 6,
                        border: "1px solid",
                        borderColor: activeTab === tab ? "#000" : "#e5e7eb",
                        background: activeTab === tab ? "#000" : "#fff",
                        color: activeTab === tab ? "#fff" : "#374151",
                        fontWeight: 500,
                        textTransform: "capitalize",
                        cursor: "pointer",
                        fontSize: 13
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <select 
                    value={activeCategory} 
                    onChange={e => setActiveCategory(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid #e5e7eb",
                      fontSize: 13,
                      background: "#fff",
                      cursor: "pointer",
                      outline: "none",
                      boxShadow: "none"
                    }}
                  >
                    <option value="all">All Categories</option>
                    {allCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <div style={{ position: "relative", width: 250 }}>
                    <Search size={16} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
                    <input 
                      type="text" 
                      placeholder="Search products..." 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 10px 8px 34px",
                        borderRadius: 6,
                        border: "1px solid #e5e7eb",
                        fontSize: 13,
                        background: "#fff",
                        boxShadow: "none",
                        outline: "none",
                        margin: 0
                      }}
                    />
                  </div>
                </div>
              </div>

              {selectedIds.size > 0 && (
                <div style={{ padding: "10px 16px", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 8, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{selectedIds.size} selected</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button 
                      onClick={() => handleBulkStatusUpdate("published")}
                      disabled={submitting}
                      style={{ padding: "6px 12px", background: "#10b981", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    >Publish</button>
                    <button 
                      onClick={() => handleBulkStatusUpdate("draft")}
                      disabled={submitting}
                      style={{ padding: "6px 12px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    >Draft</button>
                    <button 
                      onClick={() => handleBulkStatusUpdate("archived")}
                      disabled={submitting}
                      style={{ padding: "6px 12px", background: "#6b7280", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    >Archive</button>
                    <button 
                      onClick={async () => {
                         if (!window.confirm(`Delete ${selectedIds.size} products?`)) return;
                         try {
                           setSubmitting(true);
                           const token = localStorage.getItem("admin_app_token") || "";
                           for (const id of Array.from(selectedIds)) {
                             await deleteMutation.mutateAsync({ token, id });
                           }
                           toast.success(`Deleted ${selectedIds.size} products`);
                           setSelectedIds(new Set());
                           const nextRecords = await trpcUtils.catalog.adminProducts.fetch({ token });
                           setRecords(nextRecords.map(product => ({ id: product.id, data: product as any })));
                         } catch { toast.error("Failed to delete some products"); }
                         finally { setSubmitting(false); }
                      }}
                      disabled={submitting}
                      style={{ padding: "6px 12px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    >Delete</button>
                  </div>
                </div>
              )}

              {Object.keys(groupedRecords).length === 0 ? (
                <p className="admin-loading" style={{ textAlign: "center", padding: "40px 0" }}>
                  {!records.length 
                    ? "No products found. Add the first one with the button above."
                    : "No products match your current filters."}
                </p>
              ) : (
                Object.entries(groupedRecords).map(([category, items]) => (
                  <div key={category} className="admin-category-group" style={{ marginBottom: 30 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, borderBottom: "2px solid #f3f4f6", paddingBottom: 8, marginBottom: 16, color: "#111827", display: "flex", alignItems: "center" }}>
                      {category} <span style={{ fontSize: 13, fontWeight: 500, color: "#6b7280", marginLeft: 8, background: "#f3f4f6", padding: "2px 8px", borderRadius: 10 }}>{items.length} items</span>
                    </h3>
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: 40, paddingLeft: 12 }}>
                            <input 
                              type="checkbox" 
                              checked={items.length > 0 && items.every(item => selectedIds.has(item.id))}
                              onChange={(e) => {
                                const newSelected = new Set(selectedIds);
                                if (e.target.checked) {
                                  items.forEach(item => newSelected.add(item.id));
                                } else {
                                  items.forEach(item => newSelected.delete(item.id));
                                }
                                setSelectedIds(newSelected);
                              }}
                            />
                          </th>
                          <th>Product</th>
                          <th>Status</th>
                          <th>Price</th>
                          <th>Affiliate</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(({ id, data }) => {
                          const isDeleting = deletingIds.has(id);
                          return (
                          <tr key={id} style={{ background: selectedIds.has(id) ? "#f8fafc" : "transparent", opacity: isDeleting ? 0.4 : 1, transition: "opacity 0.2s", pointerEvents: isDeleting ? "none" : "auto" }}>
                            <td style={{ paddingLeft: 12 }}>
                              <input 
                                type="checkbox"
                                checked={selectedIds.has(id)}
                                onChange={(e) => {
                                  const newSelected = new Set(selectedIds);
                                  if (e.target.checked) {
                                    newSelected.add(id);
                                  } else {
                                    newSelected.delete(id);
                                  }
                                  setSelectedIds(newSelected);
                                }}
                              />
                            </td>
                            <td>
                              <strong>
                                {data.name || data.title || "Untitled product"}
                              </strong>
                              <small>
                                {data.brand || "No brand"}
                              </small>
                            </td>
                            <td>
                              <span
                                className={`status-pill ${data.status || "published"}`}
                              >
                                {data.status || "published"}
                              </span>
                            </td>
                            <td>
                              {data.price?.amount
                                ? `₹${data.price.amount}`
                                : "—"}
                            </td>
                            <td>
                              <span
                                className={
                                  data.affiliate_link || data.affiliateUrl
                                    ? "readiness yes"
                                    : "readiness"
                                }
                              >
                                {data.affiliate_link || data.affiliateUrl
                                  ? "Ready"
                                  : "Missing"}
                              </span>
                            </td>
                            <td>
                              <div className="row-actions">
                                <button
                                  disabled={isDeleting}
                                  onClick={() => setForm(toForm(id, data))}
                                  aria-label="Edit product"
                                >
                                  <Edit3 size={15} />
                                </button>
                                <button
                                  disabled={isDeleting}
                                  onClick={() =>
                                    remove(
                                      id,
                                      data.name || data.title || "this product"
                                    )
                                  }
                                  aria-label="Delete product"
                                >
                                  {isDeleting ? <LoaderCircle size={15} className="spin" /> : <Trash2 size={15} />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )})}
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
        <p className="admin-footnote">
          <CheckCircle2 size={14} /> Authentication is active. Changes
          are applied directly to the <code>products</code> collection and
          reflect in the public catalog when status is{" "}
          <strong>published</strong>.
        </p>
      </section>
      <Dialog
        open={Boolean(form)}
        onOpenChange={open => !open && setForm(null)}
      >
        <DialogContent className="admin-product-dialog" showCloseButton={false}>
          {form && (
            <ProductForm
              value={form}
              onChange={setForm}
              onSubmit={save}
              submitting={submitting}
              onCancel={() => setForm(null)}
              idToken={analyticsToken}
            />
          )}
        </DialogContent>
      </Dialog>

      {showBulkImport && (
        <BulkImportModal
          idToken={analyticsToken}
          nextIdNum={(() => {
            const ccRecords = records.filter(r => r.id.startsWith("CC"));
            let maxId = 1;
            if (ccRecords.length > 0) {
              const nums = ccRecords.map(r => parseInt(r.id.replace("CC", ""), 10)).filter(n => !isNaN(n));
              if (nums.length > 0) maxId = Math.max(...nums) + 1;
            }
            return maxId;
          })()}
          onClose={() => setShowBulkImport(false)}
          onComplete={async () => {
            setShowBulkImport(false);
            const token = localStorage.getItem("admin_app_token") || "";
            const nextRecords = await trpcUtils.catalog.adminProducts.fetch({ token });
            setRecords(nextRecords.map(product => ({ id: product.id, data: product as any })));
          }}
        />
      )}
    </main>
  );
}
