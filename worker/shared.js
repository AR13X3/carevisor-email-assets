// Helpers shared by the API routes. Files prefixed with "_" are not routed by
// Cloudflare Pages, so this is importable but never reachable over HTTP.

export const CDN = "https://cdn.jsdelivr.net/gh";
export const IMAGE_DIR = "images";
export const MAX_BYTES = 10 * 1024 * 1024; // 10MB; newsletter images are far smaller

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export function config(env) {
  const repo = env.REPO || "AR13X3/carevisor-email-assets";
  const branch = env.BRANCH || "main";
  if (!env.GITHUB_TOKEN) throw new Error("GITHUB_TOKEN secret is not set");
  return { repo, branch, token: env.GITHUB_TOKEN };
}

export function gh(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    // GitHub rejects API calls without a User-Agent
    "User-Agent": "carevisor-asset-library",
  };
}

// Pin the URL to the commit rather than a branch: branch URLs can take hours to
// pick up a new file, while a commit SHA resolves immediately and never changes.
export function cdnUrl(repo, sha, name) {
  return `${CDN}/${repo}@${sha}/${IMAGE_DIR}/${name}`;
}

// Non-technical users paste in filenames with spaces, capitals and apostrophes.
// Percent-encoding those makes for ugly, easily-broken URLs, so normalise hard.
export function safeName(raw) {
  const dot = raw.lastIndexOf(".");
  let stem = dot > 0 ? raw.slice(0, dot) : raw;
  let ext = dot > 0 ? raw.slice(dot + 1) : "";

  stem = stem
    .toLowerCase()
    // Decompose accents and drop the combining marks, so "ålesund" becomes
    // "alesund" rather than losing the character entirely.
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  ext = ext.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (ext === "jpeg") ext = "jpg";

  return ext ? `${stem || "image"}.${ext}` : stem || "image";
}

// Workers blow the call stack on String.fromCharCode(...hugeArray), so chunk it.
export function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export const IMAGE_RE = /\.(png|jpe?g|gif|webp|svg)$/i;
