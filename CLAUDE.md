# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DOMS is a role-based student management system for educational institutions. It has a Node.js/Express backend with MySQL/Sequelize and a Next.js 16 frontend with React 19 and TypeScript.

## Commands

### Backend (from `backend/`)
- `npm run dev` — Start dev server with nodemon (watches `src/`, port 4000)
- `npm start` — Production start (`node src/index.js`)

### Frontend (from `frontend/`)
- `npm run dev` — Start Next.js dev server (port 3000)
- `npm run build` — Production build
- `npm run lint` — Run ESLint

No test suite is configured for either backend or frontend.

## Architecture

### Backend (`backend/src/`)
- **Entry point**: `index.js` — Express app setup, CORS config, route mounting, DB sync with inline migrations, bootstrap admin user
- **Models**: `models/index.js` — Single file containing ALL Sequelize models and associations. Key entities: User, Role, AcademicSession, StudentSession, StudentProfile, Assessment (with Questions/Assignments/Submissions/Responses), Rubric (with Criteria/Scores), MentorTeam (with Members/Requirements/Responses), Announcement
- **Routes/Controllers**: Paired files following `{domain}Routes.js` / `{domain}Controller.js` pattern. Domains: auth, user, session, studentProfile, assessment, rubric, mentor, announcement, jobMatching
- **Middleware**: `auth.js` (JWT verification), `errorHandler.js`, `upload.js` (multer)
- **Utils**: `s3Upload.js` (AWS S3 file uploads)
- **Config**: `database.js` (Sequelize/MySQL connection)
- **Bootstrap**: `bootstrap.js` — Seeds default admin user on startup
- All models use UUID primary keys and `underscored: true` (snake_case DB columns, camelCase JS)
- JSON fields (skills, achievements, etc.) have custom getters to handle string/array parsing

### Frontend (`frontend/app/`)
- **Next.js App Router** with route groups per role: `admin/`, `student/`, `faculty/`, `coordinator/`, `trainer/`, `auth/`
- **State**: Zustand store in `store/authStore.js`
- **API**: `lib/apiClient.js` — Axios instance with JWT token from cookies, auto-refresh on 403
- **Services**: `lib/services/` — API service modules
- **Components**: `components/DashboardLayout.tsx`, `components/ProtectedRoute.tsx`, `components/Announcements/`
- **Styling**: TailwindCSS v4

### Role System
8 roles: ADMIN, HOD, FACULTY, COORDINATOR, PLACEMENT_COORDINATOR, TRAINER, STUDENT, MENTOR. Users sign up with a `requestedRole`, admin approves and sets `approvedRole`. Status flow: PENDING → APPROVED/REJECTED → ACTIVE/INACTIVE.

### Key Patterns
- Backend uses CommonJS (`require`/`module.exports`), frontend uses ES modules
- Authentication: JWT tokens stored in cookies, refresh token mechanism
- File uploads go to AWS S3 via multer + s3Upload utility
- DB schema migrations are done inline in `index.js` startup (ALTER TABLE with duplicate-column error handling)
- CORS configured for `FRONTEND_ORIGIN` env var

### Environment Variables
- Backend: `.env` — DB credentials (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT), JWT_SECRET, AWS credentials, S3 config, PORT (default 4000), FRONTEND_ORIGIN
- Frontend: `.env.local` — NEXT_PUBLIC_API_URL (default http://localhost:4000/api)

### Important Notes from Next.js Agent Rules
This project uses Next.js 16 which may have breaking changes from earlier versions. Check `node_modules/next/dist/docs/` for current API documentation before making changes.
