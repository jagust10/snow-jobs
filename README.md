# ServiceNow Job Finder

Next.js App Router app for searching normalized ServiceNow jobs across multiple providers.

## Run Locally

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

If `npm` is not available on this machine, use the dependency-free fallback server:

```powershell
node local-server.cjs
```

## Deploy To A Website

The easiest deployment path is Vercel:

1. Push this folder to a GitHub repository.
2. Go to `https://vercel.com/new`.
3. Import the repository.
4. Keep the default Next.js settings.
5. Add environment variables if you want USAJOBS live results:
   - `USAJOBS_API_KEY`
   - `USAJOBS_USER_AGENT`
6. Click Deploy.

Vercel will give you a public URL like:

```text
https://your-project-name.vercel.app
```

## Provider Notes

LinkedIn, Indeed, and ZipRecruiter are mocked until approved APIs or feeds are configured.
Dice and Built In are best-effort live page readers and may return provider notes if their markup blocks parsing.
USAJOBS uses the official API and requires credentials.
