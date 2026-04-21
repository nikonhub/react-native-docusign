import { useCallback, useEffect, useRef, useState } from 'react';

import { Platform } from 'react-native';

import {
  addSigningCancelledListener,
  addSigningCompleteListener,
  addSigningErrorListener,
  initialize,
  loginWithAccessToken,
  presentCaptiveSigning,
  presentCaptiveSigningWithUrl,
} from './api';
import {
  CaptiveSigningParams,
  CaptiveSigningUrlParams,
  DocuSignAuthParams,
  DocuSignConfig,
  SigningResult,
} from './DocuSign.types';

export type DocuSignSigningState =
  | 'idle'
  | 'initializing'
  | 'ready'
  | 'preparing'
  | 'signing'
  | 'completed'
  | 'cancelled'
  | 'error';

export type SigningSessionWithAuth = DocuSignAuthParams & CaptiveSigningParams & { type: 'session' };

export type SigningSessionWithUrl = CaptiveSigningUrlParams & { type: 'url' };

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

export function useDocuSignSigning(options: UseDocuSignSigningOptions): UseDocuSignSigningReturn {
  const { config, autoInitialize = true } = options;

  const [state, setState] = useState<DocuSignSigningState>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<SigningResult | null>(null);
  const initializedRef = useRef(false);

  const doInitialize = useCallback(async () => {
    if (initializedRef.current) return;
    setState('initializing');
    setError(null);
    try {
      await initialize(config);
      initializedRef.current = true;
      setState('ready');
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      setState('error');
      throw err;
    }
  }, [config]);

  useEffect(() => {
    if (!autoInitialize) return;
    doInitialize().catch(() => {
      // error already captured into hook state
    });
  }, [autoInitialize, doInitialize]);

  useEffect(() => {
    const completeSub = addSigningCompleteListener(() => {
      // promise-based path also resolves; this listener is here for any
      // event that may fire from outside the promise flow
    });
    const cancelSub = addSigningCancelledListener(() => {});
    const errorSub = addSigningErrorListener((event) => {
      setError(new Error(`${event.errorCode}: ${event.errorMessage}`));
    });
    return () => {
      completeSub.remove();
      cancelSub.remove();
      errorSub.remove();
    };
  }, []);

  const startSigning = useCallback(
    async (session: SigningSession): Promise<SigningResult> => {
      try {
        if (!initializedRef.current) {
          await doInitialize();
        }

        setState('preparing');
        setError(null);
        setResult(null);

        let signingResult: SigningResult;

        if (session.type === 'url') {
          if (Platform.OS !== 'ios') {
            throw new Error(
              'presentCaptiveSigningWithUrl is iOS-only. Use the session flow (type: "session") for Android parity.'
            );
          }
          setState('signing');
          signingResult = await presentCaptiveSigningWithUrl({
            signingUrl: session.signingUrl,
            envelopeId: session.envelopeId,
            recipientId: session.recipientId,
          });
        } else {
          await loginWithAccessToken({
            accessToken: session.accessToken,
            accountId: session.accountId,
            userId: session.userId,
            userName: session.userName,
            email: session.email,
            host: session.host,
          });

          setState('signing');
          signingResult = await presentCaptiveSigning({
            envelopeId: session.envelopeId,
            recipientUserName: session.recipientUserName,
            recipientEmail: session.recipientEmail,
            recipientClientUserId: session.recipientClientUserId,
          });
        }

        setResult(signingResult);
        setState(
          signingResult.status === 'completed'
            ? 'completed'
            : signingResult.status === 'cancelled'
              ? 'cancelled'
              : 'error'
        );
        return signingResult;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        setState('error');
        throw err;
      }
    },
    [doInitialize]
  );

  const reset = useCallback(() => {
    setState(initializedRef.current ? 'ready' : 'idle');
    setError(null);
    setResult(null);
  }, []);

  return {
    state,
    error,
    result,
    initialize: doInitialize,
    startSigning,
    reset,
  };
}
