# JanSamadhan — Application Overview

## What is JanSamadhan?

JanSamadhan (जन समाधान) is a full-stack civic grievance management platform built for India. It allows citizens to file complaints about civic issues (roads, water, electricity, waste, etc.), automatically routes them to the correct government department, and tracks resolution — all with real-time WhatsApp notifications.

The name means "People's Solution" in Hindi.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, React Router v7, Zustand, Leaflet maps |
| Backend | Node.js, Express |
| Database | Supabase (PostgreSQL) |
| Auth | JWT (JSON Web Tokens) |
| AI/NLP | Rule-based NLP + Google Gemini AI + HuggingFace |
| Notifications | Twilio WhatsApp API |
| Maps | Leaflet + OpenStreetMap + Nominatim geocoding |
| PWA | vite-plugin-pwa (installable, offline support) |
| Deployment | Docker + docker-compose |

---

## Who Uses It

Three types of users:

**Citizen** — Files complaints, tracks status, upvotes issues, comments, gets WhatsApp updates.

**Officer** — Government department employee. Sees complaints assigned to their department and area. Updates status, uploads proof-of-work photos, earns points.

**Admin / Super Admin** — Full system access. Manages users, assigns officers to departments, views system-wide stats and escalated complaints.

---

## Core Features

### 1. Complaint Filing (Web)
Citizens file complaints through a 3-step form:
- Step 1: Describe the issue (text or voice in 9 Indian languages)
- Step 2: Select location (GPS or manual — State → District → Taluka → Mandal)
- Step 3: Review and submit

The system auto-detects category, priority, department, and SLA deadline using NLP.

### 2. AI Auto-Classification
Every complaint goes through a classification pipeline:
- **Rule-based NLP** (`nlpService.js`) — keyword matching to detect category (roads, water, electricity, waste, etc.) and priority
- **Google Gemini AI** (`geminiValidationService.js`) — validates and refines the classification, generates complaint titles
- **HuggingFace** (`huggingfaceService.js`) — semantic embeddings for duplicate detection
- **Image analysis** — if a photo is attached, Gemini validates whether the image matches the complaint category

### 3. City-Aware Department Routing
Complaints are routed to the correct department based on the state selected:

| State | Roads/Waste | Water | Electricity |
|---|---|---|---|
| Delhi | MCD | DJB | BSES |
| Telangana | GHMC | HMWSSB | TSSPDCL |
| Maharashtra | BMC | MWRRA | MSEDCL |
| Karnataka | BBMP | BWSSB | BESCOM |
| West Bengal | KMC | WBPHED | CESC |

### 4. Auto-Assignment to Area Officer
After routing to a department, the system finds the officer matching both the department AND the district of the complaint. If no exact area match, it falls back to any officer in that department.

### 5. WhatsApp Bot (Twilio)
Citizens can file complaints entirely via WhatsApp without opening the app:
1. Send any message describing the issue
2. Bot detects category and priority using NLP
3. Bot asks for state (1–5 options)
4. Bot shows districts for that state, user picks one
5. Bot shows full preview with correct department
6. User replies YES → complaint filed with state, district, department, auto-assigned officer

Citizens also receive WhatsApp notifications whenever an officer updates the status of their complaint (assigned, in progress, resolved, rejected, escalated) — including the complaint title and ticket number.

### 6. SLA Tracking & Escalation
Each complaint gets an SLA deadline based on category and priority. A background scheduler runs every 30 minutes and automatically escalates complaints that breach their SLA to higher authorities.

### 7. Duplicate Detection
When a complaint is filed, the system checks for similar complaints within 500m in the last 30 days using NLP similarity scoring. Duplicates are linked to the parent complaint. As duplicate count grows, the parent complaint's priority is automatically upgraded (3 reports → medium, 5 → high, 10 → critical).

### 8. Gamification
- Citizens earn points for filing complaints, getting them resolved, and having duplicates verified
- Officers earn points for resolving complaints, with bonuses for critical/high priority and resolving within SLA
- Leaderboards at area, mandal, district, state, and officer level

### 9. Public Feed & Hotspot Map
- Public feed shows all public complaints with upvote/comment support
- Hotspot map (Leaflet) shows complaint clusters by location — helps identify problem areas
- Anonymous complaints show as "Anonymous" on the public feed

### 10. Notifications (In-App + WhatsApp)
- In-app notification bell with real-time polling
- WhatsApp notifications via Twilio for status changes
- Notification preferences per user

### 11. Multilingual Support
- UI supports 9 Indian languages via i18next
- Voice input supports all Indian languages via Web Speech API
- Text-to-speech reads complaint details and classifications aloud

### 12. PWA (Progressive Web App)
- Installable on mobile home screen
- Offline complaint queuing — complaints filed offline are synced when connection is restored via Background Sync API

---

## Location Hierarchy

The platform supports India's full administrative hierarchy:

```
State → District → Corporation/Municipality → Taluka → Mandal → Gram Panchayat
```

Currently seeded with full data for 5 cities: Delhi, Hyderabad, Mumbai, Bengaluru, Kolkata.

---

## API Structure

All API routes are under `/api/`:

| Group | Endpoints |
|---|---|
| Auth | register, login, profile, change-password |
| Complaints | file, list, my complaints, get by ID, update status, upvote, comment, delete |
| NLP | preview classification, generate title |
| Image | analyze image |
| Location | states, districts, corporations, municipalities, talukas, mandals, gram panchayats |
| Leaderboard | citizens, departments, officers, area, district |
| Notifications | list, mark read, preferences, delete |
| Admin | users, create officer, toggle status, assign department, stats, escalated |
| WhatsApp Webhook | `/webhook/whatsapp` (Twilio posts here) |

---

## Deployment

- Backend and frontend each have a `Dockerfile`
- `docker-compose.yml` at the root orchestrates both services
- Backend runs on port 5000, frontend on port 3000
- Environment variables managed via `.env` files

---

## Current Limitations / Dev Notes

- WhatsApp sandbox (Twilio) requires users to opt-in every 72 hours — production would use a WhatsApp Business API number
- ngrok is used in development to expose the local backend to Twilio's webhook
- 5 cities are fully supported — adding a new city requires seeding states/districts/officers and adding it to `CITY_DEPT_MAP`
