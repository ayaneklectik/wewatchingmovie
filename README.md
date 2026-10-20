# Movie Night — Vercel-ready static site

A tiny static website that embeds a Google Drive video preview. The movie file is not stored in this repository or on Vercel.

## Deploy to Vercel
1. Import this GitHub repository into Vercel.
2. Use the default static settings; no build command or environment variables are required.
3. Upload the movie to Google Drive. After processing, set **Share → General access → Anyone with the link → Viewer**.
4. Open the deployed website, paste the Drive sharing link, and select **Watch movie**.
5. Send your girlfriend the website URL and the Drive link.

## Important
- Google Drive playback depends on the file codec, processing, account limits, and network connection.
- Anyone with the shared Drive link may be able to view the movie while link sharing is enabled. Turn link sharing off when finished.
- Keep the movie out of GitHub. Large video files do not belong in the repository.
- This page embeds Google Drive; it does not upload files itself.
