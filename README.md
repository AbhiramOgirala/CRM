<h1 align="center">🏛️ JanSamadhan — जन समाधान</h1>

<div align="center">
  <h3>National Smart Civic Grievance Management System</h3>
  <p><em>"जन की आवाज़, सरकार के द्वार" — Citizen's Voice at Government's Door</em></p>
</div>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active-success?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/badge/Node.js-18+-green.svg?style=for-the-badge&logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/React-18.x-61DAFB.svg?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Supabase-Database-3ECF8E.svg?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Docker-Supported-2496ED.svg?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Contributions-Welcome-orange.svg?style=for-the-badge" alt="Contributions" />
</p>

---

A full-stack, production-ready civic grievance platform for India that connects citizens to government departments for efficient complaint resolution. 

## 📑 Table of Contents
- [About the Project](#-about-the-project)
- [Key Features](#-key-features)
- [Technology Stack](#-technology-stack)
- [System Architecture](#-system-architecture)
- [Getting Started (Local Development)](#-getting-started-local-development)
- [Docker Deployment](#-docker-deployment)
- [API Documentation](#-api-documentation-reference)
- [Security Standards](#-security-standards)
- [License](#-license--attribution)

---

## 📖 About the Project

JanSamadhan is an end-to-end CRM (Citizen Relationship Management) tool developed to bridge the communication gap between citizens and local government bodies. By incorporating **AI-driven NLP classification**, **location-based hotspot tracking**, and an engaging **gamification and leaderboard system**, it guarantees high-speed complaint resolution and transparent governance.

This platform operates independently of external paid APIs, ensuring **zero operating costs** for core analytical features like geography routing, sentiment analysis, and issue classification.

---

## ✨ Key Features

### 👤 Citizen Portal
- **Location-Aware Registration:** 7-Level Geographic Hierarchy (Country → State → ... → Gram Panchayat).
- **Smart Complaint Filing:** Auto-classifies issues via natural language processing. Attach GPS tags and photos easily.
- **Real-Time Tracking & Notifications:** Keep track of the complaint timeline with fully transparent audit logs.
- **Community Engagement:** Upvote public complaints and leave comments to attract official attention.
- **Interactive Hotspot Map:** See visually where civic issues are concentrated in your area.

### 👮 Official & Government Portal
- **Departmental Queue:** Organized workflows tailored dynamically to designated departments.
- **Status Lifecycle:** Transition from Assigned → In Progress → Resolved. Automatic SLA warnings.
- **Analytics Dashboard:** Monitor departmental resolution rates, pending queues, and monthly trends.

### ⚙️ System Admin Portal
- **User & Department Management:** Add or revoke officer privileges, map officials to districts/departments.
- **Performance Diagnostics:** High-level overview of system health and metrics.

---

## 🛠️ Technology Stack

| Domain | Tools & Technologies |
| :--- | :--- |
| **Frontend** | React 18, React Router v6, Zustand, Tailwind CSS / Custom CSS, Chart.js, Leaflet |
| **Backend** | Node.js, Express.js, JWT, Bcrypt |
| **Database** | Supabase (PostgreSQL), Storage Buckets |
| **AI & NLP** | `natural` (TF-IDF, Tokenizer, Stemmer), Jaccard Similarity Algorithm |
| **Mapping** | OpenStreetMap, Nominatim (Geocoding) |
| **DevOps & Deployment**| Docker, Docker Compose |

---

## 🏗️ System Architecture

### NLP Classification (Zero External APIs)
- **Auto-Categorization:** Translates text (including Hindi transliterations) identifying up to 14 distinct issue types.
- **Priority Scaling:** Identifies urgency through language cues.
- **Duplicate Detection (De-duplication):** Haversine Formula (GPS Proximity) + Jaccard Similarity (Text comparison).

### Gamification Engine (Points & Badges)
⭐ **Citizens:** Earn points by filing validated complaints, getting upvotes, or highlighting community hotspots. (Ranks: Newcomer → Civic Hero).  
🏅 **Officers:** Ranked on quick resolutions, achieving SLAs, and priority handling. (Ranks: New Officer → Excellence Award).

---

## 🚀 Getting Started (Local Development)

Follow these steps to set up this application locally.

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- A free [Supabase](https://supabase.com/) account for backend as a Service

### 1️⃣ Supabase Setup
1. Create a new project on [Supabase.com](https://supabase.com/).
2. Navigate to the **SQL Editor** and run the contents of `backend/src/config/schema.sql`.
3. Create a public storage bucket named `complaint-images`.
4. Extrapolate your `Project URL`, `anon public` key, and `service_role` key from **Settings > API**.

### 2️⃣ Backend Installation
```bash
cd backend
cp .env.example .env

# Edit .env with your Supabase credentials:
# SUPABASE_URL=...
# SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_ROLE_KEY=...
# JWT_SECRET=...

npm install
npm run dev
```
*Backend runs locally on `http://localhost:5000`.*

### 3️⃣ Frontend Installation
```bash
cd frontend
cp .env.example .env

# Edit .env: REACT_APP_API_URL=http://localhost:5000/api

npm install
npm start
```
*Frontend runs locally on `http://localhost:3000`.*

### 4️⃣ First Admin Setup
In your Supabase SQL Editor, run this snippet to grant absolute control to the first account:
```sql
UPDATE users SET role = 'super_admin' WHERE email = 'YOUR_REGISTERED_EMAIL';
```

---

## 🐳 Docker Deployment

For standardized staging or production environments:
```bash
# Clone the repository and configure your .env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Spin up the containers
docker-compose up --build -d

# View live application logs
docker-compose logs -f
```

---

## 🗂️ API Documentation Reference

**Auth Endpoints**
- `POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/profile`

**Complaints Core**
- `POST /api/complaints` (Create) · `GET /api/complaints` (List) · `PUT /api/complaints/:id/status` (Update Lifecycle)

**Analytics & Gamification**
- `GET /api/leaderboard/citizens` · `GET /api/complaints/dashboard` · `GET /api/complaints/hotspots`

*(See `backend/src/routes` for complete comprehensive routing details)*

---

## 🔐 Security Standards
*   **Role-Based Access Control (RBAC):** Distinct boundaries for Citizens, Officers, and Admins.
*   **Rate Limiting:** DDoS prevention via 200 req/15min guards.
*   **Data Isolation:** Supabase Row Level Security (RLS) ensures citizens only manipulate their own reporting.
*   **Hashing:** bcryptjs handles all sensitive storage points.

---

## 📄 License & Attribution

Distributed under the **MIT License**. Free to adopt, modify, and distribute for public civic good.

<p align="center">
  <em>Built for the National Hackathon — Empowering Citizens, Enabling Government 🇮🇳</em>
</p>
