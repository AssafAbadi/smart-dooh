# Backend 2026 Refactor – Agent Coordination

This doc defines how to split the [Backend 2026 Standards Refactor Plan](.cursor/plans/backend_2026_standards_refactor_f83f4f9d.plan.md) between **two agents/sessions** so each works on different parts with minimal merge conflicts.

---

## How it works

- **No live coordination**: The two agents don’t talk to each other. You run two Cursor chats (or you + another agent) and assign each a **track**.
- **Order matters**: Some phases depend on others. Tracks are ordered so dependencies are respected when you run them in sequence (Track A first, then Track B, or the reverse as noted).
- **Conflict avoidance**: Tracks are chosen so they touch different files where possible. Where overlap exists, one track is marked to go first.

---

## Recommended split

### Track A (Agent / Session 1)

| Phase | Description | Main files |
|-------|-------------|------------|
| **1** | Graceful shutdown + global HTTP exception filter | `main.ts`, new `core/filters/http-exception.filter.ts` |
| **5** | Config validation at startup | `app.module.ts`, new config module, `main.ts`, services that use `process.env` (e.g. PaymentsService) |
| **6** | TrafficDensity cache-aside (Redis) | `TrafficDensityRepository` or traffic-density service |
| **9** | Pure estimation factors (move to util) | New `estimation-factors.util.ts`, `impression-estimator.service.ts` |

**Run first** so that Track B can assume shutdown hooks and global error handling exist, and can use `ConfigService` if needed.

---

### Track B (Agent / Session 2)

| Phase | Description | Main files |
|-------|-------------|------------|
| **2** | Structured logging (replace console.log, optional correlationId) | ad-selection.controller, context-engine (controller + service), impressions.service, impression-estimator.service, business + driver-preferences repos |
| **3** | DTOs and request validation (Zod at boundary) | `libs/shared/dto`, controllers (ad-selection, impressions, context-engine, driver-preferences), new ZodValidationPipe |
| **4** | Repository layer for Impressions and Payments | New CampaignRepository, DriverRepository, PaymentRepository (or similar), ImpressionsService, PaymentsService, impressions.service.spec.ts |
| **7** | Parallel queries in ad-selection | `ad-selection.controller.ts` (getRanked, postSelect) |
| **8** | Controller lean and method granularity | ad-selection controller (helpers/facade), other controllers if needed |

**Run after Track A** (or in parallel in a separate branch and merge after; Phase 2/3/7/8 touch the same controllers, so one agent should own those changes).

---

## Dependency summary

- **Phase 1** (shutdown + filter): No dependencies. Do first.
- **Phase 5** (config): Independent. Can be in Track A and done early.
- **Phase 6** (TrafficDensity cache): Independent. No dependency on 2–4.
- **Phase 9** (estimation util): Independent. Only touches estimator util and service.
- **Phases 2, 3, 4, 7, 8**: All touch controllers and/or services. Best done by **one** agent (Track B) in order 2 → 3 → 4 → 7 → 8 to avoid conflicts and to have logging + DTOs before repository and controller refactors.

---

## Execution options

### Option 1: Sequential (safest)

1. **Session A** completes Track A (Phases 1, 5, 6, 9). Run `npm test`, then commit.
2. **Session B** runs Track B (Phases 2, 3, 4, 7, 8) on top of that. Run `npm test` after each phase; commit when done.

### Option 2: Parallel branches (then merge)

1. **Branch A**: Session A does Track A only.
2. **Branch B**: Session B does Track B only (assumes Phase 1 is already on main, or merge Branch A into B first).
3. Merge A into B (or B into A), resolve any conflicts (mainly in `main.ts` if both touch it; Phase 1 and 5 both touch app bootstrap), then run full test suite.

### Option 3: Same repo, different phases (you + “other agent”)

- **You (Agent 1)**: Take Track A. Finish Phases 1, 5, 6, 9 and commit.
- **Other agent (Agent 2)**: Take Track B. Pull your commits, then do Phases 2, 3, 4, 7, 8 in order.

---

## Handoff checklist for Track B

Before starting Track B, confirm:

- [ ] `app.enableShutdownHooks()` is in `main.ts`.
- [ ] A global `HttpExceptionFilter` is registered and returns `{ success, message, code }`.
- [ ] Config validation runs at startup and required env vars are validated.
- [ ] `npm test` passes after Track A.

Then Track B can safely add logging, DTOs, repositories, parallel queries, and controller refactors.

---

## Summary

- **Yes**, you can split the plan: one agent/session does **Track A** (1, 5, 6, 9), the other does **Track B** (2, 3, 4, 7, 8).
- **Coordination** is via this doc and the order above—no need for the two agents to “talk”; just assign tracks and run Track A before (or merge before) Track B.
- **Conflict risk** is low if Track A is done first and Track B is done in one branch/session; the only shared file to watch when merging is `main.ts` (Phase 1 and 5).

Use this file as the single reference for who does what and in which order.
