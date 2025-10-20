const axios = require("axios");
const fs = require("fs");
const { validateRedirectsConfig } = require("./validate-redirects");

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

if (!API_TOKEN) {
  console.error("CLOUDFLARE_API_TOKEN environment variable is required");
  process.exit(1);
}

async function getZoneAndAccountId(domain) {
  try {
    const response = await axios.get(
      `${CLOUDFLARE_API_BASE}/zones?name=${domain}`,
      {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );
    if (response.data.result.length === 0) {
      throw new Error(`Zone not found for domain: ${domain}`);
    }
    const zone = response.data.result[0];
    return { zoneId: zone.id, accountId: zone.account.id };
  } catch (error) {
    throw new Error(
      `Failed to get zone/account ID for ${domain}: ${error.response?.data?.errors?.[0]?.message || error.message}`,
    );
  }
}

async function getExistingRulesets(zoneId) {
  try {
    const response = await axios.get(
      `${CLOUDFLARE_API_BASE}/zones/${zoneId}/rulesets`,
      {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );
    return response.data.result.filter(ruleset => ruleset.description === "auto-generated-redirects");
  } catch (error) {
    throw new Error(
      `Failed to get rulesets: ${error.response?.data?.errors?.[0]?.message || error.message}`,
    );
  }
}

async function createOrUpdateRuleset(zoneId, rules) {
  try {
    const existingRulesets = await getExistingRulesets(zoneId);
    const rulesetData = {
      name: "auto-generated-redirects",
      description: "auto-generated-redirects",
      kind: "zone",
      phase: "http_request_dynamic_redirect",
      rules: rules.map(({ source, target }) => ({
        expression: `http.host eq "${source}"`,
        action: "redirect",
        action_parameters: {
          from_value: {
            status_code: 301,
            preserve_query_string: true,
            target_url: {
              value: target
            }
          }
        },
        description: `Redirect ${source} to ${target}`
      }))
    };

    if (existingRulesets.length > 0) {
      // Update existing ruleset
      const rulesetId = existingRulesets[0].id;
      await axios.put(
        `${CLOUDFLARE_API_BASE}/zones/${zoneId}/rulesets/${rulesetId}`,
        rulesetData,
        {
          headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            "Content-Type": "application/json",
          },
        },
      );
      console.log(`Updated ruleset for zone ${zoneId}`);
    } else {
      // Create new ruleset
      await axios.post(
        `${CLOUDFLARE_API_BASE}/zones/${zoneId}/rulesets`,
        rulesetData,
        {
          headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            "Content-Type": "application/json",
          },
        },
      );
      console.log(`Created ruleset for zone ${zoneId}`);
    }
  } catch (error) {
    throw new Error(
      `Failed to create/update ruleset for zone ${zoneId}: ${error.response?.data?.errors?.[0]?.message || error.message}`,
    );
  }
}

async function deleteOldDNSRecords(zoneId) {
  try {
    // Get existing DNS records
    const response = await axios.get(
      `${CLOUDFLARE_API_BASE}/zones/${zoneId}/dns_records`,
      {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );
    const existingRecords = response.data.result;

    // Delete existing auto-generated CNAME records
    const autoRecords = existingRecords.filter(
      (record) => record.comment === "auto-generated-redirect",
    );
    for (const record of autoRecords) {
      console.log(`Deleting old DNS record: ${record.name}`);
      await axios.delete(
        `${CLOUDFLARE_API_BASE}/zones/${zoneId}/dns_records/${record.id}`,
        {
          headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            "Content-Type": "application/json",
          },
        },
      );
    }
  } catch (error) {
    console.warn(`Warning: Failed to clean up old DNS records: ${error.message}`);
  }
}

async function syncRedirects() {
  try {
    // Validate config
    validateRedirectsConfig();

    const config = JSON.parse(fs.readFileSync("redirects.json", "utf8"));
    const redirects = config.redirects;

    // Group redirects by zone
    const zoneRedirects = {};
    for (const [source, target] of Object.entries(redirects)) {
      const domainParts = source.split(".");
      const zoneDomain = domainParts.slice(-2).join("."); // Assume .com or similar
      if (!zoneRedirects[zoneDomain]) {
        zoneRedirects[zoneDomain] = [];
      }
      zoneRedirects[zoneDomain].push({ source, target });
    }

    for (const [zoneDomain, rules] of Object.entries(zoneRedirects)) {
      console.log(`Processing zone: ${zoneDomain}`);

      const { zoneId } = await getZoneAndAccountId(zoneDomain);

      // Clean up old DNS records (for backwards compatibility)
      await deleteOldDNSRecords(zoneId);

      // Create or update ruleset with redirect rules
      console.log(`Creating/updating redirect rules for ${rules.length} redirects`);
      await createOrUpdateRuleset(zoneId, rules);
    }

    console.log("DNS synchronization completed successfully");
  } catch (error) {
    console.error("Sync failed:", error.message);
    process.exit(1);
  }
}

// Run sync if called directly
if (require.main === module) {
  syncRedirects();
}

module.exports = { syncRedirects };