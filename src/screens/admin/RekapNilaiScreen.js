import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Layar from '../../components/Layar';
import Kartu from '../../components/Kartu';
import dataService from '../../services/dataService';
import { kelompokkanRekap, ringkasFolder } from '../../utils/rekap';
import { WARNA } from '../../theme';

// Rekap nilai dikelompokkan per folder mata pelajaran (Matematika, Indonesia, dst.)
// supaya nilai antar mata pelajaran tidak tercampur. Ketuk folder untuk melihat nilainya.
export default function RekapNilaiScreen({ navigation }) {
  const [folder, setFolder] = useState(null);

  const muat = useCallback(async () => {
    const [hasil, bab] = await Promise.all([dataService.ambilSemuaHasil(), dataService.ambilSemuaBab()]);
    setFolder(kelompokkanRekap(hasil, bab).map((f) => ({ ...f, ringkas: ringkasFolder(f.hasil) })));
  }, []);

  useFocusEffect(
    useCallback(() => {
      muat();
    }, [muat])
  );

  if (!folder) {
    return (
      <Layar edges={['bottom', 'left', 'right']}>
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={WARNA.utama} />
      </Layar>
    );
  }

  return (
    <Layar edges={['bottom', 'left', 'right']}>
      <FlatList
        data={folder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={gaya.isi}
        ListHeaderComponent={
          <Text style={gaya.petunjuk}>
            Nilai dipisah per mata pelajaran. Ketuk folder untuk melihat nilai siswa, lalu saring per sub-bab, kelas, atau status.
          </Text>
        }
        ListEmptyComponent={<Text style={gaya.kosong}>Belum ada bab. Buat bab di menu Kelola Bab & Soal.</Text>}
        renderItem={({ item }) => {
          const r = item.ringkas;
          return (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('RekapMapel', { mapelId: item.id, mapelNama: item.nama })}
            >
              <Kartu>
                <View style={gaya.baris}>
                  <View style={gaya.ikon}>
                    <Text style={{ fontSize: 24 }}>📁</Text>
                  </View>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={gaya.nama} numberOfLines={1}>
                      {item.nama}
                    </Text>
                    {r.jumlahHasil === 0 ? (
                      <Text style={gaya.detail}>Belum ada hasil ujian</Text>
                    ) : (
                      <>
                        <Text style={gaya.detail}>
                          {r.jumlahHasil} hasil · {r.jumlahSiswa} siswa
                        </Text>
                        <Text style={gaya.detail}>
                          Rata-rata nilai tertinggi: {r.rata} · Lulus {r.lulus} dari {r.totalNilai}
                        </Text>
                      </>
                    )}
                  </View>
                  <Text style={gaya.panah}>›</Text>
                </View>
              </Kartu>
            </TouchableOpacity>
          );
        }}
      />
    </Layar>
  );
}

const gaya = StyleSheet.create({
  isi: { padding: 16, paddingBottom: 40 },
  petunjuk: { fontSize: 13, color: WARNA.abu, lineHeight: 19, marginBottom: 14 },
  kosong: { textAlign: 'center', color: WARNA.abu, marginTop: 32 },
  baris: { flexDirection: 'row', alignItems: 'center' },
  ikon: { width: 48, height: 48, borderRadius: 12, backgroundColor: WARNA.terang, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  nama: { fontSize: 17, fontWeight: '800', color: WARNA.utamaGelap },
  detail: { fontSize: 12, color: WARNA.abu, marginTop: 3, lineHeight: 18 },
  panah: { fontSize: 30, color: WARNA.abu },
});
