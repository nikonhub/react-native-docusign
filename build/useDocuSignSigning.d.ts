import { CaptiveSigningParams, CaptiveSigningUrlParams, DocuSignAuthParams, DocuSignConfig, SigningResult } from './DocuSign.types';
export type DocuSignSigningState = 'idle' | 'initializing' | 'ready' | 'preparing' | 'signing' | 'completed' | 'cancelled' | 'error';
export type SigningSessionWithAuth = DocuSignAuthParams & CaptiveSigningParams & {
    type: 'session';
};
export type SigningSessionWithUrl = CaptiveSigningUrlParams & {
    type: 'url';
};
export type SigningSession = SigningSessionWithAuth | SigningSessionWithUrl;
export type UseDocuSignSigningOptions = {
    config: DocuSignConfig;
    autoInitialize?: boolean;
};
export type UseDocuSignSigningReturn = {
    state: DocuSignSigningState;
    error: Error | null;
    result: SigningResult | null;
    initialize: () => Promise<void>;
    startSigning: (session: SigningSession) => Promise<SigningResult>;
    reset: () => void;
};
export declare function useDocuSignSigning(options: UseDocuSignSigningOptions): UseDocuSignSigningReturn;
//# sourceMappingURL=useDocuSignSigning.d.ts.map