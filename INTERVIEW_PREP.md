# Interview Prep: JanSamadhan — AI-Powered Civic Grievance Platform

---

## 🎯 Start Here — The One Answer You Need to Nail

Before anything else, get this version locked in your head. Every question they ask will stem from this.

**"So, tell me about this project."**

"I built JanSamadhan — an AI-powered civic complaint platform for Indian citizens. When someone reports a problem — potholes, water supply failures, power cuts, garbage — the system reads the complaint, uses NLP and Google Gemini to figure out what category it is and how urgent it is, automatically routes it to the right government department based on the citizen's city, and assigns a local officer. The citizen gets updates via WhatsApp at every stage — assigned, resolved, escalated. My specific contribution was building the WhatsApp bot using Twilio so citizens can file complaints directly over WhatsApp without opening the app, the auto-routing engine that maps complaints to officers by department and location, and the AI title generation using Gemini. The whole thing runs on Node.js and React with Docker."

That's your anchor. Everything else connects back to this.

---

## 🏗️ System Architecture — The Big Picture

### Visual Flow Diagram

```
                    ┌─────────────────────────────────────┐
                    │  👤 CITIZEN ENTRY POINTS            │
                    │  • Web App (React + Vite)           │
                    │  • WhatsApp Bot (Twilio)            │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │  🎨 REACT FRONTEND                  │
                    │  • Complaint filing form            │
                    │  • Live NLP preview as you type     │
                    │  • Maps (Leaflet), Charts           │
                    │  • Leaderboards, Dashboards         │
                    │  • SSE for real-time notifications  │
                    └──────────────┬──────────────────────┘
                                   │
                                   │ HTTP REST API
                                   │
                    ┌──────────────▼──────────────────────────────────┐
                    │  ⚙️  EXPRESS BACKEND (Node.js)                  │
                    │                                                 │
                    │  📝 POST /api/complaints (file complaint)       │
                    │  🔍 POST /api/nlp/preview (live classification) │
                    │  ✍️  POST /api/nlp/generate-title (Gemini AI)   │
                    │  📊 PUT /api/complaints/:id/status (update)     │
                    │  🔔 GET /api/notifications/stream (SSE push)    │
                    │  💬 POST /webhook/whatsapp (Twilio webhook)     │
                    └──────────────┬──────────────────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
    ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
    │  🧠 NLP PIPELINE │  │  🎯 ROUTING     │  │  🤖 GEMINI AI   │
    │                 │  │     ENGINE      │  │                 │
    │  nlpService.js  │  │                 │  │  Validation +   │
    │  • Keywords     │  │  City→Dept→     │  │  Title Gen +    │
    │  • Regex        │  │  Officer Auto   │  │  Image Analysis │
    │  • Porter       │  │  Assignment     │  │                 │
    │    Stemmer      │  │                 │  │  (12h cache)    │
    │  • Priority     │  │  CITY_DEPT_MAP  │  │                 │
    │  • Hindi        │  │  • Telangana    │  │  Fallback: NLP  │
    │    Keywords     │  │  • Maharashtra  │  │  result if down │
    │  • 14 civic     │  │  • Karnataka    │  │                 │
    │    categories   │  │  • West Bengal  │  └─────────────────┘
    └─────────────────┘  │  • Delhi        │           │
              │          │                 │           │
              │          │  Phase 1: Match │           │
              │          │  dept + district│           │
              │          │                 │           │
              │          │  Phase 2: Match │           │
              │          │  dept only      │           │
              │          └─────────────────┘           │
              │                   │                    │
              └───────────────────┴────────────────────┘
                                  │
                    ┌─────────────▼─────────────────────┐
                    │  💬 TWILIO API                    │
                    │  • WhatsApp outbound              │
                    │  • SMS notifications              │
                    │  • Non-blocking calls             │
                    └─────────────┬─────────────────────┘
                                  │
                    ┌─────────────▼─────────────────────┐
                    │  🗄️  SUPABASE (PostgreSQL)        │
                    │                                   │
                    │  Tables:                          │
                    │  • users (citizens, officers)     │
                    │  • complaints (full lifecycle)    │
                    │  • complaint_timeline (audit log) │
                    │  • departments (govt agencies)    │
                    │  • states, districts, mandals     │
                    │                                   │
                    │  + SQLite local:                  │
                    │  • notifications (in-app alerts)  │
                    └───────────────────────────────────┘

    ┌──────────────────────────────────────────────────────────┐
    │  ⏰ BACKGROUND JOBS (setInterval 30min)                  │
    │                                                          │
    │  escalationService.js                                    │
    │  • Finds complaints past SLA deadline                    │
    │  • Bumps escalation_level (max 3)                        │
    │  • Upgrades priority: low→medium→high→critical           │
    │  • Notifies citizen via WhatsApp                         │
    │  • Routes to higher authority:                           │
    │    Level 1 → Dept Head                                   │
    │    Level 2 → District Officer                            │
    │    Level 3 → Commissioner                                │
    └──────────────────────────────────────────────────────────┘
```

**Key Architectural Decisions:**
- **Two Entry Points**: Web app for full features, WhatsApp bot for accessibility
- **NLP First, AI Second**: Rule-based classification (fast, free) validated by Gemini (smart, paid)
- **City-Aware Routing**: Same category maps to different departments by state (GHMC in Telangana, BMC in Maharashtra)
- **Auto-Assignment**: Two-phase officer lookup — district match first, department fallback second
- **SSE for Notifications**: Simpler than WebSockets, works behind proxies
- **Graceful Degradation**: If Gemini fails, system falls back to NLP-only classification

---

## Walk Me Through How It Works

**"Explain the flow when a citizen files a complaint."**

"It starts with the citizen typing their complaint — let's say 'There's a huge pothole on my street, water collects in it'. That text goes through the NLP classifier first — it scores the text against 14 civic categories using keyword matching and regex patterns. Each category has keywords including Hindi ones — so पानी, सड़क, बिजली are all understood. It scores roads highest because of 'pothole' and 'street', assigns a priority based on urgency keywords, and calculates an SLA deadline — roads get 48 hours.

Then the result goes to Gemini for validation. Gemini can override the category if it's confident the NLP got it wrong. If the citizen uploaded a photo, Gemini also checks whether the image actually matches the description — a photo of a dog for a pothole complaint would get flagged as mismatch.

Now comes routing. The system knows the complaint is 'roads' and the citizen is in, say, Hyderabad. I have a city-to-department map — roads in Hyderabad go to GHMC, in Delhi to PWD, in Bangalore to BBMP. It looks up the right department code, queries the database for an active officer in that department who's also in the citizen's district. If found, the complaint gets auto-assigned. If no exact district match, it falls back to any officer in the department.

The complaint is saved with a ticket number. A timeline entry is created. The citizen gets a WhatsApp message confirming it with the ticket number. Officers in that department get an in-app notification. If the officer doesn't act before the SLA deadline, a background job auto-escalates it — bumps priority, moves it to the next authority level, and notifies the citizen again on WhatsApp."

---

## The Routing Engine — Deep Dive

**"How exactly does the complaint get to the right officer?"**

This is the most interesting technical piece. Walk through it step by step.

"After the NLP model classifies the complaint, we know the category — say, 'water_supply' — and we know the citizen's state from their profile — say, Telangana. The NLP model was trained on Delhi data, so it always returns Delhi department codes. But the complaint is in Hyderabad, not Delhi.

So I have a hardcoded two-level map called CITY_DEPT_MAP — state to category to department code. For Telangana + water_supply, that resolves to 'HMWSSB'. For Karnataka + water_supply, it's 'BWSSB'. For Delhi, it's 'DJB'. I look up the citizen's state, hit this map, get the right department code, then query the departments table by that code to get the actual department ID and name.

Now I call autoAssignOfficer with the complaint ID, department ID, and the citizen's district ID. This function does a two-phase query. Phase 1: find an officer where role is 'officer', department_id matches, district_id matches, and is_active is true. Limit 1. If that returns someone, great — that officer handles water issues in that exact district. If Phase 1 finds nobody, Phase 2 tries again without the district filter — any active officer in that department.

Once an officer is found, the complaints table gets updated — assigned_officer_id, assigned_at, status changes from 'pending' to 'assigned'. A timeline entry is created — 'Auto-assigned to area officer based on department and district'. This timeline is the full audit trail visible to the citizen. Then notifications fire — citizen gets in-app, email, SMS, and WhatsApp confirmation. Officers get an in-app notification.

The exact same routing logic exists in the WhatsApp webhook. The WhatsApp bot has its own copy of CITY_DEPT_MAP and does the same officer lookup, because WhatsApp complaints bypass the web frontend entirely."

---

## WhatsApp Integration

**"How does the WhatsApp integration work?"**

"There are two directions — outbound and inbound.

Outbound is simpler. Whenever a complaint status changes — assigned, resolved, rejected, escalated — the backend calls Twilio's API. I normalize the phone number to E.164 format, prepend 'whatsapp:' to it, and send a formatted message with emojis and the ticket number. The whole call is wrapped in try-catch and is non-blocking — if Twilio fails, the complaint still saves and the app doesn't crash.

Inbound is more interesting — it's a full conversational bot. When a citizen texts our WhatsApp number, Twilio calls POST /webhook/whatsapp with the sender's phone and message body. I respond immediately with empty TwiML so Twilio doesn't retry, then process asynchronously.

The bot has a 4-step session flow stored in a Map with 15-minute TTL. Step 1: citizen texts their complaint. NLP classifies it, shows category and priority preview, asks: share GPS or select state manually? Step 2: if GPS, Twilio sends lat/lon, I reverse-geocode to state and district. If manual, I show a numbered list of 5 supported states. Step 3: district selection from the database. Step 4: confirmation preview — shows full complaint summary with department and SLA. Citizen says YES or NO — Hindi works too, 'haan' is accepted. On YES, the complaint is inserted into the database, officer is auto-assigned, citizen gets the ticket number.

The bot also handles global commands — STATUS shows last 5 complaints, CANCEL clears the session anytime. This means a citizen can file and track complaints entirely through WhatsApp without ever opening the app."

---

## The NLP Classification — Deep Dive

**"How does the AI classification actually work?"**

"The classification pipeline has multiple layers. Let me walk you through the architecture.

**Layer 1: Rule-Based NLP Engine**

This is the foundation — fast, free, and works offline. I built a custom classifier using the Natural.js library with three core algorithms:

*Text Preprocessing:* Every complaint goes through tokenization using WordTokenizer, then stemming with Porter Stemmer. So 'potholes', 'pothole', 'potholed' all reduce to the same stem 'pothol'. This helps match variations of the same word.

*TF-IDF Keyword Extraction:* I use Term Frequency-Inverse Document Frequency to extract the 8 most important keywords from each complaint, filtering out stop words like 'the', 'and', 'for'. These become the complaint's fingerprint.

*Multi-Pattern Scoring:* I have a patterns dictionary with 14 civic categories. Each category has three scoring mechanisms:

1. **Direct keyword matching** — If the lowercased text contains 'pothole', it scores 1.5 times the category weight. Hindi keywords like पानी, सड़क, बिजली are included — so complaints in Hindi get classified correctly.

2. **Regex pattern matching** — Compound phrases like 'pot hole' (with space), 'power cut', 'water shortage' match patterns like `/pot\s*hole/i` or `/power\s*(cut|outage|failure)/i`. These score 3 times the weight because they're more specific.

3. **Stemmed token fallback** — If no direct matches, it checks if stemmed tokens have significant overlap with category keywords. But this only fires if at least 2 unique stemmed keywords match, and it's disabled for niche categories like street_lights or law_enforcement to prevent false positives.

Each category also has a weight multiplier. Roads is 1.2 because it's the most common complaint category in Indian cities. Generic categories like 'other' are weighted lower.

Final confidence is calculated as: `max_score / (total_score + 0.01)` — so if one category dominates, confidence is high. If multiple categories score similarly, confidence drops and the system flags it for review.

**Priority Detection Algorithm:**

Priority is computed separately using keyword dictionaries:

- **Critical**: 'emergency', 'dangerous', 'death', 'collapse', 'fire', 'flood', 'live wire', 'electric shock', plus Hindi equivalents
- **High**: 'no water', 'power cut', duration phrases like '3 days', 'week ago', 'since yesterday'
- **Medium**: 'broken', 'damaged', 'leaking', 'not working'
- **Low**: 'small', 'minor', 'suggestion', 'not urgent'

There's also a special case — if the text mentions 'bridge' or 'flyover' along with 'broken', 'collapse', or Hindi words like टूट, गिर, ढह, it's instantly marked critical regardless of other keywords.

**Sentiment Analysis:**

Simple keyword-based sentiment scoring. Words like 'pathetic', 'disgusting', 'terrible', 'corrupt' subtract from the score. 'Thank', 'appreciate', 'good', 'resolved' add to it. Final sentiment buckets: very_negative, negative, neutral, positive.

Here's the clever part — sentiment feeds into severity calibration. If someone writes 'this is pathetic and disgusting' but there's no actual emergency keyword like 'fire' or 'collapse', the system caps priority at medium. This prevents emotional language from artificially escalating non-urgent complaints.

**SLA Calculation:**

Each category has a base SLA in hours — electricity gets 12 hours, roads get 48, parks get 96. Then it applies two multipliers:

1. Priority factor: critical gets 0.25x, high gets 0.5x, medium gets 0.75x, low gets 1.0x
2. Urgency multiplier: If the text contains 'emergency', 'accident', 'collapse', 'death', multiply by 0.4. If it mentions a duration like '7 days', multiply by 0.5.

Final SLA is clamped between 6 hours (minimum) and 240 hours (10 days maximum).

**Layer 2: Gemini Validation**

The rule-based result goes to Google Gemini 1.5 Flash with a structured JSON prompt. I send it the complaint text, the NLP's suggested category and priority, and ask three questions:

1. Is the category correct?
2. Should I override it? (boolean)
3. What's your confidence?

Gemini has veto power. If it says `should_override: true` with at least 50% confidence, the system uses Gemini's category instead. If Gemini's category differs but confidence is below 50%, it just logs the disagreement and keeps the rule-based result.

Results are cached by category + priority + first 80 chars of text for 12 hours using a Map with TTL. This keeps Gemini API costs low.

If Gemini is down or times out, the system gracefully degrades to rule-based only — no user-facing error, just lower classification confidence.

**Layer 3: Image Analysis (Optional)**

If the citizen uploads a photo, the system sends both the text and image to Gemini together in a unified validation call. Gemini checks:

- Does the image match the complaint text?
- Does the image match the predicted category?
- What objects are visible in the image?

If there's a mismatch — like a photo of a dog uploaded for a pothole complaint — Gemini flags it and sets `requiresManualReview: true`. Officers see a warning badge on that complaint."

---

**"Why custom NLP instead of a pre-trained model like BERT?"**

"Two reasons: latency and cost.

A rule-based classifier runs in under 50 milliseconds on the server. BERT embeddings take 200-500ms per inference even on GPU. For a live preview feature where the frontend calls `/api/nlp/preview` as the citizen types, that latency would be noticeable.

Second, BERT models require either hosting a model server — which adds infrastructure complexity — or calling an API like HuggingFace, which has rate limits on the free tier and costs money at scale. The rule-based engine costs zero, runs offline, and has no API dependencies.

The trade-off is accuracy. Rule-based gets about 75-80% correct on its own. Adding Gemini validation pushes it to 85-90%. That's good enough for this use case, especially since complaints with low confidence get flagged for manual review anyway."

---

## HuggingFace Integration — What Happened and Why It's Disabled

**"I see HuggingFace code in the project. Did you use it?"**

"I built a full HuggingFace integration layer as the original plan for AI-powered validation. Let me explain what I built, why it didn't work, and what replaced it.

**What I Built:**

The `huggingfaceService.js` module wraps the HuggingFace Inference API with four capabilities:

1. **Zero-Shot Classification** using `facebook/bart-large-mnli` — This was the main classifier. You give it complaint text and an array of 14 civic categories, and it scores each category without any training. The model was originally trained on natural language inference, so it understands semantic similarity even for categories it's never seen.

2. **Sentiment Analysis** using `distilbert-base-uncased-finetuned-sst-2-english` — Returns POSITIVE, NEGATIVE, or NEUTRAL with confidence scores. This was meant to replace the keyword-based sentiment detector.

3. **Named Entity Recognition** using `dbmdz/bert-base-cased-finetuned-conll03-english` — Extracts entities like locations, organizations, and people from the text. The idea was to use this for better geocoding and department routing.

4. **Text Summarization** using `facebook/bart-large-cnn` — For long complaint descriptions, this generates a short summary. Officers could see the summary first, then expand to read the full text.

The architecture was a **three-layer pipeline**: Rule-based → HuggingFace → Gemini. HuggingFace acted as a second opinion between the fast-but-dumb rule-based engine and the slow-but-smart Gemini layer.

**Why It Failed:**

During development, HuggingFace's free Inference API started returning **HTTP 410 Gone** errors. 410 means 'permanently removed' — certain model endpoints were deprecated or moved to a paid tier. The specific models I was using (`bart-large-mnli` for zero-shot classification) would work sometimes and fail other times depending on load.

The free tier also has aggressive rate limiting — 1000 requests per month, which sounds like a lot but gets exhausted quickly when you have a live preview feature that hits the API on every keystroke.

I could have switched to paid HuggingFace or self-hosted the models using Transformers.js, but that would add infrastructure complexity. Since Gemini 1.5 Flash was already working reliably and had a generous free tier (15 requests per minute), I decided to replace the HuggingFace layer entirely with Gemini and keep the rule-based engine as the fast first pass.

**What's Still There:**

The HuggingFace code is still in the codebase with a feature flag:

```javascript
this.enableHuggingFaceLayer = huggingface.isAvailable; // Disabled if no API key
```

If someone adds `HF_API_KEY` to the environment variables, the system will attempt to use HuggingFace again. The orchestrator in `enhancedClassificationOrchestrator.js` is designed to run all layers in parallel and combine their results using a hybrid decision engine.

The hybrid engine works like this: if rule-based says 'roads' with 60% confidence, HuggingFace says 'infrastructure' with 55% confidence, and Gemini says 'roads' with 80% confidence — Gemini wins because it has the highest confidence and agrees with the rule-based result. If all three disagree, it flags the complaint for manual review.

**What I Learned:**

Always design external AI APIs as optional enhancements, not hard dependencies. When HuggingFace broke, the fact that I'd already written graceful degradation logic meant the platform kept working. If I'd built the whole classifier around HuggingFace, the project would have been dead in the water."

---

**"Could you bring HuggingFace back if you had more time?"**

"Yes, but I'd do it differently. Instead of calling the Inference API, I'd use Transformers.js to run the models locally in Node.js or even in the browser.

Transformers.js is a JavaScript port of HuggingFace Transformers that runs ONNX-optimized models directly in the browser using WebAssembly or on the server using Node. It's completely offline, no API calls, no rate limits.

The trade-off is model size and speed. A distilled BERT model is about 130MB, which is fine for server-side but too heavy for the browser. Inference is slower than calling an API — maybe 300-500ms per classification on CPU — but it's consistent and free.

I'd keep the current architecture: rule-based for live preview (instant), Transformers.js for a second opinion on form submit (500ms is acceptable), and Gemini for final validation after the complaint is filed. That way you get three independent opinions and the system is resilient to any one layer failing."

---

## Follow-Up Questions — NLP & AI

**"What would you do if two categories have similar scores?"**

"If the confidence is below 50% or the top two categories are within 10% of each other, the system sets a `conflict_detected` flag. The complaint still gets filed with the highest-scoring category, but officers see a yellow badge that says 'Low Confidence — Review Category'. The citizen also gets a message: 'We think this is [category], but if it's wrong, officers will reroute it.'

The hybrid decision engine also checks if Gemini agrees with the rule-based result. If Gemini suggests a different category, even with lower confidence, that disagreement is logged. If we accumulate enough disagreements for a specific complaint pattern, that's a signal to retrain the rule-based patterns."

---

**"How do you handle complaints in regional languages like Tamil or Telugu?"**

"Right now the keyword dictionary includes Hindi words for the 5-6 most common categories — roads, water, electricity, police. But full regional language support would require either:

1. A multilingual embeddings model like XLM-RoBERTa that understands 100+ languages, or
2. A translation layer using Google Translate API that converts Tamil/Telugu/Kannada to English before classification

Option 2 is simpler but adds latency and API dependencies. Option 1 is more robust but requires hosting a 1GB+ model. For the current project scope, Hindi + English covers about 70% of urban Indian complaints. Full regional support would be the next phase."

---

**"Could false positives be a problem — like someone reporting 'my neighbor is making noise' getting classified as noise_pollution instead of law_enforcement?"**

"Yes, and that's where the regex patterns help. The `noise_pollution` category has patterns like `/loud\s*(music|speaker)/i` and `/noise\s*(pollution|disturbance)/i` — so it only matches if the text explicitly mentions 'loud music' or 'noise disturbance'.

If someone just says 'my neighbor is making noise', it won't match the regex patterns, so it'll score low on `noise_pollution`. If they add context like 'blasting loud music at 2 AM', the regex fires and confidence goes up.

Categories with high overlap — like `law_enforcement` vs `noise_pollution` — are also handled by Gemini validation. Gemini understands context better than keyword matching, so it can tell the difference between a noise complaint (which should go to police for enforcement) and a suspicious activity report (which is purely law enforcement)."

---

**"How did you test the accuracy of the NLP classifier?"**

"Manual testing with a spreadsheet of 50-60 sample complaints across all 14 categories. I'd paste each complaint into the `/api/nlp/preview` endpoint, check the predicted category and priority, and compare it to what a human would say.

If the classifier got it wrong, I'd debug the scoring logic to see which keywords or patterns fired, then adjust the weights or add missing keywords. For example, initially 'streetlight not working' was getting classified as `electricity` because of the word 'not working'. I added a specific category for `street_lights` with regex patterns like `/street\s*light\s*(not|broken|off)/i`, and that fixed it.

Proper testing would require a labeled dataset of real Indian civic complaints — maybe 500-1000 samples — and k-fold cross-validation. That's the next step if this project goes to production."

---

**"What's the biggest limitation of your current NLP approach?"**

"Context-free classification. The rule-based engine treats every complaint as an independent bag of words. It doesn't understand relationships like:

- 'Pothole near the hospital gate' → roads + health (multi-label)
- 'Power cut for 3 days, water pump not working' → electricity + water_supply (chained effects)
- 'Garbage smell attracting rats' → waste_management + health

Gemini partially solves this because it reads the full context, but a proper solution would be a multi-label classifier that can assign 2-3 categories to a single complaint. I actually built the infrastructure for this in `hybridDecisionEngine.js` — it has a `decideMultiLabel()` function that combines scores from all layers — but it's not fully wired up in the UI yet."

---

## Tech Stack Justification — Why These Choices?

Interviewers love asking "why this tech over that tech?" These answers show you make informed decisions, not just follow tutorials.

**"Why React instead of Vue or Angular?"**

"I needed a frontend that could handle real-time updates, complex state management, and had good mobile PWA support. I considered three options:

**Angular** — Full-featured, opinionated, great for large enterprise apps. But it's heavyweight, has a steep learning curve with TypeScript decorators and RxJS, and feels over-engineered for a civic app where speed matters more than structure.

**Vue** — Simpler than React, great DX with single-file components, smaller bundle size. But the ecosystem is smaller in India — fewer developers know it, fewer job postings require it, so I'd limit future team expansion.

**React** — Huge ecosystem, easier to hire developers in India, tons of community libraries for maps (Leaflet), charts (Recharts), and state management (Zustand). The component model is flexible, and PWA support through Vite is solid.

I chose React because the ecosystem meant I could solve problems fast. Leaflet integration had React wrappers, chart libraries were mature, and any error I hit had a StackOverflow answer. For a government app where development speed matters more than framework elegance, React was the pragmatic choice."

---

**"Why Express instead of NestJS or Fastify?"**

"I needed a Node.js backend that could handle REST APIs, Server-Sent Events for notifications, and WebSocket-style connections for real-time features. Three options:

**NestJS** — TypeScript-first, dependency injection, modular structure, great for large teams. But it has massive boilerplate — decorators, modules, providers — and I was working solo. The learning curve would slow me down, and for a college project with a 3-month timeline, speed mattered more than scalability to 50 microservices.

**Fastify** — 3x faster than Express, better TypeScript support, schema validation built-in. But smaller ecosystem — fewer middleware options, fewer tutorials for Supabase integration or SSE. I'd spend more time figuring things out instead of building features.

**Express** — Older, slower (but fast enough for this scale), minimal TypeScript support. But it's the most popular Node framework — every Supabase tutorial, Twilio example, and Gemini integration uses Express. Debugging is easier because someone else already hit every error I'd face.

I chose Express because I could ship features fast. If this were a production system expecting 100k users, I'd choose Fastify for the performance. If I had a team of 5 developers, I'd choose NestJS for the structure. But for a solo college project, Express let me move fastest."

---

**"Why PostgreSQL (via Supabase) instead of MongoDB or MySQL?"**

"The data structure is relational — users belong to districts, districts belong to states, complaints belong to departments, officers belong to departments and districts. That's classic relational data. I considered:

**MongoDB** — NoSQL, flexible schema, fast writes. Great for unstructured data like logs or social media posts. But for this app, I need complex joins — show me all complaints in a district assigned to a specific department officer. Writing that query in Mongo means multiple round trips or embedding everything (which duplicates data). Not worth it.

**MySQL** — Mature, widely used, stable. But PostgreSQL has JSONB columns for storing flexible metadata like `images` array and `nlp_keywords` without needing a separate table. It also has better full-text search and GIS extensions (PostGIS) for location queries. Since Supabase offers Postgres by default, I got those features for free.

**PostgreSQL via Supabase** — Relational structure for the core schema, JSONB for flexible fields, built-in auth, real-time subscriptions, and hosted/managed so I don't deal with backups. The trade-off is vendor lock-in — migrating off Supabase later would require rewriting auth and real-time logic. But for a college project, the speed of having auth + database + real-time in one platform was unbeatable.

If I were building this for a government agency that requires on-premise hosting, I'd use PostgreSQL self-hosted on AWS RDS. But for MVP speed, Supabase was perfect."

---

**"Why custom JWT auth instead of Supabase Auth or Auth0?"**

"Supabase Auth's default flow sends email verification links with magic links. That works great for consumer apps, but this is a government platform where:

1. Officers are created by admins, not self-registered
2. Officers might not have email access immediately
3. Admins need to toggle officers active/inactive manually

I considered three options:

**Supabase Auth** — Built-in, secure, handles tokens and sessions. But it forces email verification and doesn't support 'admin creates officer' flow easily. I'd have to hack around it by creating users through the admin API then bypassing verification, which defeats the purpose of using a managed service.

**Auth0 or Clerk** — Managed auth with full control over flows, great admin dashboards. But they cost money after 7500 MAUs (Auth0) or 10k users (Clerk). For a college project with unknown scale, I didn't want to hit a paywall mid-demo. Also adds an external dependency — if Auth0 goes down, the whole app is unusable.

**Custom JWT** — Full control over the flow. Admin creates officer with `is_active: false`. Officer logs in, system checks `is_active` before issuing token. Admin toggles active/inactive in the database, takes effect immediately. No email verification required. I also embed `departmentId` in the JWT payload, which saves a database lookup on every request that needs to check an officer's department.

The trade-off is I have to handle password hashing (bcrypt), token expiry, refresh logic, and security myself. But for this use case, that trade-off was worth the control. If this were a consumer app with social logins and MFA requirements, I'd use Auth0 in a heartbeat. But for officer management, custom JWT made more sense."

---

**"Why Zustand instead of Redux or Context API?"**

"I needed global state for user data, notifications count, and complaint filters. The state tree isn't huge — maybe 10-15 pieces of state total. I considered:

**Redux** — Industry standard, great DevTools, predictable. But massive boilerplate — actions, reducers, dispatch, connect/useSelector. For a small state tree, it felt like swatting a fly with a sledgehammer.

**Context API + useReducer** — Built into React, zero dependencies. But context re-renders every consumer on any state change unless you split into multiple contexts. I'd end up with 5-6 contexts to avoid unnecessary re-renders, which gets messy. Also no DevTools.

**Zustand** — Tiny (1kb), zero boilerplate, selectors prevent unnecessary re-renders, works with DevTools. You just create a store, define state and actions, and use it with `useStore`. It's what Redux should have been.

I chose Zustand because I could set up global state in 20 lines instead of 200. The trade-off is it's less common in job postings than Redux, so some developers might not know it. But it's so simple they'd learn it in 10 minutes. For this project, developer experience beat resume keyword matching."

---

**"Why Twilio for WhatsApp instead of WhatsApp Business API directly?"**

"WhatsApp Business API requires a business verification process that takes weeks, costs money, and needs a Facebook Business Manager account. Twilio provides a WhatsApp sandbox that works instantly for development and a production WhatsApp API with faster approval.

I considered:

**Direct WhatsApp Business API** — Lower per-message cost, direct relationship with Meta. But the verification process, webhook setup, and message template approvals are painful. For a college project, the overhead wasn't worth it.

**Twilio WhatsApp API** — Higher per-message cost (but still only $0.005 per message), but instant sandbox for testing, simpler webhook setup, and they handle all the Meta compliance. I could test the entire bot flow in 30 minutes instead of waiting 2 weeks for Meta approval.

I chose Twilio because time-to-demo mattered more than cost. If this were a production system sending 100k messages/month, I'd negotiate directly with Meta to cut costs. But for prototyping and college presentations, Twilio's sandbox let me build and test fast."

---

**"Why Google Gemini instead of OpenAI GPT-4 or Claude?"**

"I needed an LLM for complaint classification validation and title generation. Three options:

**OpenAI GPT-4** — Best reasoning, most reliable, great API. But it costs $0.03 per 1k tokens (input) and $0.06 per 1k tokens (output). For a college project with no revenue, that adds up. Their free tier is extremely limited.

**Claude 3.5 Sonnet** — Great at reasoning, longer context window, good API. But Anthropic's free tier is also limited, and availability in India isn't as reliable as Google's.

**Google Gemini 1.5 Flash** — Free tier allows 15 requests/minute and 1500 requests/day, which is plenty for a demo. Multimodal by default (handles text + images in one call), fast, and API access is easy through Google Cloud. The trade-off is it's slightly less accurate than GPT-4 for complex reasoning, but for civic complaint classification, it's more than good enough.

I chose Gemini because the free tier let me run the entire project without worrying about API bills. I also cache results for 12 hours to stay well under the 1500/day limit. If this were a production system with budget, I'd run A/B tests between Gemini and GPT-4 to see which gives better accuracy. But for a college project, free + multimodal was unbeatable."

---

**"Why Server-Sent Events (SSE) instead of WebSockets for notifications?"**

"I needed real-time notifications — when a complaint status changes, officers and citizens see it instantly. Two options:

**WebSockets** — Bidirectional, great for chat apps or multiplayer games. But notifications are one-directional — server pushes to client, client never needs to push back. WebSockets require a separate upgrade handshake, don't work reliably behind some corporate proxies, and need special handling in load balancers to maintain sticky sessions.

**Server-Sent Events (SSE)** — One-directional, works over plain HTTP, automatically reconnects on disconnect, works behind proxies. It's simpler to implement — just keep a GET connection open and write events as they happen. The browser's EventSource API handles reconnection automatically.

I chose SSE because it's the right tool for the job. WebSockets are overkill for one-way notifications. The trade-off is if I ever need bidirectional communication (like a live chat between citizen and officer), I'd have to add WebSockets separately. But for notification push, SSE is simpler, lighter, and more reliable."

---

**"Why Docker instead of deploying directly to a VPS?"**

"I needed a way to package the backend, database migrations, and environment variables so the project runs consistently on any machine. Two approaches:

**Direct VPS deployment** — SSH into DigitalOcean droplet, install Node, install Postgres, clone repo, run migrations, set up systemd service, configure Nginx. Works fine, but if I need to redeploy or migrate servers, I have to remember all those steps or write shell scripts.

**Docker + Docker Compose** — Define the entire stack in `docker-compose.yml` — backend service, Postgres service, environment variables, volume mounts, networking. Run `docker-compose up` and the entire app starts. If I change machines, just copy the repo and run the same command. The Dockerfile ensures Node version, dependencies, and runtime are identical everywhere.

I chose Docker because it's reproducible. The trade-off is slightly higher memory usage (containers have overhead) and a learning curve for debugging inside containers. But for a project that needs to run on my laptop, the college lab machine, and a professor's computer for demo, Docker guarantees 'works on my machine' becomes 'works on all machines'."

---

These answers show you didn't just follow a tutorial — you evaluated options, made informed decisions, and understand trade-offs. That's what separates strong candidates from weak ones.

---



---

## AI Title Generation

**"How does the title generation work?"**

"Citizens often write long paragraphs. Officers need short, scannable titles. If a citizen doesn't write a title or it's too short, the system calls Gemini with the complaint text, category, and priority. I send a strict prompt — '4 to 10 words, plain sentence case, no emojis, respond only with JSON {title: "..."}'. The response goes through sanitization — strips quotes, newlines, extra spaces, and trims to 90 characters. Results are cached by category + priority + first 80 chars of text for 12 hours.

If Gemini is unavailable, there's a fallback. The NLP service extracts the first sentence of the description. If that's also too short, it defaults to a category label like 'Water Supply Issue'.

The title generation endpoint POST /api/nlp/generate-title is also called live from the frontend — as the citizen types, they see a title preview before submitting."

---

## Security & Notifications

**"How do you handle security?"**

"A few layers. Passwords are hashed using bcrypt at 12 rounds before storing — never plain text. Authentication uses JWT tokens with userId, role, and departmentId in the payload — 7-day expiry. Every protected route has the authenticate middleware that verifies the token and fetches the user from Supabase — with a 2-minute in-memory Map cache to avoid hitting the database on every request. Then the authorize middleware checks roles — a citizen can't access officer or admin routes.

Rate limiting is applied on all API routes to prevent abuse — 500 requests per 15 minutes globally, 20 requests per 15 minutes on login and registration to block brute force. The server also uses Helmet to set secure HTTP headers. Image uploads are validated for format before processing. The WhatsApp webhook is outside the auth layer deliberately — Twilio doesn't send tokens — but it's at a separate path with no access to sensitive data."

---

**"How do notifications work across different channels?"**

"There's a unified notification service that fans out to four channels depending on the event type.

In-app notifications are stored in SQLite locally and pushed live through Server-Sent Events. The frontend keeps a persistent GET connection to /api/notifications/stream. SSE was chosen over WebSockets because notifications are one-directional — server to client — and SSE is simpler to deploy without proxy issues.

Email uses the Resend API with a custom HTML template styled with the India tricolor header. SMS uses Twilio's regular SMS API for short status alerts. WhatsApp uses the whatsappService which calls Twilio's WhatsApp API.

The notification matrix is: complaint filed → all 4 channels for citizen, in-app + email for officers. Status changed to resolved → in-app + email + SMS. Escalated → in-app + WhatsApp + email to admins. Badge unlocked → in-app only."

---

## Auto-Escalation

**"How does auto-escalation work?"**

"There's a background scheduler that runs every 30 minutes via setInterval. It queries complaints where sla_deadline is less than now and status is still pending, assigned, or in_progress. For each overdue complaint, it increments escalation_level by 1 up to a max of 3, upgrades priority using a map — low becomes medium, medium becomes high, high becomes critical — sets a new 24-hour deadline, and updates status to 'escalated'.

A timeline entry is created. The citizen gets in-app and WhatsApp notifications. Level 1 goes to Department Head, Level 2 to District Officer, Level 3 to Commissioner. At level 2 and above, admins also get notified by email."

---

## Design Decisions

**"Why did you build a hardcoded CITY_DEPT_MAP instead of putting it in the database?"**

Be honest about the trade-off.

"It was a speed decision during development. The map is shared between complaintsController.js and whatsappWebhook.js, and having it in the database would require an extra query per complaint. The trade-off is that adding a new city requires a code change. The right long-term fix is to move it to a department_routing_rules table and cache it — which I'd do if scaling this further. But for the project scope, the hardcoded map kept things simple and fast."

---

**"Why custom JWT auth instead of Supabase Auth?"**

"Supabase Auth's default flow sends email verification links. For a government app where officers are created by admins — not self-registered — that flow breaks down. Custom JWT gave full control. Officers start as inactive, admin flips is_active, and they can log in. We also embed departmentId in the token payload, which saves a database lookup on every route that needs to know an officer's department."

---

**"Why SSE over WebSockets for notifications?"**

"Notifications are server-to-client only — the browser never needs to send data back over the live connection. SSE works over plain HTTP, doesn't need special server configuration, and works naturally behind reverse proxies and load balancers. WebSockets have known issues with some proxies and need a separate upgrade protocol. For this use case SSE is simpler, lighter, and more reliable. The trade-off is it's one-directional, but that's exactly what notifications need."

---

## The Harder Questions

**"What would you improve if you had more time?"**

"Three things. First, move the AI pipeline to a background job queue like BullMQ with Redis. Right now it runs synchronously while the citizen waits — on a slow Gemini day, complaint filing could take 3-5 seconds. With async processing, the complaint saves instantly and AI processes afterwards.

Second, replace the hardcoded CITY_DEPT_MAP with a database table so admins can configure routing for new cities without a code change.

Third, write automated tests for the NLP classification logic. It has complex scoring rules with a lot of edge cases — different keyword combinations, Hindi support, priority calibration — that currently rely on manual testing, which isn't reliable at scale."

---

**"How would this scale to 10x users?"**

"Right now it's a single Node.js process. To scale: run multiple backend instances behind a load balancer like Nginx or AWS ALB. Move AI calls to async workers using BullMQ. Replace the in-memory user cache with Redis so all instances share it. Move the SQLite notification store to Redis pub/sub or a shared database.

Supabase handles the PostgreSQL scaling side. The SSE connections are stateful — you'd need sticky sessions or move to a Redis-backed pub/sub broadcast for notifications across multiple instances. The WhatsApp webhook is stateless per request so that scales naturally."

---

**"What happens if Gemini goes down?"**

"The system degrades gracefully to the rule-based NLP result. Every AI layer is optional. If geminiValidation.validateClassification throws, the catch block returns the hybrid result without Gemini's override. Complaints still get classified and routed — just without the Gemini sanity check. So the user experience degrades gracefully: complaints still file, just with slightly lower classification confidence. No user-facing error."

---

**"What was the hardest part of this project?"**

"The routing logic was the most technically interesting challenge. The NLP model gives you a category, but the same category maps to completely different departments in different Indian cities. Getting that city-aware routing right — and making sure it also worked through the WhatsApp bot, not just the web app — required careful design. The same map had to be replicated and maintained in two places.

The other hard part was handling HuggingFace going down mid-development. That forced a quick architectural decision to replace an entire pipeline layer. It worked out fine in the end, but it was stressful at the time."

---

**"What did you learn from this project?"**

"The biggest lesson was designing external API calls as optional enhancements, not hard dependencies. When HuggingFace broke, the fact that I'd already written fallback logic meant the system kept working.

I also learned that in civic tech, accessibility matters more than features. The WhatsApp bot ended up being more impactful than the maps or leaderboards because it reached users who would never open a web app. Meeting citizens where they already are — WhatsApp — made a bigger difference than any UI polish could."

---

**End of Document. Read through once, then practice saying the architecture section and the routing deep dive out loud.**
