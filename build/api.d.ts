import { CaptiveSigningParams, CaptiveSigningUrlParams, DocuSignAccountInfo, DocuSignAuthParams, DocuSignConfig, LoginAttemptEvent, SigningCancelledEvent, SigningCompleteEvent, SigningErrorEvent, SigningResult } from './DocuSign.types';
export type DocuSignSubscription = {
    remove(): void;
};
export declare function initialize(config: DocuSignConfig): Promise<void>;
export declare function loginWithAccessToken(params: DocuSignAuthParams): Promise<DocuSignAccountInfo>;
export declare function presentCaptiveSigning(params: CaptiveSigningParams): Promise<SigningResult>;
/**
 * Present captive signing from a pre-minted DocuSign recipient-view URL.
 *
 * @platform iOS only. The Android DocuSign SDK (2.1.4) does not expose a
 * public URL-based signing entry point; calling this on Android rejects with
 * `not_implemented`. For cross-platform parity, prefer {@link presentCaptiveSigning}
 * with the session flow (accessToken + envelopeId + recipient).
 */
export declare function presentCaptiveSigningWithUrl(params: CaptiveSigningUrlParams): Promise<SigningResult>;
export declare function logout(): Promise<void>;
export declare function isLoggedIn(): Promise<boolean>;
export declare function addSigningCompleteListener(listener: (event: SigningCompleteEvent) => void): DocuSignSubscription;
export declare function addSigningCancelledListener(listener: (event: SigningCancelledEvent) => void): DocuSignSubscription;
export declare function addSigningErrorListener(listener: (event: SigningErrorEvent) => void): DocuSignSubscription;
export declare function addLoginAttemptListener(listener: (event: LoginAttemptEvent) => void): DocuSignSubscription;
//# sourceMappingURL=api.d.ts.map