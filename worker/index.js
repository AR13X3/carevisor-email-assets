import { json } from "./shared.js";
import { handleList } from "./list.js";
import { handleUpload } from "./upload.js";

// Only /api/* reaches this Worker — see run_worker_first in wrangler.jsonc.
// Everything else is served straight from the asset store.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/list") {
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
      return handleList(env);
    }

    if (url.pathname === "/api/upload") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      return handleUpload(request, env);
    }

    // Any other /api path is a mistake, and must still answer with JSON so the
    // page can show the reason rather than failing to parse an HTML error body.
    if (url.pathname.startsWith("/api/")) {
      return json({ error: `No such endpoint: ${url.pathname}` }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};
