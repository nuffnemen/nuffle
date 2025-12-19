# Cambria Academy — Repo Audit

_Snapshot of the repository before the redesign documented below. The rest of the docs (e.g., BUILD_REPORT) describe the new system._

## Current Route Map
- `/` → server component redirecting unauthenticated users to `/login` and everyone else to `/me`
- `/login` → Supabase email/password login + sign-up form using the browser SDK
- `/logout` (POST) → Supabase sign-out then redirect to `/login`
- `/me` → looks up/creates a `User` row for the Supabase account and redirects based on `role`
- `/me/role` (GET) → JSON role lookup used by legacy middleware (expects `/api/me/role`, so middleware 404s)
- `/student` → basic student dashboard with timer + totals from `hourEntry`
- `/student/hours` combines totals, timer, and history (student client clock)
- `/instructor` → placeholder page guarded for instructor/head/admin
- `/hours` → instructor-facing queue & timer to approve/reject (uses `app/hours/add|approve|reject` POST routes)
- `/admin` → placeholder admin dashboard
- `/admin/users` → now redirects to `/admin/settings`, where the SSR user management interface was consolidated
- `/admin/settings` → settings panel now hosts the campus clock location form plus the inline name/email/role editor (server action updates Prisma and revalidates the page)
- `/api/student/hours/log` (POST) → student timer submission endpoint

## Auth / Session Approach
- Supabase email/password auth (credentials handled via `@supabase/ssr`).
- `lib/auth.ts` exposes helpers (`getCurrentEmail`, `getCurrentRole`, `requireRoles`) that rely on Supabase cookies and Prisma `User` records.
- There is no working global middleware. Legacy `prisma/middleware.ts` attempted to guard `/hours/*` but lived in the wrong path and called `/api/me/role` (which does not exist), so it was unused (and has since been removed).

## Data Models Relevant to Users + Hours
Defined in `prisma/schema.prisma`:
- `User`: `id`, `email`, optional `name`, `role` enum (`ADMIN`, `HEAD_INSTRUCTOR`, `INSTRUCTOR`, `STUDENT`), `isActive`, `createdAt`, `updatedAt`.
- `Program`: keyed by `ProgramKey` enum (`NAIL_TECH`, `COSMETOLOGY`), includes `name` and `requiredHours`.
- `hourEntry`: ad-hoc lowercase model storing logged hours — `id`, `studentEmail`, `programKey`, `datePerformed`, `minutes`, `status`, `createdAt`.

No other modules (assignments, curriculum, messaging, etc.) currently have schema or routes.
