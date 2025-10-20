const axios = require("axios");
const fs = require("fs");
const { validateRedirectsConfig } = require("./validate-redirects");

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

if (!API_TOKEN) {
  console.error("CLOUDFLARE_API_TOKEN environment variable is required");
  process.exit(1);
}

async function getZoneId(domain) {
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
    return response.data.result[0].id;
  } catch (error) {
    throw new Error(
      `Failed to get zone ID for ${domain}: ${error.response?.data?.errors?.[0]?.message || error.message}`,
    );
  }
}

async function getRedirectRuleset(zoneId) {
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
    const rulesets = response.data.result;
    let redirectRuleset = rulesets.find(
      (rs) => rs.phase === "http_request_redirect",
    );
    if (!redirectRuleset) {
      // Create new ruleset
      const createResponse = await axios.post(
        `${CLOUDFLARE_API_BASE}/zones/${zoneId}/rulesets`,
        {
          name: "Auto-generated redirects",
          kind: "zone",
          phase: "http_request_dynamic_redirect",
          rules: [],
        },
        {
          headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            "Content-Type": "application/json",
          },
        },
      );
      redirectRuleset = createResponse.data.result;
    }
    return redirectRuleset;
  } catch (error) {
    throw new Error(
      `Failed to get redirect ruleset: ${error.response?.data?.errors?.[0]?.message || error.message}`,
    );
  }
}

async function getRulesetRules(zoneId, rulesetId) {
  try {
    const response = await axios.get(
      `${CLOUDFLARE_API_BASE}/zones/${zoneId}/rulesets/${rulesetId}`,
      {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );
    return response.data.result.rules || [];
  } catch (error) {
    throw new Error(
      `Failed to get ruleset rules: ${error.response?.data?.errors?.[0]?.message || error.message}`,
    );
  }
}

async function updateRulesetRules(zoneId, rulesetId, rules) {
  try {
    await axios.put(
      `${CLOUDFLARE_API_BASE}/zones/${zoneId}/rulesets/${rulesetId}`,
      {
        rules,
      },
      {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    throw new Error(
      `Failed to update ruleset rules: ${error.response?.data?.errors?.[0]?.message || error.message}`,
    );
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

      const zoneId = await getZoneId(zoneDomain);

      // Get redirect ruleset
      const ruleset = await getRedirectRuleset(zoneId);

      // Get existing rules
      const existingRules = await getRulesetRules(zoneId, ruleset.id);

      // Filter out auto-generated rules
      const nonAutoRules = existingRules.filter(
        (rule) => rule.description !== "auto-generated-redirect",
      );

      // Create new auto-generated rules
      const newAutoRules = rules.map(({ source, target }) => ({
        expression: `http.host == "${source}"`,
        action: "redirect",
        action_parameters: {
          from_value: {
            status_code: 301,
            preserve_query_string: true,
            target_url: {
              value: target,
            },
          },
        },
        description: "auto-generated-redirect",
      }));

      // Combine rules
      const updatedRules = [...nonAutoRules, ...newAutoRules];

      console.log(`Updating ruleset with ${newAutoRules.length} new redirects`);
      for (const { source, target } of rules) {
        console.log(`Creating redirect: ${source} -> ${target}`);
      }

      // Update ruleset
      await updateRulesetRules(zoneId, ruleset.id, updatedRules);
    }

    console.log("Redirect synchronization completed successfully");
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

