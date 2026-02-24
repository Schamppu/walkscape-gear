Domain Layer - Game Logic Engine

Contains pure, framework-independent game logic.

Includes:
- Gear stat aggregation
- Activity effectiveness calculations
- Optimization algorithms
- Data normalization utilities

Constraints:
- No Vue imports.
- No Pinia imports.
- No reactive references.
- No side effects.
- No network calls.
- No database calls.
- No caching logic.

All functions must:
- Be pure.
- Be fully typed.
- Avoid mutating input.
- Explicitly handle edge cases.

This folder represents the core game engine.