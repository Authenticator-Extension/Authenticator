export async function getSiteName() {
  const tab = await getCurrentTab();
  const query = new URLSearchParams(document.location.search.substring(1));

  let title: string | null;
  let url: string | null;
  const titleFromQuery = query.get("title");
  const urlFromQuery = query.get("url");

  if (titleFromQuery && urlFromQuery) {
    title = decodeURIComponent(titleFromQuery);
    url = decodeURIComponent(urlFromQuery);
  } else {
    if (!tab) {
      return [null, null];
    }

    title = tab.title?.replace(/[^a-z0-9]/gi, "").toLowerCase() ?? null;
    url = tab.url ?? null;
  }

  if (!url) {
    return [title, null];
  }

  const urlParser = new URL(url);
  const hostname = urlParser.hostname; // it's always lower case

  // try to parse name from hostname
  // i.e. hostname is www.example.com
  // name should be example
  let nameFromDomain = "";

  // ip address
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    nameFromDomain = hostname;
  } else {
    // local network
    if (hostname.indexOf(".") === -1) {
      nameFromDomain = hostname;
    }

    const hostLevelUnits = hostname.split(".");

    if (hostLevelUnits.length === 2) {
      nameFromDomain = hostLevelUnits[0];
    }

    // www.example.com
    // example.com.cn
    if (hostLevelUnits.length > 2) {
      // example.com.cn
      if (
        ["com", "net", "org", "edu", "gov", "co"].indexOf(
          hostLevelUnits[hostLevelUnits.length - 2]
        ) !== -1
      ) {
        nameFromDomain = hostLevelUnits[hostLevelUnits.length - 3];
      } else {
        // www.example.com
        nameFromDomain = hostLevelUnits[hostLevelUnits.length - 2];
      }
    }
  }

  nameFromDomain = nameFromDomain.replace(/-/g, "").toLowerCase();

  return [title, nameFromDomain, hostname];
}

// `strict` is used by autofill, which pastes a live OTP into the page: it drops
// the page-controlled <title> match and anchors the host match to a real domain
// boundary, so a hostile page can't claim another origin's code. Display
// filtering passes strict=false and stays loose.
export function getMatchedEntries(
  siteName: Array<string | null>,
  entries: OTPEntryInterface[],
  strict = false
) {
  if (siteName.length < 2) {
    return false;
  }

  const matched = [];

  for (const entry of entries) {
    if (isMatchedEntry(siteName, entry, strict)) {
      matched.push(entry);
    }
  }

  return matched;
}

export function getMatchedEntriesHash(
  siteName: Array<string | null>,
  entries: OTPEntryInterface[]
) {
  const matchedEnteries = getMatchedEntries(siteName, entries);
  if (matchedEnteries) {
    return matchedEnteries.map((entry) => entry.hash);
  }

  return false;
}

// True when `host` is exactly `bound` or a subdomain of it, so that
// "google.com.attacker.com" does NOT match the bound host "google.com".
function hostMatchesDomain(host: string, bound: string) {
  host = host.toLowerCase();
  bound = bound.toLowerCase().replace(/^\.+/, "");
  return host === bound || host.endsWith("." + bound);
}

function isMatchedEntry(
  siteName: Array<string | null>,
  entry: OTPEntryInterface,
  strict = false
) {
  const siteTitle = siteName[0] || "";
  const siteNameFromHost = siteName[1] || "";
  const siteHost = siteName[2] || "";

  // The bound host lives in entry.host; fall back to the legacy "issuer::host"
  // encoding for entries not yet migrated (e.g. raw storage objects).
  const issuerParts = (entry.issuer || "").split("::");
  let boundHost = entry.host || "";
  if (!boundHost && issuerParts.length > 1 && issuerParts[1]) {
    boundHost = issuerParts[1];
  }
  boundHost = boundHost.replace(/^\.+/, "").toLowerCase();

  // strict (autofill): only ever inject a live code when the page's real host
  // matches an explicitly bound host. No bound host => never autofill, so a
  // hostile page can't harvest a code the user didn't mean for it.
  if (strict) {
    if (!boundHost) {
      return false;
    }
    return Boolean(siteHost && hostMatchesDomain(siteHost, boundHost));
  }

  // loose (display filtering): bound host match, else issuer-name heuristics.
  if (boundHost && siteHost && hostMatchesDomain(siteHost, boundHost)) {
    return true;
  }

  const issuer = issuerParts[0].replace(/[^0-9a-z]/gi, "").toLowerCase();
  if (!issuer) {
    return false;
  }

  // The page-controlled <title> is only a weak hint, kept for display filtering.
  if (siteTitle && siteTitle.indexOf(issuer) !== -1) {
    return true;
  }

  // siteNameFromHost is derived from the real hostname, not page-controlled.
  if (siteNameFromHost && issuer.indexOf(siteNameFromHost) !== -1) {
    return true;
  }

  return false;
}

// Normalize a user- or page-provided host into a bare lowercase hostname so it
// can be compared with hostMatchesDomain. Accepts a full URL or a bare host.
export function normalizeHost(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) {
    return "";
  }
  try {
    return new URL(trimmed.includes("://") ? trimmed : "https://" + trimmed)
      .hostname;
  } catch {
    return trimmed.replace(/^\.+/, "").replace(/\/.*$/, "");
  }
}

// A cloud backup must never carry plaintext secrets off the device. Uploading
// is only allowed once a master password is set, so the export is encrypted
// before it leaves for Dropbox / Drive / OneDrive. Lives here (a leaf module)
// rather than in backup.ts so tests can exercise it without dragging in the
// storage <-> otp import cycle.
export function cloudBackupAllowed(encryption?: EncryptionInterface): boolean {
  return Boolean(encryption && encryption.getEncryptionStatus());
}

export async function getCurrentTab() {
  const currentWindow = await chrome.windows.getCurrent();
  const queryOptions = { active: true, windowId: currentWindow.id };
  // `tab` will either be a `tabs.Tab` instance or `undefined`.
  const [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

interface TabWithIdAndURL extends chrome.tabs.Tab {
  id: number;
  url: string;
}

export function okToInjectContentScript(
  tab: chrome.tabs.Tab
): tab is TabWithIdAndURL {
  return (
    tab.id !== undefined &&
    tab.url !== undefined &&
    (tab.url.startsWith("https://") ||
      tab.url.startsWith("http://") ||
      tab.url.startsWith("file://"))
  );
}
