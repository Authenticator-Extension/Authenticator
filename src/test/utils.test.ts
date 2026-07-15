import "mocha";
import { expect } from "chai";
import { getMatchedEntries, cloudBackupAllowed } from "../utils";
import { EntryStorage } from "../models/storage";
import { OTPEntry, OTPType } from "../models/otp";
import { Encryption } from "../models/encryption";
import { getEntryDataFromOTPAuthPerLine } from "../import";
import { KeyUtilities } from "../models/key-utilities";
import { MultiFormatWriter, BarcodeFormat } from "@zxing/library";
import { decodeQrFromImageData, computeQrCropRegion } from "../qr-decoder";

// getSiteName() returns [title, nameFromDomain, hostname]. autofill paths call
// getMatchedEntries(siteName, entries, strict=true). These tests pin the strict
// (host-bound) matching contract: a live OTP is only ever offered for a page
// whose real host matches the entry's bound host.
function site(
  hostname: string,
  nameFromDomain = "",
  title = "",
): Array<string | null> {
  return [title, nameFromDomain, hostname];
}

function entry(issuer: string, host?: string): OTPEntryInterface {
  return { issuer, host } as unknown as OTPEntryInterface;
}

describe("getMatchedEntries strict (host-bound autofill)", () => {
  it("matches when the bound host exactly equals the page host", () => {
    const entries = [entry("MyBank", "accounts.google.com")];
    const matched = getMatchedEntries(
      site("accounts.google.com", "google"),
      entries,
      true,
    );
    expect(matched).to.be.an("array").with.lengthOf(1);
  });

  it("matches a subdomain of the bound host", () => {
    const entries = [entry("MyBank", "google.com")];
    const matched = getMatchedEntries(
      site("accounts.google.com", "google"),
      entries,
      true,
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
      true,
    );
    expect(matched).to.deep.equal([]);
  });

  it("does NOT match an attacker suffix of the bound host", () => {
    const entries = [entry("MyBank", "google.com")];
    const matched = getMatchedEntries(
      site("google.com.attacker.com", "attacker"),
      entries,
      true,
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
      true,
    );
    expect(matched).to.deep.equal([]);
  });

  it("migrates a legacy issuer::host binding for strict matching", () => {
    // Upstream encoded the bound host in the issuer field as "Name::host".
    const entries = [entry("Google::google.com", undefined)];
    const matched = getMatchedEntries(
      site("accounts.google.com", "google"),
      entries,
      true,
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
      true,
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
      false,
    );
    expect(matched).to.be.an("array").with.lengthOf(1);
  });
});

// A cloud backup must never carry plaintext secrets off the device. Uploading
// is only permitted once a master password is set, so the export is encrypted
// before it leaves for Dropbox / Drive / OneDrive. cloudBackupAllowed only
// reads getEncryptionStatus(), so a tiny stub stands in for a real Encryption.
describe("cloudBackupAllowed (no plaintext cloud upload without a password)", () => {
  const withPassword = {
    getEncryptionStatus: () => true,
  } as unknown as EncryptionInterface;
  const withoutPassword = {
    getEncryptionStatus: () => false,
  } as unknown as EncryptionInterface;

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
        (e) => e.hash === entry.hash,
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

// backupGetExport used to unconditionally `continue` on EncOTPStorage entries
// (encrypted accounts), even when asked for a *plaintext* export. That left
// AES-GCM ciphertext sitting inside an "unencrypted" backup: the importer has
// no passphrase to unlock it, so the account was silently lost on restore.
describe("EntryStorage.backupGetExport decrypts EncOTPStorage entries for a plaintext export", () => {
  it("round-trips an encrypted account through a plaintext backup export and back through import", async () => {
    const encryption = new Encryption(
      "p0-round-trip-test-password-hash",
      "p0-round-trip-test-key-id",
    );
    const originalSecret = "AAAAAAAAAAAAAAAA";

    const entry = new OTPEntry(
      {
        type: OTPType.totp,
        index: 0,
        issuer: "P0TestBank",
        account: "user",
        encrypted: false,
        secret: originalSecret,
      },
      encryption,
    );

    try {
      // With a password-bearing encryption instance, this is persisted as an
      // EncOTPStorage (AES-GCM ciphertext) record, not a plain RawOTPStorage.
      await EntryStorage.add(entry);

      const exported = (await EntryStorage.backupGetExport(
        encryption,
        false, // encrypted=false -> plaintext export
      )) as { [hash: string]: RawOTPStorage };

      const item = exported[entry.hash];
      expect(item, "exported entry should be present").to.exist;
      expect(item.secret).to.equal(originalSecret);
      expect(item.encrypted).to.equal(false);
      // Must not carry dataType/keyId forward, or FileImport.vue will treat
      // this plaintext entry as ciphertext requiring a passphrase.
      expect((item as { dataType?: string }).dataType).to.equal(undefined);
      expect(item.keyId).to.equal(undefined);

      // Restore side: import must accept it as a plain entry, no passphrase.
      const importEncryption = new Encryption("", "");
      await EntryStorage.import(importEncryption, { [entry.hash]: item });

      const restored = (await EntryStorage.get()).find(
        (e) => e.hash === entry.hash,
      );
      expect(restored, "restored entry should be present").to.exist;
      expect(restored && restored.secret).to.equal(originalSecret);
      expect(restored && restored.issuer).to.equal("P0TestBank");

      if (restored) {
        await EntryStorage.delete(restored);
      }
    } finally {
      await EntryStorage.delete(entry);
    }
  });
});

// base32tohex used to map any character outside [A-Z2-7=] to indexOf's -1
// sentinel and silently fold that into the key bits, producing a
// wrong-but-well-formed OTP with no indication anything was wrong.
describe("KeyUtilities.generate rejects invalid Base32 secrets", () => {
  it("throws for a character outside the Base32 alphabet", () => {
    expect(() =>
      KeyUtilities.generate(OTPType.totp, "AAAAAAA1", 0, 30),
    ).to.throw("Invalid Base32 string");
  });

  it("still accepts a valid Base32 secret", () => {
    expect(() =>
      KeyUtilities.generate(OTPType.totp, "AAAAAAAAAAAAAAAA", 0, 30),
    ).to.not.throw();
  });
});

// The QR migration (jsqr -> @zxing/library) replaced the decoder used by both
// the popup import flow (QrImport.vue) and the injected content script
// (content.ts) with the shared decodeQrFromImageData leaf module. Generate a
// real otpauth QR with @zxing's writer, rasterize its BitMatrix into RGBA
// ImageData exactly like a <canvas> getImageData would, and assert the shared
// decoder reads the original string back.
describe("decodeQrFromImageData round-trips an otpauth QR (@zxing)", () => {
  it("decodes the same string that was encoded", () => {
    const content =
      "otpauth://totp/Example:user@example.com" +
      "?secret=AAAAAAAAAAAAAAAA&issuer=Example";
    const matrix = new MultiFormatWriter().encode(
      content,
      BarcodeFormat.QR_CODE,
      300,
      300,
      new Map(),
    );
    const width = matrix.getWidth();
    const height = matrix.getHeight();
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // BitMatrix.get => true for a dark module. Paint dark as black (0) and
        // light as white (255), fully opaque, matching a canvas render.
        const value = matrix.get(x, y) ? 0 : 255;
        const idx = (y * width + x) * 4;
        data[idx] = value;
        data[idx + 1] = value;
        data[idx + 2] = value;
        data[idx + 3] = 255;
      }
    }
    const imageData = new ImageData(data, width, height);
    expect(decodeQrFromImageData(imageData)).to.equal(content);
  });

  it("returns null for an image with no QR code", () => {
    const width = 64;
    const height = 64;
    const data = new Uint8ClampedArray(width * height * 4).fill(255);
    for (let i = 3; i < data.length; i += 4) {
      data[i] = 255; // opaque, otherwise all-white
    }
    const imageData = new ImageData(data, width, height);
    expect(decodeQrFromImageData(imageData)).to.equal(null);
  });
});

// The QR decode moved from the injected content script back into the background
// (so content.js no longer ships @zxing). computeQrCropRegion is the pure part
// of that move: it maps the CSS-pixel drag selection onto the captured bitmap's
// device pixels, clamped to bounds, mirroring the old content-script math.
describe("computeQrCropRegion (background QR crop math)", () => {
  it("crops a normal selection at 1x device pixel ratio", () => {
    // bitmap 1000 wide, viewport 1000 css px => dpr 1, so px map 1:1.
    const region = computeQrCropRegion(1000, 800, 1000, 100, 50, 200, 150);
    expect(region).to.deep.equal({ sx: 100, sy: 50, sw: 200, sh: 150 });
  });

  it("scales the selection by the device pixel ratio (2x)", () => {
    // bitmap 2000 wide, viewport 1000 css px => dpr 2, so every css px doubles.
    const region = computeQrCropRegion(2000, 1600, 1000, 100, 50, 200, 150);
    expect(region).to.deep.equal({ sx: 200, sy: 100, sw: 400, sh: 300 });
  });

  it("clamps a selection that runs past the bitmap edges", () => {
    // dpr 1; selection starts near the right/bottom and overflows, so width and
    // height are trimmed to what remains inside the bitmap.
    const region = computeQrCropRegion(1000, 800, 1000, 900, 700, 400, 400);
    expect(region).to.deep.equal({ sx: 900, sy: 700, sw: 100, sh: 100 });
  });

  it("rejects a zero-size selection (a click or 1px drag)", () => {
    expect(computeQrCropRegion(1000, 800, 1000, 100, 50, 0, 0)).to.equal(null);
  });

  it("rejects a selection wholly outside the bitmap", () => {
    // sx clamps to bitmapWidth so the remaining width is <= 0 => rejected.
    expect(computeQrCropRegion(1000, 800, 1000, 2000, 50, 100, 100)).to.equal(
      null,
    );
  });

  it("rejects a 0-size bitmap (a failed capture)", () => {
    expect(computeQrCropRegion(0, 0, 1000, 100, 50, 200, 150)).to.equal(null);
  });
});
