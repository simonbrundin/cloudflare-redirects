## Why
The sync process fails when the number of redirect rules exceeds Cloudflare's limit for zone rulesets in the http_request_dynamic_redirect phase. This prevents successful synchronization of redirects.

## What Changes
- Modify the redirect sync capability to handle Cloudflare's ruleset limits by consolidating or batching redirect rules
- Implement logic to detect when limits are approached and take appropriate action

## Impact
- Affected specs: redirect-sync
- Affected code: scripts/sync-redirects.js