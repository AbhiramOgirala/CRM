# 🛠️ JanSamadhan — Setup & Troubleshooting Guide

## ❌ Error: "Route.post() requires a callback function but got [object Undefined]"

This error means you have an **old version** of one of the backend files.
The new download (`jansamadhan-v2.tar.gz`) has all fixes.

**Fix:** Delete your old `backend/src` folder completely and replace with the new one.

---

## ⚡ Quick Start (Step by Step)

### 1. Extract the archive
```
tar -xzf jansamadhan-v2.tar.gz
cd jansamadhan
```

### 2. Setup Supabase (One-time)
1. Go to https://supabase.com → Create new project (free tier is enough)
2. Go to **SQL Editor** → Run `backend/src/config/schema.sql`
3. Then run `backend/src/config/schema_v2.sql`
4. Go to **Settings → API** → Copy your keys

### 3. Configure Backend
```bash
cd backend
copy .env.example .env        # Windows
# OR
cp .env.example .env          # Mac/Linux
```

Edit `.env` and fill in:
```env
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
JWT_SECRET=any-long-random-string-at-least-32-characters
FRONTEND_URL=http://localhost:3000
```

```bash
npm install
npm run dev
```

✅ Should print:
```
╔══════════════════════════════════════╗
║   🏛️  JanSamadhan API Server         ║
║   Port: 5000                         ║
╚══════════════════════════════════════╝
```

### 4. Configure Frontend
```bash
cd ../frontend
copy .env.example .env        # Windows
npm install
npm start
```

---

## 👤 How to Create User Accounts (All Roles)

### Citizen Registration
Go to http://localhost:3000/register — fill the form normally.
Citizens self-register. No admin required.

### Government Officer Registration
Officers **cannot self-register**. They are created by admins.

**Steps to test:**
1. First register a normal citizen account
2. Go to Supabase → SQL Editor → run:
   ```sql
   UPDATE users SET role = 'super_admin' WHERE email = 'your@email.com';
   ```
3. Now login with that account → you'll land on Admin Dashboard
4. Go to **Admin → Users → Create Officer Account**
5. Fill: Name, Email, Phone, Department, Password
6. Officer can now login at http://localhost:3000/login

### Admin Registration
Same as officer — only super_admins can promote users.
First super_admin must be set via SQL (as above).

---

## 🧪 Testing Each Role

| Role | Login | What you see |
|------|-------|--------------|
| **Citizen** | /login | Dashboard, File complaint, My complaints, Map |
| **Officer** | /login | All complaints (view), own dept queue (manage), resolve with proof photo |
| **Admin** | /login | User management, create officers, analytics, escalated complaints |

### Test Flow:
1. **Citizen** files a complaint → see auto-detected department
2. Try **voice input** (Chrome/Edge only) — speak in Telugu/Hindi
3. **Officer** logs in → sees all complaints → updates own dept complaint
4. Upload proof photo when marking as Resolved
5. **Check Leaderboard** → Citizens / Officers / Area / District tabs

---

## 🏢 Government Portal Features

The government portal is the **same app** accessed with officer/admin credentials:

### Officer Features:
- View ALL complaints (read-only for other departments)
- Update status only for their department's complaints
- Must upload proof photo to resolve
- See SLA deadlines and breach warnings
- Earn points per resolution (priority-based)

### Admin Features:
- Create officer accounts
- Assign officers to departments
- View system-wide analytics with charts
- Manage escalated complaints
- View all leaderboards

---

## 🔺 Auto-Escalation Testing

To test escalation without waiting:
```sql
-- In Supabase SQL Editor — set a complaint's SLA to past time
UPDATE complaints 
SET sla_deadline = NOW() - INTERVAL '1 hour',
    status = 'pending'
WHERE ticket_number = 'CMP-001000';
```
Then wait up to 30 minutes for the scheduler to pick it up,
OR restart the backend (it runs escalation on startup too).

---

## 🎤 Voice Input Setup

Voice input uses the **Web Speech API** — built into the browser.

Requirements:
- Use **Google Chrome** or **Microsoft Edge**
- Allow microphone permission when prompted
- Works for: English, Hindi, Telugu, Tamil, Marathi, Kannada, Gujarati, Bengali, Punjabi

If using Firefox → voice button will show "not supported" message.

---

## 📊 Leaderboard Tabs Explained

| Tab | What it shows | Updates when |
|-----|--------------|--------------|
| Citizens | Top reporters by points | Complaints filed/resolved |
| Officers | Top govt officers by points | Complaints resolved |
| Departments | Top depts this month | Complaints resolved |
| Area-wise | Mandal vs mandal (Kukatpally, Nizampet, etc.) | Complaints resolved with mandal location |
| District-wise | District vs district (Hyd, Warangal, etc.) | Complaints resolved with district location |

---

## 🐛 Common Issues

| Error | Fix |
|-------|-----|
| `Cannot connect to server` | Backend not running. Run `npm run dev` in `/backend` |
| `Missing SUPABASE_URL` | Fill in `.env` file |
| `Invalid email or password` | Check you used lowercase email. Verify user exists in Supabase |
| `Route requires callback` | Old file version — re-extract from `jansamadhan-v2.tar.gz` |
| `Voice not working` | Use Chrome/Edge, allow microphone |
| NLP shows "other" | Description too short, try longer text |

---

## 🗄️ Supabase Table Structure

Key tables to know:
- `users` — all users (citizens, officers, admins)
- `complaints` — all complaints with NLP data
- `complaint_timeline` — audit trail
- `departments` — 12 pre-seeded govt departments
- `states`, `districts`, `talukas`, `mandals` — location hierarchy
- `citizen_leaderboard` — citizen rankings
- `dept_performance` — monthly dept stats
- `area_leaderboard` — area/mandal level rankings

---

## 📞 Test Credentials (After Setup)

Create these via SQL after initial setup:

```sql
-- Make a super admin
UPDATE users SET role = 'super_admin' WHERE email = 'admin@test.com';

-- Check all users
SELECT id, email, full_name, role FROM users ORDER BY created_at DESC;

-- See all complaints
SELECT ticket_number, title, category, status, priority FROM complaints;
```
