export default function handler(req: any, res: any) {
  // Trigger vercel webhook
  res.status(200).json({ ok: true, message: "Test route is working!" });
}
