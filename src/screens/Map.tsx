import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';

const Page1: React.FC = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const getLocation = async () => {
    setLoading(true);
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setErrorMsg('Konum izni reddedildi!');
      setLocation(null);
      setLoading(false);
      return;
    }

    try {
      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
      setErrorMsg(null);
    } catch (error) {
      setErrorMsg('Konum alınırken hata oluştu');
      setLocation(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getLocation();
  }, []);

  return (
    <View style={[styles.page, { backgroundColor: '#ffadad' }]}>
      {loading ? (
        <ActivityIndicator size="large" color="#000" />
      ) : errorMsg ? (
        <Text style={styles.text}>{errorMsg}</Text>
      ) : location ? (
        <Text style={styles.text}>
          Enlem: {location.coords.latitude.toFixed(6)}{'\n'}
          Boylam: {location.coords.longitude.toFixed(6)}
        </Text>
      ) : (
        <Text style={styles.text}>Konum alınamadı</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 24, textAlign: 'center' },
});

export default Page1;
