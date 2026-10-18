import "mocha";
import { expect } from "chai";
import { getEntryDataFromOTPAuthPerLine } from "../import";
import { OTPAlgorithm } from "../models/otp";

mocha.setup("bdd");

describe("OTPAuth URI imports", () => {
  for (const algorithm of ["SHA256", "SHA512"] as const) {
    it(`preserves the ${algorithm} algorithm`, async () => {
      const result = await getEntryDataFromOTPAuthPerLine(
        `otpauth://totp/alice?secret=JBSWY3DPEHPK3PXP&algorithm=${algorithm}`
      );
      const entry = Object.values(result.exportData)[0];

      expect(entry.algorithm).to.equal(String(OTPAlgorithm[algorithm]));
    });
  }
});
