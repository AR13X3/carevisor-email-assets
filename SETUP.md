# Asset library — setup

The upload page at `public/index.html`, served by the Worker in `worker/`.
Everything here is free and needs no payment method.

Cloudflare deploys this as a **Worker with static assets**, configured by
`wrangler.jsonc` in the repo root. Pushing to `main` redeploys it automatically.

Two steps need your account, because they involve credentials.

---

## 1. Create the GitHub token

The page commits on your behalf, so it needs a token. Scope it to this one
repository — if it ever leaks, the damage is limited to a public repo holding
nothing sensitive.

1. Go to <https://github.com/settings/personal-access-tokens/new>
2. **Token name:** `carevisor-asset-library`
3. **Expiration:** 1 year, or No expiration
4. **Resource owner:** `AR13X3`
5. **Repository access:** *Only select repositories* → `carevisor-email-assets`
6. **Permissions** → *Repository permissions* → **Contents: Read and write**.
   Leave everything else at No access. Metadata turns read-only by itself; that
   is required.
7. **Generate token**, then copy it. It starts with `github_pat_` and
   **GitHub will never show it to you again.**

Do not paste it into a file, a commit, or a chat window.

---

## 2. Add it to the Worker

The reliable way, run from the repo root:

```sh
npx wrangler secret put GITHUB_TOKEN
```

It reads the Worker name from `wrangler.jsonc`, prompts for the value, and sets
a per-Worker runtime secret. Run `npx wrangler login` first if prompted.

### Or via the dashboard, carefully

**Settings** → the **Variables and Secrets** card → **Add** → type **Secret**,
name `GITHUB_TOKEN`, paste the value → **Deploy**.

> The Settings page carries more than one card named "Variables and Secrets",
> and they are indistinguishable at a glance:
>
> - the one inside the **Builds** section is build-time only. A token placed
>   there is visible to the build process and never to the running Worker, so
>   the page reports `GITHUB_TOKEN secret is not set` while the dashboard
>   plainly shows the secret sitting there.
> - **Bindings → Add** does not offer a plain secret at all. Its closest entry,
>   **Secrets Store**, is account-level storage read as `await env.X.get()`,
>   which is not what this Worker expects.
>
> The card you want is the standalone one on the Settings page, outside both.

Saving rolls out a new version of the Worker. If the page still reports the
token missing, go to **Deployments** and redeploy the latest.

Optional variables, if things ever move:

| Name | Default |
|---|---|
| `REPO` | `AR13X3/carevisor-email-assets` |
| `BRANCH` | `main` |

---

## 3. Lock it down — do not skip this

**Until this is done, anyone with the URL can commit to your repository.**
The `workers.dev` URL is public the moment it is enabled.

1. Dashboard → the Worker → **Access** tab (or Zero Trust → Access →
   Applications → Add → Self-hosted)
2. **Application domain:** your `workers.dev` hostname
3. Policy:
   - **Action:** Allow
   - **Include:** *Emails ending in* → `@carevisor.com.au`, or *Emails* → each
     person listed individually
4. Save

The team then opens the page, types their work email, gets a 6-digit code, and
is in. No account, no password.

The upload endpoint separately refuses any request without the header Access
injects, so the API stays closed even if someone finds its URL directly.

---

## 4. Test

1. Open the URL in a private window — you should be asked to sign in
2. Sign in and upload a small test image
3. Check it appears in the gallery, and that **Copy link** yields a working URL
4. Paste that URL into a browser tab and confirm the image loads

---

## Notes

**Links are pinned to a commit.** Uploading returns a URL containing the commit
SHA, making it immutable — the image behind a link already sent to recipients
can never change. This is also why filenames are never overwritten: a clash gets
a numeric suffix.

**Uploads redeploy the Worker.** Each upload commits to `main`, and the Git
integration rebuilds on every push. Harmless, just noisy in the deployment list.

**If the token expires,** uploads and the gallery start reporting that the token
is invalid. Generate a new one and replace the `GITHUB_TOKEN` secret; nothing
else changes.

**The repo must stay public.** jsDelivr only serves public repositories. Making
it private breaks every image in every email already sent.
