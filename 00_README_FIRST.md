# Nexus AI VoiceOps - Final Ready Package

This folder contains the final merged Nexus AI VoiceOps banking project.

## Folder Structure

```text
01_Backend_Node_API
02_Frontend_Banking_UI
docs
```

## Run The Demo - One Link

Recommended: open this file:

```text
RUN_NEXUS_ONE_LINK.bat
```

It installs missing packages once, starts the backend, starts the TanStack banking UI behind it, and gives you one visible demo link:

```text
http://localhost:4173/login
```

Keep the command window open while presenting.

## Manual Run

```powershell
cd 01_Backend_Node_API
npm install
npm start
```

The backend will proxy the frontend automatically when `02_Frontend_Banking_UI` is beside it. Open:

```text
http://localhost:4173/login
```

If the UI keeps showing "Nexus UI is starting", install frontend packages once:

```powershell
cd 02_Frontend_Banking_UI
npm install
```

## What Is Ready

- Premium TanStack banking frontend.
- Customer Portal with customer-safe responses only.
- Employee Workspace with requests, agents, audit, automations, and committee demo.
- Redesigned Requests screen with risk badges and request details.
- Redesigned Agent Answers view with agent pipeline and decision quality display.
- Backend API with synthetic banking data and multi-agent analysis.
- Document upload workflow for loan requests.
- Admin decision workflow: approve, reject, or mark for review.
- Arabic/English support.
- Demo fallback for offline preview if backend is unavailable.

## Files To Show The Committee

- `README.md` - GitHub overview and architecture diagram.
- `docs/STUDENT_WORK_LOG_AR.md` - Arabic implementation log and project decisions.
- `docs/ARCHITECTURE_AR.md` - technical architecture and agent flow.
- `docs/DEMO_SCRIPT_AR.md` - presentation script for the live demo.
- `docs/API_CONTRACT.md` - backend endpoint contract.

## Important

No real API key is included. If you use a real key, put it in a local `.env` file only and never upload it to GitHub.
