<!-- scope: frontend/** -->
<!-- tool: claude-code, copilot -->

Frontend Architecture (Vue 3 + Pinia)

Responsibilities:
- Contains all game domain logic.
- Computes gear effectiveness.
- Performs optimization calculations.
- Manages client-side caching of API data.

Data Flow:

1. App.vue bootstrap (src/bootstrap/loadApp.ts):
   - Two requests: static game data (GET /api/bootstrap, once per session)
     and per-user data (GET /db/bootstrap, refetched on uuid change).
   - Stores are filled through hydrate(staticData) / hydrateUser(userData);
     user hydration runs after static hydration.
   - New startup data is added to one of the bundles (backend
     services/bootstrapService.js + domain/types/bootstrap.ts),
     not as a new store fetch.
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