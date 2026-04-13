import { NativeModule, requireNativeModule } from 'expo'

import {
  CaptiveSigningParams,
  DocuSignAuthParams,
  DocuSignConfig,
  DocuSignModuleEvents,
  SigningResult,
} from './DocuSign.types'

declare class DocuSignModule extends NativeModule<DocuSignModuleEvents> {
  initialize(config: DocuSignConfig): Promise<void>
  loginWithAccessToken(params: DocuSignAuthParams): Promise<void>
  presentCaptiveSigning(params: CaptiveSigningParams): Promise<SigningResult>
  logout(): Promise<void>
  isLoggedIn(): Promise<boolean>
}

export default requireNativeModule<DocuSignModule>('DocuSign')
