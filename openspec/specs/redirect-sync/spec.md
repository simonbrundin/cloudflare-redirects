# Redirect Sync

The redirect sync capability manages URL redirection rules across Cloudflare zones.

## Requirements

### Requirement: Sync Redirect Rules
The redirect sync system SHALL sync redirect rules to Cloudflare while respecting API limits and ruleset constraints.

#### Scenario: Successful Sync Within Limits
- **WHEN** redirect rules are within Cloudflare limits
- **THEN** all rules are synced successfully
- **AND** no consolidation is performed

#### Scenario: Sync Failure Due to Limits
- **WHEN** sync fails due to ruleset limits
- **THEN** system attempts consolidation
- **AND** retries sync with consolidated rules

### Requirement: Handle Cloudflare Ruleset Limits
The redirect sync system SHALL handle Cloudflare's zone ruleset limits by automatically consolidating redirect rules when approaching the maximum number of rulesets for the http_request_dynamic_redirect phase.

#### Scenario: Automatic Consolidation
- **WHEN** the number of redirect rules would exceed Cloudflare's ruleset limit
- **THEN** the system consolidates compatible rules into fewer rulesets
- **AND** sync completes successfully without manual intervention

#### Scenario: Limit Detection
- **WHEN** syncing redirects
- **THEN** the system checks current ruleset count against Cloudflare limits
- **AND** provides clear error messages if consolidation is not possible