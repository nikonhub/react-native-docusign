# Changelog

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
