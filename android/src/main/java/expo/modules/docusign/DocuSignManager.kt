package expo.modules.docusign

import android.app.Activity
import android.content.Context
import com.docusign.androidsdk.DSEnvironment
import com.docusign.androidsdk.DocuSign
import com.docusign.androidsdk.dsmodels.DSUser
import com.docusign.androidsdk.exceptions.DSAuthenticationException
import com.docusign.androidsdk.exceptions.DSSigningException
import com.docusign.androidsdk.listeners.DSAuthenticationListener
import com.docusign.androidsdk.listeners.DSCaptiveSigningListener
import com.docusign.androidsdk.listeners.DSLogoutListener
import com.docusign.androidsdk.util.DSMode

internal enum class DocuSignEnvironment(val value: String) {
  DEMO("demo"),
  PRODUCTION("production");

  companion object {
    fun fromString(value: String): DocuSignEnvironment =
      values().firstOrNull { it.value == value } ?: DEMO
  }
}

internal data class SigningOutcome(
  val status: String,
  val envelopeId: String,
  val errorCode: String? = null,
  val errorMessage: String? = null
)

internal data class DocuSignAccountInfo(
  val accountId: String,
  val userId: String,
  val userName: String,
  val email: String
)

internal object DocuSignManager {
  private var isInitialized = false
  private var hasLoggedIn = false
  private var module: DocuSignModule? = null
  private var appContext: Context? = null
  private var pendingCompletion: ((Result<SigningOutcome>) -> Unit)? = null

  fun setModule(module: DocuSignModule) {
    this.module = module
  }

  fun initialize(
    context: Context,
    integratorKey: String,
    environment: DocuSignEnvironment
  ) {
    if (isInitialized) {
      return
    }

    val dsEnvironment = when (environment) {
      DocuSignEnvironment.DEMO -> DSEnvironment.DEMO_ENVIRONMENT
      DocuSignEnvironment.PRODUCTION -> DSEnvironment.PRODUCTION_ENVIRONMENT
    }

    DocuSign.init(context.applicationContext, integratorKey, "", "", DSMode.DEBUG)
      .setEnvironment(dsEnvironment)

    appContext = context.applicationContext
    isInitialized = true
  }

  fun loginWithAccessToken(
    accessToken: String,
    accountId: String,
    userId: String,
    userName: String,
    email: String,
    host: String,
    expiresIn: Int,
    completion: (Result<DocuSignAccountInfo>) -> Unit
  ) {
    val ctx = appContext
    if (!isInitialized || ctx == null) {
      completion(Result.failure(NotInitializedException()))
      return
    }

    try {
      DocuSign.getInstance().getAuthenticationDelegate().login(
        accessToken,
        null,
        expiresIn,
        ctx,
        object : DSAuthenticationListener {
          override fun onSuccess(user: DSUser) {
            hasLoggedIn = true
            val info = DocuSignAccountInfo(
              accountId = user.accountId.ifEmpty { accountId },
              userId = user.userId.ifEmpty { userId },
              userName = (user.name ?: "").ifEmpty { userName },
              email = user.email.ifEmpty { email }
            )
            completion(Result.success(info))
          }

          override fun onError(exception: DSAuthenticationException) {
            completion(Result.failure(LoginFailedException(exception.message ?: "Unknown error")))
          }
        }
      )
    } catch (e: Exception) {
      completion(Result.failure(LoginFailedException(e.message ?: "Unknown error")))
    }
  }

  fun logout() {
    val ctx = appContext
    if (!isInitialized || ctx == null) return
    hasLoggedIn = false
    try {
      DocuSign.getInstance().getAuthenticationDelegate().logout(
        ctx,
        true,
        object : DSLogoutListener {
          override fun onSuccess() {}
          override fun onError(exception: DSAuthenticationException) {}
        }
      )
    } catch (_: Exception) {
    }
  }

  fun isLoggedIn(): Boolean = hasLoggedIn

  fun presentCaptiveSigning(
    activity: Activity,
    envelopeId: String,
    recipientUserName: String,
    recipientEmail: String,
    recipientClientUserId: String,
    completion: (Result<SigningOutcome>) -> Unit
  ) {
    if (!isInitialized) {
      completion(Result.failure(NotInitializedException()))
      return
    }

    if (!isLoggedIn()) {
      completion(Result.failure(NotLoggedInException()))
      return
    }

    pendingCompletion = completion

    try {
      DocuSign.getInstance().getCustomSettingsDelegate()
        .disableNativeComponentsInOnlineSigning(activity, true)

      DocuSign.getInstance().getSigningDelegate().launchCaptiveSigning(
        activity,
        envelopeId,
        recipientClientUserId,
        object : DSCaptiveSigningListener {
          override fun onStart(envelopeId: String) {}

          override fun onSuccess(envelopeId: String) {
            handleSigningCompleted(envelopeId)
          }

          override fun onCancel(envelopeId: String, recipientId: String) {
            handleSigningCancelled(envelopeId, null)
          }

          override fun onError(envelopeId: String?, exception: DSSigningException) {
            handleSigningError(
              envelopeId,
              "signing_failed",
              exception.message ?: "Unknown error"
            )
          }

          override fun onRecipientSigningSuccess(envelopeId: String, recipientId: String) {}

          override fun onRecipientSigningError(
            envelopeId: String,
            recipientId: String,
            exception: DSSigningException
          ) {
            handleSigningError(
              envelopeId,
              "recipient_signing_failed",
              exception.message ?: "Unknown error"
            )
          }
        }
      )
    } catch (e: Exception) {
      pendingCompletion = null
      completion(Result.failure(SigningFailedException(e.message ?: "Unknown error")))
    }
  }

  fun handleSigningCompleted(envelopeId: String) {
    val outcome = SigningOutcome(status = "completed", envelopeId = envelopeId)
    module?.emitSigningComplete(envelopeId)
    pendingCompletion?.invoke(Result.success(outcome))
    pendingCompletion = null
  }

  fun handleSigningCancelled(envelopeId: String, reason: String?) {
    val outcome = SigningOutcome(
      status = "cancelled",
      envelopeId = envelopeId,
      errorMessage = reason
    )
    module?.emitSigningCancelled(envelopeId, reason)
    pendingCompletion?.invoke(Result.success(outcome))
    pendingCompletion = null
  }

  fun handleSigningError(envelopeId: String?, errorCode: String, errorMessage: String) {
    module?.emitSigningError(envelopeId, errorCode, errorMessage)
    pendingCompletion?.invoke(Result.failure(SigningFailedException(errorMessage)))
    pendingCompletion = null
  }
}
