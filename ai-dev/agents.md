This repository contains:

- frontend (Vue 3, Pinia) — contains domain logic and game calculations
- backend (Node.js, Express) — orchestration layer only
- backend/prisma — database schema and generated client

When generating code:

- Respect layer boundaries.
- Do not move logic across architectural layers.
- Do not introduce business logic into Express routes.

When developing features:

- Use tracer bullets
