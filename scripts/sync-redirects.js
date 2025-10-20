const axios = require('axios');
const fs = require('fs');
const { validateRedirectsConfig } = require('./validate-redirects');

const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4';
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

if (!API_TOKEN) {
  console.error('CLOUDFLARE_API_TOKEN environment variable is required');
  process.exit(1);
}

async function getZoneId(domain) {
  try {
    const response = await axios.get(`${CLOUDFLARE_API_BASE}/zones?name=${domain}`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    if (response.data.result.length === 0) {
      throw new Error(`Zone not found for domain: ${domain}`);
    }
    return response.data.result[0].id;
  } catch (error) {
    throw new Error(`Failed to get zone ID for ${domain}: ${error.response?.data?.errors?.[0]?.message || error.message}`);
  }
}

async function getPageRules(zoneId) {
  try {
    const response = await axios.get(`${CLOUDFLARE_API_BASE}/zones/${zoneId}/pagerules`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data.result;
  } catch (error) {
    throw new Error(`Failed to get page rules: ${error.response?.data?.errors?.[0]?.message || error.message}`);
  }
}

async function deletePageRule(zoneId, ruleId) {
  try {
    await axios.delete(`${CLOUDFLARE_API_BASE}/zones/${zoneId}/pagerules/${ruleId}`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error(`Failed to delete page rule ${ruleId}: ${error.response?.data?.errors?.[0]?.message || error.message}`);
  }
}

async function createPageRule(zoneId, targets, actions, note) {
  try {
    const response = await axios.post(`${CLOUDFLARE_API_BASE}/zones/${zoneId}/pagerules`, {
      targets,
      actions,
      priority: 1,
      status: 'active',
      note
    }, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data.result;
  } catch (error) {
    throw new Error(`Failed to create page rule: ${error.response?.data?.errors?.[0]?.message || error.message}`);
  }
}

async function syncRedirects() {
  try {
    // Validate config
    validateRedirectsConfig();

    const config = JSON.parse(fs.readFileSync('redirects.json', 'utf8'));
    const redirects = config.redirects;

    // Group redirects by zone
    const zoneRedirects = {};
    for (const [source, target] of Object.entries(redirects)) {
      const domainParts = source.split('.');
      const zoneDomain = domainParts.slice(-2).join('.'); // Assume .com or similar
      if (!zoneRedirects[zoneDomain]) {
        zoneRedirects[zoneDomain] = [];
      }
      zoneRedirects[zoneDomain].push({ source, target });
    }

    for (const [zoneDomain, rules] of Object.entries(zoneRedirects)) {
      console.log(`Processing zone: ${zoneDomain}`);

      const zoneId = await getZoneId(zoneDomain);

      // Get existing auto-generated rules
      const existingRules = await getPageRules(zoneId);
      const autoRules = existingRules.filter(rule => rule.note === 'auto-generated-redirect');

      // Delete existing auto rules
      for (const rule of autoRules) {
        console.log(`Deleting existing rule for ${rule.targets[0].constraint.value}`);
        await deletePageRule(zoneId, rule.id);
      }

      // Create new rules
      for (const { source, target } of rules) {
        const targets = [{
          target: 'url',
          constraint: {
            operator: 'matches',
            value: `https://${source}/*`
          }
        }];
        const actions = [{
          id: 'forwarding_url',
          value: {
            url: `${target}$1`,
            status_code: 301
          }
        }];
        const note = 'auto-generated-redirect';

        console.log(`Creating redirect: ${source} -> ${target}`);
        await createPageRule(zoneId, targets, actions, note);
      }
    }

    console.log('Redirect synchronization completed successfully');
  } catch (error) {
    console.error('Sync failed:', error.message);
    process.exit(1);
  }
}

// Run sync if called directly
if (require.main === module) {
  syncRedirects();
}

module.exports = { syncRedirects };