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

