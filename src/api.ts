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

export function loginWithAccessToken(params: DocuSignAuthParams): Promise<DocuSignAccountInfo> {
  return DocuSignModule.loginWithAccessToken(params);
}

export function presentCaptiveSigning(params: CaptiveSigningParams): Promise<SigningResult> {
  return DocuSignModule.presentCaptiveSigning(params);
}

/**
 * Present captive signing from a pre-minted DocuSign recipient-view URL.
 *
 * @platform iOS only. The Android DocuSign SDK (2.1.4) does not expose a
 * public URL-based signing entry point; calling this on Android rejects with
 * `not_implemented`. For cross-platform parity, prefer {@link presentCaptiveSigning}
 * with the session flow (accessToken + envelopeId + recipient).
 */
export function presentCaptiveSigningWithUrl(params: CaptiveSigningUrlParams): Promise<SigningResult> {
  return DocuSignModule.presentCaptiveSigningWithUrl(params);
}

export function logout(): Promise<void> {
  return DocuSignModule.logout();
}

export function isLoggedIn(): Promise<boolean> {
  return DocuSignModule.isLoggedIn();
}

export function addSigningCompleteListener(listener: (event: SigningCompleteEvent) => void): DocuSignSubscription {
  return DocuSignModule.addListener('onSigningComplete', listener);
}

export function addSigningCancelledListener(listener: (event: SigningCancelledEvent) => void): DocuSignSubscription {
  return DocuSignModule.addListener('onSigningCancelled', listener);
}

export function addSigningErrorListener(listener: (event: SigningErrorEvent) => void): DocuSignSubscription {
  return DocuSignModule.addListener('onSigningError', listener);
}

export function addLoginAttemptListener(listener: (event: LoginAttemptEvent) => void): DocuSignSubscription {
  return DocuSignModule.addListener('onLoginAttempt', listener);
}
