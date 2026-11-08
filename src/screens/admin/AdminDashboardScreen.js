import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Layar from '../../components/Layar';
import Tombol from '../../components/Tombol';
import { useAuth } from '../../context/AuthContext';
import dataService from '../../services/dataService';
import { konfirmasi } from '../../utils/dialog';
import { RADIUS, WARNA } from '../../theme';

const MENU = [
  { rute: 'KelolaKelas', judul: 'Kelola Kelas', ket: 'Buat kelas dan atur soal per kelas' },
  { rute: 'KelolaBab', judul: 'Kelola Bab & Soal', ket: 'Mata pelajaran, Bab, soal, dan nilai lulus' },
  { rute: 'KelolaSiswa', judul: 'Kelola Siswa', ket: 'Akun siswa dan password' },
  { rute: 'RekapNilai', judul: 'Rekap Nilai', ket: 'Hasil ujian, bisa difilter per kelas' },
  { rute: 'Pengaturan', judul: 'Pengaturan Ujian', ket: 'Durasi, nilai lulus, password admin' },
];

export default function AdminDashboardScreen({ navigation }) {
  const { pengguna, keluar } = useAuth();
  const [stat, setStat] = useState(null);
  const [pengaturan, setPengaturan] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let aktif = true;
      (async () => {
        const [s, p] = await Promise.all([dataService.ambilStatistik(), dataService.ambilPengaturan()]);
        if (aktif) {
          setStat(s);
          setPengaturan(p);
        }
      })();
      return () => {
        aktif = false;
      };
    }, [])
  );

  const keluarAkun = () => konfirmasi('Keluar akun', 'Kembali ke halaman login?', () => keluar(), 'Keluar');

  const kartu = stat
    ? [
        { label: 'Siswa terdaftar', nilai: stat.jumlahSiswa },
        { label: 'Jumlah kelas', nilai: stat.jumlahKelas },
        { label: 'Jumlah bab', nilai: stat.jumlahBab },
        { label: 'Jumlah soal', nilai: stat.jumlahSoal },
        { label: 'Bab dikumpulkan', nilai: stat.jawabanMasuk },
        { label: 'Rata-rata nilai', nilai: stat.rataNilai },
      ]
    : [];

  return (
    <Layar>
      <ScrollView contentContainerStyle={gaya.isi} showsVerticalScrollIndicator={false}>
        <Text style={gaya.sapaan}>Dashboard Admin</Text>
        <Text style={gaya.subjudul}>
          {pengguna.nama}
          {pengaturan ? ` - ${pengaturan.judulUjian}` : ''}
        </Text>

        {!stat ? (
          <ActivityIndicator style={{ marginVertical: 40 }} size="large" color={WARNA.utama} />
        ) : (
          <View style={gaya.grid}>
            {kartu.map((k) => (
              <View key={k.label} style={gaya.statKotak}>
                <Text style={[gaya.statNilai, k.warna && { color: k.warna }]}>{k.nilai}</Text>
                <Text style={gaya.statLabel}>{k.label}</Text>
              </View>
            ))}
          </View>
        )}

        {pengaturan && (
          <Text style={gaya.ringkas}>
            Durasi bawaan {pengaturan.durasiMenit} menit - Nilai lulus {pengaturan.kkm} - Soal{' '}
            {pengaturan.acakSoal ? 'diacak' : 'berurutan'}
          </Text>
        )}

        <Text style={gaya.bagian}>Menu</Text>
        {MENU.map((m) => (
          <TouchableOpacity
            key={m.rute}
            activeOpacity={0.8}
            style={gaya.menu}
            onPress={() => navigation.navigate(m.rute)}
          >
            <Text style={gaya.menuJudul}>
              {m.judul}
              {m.badge && stat && stat[m.badge] > 0 ? `  (${stat[m.badge]} baru)` : ''}
            </Text>
            <Text style={gaya.menuKet}>{m.ket}</Text>
          </TouchableOpacity>
        ))}

        <Tombol judul="Keluar akun" varian="teks" onPress={keluarAkun} style={{ marginTop: 16 }} />
      </ScrollView>
    </Layar>
  );
}

const gaya = StyleSheet.create({
  isi: { padding: 20, paddingBottom: 40 },
  sapaan: { fontSize: 26, fontWeight: '800', color: WARNA.utamaGelap, marginTop: 8 },
  subjudul: { fontSize: 14, color: WARNA.abu, marginTop: 2, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statKotak: {
    width: '48%',
    backgroundColor: WARNA.putih,
    borderWidth: 1,
    borderColor: WARNA.garis,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 12,
  },
  statNilai: { fontSize: 28, fontWeight: '800', color: WARNA.utama },
  statLabel: { fontSize: 13, color: WARNA.abu, marginTop: 2 },
  ringkas: { fontSize: 12, color: WARNA.abu, textAlign: 'center', marginTop: 4 },
  bagian: { fontSize: 18, fontWeight: '700', color: WARNA.utamaGelap, marginTop: 24, marginBottom: 10 },
  menu: {
    backgroundColor: WARNA.putih,
    borderWidth: 1,
    borderColor: WARNA.garis,
    borderLeftWidth: 5,
    borderLeftColor: WARNA.utama,
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 10,
  },
  menuJudul: { fontSize: 16, fontWeight: '700', color: WARNA.utamaGelap },
  menuKet: { fontSize: 13, color: WARNA.abu, marginTop: 2 },
});
