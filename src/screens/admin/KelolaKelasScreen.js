import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Layar from '../../components/Layar';
import Kartu from '../../components/Kartu';
import Input from '../../components/Input';
import Tombol from '../../components/Tombol';
import dataService from '../../services/dataService';
import { info, konfirmasi } from '../../utils/dialog';
import { WARNA } from '../../theme';

export default function KelolaKelasScreen() {
  const [kelas, setKelas] = useState(null);
  const [nama, setNama] = useState('');
  const [idUbah, setIdUbah] = useState(null);
  const [menyimpan, setMenyimpan] = useState(false);

  const muat = useCallback(async () => {
    setKelas(await dataService.ambilKelasDenganJumlah());
  }, []);

  useFocusEffect(
    useCallback(() => {
      muat();
    }, [muat])
  );

  const simpan = async () => {
    setMenyimpan(true);
    try {
      if (idUbah) await dataService.ubahKelas(idUbah, nama);
      else await dataService.tambahKelas(nama);
      setNama('');
      setIdUbah(null);
      await muat();
    } catch (e) {
      info('Kelas belum valid', e.message);
    }
    setMenyimpan(false);
  };

  const mulaiUbah = (item) => {
    setIdUbah(item.id);
    setNama(item.nama);
  };

  const batalUbah = () => {
    setIdUbah(null);
    setNama('');
  };

  const hapus = (item) => {
    konfirmasi(
      'Hapus kelas',
      `Kelas ${item.nama} akan dihapus. Lanjutkan?`,
      async () => {
        try {
          await dataService.hapusKelas(item.id);
          if (idUbah === item.id) batalUbah();
          await muat();
        } catch (e) {
          info('Kelas belum bisa dihapus', e.message);
        }
      },
      'Hapus',
      true
    );
  };

  if (!kelas) {
    return (
      <Layar edges={['bottom', 'left', 'right']}>
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={WARNA.utama} />
      </Layar>
    );
  }

  return (
    <Layar edges={['bottom', 'left', 'right']}>
      <FlatList
        data={kelas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={gaya.isi}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ marginBottom: 8 }}>
            <Text style={gaya.petunjuk}>
              Buat kelas, lalu masukkan siswa ke kelasnya dan tandai soal untuk kelas tertentu. Siswa hanya menerima
              soal untuk kelasnya ditambah soal yang ditandai "Semua kelas".
            </Text>
            <Input
              label={idUbah ? 'Ubah nama kelas' : 'Nama kelas baru'}
              value={nama}
              onChangeText={setNama}
              placeholder="Contoh: X IPA 1"
              autoCapitalize="characters"
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={simpan}
            />
            <View style={gaya.barisTombol}>
              <Tombol
                judul={idUbah ? 'Simpan Perubahan' : 'Tambah Kelas'}
                onPress={simpan}
                memuat={menyimpan}
                style={{ flex: 1 }}
              />
              {idUbah && <Tombol judul="Batal" varian="sekunder" onPress={batalUbah} style={{ marginLeft: 8 }} />}
            </View>
            <Text style={gaya.total}>{kelas.length} kelas</Text>
          </View>
        }
        ListEmptyComponent={<Text style={gaya.kosong}>Belum ada kelas. Tambahkan kelas pertama di atas.</Text>}
        renderItem={({ item }) => (
          <Kartu>
            <Text style={gaya.nama}>{item.nama}</Text>
            <Text style={gaya.detail}>{item.jumlahSiswa} siswa</Text>
            <Text style={gaya.detail}>
              {item.soalKhusus} soal khusus + {item.soalUmum} soal untuk semua kelas = {item.totalSoal} soal dikerjakan
              siswa kelas ini
            </Text>
            <View style={gaya.baris}>
              <Tombol kecil varian="sekunder" judul="Ubah nama" onPress={() => mulaiUbah(item)} style={{ marginRight: 8 }} />
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
  petunjuk: { fontSize: 13, color: WARNA.abu, lineHeight: 19, marginBottom: 16 },
  barisTombol: { flexDirection: 'row' },
  total: { fontSize: 14, color: WARNA.abu, marginTop: 20, marginBottom: 4 },
  kosong: { textAlign: 'center', color: WARNA.abu, marginTop: 24 },
  nama: { fontSize: 17, fontWeight: '700', color: WARNA.utamaGelap },
  detail: { fontSize: 13, color: WARNA.abu, marginTop: 3, lineHeight: 19 },
  baris: { flexDirection: 'row', marginTop: 12 },
});
