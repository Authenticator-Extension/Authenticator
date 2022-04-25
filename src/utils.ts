export async function getSiteName() {
  return new Promise((resolve: (value: Array<string | null>) => void) => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      const tab = tabs[0];
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
          return resolve([null, null]);
        }

        title = tab.title?.replace(/[^a-z0-9]/gi, "").toLowerCase() ?? null;
        url = tab.url ?? null;
      }

      if (!url) {
        return resolve([title, null]);
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
      }

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

      nameFromDomain = nameFromDomain.replace(/-/g, "").toLowerCase();

      return resolve([title, nameFromDomain, hostname]);
    });
  });
}

export function getMatchedEntries(
  siteName: Array<string | null>,
  entries: OTPEntryInterface[]
) {
  if (siteName.length < 2) {
    return false;
  }

  const matched = [];

  for (const entry of entries) {
    if (isMatchedEntry(siteName, entry)) {
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

function isMatchedEntry(
  siteName: Array<string | null>,
  entry: OTPEntryInterface
) {
  if (!entry.issuer) {
    return false;
  }

  const issuerHostMatches = entry.issuer.split("::");
  const issuer = issuerHostMatches[0].replace(/[^0-9a-z]/gi, "").toLowerCase();

  if (!issuer) {
    return false;
  }

  const siteTitle = siteName[0] || "";
  const siteNameFromHost = siteName[1] || "";
  const siteHost = siteName[2] || "";

  if (issuerHostMatches.length > 1) {
    if (siteHost && siteHost.indexOf(issuerHostMatches[1]) !== -1) {
      return true;
    }
  }
  // site title should be more detailed
  // so we use siteTitle.indexOf(issuer)
  if (siteTitle && siteTitle.indexOf(issuer) !== -1) {
    return true;
  }

  if (siteNameFromHost && issuer.indexOf(siteNameFromHost) !== -1) {
    return true;
  }

  return false;
}
