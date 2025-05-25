import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AuthScreen from '../screens/AuthScreen';
import Home from '../screens/Home'; // HomeScreen yerine Home
import { AuthStackParamList, AppStackParamList, RootStackParamList } from './types';
import { useAuth } from '../screens/AuthScreen';

const AuthStack = createStackNavigator<AuthStackParamList>();
const AppStack = createStackNavigator<AppStackParamList>();
const RootStack = createStackNavigator<RootStackParamList>();

const AuthStackScreen: React.FC = () => {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={AuthScreen} />
    </AuthStack.Navigator>
  );
};

const AppStackScreen: React.FC = () => {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="Home" component={Home} />
    </AppStack.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const { user } = useAuth();

  return (
    <NavigationContainer>
      <RootStack.Navigator
        initialRouteName="App"
        screenOptions={{ headerShown: false }}
      >
        <RootStack.Screen name="App" component={AppStackScreen} />
        <RootStack.Screen name="Auth" component={AuthStackScreen} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;