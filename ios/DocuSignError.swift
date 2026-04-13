import ExpoModulesCore

internal class NotInitializedException: Exception {
  override var reason: String {
    "DocuSign SDK has not been initialized. Call initialize() first."
  }
}

internal class NotLoggedInException: Exception {
  override var reason: String {
    "DocuSign SDK is not logged in. Call loginWithAccessToken() first."
  }
}

internal class PresentationException: GenericException<String> {
  override var reason: String {
    "Failed to present DocuSign signing UI: \(param)"
  }
}

internal class SigningFailedException: GenericException<String> {
  override var reason: String {
    "DocuSign signing failed: \(param)"
  }
}

internal class LoginFailedException: GenericException<String> {
  override var reason: String {
    "DocuSign login failed: \(param)"
  }
}
