import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Layar from '../../components/Layar';
import Kartu from '../../components/Kartu';
import Tombol from '../../components/Tombol';
import dataService from '../../services/dataService';
import { info, konfirmasi } from '../../utils/dialog';
import { BATAS_PER_JENIS, JENIS_SOAL, sudahPenuh, teksJumlah } from '../../utils/jenisSoal';
import { WARNA } from '../../theme';

// Dipakai dua kali:
//   tanpa indukId : daftar BAB (mata pelajaran), misal Matematika, IPA. Tiap bab adalah folder.
//   dengan indukId: daftar SUB-BAB di dalam satu bab, misal Matematika 1, Matematika 2. Soal ada di sub-bab.
// Urutan sub-bab = urutan siswa mengerjakan. Sub-bab berikutnya terbuka setelah sub-bab sebelumnya mencapai nilai lulus.
export default function KelolaBabScreen({ navigation, route }) {
  const indukId = route.params?.indukId || null;
  const indukNama = route.params?.indukNama || '';
  const [bab, setBab] = useState(null);

  const muat = useCallback(async () => {
    setBab(await dataService.ambilBabDenganJumlah(indukId));
  }, [indukId]);

  useFocusEffect(
    useCallback(() => {
      muat();
    }, [muat])
  );

  const geser = async (item, arah) => {
    await dataService.geserBab(item.id, arah);
    muat();
  };

  const hapus = (item) => {
    const pesan = indukId
      ? `${item.nama} beserta ${item.total} soal di dalamnya akan dihapus permanen. Riwayat nilai siswa tetap tersimpan. Lanjutkan?`
      : `${item.nama} beserta ${item.jumlahSub} sub-bab dan ${item.total + item.totalLangsung} soal di dalamnya akan dihapus permanen. Riwayat nilai siswa tetap tersimpan. Lanjutkan?`;
    konfirmasi(indukId ? 'Hapus sub-bab' : 'Hapus bab', pesan, async () => {
      try {
        await dataService.hapusBab(item.id);
        muat();
      } catch (e) {
        info('Belum bisa dihapus', e.message);
      }
    }, 'Hapus', true);
  };

  if (!bab) {
    return (
      <Layar edges={['bottom', 'left', 'right']}>
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={WARNA.utama} />
      </Layar>
    );
  }

  return (
    <Layar edges={['bottom', 'left', 'right']}>
      <FlatList
        data={bab}
        keyExtractor={(item) => item.id}
        contentContainerStyle={gaya.isi}
        ListHeaderComponent={
          <View style={{ marginBottom: 12 }}>
            {indukId ? (
              <>
                <Text style={gaya.namaInduk}>{indukNama}</Text>
                <Text style={gaya.petunjuk}>
                  Isi folder ini dengan sub-bab, misalnya {indukNama} 1, {indukNama} 2, dan seterusnya. Siswa mengerjakan dari atas ke bawah:
                  sub-bab berikutnya terkunci sampai sub-bab sebelumnya mencapai nilai lulus (KKM di Pengaturan Ujian). Pilihan Ganda tidak
                  dibatasi; jenis soal lainnya maksimal {BATAS_PER_JENIS} soal per sub-bab.
                </Text>
              </>
            ) : (
              <Text style={gaya.petunjuk}>
                Satu bab = satu mata pelajaran (folder), misalnya Matematika atau IPA. Buka foldernya untuk membuat sub-bab seperti
                Matematika 1 dan Matematika 2, lalu isi soalnya. Siswa bebas memilih mata pelajaran; penguncian berlaku di antara sub-bab
                dalam satu mata pelajaran.
              </Text>
            )}
            <Tombol
              judul={indukId ? 'Tambah Sub-bab' : 'Tambah Bab'}
              onPress={() => navigation.navigate('FormBab', { indukId: indukId || undefined, indukNama })}
            />
          </View>
        }
        ListEmptyComponent={
          <Text style={gaya.kosong}>{indukId ? 'Belum ada sub-bab. Tambahkan sub-bab pertama di atas.' : 'Belum ada bab. Tambahkan bab pertama di atas.'}</Text>
        }
        renderItem={({ item, index }) => (
          <Kartu>
            <View style={gaya.atas}>
              <Text style={gaya.urutan}>{indukId ? 'Urutan pengerjaan' : 'Bab'} {index + 1}</Text>
              <View style={gaya.geser}>
                <Tombol kecil varian="sekunder" judul="Naik" disabled={index === 0} onPress={() => geser(item, -1)} style={{ marginRight: 6 }} />
                <Tombol kecil varian="sekunder" judul="Turun" disabled={index === bab.length - 1} onPress={() => geser(item, 1)} />
              </View>
            </View>
            <Text style={gaya.nama}>{indukId ? item.nama : `📁 ${item.nama}`}</Text>

            {indukId ? (
              <>
                <Text style={gaya.detail}>
                  {item.total} soal - Durasi {item.durasiMenit ? `${item.durasiMenit} menit` : 'ikut Pengaturan Ujian'}
                </Text>
                <View style={gaya.jenis}>
                  {JENIS_SOAL.map((j) => (
                    <View key={j.kunci} style={gaya.chip}>
                      <Text style={[gaya.teksChip, sudahPenuh(j.kunci, item.perJenis[j.kunci]) && { color: WARNA.peringatan }]}>
                        {j.ikon} {j.singkat} {teksJumlah(j.kunci, item.perJenis[j.kunci])}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <>
                <Text style={gaya.detail}>
                  {item.jumlahSub} sub-bab - {item.total} soal
                </Text>
                {item.totalLangsung > 0 && (
                  <Text style={gaya.catatan}>
                    Ada {item.totalLangsung} soal lama langsung di bab ini. Soal itu otomatis pindah ke sub-bab pertama yang Anda buat.
                  </Text>
                )}
              </>
            )}

            <View style={gaya.baris}>
              {indukId ? (
                <Tombol kecil judul="Kelola soal" onPress={() => navigation.navigate('KelolaSoal', { babId: item.id })} style={{ marginRight: 8 }} />
              ) : (
                <>
                  <Tombol
                    kecil
                    judul="Buka folder"
                    onPress={() => navigation.push('KelolaBab', { indukId: item.id, indukNama: item.nama })}
                    style={{ marginRight: 8 }}
                  />
                  {item.jumlahSub === 0 && item.totalLangsung > 0 && (
                    <Tombol
                      kecil
                      varian="sekunder"
                      judul="Soal lama"
                      onPress={() => navigation.navigate('KelolaSoal', { babId: item.id })}
                      style={{ marginRight: 8 }}
                    />
                  )}
                </>
              )}
              <Tombol
                kecil
                varian="sekunder"
                judul="Ubah"
                onPress={() => navigation.navigate('FormBab', { babId: item.id, indukId: indukId || undefined, indukNama })}
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
  namaInduk: { fontSize: 20, fontWeight: '800', color: WARNA.utamaGelap, marginBottom: 6 },
  petunjuk: { fontSize: 13, color: WARNA.abu, lineHeight: 19, marginBottom: 14 },
  kosong: { textAlign: 'center', color: WARNA.abu, marginTop: 24 },
  atas: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  urutan: { fontSize: 12, color: WARNA.abu },
  geser: { flexDirection: 'row' },
  nama: { fontSize: 17, fontWeight: '700', color: WARNA.utamaGelap },
  detail: { fontSize: 13, color: WARNA.abu, marginTop: 3 },
  catatan: { fontSize: 12, color: WARNA.peringatan, marginTop: 6, lineHeight: 17 },
  jenis: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  chip: { backgroundColor: WARNA.terang, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6, marginBottom: 6 },
  teksChip: { fontSize: 12, fontWeight: '700', color: WARNA.utamaGelap },
  baris: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
});
