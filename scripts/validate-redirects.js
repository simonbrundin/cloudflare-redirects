const fs = require("fs");
const path = require("path");

function validateRedirectsConfig(configPath = "./redirects.json") {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

    // Check version
    if (!config.version || config.version !== "1.0") {
      throw new Error('Invalid or missing version. Expected "1.0"');
    }

    // Check redirects object
    if (!config.redirects || typeof config.redirects !== "object") {
      throw new Error("Missing or invalid redirects object");
    }

    // Validate each redirect
    for (const [sourceDomain, target] of Object.entries(config.redirects)) {
      if (
        typeof sourceDomain !== "string" ||
        sourceDomain.trim() === "" ||
        !sourceDomain.includes(".")
      ) {
        throw new Error(`Invalid source domain: ${sourceDomain}`);
      }
      if (typeof target !== "string" || !target.startsWith("http")) {
        throw new Error(`Invalid target URL for ${sourceDomain}: ${target}`);
      }
    }

    // Check for potential Cloudflare ruleset limits
    const zones = new Set();
    for (const sourceDomain of Object.keys(config.redirects)) {
      const domainParts = sourceDomain.split(".");
      const zoneDomain = domainParts.slice(-2).join(".");
      zones.add(zoneDomain);
    }

    const zoneCount = zones.size;
    if (zoneCount > 5) {
      console.warn(`Warning: ${zoneCount} unique zones detected. This may approach Cloudflare's zone ruleset limits.`);
      console.warn("Consider consolidating redirects or using wildcard patterns if sync fails.");
    }

    console.log("Configuration file is valid");
    return true;
  } catch (error) {
    console.error("Validation failed:", error.message);
    process.exit(1);
  }
}

// Run validation if called directly
if (require.main === module) {
  validateRedirectsConfig();
}

module.exports = { validateRedirectsConfig };

