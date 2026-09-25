# JobForged: official Site and GitHub publication order

- Native official Sites project: `appgprj_6a7e58d9c9f48191a05c0c8feb3acb12`, slug `jobforged-landing-page`.
- Treat this Sites checkout and the live official Site as the source for changes requested through Sites. Do not use GitHub as the implementation base.
- Complete the requested change in the Sites source, publish it through native Sites tools, and verify the successful published version before accessing `MLT-Mateus/JobForged` on GitHub.
- Only after the official Site is verified live, synchronize the exact published source tree to the project's already-linked official GitHub branch. Preserve unrelated changes and both histories. Never force-push or overwrite concurrent work.
- Compare Git tree hashes to verify the GitHub commit contains the same tracked source as the published Site. Do not include unrelated changes.
- If Site publication or verification fails, stop before GitHub. If the linked GitHub branch cannot be identified or safely updated after publication, report the Site as published and the GitHub sync as incomplete.
- Never store credentials in this repository. This is an execution rule for agents working on the project, not a background webhook or scheduled service.

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
