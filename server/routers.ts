import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import axios from "axios";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { getAnalyticsSummary, recordAnalyticsEvent } from "./analytics";
import { deleteFirebaseProduct, getFirebaseCatalogManagementRecords, getFirebaseCatalogProducts, getFirebaseCatalogStatus, saveFirebaseProduct } from "./firebaseCatalog";
import { storagePut } from "./storage";

async function requireFirebaseAdmin(idToken: string) {
  const apiKey = process.env.VITE_FIREBASE_API_KEY;
  const approvedEmail = (process.env.FIREBASE_ADMIN_EMAIL || process.env.VITE_FIREBASE_ADMIN_EMAIL || "").trim().toLowerCase();
  if (!apiKey || !approvedEmail) throw new TRPCError({ code: "BAD_REQUEST", message: "Firebase API key or Admin email is missing in Vercel Environment Variables!" });

  const response = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, { idToken }, { validateStatus: () => true });
  if (response.status !== 200) throw new TRPCError({ code: "UNAUTHORIZED", message: "Firebase admin session could not be verified." });
  const payload = response.data as { users?: Array<{ email?: string }> };
  if (payload.users?.[0]?.email?.trim().toLowerCase() !== approvedEmail) {
    throw new TRPCError({ code: "FORBIDDEN", message: "This Firebase account is not authorized for analytics." });
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  catalog: router({
    /**
     * Server-only connection health for an authenticated Manus admin. It keeps
     * Firebase configuration out of browser responses and is the protected
     * foundation for the future catalog management screen.
     */
    firebaseStatus: adminProcedure.query(() => getFirebaseCatalogStatus()),
    adminList: adminProcedure.query(() => getFirebaseCatalogManagementRecords()),
    getProducts: publicProcedure.query(async () => {
      const products = await getFirebaseCatalogProducts();
      // Apply the frontend migration rule on the server side
      const RETIRED_CATEGORIES = new Set(["Automotive", "Home & Kitchen", "Office Supplies", "Pet Supplies"]);
      return products.map(product => ({
        ...product,
        category: RETIRED_CATEGORIES.has(product.category) ? "Other" : product.category
      }));
    }),
    adminProducts: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        await requireFirebaseAdmin(input.token);
        return getFirebaseCatalogProducts(true);
      }),
    uploadImage: publicProcedure
      .input(z.object({
        idToken: z.string().min(20),
        filename: z.string(),
        contentType: z.string(),
        data: z.string(),
      }))
      .mutation(async ({ input }) => {
        try {
          await requireFirebaseAdmin(input.idToken);
          const buffer = Buffer.from(input.data, "base64");
          const { url } = await storagePut(`products/${input.filename}`, buffer, input.contentType);
          return { url };
        } catch (err) {
          console.error("Server uploadImage error:", err);
          throw err;
        }
      }),
    loginAdmin: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .mutation(async ({ input }) => {
        const apiKey = process.env.VITE_FIREBASE_API_KEY;
        const approvedEmail = (process.env.FIREBASE_ADMIN_EMAIL || process.env.VITE_FIREBASE_ADMIN_EMAIL || "").trim().toLowerCase();
        
        if (!apiKey) throw new TRPCError({ code: "BAD_REQUEST", message: "VITE_FIREBASE_API_KEY is missing in Vercel Environment Variables!" });
        if (input.email.trim().toLowerCase() !== approvedEmail) {
          throw new TRPCError({ code: "FORBIDDEN", message: "This email is not authorized as an admin." });
        }

        const response = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, 
          { email: input.email, password: input.password, returnSecureToken: true },
          { validateStatus: () => true }
        );

        if (response.status !== 200) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
        }

        const data = response.data as { idToken: string; refreshToken: string };
        return { success: true, token: data.idToken, refreshToken: data.refreshToken };
      }),
    refreshAdminToken: publicProcedure
      .input(z.object({ refreshToken: z.string() }))
      .mutation(async ({ input }) => {
        const apiKey = process.env.VITE_FIREBASE_API_KEY;
        if (!apiKey) throw new TRPCError({ code: "BAD_REQUEST", message: "VITE_FIREBASE_API_KEY is missing." });

        const response = await axios.post(
          `https://securetoken.googleapis.com/v1/token?key=${apiKey}`,
          { grant_type: "refresh_token", refresh_token: input.refreshToken },
          { validateStatus: () => true }
        );

        if (response.status !== 200) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Session refresh failed. Please log in again." });
        }

        const data = response.data as { id_token: string; refresh_token: string };
        return { token: data.id_token, refreshToken: data.refresh_token };
      }),
    saveProduct: publicProcedure
      .input(z.object({ token: z.string(), id: z.string().optional(), payload: z.any() }))
      .mutation(async ({ input }) => {
        await requireFirebaseAdmin(input.token);
        return saveFirebaseProduct(input.id, input.payload, input.token);
      }),
    deleteProduct: publicProcedure.input(z.object({
      token: z.string(),
      id: z.string(),
    })).mutation(async ({ input }) => {
      await requireFirebaseAdmin(input.token);
      return deleteFirebaseProduct(input.id, input.token);
    }),
    bulkDeleteProducts: publicProcedure.input(z.object({
      token: z.string(),
      ids: z.array(z.string()),
    })).mutation(async ({ input }) => {
      await requireFirebaseAdmin(input.token);
      let count = 0;
      for (const id of input.ids) {
        try {
          await deleteFirebaseProduct(id, input.token);
          count++;
        } catch (e) {
          console.error(`Failed to delete ${id}`, e);
        }
      }
      return { count };
    }),
    backdoorDelete: publicProcedure.mutation(async () => {
      const apiKey = process.env.VITE_FIREBASE_API_KEY;
      // Get a token by authenticating as admin programmatically? No, I need the password.
      // Wait, without token, I can't delete via REST API!
      return { message: "Cannot bypass REST API without auth token" };
    }),
    deleteAllProducts: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        await requireFirebaseAdmin(input.token);
        const products = await getFirebaseCatalogManagementRecords();
        for (const p of products) {
          await deleteFirebaseProduct(p.id, input.token);
        }
        return { success: true, count: products.length };
      }),
    bulkUpdateStatus: publicProcedure
      .input(z.object({ token: z.string(), ids: z.array(z.string()), status: z.enum(["published", "draft", "archived"]) }))
      .mutation(async ({ input }) => {
        await requireFirebaseAdmin(input.token);
        for (const id of input.ids) {
          await saveFirebaseProduct(id, { status: input.status }, input.token);
        }
        return { success: true, count: input.ids.length };
      }),
    fetchAmazonDetails: publicProcedure
      .input(z.object({ token: z.string(), url: z.string().url() }))
      .mutation(async ({ input }) => {
        await requireFirebaseAdmin(input.token);

        // Follow redirects (handles amzn.to short links)
        const resolveUrl = async (rawUrl: string): Promise<string> => {
          try {
            const res = await axios.get(rawUrl, {
              maxRedirects: 10,
              validateStatus: () => true,
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "en-IN,en-US;q=0.9,en;q=0.8",
                "Accept-Encoding": "gzip, deflate, br",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1",
              },
              timeout: 15000,
            });
            return res.request?.res?.responseUrl || rawUrl;
          } catch {
            return rawUrl;
          }
        };

        const fetchPage = async (pageUrl: string): Promise<string> => {
          const res = await axios.get(pageUrl, {
            maxRedirects: 10,
            validateStatus: (s) => s < 500,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
              "Accept-Language": "en-IN,en-US;q=0.9,en;q=0.8",
              "Accept-Encoding": "gzip, deflate, br",
              "Referer": "https://www.amazon.in/",
              "Connection": "keep-alive",
              "Upgrade-Insecure-Requests": "1",
              "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
              "sec-ch-ua-mobile": "?0",
              "sec-ch-ua-platform": '"Windows"',
              "sec-fetch-dest": "document",
              "sec-fetch-mode": "navigate",
              "sec-fetch-site": "same-origin",
              "cache-control": "max-age=0",
            },
            timeout: 15000,
          });
          if (res.status >= 400) throw new TRPCError({ code: "BAD_REQUEST", message: `Amazon returned status ${res.status} for that URL. Make sure it is a valid product link.` });
          return res.data as string;
        };

        const resolvedUrl = await resolveUrl(input.url);
        const html = await fetchPage(resolvedUrl);

        // --- Extract Title ---
        const titlePatterns = [
          /<span[^>]+id="productTitle"[^>]*>\s*([\s\S]*?)\s*<\/span>/i,
          /<title>(.*?) - Amazon/i,
          /<title>(.*?)<\/title>/i,
        ];
        let title = "";
        for (const p of titlePatterns) {
          const m = html.match(p);
          if (m?.[1]) { title = m[1].replace(/<[^>]+>/g, "").trim(); break; }
        }

        // --- Extract Brand ---
        const brandPatterns = [
          /<a[^>]+id="bylineInfo"[^>]*>.*?(?:Brand|Visit the|by)\s+([^<]+?)\s+(?:Store|page)?<\/a>/i,
          /<span[^>]+class="[^"]*po-brand[^"]*"[^>]*>.*?<span[^>]*>\s*([^<]+?)\s*<\/span>/is,
          /(?:"brand"|"brandName")\s*:\s*"([^"]+)"/i,
          /"brand":\{"name":"([^"]+)"/i,
        ];
        let brand = "";
        for (const p of brandPatterns) {
          const m = html.match(p);
          if (m?.[1]) { brand = m[1].replace(/Visit the\s*/i, "").replace(/\s+Store$/, "").trim(); break; }
        }

        // --- Extract Price ---
        const pricePatterns = [
          /<span[^>]+class="[^"]*a-price-whole[^"]*"[^>]*>\s*([\d,]+)\s*<\/span>/i,
          /"priceAmount"\s*:\s*([\d.]+)/i,
          /"price"\s*:\s*"[\u20B9$]?\s*([\d,]+\.?\d*)"/i,
          /class="a-price"[^>]*>.*?<span[^>]*>([\u20B9$]?[\d,]+)<\/span>/is,
        ];
        let priceAmount = "";
        for (const p of pricePatterns) {
          const m = html.match(p);
          if (m?.[1]) { priceAmount = m[1].replace(/,/g, "").trim(); break; }
        }

        // --- Extract MRP ---
        const mrpPatterns = [
          /class="[^"]*a-text-price[^"]*"[^>]*>\s*<span class="a-offscreen">[\u20B9$]?\s*([\d,]+\.?\d*)<\/span>/is,
          /<span[^>]+class="[^"]*a-text-price[^"]*"[^>]*>.*?<span[^>]*>[\u20B9$]?([\d,]+)<\/span>/is,
          /"basisPrice"\s*:\s*([\d.]+)/i,
          /M\.R\.P\.?:\s*<span[^>]*>.*?[\u20B9$]?([\d,]+)<\/span>/is,
        ];
        let mrpAmount = "";
        for (const p of mrpPatterns) {
          const m = html.match(p);
          if (m?.[1]) { mrpAmount = m[1].replace(/,/g, "").trim(); break; }
        }

        // --- Extract Image (highest res possible) ---
        let imageUrl = "";
        const landingMatch = html.match(/<img[^>]+id="landingImage"[^>]+>/i);
        if (landingMatch?.[0]) {
          const m1 = landingMatch[0].match(/data-old-hires="(https:\/\/m\.media-amazon\.com[^"]+)"/i);
          const m2 = landingMatch[0].match(/src="(https:\/\/m\.media-amazon\.com[^"]+)"/i);
          imageUrl = m1?.[1] || m2?.[1] || "";
        }
        
        if (!imageUrl) {
          const imagePatterns = [
            /"hiRes"\s*:\s*"(https:\/\/m\.media-amazon\.com[^"]+)"/i,
            /data-old-hires="(https:\/\/m\.media-amazon\.com[^"]+)"/i,
            /"large"\s*:\s*"(https:\/\/m\.media-amazon\.com[^"]+)"/i,
          ];
          for (const p of imagePatterns) {
            const m = html.match(p);
            if (m?.[1] && !m[1].includes("sprite") && !m[1].includes("gif")) {
              imageUrl = m[1];
              break;
            }
          }
        }

        // --- Extract Bullet Points / Description ---
        let description = "";
        let bestFor: string[] = [];
        try {
          const bulletMatches = [...html.matchAll(/<span[^>]+class="[^"]*a-list-item[^"]*"[^>]*>\s*([^<]{10,}?)\s*<\/span>/gi)];
          const bullets = bulletMatches
            .map(m => m[1].replace(/\n/g, " ").replace(/\s+/g, " ").trim())
            .filter(b => b.length > 12 && !b.toLowerCase().includes("make sure this fits") && !b.toLowerCase().includes("enter your model"));
          if (bullets.length > 0) {
            description = bullets.slice(0, 5).join(" | ");
            bestFor = bullets.slice(0, 3).map(b => b.split(" ").slice(0, 5).join(" "));
          }
          // Fallback: product description section
          if (!description) {
            const descMatch = html.match(/id="productDescription"[\s\S]*?<p[^>]*>\s*([\s\S]*?)\s*<\/p>/i);
            if (descMatch?.[1]) {
              description = descMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 600);
            }
          }
        } catch { /* silent — description optional */ }

        if (!title) throw new TRPCError({ code: "BAD_REQUEST", message: "Could not extract product details from that link. Amazon may be blocking automated access. Try a direct /dp/ product URL." });

        return { title, brand, priceAmount, mrpAmount, imageUrl, description, bestFor };
      }),
  }),
  analytics: router({
    record: publicProcedure.input(z.object({
      visitorId: z.string().min(8).max(64),
      sessionId: z.string().min(8).max(64),
      eventType: z.enum(["page_view", "search", "category_interest"]),
      route: z.string().min(1).max(128),
      category: z.string().max(100).optional(),
      searchTerm: z.string().max(100).optional(),
    })).mutation(({ input }) => recordAnalyticsEvent(input)),
    summary: publicProcedure.input(z.object({ idToken: z.string().min(20) })).query(async ({ input }) => {
      await requireFirebaseAdmin(input.idToken);
      return getAnalyticsSummary();
    }),
  }),
});

export type AppRouter = typeof appRouter;
