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
//   };
// }
