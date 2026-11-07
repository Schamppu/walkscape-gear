Architecture Rules:

1. Game logic lives ONLY in frontend/src/domain.
2. Backend must not contain game calculation logic.
3. Backend orchestrates between:
   - External Game API
   - Database (Prisma)
   - Frontend
4. External API restrictions:
   - Full files cannot be fetched.
   - Item lists return minimal data.
   - Detailed item data must be fetched individually by id.
5. Caching is intentional and required.
6. Do not duplicate domain logic across layers.
7. Prefer pure, typed functions in domain modules.
8. Do not modify Prisma generated files.