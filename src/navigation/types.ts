// my-deprem-yardim-app/navigation/types.ts
import { NavigatorScreenParams } from '@react-navigation/native';

// Kimlik Doğrulama (Auth) Stack'i için ekranlar ve parametreleri
export type AuthStackParamList = {
  Login: undefined; // Login ekranı parametresiz
  // Home ekranı artık parametre almıyor çünkü token'lar AuthContext'ten geliyor
};

// Uygulama (App) Stack'i için ekranlar ve parametreleri (Giriş sonrası)
export type AppStackParamList = {
  Home: undefined; // 'Home' ekranı parametre almıyor
  Profile: { userId: string }; // 'Profile' ekranı userId parametresi alıyor (örnek)
};

// Ana Root Stack'i
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<AppStackParamList>;
};

// React Navigation'ın global typelerini genişletiyoruz
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}