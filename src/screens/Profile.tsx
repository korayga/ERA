import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

const Page1 = () => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setMessage('Mikrofon izni verilmedi!');
      }
    })();
  }, []);

  const recordingOptions = {
    android: {
      extension: '.wav',
      outputFormat: 2, // MPEG_4
      audioEncoder: 3, // AAC
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
    },
    ios: {
      extension: '.caf',
      audioQuality: 96, // HIGH
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {
      mimeType: 'audio/webm',
      bitsPerSecond: 128000,
    },
  };

  const startRecording = async () => {
    try {
      setMessage('Kayıt başlıyor...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(recordingOptions);
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

      if (uri) {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        console.log('Base64:', base64.slice(0, 300) + '...');
      }
    } catch (error) {
      console.error('Kayıt durdurulamadı', error);
      setMessage('Kayıt durdurulamadı');
    }
  };

  return (
    <View style={styles.page}>
      <Button
        title={recording ? 'Kaydı Durdur' : 'Kayıt Başlat'}
        onPress={recording ? stopRecording : startRecording}
      />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 18, marginTop: 20, textAlign: 'center' },
});

export default Page1;
