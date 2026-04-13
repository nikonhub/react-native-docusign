import ExpoModulesCore
import UIKit
import DocuSignSDK

internal enum DocuSignEnvironment: String {
  case demo
  case production
}

internal final class DocuSignManager {
  static let shared = DocuSignManager()

  private var isInitialized = false
  private var currentEnvelopeId: String?
  private weak var module: DocuSignModule?

  private init() {}

  func setModule(_ module: DocuSignModule) {
    self.module = module
  }

  func initialize(integratorKey: String, environment: DocuSignEnvironment) throws {
    if isInitialized {
      return
    }

    let host: String
    switch environment {
    case .demo:
      host = "https://demo.docusign.net/restapi"
    case .production:
      host = "https://www.docusign.net/restapi"
    }

    DSMManager.setIntegratorKey(integratorKey)
    DSMManager.setupSession(
      withHostURL: URL(string: host),
      sslPinningEnabled: true
    )

    registerNotificationObservers()
    isInitialized = true
  }

  func loginWithAccessToken(
    accessToken: String,
    accountId: String,
    userId: String,
    userName: String,
    email: String,
    host: String,
    completion: @escaping (Result<Void, Error>) -> Void
  ) throws {
    guard isInitialized else {
      throw NotInitializedException()
    }

    guard let hostURL = URL(string: host) else {
      throw LoginFailedException("Invalid host URL")
    }

    DSMManager.login(
      withAccessToken: accessToken,
      accountId: accountId,
      userId: userId,
      userName: userName,
      email: email,
      hostURL: hostURL
    ) { error in
      if let error = error {
        completion(.failure(error))
      } else {
        completion(.success(()))
      }
    }
  }

  func logout() {
    DSMManager.logout()
  }

  func isLoggedIn() -> Bool {
    return DSMManager.isLoggedIn()
  }

  func presentCaptiveSigning(
    envelopeId: String,
    recipientUserName: String,
    recipientEmail: String,
    recipientClientUserId: String,
    completion: @escaping (Result<SigningOutcome, Error>) -> Void
  ) throws {
    guard isInitialized else {
      throw NotInitializedException()
    }

    guard isLoggedIn() else {
      throw NotLoggedInException()
    }

    guard let presentingViewController = Self.topmostViewController() else {
      throw PresentationException("Could not find a view controller to present from")
    }

    currentEnvelopeId = envelopeId

    DispatchQueue.main.async {
      DSMEnvelopesManager.shared().presentCaptiveSigning(
        withPresenting: presentingViewController,
        envelopeId: envelopeId,
        recipientUserName: recipientUserName,
        recipientEmail: recipientEmail,
        recipientClientUserId: recipientClientUserId,
        animated: true
      ) { [weak self] _, error in
        guard let self = self else { return }

        if let error = error {
          self.currentEnvelopeId = nil
          completion(.failure(error))
          return
        }
      }
    }

    pendingCompletion = completion
  }

  private var pendingCompletion: ((Result<SigningOutcome, Error>) -> Void)?

  internal struct SigningOutcome {
    let status: String
    let envelopeId: String
    let errorCode: String?
    let errorMessage: String?
  }

  private func registerNotificationObservers() {
    let nc = NotificationCenter.default
    nc.addObserver(
      self,
      selector: #selector(handleSigningCompleted(_:)),
      name: .DSMSigningCompleted,
      object: nil
    )
    nc.addObserver(
      self,
      selector: #selector(handleSigningCancelled(_:)),
      name: .DSMSigningCancelled,
      object: nil
    )
  }

  @objc private func handleSigningCompleted(_ notification: Notification) {
    let envelopeId = currentEnvelopeId ?? (notification.userInfo?["envelopeId"] as? String ?? "")
    let outcome = SigningOutcome(
      status: "completed",
      envelopeId: envelopeId,
      errorCode: nil,
      errorMessage: nil
    )
    module?.sendEvent("onSigningComplete", ["envelopeId": envelopeId])
    pendingCompletion?(.success(outcome))
    pendingCompletion = nil
    currentEnvelopeId = nil
  }

  @objc private func handleSigningCancelled(_ notification: Notification) {
    let envelopeId = currentEnvelopeId ?? (notification.userInfo?["envelopeId"] as? String ?? "")
    let reason = notification.userInfo?["reason"] as? String
    let outcome = SigningOutcome(
      status: "cancelled",
      envelopeId: envelopeId,
      errorCode: nil,
      errorMessage: reason
    )
    module?.sendEvent("onSigningCancelled", ["envelopeId": envelopeId, "reason": reason as Any])
    pendingCompletion?(.success(outcome))
    pendingCompletion = nil
    currentEnvelopeId = nil
  }

  private static func topmostViewController(
    base: UIViewController? = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }
      .first(where: { $0.isKeyWindow })?.rootViewController
  ) -> UIViewController? {
    if let nav = base as? UINavigationController {
      return topmostViewController(base: nav.visibleViewController)
    }
    if let tab = base as? UITabBarController, let selected = tab.selectedViewController {
      return topmostViewController(base: selected)
    }
    if let presented = base?.presentedViewController {
      return topmostViewController(base: presented)
    }
    return base
  }
}
