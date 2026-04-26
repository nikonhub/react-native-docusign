import { NativeModule } from 'expo';
import { CaptiveSigningParams, CaptiveSigningUrlParams, DocuSignAccountInfo, DocuSignAuthParams, DocuSignConfig, DocuSignModuleEvents, SigningResult } from './DocuSign.types';
declare class DocuSignModule extends NativeModule<DocuSignModuleEvents> {
    initialize(config: DocuSignConfig): Promise<void>;
    loginWithAccessToken(params: DocuSignAuthParams): Promise<DocuSignAccountInfo>;
    presentCaptiveSigning(params: CaptiveSigningParams): Promise<SigningResult>;
    presentCaptiveSigningWithUrl(params: CaptiveSigningUrlParams): Promise<SigningResult>;
    logout(): Promise<void>;
    isLoggedIn(): Promise<boolean>;
}
declare const _default: DocuSignModule;
export default _default;
//# sourceMappingURL=DocuSignModule.d.ts.map