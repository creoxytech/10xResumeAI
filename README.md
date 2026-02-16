# 10xResumeAI (React + Supabase Google Login)

## Run locally
```powershell
npm install
npm run dev
```

Open the URL shown by Vite (usually `http://localhost:5173`).

## Environment
This project uses `.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Supabase setup required
1. In Supabase: Authentication -> Providers -> Google -> Enable.
2. In Supabase: Authentication -> URL Configuration:
   - Add `http://localhost:5173` to Redirect URLs.
3. In Google Cloud OAuth client:
   - Add Supabase callback URL from your Supabase Google provider settings.

## Notes
- Login method is Google OAuth only.
- Landing and login are on a single minimal page.
