---
name: Adapting literal feature specs to this codebase
description: How to handle user-provided feature specs that reference statuses, files, or patterns that don't match the actual codebase conventions.
---

Users sometimes attach specs written generically or for a different stack (e.g. referencing `server.js`, a `funded` status, or flat file structures) that don't literally match this project's actual code (Express 5 + Drizzle + OpenAPI/Orval codegen, specific job status enums, etc.).

**Rule:** Map the spec's *intent* onto the real schema/routes/conventions rather than introducing new statuses, files, or patterns the spec mentions literally. E.g. a spec's "funded" status may not exist if this app's jobs go straight to "open" after creation regardless of payment completion — treat "funded" as equivalent to "open with no accepted bid" instead of adding a new status.

**Why:** Copying spec terminology literally creates parallel/inconsistent status machines and duplicate concepts, causing confusing states and bugs (e.g. a job that's both "in_progress" and has no accepted bid, which is impossible in this schema).

**How to apply:** Before implementing an attached/pasted spec, first explore the actual schema, routes, and OpenAPI contract to find the closest existing equivalent for each concept in the spec, and use the existing codegen/openapi-first workflow (edit `openapi.yaml` → run `pnpm --filter @workspace/api-spec run codegen` → implement routes matching generated types) rather than the spec's literal file/status names.
