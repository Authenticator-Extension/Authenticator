import { expect } from "chai";
import { OTPAlgorithm, OTPType, OTPUtil } from "../models/otp";

describe("OTPUtil type/algorithm normalization", () => {
  it("normalizes OTP type from name or number", () => {
    expect(OTPUtil.normalizeOTPType("totp")).to.equal(OTPType.totp);
    expect(OTPUtil.normalizeOTPType(OTPType.totp)).to.equal(OTPType.totp);
    expect(OTPUtil.normalizeOTPType(1)).to.equal(OTPType.totp);
    expect(OTPUtil.normalizeOTPType("hotp")).to.equal(OTPType.hotp);
    expect(OTPUtil.normalizeOTPType(undefined)).to.equal(OTPType.totp);
  });

  it("always exports type as a name string", () => {
    expect(OTPUtil.otpTypeName(1)).to.equal("totp");
    expect(OTPUtil.otpTypeName("totp")).to.equal("totp");
    expect(OTPUtil.otpTypeName(OTPType.hotp)).to.equal("hotp");
  });

  it("normalizes algorithm from name or number", () => {
    expect(OTPUtil.normalizeOTPAlgorithm("SHA1")).to.equal(OTPAlgorithm.SHA1);
    expect(OTPUtil.normalizeOTPAlgorithm(1)).to.equal(OTPAlgorithm.SHA1);
    expect(OTPUtil.normalizeOTPAlgorithm("SHA256")).to.equal(
      OTPAlgorithm.SHA256
    );
    expect(OTPUtil.otpAlgorithmName(1)).to.equal("SHA1");
  });
});
