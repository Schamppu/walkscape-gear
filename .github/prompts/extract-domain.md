Refactor the selected code according to project standards:

Rules:
- Move all pure calculation logic into /domain.
- Domain functions must be framework-independent.
- No Vue imports.
- No reactive references.
- No side effects.
- Inputs and outputs must be fully typed.
- Do not change behavior.

Steps:
1. Identify pure logic.
2. Create a typed function in /domain/<name>.ts.
3. Replace inline logic with a function call.
4. Keep component responsibilities unchanged.