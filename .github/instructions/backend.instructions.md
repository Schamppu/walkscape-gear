---
applyTo: "frontend/src"
description: "Vue.js Frontend-specific guidelines"
---

Backend Architecture (Node.js + Express)

Purpose:
- Orchestrates between:
  - External Game API
  - Database (Prisma)
  - Frontend
- Does NOT contain game logic.

Rules:
- No gear effectiveness calculations.
- No optimization logic.
- No domain duplication from frontend.

Responsibilities:
- Fetch from external API (respecting API constraints).
- Batch-fetch detailed items by id.
- Cache API results.
- Persist user state (gear sets, levels, inventory).
- Validate request payloads.

Structure:
- routes: HTTP layer
- controllers: request orchestration
- services: API + DB interaction
- prisma: schema and generated client

Do not modify files under:
- /backend/src/generated