---
name: JobDetailDialog identity comes from localStorage, not props
description: Reusing the shared job detail modal (aibuild) elsewhere requires setting the same localStorage keys it reads for role detection.
---

The shared job detail modal in the aibuild app determines whether the current viewer is the job's client or its accepted builder by reading `localStorage` (`clientEmail` / `builderEmail`) directly inside the component — it does not accept an identity prop.

**Why:** Any new page that renders this modal for a user whose identity wasn't already established via the normal post/bid flows (e.g. a cross-cutting page showing jobs for an email the user just typed in) will see the wrong branch (e.g. an empty "submit a bid" form instead of "accept bid") because the relevant localStorage key was never set for that email.

**How to apply:** Before opening this modal from a new entry point, set the matching localStorage key(s) to the email the user is asserting is theirs, then render the modal. Verify with an e2e test that exercises the actual role-specific action (accept bid / approve delivery), not just that the modal opens.
