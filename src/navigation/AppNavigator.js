import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { WARNA } from '../theme';

import LoginScreen from '../screens/LoginScreen';
import SiswaBerandaScreen from '../screens/SiswaBerandaScreen';
import SiswaFolderScreen from '../screens/SiswaFolderScreen';
import UjianScreen from '../screens/UjianScreen';
import HasilScreen from '../screens/HasilScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import KelolaKelasScreen from '../screens/admin/KelolaKelasScreen';
import KelolaBabScreen from '../screens/admin/KelolaBabScreen';
import FormBabScreen from '../screens/admin/FormBabScreen';
import KelolaSoalScreen from '../screens/admin/KelolaSoalScreen';
import ImporSoalScreen from '../screens/admin/ImporSoalScreen';
import FormSoalScreen from '../screens/admin/FormSoalScreen';
import KelolaSiswaScreen from '../screens/admin/KelolaSiswaScreen';
import FormSiswaScreen from '../screens/admin/FormSiswaScreen';
import RekapNilaiScreen from '../screens/admin/RekapNilaiScreen';
import RekapMapelScreen from '../screens/admin/RekapMapelScreen';
import PengaturanScreen from '../screens/admin/PengaturanScreen';

const Stack = createNativeStackNavigator();

const tema = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: WARNA.latar, primary: WARNA.utama },
};

const opsiHeader = {
  headerStyle: { backgroundColor: WARNA.putih },
  headerTintColor: WARNA.utamaGelap,
  headerTitleStyle: { fontWeight: '700' },
  headerBackTitle: 'Kembali',
  contentStyle: { backgroundColor: WARNA.latar },
};

export default function AppNavigator() {
  const { pengguna, memuat } = useAuth();

  if (memuat) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: WARNA.latar }}>
        <ActivityIndicator size="large" color={WARNA.utama} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={tema}>
      <Stack.Navigator screenOptions={opsiHeader}>
        {!pengguna ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : pengguna.peran === 'admin' ? (
          <>
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ headerShown: false }} />
            <Stack.Screen name="KelolaKelas" component={KelolaKelasScreen} options={{ title: 'Kelola Kelas' }} />
            <Stack.Screen
              name="KelolaBab"
              component={KelolaBabScreen}
              options={({ route }) => ({ title: route.params?.indukId ? 'Sub-bab' : 'Kelola Bab & Soal' })}
            />
            <Stack.Screen
              name="FormBab"
              component={FormBabScreen}
              options={({ route }) => {
                const sub = !!route.params?.indukId;
                return { title: route.params?.babId ? (sub ? 'Ubah Sub-bab' : 'Ubah Bab') : sub ? 'Tambah Sub-bab' : 'Tambah Bab' };
              }}
            />
            <Stack.Screen name="KelolaSoal" component={KelolaSoalScreen} options={{ title: 'Soal dalam Sub-bab' }} />
            <Stack.Screen name="ImporSoal" component={ImporSoalScreen} options={{ title: 'Upload Soal dari Excel' }} />
            <Stack.Screen
              name="FormSoal"
              component={FormSoalScreen}
              options={({ route }) => ({ title: route.params?.soalId ? 'Ubah Soal' : 'Tambah Soal' })}
            />
            <Stack.Screen name="KelolaSiswa" component={KelolaSiswaScreen} options={{ title: 'Kelola Siswa' }} />
            <Stack.Screen
              name="FormSiswa"
              component={FormSiswaScreen}
              options={({ route }) => ({ title: route.params?.siswaId ? 'Ubah Siswa' : 'Tambah Siswa' })}
            />
            <Stack.Screen name="RekapNilai" component={RekapNilaiScreen} options={{ title: 'Rekap Nilai' }} />
            <Stack.Screen
              name="RekapMapel"
              component={RekapMapelScreen}
              options={({ route }) => ({ title: route.params?.mapelNama ? `Nilai ${route.params.mapelNama}` : 'Nilai' })}
            />
            <Stack.Screen name="Pengaturan" component={PengaturanScreen} options={{ title: 'Pengaturan Ujian' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="BerandaSiswa" component={SiswaBerandaScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="FolderSiswa"
              component={SiswaFolderScreen}
              options={({ route }) => ({ title: route.params?.mapelNama || 'Mata Pelajaran' })}
            />
            <Stack.Screen
              name="Ujian"
              component={UjianScreen}
              options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }}
            />
            <Stack.Screen
              name="Hasil"
              component={HasilScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
