import "mocha";
import { expect } from "chai";
import { getMatchedEntries } from "../utils";

// getSiteName() returns [title, nameFromDomain, hostname]. autofill paths call
// getMatchedEntries(siteName, entries, strict=true). These tests pin the strict
// (host-bound) matching contract: a live OTP is only ever offered for a page
// whose real host matches the entry's bound host.
function site(
  hostname: string,
  nameFromDomain = "",
  title = ""
): Array<string | null> {
  return [title, nameFromDomain, hostname];
}

function entry(issuer: string, host?: string): OTPEntryInterface {
  return ({ issuer, host } as unknown) as OTPEntryInterface;
}

describe("getMatchedEntries strict (host-bound autofill)", () => {
  it("matches when the bound host exactly equals the page host", () => {
    const entries = [entry("MyBank", "accounts.google.com")];
    const matched = getMatchedEntries(
      site("accounts.google.com", "google"),
      entries,
      true
    );
    expect(matched).to.be.an("array").with.lengthOf(1);
  });

  it("matches a subdomain of the bound host", () => {
    const entries = [entry("MyBank", "google.com")];
    const matched = getMatchedEntries(
      site("accounts.google.com", "google"),
      entries,
      true
    );
    expect(matched).to.be.an("array").with.lengthOf(1);
  });

  it("does NOT match when the bound host differs, even if the issuer name coincides with the page", () => {
    // issuer "Google" used to match the host "google" by name; with host
    // binding the mismatching bound host (mybank.com) must win and refuse.
    const entries = [entry("Google", "mybank.com")];
    const matched = getMatchedEntries(
      site("accounts.google.com", "google"),
      entries,
      true
    );
    expect(matched).to.deep.equal([]);
  });

  it("does NOT match an attacker suffix of the bound host", () => {
    const entries = [entry("MyBank", "google.com")];
    const matched = getMatchedEntries(
      site("google.com.attacker.com", "attacker"),
      entries,
      true
    );
    expect(matched).to.deep.equal([]);
  });

  it("does NOT autofill an entry that has no bound host", () => {
    // No host binding: even though the issuer name matches the page, strict
    // autofill must refuse to inject a live code.
    const entries = [entry("Google", undefined)];
    const matched = getMatchedEntries(
      site("google.com", "google"),
      entries,
      true
    );
    expect(matched).to.deep.equal([]);
  });

  it("migrates a legacy issuer::host binding for strict matching", () => {
    // Upstream encoded the bound host in the issuer field as "Name::host".
    const entries = [entry("Google::google.com", undefined)];
    const matched = getMatchedEntries(
      site("accounts.google.com", "google"),
      entries,
      true
    );
    expect(matched).to.be.an("array").with.lengthOf(1);
  });
});

describe("getMatchedEntries loose (display filtering, unchanged)", () => {
  it("still matches by issuer name against the real host", () => {
    const entries = [entry("Google", undefined)];
    const matched = getMatchedEntries(
      site("google.com", "google"),
      entries,
      false
    );
    expect(matched).to.be.an("array").with.lengthOf(1);
  });
});
