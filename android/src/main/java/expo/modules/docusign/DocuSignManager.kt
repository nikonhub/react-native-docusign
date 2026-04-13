package expo.modules.docusign

import android.app.Activity
import android.content.Context
import android.content.Intent
import com.docusign.androidsdk.DocuSign
import com.docusign.androidsdk.core.models.DSEnvelopeDefaultValues
import com.docusign.androidsdk.core.models.DSEnvironment
import com.docusign.androidsdk.core.models.DSMode
import com.docusign.androidsdk.core.models.DSUser
import com.docusign.androidsdk.core.models.User
import com.docusign.androidsdk.delegates.DSAuthenticationDelegate
import com.docusign.androidsdk.delegates.DSEnvelopeDelegate
import com.docusign.androidsdk.listeners.DSAuthenticationListener
import com.docusign.androidsdk.listeners.DSOfflineSigningListener
import com.docusign.androidsdk.util.DSLogger
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob

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

internal object DocuSignManager {
  private var isInitialized = false
  private var module: DocuSignModule? = null
  private var currentEnvelopeId: String? = null
  private var pendingCompletion: ((Result<SigningOutcome>) -> Unit)? = null

  val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

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
      DocuSignEnvironment.DEMO -> DSEnvironment.DEMO
      DocuSignEnvironment.PRODUCTION -> DSEnvironment.PRODUCTION
    }

    DocuSign.init(
      context,
      integratorKey,
      "",
      "",
      DSMode.DEBUG
    )
    DocuSign.getInstance().setEnvironment(dsEnvironment)

    isInitialized = true
  }

  fun loginWithAccessToken(
    accessToken: String,
    accountId: String,
    userId: String,
    userName: String,
    email: String,
    host: String,
    completion: (Result<Unit>) -> Unit
  ) {
    if (!isInitialized) {
      completion(Result.failure(NotInitializedException()))
      return
    }

    try {
      val user = User(
        userId = userId,
        userName = userName,
        email = email,
        accountId = accountId,
        accessToken = accessToken,
        host = host
      )

      DocuSign.getInstance().getAuthenticationDelegate().loginWithAccessToken(
        user,
        object : DSAuthenticationListener {
          override fun onSuccess(dsUser: DSUser) {
            completion(Result.success(Unit))
          }

          override fun onError(exception: Exception) {
            completion(Result.failure(LoginFailedException(exception.message ?: "Unknown error")))
          }
        }
      )
    } catch (e: Exception) {
      completion(Result.failure(LoginFailedException(e.message ?: "Unknown error")))
    }
  }

  fun logout() {
    if (!isInitialized) return
    DocuSign.getInstance().getAuthenticationDelegate().logout()
  }

  fun isLoggedIn(): Boolean {
    if (!isInitialized) return false
    return DocuSign.getInstance().getAuthenticationDelegate().isUserLoggedIn()
  }

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

    currentEnvelopeId = envelopeId
    pendingCompletion = completion

    try {
      val envelopeDelegate = DocuSign.getInstance().getEnvelopeDelegate()
      envelopeDelegate.captiveSignEnvelope(
        activity,
        envelopeId,
        recipientUserName,
        recipientEmail,
        recipientClientUserId
      )
    } catch (e: Exception) {
      pendingCompletion = null
      currentEnvelopeId = null
      completion(Result.failure(SigningFailedException(e.message ?: "Unknown error")))
    }
  }

  fun handleSigningCompleted(envelopeId: String) {
    val outcome = SigningOutcome(
      status = "completed",
      envelopeId = envelopeId
    )
    module?.emitSigningComplete(envelopeId)
    pendingCompletion?.invoke(Result.success(outcome))
    pendingCompletion = null
    currentEnvelopeId = null
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
    currentEnvelopeId = null
  }

  fun handleSigningError(envelopeId: String?, errorCode: String, errorMessage: String) {
    module?.emitSigningError(envelopeId, errorCode, errorMessage)
    pendingCompletion?.invoke(Result.failure(SigningFailedException(errorMessage)))
    pendingCompletion = null
    currentEnvelopeId = null
  }
}
