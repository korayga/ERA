import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, Modal, FlatList, Button } from 'react-native';
import MapView, { Marker, UrlTile, LongPressEvent } from 'react-native-maps';
import { Point, PointType } from '../../types/Point';
import { typeOptions, fetchPoints as fetchPointsFromApi, createPoint as createPointApi, getPinColor } from '../func/fetch';
import uuid from 'react-native-uuid';
import { Coordinate } from '../../types/Coordinate';
import { useDebounce } from '../hooks/useDebounce';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location';
import { sendVoice } from '../func/fetch';
import { useAuth } from './AuthScreen';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { TokenManager } from '../../types/TokenManager';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const getMapBoundaries = (region: {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}) => {
  const north = region.latitude + region.latitudeDelta / 2;
  const south = region.latitude - region.latitudeDelta / 2;
  const east = region.longitude + region.longitudeDelta / 2;
  const west = region.longitude - region.longitudeDelta / 2;

  return {
    northEast: { latitude: north, longitude: east },
    southWest: { latitude: south, longitude: west },
  };
};

const getRadius = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  let radius = Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2)) * 10;
  radius = 2 * Math.log(4 * radius)
  radius = Math.ceil(radius);
  if (radius >= 6) {
    return 5;
  }
  return radius;
};


const Home: React.FC = () => {
  const { accessToken, idToken, user } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  // Token'ları değişkenlere atıyoruz
  const accessTokenValue = accessToken || null;
  const idTokenValue = idToken || null;
  TokenManager.setIdToken(idTokenValue);

  // Örnek: Token'ları başka bir fonksiyonda kullanma
  const useTokensInApiCall = async () => {
    if (accessTokenValue && idTokenValue) {
      try {
        console.log('API çağrısı için kullanılan token\'lar:');
        console.log('Access Token:', accessTokenValue);
        console.log('ID Token:', idTokenValue);
      } catch (error) {
        console.error('API çağrısı hatası:', error);
      }
    } else {
      console.log('Token\'lar eksik, API çağrısı yapılamadı.');
    }
  };

  // Token'ları kontrol eden useEffect
  useEffect(() => {
    if (accessTokenValue && idTokenValue) {
      console.log('Token\'lar alındı:', { accessTokenValue, idTokenValue });
      // useTokensInApiCall(); // İsterseniz burada çağırabilirsiniz
    }
  }, [accessTokenValue, idTokenValue]);

  const initialRegion = {
    latitude: 41.0082,
    longitude: 28.9784,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  const getPrettyTypeName = (type: PointType | string, description: string): string => {
    switch (type) {
      case 'gida':
        return 'Yiyecek Desteği Noktası';
      case 'barinma':
        return 'Barınma Desteği Noktası';
      case 'tibbi_yardim':
        return 'Tıbbi Yardım Noktası';
      case 'yikim':
        return 'Yıkılmış Bina';
      case 'insan':
        return 'Göçük Altında Kişi';
      case 'diger':
        return description || 'Diğer';
      default:
        return description || 'Bilinmeyen Tip';
    }
  };

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number }>({"latitude": 41.0082,"longitude": 28.9784});

  useEffect(() => {
    (async () => {
      const audioPerm = await Audio.requestPermissionsAsync();
      const locationPerm = await Location.requestForegroundPermissionsAsync();
      if (audioPerm.status !== 'granted') {
        setMessage('Mikrofon izni verilmedi!');
      }
      if (locationPerm.status !== 'granted') {
        setMessage('Konum izni verilmedi!');
      }
    })();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch (error) {
      console.error('Konum alınamadı', error);
      setMessage('Konum alınamadı');
    }
  };

  const startRecording = async () => {
    try {
      setMessage('Kayıt başlıyor...');
      await getCurrentLocation();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setMessage('Kayıt başladı');
    } catch (err) {
      console.error('Kayıt başlatılamadı', err);
      setMessage('Kayıt başlatılamadı');
    }
  };

  const stopRecording = async () => {
    try {
      setMessage('Kayıt durduruluyor...');
      if (!recording) return;

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setMessage('Kayıt tamamlandı.');

      if (uri && location ) {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        console.log('Base64:', base64.slice(0, 300) + '...');
        const response = await sendVoice(base64, location.latitude, location.longitude);
        console.log('Ses gönderildi:', response);
      } else {
        setMessage('Konum, ses verisi veya token eksik');
      }
    } catch (error) {
      console.error('Kayıt durdurulamadı', error);
      setMessage('Kayıt durdurulamadı');
    }
  };

  const [points, setPoints] = useState<Point[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newCoord, setNewCoord] = useState({ latitude: 0, longitude: 0 });
  const [selectedType, setSelectedType] = useState<PointType>(PointType.diger);
  const [description, setDescription] = useState('');
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);
  const [infoModalVisible, setInfoModalVisible] = useState(false);

  const fetchPoints = async (region: Coordinate, radius: number) => {
    try {
      const loadedPoints = await fetchPointsFromApi(region, radius);
      setPoints(loadedPoints);
    } catch (err) {
      console.error('fetchPoints hata:', err);
    }
  };

  const debouncedFetchPoints = useDebounce((region: Coordinate, radius: number) => {
    fetchPoints(region, radius);
  }, 1000);

  const handleLongPress = (event: LongPressEvent) => {
    const { coordinate } = event.nativeEvent;
    setNewCoord(coordinate);
    setModalVisible(true);
  };

  const handleSavePoint = async () => {
    const newPoint = new Point(
      uuid.v4(),
      newCoord,
      description,
      selectedType
    );

    try {
      await createPointApi(
        {
          coordinate: newCoord,
          type: selectedType,
          description,
        },
      );

      setPoints([...points, newPoint]);
      setModalVisible(false);
      setDescription('');
      setSelectedType(PointType.diger);
    } catch (error) {
      console.error('Error creating point:', error);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={{
          position: 'absolute',
          top: '5%',
          right: '3%',
          alignSelf: 'flex-end',
          backgroundColor: 'green',
          padding: 12,
          borderRadius: 8,
          zIndex: 10,
        }}
        onPress={() => navigation.navigate('Auth', { screen: 'Login' })}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Giriş Yap</Text>
      </TouchableOpacity>
      <MapView
        style={{ width: '100%', height: '100%', }}
        initialRegion={{latitude: location?.latitude,longitude: location?.longitude,"latitudeDelta" : 2,"longitudeDelta" : 2}}
        onLongPress={handleLongPress}
        onRegionChangeComplete={(region) => {
          const bounds = getMapBoundaries(region);
          const radius = getRadius(
            region.latitude,
            region.longitude,
            bounds.northEast.latitude,
            bounds.northEast.longitude
          );
          debouncedFetchPoints({ latitude: region.latitude, longitude: region.longitude }, radius);
        }}
      >
        <UrlTile
          urlTemplate="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
        />
        {points.map((point) => (
          <Marker
            key={`${point.id},${point.sk}`}
            coordinate={point.coordinate}
            pinColor={getPinColor(point.type)}
            onPress={() => {
              setSelectedPoint(point);
              setInfoModalVisible(true);
            }}
          />
        ))}
      </MapView>      
      <View style={styles.recordingContainer}>
        <TouchableOpacity
          style={styles.recordButton}
          onPress={recording ? stopRecording : startRecording}
        >
          <Text style={styles.recordButtonText}>{recording ? 'Kaydı Durdur' : 'SOS'}</Text>
        </TouchableOpacity>
        {recording && message ? (
          <Text style={styles.text}>{message}</Text>
        ) : null}
      </View>
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nokta Bilgileri</Text>
            <Text style={styles.label}>Açıklama</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Kısa açıklama gir"
              placeholderTextColor="#888"
            />
            <Text style={styles.label}>Tip Seç</Text>
            <FlatList
            data={typeOptions}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => {
              const isSelected = selectedType === item.value;
              const backgroundColor = isSelected
                ? getPinColor(item.value)
                : '#f0f0f0';

              const textColor = isSelected ? '#fff' : '#000';

              return (
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    { backgroundColor },
                  ]}
                  onPress={() => setSelectedType(item.value)}
                >
                  <Text style={{ color: textColor }}>{item.label}</Text>
                </TouchableOpacity>
              );
            }}
          />

            <TouchableOpacity style={styles.saveButton} onPress={handleSavePoint}>
              <Text style={styles.saveButtonText}>Kaydet</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeIcon}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeIconText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={infoModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nokta Bilgisi</Text>
            <Text style={styles.label}>Açıklama:</Text>
            <Text>{selectedPoint?.description}</Text>
            <Text style={styles.label}>Tip:</Text>
            <Text>
              {getPrettyTypeName(selectedPoint?.type ?? 'diger', selectedPoint?.description ?? '')}
            </Text>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: '#dc3545' }]}
              onPress={() => setInfoModalVisible(false)}
            >
              <Text style={styles.saveButtonText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#000' 
  },
  map: { 
    width: '100%', 
    height: '100%' 
  },
  recordingContainer: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: '#ff0000',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  recordButton: {
    padding: 10,
    borderRadius: 5,
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeIcon: {
    position: 'absolute',
    top: 10,
    right: 15,
    zIndex: 1,
    padding: 5,
  },
  closeIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  text: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
  label: {
    marginTop: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#000',
    padding: 8,
    marginTop: 5,
    borderRadius: 6,
    backgroundColor: '#fff',
    color: '#000',
  },
  typeOption: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    marginVertical: 4,
    borderRadius: 5,
  },
  selectedType: {
    backgroundColor: '#000',
  },
  saveButton: {
    backgroundColor: '#000',
    padding: 12,
    marginTop: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default Home;