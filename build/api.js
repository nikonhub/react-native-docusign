import DocuSignModule from './DocuSignModule';
export function initialize(config) {
    return DocuSignModule.initialize(config);
}
export function loginWithAccessToken(params) {
    return DocuSignModule.loginWithAccessToken(params);
}
export function presentCaptiveSigning(params) {
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
export function presentCaptiveSigningWithUrl(params) {
    return DocuSignModule.presentCaptiveSigningWithUrl(params);
}
export function logout() {
    return DocuSignModule.logout();
}
export function isLoggedIn() {
    return DocuSignModule.isLoggedIn();
}
export function addSigningCompleteListener(listener) {
    return DocuSignModule.addListener('onSigningComplete', listener);
}
export function addSigningCancelledListener(listener) {
    return DocuSignModule.addListener('onSigningCancelled', listener);
}
export function addSigningErrorListener(listener) {
    return DocuSignModule.addListener('onSigningError', listener);
}
export function addLoginAttemptListener(listener) {
    return DocuSignModule.addListener('onLoginAttempt', listener);
}
//# sourceMappingURL=api.js.map