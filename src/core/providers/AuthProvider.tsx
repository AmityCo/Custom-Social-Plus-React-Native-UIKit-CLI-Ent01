import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FC,
} from 'react';
import { Client } from '@amityco/ts-sdk-react-native';
import {
  peekPendingVisitorJoin,
  clearPendingVisitorJoin,
  waitForPendingVisitorJoinHydration,
  notifyVisitorAutoJoinCompleted,
} from '../stores/pendingVisitorJoin';
import { joinCommunityWithRetry } from '../utils/joinCommunityWithRetry';
import type { AuthContextInterface } from '../types/auth';
import { Alert } from 'react-native';
import type { IAmityUIkitProvider } from './AmityUIKitProvider';
import { ERROR_CODE } from '../../core/constants';
import { onSdkReady } from '../routes/navigation';

export const AuthContext = createContext<AuthContextInterface>({
  client: null,
  isConnecting: false,
  error: '',
  login: () => {},
  logout: () => {},
  isConnected: false,
  sessionState: '',
  apiRegion: 'sg',
  authToken: '',
  getAuthToken: undefined,
  fcmToken: undefined,
  isGlobalBan: false,
  isVisitorUsageLimitReached: false,
  isVisitorOrBot: false,
});

export const AuthContextProvider: FC<IAmityUIkitProvider> = ({
  userId,
  displayName,
  apiKey,
  apiRegion,
  apiEndpoint,
  children,
  authToken,
  getAuthToken,
  fcmToken,
}: IAmityUIkitProvider) => {
  const [error, setError] = useState('');
  const [isConnecting, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionState, setSessionState] = useState('');
  const client: Amity.Client = Client.createClient(apiKey, apiRegion, {
    apiEndpoint: { http: apiEndpoint },
  });
  const [isGlobalBan, setIsGlobalBan] = useState(false);
  const [isVisitorUsageLimitReached, setIsVisitorUsageLimitReached] =
    useState(false);
  const [isVisitorOrBot, setIsVisitorOrBot] = useState(false);

  const sessionHandler: Amity.SessionHandler = {
    sessionWillRenewAccessToken(renewal) {
      // Secure mode: fetch a fresh auth token from the host backend and renew
      // with it. Auth tokens are short-lived, so we must re-fetch every renewal
      // rather than reuse the initial one. Falls back to a plain renew() if the
      // host didn't supply getAuthToken (unsecure mode) or if fetching fails.
      if (getAuthToken && userId) {
        Promise.resolve(getAuthToken(userId))
          .then((token) => {
            if (token) {
              renewal.renewWithAuthToken(token);
            } else {
              renewal.renew();
            }
          })
          .catch((err) => {
            console.log('getAuthToken (renewal) failed:', err);
            renewal.renew();
          });
        return;
      }
      renewal.renew();
    },
  };

  useEffect(() => {
    return Client.onSessionStateChange(
      (state: Amity.SessionStates, reason: Amity.TokenTerminationReason) => {
        setSessionState(state);
        setIsGlobalBan(reason === 'globalBan');
      }
    );
  }, []);

  // Guards against two effect runs racing the same pending join (e.g. the
  // session re-establishes while a join is still in flight). Not state: it must
  // update synchronously, and it should never trigger a render.
  const isAutoJoiningRef = useRef(false);

  useEffect(() => {
    if (sessionState === 'established') {
      setIsConnected(true);
      onSdkReady();
      // Same check as the Web UIKit's isVisitorOrBot in SDKProvider.
      // getCurrentUserType() THROWS ('Connect client first') when the user type
      // has not been populated yet, which can happen on the tick the session
      // reports established. Unguarded, that exception aborted the rest of this
      // effect and the auto-join below never ran.
      let isSignedIn = false;
      try {
        isSignedIn = Client.getCurrentUserType() === 'signed-in';
        setIsVisitorOrBot(!isSignedIn);
      } catch {
        // User type not resolved yet. Leave isVisitorOrBot at its current value
        // (defaults to false) and skip the join — the next session-state event
        // re-runs this effect with the type populated, and the pending id is
        // still on record because nothing consumed it.
        return;
      }

      // Auto-join the community a visitor tapped Join on before signing in.
      // A visitor session can't join (read-only); now that the session is a
      // signed-in one, join so the community's posts appear in the feed.
      //
      // The id is PEEKED, not consumed: it is only cleared once the join has
      // actually succeeded. Clearing up front (the previous behaviour) meant any
      // transient network failure discarded the id permanently and the user was
      // silently never joined — the intermittent failure this guards against.
      if (isSignedIn && !isAutoJoiningRef.current) {
        isAutoJoiningRef.current = true;
        // Await hydration so a join recorded before an app restart is still
        // found. Resolves immediately once hydration has settled.
        waitForPendingVisitorJoinHydration()
          .then(async () => {
            const pendingCommunityId = peekPendingVisitorJoin();
            if (!pendingCommunityId) return;

            const joined = await joinCommunityWithRetry(pendingCommunityId, {
              onFinalFailure: (joinError) =>
                console.log('Auto-join community failed:', joinError),
            });

            if (joined) {
              // Only now is it safe to drop the id.
              clearPendingVisitorJoin();
              // Tell join-state-dependent screens (Explore) to re-fetch now
              // that the join is committed — they may have loaded before it.
              notifyVisitorAutoJoinCompleted();
            }
            // On failure the id stays pending, so the next session-established
            // event (app foreground, reconnect) retries it.
          })
          .finally(() => {
            isAutoJoiningRef.current = false;
          });
      }
    }
  }, [sessionState]);

  useEffect(() => {
    // SDK emits this (throttled, 2s window) when a visitor/bot session gets
    // error 400323 — daily usage limit exceeded. The session stays alive, so
    // this is tracked separately from isGlobalBan. In-memory only: the flag
    // resets when the provider remounts or the user signs in with a userId.
    return Client.onVisitorUsageLimitReached(() => {
      setIsVisitorUsageLimitReached(true);
    });
  }, []);

  const handleConnect = useCallback(async () => {
    try {
      if (userId) {
        let loginParam: Amity.ConnectClientParams = {
          userId: userId,
        };
        // Only send displayName when the host actually supplied one. The SDK
        // overwrites an existing user's displayName whenever a value is passed,
        // so omitting the field entirely (rather than passing undefined) keeps
        // the server-side name intact for returning users.
        if (displayName) {
          loginParam = { ...loginParam, displayName: displayName };
        }
        // Secure mode: resolve the auth token from the host backend for this
        // userId. getAuthToken takes precedence over the static authToken prop.
        // If neither is present the session is unsecure (dev / secure mode off).
        const resolvedAuthToken = getAuthToken
          ? await getAuthToken(userId)
          : authToken;
        if (resolvedAuthToken && resolvedAuthToken.length > 0) {
          loginParam = { ...loginParam, authToken: resolvedAuthToken };
        }
        const response = await Client.login(loginParam, sessionHandler);
        if (!response) return;
      } else {
        // No userId — connect as a visitor (read-only session, same
        // convention as the Web UIKit's registerDevice without userId)
        const response = await Client.loginAsVisitor({ sessionHandler });
        if (!response) return;
      }
    } catch (err) {
      if (err?.message?.includes(ERROR_CODE.GLOBAL_BAN)) {
        setIsGlobalBan(true);
      }
    }

    if (fcmToken) {
      try {
        await Client.registerPushNotification(fcmToken);
      } catch (err) {
        console.log(err);
      }
    }
    // Depend on userId (and the other login params) so that when the host
    // switches a visitor session to a signed-in one by passing a userId, this
    // callback re-reads the new value and calls Client.login instead of
    // re-using the stale (undefined) userId and re-connecting as a visitor.
  }, [userId, displayName, authToken, getAuthToken, fcmToken]);

  const login = async () => {
    setError('');
    setLoading(true);
    try {
      await handleConnect();
    } catch (e) {
      const errorText =
        (e as Error)?.message ?? 'Error while handling request!';

      setError(errorText);
      throw e;
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    setIsVisitorUsageLimitReached(false);
    login();
  }, [userId]);

  const logout = async () => {
    try {
      Client.stopUnreadSync();
      await Client.logout();
    } catch (e) {
      const errorText =
        (e as Error)?.message ?? 'Error while handling request!';

      Alert.alert(errorText);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        error,
        isConnecting,
        login,
        client,
        logout,
        isConnected,
        sessionState,
        apiRegion: apiRegion.toLowerCase(),
        authToken,
        getAuthToken,
        fcmToken,
        isGlobalBan,
        isVisitorUsageLimitReached,
        isVisitorOrBot,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
export default AuthContextProvider;
