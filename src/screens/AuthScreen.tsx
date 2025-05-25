// src/screens/AuthScreen.tsx
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { View, TextInput, Text, Alert, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { signUp, signIn, confirmSignUp, resendSignUpCode, fetchAuthSession, signOut } from 'aws-amplify/auth'; // signOut'ı ekledik
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { TokenManager } from '../../types/TokenManager';

type AuthScreenNavigationProp = StackNavigationProp<RootStackParamList>;

interface AuthScreenProps {
  navigation: AuthScreenNavigationProp;
}

// AuthContext'in tipini tanımlayın
interface AuthContextType {
  accessToken: string | null;
  idToken: string | null;
  user: any | null;
  setTokens: (accessToken: string, idToken: string) => void;
  setUser: (user: any) => void;
  clearAuth: () => void; // clearAuth metodunu buraya ekliyoruz
}

// AuthContext'i oluşturun, varsayılan değerler null veya boş fonksiyonlar
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider bileşeni, kimlik doğrulama durumunu yönetir ve AuthContext aracılığıyla sağlar.
 * @param {object} props - Bileşen özellikleri.
 * @param {ReactNode} props.children - Sağlayıcının alt bileşenleri.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [user, setUserState] = useState<any | null>(null); // setUser'ın çakışmaması için setUserState olarak değiştirdik

  // Kullanıcı ve belirteçleri ayarlamak için fonksiyon
  const setTokens = useCallback((newAccessToken: string, newIdToken: string) => {
    setAccessToken(newAccessToken);
    setIdToken(newIdToken);
    // TokenManager'ı burada da güncelleyebilirsiniz, ancak App.tsx'te zaten yapılıyor.
    // TokenManager.setIdToken(newIdToken); // App.tsx'te zaten yapıldığı için burada yorum satırı yaptık
  }, []);

  // Kullanıcı bilgisini ayarlamak için fonksiyon
  const setUser = useCallback((userData: any) => {
    setUserState(userData);
  }, []);

  // Kimlik doğrulama durumunu temizlemek için fonksiyon
  const clearAuth = useCallback(() => {
    setUserState(null);
    setAccessToken(null);
    setIdToken(null);
    TokenManager.setIdToken(null); // TokenManager'ı da temizle
  }, []);

  // Bağlam değerini oluşturun
  const contextValue = {
    accessToken,
    idToken,
    user,
    setTokens,
    setUser,
    clearAuth, // clearAuth'ı bağlam değerine dahil edin
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * useAuth hook'u, AuthContext'e erişim sağlar.
 * Bileşenlerin kimlik doğrulama durumuna ve fonksiyonlarına kolayca erişmesini sağlar.
 * @returns {AuthContextType} Kimlik doğrulama bağlamı değerleri.
 * @throws {Error} AuthProvider içinde kullanılmadığında hata fırlatır.
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) { // !context yerine undefined kontrolü daha güvenlidir
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthScreen: React.FC<AuthScreenProps> = ({ navigation }) => {
  // AuthContext'ten gerekli değerleri ve fonksiyonları alıyoruz
  const { setTokens, setUser, idToken, user } = useAuth(); // idToken ve user'ı da buradan alıyoruz

  // AuthScreen'in kendi yerel state'leri
  // Artık AuthContext'ten gelen user state'ini kullanacağımız için
  // buradaki 'user' state'ini 'setUserState' olarak değiştirmeye gerek kalmadı,
  // ancak karışıklığı önlemek için 'user' yerine 'localUserState' gibi bir isim verebiliriz
  // veya AuthContext'ten gelen 'user'ı kullanabiliriz.
  // Burada 'user' state'i yerine 'setUserState' kullanılmıştı, onu kaldırıp
  // AuthContext'ten gelen 'user'ı kullanacağız.
  // const [user, setUserState] = useState<any | null>(null); // Bu satırı kaldırdık

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [confirmationCode, setConfirmationCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [showSignUp, setShowSignUp] = useState<boolean>(false);
  const [lastRegisteredUsername, setLastRegisteredUsername] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // AuthContext'ten gelen clearAuth'ı kullanıyoruz, yerel tanımı kaldırıldı
  // const clearAuth = useCallback(() => { ... }, []); // Bu satır kaldırıldı

  const handleSignUp = async () => {
    if (!email || !password || !username) {
      Alert.alert('Hata', 'E-posta, şifre ve kullanıcı adı boş bırakılamaz.');
      return;
    }

    setLoading(true);

    try {
      const output = await signUp({
        username: username.toLowerCase().trim(),
        password,
        options: {
          userAttributes: {
            email: email.toLowerCase().trim(),
            nickname: username.trim(),
          },
        },
      });

      setLastRegisteredUsername(username.toLowerCase().trim());
      if (output.nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        setShowConfirmation(true);
        setShowSignUp(false);
        Alert.alert('Doğrulama Gerekli', 'E-postanıza doğrulama kodu gönderildi. Spam/junk klasörünü kontrol etmeyi unutmayın.');
      } else if (output.isSignUpComplete) {
        Alert.alert('Başarılı', 'Kayıt tamamlandı!');
      }
    } catch (error: any) {
      let errorMessage = 'Kayıt sırasında bir hata oluştu.';
      if (error.name === 'UsernameExistsException') {
        errorMessage = 'Bu kullanıcı adı zaten kullanılıyor. Farklı bir kullanıcı adı deneyin.';
      } else if (error.name === 'InvalidParameterException') {
        errorMessage = 'Lütfen tüm alanları doğru doldurun.';
      }
      Alert.alert('Kayıt Hatası', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSignUp = async () => {
    if (!lastRegisteredUsername || !confirmationCode) {
      Alert.alert('Hata', 'Doğrulama kodu gerekli.');
      return;
    }

    setLoading(true);
    try {
      await confirmSignUp({
        username: lastRegisteredUsername,
        confirmationCode: confirmationCode.trim(),
      });

      Alert.alert('Başarılı', 'Hesap doğrulandı! Şimdi giriş yapabilirsiniz.');
      setShowConfirmation(false);
      setConfirmationCode('');
    } catch (error: any) {
      Alert.alert('Doğrulama Hatası', 'Geçersiz veya yanlış doğrulama kodu.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!lastRegisteredUsername) {
      Alert.alert('Hata', 'Kullanıcı adı gerekli.');
      return;
    }

    setLoading(true);
    try {
      await resendSignUpCode({ username: lastRegisteredUsername });
      Alert.alert('Başarılı', 'Doğrulama kodu tekrar gönderildi. Spam/junk klasörünü kontrol edin.');
    } catch (error: any) {
      Alert.alert('Hata', 'Doğrulama kodu gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!username || !password) {
      Alert.alert('Hata', 'Kullanıcı adı/e-posta ve şifre gerekli.');
      return;
    }

    setLoading(true);

    try {
      const cleanUsername = username.toLowerCase().trim();
      const cleanPassword = password.trim();

      const output = await signIn({
        username: cleanUsername,
        password: cleanPassword,
        options: {
          authFlowType: 'USER_PASSWORD_AUTH',
        },
      });

      if (output.isSignedIn) {
        const session = await fetchAuthSession();
        const accessToken = session.tokens?.accessToken?.toString();
        const idToken = session.tokens?.idToken?.toString();

        if (accessToken && idToken) {
          setTokens(accessToken, idToken);
          setUser({ username: cleanUsername });
          navigation.navigate('App', { screen: 'Home' });
          Alert.alert('Başarılı', 'Giriş yapıldı! Hoş geldiniz!');
        } else {
          Alert.alert('Hata', 'Token alınamadı. Lütfen tekrar deneyin.');
        }
      } else if (output.nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
        setLastRegisteredUsername(cleanUsername);
        setShowConfirmation(true);
        Alert.alert('Doğrulama Gerekli', 'Önce hesabınızı e-posta ile doğrulayın. Spam/junk klasörünü kontrol edin.');
      } else {
        Alert.alert('Hata', 'Giriş yapılamadı. Lütfen tekrar deneyin.');
      }
    } catch (error: any) {
      let userMessage = 'Giriş yapılamadı.';

      switch (error?.name) {
        case 'UserNotConfirmedException':
          userMessage = 'Hesabınız doğrulanmamış. E-postanıza gönderilen kodu girin.';
          setLastRegisteredUsername(username.toLowerCase().trim());
          setShowConfirmation(true);
          break;
        case 'NotAuthorizedException':
          userMessage = 'Kullanıcı adı/e-posta veya şifre yanlış.';
          break;
        case 'UserNotFoundException':
          userMessage = 'Bu kullanıcı adı/e-posta ile hesap bulunamadı.';
          break;
        case 'TooManyRequestsException':
          userMessage = 'Çok fazla deneme yaptınız. Lütfen biraz bekleyin.';
          break;
        case 'UserAlreadyAuthenticatedException':
          userMessage = 'Kullanıcı zaten oturum açmış.';
          const session = await fetchAuthSession();
          const accessToken = session.tokens?.accessToken?.toString();
          const idToken = session.tokens?.idToken?.toString();
          if (accessToken && idToken) {
            setTokens(accessToken, idToken);
            setUser({ username: username.toLowerCase().trim() });
            navigation.navigate('App', { screen: 'Home' });
          }
          break;
        default:
          userMessage = 'Giriş yapılamadı. Lütfen tekrar deneyin: ' + error;
      }

      Alert.alert('Giriş Hatası', userMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {showConfirmation ? (
        // Hesap Doğrulama Ekranı
        <>
          <View style={styles.header}>
            <Text style={styles.title}>Hesap Doğrulama</Text>
          </View>
          <Text style={styles.emailText}>Kullanıcı Adı: {lastRegisteredUsername}</Text>
          <Text style={styles.infoText}>E-postanıza gönderilen 6 haneli kodu girin:</Text>
          <TextInput
            placeholder="Doğrulama Kodu (6 haneli)"
            value={confirmationCode}
            onChangeText={setConfirmationCode}
            style={styles.input}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TouchableOpacity
            style={[styles.button, styles.confirmButton]}
            onPress={handleConfirmSignUp}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Doğrulanıyor..." : "Doğrula"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleResendCode} disabled={loading}>
            <Text style={styles.link}>Kodu Tekrar Gönder</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setShowConfirmation(false);
              setConfirmationCode('');
            }}
          >
            <Text style={styles.link}>Geri Dön</Text>
          </TouchableOpacity>
        </>
      ) : showSignUp ? (
        // Hesap Oluşturma Ekranı
        <>
          <View style={styles.header}>
            <Text style={styles.title}>Hesap Oluştur</Text>
          </View>
          <Text style={styles.infoText}>Lütfen bilgilerinizi giriniz.</Text>
          <TextInput
            placeholder="Emailiniz"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            placeholder="Kullanıcı Adı"
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.passwordContainer}>
            <TextInput
              placeholder="Şifre"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              style={[styles.input, styles.passwordInput]}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text>{showPassword ? "🙈" : "👁️"}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.button, styles.signUpButton]}
            onPress={handleSignUp}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Kayıt..." : "Kaydet ve Devam Et"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setShowSignUp(false);
              setEmail('');
              setUsername('');
              setPassword('');
            }}
          >
            <Text style={styles.link}>Back to Login</Text>
          </TouchableOpacity>
        </>
      ) : (
        // Giriş Ekranı
        <>
          <View style={styles.header}>
            <Text style={styles.title}>Deprem Yardım Sistemi</Text>
          </View>
          <Text style={styles.infoText}>Deprem sistem giriş sayfası.</Text>
          <TextInput
            placeholder="Kullanınıc Adı ya da Email"
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.passwordContainer}>
            <TextInput
              placeholder="Şifre"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              style={[styles.input, styles.passwordInput]}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text>{showPassword ? "🙈" : "👁️"}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              onPress={() => setRememberMe(!rememberMe)}
              style={styles.checkbox}
            >
              <Text>{rememberMe ? "✅" : "⬜"}</Text>
            </TouchableOpacity>
            <Text style={styles.checkboxText}>Beni Hatırla</Text>
          </View>
          <TouchableOpacity
            style={[styles.button, styles.loginButton]}
            onPress={handleSignIn}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Giriş..." : "Login Account"}
            </Text>
          </TouchableOpacity>
          <View style={styles.linksContainer}>
            <TouchableOpacity onPress={() => Alert.alert('Info', 'Şifre sıfırlama özelliği yakında eklenecek.')}>
              <Text style={styles.link}>Şifremi unuttum?</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowSignUp(true)}>
              <Text style={styles.link}>Kayıt Ol</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingVertical: 20,
    marginBottom: 20,
    borderRadius: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#FFFFFF',
  },
  infoText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
  },
  emailText: {
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: '600',
    color: '#333333',
  },
  input: {
    height: 50,
    borderBottomWidth: 1,
    borderColor: '#007AFF',
    paddingHorizontal: 10,
    marginBottom: 20,
    fontSize: 16,
    color: '#333333',
  },
  passwordContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeIcon: {
    position: 'absolute',
    right: 10,
    top: 15,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    marginRight: 10,
  },
  checkboxText: {
    fontSize: 14,
    color: '#666666',
  },
  button: {
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 15,
  },
  loginButton: {
    backgroundColor: '#007AFF',
  },
  signUpButton: {
    backgroundColor: '#339CFF',
  },
  confirmButton: {
    backgroundColor: '#339CFF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  linksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  link: {
    fontSize: 14,
    color: '#005BB5',
    fontWeight: '600',
  },
});

export default AuthScreen;
