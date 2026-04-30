<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->

## Component structure

- Do not define multiple React components in a single file unless they are truly trivial.
- If a component needs local subcomponents, create a folder for it and place those subcomponents in a `components/` directory within that folder.
- Prefer a top-level `index.tsx` (or similarly focused entry file) that only defines the main exported component and imports subcomponents from sibling files.
