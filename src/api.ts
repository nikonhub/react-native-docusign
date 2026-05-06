import { Platform } from 'react-native';

import {
  CaptiveSigningParams,
  CaptiveSigningUrlParams,
  DocuSignAccountInfo,
  DocuSignAuthParams,
  DocuSignConfig,
  LoginAttemptEvent,
  SigningCancelledEvent,
  SigningCompleteEvent,
  SigningErrorEvent,
  SigningResult,
} from './DocuSign.types';
import DocuSignModule from './DocuSignModule';

export type DocuSignSubscription = {
  remove(): void;
};

export function initialize(config: DocuSignConfig): Promise<void> {
  return DocuSignModule.initialize(config);
}

export function loginWithAccessToken(
  params: DocuSignAuthParams,
): Promise<DocuSignAccountInfo> {
  return DocuSignModule.loginWithAccessToken(params);
}

export function presentCaptiveSigning(
  params: CaptiveSigningParams,
): Promise<SigningResult> {
  return DocuSignModule.presentCaptiveSigning(params);
}

/**
 * Present captive signing from a pre-minted DocuSign recipient-view URL.
 *
 * Does NOT require a prior {@link loginWithAccessToken} call. The URL itself
 * encodes recipient identity via a short-lived token. {@link initialize} is
 * still required.
 *
 * @platform iOS only. The Android DocuSign SDK (2.1.4) does not expose a
 * public URL-based signing entry point; calling this on Android rejects with
 * a clear JS error. For cross-platform parity, prefer {@link presentCaptiveSigning}
 * with the session flow (accessToken + envelopeId + recipient).
 */
export function presentCaptiveSigningWithUrl(
  params: CaptiveSigningUrlParams,
): Promise<SigningResult> {
  if (Platform.OS !== 'ios') {
    return Promise.reject(
      new Error(
        'presentCaptiveSigningWithUrl is iOS-only. Use presentCaptiveSigning + loginWithAccessToken for Android parity.',
      ),
    );
  }
  return DocuSignModule.presentCaptiveSigningWithUrl(params);
}

export function logout(): Promise<void> {
  return DocuSignModule.logout();
}

export function isLoggedIn(): Promise<boolean> {
  return DocuSignModule.isLoggedIn();
}

/**
 * Tears down any in-flight signing session and the underlying DocuSign SDK
 * auth state. Call this between captive signing flows so the next
 * `loginWithAccessToken` + `presentCaptiveSigning` pair starts from a clean
 * slate. Safe to call when no session is active.
 *
 * Fixes an iOS captive signing hang that occurred on the second open within
 * a session: the SDK's implicit teardown raced with `DSMManager.login`,
 * leaving the WebView stuck on a spinner. The `useDocuSignSigning` hook
 * calls this from `reset()` automatically.
 */
export function endSigningSession(): Promise<void> {
  return DocuSignModule.endSigningSession();
}

export function addSigningCompleteListener(
  listener: (event: SigningCompleteEvent) => void,
): DocuSignSubscription {
  return DocuSignModule.addListener('onSigningComplete', listener);
}

export function addSigningCancelledListener(
  listener: (event: SigningCancelledEvent) => void,
): DocuSignSubscription {
  return DocuSignModule.addListener('onSigningCancelled', listener);
}

export function addSigningErrorListener(
  listener: (event: SigningErrorEvent) => void,
): DocuSignSubscription {
  return DocuSignModule.addListener('onSigningError', listener);
}

export function addLoginAttemptListener(
  listener: (event: LoginAttemptEvent) => void,
): DocuSignSubscription {
  return DocuSignModule.addListener('onLoginAttempt', listener);
}
