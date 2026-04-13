import DocuSignModule from './DocuSignModule'
import {
  CaptiveSigningParams,
  DocuSignAuthParams,
  DocuSignConfig,
  SigningCancelledEvent,
  SigningCompleteEvent,
  SigningErrorEvent,
  SigningResult,
} from './DocuSign.types'

export type DocuSignSubscription = {
  remove(): void
}

export function initialize(config: DocuSignConfig): Promise<void> {
  return DocuSignModule.initialize(config)
}

export function loginWithAccessToken(params: DocuSignAuthParams): Promise<void> {
  return DocuSignModule.loginWithAccessToken(params)
}

export function presentCaptiveSigning(params: CaptiveSigningParams): Promise<SigningResult> {
  return DocuSignModule.presentCaptiveSigning(params)
}

export function logout(): Promise<void> {
  return DocuSignModule.logout()
}

export function isLoggedIn(): Promise<boolean> {
  return DocuSignModule.isLoggedIn()
}

export function addSigningCompleteListener(
  listener: (event: SigningCompleteEvent) => void
): DocuSignSubscription {
  return DocuSignModule.addListener('onSigningComplete', listener)
}

export function addSigningCancelledListener(
  listener: (event: SigningCancelledEvent) => void
): DocuSignSubscription {
  return DocuSignModule.addListener('onSigningCancelled', listener)
}

export function addSigningErrorListener(
  listener: (event: SigningErrorEvent) => void
): DocuSignSubscription {
  return DocuSignModule.addListener('onSigningError', listener)
}

export { default as DocuSignModule } from './DocuSignModule'
export * from './DocuSign.types'
export { useDocuSignSigning } from './useDocuSignSigning'
export type {
  DocuSignSigningState,
  SigningSession,
  UseDocuSignSigningOptions,
  UseDocuSignSigningReturn,
} from './useDocuSignSigning'
