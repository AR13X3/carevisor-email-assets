# CareVisor Email Assets

Image assets for CareVisor email newsletters, served over the jsDelivr CDN.

## Usage

Files in `images/` are available at:

```
https://cdn.jsdelivr.net/gh/AR13X3/carevisor-email-assets@v1/images/<filename>
```

Current assets:

| File | Dimensions | Purpose |
|------|-----------|---------|
| `carevisor-original-logo.png` | 1388x1388 | Header logo mark |
| `carevisor-sydney-event.jpg` | 1200x900 | Able Meet Sydney Inner West event photo |

## Why jsDelivr, and why a version tag

GitHub `raw.githubusercontent.com` URLs are served with headers that many email
clients block or rewrite. jsDelivr serves the same files from a CDN with
cache-friendly headers that email clients handle reliably.

URLs are pinned to the `v1` tag rather than `@main`. A `@main` URL resolves to
whatever the branch currently points at and is cached by the CDN for up to 7
days, so replacing an image under the same filename can serve stale content to
recipients. A tag is immutable: to change an asset, add the new file and cut a
new tag.

## Note on image preparation

Photos are resized to 2x their display width and stripped of EXIF metadata
before being committed, since this repository is public.
