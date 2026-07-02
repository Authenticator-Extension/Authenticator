import "mocha";
import { expect } from "chai";
import { getMatchedEntries, cloudBackupAllowed } from "../utils";
import { EntryStorage } from "../models/storage";
import { OTPEntry, OTPType } from "../models/otp";
import { getEntryDataFromOTPAuthPerLine } from "../import";
import { KeyUtilities } from "../models/key-utilities";

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

  it("splits on the LAST :: when the issuer name itself contains ::", () => {
    // "My::Bank" is the issuer, "example.com" is the bound host. A naive
    // split("::") would wrongly cut it into issuer "My" + host "bank::example.com".
    const entries = [entry("My::Bank::example.com", undefined)];
    const matched = getMatchedEntries(
      site("example.com", "example"),
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

// A cloud backup must never carry plaintext secrets off the device. Uploading
// is only permitted once a master password is set, so the export is encrypted
// before it leaves for Dropbox / Drive / OneDrive. cloudBackupAllowed only
// reads getEncryptionStatus(), so a tiny stub stands in for a real Encryption.
describe("cloudBackupAllowed (no plaintext cloud upload without a password)", () => {
  const withPassword = ({
    getEncryptionStatus: () => true,
  } as unknown) as EncryptionInterface;
  const withoutPassword = ({
    getEncryptionStatus: () => false,
  } as unknown) as EncryptionInterface;

  it("blocks cloud upload when no master password is set", () => {
    expect(cloudBackupAllowed(withoutPassword)).to.equal(false);
  });

  it("allows cloud upload once a master password is set", () => {
    expect(cloudBackupAllowed(withPassword)).to.equal(true);
  });

  it("blocks cloud upload when no encryption instance is provided", () => {
    expect(cloudBackupAllowed(undefined)).to.equal(false);
  });
});

// The bound host must survive a storage round-trip (save -> reload). Without a
// master password an entry is stored as plaintext and rebuilt via the explicit
// field list in EntryStorage.get(), which used to drop the host field.
describe("EntryStorage preserves the bound host across reload", () => {
  it("keeps entry.host after add() and get()", async () => {
    const entry = new OTPEntry({
      type: OTPType.totp,
      index: 0,
      issuer: "MyBank",
      host: "accounts.example.com",
      account: "user",
      encrypted: false,
      secret: "AAAAAAAAAAAAAAAA",
    });
    try {
      await EntryStorage.add(entry);
      const reloaded = (await EntryStorage.get()).find(
        (e) => e.hash === entry.hash
      );
      expect(reloaded && reloaded.host).to.equal("accounts.example.com");
    } finally {
      await EntryStorage.delete(entry);
    }
  });
});

// Backups encode the bound host into issuer as "issuer::host" (upstream
// convention) instead of a separate host field, so the website survives a
// round-trip through import's migrateLegacyHost.
describe("EntryStorage.getExport encodes the bound host into issuer", () => {
  it("emits issuer::host with no separate host field, and it round-trips", async () => {
    const entry = new OTPEntry({
      type: OTPType.totp,
      index: 0,
      issuer: "MyBank",
      host: "accounts.example.com",
      account: "user",
      encrypted: false,
      secret: "AAAAAAAAAAAAAAAA",
    });
    const exported = (await EntryStorage.getExport([entry], false)) as {
      [hash: string]: RawOTPStorage;
    };
    const item = exported[entry.hash];
    expect(item.issuer).to.equal("MyBank::accounts.example.com");
    expect(item.host).to.equal(undefined);

    // import side restores the dedicated host field
    const restored = new OTPEntry({
      type: OTPType.totp,
      index: 0,
      issuer: item.issuer,
      host: item.host,
      account: "user",
      encrypted: false,
      secret: "AAAAAAAAAAAAAAAA",
    });
    expect(restored.issuer).to.equal("MyBank");
    expect(restored.host).to.equal("accounts.example.com");
  });

  it("round-trips an issuer that itself contains :: by splitting on the LAST ::", async () => {
    // A naive split("::") on "My::Bank::example.com" would wrongly produce
    // issuer "My" + host "bank::example.com" and corrupt the issuer name.
    const entry = new OTPEntry({
      type: OTPType.totp,
      index: 0,
      issuer: "My::Bank",
      host: "example.com",
      account: "user",
      encrypted: false,
      secret: "AAAAAAAAAAAAAAAA",
    });
    const exported = (await EntryStorage.getExport([entry], false)) as {
      [hash: string]: RawOTPStorage;
    };
    const item = exported[entry.hash];
    expect(item.issuer).to.equal("My::Bank::example.com");

    const restored = new OTPEntry({
      type: OTPType.totp,
      index: 0,
      issuer: item.issuer,
      host: item.host,
      account: "user",
      encrypted: false,
      secret: "AAAAAAAAAAAAAAAA",
    });
    expect(restored.issuer).to.equal("My::Bank");
    expect(restored.host).to.equal("example.com");
  });
});

// The otpauth:// URI export carries the bound host on the issuer parameter as
// "issuer::host"; import must parse it back and migrateLegacyHost splits it
// into the dedicated host field.
describe("getEntryDataFromOTPAuthPerLine parses issuer::host", () => {
  it("restores the bound host from the issuer parameter", async () => {
    const uri =
      "otpauth://totp/Mozilla:user%2Bfirefox%40gmail.com" +
      "?secret=AAAAAAAAAAAAAAAA&issuer=Mozilla::accounts.example.com";
    const { exportData } = await getEntryDataFromOTPAuthPerLine(uri);
    const item = Object.values(exportData)[0];
    expect(item.issuer).to.equal("Mozilla::accounts.example.com");

    const entry = new OTPEntry({
      type: OTPType.totp,
      index: 0,
      issuer: item.issuer,
      account: item.account,
      encrypted: false,
      secret: item.secret,
    });
    expect(entry.issuer).to.equal("Mozilla");
    expect(entry.host).to.equal("accounts.example.com");
  });
});

// base32tohex used to map any character outside [A-Z2-7=] to indexOf's -1
// sentinel and silently fold that into the key bits, producing a
// wrong-but-well-formed OTP with no indication anything was wrong.
describe("KeyUtilities.generate rejects invalid Base32 secrets", () => {
  it("throws for a character outside the Base32 alphabet", () => {
    expect(() =>
      KeyUtilities.generate(OTPType.totp, "AAAAAAA1", 0, 30)
    ).to.throw("Invalid Base32 string");
  });

  it("still accepts a valid Base32 secret", () => {
    expect(() =>
      KeyUtilities.generate(OTPType.totp, "AAAAAAAAAAAAAAAA", 0, 30)
    ).to.not.throw();
  });
});
