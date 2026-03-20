# 🏛️ JanSamadhan — जन समाधान
## National Smart Civic Grievance Management System

> *"जन की आवाज़, सरकार के द्वार"* — Citizen's Voice at Government's Door

A full-stack, production-ready civic grievance platform for India that connects citizens to government departments for efficient complaint resolution.

---

## 🚀 Features

### 👤 For Citizens
- **Register & Login** with multi-level location (State → Gram Panchayat)
- **File Complaints** with GPS location, photos, and auto-NLP classification
- **Track Status** in real-time with complete audit timeline
- **Get Notifications** at every step (filing → assignment → resolution)
- **Earn Points & Badges** — Newcomer → Contributor → Active Citizen → Champion → Civic Hero
- **Upvote** public complaints to amplify community issues
- **Comment** on complaints and get official responses
- **View Hotspot Map** showing civic issues in your area

### 👮 For Government Officers
- **Department Queue** — see all complaints assigned to their department
- **Update Status** — Assign, In Progress, Resolve, Reject, Escalate
- **Earn Govt Points & Badges** — New Officer → Excellence Award
- **SLA Tracking** — see deadline and breach warnings
- **Dashboard with Stats** — resolution rate, pending queue, monthly trends

### ⚙️ For Admins
- **User Management** — create officers, manage accounts, toggle status
- **Department Assignment** — assign officers to departments
- **System Analytics** — complaints by category, monthly trends, resolution rates
- **Hotspot Map** — geographic problem area identification

### 🤖 NLP & AI (No External APIs)
- **Auto-Classification** — keyword-based TF-IDF NLP using `natural` library
- **14 Categories** — Roads, Water, Electricity, Waste, Drainage, Health, Education, and more
- **Auto-Priority Detection** — detects urgency from description text
- **Sentiment Analysis** — detects complaint tone
- **Duplicate Detection** — geo-proximity + text similarity (Jaccard)
- **Auto-Escalation** — priority increases with duplicate count (3→Medium, 5→High, 10→Critical)
- **Auto-Title Generation** — generates title from description if not provided

### 📍 Location Hierarchy (7 Levels)
```
Country → State → District → Corporation/Municipality → Taluka → Mandal → Gram Panchayat
```

### 🏆 Dual Gamification System
**Citizens:** File Complaint (+10), Upvote Received (+2), Complaint Resolved (+5), Duplicate Verified (+3)

**Government Officers:** Based on complaint priority:
- Critical Resolved: +25 pts + SLA bonus
- High Resolved: +20 pts + SLA bonus
- Medium Resolved: +15 pts + SLA bonus
- Low Resolved: +10 pts + SLA bonus
- Within SLA: +10 bonus pts

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Zustand, Chart.js, Leaflet Maps |
| Backend | Node.js, Express.js |
| Database | Supabase (PostgreSQL) |
| NLP | `natural` (TF-IDF, Tokenizer, Stemmer), Keyword Rules |
| Auth | JWT + bcryptjs |
| Maps | Leaflet + OpenStreetMap (no API key needed) |
| Geocoding | Nominatim (OpenStreetMap) — free, no API key |
| Deployment | Docker + Docker Compose |

---

## 📁 Project Structure

```
jansamadhan/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── supabase.js          # Supabase client
│   │   │   └── schema.sql           # Complete DB schema (run in Supabase)
│   │   ├── controllers/
│   │   │   ├── authController.js    # Register, Login, Profile
│   │   │   ├── complaintsController.js  # CRUD + NLP + Duplicates
│   │   │   ├── adminController.js   # User & dept management
│   │   │   └── locationController.js    # Location hierarchy + notifications
│   │   ├── middleware/
│   │   │   └── auth.js              # JWT auth middleware
│   │   ├── routes/
│   │   │   └── index.js             # All API routes
│   │   ├── services/
│   │   │   ├── nlpService.js        # NLP classifier (no external API)
│   │   │   └── gamificationService.js  # Points & badges system
│   │   └── index.js                 # Express server entry
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── common/
│   │   │       ├── Navbar.js        # Top navigation
│   │   │       ├── Sidebar.js       # Side navigation
│   │   │       ├── MainLayout.js    # Layout wrapper
│   │   │       └── index.js         # Shared components (Cards, Modal, etc.)
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── Login.js
│   │   │   │   └── Register.js      # 3-step registration
│   │   │   ├── citizen/
│   │   │   │   ├── Dashboard.js     # Citizen home + badge progress
│   │   │   │   ├── FileComplaint.js # 3-step complaint form
│   │   │   │   ├── MyComplaints.js  # List with filters
│   │   │   │   ├── ComplaintDetail.js  # Full detail + timeline
│   │   │   │   └── Profile.js       # Profile + badge display
│   │   │   ├── officer/
│   │   │   │   ├── Dashboard.js     # Officer stats + badge
│   │   │   │   └── Complaints.js    # Queue management
│   │   │   ├── admin/
│   │   │   │   ├── Dashboard.js     # System analytics + charts
│   │   │   │   └── Users.js         # User management
│   │   │   └── public/
│   │   │       ├── Landing.js       # Homepage
│   │   │       ├── PublicFeed.js    # Public complaint feed
│   │   │       ├── HotspotMap.js    # Leaflet map
│   │   │       ├── Leaderboard.js   # Citizens + Officers + Depts
│   │   │       └── NotFound.js
│   │   ├── services/
│   │   │   └── api.js               # Axios API service
│   │   ├── store/
│   │   │   └── authStore.js         # Zustand auth state
│   │   ├── styles/
│   │   │   └── main.css             # Design system
│   │   └── App.js                   # Routes
│   ├── public/
│   │   └── index.html
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
│
├── docker-compose.yml
└── README.md
```

---

## ⚡ Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- A free [Supabase](https://supabase.com) account

---

### Step 1: Supabase Setup

1. Go to [supabase.com](https://supabase.com) → Create new project
2. Go to **SQL Editor** → Paste the entire contents of `backend/src/config/schema.sql` → Run
3. Go to **Settings → API** → Copy:
   - `Project URL`
   - `anon public` key
   - `service_role` key (keep this secret!)
4. Go to **Storage** → Create a bucket named `complaint-images` (set to public)

---

### Step 2: Backend Setup

```bash
cd backend

# Copy environment file
cp .env.example .env

# Edit .env and fill in your Supabase credentials:
# SUPABASE_URL=https://xxxx.supabase.co
# SUPABASE_ANON_KEY=eyJhb...
# SUPABASE_SERVICE_ROLE_KEY=eyJhb...
# JWT_SECRET=your-min-32-char-secret-key-here

# Install dependencies
npm install

# Start development server
npm run dev
```

Backend will run at: `http://localhost:5000`

Test it: `http://localhost:5000/health` should return `{"status":"ok"}`

---

### Step 3: Frontend Setup

```bash
cd frontend

# Copy environment file
cp .env.example .env
# Edit .env: REACT_APP_API_URL=http://localhost:5000/api

# Install dependencies
npm install

# Start development server
npm start
```

Frontend will run at: `http://localhost:3000`

---

### Step 4: Create First Admin Account

After setting up, register a citizen account normally, then in Supabase SQL Editor run:

```sql
UPDATE users SET role = 'super_admin' WHERE email = 'your@email.com';
```

Now login with that account to access the Admin Panel and create officer accounts.

---

### Docker Deployment

```bash
# Copy and fill environment variables
cp .env.example .env

# Build and run everything
docker-compose up -d

# Check logs
docker-compose logs -f
```

---

## 🗂️ API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register citizen |
| POST | `/api/auth/login` | Login (all roles) |
| GET | `/api/auth/profile` | Get my profile |
| PUT | `/api/auth/profile` | Update profile |
| PUT | `/api/auth/change-password` | Change password |

### Complaints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/complaints` | File complaint (citizen) |
| GET | `/api/complaints` | List complaints (with filters) |
| GET | `/api/complaints/my` | My complaints (citizen) |
| GET | `/api/complaints/:id` | Get complaint detail |
| PUT | `/api/complaints/:id/status` | Update status (officer/admin) |
| POST | `/api/complaints/:id/assign` | Assign complaint (admin) |
| POST | `/api/complaints/:id/upvote` | Upvote/un-upvote |
| POST | `/api/complaints/:id/comments` | Add comment |
| GET | `/api/complaints/hotspots` | Get map hotspot data |
| GET | `/api/complaints/dashboard` | Dashboard statistics |

### Location
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/location/states` | All states |
| GET | `/api/location/districts/:state_id` | Districts in state |
| GET | `/api/location/talukas/:district_id` | Talukas in district |
| GET | `/api/location/mandals/:taluka_id` | Mandals in taluka |
| GET | `/api/location/gram-panchayats/:mandal_id` | GPs in mandal |

### Leaderboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leaderboard/citizens` | Top citizens |
| GET | `/api/leaderboard/officers` | Top officers |
| GET | `/api/leaderboard/departments` | Top departments |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | All users |
| POST | `/api/admin/officers` | Create officer account |
| PUT | `/api/admin/users/:id/toggle-status` | Activate/deactivate user |
| PUT | `/api/admin/users/:id/department` | Assign officer to dept |
| GET | `/api/admin/departments` | All departments |
| GET | `/api/admin/stats` | System statistics |

---

## 🧠 NLP Classification Details

The NLP system in `backend/src/services/nlpService.js` works **entirely offline** without any external API:

1. **Keyword Matching** — Domain-specific keywords for each category (English + Hindi transliteration)
2. **Regex Pattern Matching** — Common complaint patterns
3. **TF-IDF Scoring** — Term frequency-inverse document frequency
4. **Jaccard Similarity** — For duplicate detection
5. **Haversine Formula** — Geo-distance calculation for proximity-based duplicate grouping

**Supported Categories:** Roads, Water Supply, Electricity, Waste Management, Drainage, Infrastructure, Parks, Health, Education, Public Services, Street Lights, Law Enforcement, Noise Pollution, Other

---

## 🎯 NLP Accuracy Improvement

To improve classification accuracy:
1. Add more training examples to the `nlp_training_data` table in Supabase
2. Use verified complaint data to retrain patterns in `nlpService.js`
3. Consider integrating [Compromise.js](https://github.com/spencermountain/compromise) for better Hindi/regional language support

---

## 📊 Database Schema Overview

```
states → districts → corporations/municipalities → talukas → mandals → gram_panchayats
                                                                             ↑
users ──────────────────────────────────────────────────────────────── location refs
  ↑
complaints ─── complaint_timeline
  ↑
comments, upvotes, notifications

departments ← users (officer) ← complaints

citizen_leaderboard ← users
dept_performance ← departments
```

---

## 🔐 Security Features

- JWT authentication with role-based access control
- bcryptjs password hashing (12 rounds)
- Helmet.js security headers
- Rate limiting (200 req/15min general, 10 req/15min for auth)
- Row Level Security (RLS) on Supabase tables
- Input validation and sanitization
- SQL injection protection via Supabase parameterized queries

---

## 📱 Accessibility & Usability

- Works on mobile and desktop
- High contrast accessible color system
- Large touch targets for mobile users
- Supports multiple Indian languages (preference-based)
- Clear status indicators readable by non-technical users
- All content in plain, simple language
- India flag colors in the UI for cultural familiarity

---

## 🏗️ Extending the Project

### Add More States/Districts
Run SQL inserts in Supabase following the pattern in `schema.sql`

### Add More Categories
1. Add to `CATEGORY_PATTERNS` in `nlpService.js`
2. Add to `CATEGORIES` array in `FileComplaint.js`
3. Add department mapping in `complaintsController.js`

### Multi-language Support
The `preferred_language` field is stored per user. Implement i18n using `react-i18next` for full translation support.

---

## 📄 License

MIT License — Free to use, modify, and distribute.

---

*Built for the National Hackathon — Empowering Citizens, Enabling Government* 🇮🇳
