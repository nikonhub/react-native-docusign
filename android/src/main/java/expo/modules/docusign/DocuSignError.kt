package expo.modules.docusign

import expo.modules.kotlin.exception.CodedException

class NotInitializedException :
  CodedException("DocuSign SDK has not been initialized. Call initialize() first.")

class NotLoggedInException :
  CodedException("DocuSign SDK is not logged in. Call loginWithAccessToken() first.")

class LoginFailedException(message: String) :
  CodedException("DocuSign login failed: $message")

class SigningFailedException(message: String) :
  CodedException("DocuSign signing failed: $message")

class PresentationException(message: String) :
  CodedException("Failed to present DocuSign signing UI: $message")
