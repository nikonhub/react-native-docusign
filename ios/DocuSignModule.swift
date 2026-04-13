import ExpoModulesCore

internal struct DocuSignInitConfig: Record {
  @Field var integratorKey: String = ""
  @Field var environment: String = "demo"
}

internal struct DocuSignAuthRecord: Record {
  @Field var accessToken: String = ""
  @Field var accountId: String = ""
  @Field var userId: String = ""
  @Field var userName: String = ""
  @Field var email: String = ""
  @Field var host: String = ""
}

internal struct CaptiveSigningRecord: Record {
  @Field var envelopeId: String = ""
  @Field var recipientUserName: String = ""
  @Field var recipientEmail: String = ""
  @Field var recipientClientUserId: String = ""
}

public class DocuSignModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DocuSign")

    Events("onSigningComplete", "onSigningCancelled", "onSigningError")

    OnCreate {
      DocuSignManager.shared.setModule(self)
    }

    AsyncFunction("initialize") { (config: DocuSignInitConfig, promise: Promise) in
      do {
        let environment = DocuSignEnvironment(rawValue: config.environment) ?? .demo
        try DocuSignManager.shared.initialize(
          integratorKey: config.integratorKey,
          environment: environment
        )
        promise.resolve(nil)
      } catch {
        promise.reject(error)
      }
    }

    AsyncFunction("loginWithAccessToken") { (params: DocuSignAuthRecord, promise: Promise) in
      do {
        try DocuSignManager.shared.loginWithAccessToken(
          accessToken: params.accessToken,
          accountId: params.accountId,
          userId: params.userId,
          userName: params.userName,
          email: params.email,
          host: params.host
        ) { result in
          switch result {
          case .success:
            promise.resolve(nil)
          case .failure(let error):
            self.sendEvent("onSigningError", [
              "errorCode": "login_failed",
              "errorMessage": error.localizedDescription
            ])
            promise.reject(LoginFailedException(error.localizedDescription))
          }
        }
      } catch {
        promise.reject(error)
      }
    }

    AsyncFunction("presentCaptiveSigning") { (params: CaptiveSigningRecord, promise: Promise) in
      do {
        try DocuSignManager.shared.presentCaptiveSigning(
          envelopeId: params.envelopeId,
          recipientUserName: params.recipientUserName,
          recipientEmail: params.recipientEmail,
          recipientClientUserId: params.recipientClientUserId
        ) { result in
          switch result {
          case .success(let outcome):
            promise.resolve([
              "status": outcome.status,
              "envelopeId": outcome.envelopeId,
              "errorCode": outcome.errorCode as Any,
              "errorMessage": outcome.errorMessage as Any
            ])
          case .failure(let error):
            self.sendEvent("onSigningError", [
              "envelopeId": params.envelopeId,
              "errorCode": "signing_failed",
              "errorMessage": error.localizedDescription
            ])
            promise.reject(SigningFailedException(error.localizedDescription))
          }
        }
      } catch {
        promise.reject(error)
      }
    }

    AsyncFunction("logout") { (promise: Promise) in
      DocuSignManager.shared.logout()
      promise.resolve(nil)
    }

    AsyncFunction("isLoggedIn") { (promise: Promise) in
      promise.resolve(DocuSignManager.shared.isLoggedIn())
    }
  }
}
