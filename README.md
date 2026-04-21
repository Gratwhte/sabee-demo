# Sabee — Team Days Off (beta v5.2.1)

## What's in this folder

```
sabee/
├── netlify.toml              ← Netlify project config
├── package.json              ← Dependencies (Netlify Blobs SDK)
├── README.md                 ← You are here
├── public/
│   └── index.html            ← The entire Sabee frontend
└── netlify/
    └── functions/
        └── data.mjs          ← The entire backend (1 file)
```

## How to deploy

### Option A: GitHub → Netlify (recommended)

1. Push this folder to a GitHub repository
2. Go to https://app.netlify.com
3. Click "Add new site" → "Import an existing project"
4. Select your GitHub repo
5. Netlify auto-detects the config — just click "Deploy site"
6. Wait ~60 seconds for build
7. Your site is live at `https://your-site-name.netlify.app`

### Option B: Drag-and-drop (quick test)

> ⚠ This deploys only the static files. The backend function
> requires a Git-based deploy or the Netlify CLI.

For a working backend, use the CLI:

```bash
npm install -g netlify-cli
cd sabee
npm install
netlify login
netlify init        # Link to a new site
netlify deploy --prod
```

## How it works

- **Frontend**: Single HTML file with vanilla JS
- **Backend**: One Netlify Function (`/api/data`) using Netlify Blobs for storage
- **Storage**: Netlify Blobs (built-in key-value store, free tier included)
- **Sync**: Frontend polls every 5 seconds for changes from other users
- **Fallback**: localStorage keeps the app usable if API is unreachable

## Netlify Blobs — what you need to know

Netlify Blobs is a built-in key-value store that comes with every Netlify site.
No setup required — it works automatically when deployed to Netlify.

Free tier limits (more than enough):
- Storage: included with site
- Reads/writes: no hard limit on free tier for reasonable usage

The backend stores one JSON document containing all team data.
This is fine for a small team. For a larger deployment you would
want per-member documents and proper auth.

## Local development

```bash
npm install
npx netlify dev
```

This starts a local server with function emulation at `http://localhost:8888`.
Netlify Blobs works in dev mode using a local file store.
