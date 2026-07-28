import "mocha";
import { expect } from "chai";
import { createPinia, setActivePinia } from "pinia";
import { getMatchedEntries, cloudBackupAllowed } from "../utils";
import { EntryStorage } from "../models/storage";
import { UserSettings } from "../models/settings";
import { OTPEntry, OTPType, OTPAlgorithm } from "../models/otp";
import { Encryption, decryptString } from "../models/encryption";
import { getEntryDataFromOTPAuthPerLine } from "../import";
import { KeyUtilities } from "../models/key-utilities";
import { MultiFormatWriter, BarcodeFormat } from "@zxing/library";
import { decodeQrFromImageData, computeQrCropRegion } from "../qr-decoder";
import { useAdvisorStore } from "../store/Advisor";

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

// advisorIgnoreList predates the array format: localStorage-era (pre-Pinia)
// settings stored it as a JSON string, and some users' chrome.storage still
// holds that string. useAdvisorStore().init() used to assign the raw
// (possibly-string) value straight into ignoreList, so dismissInsight()'s
// .push() would throw TypeError on those accounts and could persist the
// corrupted string back to storage.
describe("useAdvisorStore init() parses a legacy JSON-string ignoreList", () => {
  let originalUserSettings: unknown;

  beforeEach(async () => {
    originalUserSettings = (await chrome.storage.local.get("UserSettings"))
      .UserSettings;
  });

  afterEach(async () => {
    if (originalUserSettings === undefined) {
      await chrome.storage.local.remove("UserSettings");
    } else {
      await chrome.storage.local.set({ UserSettings: originalUserSettings });
    }
    await UserSettings.updateItems();
  });

  it("normalises a legacy JSON-string advisorIgnoreList into an array", async () => {
    await chrome.storage.local.set({
      UserSettings: { advisorIgnoreList: '["autoLockNotSet"]' },
    });

    setActivePinia(createPinia());
    const store = useAdvisorStore();
    await store.init();

    expect(store.ignoreList).to.deep.equal(["autoLockNotSet"]);
  });

  it("dismissInsight() appends onto a legacy string ignoreList without throwing, and persists an array", async () => {
    await chrome.storage.local.set({
      UserSettings: { advisorIgnoreList: '["autoLockNotSet"]' },
    });

    setActivePinia(createPinia());
    const store = useAdvisorStore();
    await store.init();

    await store.dismissInsight("passwordNotSet");

    expect(store.ignoreList).to.deep.equal([
      "autoLockNotSet",
      "passwordNotSet",
    ]);
    expect(UserSettings.items.advisorIgnoreList)
      .to.be.an("array")
      .that.deep.equals(["autoLockNotSet", "passwordNotSet"]);
  });
});

// --- Phase 0 of the crypto-js removal (docs/plans/crypto-js-migration-plan.md):
// fixture-first baseline before touching any implementation. These ciphertexts
// were generated once with the current crypto-js (CryptoJS.AES.encrypt(...).
// toString()) and hardcoded as static constants, so they keep existing after
// crypto-js is removed and become the cross-check for the replacement
// EVP_BytesToKey + AES-CBC implementation (Phase 3). decryptString() is the
// production entry point (encryption.ts) that dispatches "v4:"-prefixed
// AES-GCM vs. legacy crypto-js AES-CBC ("U2FsdGVkX1..." OpenSSL framing).
describe("legacy crypto-js AES-CBC fixtures (decryptString baseline)", () => {
  const fixtures: Array<{
    name: string;
    plaintext: string;
    passphrase: string;
    ciphertext: string;
  }> = [
    {
      name: "ASCII plaintext x ASCII passphrase",
      plaintext: "hello world",
      passphrase: "password123",
      ciphertext: "U2FsdGVkX1/Ca3NjxUzrBfM7IGOu/uI7vouAZsLrX5o=",
    },
    {
      name: "ASCII plaintext x Chinese passphrase",
      plaintext: "hello world",
      passphrase: "測試密碼中文密碼",
      ciphertext: "U2FsdGVkX1/TypKxAV9yBvmZ346rm3uB6sh/+gsmy6Y=",
    },
    {
      name: "ASCII plaintext x emoji passphrase",
      plaintext: "hello world",
      passphrase: "pass🔐word🎉phrase",
      ciphertext: "U2FsdGVkX19YEEiv/i2L7N7CMKWnRY25qTPO/h+5Phs=",
    },
    {
      name: "ASCII plaintext x long passphrase (>64 bytes)",
      plaintext: "hello world",
      passphrase:
        "a-very-long-passphrase-that-exceeds-sixty-four-bytes-in-length-1234567890",
      ciphertext: "U2FsdGVkX1+9v3rISV0NQ2r0R+XJRL9E40/yuN7wgco=",
    },
    {
      name: "Chinese/emoji plaintext x ASCII passphrase",
      plaintext: "測試内容🎉emoji和中文",
      passphrase: "password123",
      ciphertext:
        "U2FsdGVkX1/5Y5jJ2ev68Yddd5wYzOOYUslb+l0Y5RpqCh1IT5+soinK3Px2pmnl",
    },
  ];

  for (const f of fixtures) {
    it(`decrypts: ${f.name}`, async () => {
      const result = await decryptString(f.ciphertext, f.passphrase);
      expect(result).to.equal(f.plaintext);
    });
  }

  // Empty-plaintext is a documented quirk, not a plain round-trip case:
  // decryptString does `return decrypted || null`, so a correctly-decrypted
  // empty string ("") is falsy and gets mapped to null -- indistinguishable
  // from an actual decryption failure. This assertion locks that CURRENT
  // behavior (observed directly, not assumed) so a Phase 3 replacement must
  // reproduce it rather than "fix" it into returning "".
  it("empty plaintext x ASCII passphrase decrypts to null, not '' (decryptString's `|| null` quirk)", async () => {
    const result = await decryptString(
      "U2FsdGVkX18vgaJx+YXWJR1iQ2bUAdDbzT5VaEvG4ZA=", // "" / "password123"
      "password123",
    );
    expect(result).to.equal(null);
  });

  // This assertion locks the CURRENT crypto-js behavior for a wrong
  // passphrase: CryptoJS.AES.decrypt(...).toString(CryptoJS.enc.Utf8) does
  // NOT throw here, it silently returns an empty string ("" observed across
  // 10 independent ASCII plaintext/passphrase samples during fixture
  // generation), which decryptString's `decrypted || null` then maps to
  // null. Any Phase 3 replacement must preserve this null-on-wrong-password
  // contract (UI treats null as "decryption failed").
  it("returns null for a wrong passphrase (locks current crypto-js behavior)", async () => {
    const result = await decryptString(
      "U2FsdGVkX18XFBuvDiymS9HzX+ItUG+MtnBe4rLiLWU=", // "hello world" / "password123"
      "totally-wrong-password",
    );
    expect(result).to.equal(null);
  });
});

// RFC 4226 (HOTP) and RFC 6238 (TOTP) official test vectors -- the acceptance
// baseline for KeyUtilities.generate's HMAC layer (Phase 2 of the crypto-js
// removal plan). generate() only accepts a Base32 `secret` for
// OTPType.totp/hotp (base32tohex), but the RFC vectors' ASCII secrets are not
// valid Base32 ("12345678901234567890" contains 1/8/9/0, outside
// A-Z2-7). OTPType.hhex takes `secret` as a raw hex string (no Base32
// decoding) and, like hotp, uses the given `counter` directly instead of
// deriving it from the current time (see the `type !== hotp && type !==
// hhex` epoch branch in key-utilities.ts) -- so hhex is used here to inject
// the RFC secret and counter exactly, for both the HOTP vectors and (via
// counter = floor(T / 30), verified equivalent to the TOTP time-stepping
// since KeyUtilities.generate's time-based path only differs from the direct
// counter path in how `counter` is computed) the TOTP vectors. This avoids
// depending on Date.now() / clockOffset injection for TOTP, which the
// current generate() signature has no seam for beyond wall-clock time.
function asciiToHex(str: string): string {
  let hex = "";
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(2, "0");
  }
  return hex;
}

describe("RFC 4226 HOTP official test vectors", () => {
  // RFC 4226 Appendix D, secret = ASCII "12345678901234567890"
  const secretHex = asciiToHex("12345678901234567890");
  const expected = [
    "755224",
    "287082",
    "359152",
    "969429",
    "338314",
    "254676",
    "287922",
    "162583",
    "399871",
    "520489",
  ];

  expected.forEach((expectedOtp, counter) => {
    it(`counter=${counter} -> ${expectedOtp}`, () => {
      const otp = KeyUtilities.generate(
        OTPType.hhex,
        secretHex,
        counter,
        30,
        6,
      );
      expect(otp).to.equal(expectedOtp);
    });
  });
});

describe("RFC 6238 TOTP official test vectors (SHA1/SHA256/SHA512)", () => {
  // RFC 6238 Appendix B. period=30, digits=8.
  const secretSha1 = asciiToHex("12345678901234567890");
  const secretSha256 = asciiToHex("12345678901234567890123456789012");
  const secretSha512 = asciiToHex(
    "1234567890123456789012345678901234567890123456789012345678901234",
  );

  const cases: Array<{
    time: number;
    sha1: string;
    sha256: string;
    sha512: string;
  }> = [
    { time: 59, sha1: "94287082", sha256: "46119246", sha512: "90693936" },
    {
      time: 1111111109,
      sha1: "07081804",
      sha256: "68084774",
      sha512: "25091201",
    },
    {
      time: 1111111111,
      sha1: "14050471",
      sha256: "67062674",
      sha512: "99943326",
    },
    {
      time: 1234567890,
      sha1: "89005924",
      sha256: "91819424",
      sha512: "93441116",
    },
    {
      time: 2000000000,
      sha1: "69279037",
      sha256: "90698825",
      sha512: "38618901",
    },
    {
      time: 20000000000,
      sha1: "65353130",
      sha256: "77737706",
      sha512: "47863826",
    },
  ];

  cases.forEach((c) => {
    const counter = Math.floor(c.time / 30);

    it(`T=${c.time} SHA1 -> ${c.sha1}`, () => {
      const otp = KeyUtilities.generate(
        OTPType.hhex,
        secretSha1,
        counter,
        30,
        8,
        OTPAlgorithm.SHA1,
      );
      expect(otp).to.equal(c.sha1);
    });

    it(`T=${c.time} SHA256 -> ${c.sha256}`, () => {
      const otp = KeyUtilities.generate(
        OTPType.hhex,
        secretSha256,
        counter,
        30,
        8,
        OTPAlgorithm.SHA256,
      );
      expect(otp).to.equal(c.sha256);
    });

    it(`T=${c.time} SHA512 -> ${c.sha512}`, () => {
      const otp = KeyUtilities.generate(
        OTPType.hhex,
        secretSha512,
        counter,
        30,
        8,
        OTPAlgorithm.SHA512,
      );
      expect(otp).to.equal(c.sha512);
    });
  });
});
