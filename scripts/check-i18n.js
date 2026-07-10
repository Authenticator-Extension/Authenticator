// Verifies every _locales/<lang>/messages.json has EXACTLY the same key set as
// the en source (which src/store/i18n.ts iterates to build the runtime strings).
// Exits non-zero on any missing/extra key or invalid JSON so CI fails.
// Replaces the old Crowdin-era autofill (scripts/i18n.js); this fork maintains
// translations by hand and has no Crowdin sync.
"use strict";

const fs = require("fs");
const path = require("path");

const dir = "_locales";
const read = (f) =>
  JSON.parse(fs.readFileSync(f, "utf8").replace(/^﻿/, ""));

const enKeys = Object.keys(read(path.join(dir, "en", "messages.json")));
const enSet = new Set(enKeys);

let failed = false;
for (const loc of fs.readdirSync(dir)) {
  const file = path.join(dir, loc, "messages.json");
  if (loc === "en" || !fs.existsSync(file)) continue;

  let keys;
  try {
    keys = Object.keys(read(file));
  } catch (e) {
    console.error(`x ${loc}: invalid JSON - ${e.message}`);
    failed = true;
    continue;
  }

  const kset = new Set(keys);
  const missing = enKeys.filter((k) => !kset.has(k));
  const extra = keys.filter((k) => !enSet.has(k));
  if (missing.length || extra.length) {
    failed = true;
    console.error(`x ${loc}: ${missing.length} missing, ${extra.length} extra`);
    if (missing.length) console.error(`    missing: ${missing.join(", ")}`);
    if (extra.length) console.error(`    extra:   ${extra.join(", ")}`);
  }
}

if (failed) {
  console.error(
    "\nLocale key sets diverge from _locales/en/messages.json (the source of truth)."
  );
  console.error(
    "Every locale must have exactly the same keys as en. Add new strings to en"
  );
  console.error("and to every locale, or remove them everywhere.");
  process.exit(1);
}

console.log(`all locales match en (${enKeys.length} keys)`);
