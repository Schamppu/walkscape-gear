# Advanced optimiser jobs

Real optimiser jobs for the tuning benchmark (`test/domain/advancedOptimiser/benchmark.spec.ts`).

To add one:
1. Turn on **Settings → Tools → Optimiser operations** (the `debugOptimiser` debug setting).
2. Select an activity or recipe, set up targets in the Optimiser modal and press **Export job (debug)**.
3. Save the downloaded `optimiser-job-<id>.json` here.

Run the benchmark with `BENCH=1 npx vitest run benchmark`. It prints a table per job.
