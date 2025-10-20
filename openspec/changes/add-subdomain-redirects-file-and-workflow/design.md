## Context
This feature introduces automated synchronization of subdomain redirects from a configuration file to Cloudflare. The project currently has no redirect management capabilities, so this establishes the foundation for managing redirects as code.

## Goals / Non-Goals
- Goals: Provide simple config-driven redirect management, automate sync via CI/CD, ensure consistency between code and Cloudflare
- Non-Goals: Advanced redirect features (conditions, priorities), UI for redirect management, support for non-subdomain redirects

## Decisions
- Decision: Use JSON format for config file (simple, widely supported, easy to parse)
- Alternatives considered: YAML (more readable but adds dependency), CSV (too simple for complex mappings)
- Decision: GitHub Actions for workflow (native to GitHub, no external CI needed)
- Alternatives considered: Other CI platforms (not relevant for GitHub-hosted repos)

## Risks / Trade-offs
- Cloudflare API rate limits → Mitigation: Batch operations, add retry logic
- Authentication security → Mitigation: Use GitHub secrets, never store tokens in code
- Config file changes breaking redirects → Mitigation: Validation, dry-run mode for testing

## Migration Plan
No existing redirects to migrate. New feature with no legacy impact.

## Open Questions
- What Cloudflare zone ID to use? (Requires user input during setup)
- How to handle existing redirects not in config? (Option: warn vs auto-delete)