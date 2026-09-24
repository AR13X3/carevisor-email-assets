import { json, config, gh, cdnUrl, IMAGE_RE, IMAGE_DIR } from "../_shared.js";

// Lists what is currently in images/ on the default branch, along with the head
// commit SHA that the CDN URLs are pinned to.
//
// This proxies GitHub with the server-side token rather than letting the browser
// call the API directly: unauthenticated GitHub requests are capped at 60/hour
// per IP, which a shared office connection would burn through quickly.
export async function onRequestGet({ env }) {
  let cfg;
  try {
    cfg = config(env);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
  const { repo, branch, token } = cfg;
  const headers = gh(token);

  const headRes = await fetch(`https://api.github.com/repos/${repo}/commits/${branch}`, { headers });
  if (!headRes.ok) {
    return json({ error: `Could not read ${repo} (${headRes.status})` }, 502);
  }
  const sha = (await headRes.json()).sha;

  const listRes = await fetch(
    `https://api.github.com/repos/${repo}/contents/${IMAGE_DIR}?ref=${branch}`,
    { headers }
  );
  if (listRes.status === 404) return json({ sha, files: [] });
  if (!listRes.ok) {
    return json({ error: `Could not list images (${listRes.status})` }, 502);
  }

  const files = (await listRes.json())
    .filter((f) => f.type === "file" && IMAGE_RE.test(f.name))
    .map((f) => ({ name: f.name, size: f.size, url: cdnUrl(repo, sha, f.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return json({ sha, repo, files });
}
