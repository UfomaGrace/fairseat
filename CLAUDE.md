# FairSeat
TeSA Cohort 6, Team 4 side project. Own project, not a copy of BloodLink.

Stack: React 19 + TS + Vite, Tailwind v4, react-router ^8.5 (import from "react-router"),
Redux Toolkit + RTK Query (src/store/baseApi.ts, endpoints injected per feature in
src/features/*), Formik + Yup. Contract: contract/openapi.yaml (Fisayo's). Mock: Prism.

Rules:
- Types come from src/api/schema.d.ts (generated). No hand-written models.
- No `any`, no `as unknown as`, no useEffect for fetching, no React Router loaders.
- Use src/shared/ui/ components. Dates shown in Africa/Lagos.
- Errors show "Reference: <requestId>".
- A11y: labels on inputs, role="alert" on errors, visible focus, min-h-11, works at phone width.
- Must pass npm run typecheck, lint, test.

I'm learning RTK Query: explain briefly, in simple terms, then show full files.