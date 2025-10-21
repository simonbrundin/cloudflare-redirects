# Cloudflare Redirects

Manage subdomain redirects across your Cloudflare domains using a simple JSON
configuration file. Automatically sync redirects to Cloudflare via GitHub
Actions.

## Setup

1. Create a `redirects.json` file in the root of your repository with your
   redirect mappings.
2. Add your Cloudflare API token to GitHub repository secrets as
   `CLOUDFLARE_API_TOKEN`.
3. Push changes to the `main` branch to trigger automatic synchronization.

## Configuration File Format

The `redirects.json` file should follow this structure:

```json
{
  "version": "1.0",
  "redirects": {
    "blog.simonbrundin.com": "https://blog.example.com",
    "api.simonbrundin.com": "https://api.example.com",
    "docs.otherdomain.com": "https://docs.example.com"
  }
}
```

- `version`: Must be "1.0"
- `redirects`: Object mapping full source domain names to target URLs
- Source domains must include the full subdomain and domain (e.g.,
  `subdomain.domain.com`)
- Target URLs must be valid HTTP/HTTPS URLs

## Validation

Run validation locally:

```bash
npm run validate
```

## Manual Sync

To sync redirects manually:

```bash
export CLOUDFLARE_API_TOKEN=your_token_here
npm run sync
```

## How It Works

- The configuration file defines source domains and their target URLs
- On push to main branch, GitHub Actions automatically validates and syncs
  redirects
- Redirects are implemented as Cloudflare Rulesets with 301 redirects
- DNS CNAME records are automatically created for subdomains pointing to the root domain
- Existing auto-generated rulesets and DNS records are updated before creating new ones
- Old auto-generated DNS records and rulesets are cleaned up automatically

## Troubleshooting

### Common Issues

1. **Zone not found**: Ensure the domain is added to your Cloudflare account and
   the API token has access
2. **API rate limits**: The script includes basic error handling; wait and retry
   if needed
3. **Ruleset limits exceeded**: Cloudflare has limits on the number of zone
   rulesets per phase. If you have many domains, the script will attempt to
   reuse existing rulesets. If limits are reached, consider consolidating
   redirects or contacting Cloudflare support.
4. **Invalid config**: Run `npm run validate` to check your `redirects.json`
   file
5. **Workflow fails**: Check GitHub Actions logs for detailed error messages
6. **Redirects not working**: Ensure the source domains have DNS records
   pointing to Cloudflare (A/CNAME records for the zone)

### API Permissions

Your Cloudflare API token needs these permissions:

- Zone:Rulesets (Edit)
- Zone:DNS (Edit)
- Zone:Read

## Testing

Run tests:

```bash
npm test
```

