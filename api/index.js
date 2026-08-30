export default async function handler(req, res) {
  try {
    const { default: app } = await import("../dist-server/api.js");
    return app(req, res);
  } catch (err) {
    console.error("Vercel dynamic import failed:", err);
    res.status(500).json({ error: "Boot failed", details: String(err) });
  }
}
