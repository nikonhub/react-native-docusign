export type DocuSignEnvironment = 'demo' | 'production'

export type DocuSignConfig = {
  integratorKey: string
  environment: DocuSignEnvironment
}

export type DocuSignAuthParams = {
  accessToken: string
  accountId: string
  userId: string
  userName: string
  email: string
  host: string
}

export type CaptiveSigningParams = {
  envelopeId: string
  recipientUserName: string
  recipientEmail: string
  recipientClientUserId: string
}

export type SigningStatus = 'completed' | 'cancelled' | 'error'

export type SigningResult = {
  status: SigningStatus
  envelopeId: string
  errorCode?: string
  errorMessage?: string
}

export type SigningCompleteEvent = {
  envelopeId: string
}

export type SigningCancelledEvent = {
  envelopeId: string
  reason?: string
}

export type SigningErrorEvent = {
  envelopeId?: string
  errorCode: string
  errorMessage: string
}

export type DocuSignModuleEvents = {
  onSigningComplete: (event: SigningCompleteEvent) => void
  onSigningCancelled: (event: SigningCancelledEvent) => void
  onSigningError: (event: SigningErrorEvent) => void
}
