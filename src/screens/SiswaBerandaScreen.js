import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Layar from '../components/Layar';
import Kartu from '../components/Kartu';
import Tombol from '../components/Tombol';
import { useAuth } from '../context/AuthContext';
import dataService from '../services/dataService';
import { konfirmasi } from '../utils/dialog';
import { BAYANGAN, RADIUS, WARNA } from '../theme';

export default function SiswaBerandaScreen({ navigation }) {
  const { pengguna, keluar } = useAuth();
  const fokus = useIsFocused();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState(null);

  // Dimuat ulang setiap beranda dibuka: status kunci bab dan nilai ikut diperbarui
  useFocusEffect(
    useCallback(() => {
      let aktif = true;
      (async () => {
        const [pengaturan, status] = await Promise.all([
          dataService.ambilPengaturan(),
          dataService.ambilStatusBabSiswa(pengguna.id),
        ]);
        if (aktif) setData({ pengaturan, ...status });
      })();
      return () => {
        aktif = false;
      };
    }, [pengguna.id])
  );

  // Selama masih ada bab yang belum dikerjakan, tombol kembali tidak boleh menutup aplikasi
  const semuaSelesai = data ? data.semuaSelesai : false;
  useFocusEffect(
    useCallback(() => {
      const langganan = BackHandler.addEventListener('hardwareBackPress', () => {
        if (!semuaSelesai) {
          Alert.alert('Ujian belum selesai', 'Anda baru bisa keluar setelah semua bab lulus.');
          return true;
        }
        return false;
      });
      return () => langganan.remove();
    }, [semuaSelesai])
  );

  // Keluar selalu kembali ke halaman login
  const keluarAkun = () => {
    konfirmasi('Keluar', 'Anda akan kembali ke halaman login. Lanjutkan?', () => keluar(), 'Keluar');
  };

  if (!data) {
    return (
      <Layar>
        <View style={gaya.tengah}>
          <ActivityIndicator size="large" color={WARNA.utama} />
        </View>
      </Layar>
    );
  }

  const { pengaturan, kelas, daftar, adaBab, mapel, kkm } = data;
  const tampil = daftar.filter((d) => d.status !== 'kosong');
  // Rata-rata = jumlah semua nilai ujian yang pernah dikerjakan / jumlah ujian (pengulangan dihitung sendiri)
  const rata = data.rataNilai;
  const selesai = tampil.filter((d) => d.status === 'lulus').length;
  const persen = tampil.length ? Math.round((selesai / tampil.length) * 100) : 0;
  const inisial = (pengguna.nama || '?').trim().charAt(0).toUpperCase();

  return (
    <Layar edges={['left', 'right', 'bottom']}>
      {fokus && <StatusBar style="light" />}
      <ScrollView contentContainerStyle={gaya.isi} showsVerticalScrollIndicator={false}>
        {/* Banner sapaan */}
        <View style={[gaya.banner, { paddingTop: insets.top + 18 }]}>
          <View style={gaya.barisSapaan}>
            <View style={gaya.avatar}>
              <Text style={gaya.inisial}>{inisial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={gaya.sapaan} numberOfLines={1}>
                Halo, {pengguna.nama} 👋
              </Text>
              <Text style={gaya.subjudul}>
                {kelas ? kelas.nama : 'Kelas belum diatur'} @{pengguna.username}
              </Text>
            </View>
          </View>
          <Text style={gaya.judulUjian}>{pengaturan.judulUjian}</Text>
        </View>

        {/* Ringkasan kemajuan, menumpuk di bawah banner */}
        <View style={gaya.badan}>
          <View style={gaya.ringkasan}>
            <View style={gaya.barisProgres}>
              <Text style={gaya.labelProgres}>Kemajuan belajar </Text>
              <Text style={gaya.persen}>{persen}% </Text>
            </View>
            <View style={gaya.jalur}>
              <View style={[gaya.isiJalur, { width: `${persen}%` }]} />
            </View>
            <View style={gaya.barisInfo}>
              <View style={gaya.info}>
                <Text style={gaya.angka}>
                  {selesai}/{tampil.length}
                </Text>
                <Text style={gaya.labelInfo}>Sub-bab lulus</Text>
              </View>
              <View style={gaya.garisPisah} />
              <View style={gaya.info}>
                <Text style={gaya.angka}>{rata === null ? '-' : rata}</Text>
                <Text style={gaya.labelInfo}>
                  {data.jumlahUjian > 0 ? `Rata-rata ujian` : 'Rata-rata'}
                </Text>
              </View>
              <View style={gaya.garisPisah} />
              <View style={gaya.info}>
                <Text style={gaya.angka}>{pengaturan.kkm}</Text>
                <Text style={gaya.labelInfo}>Nilai lulus</Text>
              </View>
            </View>
          </View>

          {data.semuaSelesai ? (
            <Kartu style={gaya.kartuLulus}>
              <Text style={gaya.judulLulus}>🎉 Semua sub-bab sudah lulus</Text>
              <Text style={gaya.teksLulus}>
                Anda boleh keluar ke halaman login, atau mengerjakan ulang untuk memperbaiki nilai.
              </Text>
            </Kartu>
          ) : (
            <Kartu style={gaya.kartuAturan}>
              <Text style={gaya.judulAturan}>💡 Aturan ujian</Text>
              <Text style={gaya.aturan}>• Buka folder mata pelajaran, lalu kerjakan bab di dalamnya secara berurutan.</Text>
              <Text style={gaya.aturan}>• bab berikutnya terbuka setelah nilai bab sebelumnya mencapai {kkm}. Jika belum, kerjakan ulang.</Text>
              <Text style={gaya.aturan}>• Semua soal harus dijawab agar jawaban bisa dikumpulkan.</Text>
              <Text style={gaya.aturan}>• Tombol kembali dikunci selama ujian berlangsung.</Text>
              <Text style={gaya.aturan}>• Jika waktu habis, jawaban dikumpulkan otomatis walaupun ada soal yang kosong.</Text>
            </Kartu>
          )}

          <Text style={gaya.bagian}>📚 Mata pelajaran</Text>
          {!adaBab && <Text style={gaya.kosong}>Soal untuk kelas Anda belum tersedia. Hubungi admin.</Text>}

          {mapel
            .filter((m) => m.aktif.length > 0)
            .map((m) => {
              const selesaiSemua = m.jumlahLulus === m.aktif.length;
              const giliran = m.aktif.find((d) => d.status === 'terbuka' || d.status === 'ulang');
              const persenFolder = Math.round((m.jumlahLulus / m.aktif.length) * 100);
              return (
                <TouchableOpacity
                  key={m.bab.id}
                  activeOpacity={0.8}
                  style={gaya.kartuFolder}
                  onPress={() => navigation.navigate('FolderSiswa', { mapelId: m.bab.id, mapelNama: m.bab.nama })}
                >
                  <View style={gaya.ikonFolder}>
                    <Text style={{ fontSize: 26 }}>{selesaiSemua ? '✅' : '📁'}</Text>
                  </View>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={gaya.namaFolder} numberOfLines={1}>
                      {m.bab.nama}
                    </Text>
                    <Text style={gaya.detail}>
                      {m.aktif.length} bab · {m.jumlahLulus} lulus
                    </Text>
                    <View style={gaya.jalurFolder}>
                      <View style={[gaya.isiJalurFolder, { width: `${persenFolder}%` }]} />
                    </View>
                    <Text style={gaya.detail} numberOfLines={1}>
                      {selesaiSemua ? 'Semua bab lulus' : giliran ? `Lanjut: ${giliran.bab.nama}` : ''}
                    </Text>
                  </View>
                  <Text style={gaya.panah}>›</Text>
                </TouchableOpacity>
              );
            })}

          <Tombol
            judul="Keluar"
            varian={data.semuaSelesai ? 'utama' : 'teks'}
            onPress={keluarAkun}
            style={{ marginTop: 10 }}
          />
        </View>
      </ScrollView>
    </Layar>
  );
}

const gaya = StyleSheet.create({
  tengah: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  isi: { paddingBottom: 40 },
  banner: {
    backgroundColor: WARNA.utama,
    paddingHorizontal: 20,
    paddingBottom: 64,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  barisSapaan: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: WARNA.aksen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  inisial: { fontSize: 24, fontWeight: '800', color: WARNA.utamaGelap },
  sapaan: { fontSize: 22, fontWeight: '800', color: WARNA.putih },
  subjudul: { fontSize: 13, color: '#C7D2FE', marginTop: 2 },
  judulUjian: { fontSize: 14, color: '#E0E7FF', marginTop: 16, fontWeight: '600' },
  badan: { paddingHorizontal: 20, marginTop: -44 },
  ringkasan: {
    backgroundColor: WARNA.putih,
    borderRadius: RADIUS.lg,
    padding: 18,
    marginBottom: 16,
    ...BAYANGAN,
    shadowOpacity: 0.14,
  },
  barisProgres: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  labelProgres: { fontSize: 14, fontWeight: '700', color: WARNA.teks },
  persen: { fontSize: 14, fontWeight: '800', color: WARNA.utama },
  jalur: { height: 10, borderRadius: 5, backgroundColor: WARNA.terang, overflow: 'hidden' },
  isiJalur: { height: 10, borderRadius: 5, backgroundColor: WARNA.utama },
  barisInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  info: { flex: 1, alignItems: 'center' },
  garisPisah: { width: 1, height: 30, backgroundColor: WARNA.garis },
  angka: { fontSize: 22, fontWeight: '800', color: WARNA.utamaGelap },
  labelInfo: { fontSize: 11, color: WARNA.abu, marginTop: 2 },
  kartuAturan: { backgroundColor: WARNA.peringatanLatar, borderColor: '#FDE68A' },
  judulAturan: { fontWeight: '800', color: WARNA.peringatan, marginBottom: 6 },
  aturan: { fontSize: 13, color: WARNA.teks, lineHeight: 20 },
  kartuLulus: { backgroundColor: WARNA.benarLatar, borderColor: '#BBF7D0' },
  judulLulus: { fontSize: 17, fontWeight: '800', color: WARNA.benar },
  teksLulus: { fontSize: 14, color: WARNA.teks, marginTop: 4, lineHeight: 20 },
  bagian: { fontSize: 18, fontWeight: '800', color: WARNA.utamaGelap, marginTop: 6, marginBottom: 12 },
  kosong: { color: WARNA.abu, fontSize: 14, textAlign: 'center', marginVertical: 8 },
  kartuFolder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WARNA.putih,
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: WARNA.garis,
    ...BAYANGAN,
  },
  ikonFolder: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: WARNA.terang,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  namaFolder: { fontSize: 17, fontWeight: '800', color: WARNA.utamaGelap },
  detail: { fontSize: 12, color: WARNA.abu, marginTop: 3, lineHeight: 18 },
  jalurFolder: { height: 6, borderRadius: 3, backgroundColor: WARNA.terang, overflow: 'hidden', marginTop: 8 },
  isiJalurFolder: { height: 6, borderRadius: 3, backgroundColor: WARNA.utama },
  panah: { fontSize: 30, color: WARNA.abu, marginLeft: 4 },
});
