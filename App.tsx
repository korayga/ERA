// App.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Amplify } from 'aws-amplify';
import { Hub, type HubCapsule } from 'aws-amplify/utils';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import config from './src/config/aws-exports';
import { AuthProvider, useAuth } from './src/screens/AuthScreen';
import AppNavigator from './src/navigation/AppNavigator';

Amplify.configure(config);

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkCurrentUser = useCallback(async (setTokens: (accessToken: string, idToken: string) => void, setUser: (user: any) => void) => {
    console.log('App.tsx: checkCurrentUser called');
    setIsLoading(true);
    try {
      const authUserResponse = await getCurrentUser();
      const session = await fetchAuthSession();
      const accessToken = session.tokens?.accessToken?.toString();
      const idToken = session.tokens?.idToken?.toString();

      if (accessToken && idToken && authUserResponse) {
        setTokens(accessToken, idToken);
        setUser({ username: authUserResponse.username });
        console.log('App.tsx: Current user found:', authUserResponse.username, authUserResponse.userId);
      }
    } catch (error) {
      console.log('App.tsx: No user session or error:', error);
    } finally {
      setIsLoading(false);
      console.log('App.tsx: checkCurrentUser completed, isLoading:', false);
    }
  }, []);

  useEffect(() => {
    const hubListenerCancel = Hub.listen(
      'auth',
      (capsule: HubCapsule<'auth', any>) => {
        const { payload } = capsule;
        console.log('App.tsx: Auth event received:', payload.event, payload.data);

        switch (payload.event) {
          case 'signedIn':
          case 'autoSignIn':
            console.log('App.tsx: signedIn or autoSignIn event, calling checkCurrentUser');
            // AuthProvider içindeki setTokens ve setUser'a erişmek için useAuth kullanılamaz,
            // bu yüzden checkCurrentUser çağrısında setTokens ve setUser fonksiyonlarını manuel olarak geçiyoruz
            break;
          case 'signedOut':
            console.log('App.tsx: signedOut event, user set to null');
            break;
          case 'signIn_failure':
          case 'signUp_failure':
          case 'confirmSignUp_failure':
          case 'autoSignIn_failure':
            console.error(`App.tsx: ${payload.event} error:`, payload.data);
            break;
        }
      }
    );

    console.log('App.tsx: Initial useEffect, calling checkCurrentUser');
    // AuthProvider içindeki setTokens ve setUser'a erişmek için bir geçici çözüm
    const tempAuthContext = { setTokens: () => {}, setUser: () => {} };
    checkCurrentUser(tempAuthContext.setTokens, tempAuthContext.setUser);

    return () => {
      console.log('App.tsx: Removing Hub listener');
      hubListenerCancel();
    };
  }, [checkCurrentUser]);

  if (isLoading) {
    console.log('App.tsx: Showing loading screen...');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  console.log('App.tsx: Rendering AppNavigator');
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});

export default App;