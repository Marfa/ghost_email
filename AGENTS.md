# Agent / contributor rules

## Dependencies

- New or upgraded packages: install **only** at the registry `@latest` (or an explicit version you just verified), never a version recalled from memory.
- After every install or upgrade: run `npm audit`. Do not leave high/critical findings unresolved without an explicit decision in the PR.
- Before adding a dependency, prefer the existing stack / stdlib. If you still add one, check the package (registry status, last release, advisories) first.
- Periodically: `npx npm-check-updates` to see what is outdated. Prefer patch/minor for security; majors need a conscious bump.

## Secrets

- Never commit `.env`, keys, tokens, or Admin API credentials. Use `.env.example` for placeholders only.
- Local gate: enable repo hooks with `git config core.hooksPath hooks` (runs gitleaks on commit).
- CI runs `npm audit` and gitleaks on every push and PR (see `.github/workflows/security.yml`).
