import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FormWadah from '../components/FormWadah';
import Input from '../components/Input';
import Tombol from '../components/Tombol';
import { useAuth } from '../context/AuthContext';
import { BAYANGAN, RADIUS, WARNA } from '../theme';

export default function LoginScreen() {
  const { masuk } = useAuth();
  const fokus = useIsFocused();
  const insets = useSafeAreaInsets();
  const [peran, setPeran] = useState('siswa');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [galat, setGalat] = useState('');
  const [memuat, setMemuat] = useState(false);

  const gantiPeran = (p) => {
    setPeran(p);
    setGalat('');
  };

  const prosesMasuk = async () => {
    setGalat('');
    setMemuat(true);
    try {
      await masuk(peran, username, password);
    } catch (e) {
      setGalat(e.message || 'Gagal masuk. Coba lagi.');
      setMemuat(false);
    }
  };

  return (
    <FormWadah edges={['left', 'right', 'bottom']} tanpaPadding>
      {fokus && <StatusBar style="light" />}

      {/* Bagian atas berwarna */}
      <View style={[gaya.hero, { paddingTop: insets.top + 20 }]}>
        
        <Image
          source={require('../../assets/icon.png')}
          style={gaya.logoGambar}
          resizeMode="contain"/>
        <Text style={gaya.judul}>Evaluasi Belajar</Text>
        <Text style={gaya.subjudul}>Belajar, kerjakan, dan raih nilai terbaikmu</Text>
      </View>

      {/* Kartu formulir yang menumpuk di atas banner */}
      <View style={gaya.kartu}>
        <View style={gaya.pilihPeran}>
          {[
            { kunci: 'siswa', label: '🧑‍🎓  Siswa' },
            { kunci: 'admin', label: '	👽  Admin' },
          ].map((p) => (
            <TouchableOpacity
              key={p.kunci}
              style={[gaya.tabPeran, peran === p.kunci && gaya.tabPeranAktif]}
              onPress={() => gantiPeran(p.kunci)}
            >
              <Text style={[gaya.teksPeran, peran === p.kunci && gaya.teksPeranAktif]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="Username"
          value={username}
          onChangeText={setUsername}
          placeholder={peran === 'siswa' ? 'Tulis username Anda' : 'Username admin'}
          returnKeyType="next"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          rahasia
          returnKeyType="done"
          onSubmitEditing={prosesMasuk}
        />

        {!!galat && (
          <View style={gaya.kotakGalat}>
            <Text style={gaya.teksGalat}>{galat}</Text>
          </View>
        )}

        <Tombol judul="Masuk" onPress={prosesMasuk} memuat={memuat} style={{ marginTop: 6 }} />

        <Text style={gaya.catatan}>
          {peran === 'siswa'
            ? 'Username dan password sudah disiapkan oleh admin. Hubungi admin jika belum punya.'
            : 'Khusus pengelola ujian.'}
        </Text>
      </View>
    </FormWadah>
  );
}

const gaya = StyleSheet.create({
  hero: {
    backgroundColor: WARNA.utama,
    alignItems: 'center',
    paddingBottom: 70,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
    emoji: { fontSize: 42 },
    logoGambar: { width: 190, height: 190, marginBottom: -10 },

  logo: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emoji: { fontSize: 42 },
  judul: { fontSize: 32, fontWeight: '800', color: WARNA.putih },
  subjudul: { fontSize: 14, color: '#E0E7FF', marginTop: 6, textAlign: 'center' },
  kartu: {
    backgroundColor: WARNA.putih,
    borderRadius: RADIUS.lg,
    padding: 20,
    marginHorizontal: 20,
    marginTop: -44,
    ...BAYANGAN,
    shadowOpacity: 0.14,
  },
  pilihPeran: {
    flexDirection: 'row',
    backgroundColor: WARNA.terang,
    borderRadius: RADIUS.md,
    padding: 4,
    marginBottom: 20,
  },
  tabPeran: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: RADIUS.sm + 2 },
  tabPeranAktif: { backgroundColor: WARNA.utama },
  teksPeran: { fontWeight: '700', color: WARNA.utama },
  teksPeranAktif: { color: WARNA.putih },
  kotakGalat: { backgroundColor: WARNA.salahLatar, borderRadius: RADIUS.sm, padding: 10, marginBottom: 6 },
  teksGalat: { color: WARNA.salah, fontSize: 14 },
  catatan: { marginTop: 18, fontSize: 12, color: WARNA.abu, lineHeight: 18, textAlign: 'center' },
});
