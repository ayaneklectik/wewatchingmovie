# Movie Night — local streaming

The movie stays on your Mac. This app stores it locally, protects viewing with an access code, and supports byte-range video playback (so seeking works).

## Requirements
- macOS
- Node.js 18+
- Cloudflare Tunnel CLI only for remote access

## 1. Start the server on your Mac

In Terminal, enter the project folder and run:

```bash
npm start
```

The server prints an access code. Keep this Terminal window open. Open http://localhost:8080 in your Mac's browser, enter the code, and upload the 3–4 GB movie. Wait until upload completes.

**Upload locally before starting the public tunnel.** This avoids Cloudflare's request-body upload limits for large files.

## 2. Share it remotely

Install cloudflared if needed:

```bash
brew install cloudflared
```

Open a second Terminal window and run:

```bash
cloudflared tunnel --url http://localhost:8080
```

It prints a temporary HTTPS URL ending in `trycloudflare.com`. Send that URL and the access code to your girlfriend. She opens the URL, enters the code, and presses play. She does not need to upload or provide a separate movie link.

## Keep in mind
- Keep both Terminal windows open; keep the Mac awake and online throughout viewing.
- The temporary URL changes when the tunnel restarts.
- The movie is stored in `movie-data/` and that folder is ignored by Git.
- MP4 with H.264 video and AAC audio has the best browser compatibility. MKV/AVI files may not play in all browsers.
- Single-upload limit is 5 GiB.
- Only share content you have permission to share.
