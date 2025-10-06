| Path | Line snippet | Decision |
| --- | --- | --- |
| backend/cors-config.json:6 | `"https://2zxcc0-tx.myshopify.com"` | Change – Update allowlist to `https://ehwnpu-nk.myshopify.com` so uploads originate from the live store. |
| backend/.shopify/project.json:1 | `{"shop":"2zxcc0-tx.myshopify.com"...}` | Change – Shopify CLI context must target `ehwnpu-nk.myshopify.com` to deploy/preview against the new shop. |
| backend/shopify.app.toml:4-5 | `name = "moodclip-v3"`, `handle = "moodclip-v3"` | Change – Align app identity with Partner app `moodclipnewstore-2` to ensure CLI linkage. |
| backend/shopify.app.toml.bak.1757514364:4-5 | `name = "moodclip-v3"`, `handle = "moodclip-v3"` | Keep – Backup artifact not consumed by tooling; document only. |
| backend/package.json:2 | `"name": "moodclip-v2"` | Keep – Package name is legacy branding with no Shopify linkage; leave unchanged. |
| backend/package-lock.json:2 | `"name": "moodclip-v2"` | Keep – Lock file mirrors package name; no store coupling. |
