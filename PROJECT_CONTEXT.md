# Project Context: HR SaaS Platform

## Project Overview
**Type:** B2B HR SaaS (similar to Sprout/Zoho)
**Status:** Early development, Phase 1 (Auth + RBAC)
**Goal:** Production SaaS launch, long-term growth
**Developer Level:** Junior with solid experience, first full SaaS build

## Tech Stack
- **Frontend:** SvelteKit + TypeScript + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + RLS + Storage)
- **Deployment:** TBD (Vercel/Netlify for frontend, Supabase for backend)

## Architecture Decisions

### Backend: Supabase
**Rationale:** PostgreSQL with RLS for multi-tenant isolation, SQL migrations, type generation, predictable pricing, standard SQL (easier for junior dev), better debugging than Firebase.

### Multi-Tenant Strategy
- Organization-scoped data model (`organization_id` on all tenant tables)
- Row-Level Security (RLS) policies enforce org isolation
- Frontend never passes `organization_id` (backend derives from user membership)
- One user can belong to multiple orgs (future-proof)

### Data Model (Phase 1)
```
users (Supabase Auth managed)
├── id, email, created_at

organizations
├── id, name, slug (unique), created_at

organization_memberships
├── id, user_id (FK), organization_id (FK)
├── role (enum: 'employee' | 'manager' | 'hr_admin')
├── department (nullable), created_at
```

### Role-Based Access Control
- **Roles:** Employee, Manager, HR Admin (3 roles for Phase 1)
- **Storage:** Role on `organization_memberships` table (not on user)
- **Enforcement:** Backend RLS policies + SvelteKit server-side checks
- **Future:** Permissions table when granular control needed (not Phase 1)

### Authentication Pattern
- Supabase Auth handles authentication
- SvelteKit server-side sessions (httpOnly cookies)
- Server load functions verify session on every request
- Client uses Supabase client for optional real-time features

### API Pattern
- **Primary:** SvelteKit Server Actions (`+page.server.ts`)
- **When to use API routes:** External webhooks, public endpoints, future mobile API

## Development Principles
- **Clarity over cleverness:** Prefer boring, proven patterns
- **Avoid overengineering:** Call out unnecessary complexity
- **Incremental development:** Design upgrade paths, not perfect systems
- **No duplication:** Reuse existing code/patterns
- **Clean codebase:** Well-organized, maintainable
- **No mocking in dev/prod:** Only in tests
- **Simple solutions first:** Exhaust existing options before new patterns

## Phase 1 Goals (Current Focus)
1. Multi-tenant organization setup
2. Role-based authentication (Employee, Manager, HR Admin)
3. Backend RLS policies for org isolation
4. Frontend route protection by role
5. Clean user/org/membership separation

## What NOT to Build Yet
- Permissions system (3 roles sufficient)
- Role hierarchies
- Audit logging
- Email notifications
- SSO/2FA
- Advanced org settings

## Security Requirements
- All access control enforced on backend (RLS + server checks)
- Frontend role checks are UX only, not security
- Never trust client for role/org context
- Session in httpOnly cookies, HTTPS only
- Every tenant table must have RLS policy

## SvelteKit Patterns
- **Auth utilities:** `src/lib/auth.ts` (getSessionUser, requireRole, requireOrg)
- **Global hooks:** `src/hooks.server.ts` (verify session, attach user to locals)
- **Route protection:** `+layout.server.ts` (check role, redirect if unauthorized)
- **Server actions:** Business logic in `+page.server.ts` actions

## Common Pitfalls to Avoid
- Trusting frontend for security (always verify backend)
- Over-engineering permissions before needed
- Premature optimization (build for 100 orgs, optimize at limits)
- Hardcoding single-org assumptions
- Forgetting RLS on new tables
- Role escalation (role from DB, never from request)

## Scaling Strategy
- Acknowledge scaling concerns, don't solve prematurely
- Build for 6-month scale, optimize when limits hit
- Supabase handles auth rate limits, storage, real-time
- Database: Add indexes/optimize queries when needed

## Roadmap
**Phase 1 (Weeks 1-3):** Auth, org setup, role enforcement
**Phase 2+:** Employee management, time/attendance, payroll (after Phase 1 solid)

## Critical Early Decisions (Must Be Correct)
- Multi-tenant data model (organization_id everywhere)
- Role storage (membership table)
- Auth provider (Supabase)
- RLS strategy (org-scoped policies)

## Decisions That Can Change Later
- UI/UX patterns
- Feature modules
- Notification system
- Reporting structure
- API design

## AI Assistant Role
- **Act as:** Professional adviser, technical co-founder, 10x senior engineer
- **Focus:** Strong architectural decisions without overengineering
- **Prioritize:** Clarity, maintainability, systems hard to misuse, easy to evolve
- **Explain:** Trade-offs plainly and concretely
- **Call out:** Overengineering, security risks, premature optimization
- **Recommend:** Firm decisions, not endless options

