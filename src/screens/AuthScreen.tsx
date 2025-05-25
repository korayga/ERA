import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { View, TextInput, Button, Text, Alert, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { signUp, signIn, confirmSignUp, resendSignUpCode, fetchAuthSession } from 'aws-amplify/auth';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types'; // RootStackParamList kullanıyoruz

type AuthScreenNavigationProp = StackNavigationProp<RootStackParamList>;

interface AuthScreenProps {
  navigation: AuthScreenNavigationProp;
}

interface AuthContextType {
  accessToken: string | null;
  idToken: string | null;
  user: any | null;
  setTokens: (accessToken: string, idToken: string) => void;
  setUser: (user: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);

  const setTokens = (newAccessToken: string, newIdToken: string) => {
    setAccessToken(newAccessToken);
    setIdToken(newIdToken);
  };

  return (
    <AuthContext.Provider value={{ accessToken, idToken, user, setTokens, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthScreen: React.FC<AuthScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [confirmationCode, setConfirmationCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [showSignUp, setShowSignUp] = useState<boolean>(false);
  const [lastRegisteredUsername, setLastRegisteredUsername] = useState<string>('');

  const { setTokens, setUser, user } = useAuth();

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

  if (showConfirmation) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Hesap Doğrulama</Text>
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
        <Button
          title={loading ? "Doğrulanıyor..." : "Doğrula"}
          onPress={handleConfirmSignUp}
          disabled={loading}
        />
        <View style={{ height: 10 }} />
        <Button
          title="Kodu Tekrar Gönder"
          onPress={handleResendCode}
          disabled={loading}
        />
        <View style={{ height: 10 }} />
        <Button
          title="Geri Dön"
          onPress={() => {
            setShowConfirmation(false);
            setConfirmationCode('');
          }}
        />
      </ScrollView>
    );
  }

  if (showSignUp) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Kayıt Ol</Text>
        <TextInput
          placeholder="E-posta"
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
        <TextInput
          placeholder="Şifre"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          autoCapitalize="none"
        />
        <Button
          title={loading ? "Kayıt..." : "Kayıt Ol"}
          onPress={handleSignUp}
          disabled={loading}
        />
        <View style={{ height: 10 }} />
        <Button
          title="Geri Dön"
          onPress={() => {
            setShowSignUp(false);
            setEmail('');
            setUsername('');
            setPassword('');
          }}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Deprem Yardım - Giriş</Text>
      <TextInput
        placeholder="Kullanıcı Adı veya E-posta"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextInput
        placeholder="Şifre"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        autoCapitalize="none"
      />
      <Button
        title={loading ? "Giriş..." : "Giriş Yap"}
        onPress={handleSignIn}
        disabled={loading}
      />
      <View style={{ height: 10 }} />
      <TouchableOpacity onPress={() => setShowSignUp(true)}>
        <Text style={styles.signUpText}>
          Hesabın yoksa <Text style={styles.signUpLink}>kaydol</Text>
        </Text>
      </TouchableOpacity>
      <Text style={styles.infoText}>
        🔹 Giriş: Kullanıcı Adı/E-posta + Şifre{'\n'}
        🔹 Kayıt: E-posta + Kullanıcı Adı + Şifre
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 15,
    borderRadius: 8,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  emailText: {
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: '600',
    color: '#333',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 16,
  },
  signUpText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  signUpLink: {
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default AuthScreen;