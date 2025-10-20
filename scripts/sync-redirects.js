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

async function getExistingDNSRecords(zoneId) {
  try {
    const response = await axios.get(
      `${CLOUDFLARE_API_BASE}/zones/${zoneId}/dns_records`,
      {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );
    return response.data.result;
  } catch (error) {
    throw new Error(
      `Failed to get DNS records: ${error.response?.data?.errors?.[0]?.message || error.message}`,
    );
  }
}

async function createDNSRecord(zoneId, name, content) {
  try {
    await axios.post(
      `${CLOUDFLARE_API_BASE}/zones/${zoneId}/dns_records`,
      {
        type: "CNAME",
        name,
        content,
        ttl: 1, // Auto
        proxied: true,
        comment: "auto-generated-redirect",
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
      `Failed to create DNS record for ${name}: ${error.response?.data?.errors?.[0]?.message || error.message}`,
    );
  }
}

async function deleteDNSRecord(zoneId, recordId) {
  try {
    await axios.delete(
      `${CLOUDFLARE_API_BASE}/zones/${zoneId}/dns_records/${recordId}`,
      {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    throw new Error(
      `Failed to delete DNS record ${recordId}: ${error.response?.data?.errors?.[0]?.message || error.message}`,
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

      // Get existing DNS records
      const existingRecords = await getExistingDNSRecords(zoneId);

      // Filter out auto-generated CNAME records
      const nonAutoRecords = existingRecords.filter(
        (record) => record.comment !== "auto-generated-redirect",
      );

      // Delete existing auto-generated CNAME records
      const autoRecords = existingRecords.filter(
        (record) => record.comment === "auto-generated-redirect",
      );
      for (const record of autoRecords) {
        console.log(`Deleting old DNS record: ${record.name}`);
        await deleteDNSRecord(zoneId, record.id);
      }

      // Create new auto-generated CNAME records
      for (const { source, target } of rules) {
        const targetDomain = target.replace(/^https?:\/\//, ""); // Remove protocol
        console.log(`Creating CNAME: ${source} -> ${targetDomain}`);
        await createDNSRecord(zoneId, source, targetDomain);
      }
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