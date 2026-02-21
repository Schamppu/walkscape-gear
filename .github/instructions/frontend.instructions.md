---
applyTo: "frontend"
description: "Vue.js Frontend-specific guidelines"
---

Frontend Architecture (Vue 3 + Pinia)

Responsibilities:
- Contains all game domain logic.
- Computes gear effectiveness.
- Performs optimization calculations.
- Manages client-side caching of API data.

Data Flow:

1. App.vue bootstrap:
   - Requests all stores to fetch minimal item lists.
   - Stores list data for display.
2. Detailed item data is fetched by id as needed.
3. Detailed data is cached aggressively.
4. Domain layer performs all calculations.

Folder Rules:

- /src/domain:
  Pure game logic.
  No Vue imports.
  No reactive references.
  Fully typed.
  No side effects.

- /src/stores:
  Responsible for:
    - Fetching from backend/API
    - Caching
    - Exposing reactive state

- Vue components:
  - Must not contain complex game calculations.
  - Import domain functions instead.