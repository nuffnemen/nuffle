# Cambria Academy Build Report

## Final Route Map
- `/` — Login (app/page.tsx)
- `/student` — dashboard with hours, assignments, announcements
- `/student/hours` (includes timer + log)
- `/student/assignments`, `/student/assignments/[id]`
- `/student/messages`, `/student/messages/[threadId]`
- `/student/curriculum`
- `/student/portfolio`
- `/instructor` — dashboard
- `/instructor/hours`
- `/instructor/assignments`, `/instructor/assignments/[id]`
- `/instructor/messages`, `/instructor/messages/[threadId]`
- `/instructor/announcements`
- `/instructor/curriculum`
- `/instructor/students`, `/instructor/students/[id]`
- `/head` — head dashboard
- `/head/instructors`
- `/admin` — admin dashboard
- `/admin/settings` — admin clock location controls + user management
- `/logout` (POST) and `/api/session/role` for proxy support

## Data Models
Located in `prisma/schema.prisma`:
- Expanded `User` model with relations to all modules
- `HourEntry`, `Assignment`, `AssignmentSubmission`
- `Thread`, `ThreadParticipant`, `Message`
- `Announcement`, `CurriculumMaterial`, `PortfolioItem`, `InstructorTask`
- Supporting enums: `HourStatus`, `AssignmentTarget`, `SubmissionStatus`, `AnnouncementAudience`, `CurriculumMaterialType`

Seed data in `prisma/seed.ts` creates representative accounts, tasks, hours, assignments, curriculum items, and messaging threads.

## Auth & Middleware
- Supabase session helpers consolidated in `lib/auth.ts` (`getCurrentUser`, `dashboardPathForRole`, etc.)
- Global guard implemented via `proxy.ts` to enforce role-based redirects and keep unauthenticated requests on `/`
- Each role layout (`app/student/layout.tsx`, `app/instructor/layout.tsx`, `app/head/layout.tsx`, `app/admin/layout.tsx`) calls `requireRoles` as a server-side backstop and renders the shared nav.

## File Uploads
- `lib/storage.ts` provides `uploadFile`, `getPublicUrl`, and `deleteFile` targeting `public/uploads`
- Used by pages that accept file input: student assignment submissions, portfolio uploads, instructor curriculum materials.

## Key Screens & Features
- Student dashboard, hours log/history, assignments (list/detail & submission), messaging threads, curriculum view, and portfolio gallery/submit flow.
- Admin settings now control the allowed clock-in point (pick a spot with the embedded Google Map preview) and students must be near that location for the timer to start.
- Instructor assignments list now uses a dedicated `/instructor/assignments/new` page for creating assignments and keeps the list focused on editing/deleting found items.
- Student grades page listing each assignment score, showing missing work/averages, and linking back to the assignment detail.
- Instructor dashboard, hours approval + manual add, assignment creation & grading, messaging, announcements, curriculum management, and student profiles with portfolio feedback.
- Head instructor dashboards for tasks + instructor POV.
- Admin dashboards for role counts and a unified settings area that manages the campus clock location and lets admins edit names/emails/roles inline.
- Navigation shells per role plus `/logout` action.
- Assignment creation now records a “points possible” value, surfaces it in instructor and student lists, and highlights it on assignment detail pages.
- Notification helpers now carry student/assignment metadata so grading marks the matching “ungraded” alert read immediately (see `lib/notifications.ts` and `app/instructor/assignments/[id]/page.tsx`).

## Deferred / Phase 2 Ideas
- Rich text editors and attachment previews for assignments and announcements.
- Bulk messaging/announcement targeting UI.
- More granular curriculum permissions and file versioning.
- Media processing + CDN for uploaded images/files.
- Replace placeholder sample files with actual design assets.
- Migrate from Turbopack build blockers once Next.js exposes a non-Turbopack build path in this environment.
