# JobForged: Sites and GitHub publication

The user requires every update made here in Sites to also update
`MLT-Mateus/JobForged` on GitHub, branch `main`.

- Native Sites project: `appgprj_6a7e58d9c9f48191a05c0c8feb3acb12`.
- Treat this Sites checkout as the source for changes requested in Sites.
- Before editing, fetch both repositories and inspect any divergence. Preserve
  unrelated changes; never force-push or silently overwrite new concurrent work.
- For each completed update, synchronize the exact tracked source tree to GitHub
  using the connected GitHub tools or an authorized Git credential. Keep both
  histories intact. Compare Git tree hashes to verify identical source content.
- When publication is requested, deploy through native Sites tools and wait for
  a successful deployment response. GitHub Actions success is not a Sites deploy.
- If either destination fails, explicitly report the partial result. Do not
  claim synchronization or publication succeeded without checking both.
- Never store credentials in this repository. This is an execution rule for
  agents working on the project, not a background webhook or scheduled service.

## Permanent Design System rule for JobForged work

The Design System and shared UI library are the single source of truth for
visual tokens and reusable components across the application. For every future
JobForged creation or update:

1. Inspect the Design System, shared tokens, and existing components before
   editing screens.
2. Reuse approved tokens and components before creating a new visual element.
3. Do not duplicate component implementations or page-level color, size, or
   state styles when a shared definition exists.
4. Add any missing component or state to the shared UI library and Design
   System, then use that same implementation on every affected screen.
5. Validate affected pages after each change and confirm they still use the
   shared definitions.
6. Report the tokens and components reused or changed, and identify and fix
   any related page-level definitions before considering the update complete.

## Triage badge

The latest approved additional 34px downward correction is defined in `app/globals.css`:
`.phone-quality` uses `top: 420px` by default and `top: 450px` in its existing
responsive rule. Keep one source of truth for this position. Do not reintroduce
`app/phone-layout-overrides.css` or an overriding `!important` rule.
