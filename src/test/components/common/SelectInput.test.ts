import "mocha";
import { expect } from "chai";
import { mount } from "@vue/test-utils";

import SelectInput from "../../../components/common/SelectInput.vue";
import { KeyUtilities } from "../../../models/key-utilities";
import { OTPAlgorithm, OTPType } from "../../../models/otp";

mocha.setup("bdd");

describe("SelectInput", () => {
  it("preserves numeric option values for SHA-512 OTP generation", async () => {
    const wrapper = mount({
      components: { SelectInput },
      template: `
        <select-input label="Algorithm" v-model="algorithm">
          <option :value="OTPAlgorithm.SHA1">SHA-1</option>
          <option :value="OTPAlgorithm.SHA256">SHA-256</option>
          <option :value="OTPAlgorithm.SHA512">SHA-512</option>
        </select-input>
      `,
      data() {
        return {
          algorithm: OTPAlgorithm.SHA1,
          OTPAlgorithm,
        };
      },
    });

    await wrapper.find("select").setValue(String(OTPAlgorithm.SHA512));

    expect(wrapper.vm.$data.algorithm).to.equal(OTPAlgorithm.SHA512);
    expect(wrapper.vm.$data.algorithm).to.be.a("number");

    const code = KeyUtilities.generate(
      OTPType.hotp,
      "blxnmpn2m2ebd4glchipydbbsclfvh553vnjqlmuqlzyxlbjsgga",
      41152263,
      30,
      6,
      wrapper.vm.$data.algorithm
    );

    expect(code).to.equal("829861");
  });
});
