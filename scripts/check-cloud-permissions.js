const fs = require("fs");
const path = require("path");

const manifestPaths = [
  "manifest-chrome.json",
  "manifest-chrome-testing.json",
  "manifest-edge.json",
  "manifest-firefox.json",
  "manifest-firefox-testing.json",
];
const forbidden = [
  "www.googleapis.com",
  "accounts.google.com/o/oauth2/revoke",
  "graph.microsoft.com",
  "login.microsoftonline.com",
];
const allowedConnectSources = new Set([
  "https://www.google.com/",
  "https://*.dropboxapi.com",
]);
let failed = false;

function report(manifestPath, field, value) {
  failed = true;
  console.error(`${manifestPath}: ${field} contains forbidden value ${value}`);
}

function findForbidden(value, manifestPath, field) {
  if (typeof value === "string") {
    for (const domain of forbidden) {
      if (value.includes(domain)) {
        report(manifestPath, field, domain);
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      findForbidden(item, manifestPath, `${field}[${index}]`),
    );
  }
}

for (const filename of manifestPaths) {
  const manifestPath = path.join("manifests", filename);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.oauth2 !== undefined) {
    report(manifestPath, "oauth2", "oauth2");
  }
  findForbidden(manifest.permissions, manifestPath, "permissions");
  findForbidden(
    manifest.optional_permissions,
    manifestPath,
    "optional_permissions",
  );
  findForbidden(
    manifest.optional_host_permissions,
    manifestPath,
    "optional_host_permissions",
  );
  findForbidden(manifest.host_permissions, manifestPath, "host_permissions");

  const csp =
    typeof manifest.content_security_policy === "string"
      ? manifest.content_security_policy
      : manifest.content_security_policy?.extension_pages;
  findForbidden(csp, manifestPath, "content_security_policy");
  const connectSrc = csp?.match(/connect-src\s+([^;]+)/)?.[1];
  if (connectSrc) {
    for (const source of connectSrc.trim().split(/\s+/)) {
      if (!allowedConnectSources.has(source)) {
        failed = true;
        console.error(
          `${manifestPath}: content_security_policy connect-src contains unapproved origin ${source}`,
        );
      }
    }
  }
}

process.exitCode = failed ? 1 : 0;
