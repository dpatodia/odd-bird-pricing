# Odd Bird pricing: going live (about 20 minutes)

Same stack as Dhruv's Exam Center: a website on GitHub Pages, data and logins in Supabase. Until these steps are done the app runs in **demo mode** (sample costs, nothing saved).

## 1. Create the Supabase project
1. supabase.com -> **New project**. Name `odd-bird-pricing`, region **Mumbai (ap-south-1)**, plan Free. The free plan allows two active projects; the Exam Center is one.
2. **Project Settings -> General**: copy the **Project ID**.
3. Avatar -> **Account -> Access Tokens -> Generate new token**. Copy it.

## 2. GitHub token
GitHub -> Settings -> Developer settings -> Fine-grained tokens -> Generate. Permissions: Administration, Contents, Pages, Workflows = Read and write.

## 3. Fill in `.env`
Copy `.env.example` to `.env`. Fill in the two Supabase values, your admin email and password, the teammate logins, and the GitHub token and repo name.

## 4. Deploy
`npm install && bash scripts/deploy.sh` (or ask Claude to run it on this computer).

The script creates the tables and access rules, loads competitor data and your private costs, turns off public sign-ups, creates the logins, and publishes the site at `https://<github-username>.github.io/odd-bird-pricing/`.

## Who can do what
- **Admin (you):** everything, including "Save as team defaults" for costs, fees and targets, and deleting a sales week.
- **Members:** see everything; add or correct weekly sales rows. Their other input changes are what-ifs on their own screen.
- Nobody can sign themselves up. Add a teammate by adding them to `TEAM_LOGINS` and running `bash scripts/deploy.sh supabase`. Remove one in Supabase -> Authentication -> Users.

## Things to know
- **The GitHub repo is public** (free GitHub Pages needs that). It holds code, competitor data read from Amazon.in and published fee rates. It does **not** hold your costs, targets or sales: those are in `private/` (never pushed) and in Supabase behind logins.
- **Weekly data:** `node scripts/push-weekly.mjs weekly/<file>.json` writes a week of competitor, snapshot and sales rows into the database from this computer.
- **Forgot a password:** Supabase -> Authentication -> Users -> the user -> send password recovery.
