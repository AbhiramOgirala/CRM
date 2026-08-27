# Interview Prep Document Generator — Universal Prompt Template

Use this prompt to generate comprehensive interview preparation documents for any software project. Fill in the bracketed sections with your project-specific details.

---

## THE PROMPT (Copy everything below this line)

---

**CONTEXT:** I need a comprehensive interview preparation document for my project that will help me confidently answer technical questions in job interviews.

**PROJECT DETAILS:**
- **Project Name:** [Your project name]
- **Project Type:** [e.g., Web application, Mobile app, CLI tool, API, ML system, etc.]
- **Tech Stack:** [List all technologies: languages, frameworks, databases, APIs, cloud services, etc.]
- **My Specific Role/Contributions:** [What YOU specifically built - be precise about which features/modules were your responsibility]
- **Project Duration:** [How long you worked on it]
- **Team Size:** [Solo or team project? If team, how many people?]
- **Repository:** [GitHub link if available]

**IMPORTANT: Include a dedicated section in the generated document titled "Tech Stack Justification — Why These Choices?" that covers why you chose each major technology over alternatives. For each technology (frontend framework, backend framework, database, authentication method, hosting, third-party APIs, state management, etc.), the AI should generate interview Q&A explaining:**
- What alternatives you considered (list 2-3 options with pros/cons)
- Why you chose this specific option (specific reasons, not generic)
- What trade-offs you accepted
- When you would choose differently (different scale, team size, or requirements)

Example format for each technology comparison:
```
"Why [Your Choice] instead of [Alternative 1] or [Alternative 2]?"

"I needed [specific requirement]. I considered three options:

**[Alternative 1]** — [Pros]. But [cons that made you reject it for this project].

**[Alternative 2]** — [Pros]. But [cons that made you reject it for this project].

**[Your Choice]** — [Why it fit your specific needs].

I chose [Your Choice] because [specific reason for this project context]. The trade-off is [what you gave up]. If [different scenario], I would choose [different option] instead."
```

**PROJECT SCOPE:**
- **What problem does it solve?** [1-2 sentences on the core problem]
- **Who are the users?** [Target audience]
- **Key features:** [3-5 main features, prioritize what YOU built]
- **Scale/Impact:** [Number of users, data volume, or hypothetical scale if it's a college project]

**TECHNICAL HIGHLIGHTS:**
- **Most complex feature:** [What was technically challenging?]
- **Algorithms/patterns used:** [Any specific algorithms, design patterns, architectures]
- **Third-party integrations:** [APIs, libraries, cloud services integrated]
- **Performance considerations:** [Any optimization work, caching, scaling decisions]
- **Security measures:** [Auth, encryption, data protection implemented]

**TECH STACK CHOICES & ALTERNATIVES:**
For each major technology, explain why you chose it:

- **Frontend:** [Your choice] vs [Alternative 1] vs [Alternative 2]
  - Why I chose it: [Reason]
  - Trade-off: [What you gave up]

- **Backend:** [Your choice] vs [Alternative 1] vs [Alternative 2]
  - Why I chose it: [Reason]
  - Trade-off: [What you gave up]

- **Database:** [Your choice] vs [Alternative 1] vs [Alternative 2]
  - Why I chose it: [Reason]
  - Trade-off: [What you gave up]

- **Authentication:** [Your choice] vs [Alternative 1] vs [Alternative 2]
  - Why I chose it: [Reason]
  - Trade-off: [What you gave up]

- **Hosting/Deployment:** [Your choice] vs [Alternative 1] vs [Alternative 2]
  - Why I chose it: [Reason]
  - Trade-off: [What you gave up]

- **State Management (if applicable):** [Your choice] vs [Alternative 1] vs [Alternative 2]
  - Why I chose it: [Reason]
  - Trade-off: [What you gave up]

- **Styling:** [Your choice] vs [Alternative 1] vs [Alternative 2]
  - Why I chose it: [Reason]
  - Trade-off: [What you gave up]

- **Key Third-party APIs:** 
  - [API 1]: Why this vs [Alternative]
  - [API 2]: Why this vs [Alternative]

Example:
```
Frontend: React vs Vue vs Angular
- React: Chose for massive ecosystem, easier hiring, JSX familiarity
- Trade-off: More boilerplate than Vue, less opinionated than Angular

Database: PostgreSQL vs MongoDB vs MySQL
- PostgreSQL: Needed complex joins for user→complaint→officer relationships, JSONB for flexible metadata
- Trade-off: More complex setup than MongoDB, steeper learning curve than MySQL
```

**WHAT WORKED / WHAT DIDN'T:**
- **Originally planned but failed:** [Any technology/approach you tried but replaced? Why?]
- **Key design decisions:** [Important choices you made and why]
- **Trade-offs:** [What you sacrificed for what benefit]

---

## INSTRUCTIONS FOR DOCUMENT GENERATION:

Generate a comprehensive interview preparation document with the following structure:

### 1. **OPENING SECTION: "The One Answer You Need to Nail"**
- Write a 60-90 second elevator pitch that covers:
  - What the project does (problem → solution)
  - Tech stack used
  - My specific contributions (what I built)
  - Key technical highlights
- Make it conversational, first-person, like I'm explaining it out loud
- This should be the anchor — every other answer expands on pieces of this

### 2. **SYSTEM ARCHITECTURE DIAGRAM**
- Create an ASCII diagram showing:
  - User entry points
  - Frontend components
  - Backend services/APIs
  - Databases and data flow
  - External integrations
  - Background jobs (if any)
- Use emojis for visual clarity (🎨, ⚙️, 🗄️, 🤖, 🔐, etc.)
- Add a "Key Architectural Decisions" section explaining:
  - Why this architecture?
  - Major design patterns used
  - Trade-offs made

### 3. **END-TO-END FLOW WALKTHROUGH**
- Question: "Walk me through how [key feature] works"
- Detailed answer covering:
  - User action → frontend → backend → database → response
  - Every major step with technical details
  - What happens at each layer
  - Data transformations
- 2-3 minutes to explain out loud
- Use specific function names, APIu8ii
 endpoints, database tables

### 4. **DEEP DIVE SECTIONS** (one for each major technical component)

For MY specific contributions, create sections like:
- "The [Your Feature] — Deep Dive"
- "How [Algorithm/Integration] Works"
- "[Technical Challenge] — Behind the Scenes"

Each deep dive should:
- Start with an interview question: "How exactly does X work?"
- Include 3-5 paragraphs explaining:
  - High-level approach
  - Technical implementation details
  - Algorithms/libraries used
  - Edge cases handled
  - Why this approach vs alternatives
- Reference actual code structure (files, functions, classes)

### 5. **TECH STACK JUSTIFICATION SECTION**

Create a dedicated section: **"Why This Tech Stack?"**

For EACH major technology choice, include:

**Question format:** "Why did you choose [Technology X] over [Alternative Y]?"

**Answer structure:**
- What you needed (the requirement)
- Options you considered (2-3 alternatives with pros/cons)
- Why you chose this one (specific reasons)
- Trade-offs accepted
- When you'd choose differently

**Cover these technology categories:**

**Frontend Framework:**
- Question: "Why [React/Vue/Angular/Next.js/etc]?"
- Alternatives: Compare to 2 other frameworks
- Reasons: Bundle size, ecosystem, learning curve, SSR needs, etc.

**Backend Framework:**
- Question: "Why [Express/FastAPI/Django/NestJS/etc]?"
- Alternatives: Compare to 2 other options
- Reasons: Performance, type safety, ecosystem, scalability

**Database:**
- Question: "Why [PostgreSQL/MongoDB/MySQL/etc]?"
- Alternatives: SQL vs NoSQL trade-offs
- Reasons: Data structure, transactions, scalability, query complexity
- Schema decisions: Why normalized/denormalized?

**State Management (if applicable):**
- Question: "Why [Zustand/Redux/Context/Recoil/etc]?"
- Alternatives: Compare to 2 others
- Reasons: Boilerplate, DevTools, learning curve

**Authentication:**
- Question: "Why custom JWT vs [Auth0/Supabase Auth/Firebase Auth/Clerk]?"
- Alternatives: Managed auth services vs custom
- Reasons: Cost, control, complexity, user flow requirements

**Hosting/Deployment:**
- Question: "Why [Vercel/AWS/Heroku/DigitalOcean/Docker/etc]?"
- Alternatives: Serverless vs VPS vs containers
- Reasons: Cost, scaling, CI/CD, complexity

**Third-party APIs:**
- Question: "Why [Stripe/PayPal/etc], [Twilio/SendGrid/etc], [OpenAI/Gemini/etc]?"
- For each: What alternatives existed, why this one won
- Pricing, features, developer experience

**CSS/Styling:**
- Question: "Why [TailwindCSS/styled-components/CSS Modules/etc]?"
- Alternatives: Utility-first vs CSS-in-JS vs traditional
- Reasons: Development speed, bundle size, team familiarity

**Example Answer Format:**

**"Why Express instead of NestJS or Fastify?"**

"I needed a Node.js backend that could handle REST APIs and WebSocket connections. I considered three options:

**NestJS** — Type-safe, built-in dependency injection, great for large teams. But it has a steep learning curve with decorators and modules, and I was working solo with a 3-month deadline. The boilerplate felt heavy for a project of this size.

**Fastify** — Much faster than Express (3x lower latency), better TypeScript support. But the ecosystem is smaller — fewer tutorials, middleware, and examples. I'd spend more time figuring things out.

**Express** — Older, slower, minimal TypeScript support. But there's a massive ecosystem, I already knew it, and every integration I needed had an Express example. For a college project with a deadline, development speed mattered more than raw performance.

I chose Express because I could prototype fast and find solutions quickly. If this were a production API expecting 10k+ RPS, I'd choose Fastify. If I had a team of 5+ developers, I'd choose NestJS for the structure."

---

**Generate 8-12 of these comparisons** covering all major tech decisions.

### 6. **TECHNOLOGY-SPECIFIC SECTIONS**

For each major technology/integration, include:
- **What I built with it**
- **How I used it** (specific features, patterns, configurations)
- **Challenges faced** (gotchas, bugs, workarounds)
- **How it integrates with the rest of the system**

Examples:
- "Database Design & Schema"
- "Authentication & Authorization"
- "[API Name] Integration"
- "[Framework] Architecture"
- "State Management Strategy"

### 6. **DESIGN DECISIONS & TRADE-OFFS**

Questions like:
- "Why did you use X instead of Y?"
- "Why did you build Z as a [specific implementation] instead of [alternative]?"
- "What would you do differently?"
- "Why custom implementation vs using a library?"

For each:
- Honest explanation of the trade-off
- What was gained vs what was sacrificed
- When this choice makes sense vs when it doesn't
- What you'd change if rebuilding

### 7. **CHALLENGING QUESTIONS**

Include 8-10 follow-up questions covering:
- **Conflict scenarios:** "What if two [components] disagree?"
- **Scale questions:** "How would this scale to 10x users?"
- **Failure scenarios:** "What happens if [external service] goes down?"
- **Testing:** "How did you test this?"
- **Alternative approaches:** "Could you have used [different tech]?"
- **Limitations:** "What's the biggest limitation of your approach?"
- **Regional/edge cases:** "How do you handle [specific edge case]?"
- **False positives/negatives:** "Could [problem] occur?"

Each answer should:
- Acknowledge the problem honestly
- Explain how the system currently handles it
- Suggest what would improve it further
- Show you've thought through edge cases

### 8. **BEHAVIORAL/STORY QUESTIONS**

Include 3-4 STAR format answers:
- "What was the hardest technical challenge you faced?"
- "Describe a time you had to debug a complex issue"
- "Tell me about a design decision you made that didn't work out"
- "What did you learn from this project?"

Each should follow STAR:
- **Situation:** Context setup (1-2 sentences)
- **Task:** What you needed to accomplish
- **Action:** Specific technical steps you took
- **Result:** Outcome + learning

### 9. **CURVEBALL QUESTIONS**

5-6 harder questions that probe depth:
- "If I gave you 2 more weeks, what would you add?"
- "What would break if you had 1000x more data?"
- "How would you explain [complex feature] to a non-technical person?"
- "What's one thing in the code you're not proud of?"
- "If you rebuilt this from scratch, what would you change?"

---

## FORMATTING REQUIREMENTS:

1. **Use markdown headers** (## for major sections, ### for subsections)
2. **Write answers conversationally** — first-person, like spoken out loud, not formal documentation
3. **Keep answers between 60-150 words** except for deep dives (which can be 300-500 words)
4. **Include specific technical details:**
   - Function/file names from the actual codebase
   - API endpoint paths
   - Database table names
   - Library/package names with versions when relevant
   - Code patterns (e.g., "I used the Factory pattern", "async/await with Promise.all")
5. **Use emojis sparingly** for section headers and architecture diagrams only
6. **No code snippets** in answers — reference code structure verbally instead
7. **Smooth transitions** — each section should flow naturally to the next, following the system's data flow or feature hierarchy
8. **Be honest about limitations** — acknowledge what didn't work, what you'd improve, what was a hack

---

## SPECIAL INSTRUCTIONS:

1. **READ THE ACTUAL CODEBASE** before generating answers
   - Use `read_code`, `read_file`, `grep_search` to understand implementation
   - Reference real file names, function names, and code patterns
   - Don't make up details — if you don't know, read the code first

2. **FOCUS ON MY CONTRIBUTIONS**
   - If I said "I built the auth system", spend 2-3 pages on auth deep dive
   - If I didn't work on the frontend, keep frontend answers brief
   - The document should reflect what I can confidently explain

3. **MATCH MY SKILL LEVEL**
   - If this is a college project, don't claim production-scale complexity
   - Be honest about what's a proof-of-concept vs production-ready
   - Frame limitations as learning opportunities, not failures

4. **INCLUDE FOLLOW-UPS FOR EVERY MAJOR SECTION**
   - After each deep dive, add 2-3 related follow-up questions
   - These should probe deeper or explore adjacent concerns
   - Show I've thought through edge cases and alternatives

5. **MAKE IT INTERVIEW-REALISTIC**
   - Only include questions a real interviewer would ask
   - No trivia (e.g., "What's the difference between let and const?")
   - No library documentation regurgitation
   - Focus on: design decisions, trade-offs, challenges, debugging, scaling

---

## OUTPUT FORMAT:

Save the document as: `INTERVIEW_PREP_[PROJECT_NAME].md`

Start with:
```
# Interview Prep: [Project Name] — [One-line description]

---

## 🎯 Start Here — The One Answer You Need to Nail

[Elevator pitch]

---

## 🏗️ System Architecture — The Big Picture

[ASCII diagram]

[Key Architectural Decisions]

---

## 📋 Walk Me Through How It Works

[End-to-end flow for key feature]

---

## [Deep Dive Sections for YOUR contributions]

[Technical deep dives]

---

## 🔧 Tech Stack Justification — Why These Choices?

[8-12 technology comparisons covering frontend, backend, database, auth, hosting, APIs, state management, styling, deployment, etc.]

Each comparison should follow the format:
"Why X instead of Y or Z?"
- List alternatives with pros/cons
- Explain your choice with specific reasoning
- Acknowledge trade-offs
- State when you'd choose differently

---

## [Continue with remaining sections...]
```

---

## EXAMPLE PROJECTS TO REFERENCE:

For inspiration on style and depth, reference the interview prep document you just created for **JanSamadhan**:
- Notice how it starts with a clear elevator pitch
- The architecture diagram is comprehensive but readable
- Deep dives reference specific files (whatsappWebhook.js, complaintsController.js)
- Follow-up questions probe edge cases and alternatives
- Honest about HuggingFace failing and why
- Technical but conversational — sounds like a human explaining, not documentation

Generate a document of similar quality and depth for MY project.

---

**END OF PROMPT**

---

## HOW TO USE THIS TEMPLATE:

1. **Fill in all [bracketed] sections** with your project details
2. **Be specific about YOUR contributions** — the more detail you provide, the better the document
3. **Copy the entire "THE PROMPT" section** (everything below "THE PROMPT" line)
4. **Paste it to the AI** along with your project repository context
5. **Let the AI read your codebase** — it will use grep_search, read_file, read_code to understand your implementation
6. **Review and refine** — the AI might ask clarifying questions; answer them for a better document

---

## TIPS FOR BEST RESULTS:

- ✅ Be honest about what you built vs what teammates built
- ✅ Mention technologies you tried but didn't work out
- ✅ Include specific file paths the AI should examine
- ✅ If it's a team project, clarify which modules are yours
- ✅ Provide GitHub repo link so AI can explore structure
- ❌ Don't exaggerate scale ("handles millions of users" for a college project)
- ❌ Don't claim you built everything if it was a team effort
- ❌ Don't ask for generic answers — provide project context

---

## EXAMPLE FILLED PROMPT:

**PROJECT DETAILS:**
- **Project Name:** TaskFlow
- **Project Type:** Web application (Task management SaaS)
- **Tech Stack:** Next.js 14, TypeScript, Prisma, PostgreSQL, NextAuth, TailwindCSS, Vercel
- **My Specific Role:** Full-stack solo project. Built authentication system, real-time collaboration using WebSockets, drag-and-drop Kanban board, and Stripe payment integration.
- **Project Duration:** 3 months
- **Team Size:** Solo
- **Repository:** https://github.com/username/taskflow

**PROJECT SCOPE:**
- **Problem:** Teams struggle with fragmented task management tools that don't integrate communication and progress tracking
- **Users:** Small teams (5-20 people), freelancers, startups
- **Key features:** 
  1. Real-time collaborative Kanban boards with drag-and-drop
  2. Role-based access control (owner, admin, member, viewer)
  3. Stripe subscription billing (free, pro, enterprise tiers)
  4. Real-time notifications using WebSockets
  5. Task assignment, comments, file attachments
- **Scale:** Designed for 100 concurrent users per board, tested with 50 users

**TECHNICAL HIGHLIGHTS:**
- **Most complex feature:** Real-time collaboration — handling optimistic updates, conflict resolution, and WebSocket connection management
- **Algorithms/patterns:** Optimistic UI updates, event sourcing for task history, RBAC middleware pattern
- **Integrations:** Stripe (webhooks for subscription events), AWS S3 (file uploads), SendGrid (email notifications)
- **Performance:** Implemented React Query for caching, debounced search, lazy loading for task lists
- **Security:** NextAuth with JWT, CSRF protection, rate limiting on API routes, role-based middleware

**WHAT WORKED / WHAT DIDN'T:**
- **Failed approach:** Initially tried Firebase Realtime Database for collaboration, but latency and cost made me switch to WebSockets + Postgres
- **Key decisions:** Chose Next.js over separate frontend/backend because App Router simplified API routes and reduced deployment complexity
- **Trade-offs:** Used Prisma ORM for speed, but it generates verbose type definitions that bloat the codebase

[...then the full prompt template continues...]

---

This template will generate interview prep docs just as good as the JanSamadhan one! 🚀
