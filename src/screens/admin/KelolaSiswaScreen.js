import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Layar from '../../components/Layar';
import Kartu from '../../components/Kartu';
import Tombol from '../../components/Tombol';
import Lencana from '../../components/Lencana';
import ChipPilihan from '../../components/ChipPilihan';
import dataService from '../../services/dataService';
import { konfirmasi } from '../../utils/dialog';
import { WARNA } from '../../theme';

export default function KelolaSiswaScreen({ navigation }) {
  const [siswa, setSiswa] = useState(null);
  const [kelas, setKelas] = useState([]);
  const [filter, setFilter] = useState('semua'); // 'semua' | 'tanpa' | id kelas

  const muat = useCallback(async () => {
    const [s, k] = await Promise.all([dataService.ambilSiswaDenganStatus(), dataService.ambilSemuaKelas()]);
    setSiswa(s);
    setKelas(k);
  }, []);

  useFocusEffect(
    useCallback(() => {
      muat();
    }, [muat])
  );

  const hapus = (item) => {
    konfirmasi(
      'Hapus siswa',
      `Akun ${item.nama} akan dinonaktifkan dan seluruh riwayat nilainya dihapus permanen. Username ini tidak bisa dipakai lagi. Lanjutkan?`,
      async () => {
        await dataService.hapusSiswa(item.id);
        muat();
      },
      'Hapus',
      true
    );
  };

  if (!siswa) {
    return (
      <Layar edges={['bottom', 'left', 'right']}>
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={WARNA.utama} />
      </Layar>
    );
  }

  const tampil = siswa.filter((s) => {
    if (filter === 'semua') return true;
    if (filter === 'tanpa') return !s.kelasId || !s.kelasNama;
    return s.kelasId === filter;
  });

  const tanpaKelas = siswa.filter((s) => !s.kelasId || !s.kelasNama).length;
  const itemFilter = [
    { kunci: 'semua', label: `Semua (${siswa.length})` },
    ...kelas.map((k) => ({ kunci: k.id, label: `${k.nama} (${siswa.filter((s) => s.kelasId === k.id).length})` })),
    ...(tanpaKelas > 0 ? [{ kunci: 'tanpa', label: `Tanpa kelas (${tanpaKelas})` }] : []),
  ];

  return (
    <Layar edges={['bottom', 'left', 'right']}>
      <FlatList
        data={tampil}
        keyExtractor={(item) => item.id}
        contentContainerStyle={gaya.isi}
        ListHeaderComponent={
          <View style={{ marginBottom: 12 }}>
            <Tombol judul="Tambah Siswa" onPress={() => navigation.navigate('FormSiswa')} />
            <Text style={gaya.labelFilter}>Tampilkan kelas:</Text>
            <ChipPilihan item={itemFilter} aktif={(k) => filter === k} onPilih={setFilter} />
            <Text style={gaya.total}>{tampil.length} siswa ditampilkan</Text>
          </View>
        }
        ListEmptyComponent={<Text style={gaya.kosong}>Tidak ada siswa pada pilihan ini.</Text>}
        renderItem={({ item }) => (
          <Kartu>
            <View style={gaya.atas}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={gaya.nama}>{item.nama}</Text>
                <Text style={gaya.detail}>Kelas: {item.kelasNama || 'belum diatur'}</Text>
                <Text style={gaya.detail}>Username: {item.username}</Text>
              </View>
              {item.babSelesai > 0 ? (
                <Lencana teks="Sudah ujian" nada="benar" />
              ) : (
                <Lencana teks="Belum ujian" nada="netral" />
              )}
            </View>

            <Text style={gaya.detail}>
              Bab selesai: {item.babSelesai}
              {item.rataNilai !== null ? ` - Rata-rata nilai: ${item.rataNilai}` : ''}
            </Text>

            <View style={gaya.baris}>
              <Tombol
                kecil
                varian="sekunder"
                judul="Ubah"
                onPress={() => navigation.navigate('FormSiswa', { siswaId: item.id })}
                style={{ marginRight: 8 }}
              />
              <Tombol kecil varian="bahaya" judul="Hapus" onPress={() => hapus(item)} />
            </View>
          </Kartu>
        )}
      />
    </Layar>
  );
}

const gaya = StyleSheet.create({
  isi: { padding: 16, paddingBottom: 40 },
  labelFilter: { fontSize: 13, fontWeight: '600', color: WARNA.teks, marginTop: 16, marginBottom: 8 },
  total: { fontSize: 13, color: WARNA.abu, marginTop: 2 },
  kosong: { textAlign: 'center', color: WARNA.abu, marginTop: 32, lineHeight: 20 },
  atas: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  nama: { fontSize: 16, fontWeight: '700', color: WARNA.teks },
  detail: { fontSize: 13, color: WARNA.abu, marginTop: 3 },
  baris: { flexDirection: 'row', marginTop: 12 },
});
