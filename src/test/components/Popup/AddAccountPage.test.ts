import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";

import { mount } from "@vue/test-utils";
import { toRaw } from "vue";
import { createStore, Store } from "vuex";
import CommonComponents from "../../../components/common/index";

import AddAccountPage from "../../../components/Popup/AddAccountPage.vue";
import { EntryStorage } from "../../../models/storage";
import { OTPType, OTPAlgorithm } from "../../../models/otp";
import { loadI18nMessages } from "../../../store/i18n";

chai.should();
chai.use(sinonChai);
mocha.setup("bdd");

describe("AddAccountPage", () => {
  let i18n: { [key: string]: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const components: { [name: string]: any } = {};

  before(async () => {
    i18n = await loadI18nMessages();
    for (const component of CommonComponents) {
      components[component.name] = component.component;
    }
  });

  // a minimal stand-in for a real encryption instance held in the Map
  const fakeEncryption = { getEncryptionStatus: () => true };
  const addCode = sinon.fake();

  const storeOpts = {
    modules: {
      accounts: {
        state: {
          OTPType,
          OTPAlgorithm,
          encryption: new Map([["key-1", fakeEncryption]]),
          defaultEncryption: "key-1",
        },
        actions: { addCode },
        namespaced: true,
      },
      style: {
        actions: { hideInfo: sinon.fake() },
        mutations: { toggleEdit: () => undefined },
        namespaced: true,
      },
      notification: {
        mutations: { alert: () => undefined },
        namespaced: true,
      },
    },
  };
  let store: Store<typeof storeOpts>;

  beforeEach(() => {
    addCode.resetHistory();
    // don't touch real storage when the entry is created
    sinon.stub(EntryStorage, "add").resolves();
    store = createStore(storeOpts);
  });

  it("should construct the new entry with the default encryption instance", async () => {
    const wrapper = mount(AddAccountPage, {
      global: { plugins: [store], mocks: { i18n }, components },
    });

    wrapper.vm.newAccount.secret = "aaaaaaaaaaaaaaaa"; // valid base32, >= 16 chars
    await wrapper.vm.addNewAccount();

    addCode.should.have.been.calledOnce;
    // regression: encryption Map must be read with .get(), not [] — bracket
    // indexing returns undefined and the secret would be stored UNENCRYPTED.
    // toRaw: the Map value comes back as a reactive proxy, and chai's `.should`
    // getter chokes on Vue's __v_isRef probe, so compare the raw target.
    const entry = addCode.lastCall.args[1];
    chai.assert.strictEqual(toRaw(entry.encryption), fakeEncryption);
  });
});
