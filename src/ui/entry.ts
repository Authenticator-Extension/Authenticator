// export async function entry(_ui: UI) {
//   const ui: UIConfig = {
//     methods: {
//       updateCode: async () => {
//         return updateCode(_ui.instance);
//       },
//       importBackupCode: async () => {

//       updateStorage: async () => {
//         await EntryStorage.set(_ui.instance.encryption, _ui.instance.entries);
//         return;
//       },
//       importEntries: async () => {
//         await EntryStorage.import(
//           _ui.instance.encryption,
//           JSON.parse(_ui.instance.exportData)
//         );
//         await _ui.instance.updateEntries();
//         _ui.instance.alert(_ui.instance.i18n.updateSuccess);
//         return;
//       },
//       importFile: (event: Event, closeWindow: boolean) => {
//
//       },
//       nextCode: async (entry: OTPEntry) => {
//         if (_ui.instance.currentClass.Diabled) {
//           return;
//         }
//         _ui.instance.currentClass.hotpDiabled = true;
//         await entry.next(_ui.instance.encryption);
//         setTimeout(() => {
//           _ui.instance.currentClass.hotpDiabled = false;
//         }, 3000);
//         return;
//       },
//   };
// }
