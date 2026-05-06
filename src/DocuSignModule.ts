import { NativeModule, requireNativeModule } from 'expo';

import {
  CaptiveSigningParams,
  CaptiveSigningUrlParams,
  DocuSignAccountInfo,
  DocuSignAuthParams,
  DocuSignConfig,
  DocuSignModuleEvents,
  SigningResult,
} from './DocuSign.types';

declare class DocuSignModule extends NativeModule<DocuSignModuleEvents> {
  initialize(config: DocuSignConfig): Promise<void>;
  loginWithAccessToken(
    params: DocuSignAuthParams,
  ): Promise<DocuSignAccountInfo>;
  presentCaptiveSigning(params: CaptiveSigningParams): Promise<SigningResult>;
  presentCaptiveSigningWithUrl(
    params: CaptiveSigningUrlParams,
  ): Promise<SigningResult>;
  logout(): Promise<void>;
  isLoggedIn(): Promise<boolean>;
  endSigningSession(): Promise<void>;
}

export default requireNativeModule<DocuSignModule>('DocuSign');
