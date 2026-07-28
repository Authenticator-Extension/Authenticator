# Privacy Policy — OTPilot Authenticator

_Last updated: 2026-06-26_

OTPilot Authenticator ("the extension") is a browser extension that generates two-factor
authentication (2FA) one-time codes. This policy explains what data the extension handles
and how.

## What we collect

We — the developer — **do not collect, receive, or transmit any of your data**. There are
no analytics, no tracking, and no telemetry. The extension has no server of its own.

## Data the extension stores on your device

The extension stores the following **locally**, in your browser's extension storage:

- Your 2FA accounts: issuer/label and the account secret.
- Your preferences (e.g. theme, auto-lock timeout).

If you set a master password, account secrets are encrypted with **Argon2id** key
derivation and **AES-GCM** before being stored. The encrypted vault auto-locks after the
idle period you configure.

## Optional cloud backup

If you explicitly enable cloud backup, the extension uploads your **encrypted** vault to a
cloud account **you own and authorize** — Dropbox. The backup is encrypted with your master
password; the developer cannot read it and never receives a copy. The extension connects
only to Dropbox's official API endpoints, and only after you opt in. You can disconnect at
any time.

## Autofill

When you trigger autofill, the current code is inserted into the active tab's login field,
**only** when the page's host matches the saved account. No page content is read, stored,
or transmitted to the developer.

## Permissions

The extension requests only the permissions needed for the above functions (storage,
active-tab access for autofill, scripting for autofill, identity for cloud-backup OAuth,
and alarms for auto-lock). Cloud-provider host access is requested optionally, only when
you enable backup.

## Data sharing

We do not sell, share, or transfer your data to any third party. The only data that leaves
your device is the encrypted backup you choose to upload to your own cloud account.

## Changes

We may update this policy; the "Last updated" date will change accordingly.

## Contact

Questions: kyvevcwmm@mozmail.com
