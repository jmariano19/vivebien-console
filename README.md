# ViveBien Dashboard - Local Development

## Prerequisites

1. **Node.js 18+** - Download from https://nodejs.org/
2. **A code editor** - VS Code recommended: https://code.visualstudio.com/

## Quick Start

### 1. Install Dependencies

Open terminal in this folder and run:

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your database credentials (see options below).

### 3. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

**That's it!** Changes you make to the code will automatically refresh in the browser.

---

## Database Connection Options

### Option A: Connect to Easypanel Database (Recommended)

To connect locally to your Easypanel database, you need to expose the postgres port:

1. Go to Easypanel → **postgress** service → **Expose**
2. Enable port exposure (port 5432)
3. Note the external URL/IP

Then in `.env.local`:
```
DATABASE_URL=postgres://postgres:bd894cefacb1c52998f3@YOUR_SERVER_IP:5432/projecto-1
DB_SCHEMA=test
```

Replace `YOUR_SERVER_IP` with your Easypanel server IP (85.209.95.19)

### Option B: Use Mock Data (No database needed)

For UI-only development, you can use mock data. Set in `.env.local`:
```
USE_MOCK_DATA=true
```

This shows sample patients without needing database access.

---

## Project Structure

```
vivebien-dashboard/
├── app/                    # Next.js pages and components
│   ├── page.tsx           # Home page (patient list)
│   ├── layout.tsx         # Header, navigation
│   ├── patient/[id]/      # Patient detail pages
│   └── api/               # API routes
├── lib/
│   └── db.ts              # Database connection
├── public/                # Static files (logo, favicon)
├── .env.local             # Your local environment (not committed)
└── package.json           # Dependencies
```

---

## Common Tasks

### Change the Logo
Replace `public/logo.png` with your new logo.

### Change Colors
Edit `app/globals.css` - look for CSS variables at the top.

### Add a New Page
Create a new folder in `app/` with a `page.tsx` file.

### Modify Patient List
Edit `app/page.tsx`

### Modify Patient Detail
Edit `app/patient/[id]/page.tsx` and `PatientTabs.tsx`

---

## Deployment

When you're happy with your changes:

### Deploy to Staging

1. Create a zip of this folder (excluding node_modules):
   ```bash
   # On Mac/Linux:
   zip -r vivebien-dashboard.zip . -x "node_modules/*" -x ".env.local" -x ".git/*"
   
   # Or use your file manager to create a zip, excluding node_modules
   ```

2. Upload to Easypanel → vivebien-staging → Source
3. Select "Dockerfile" and Deploy
4. Test at staging.vivebien.io

### Deploy to Production

1. Upload same zip to Easypanel → vivebien-console → Source
2. Deploy
3. Verify at patients.vivebien.io

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@host:5432/db` |
| `DB_SCHEMA` | Database schema to use | `test` or `public` |
| `USE_MOCK_DATA` | Use fake data (no DB needed) | `true` or `false` |

---

## Troubleshooting

### "Cannot connect to database"
- Check DATABASE_URL is correct
- Make sure postgres port is exposed in Easypanel
- Try `USE_MOCK_DATA=true` to test without database

### "Module not found"
Run `npm install` again

### "Port 3000 already in use"
Another app is using the port. Either close it or run:
```bash
npm run dev -- -p 3001
```

---

## Need Help?

Ask Claude to help modify the code! Share what you want to change and I can update the files for you.
