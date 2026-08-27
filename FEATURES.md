# 🏛️ JanSamadhan (CRM) - Complete Feature Directory

Below is the comprehensive, end-to-end list of every feature available in the JanSamadhan system, sorted by user roles and integration types.

---

## 👥 Normal Citizens

### Authentication & Profile
*   **Registration & Login:** Secure authentication framework with encrypted passwords (bcrypt).
*   **Location-Aware Registration:** Users define their exact jurisdictional location (Country → State → District → Corporation/Municipality/Taluka → Mandal → Gram Panchayat).
*   **Profile Management:** View and update personal profile details, including the registered 10-digit phone number.
*   **Password Reset:** Ability to change account passwords securely after login.

### Complaint Management
*   **Smart Complaint Filing:** AI-driven NLP auto-classification. Citizens just type their issue, and the system identifies the Category, Priority, and corresponding Department route. 
*   **Image Attachments:** Upload photo evidence natively on the platform (up to 10MB).
*   **My Complaints Dashboard:** Dedicated area summarizing their ticket numbers. Filter by "Pending", "In Progress", or "Resolved/Rejected".
*   **Real-time Timeline Tracking:** View transparent audit logs tracking a complaint's traversal through the system.
*   **Complaint Deletion:** Citizens can delete/withdraw their complaints and must provide comprehensive deletion reasons.
*   **Priority Indicators:** Distinct visual priority tracking (🚨 Critical to 🟢 Low) tied to specific Service Level Agreements (SLAs).

### Community & Public Features
*   **Public Feed:** Browse civic complaints raised by other citizens in the broader community.
*   **Upvotes & Support Initiatives:** Upvote public complaints to increase their visibility and potentially trigger automated escalation.
*   **Comments System:** Discuss issues dynamically by adding comments on public complaints.
*   **Hotspot Geographic Map:** Visual heatmap via Leaflet & OpenStreetMap, dynamically marking areas deeply saturated with unresolved complaints.
*   **Citizen Leaderboard (Gamification):** Ranked gamified system where citizens earn points by filing validated complaints, highlighting hotspots, or receiving upvote traction (Ranks: Newcomer → Civic Hero).

### Notification & System Accessibility
*   **In-App Notifications:** Real-time updates alerting the citizen to status changes. 
*   **Notification Preferences:** Citizens can mark alerts as read/unread or delete them.
*   **Global Accessibility:** Features to adjust high-contrast and font sizes via integrated accessibility storage.

---

## 🟢 WhatsApp Integration (Bot & Updates)

The backend implements a dedicated Twilio WhatsApp integration to provide an independent, low-friction channel for regular Users/Citizens.

### Filing Complaints directly via Chat
*   **Plain Text Processing:** Citizens can file a complaint simply by texting their problem natively to a designated WhatsApp number in English, Hindi, or transliterated languages ("haan", "nahi").
*   **Instant AI Processing:** The bot securely maps the phone number to the Citizens account, digests the text via NLP, and instantly replies with:
    *   `Category`
    *   `Routed Department`
    *   `System-assessed Priority`
    *   `SLA Timeout`
*   **Conversational Confirmation:** Requires the citizen to text "YES" or "NO" to confirm the officially drafted ticket or cancel out.

### Checking Updates & Commands
*   **Status Commands:** Users can text `status`, `my complaints`, or `check` to receive an auto-summarized list of their 5 most recent ticket numbers, along with their current status, natively in WhatsApp.
*   **Help Commands:** Users can text `help`, `hi`, `hello`, `start` for instant bot instruction menus and basic guidance.
*   **Automated Lifecycle Alerts:** Even if a complaint was filed via the Web App, citizens linked with their phone numbers receive automatic text alerts via WhatsApp when their complaint is:
    *   `Assigned:` Successfully queued up for the designated officer.
    *   `In Progress:` Marked officially by the officer as actively being worked on.
    *   `Resolved:` Resolved with thanks. 
    *   `Rejected:` Invalidated (includes the Officer's custom rejection reason natively in the chat).
    *   `Escalated:` Breached SLA count and elevated to a higher official tier for priority attention.

---

## 👮 Officers (Departments)

### Workflow & Resolutions
*   **Officer Dashboard:** A dedicated operational summary tracking workflow metrics, resolutions, and queued pending complaints.
*   **Departmental Complaint Queue:** A consolidated stream of pending complaints logically bound *only* to the jurisdiction and specific department of the officer.
*   **Update Lifecycle Status:** Change complaint statuses spanning the entire lifecycle (`Assigned` -> `In Progress` -> `Resolved` -> `Rejected`).
*   **Analytical Resolution Notes:** Capability to add authoritative notes and explanations upon modifying tickets, especially when rejecting a claim.
*   **Government Portal Access:** Secure overview access limited inherently to their clearance levels.

### Officer Gamification
*   **Performance Metrics:** The system evaluates officers based on their timely responsiveness, priority handling, and adhering to strict strict SLA countdowns.
*   **Officer Leaderboard:** Official competitive ranking viewable on the platform (Ranks: New Officer → Excellence Award), aiming to motivate civic efficiency. 

---

## 🏛️ System Administration

### Core Capabilities
*   **System Diagnostics Dashboard:** Top-level visual metrics evaluating the health of the entire CRM, tracking comprehensive SLA durations, user counts, and ticket influx logs.
*   **User & Department Management:** Invite new users, designate user roles to `admin` or `officer`, or freely revoke user access/status.
*   **Routing & Zone Mapping:** Admin capability to assign officers precisely to departments (e.g. Water, Electricity, Police) and distinct geographical blocks.
*   **Manual Ticket Assignment:** The power to manually override the NLP engine's classification and manually assign/re-assign specific complaints to varied officers.
*   **Queue Escapes & Escalation Tracking:** Admins get specialized visibility into the "Escalated" queue—complaints that outlived their algorithmic SLA timeout, requiring manual override or serious high-level intervention.
*   **System Geocode Management:** Powerful utility allowing Admins to trigger system-wide batch geocoding of existing complaints via Nominatim APIs to rebuild maps and rectify location tracking if errors occur.
*   **Department & Area Leaderboard Visibility:** Admins can view performance rankings summarizing not just standalone citizens/officers, but grouped overall efficiency across entirely different civic Departments and geographic Districts.

---

*This document was generated directly from the codebase of JanSamadhan, cataloging routing models, backend controllers, Twilio Webhook integrations, and frontend React architectures.*
