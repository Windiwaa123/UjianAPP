import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Layar from '../../components/Layar';
import Kartu from '../../components/Kartu';
import Tombol from '../../components/Tombol';
import Lencana from '../../components/Lencana';
import ChipPilihan from '../../components/ChipPilihan';
import dataService from '../../services/dataService';
import { konfirmasi } from '../../utils/dialog';
import { formatDurasi, formatTanggal } from '../../utils/format';
import { kelompokkanRekap } from '../../utils/rekap';
import { RADIUS, WARNA } from '../../theme';

const FILTER_STATUS = [
  { kunci: 'semua', label: 'Semua' },
  { kunci: 'lulus', label: 'Lulus' },
  { kunci: 'belum', label: 'Belum lulus' },
];

export default function RekapMapelScreen({ route }) {
  const { mapelId } = route.params;
  const [hasil, setHasil] = useState(null);
  const [kelas, setKelas] = useState([]);
  const [bab, setBab] = useState([]);
  const [filterBab, setFilterBab] = useState('semua');
  const [status, setStatus] = useState('semua');
  const [filterKelas, setFilterKelas] = useState('semua'); // 'semua' | 'tanpa' | id kelas

  const muat = useCallback(async () => {
    const [semua, k, b] = await Promise.all([
      dataService.ambilSemuaHasil(),
      dataService.ambilSemuaKelas(),
      dataService.ambilSemuaBab(),
    ]);
    const folder = kelompokkanRekap(semua, b).find((f) => f.id === mapelId);
    const milik = folder ? folder.hasil : [];
    setHasil([...milik].sort((x, y) => new Date(y.waktu) - new Date(x.waktu)));
    setKelas(k);
    setBab(b);
  }, [mapelId]);

  useFocusEffect(
    useCallback(() => {
      muat();
    }, [muat])
  );

  const hapus = (item) => {
    konfirmasi(
      'Hapus hasil',
      `Percobaan ke-${item.percobaan || 1} milik ${item.nama} (nilai ${item.nilai}) akan dihapus dari riwayat.`,
      async () => {
        await dataService.hapusHasil(item.id);
        muat();
      },
      'Hapus',
      true
    );
  };

  if (!hasil) {
    return (
      <Layar edges={['bottom', 'left', 'right']}>
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={WARNA.utama} />
      </Layar>
    );
  }

  const tampil = hasil.filter((h) => {
    const cocokStatus =
      status === 'semua' ? true : status === 'lulus' ? h.lulus : !h.lulus;
    const cocokBab = filterBab === 'semua' ? true : h.babId === filterBab;
    const cocokKelas =
      filterKelas === 'semua' ? true : filterKelas === 'tanpa' ? !h.kelasId : h.kelasId === filterKelas;
    return cocokStatus && cocokKelas && cocokBab;
  });

  const adaTanpaKelas = hasil.some((h) => !h.kelasId);
  // Filter sub-bab: hanya sub-bab dari folder ini yang punya hasil, urut sesuai urutan di Kelola Bab
  const urutanBab = new Map(bab.map((b) => [b.id, b.urutan || 0]));
  const subDariHasil = [];
  hasil.forEach((h) => {
    if (!subDariHasil.some((x) => x.kunci === h.babId)) subDariHasil.push({ kunci: h.babId, label: h.babNama || '-' });
  });
  subDariHasil.sort((x, y) => (urutanBab.get(x.kunci) ?? 999) - (urutanBab.get(y.kunci) ?? 999));
  const itemBab = [{ kunci: 'semua', label: 'Semua sub-bab' }, ...subDariHasil];
  const itemKelas = [
    { kunci: 'semua', label: 'Semua kelas' },
    ...kelas.map((k) => ({ kunci: k.id, label: k.nama })),
    ...(adaTanpaKelas ? [{ kunci: 'tanpa', label: 'Tanpa kelas' }] : []),
  ];

  return (
    <Layar edges={['bottom', 'left', 'right']}>
      <FlatList
        data={tampil}
        keyExtractor={(item) => item.id}
        contentContainerStyle={gaya.isi}
        ListHeaderComponent={
          <View style={{ marginBottom: 12 }}>
            <Text style={gaya.labelFilter}>Sub-bab:</Text>
            <ChipPilihan item={itemBab} aktif={(k) => filterBab === k} onPilih={setFilterBab} />
            <Text style={gaya.labelFilter}>Kelas:</Text>
            <ChipPilihan item={itemKelas} aktif={(k) => filterKelas === k} onPilih={setFilterKelas} />
            <Text style={gaya.labelFilter}>Status:</Text>
            <View style={gaya.filter}>
              {FILTER_STATUS.map((f) => (
                <TouchableOpacity
                  key={f.kunci}
                  style={[gaya.tab, status === f.kunci && gaya.tabAktif]}
                  onPress={() => setStatus(f.kunci)}
                >
                  <Text style={[gaya.teksTab, status === f.kunci && { color: WARNA.putih }]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={gaya.total}>{tampil.length} hasil</Text>
          </View>
        }
        ListEmptyComponent={<Text style={gaya.kosong}>Belum ada hasil ujian di folder ini.</Text>}
        renderItem={({ item }) => (
          <Kartu>
            <View style={gaya.baris}>
              <View style={{ flex: 1 }}>
                <Text style={gaya.nama}>{item.nama}</Text>
                <Text style={gaya.detail}>
                  {item.babNama || '-'} (percobaan ke-{item.percobaan || 1}) - Kelas: {item.kelasNama || '-'}
                </Text>
                <Text style={gaya.detail}>
                  Username: {item.username}
                </Text>
                <Text style={gaya.detail}>{formatTanggal(item.waktu)}</Text>
                <Text style={gaya.detail}>
                  Benar {item.benar}, salah {item.salah}, kosong {item.kosong} (dari {item.total} soal)
                </Text>
                <Text style={gaya.detail}>
                  Waktu {formatDurasi(item.durasiDetik)}
                  {item.otomatis ? ' (otomatis, waktu habis)' : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text
                  style={[
                    gaya.nilai,
                    { color: item.lulus ? WARNA.benar : WARNA.salah },
                  ]}
                >
                  {item.nilai}
                </Text>
                <Lencana teks={item.lulus ? 'Lulus' : 'Belum lulus'} nada={item.lulus ? 'benar' : 'salah'} />
              </View>
            </View>
            <Tombol
              kecil
              varian="bahaya"
              judul="Hapus hasil"
              onPress={() => hapus(item)}
              style={{ marginTop: 10, alignSelf: 'flex-start' }}
            />
          </Kartu>
        )}
      />
    </Layar>
  );
}

const gaya = StyleSheet.create({
  isi: { padding: 16, paddingBottom: 40 },
  labelFilter: { fontSize: 13, fontWeight: '600', color: WARNA.teks, marginBottom: 8, marginTop: 4 },
  filter: { flexDirection: 'row', backgroundColor: WARNA.terang, borderRadius: RADIUS.md, padding: 4 },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: RADIUS.sm },
  tabAktif: { backgroundColor: WARNA.utama },
  teksTab: { fontWeight: '700', fontSize: 13, color: WARNA.utama },
  total: { fontSize: 13, color: WARNA.abu, marginTop: 10 },
  kosong: { textAlign: 'center', color: WARNA.abu, marginTop: 32 },
  baris: { flexDirection: 'row', alignItems: 'center' },
  nama: { fontSize: 16, fontWeight: '700', color: WARNA.teks },
  detail: { fontSize: 12, color: WARNA.abu, marginTop: 2 },
  nilai: { fontSize: 30, fontWeight: '800', marginBottom: 4 },
});
