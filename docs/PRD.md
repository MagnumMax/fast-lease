# Product Requirements Document (PRD): Fast Lease Platform

## 1. Executive Summary

### Product Vision
Fast Lease is a next-generation, automation-first car leasing platform designed to unify operations, finance, risk management, and client experience into a single, cohesive ecosystem. By leveraging AI-driven workflows, real-time telemetry, and seamless integrations, Fast Lease aims to eliminate manual friction in the vehicle lifecycle—from procurement and leasing to maintenance and resale—empowering stakeholders with transparent data and actionable insights.

### Goals & Objectives
*   **Operational Efficiency**: Reduce deal processing time by 40% through automated workflows and document generation.
*   **Financial Integrity**: Automate 90% of fine management (traffic/Salik) and payment collections to minimize revenue leakage.
*   **Client Experience**: Provide a self-service mobile-first portal for clients to manage contracts, payments, and services, targeting a CSAT score > 4.5/5.
*   **Risk Mitigation**: Proactive document expiry monitoring and geofencing alerts to ensure compliance and asset security.
*   **Scalability**: Support multi-role access (Investors, Partners) with strict RBAC and data isolation.

### Target Audience
*   **Primary (Internal)**: Operations Managers, Finance Team, Risk Managers, Legal, Tech Specialists.
*   **Secondary (External)**: Clients (Lessees), Investors, Partners (Brokers/Sellers).

### Key Value Propositions
*   **For Business**: End-to-end visibility of fleet assets and deal pipelines; automated compliance and billing.
*   **For Clients**: Frictionless "manage-anywhere" experience for payments, docs, and support.
*   **For Investors**: Real-time portfolio performance tracking and ROI transparency.

### High-Level Success Metrics (KPIs)
*   **Automation %**: >80% of fine processing and invoice generation automated.
*   **Process Time**: Deal closure time reduced from days to hours.
*   **Adoption**: 100% of active clients using the Client Portal.
*   **Collection Rate**: Reduction in overdue payments (DSO) by 25%.

---

## 2. Product Scope, Features & Modules

### Features List

| Feature | Module | Tags | Priority | Success Metrics | Primary Persona | Dependencies |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Unified Auth & RBAC** | Auth | [I], [S] | P1 | 100% secure role segregation | All | Supabase Auth |
| **Deal Workflow Engine** | Operations | [A], [B] | P1 | Zero manual state errors | Ops Manager | BPM Service |
| **Client Self-Service Hub** | Client Portal | [I], [UX] | P1 | >50% reduction in support tickets | Client | Supabase Realtime |
| **Automated Fines Mgmt** | Finance | [A], [I] | P1 | <24h fine rebilling latency | Finance | RTA/Salik Mock/API |
| **Smart Collections** | Finance | [A], [AI] | P2 | 15% drop in late payments | Finance | Messaging Provider |
| **Vehicle Telematics** | Fleet | [I], [IoT] | P2 | 100% mileage accuracy | Tech Specialist | IoT Provider |
| **Doc Expiry Watchdog** | Compliance | [A] | P2 | 0 expired active driver docs | Legal/Risk | Storage/OCR |
| **Investor Dashboard** | Investor | [B] | P3 | Real-time asset visibility | Investor | Accounting Data |

**Tags**: [B] Backend, [I] Integration, [A] Automation, [AI] Artificial Intelligence, [S] Security, [UX] User Experience.

### User Personas
*   **Ops Manager**: Orchestrates the daily fleet movement and deal closing. Needs speed and clarity.
*   **Client**: Rents the car. Wants zero hassle, transparency, and easy payments.
*   **Finance Officer**: Manages cash flow. Needs accurate automated billing and collection tools.
*   **Risk Manager**: Protects assets. Needs early warnings on credit risk and asset location.

### Traceability Matrix
*   **Goal: Operational Efficiency** ↔ **Module: Operations (Deal Workflow)** ↔ **KPI: Process Time**
*   **Goal: Financial Integrity** ↔ **Module: Finance (Fines/Collections)** ↔ **KPI: Collection Rate**
*   **Goal: Client Experience** ↔ **Module: Client Portal** ↔ **KPI: Adoption/CSAT**

---

## 3. Module Specifications

### 3.1. Authentication & Portals
*   **Name**: Multi-Portal Auth System
*   **Goal**: Secure, routed access for diverse personas using a single credential system.
*   **Description**: Centralized login handling role resolution, portal redirection (App, Client, Investor), and session management.
*   **User Stories**:
    *   As a User, I want to log in once and be directed to my specific dashboard.
    *   As an Admin, I want to create internal users and assign roles without manual DB entry.
*   **Technical Constraints**: Supabase Auth, RBAC middleware, Portal detection logic.
*   **Priority**: P1

### 3.2. Operations Dashboard & Deal Workflow
*   **Name**: Ops Command Center
*   **Goal**: Streamline deal lifecycle from application to handover.
*   **Description**: Kanban-style deal board, task management, and document checklist enforcement.
*   **UX Flow**: Login → Ops Dashboard → Deals Board → Click Deal → View Tasks/Docs → Approve/Reject.
*   **Automation**: Auto-transition states based on task completion; webhook triggers for external events (e.g., e-sign).
*   **Priority**: P1

### 3.3. Client Personal Dashboard
*   **Name**: Client Hub
*   **Goal**: Empower clients to manage their lease independently.
*   **Description**: Mobile-responsive dashboard for viewing car details, paying invoices, uploading docs, and requesting service.
*   **User Stories**:
    *   As a Client, I want to see my next payment date and pay via Apple Pay.
    *   As a Client, I want to download my contract and insurance certificate.
*   **Acceptance Criteria**:
    *   Client sees only their active vehicles/deals.
    *   Payment status updates in real-time.
*   **Priority**: P1

### 3.4. Automated Fines & Tolls
*   **Name**: Traffic Fine Manager
*   **Goal**: Automate the retrieval, payment, and rebilling of fines.
*   **Description**: Cron jobs fetch fines (simulated or API), match to vehicle/client, pay provider, and invoice client + admin fee.
*   **Integration**: RTA/Police/Salik (Mock/API).
*   **Automation**: Daily checks; Auto-invoice generation; Push notification to client.
*   **Priority**: P1

### 3.5. Smart Collections
*   **Name**: Intelligent Dunning System
*   **Goal**: Recover payments efficiently.
*   **Description**: Multi-channel reminder system (Email, SMS, WhatsApp) with escalating urgency based on due date.
*   **Logic**: T-3 (Friendly), T+1 (Urgent), T+5 (Alert Ops).
*   **Priority**: P2

### 3.6. Document Expiry Watchdog
*   **Name**: Compliance Sentinel
*   **Goal**: Prevent legal risks from expired documents.
*   **Description**: Nightly scan of `expiry_date` on all active profiles. Triggers alerts/tasks if <30 days.
*   **Priority**: P2

---

## 4. Sitemap & Interaction Flows

### App Directory Structure
*   `app/(auth)`: `/login`, `/register`, `/forgot-password` (Shared Auth)
*   `app/(dashboard)/admin`: User mgmt, BPM config, System logs.
*   `app/(dashboard)/ops`: Deals, Cars, Clients, Tasks (Main Ops View).
*   `app/(dashboard)/client`: Dashboard, Payments, Documents, Support (Client View).
*   `app/(dashboard)/finance`: Invoices, Receivables, Reports.
*   `app/(dashboard)/investor`: Portfolio, ROI Reports.
*   `app/api`:
    *   `/webhooks`: Handlers for Banks, E-sign, Telematics.
    *   `/cron`: Fine checks, Doc expiry, Recurring invoices.

### Core Flows
1.  **Deal Creation**: Ops/Sales creates Deal → Uploads Client Docs → Risk Review → Finance Approval → Contract Gen → E-Sign → Handover.
2.  **Fine Processing**: Cron Job → Fetch Fines → Match Vehicle → Create Expense & Invoice → Notify Client → Charge Client.

---

## 5. User Experience & Design Requirements

### Design Philosophy
*   **Aesthetics**: Minimalist, professional, data-dense but legible. "Vercel-like" aesthetic.
*   **System**: Shadcn/ui + Tailwind CSS.
*   **Theme**: Light/Dark mode support (System default).

### Core Components
*   **Navigation**: Collapsible sidebar for desktop, bottom/burger menu for mobile.
*   **Data Display**: Sortable/filterable DataTables (TanStack Table) for fleets/invoices.
*   **Boards**: Kanban for Deal stages.
*   **Forms**: Multi-step wizards with Zod validation.

### Accessibility
*   WCAG 2.1 AA compliance.
*   Keyboard navigation support for all high-frequency operational tasks.

---

## 6. Technical Specifications

### System Architecture
*   **Frontend**: Next.js 14+ (App Router), React Server Components.
*   **Backend**: Serverless Actions, Supabase (PostgreSQL, Auth, Storage, Edge Functions).
*   **State Mgmt**: React Query (server state), Zustand (client UI state).

### Data Model (ERD Summary)
*   `profiles`: Users (linked to `auth.users`), roles, status.
*   `vehicles`: Fleet assets, specs, status, license plate.
*   `deals`: Leasing contracts, linking Client + Vehicle.
*   `tasks`: Workflow units (manual or automated).
*   `invoices`: Financial records (payable/receivable).
*   `documents`: Files linked to entities (expiry, type).

### Integrations [I]
*   **Supabase**: Auth, DB, Realtime, Storage (ID: `/supabase/supabase`).
*   **Payment Gateway**: Stripe or similar (ID: `/stripe/stripe-js` / `/stripe/react-stripe-js`).
*   **Messaging**: Twilio/SendGrid (for notifications).
*   **Map/Location**: Mapbox or Google Maps (for Telematics viz).

### Automation [A] & AI [AI]
*   **Workflow**: Custom State Machine triggered by Task completion or Webhooks.
*   **Cron**: Supabase Edge Functions (pg_cron or scheduled functions) for periodic tasks (Fines, Expiry).
*   **AI**: (Future) Predictive maintenance models, Risk scoring based on profile data.

---

## 7. Delivery & Operations

### Implementation Roadmap
*   **Phase 1 (Core)**: Auth, Ops Dashboard, Deal Workflow, Basic Vehicle/Client Mgmt.
*   **Phase 2 (Finance/Client)**: Client Portal, Billing/Invoicing, Fine Automation.
*   **Phase 3 (Advanced)**: Investor Portal, Telematics, Smart Collections, AI Risk.

### Testing Strategy
*   **Unit**: Vitest for utility logic and state machines.
*   **Integration**: API route testing (Supabase interactions).
*   **E2E**: Playwright for critical flows (Login → Create Deal → Close).
*   **Uploads**: Unit/integration tests for signed URL flows, file validation, and error handling around document uploads.

### Risks
*   **Data Privacy**: Handling sensitive client docs (Passport/ID). Mitigation: RLS policies + Signed URLs.
*   **Integration Failures**: API downtime (RTA/Bank). Mitigation: Queue-based retries + Dead Letter Queues.

---

## 8. Appendices

### Reference Docs (Context7)

| Library ID | Source | Relevance | Version |
| :--- | :--- | :--- | :--- |
| `/vercel/next.js` | https://nextjs.org/docs | Framework Core | 14.x (App Router) |
| `/supabase/supabase` | https://supabase.com/docs | Backend/Auth/DB | v2 |
| `/tailwindlabs/tailwindcss` | https://tailwindcss.com/docs | Styling | v3.4 |
| `/shadcn/ui` | https://ui.shadcn.com | UI Components | Latest |
| `/tanstack/table` | https://tanstack.com/table | Data Grids | v8 |
| `/colinhacks/zod` | https://zod.dev | Validation | v3 |
| `/lucide-icons/lucide` | https://lucide.dev | Iconography | Latest |

### Glossary
*   **RBAC**: Role-Based Access Control.
*   **BPM**: Business Process Management.
*   **RTA**: Roads and Transport Authority (Dubai).
*   **Salik**: Dubai Road Toll System.
*   **NOC**: No Objection Certificate.
