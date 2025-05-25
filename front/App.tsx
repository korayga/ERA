// App.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Amplify } from 'aws-amplify';
import { Hub, type HubCapsule } from 'aws-amplify/utils';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import config from './src/config/aws-exports';
import { AuthProvider, useAuth } from './src/screens/AuthScreen'; // AuthScreen'in useAuth ve AuthProvider'ı dışa aktardığını varsayıyoruz
import AppNavigator from './src/navigation/AppNavigator';
import { TokenManager } from './types/TokenManager'; // TokenManager'ın doğru şekilde uygulandığını varsayıyoruz

// Amplify'ı uygulamanın en üst seviyesinde yapılandırın
Amplify.configure(config);

/**
 * AuthAwareAppContent Bileşeni
 * Bu bileşen, AuthProvider içinde render edilir ve kimlik doğrulama bağlamına erişebilir.
 * Uygulamanın başlangıç yükleme durumunu ve kimlik doğrulama olaylarını yönetir.
 */
const AuthAwareAppContent: React.FC = () => {
  // Yükleme durumunu yönetmek için yerel state
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // AuthContext'ten global kimlik doğrulama durumunu ve güncelleyicilerini al
  const { setUser, setTokens, clearAuth } = useAuth();

  /**
   * Amplify ile mevcut kullanıcı oturumunu kontrol eder.
   * Oturum durumuna göre AuthContext ve TokenManager'ı günceller.
   */
  const checkCurrentUser = useCallback(async () => {
    setIsLoading(true); // Yükleme durumunu başlat
    try {
      const authUserResponse = await getCurrentUser();
      const session = await fetchAuthSession();
      const newAccessToken = session.tokens?.accessToken?.toString();
      const newIdToken = session.tokens?.idToken?.toString();

      if (newAccessToken && newIdToken && authUserResponse) {
        setTokens(newAccessToken, newIdToken);
        TokenManager.setIdToken(newIdToken); // TokenManager'ı güncelle
        setUser({ username: authUserResponse.username });
      } else {
        clearAuth(); // AuthContext'i temizle
        TokenManager.setIdToken(null); // TokenManager'ı temizle
      }
    } catch (error) {
      clearAuth(); // Hata durumunda AuthContext'i temizle
      TokenManager.setIdToken(null); // Hata durumunda TokenManager'ı temizle
    } finally {
      setIsLoading(false); // Yükleme durumunu tamamla
    }
  }, [setUser, setTokens, clearAuth]); // useCallback için bağımlılıklar

  /**
   * Amplify Hub dinleyicisini kurmak ve temizlemek için useEffect hook'u.
   * Ayrıca bileşen yüklendiğinde başlangıç checkCurrentUser çağrısını tetikler.
   */
  useEffect(() => {
    // Amplify Hub'dan kimlik doğrulama olaylarını dinle
    const hubListenerCancel = Hub.listen('auth', (capsule: HubCapsule<'auth', any>) => {
      const { payload } = capsule;

      switch (payload.event) {
        case 'signedIn':
        case 'autoSignIn':
          checkCurrentUser();
          break;
        case 'signedOut':
          clearAuth(); // AuthContext durumunu temizle
          TokenManager.setIdToken(null); // TokenManager'ı temizle
          break;
        case 'signIn_failure':
        case 'signUp_failure':
        case 'confirmSignUp_failure':
        case 'autoSignIn_failure':
          console.error(`AuthAwareAppContent: ${payload.event} error:`, payload.data);
          clearAuth(); 
          TokenManager.setIdToken(null); 
          break;
        default:          
          break;
      }
    });
    
    checkCurrentUser();

    return () => {
      
      hubListenerCancel();
    };
  }, [checkCurrentUser, clearAuth]); // useEffect için bağımlılıklar

  // Kimlik doğrulama devam ederken bir yükleme göstergesi render et
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return <AppNavigator />;
};

/**
 * App Component
 * Uygulamanın kök bileşeni.
 * AuthProvider'ı render eder ve AuthAwareAppContent'i içine yerleştirir.
 */
const App: React.FC = () => {
  return (
    <AuthProvider>
      {/* AuthAwareAppContent, AuthProvider'ın çocuğu olduğu için useAuth hook'unu güvenle kullanabilir */}
      <AuthAwareAppContent />
    </AuthProvider>
  );
};

// Yükleme kapsayıcısı için stiller
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});

export default App;
