import axios from "axios";
import fs from "fs";

const resolveUrl = async (rawUrl) => {
  try {
    const res = await axios.get(rawUrl, {
      maxRedirects: 10,
      validateStatus: () => true,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-IN,en-US;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      timeout: 15000,
    });
    console.log("Resolved URL:", res.request?.res?.responseUrl || rawUrl);
    console.log("Status:", res.status);
    console.log("Data sample:", typeof res.data === "string" ? res.data.substring(0, 300) : Object.keys(res.data));
    
    // check if it has a title
    const titlePatterns = [
      /<span[^>]+id="productTitle"[^>]*>\s*([\s\S]*?)\s*<\/span>/i,
      /<title>(.*?) - Amazon/i,
      /<title>(.*?)<\/title>/i,
    ];
    let title = "";
    const html = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
    fs.writeFileSync("test-output.html", html);
    for (const p of titlePatterns) {
      const m = html.match(p);
      if (m?.[1]) { title = m[1].replace(/<[^>]+>/g, "").trim(); break; }
    }
    console.log("Title extracted:", title);
  } catch (err) {
    console.error("Error:", err.message);
  }
};

const run = async () => {
  await resolveUrl("https://www.amazon.in/dp/B0BQRJ3C47");
};
run();
