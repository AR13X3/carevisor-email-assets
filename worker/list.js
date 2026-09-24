import { json, config, gh, cdnUrl, IMAGE_RE, IMAGE_DIR } from "./shared.js";

// Lists what is currently in images/ on the default branch, plus the head commit
// SHA that the CDN URLs are pinned to.
//
// This proxies GitHub with the server-side token rather than letting the browser
// call the API directly: unauthenticated GitHub requests are capped at 60/hour
// per IP, which a shared office connection would burn through quickly.
export async function handleList(env) {
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
    return json({ error: describeGitHubError(headRes.status, repo) }, 502);
  }
  const sha = (await headRes.json()).sha;

  const listRes = await fetch(
    `https://api.github.com/repos/${repo}/contents/${IMAGE_DIR}?ref=${branch}`,
    { headers }
  );
  if (listRes.status === 404) return json({ sha, repo, files: [] });
  if (!listRes.ok) {
    return json({ error: describeGitHubError(listRes.status, repo) }, 502);
  }

  const files = (await listRes.json())
    .filter((f) => f.type === "file" && IMAGE_RE.test(f.name))
    .map((f) => ({ name: f.name, size: f.size, url: cdnUrl(repo, sha, f.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return json({ sha, repo, files });
}

// The raw status codes are useless to whoever is looking at the page, and the
// two likely causes here have very different fixes.
function describeGitHubError(status, repo) {
  if (status === 401) return "The GitHub token is invalid or expired. It needs replacing.";
  if (status === 403) return "The GitHub token lacks access to this repository, or the rate limit was hit.";
  if (status === 404) return `Repository ${repo} was not found, or the token cannot see it.`;
  return `GitHub returned ${status}.`;
}
