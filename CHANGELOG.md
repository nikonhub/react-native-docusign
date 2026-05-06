# Changelog

## 1.0.2

### Bug fixes

- **iOS**: Fix captive signing hang on second consecutive open. The implicit teardown inside `performLogin` (logout + `clearAllWebCookies`) raced with `DSMManager.login`, leaving the WebView session bootstrapped against half-cleaned SDK state. The captive signing UI would render but the underlying `DSMEnvelopesManager` never fired its expected `settings` / `consumer_disclosure` / `recipient` requests, leaving the JS promise hanging on a spinner with no completion notification. The teardown is now sequenced via `WKWebsiteDataStore.removeData` completion before `DSMManager.login` is invoked, and skipped entirely on the first login.

### New features

- New `endSigningSession()` API on both iOS and Android. Tears down any in-flight signing session and the underlying SDK auth state so the next `loginWithAccessToken` + `presentCaptiveSigning` pair starts from a clean slate. Wired into `useDocuSignSigning`'s `reset()` automatically, so React consumers get clean teardown between captive signing flows for free.

### Tests

- Add Jest setup with `jest-expo` preset.
- Cover `useDocuSignSigning` state machine end-to-end: auto-init, session and url signing flows, completed / cancelled / error transitions, error listener subscription, error listener cleanup on unmount, and the `reset()` -> `endSigningSession` wiring.

## 1.0.1

### Documentation

- Surface the unified iOS/Android session payload contract in the README. New "One backend response, both platforms" callout names the 13 expected fields and links to the full schema in `docs/BACKEND_GUIDE.md`.

## 1.0.0

### New features

- Initial release.
- iOS native module wrapping DocuSign iOS SDK 4.1.1.
- Android native module wrapping DocuSign Android SDK 2.1.4.
- TypeScript public API: `initialize`, `loginWithAccessToken`, `presentCaptiveSigning`, `logout`, `isLoggedIn`.
- Event listeners: `onSigningComplete`, `onSigningCancelled`, `onSigningError`.
- React hook `useDocuSignSigning` wrapping the SDK lifecycle, state machine, and event subscription.
- Config plugin for automatic iOS Info.plist, Android permissions, and Maven repo setup.
