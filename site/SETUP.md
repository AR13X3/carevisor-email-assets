# Asset library — setup

One-time setup for the upload page in `site/`. Takes about 15 minutes.
Everything here is free and needs no payment method.

There are two steps you must do yourself, because they involve your accounts:
creating a GitHub token, and pasting it into Cloudflare.

---

## 1. Create a GitHub token

The upload page commits on your behalf, so it needs a token. Scope it to this
one repository only — if it ever leaks, the damage is limited to a public repo
that contains nothing sensitive.

1. Go to <https://github.com/settings/personal-access-tokens/new>
2. **Token name:** `carevisor-asset-library`
3. **Expiration:** 1 year (or "No expiration" if you'd rather not revisit it —
   see the note at the bottom)
4. **Repository access:** *Only select repositories* → `carevisor-email-assets`
5. **Permissions** → *Repository permissions* → **Contents: Read and write**
   (leave everything else alone)
6. Generate, then copy the token. **You cannot view it again.**

Do not paste the token into chat, a file, or a commit. It goes straight into
Cloudflare in step 2.

---

## 2. Create the Cloudflare Pages project

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**
2. Authorise GitHub and pick `carevisor-email-assets`
3. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave empty)*
   - **Build output directory:** `site`
4. **Save and Deploy**

Then add the token:

5. Project → **Settings** → **Variables and Secrets** → **Add**
6. Type **Secret** — not Text, which stays readable in the dashboard. Name it
   `GITHUB_TOKEN`, value = the token from step 1. Apply it to **Production**
   (and Preview as well, if you will use preview URLs).
7. **Deployments** → **Retry deployment** on the most recent one.

Step 7 is not optional. Pages binds secrets into a deployment when it builds,
rather than reading them per request, so a secret added after the last build
stays invisible to the running site until something redeploys. The symptom is
`GITHUB_TOKEN secret is not set` even though the dashboard clearly shows it.

Optional variables, if you ever move things:

| Name | Default |
|---|---|
| `REPO` | `AR13X3/carevisor-email-assets` |
| `BRANCH` | `main` |

---

## 3. Lock it down — do not skip this

Until you do this, **anyone who finds the URL can commit to your repo.**

1. Cloudflare dashboard → **Zero Trust** → **Access** → **Applications** →
   **Add an application** → **Self-hosted**
2. **Application domain:** your `*.pages.dev` hostname
3. Add a policy:
   - **Action:** Allow
   - **Include:** *Emails ending in* → `@carevisor.com.au`
     (or *Emails* → list each person individually)
4. Save

Your team then visits the page, types their work email, receives a 6-digit code,
and is in. No account, no password.

The upload endpoint also refuses any request without the header Access injects,
so the API is not reachable even if someone finds its URL directly.

---

## 4. Test it

1. Open the `pages.dev` URL in a private window — you should be asked to sign in
2. Sign in, upload a small test image
3. Confirm it appears in the gallery and that **Copy link** gives a working URL
4. Paste that URL into a browser tab and check the image loads

---

## Notes

**Uploads trigger a rebuild.** Every upload commits to `main`, which makes
Cloudflare rebuild the site. Harmless, but it burns build quota. To avoid it:
Settings → Builds → **Build watch paths** → include only `site/*`.

**Links are pinned to a commit.** Uploading returns a URL containing the commit
SHA, so it is immutable — the image behind a link sent to recipients can never
change. This is why filenames are never overwritten; a clashing name gets a
numeric suffix instead.

**If the token expires,** uploads start failing with a GitHub error in the
upload row. Generate a new token and replace the `GITHUB_TOKEN` secret — nothing
else changes.

**The repo must stay public.** jsDelivr only serves public repositories. Making
it private breaks every image in every email already sent.
