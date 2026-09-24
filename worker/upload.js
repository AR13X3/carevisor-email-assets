import {
  json, config, gh, cdnUrl, safeName, toBase64,
  MAX_BYTES, IMAGE_RE, IMAGE_DIR,
} from "./shared.js";

// Commits an uploaded image to the repo and returns its CDN URL.
//
// The team never authenticates to GitHub: Cloudflare Access gates the site, and
// this Worker holds the only token. Access injects the verified email header
// below, which an outside caller cannot set while Access is enforced.
export async function handleUpload(request, env) {
  const email = request.headers.get("Cf-Access-Authenticated-User-Email");
  if (!email && env.REQUIRE_ACCESS !== "false") {
    return json({ error: "Not signed in. Reload the page and sign in again." }, 403);
  }

  let cfg;
  try {
    cfg = config(env);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
  const { repo, branch, token } = cfg;
  const headers = gh(token);

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Could not read the upload." }, 400);
  }

  const file = form.get("file");
  if (!file || typeof file === "string") return json({ error: "No file was attached." }, 400);
  if (file.size === 0) return json({ error: "That file is empty." }, 400);
  if (file.size > MAX_BYTES) {
    return json(
      { error: `That file is ${(file.size / 1048576).toFixed(1)}MB. The limit is 10MB.` },
      400
    );
  }

  const name = safeName(file.name || "image");
  if (!IMAGE_RE.test(name)) {
    return json({ error: "Only PNG, JPG, GIF, WEBP and SVG files can be uploaded." }, 400);
  }

  // Never overwrite: existing URLs are pinned to old commits and must keep
  // resolving, so a clashing name gets a numeric suffix instead.
  const finalName = await findFreeName(repo, branch, headers, name);

  const body = {
    message: `Add ${finalName}\n\nUploaded via the asset library by ${email || "unknown"}.`,
    content: toBase64(await file.arrayBuffer()),
    branch,
  };

  const putRes = await fetch(
    `https://api.github.com/repos/${repo}/contents/${IMAGE_DIR}/${finalName}`,
    {
      method: "PUT",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!putRes.ok) {
    const detail = await putRes.text();
    console.error("upload failed", putRes.status, detail);
    let msg;
    if (putRes.status === 409) msg = "Someone else uploaded at the same moment. Please try again.";
    else if (putRes.status === 401) msg = "The GitHub token is invalid or expired.";
    else if (putRes.status === 403) msg = "The GitHub token cannot write to this repository.";
    else msg = `GitHub rejected the upload (${putRes.status}).`;
    return json({ error: msg }, 502);
  }

  const result = await putRes.json();
  const sha = result.commit?.sha;
  if (!sha) return json({ error: "Upload succeeded but no commit was returned." }, 502);

  return json({
    name: finalName,
    size: file.size,
    url: cdnUrl(repo, sha, finalName),
    sha,
  });
}

async function findFreeName(repo, branch, headers, name) {
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";

  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? name : `${stem}-${i + 1}${ext}`;
    const res = await fetch(
      `https://api.github.com/repos/${repo}/contents/${IMAGE_DIR}/${candidate}?ref=${branch}`,
      { headers }
    );
    if (res.status === 404) return candidate;
  }
  return `${stem}-${Date.now()}${ext}`;
}
