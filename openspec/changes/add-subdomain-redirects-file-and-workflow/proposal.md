## Why
To enable easy management of subdomain redirects through a configuration file and automatic synchronization to Cloudflare via GitHub workflows, ensuring redirects stay in sync with code changes.

## What Changes
- Add a redirects configuration file (e.g., redirects.json or redirects.yaml) to define subdomain to URL mappings
- Implement a GitHub workflow that triggers on push to sync redirects with Cloudflare API
- Add scripts to parse the config file and update Cloudflare redirect rules

## Impact
- Affected specs: New capability "subdomain-redirect-sync"
- Affected code: New workflow file, config file, and sync script
- No breaking changes to existing functionality