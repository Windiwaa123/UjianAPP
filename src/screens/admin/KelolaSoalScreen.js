import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Layar from '../../components/Layar';
import Kartu from '../../components/Kartu';
import Tombol from '../../components/Tombol';
import Lencana from '../../components/Lencana';
import GambarSoal from '../../components/GambarSoal';
import ChipPilihan from '../../components/ChipPilihan';
import dataService from '../../services/dataService';
import { info, konfirmasi } from '../../utils/dialog';
import { BATAS_PER_JENIS, JENIS_SOAL, batasJenis, infoJenis, sudahPenuh, teksJumlah } from '../../utils/jenisSoal';
import { HURUF } from '../../utils/format';
import { WARNA } from '../../theme';

// Ringkasan kunci jawaban pada kartu soal
function Ringkasan({ q }) {
  switch (q.jenis) {
    case 'pg':
      return (
        <Text style={gaya.kunci}>
          Kunci: {HURUF[q.kunci]}. {q.pilihan[q.kunci]}
        </Text>
      );
    case 'pgk':
      return <Text style={gaya.kunci}>Kunci: {q.kunci.map((i) => `${HURUF[i]}. ${q.pilihan[i]}`).join('; ')}</Text>;
    case 'jodoh':
      return (
        <View>
          {q.pasangan.map((p, i) => (
            <Text key={i} style={gaya.kunci}>
              {p.kiri} → {p.kanan}
            </Text>
          ))}
        </View>
      );
    case 'isian':
      return <Text style={gaya.kunci}>Jawaban benar: {q.kunci.join(' / ')}</Text>;
    default:
      return (
        <View>
          {(q.pernyataan || []).map((p, i) => (
            <Text key={i} style={gaya.kunci}>
              {p.benar ? '✓ Benar' : '✗ Salah'} — {p.teks}
            </Text>
          ))}
        </View>
      );
  }
}

export default function KelolaSoalScreen({ navigation, route }) {
  const babId = route.params.babId;
  const [bab, setBab] = useState(null);
  const [soal, setSoal] = useState(null);
  const [kelas, setKelas] = useState([]);
  const [filterJenis, setFilterJenis] = useState('semua');
  const [filterKelas, setFilterKelas] = useState('semua'); // 'semua' | 'umum' | id kelas

  const muat = useCallback(async () => {
    const [b, s, k] = await Promise.all([dataService.ambilBab(babId), dataService.ambilSoalBab(babId), dataService.ambilSemuaKelas()]);
    setBab(b);
    setSoal(s);
    setKelas(k);
  }, [babId]);

  useFocusEffect(
    useCallback(() => {
      muat();
    }, [muat])
  );

  const hapus = (item) => {
    konfirmasi(
      'Hapus soal',
      'Soal ini akan dihapus permanen. Lanjutkan?',
      async () => {
        await dataService.hapusSoal(item.id);
        muat();
      },
      'Hapus',
      true
    );
  };

  const tambah = (jenis, jumlah) => {
    if (sudahPenuh(jenis, jumlah)) {
      info('Batas tercapai', `Soal ${infoJenis(jenis).label} di bab ini sudah ${batasJenis(jenis)}. Hapus salah satu jika ingin menggantinya.`);
      return;
    }
    navigation.navigate('FormSoal', { babId, jenis });
  };

  if (!soal || !bab) {
    return (
      <Layar edges={['bottom', 'left', 'right']}>
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={WARNA.utama} />
      </Layar>
    );
  }

  const namaKelas = (id) => (kelas.find((k) => k.id === id) || {}).nama || '?';
  const untukSemua = (q) => !q.kelasIds || q.kelasIds.length === 0;
  const jumlah = (jenis) => soal.filter((q) => q.jenis === jenis).length;

  const tampil = JENIS_SOAL.flatMap((j) => soal.filter((q) => q.jenis === j.kunci)).filter((q) => {
    if (filterJenis !== 'semua' && q.jenis !== filterJenis) return false;
    if (filterKelas === 'semua') return true;
    if (filterKelas === 'umum') return untukSemua(q);
    return (q.kelasIds || []).includes(filterKelas);
  });

  const itemJenis = [
    { kunci: 'semua', label: `Semua (${soal.length})` },
    ...JENIS_SOAL.map((j) => ({ kunci: j.kunci, label: `${j.singkat} (${jumlah(j.kunci)})` })),
  ];
  const itemKelas = [
    { kunci: 'semua', label: 'Semua soal' },
    { kunci: 'umum', label: 'Umum' },
    ...kelas.map((k) => ({ kunci: k.id, label: k.nama })),
  ];

  return (
    <Layar edges={['bottom', 'left', 'right']}>
      <FlatList
        data={tampil}
        keyExtractor={(item) => item.id}
        contentContainerStyle={gaya.isi}
        ListHeaderComponent={
          <View style={{ marginBottom: 12 }}>
            <Text style={gaya.namaBab}>{bab.nama}</Text>
            <Tombol
              judul="📥  Upload soal dari Excel"
              onPress={() => navigation.navigate('ImporSoal', { babId })}
              style={{ marginBottom: 14 }}
            />
            <Text style={gaya.total}>Tambah soal (Pilihan Ganda tanpa batas, jenis lain maksimal {BATAS_PER_JENIS} per bab):</Text>
            {JENIS_SOAL.map((j) => {
              const n = jumlah(j.kunci);
              const penuh = sudahPenuh(j.kunci, n);
              return (
                <Tombol
                  key={j.kunci}
                  kecil
                  varian={penuh ? 'sekunder' : 'utama'}
                  judul={`${penuh ? 'Penuh' : '+'} ${j.ikon} ${j.label} (${teksJumlah(j.kunci, n)})`}
                  onPress={() => tambah(j.kunci, n)}
                  style={{ marginTop: 8, opacity: penuh ? 0.55 : 1 }}
                />
              );
            })}
            <Text style={gaya.labelFilter}>Jenis soal:</Text>
            <ChipPilihan item={itemJenis} aktif={(k) => filterJenis === k} onPilih={setFilterJenis} />
            <Text style={gaya.labelFilter}>Kelas:</Text>
            <ChipPilihan item={itemKelas} aktif={(k) => filterKelas === k} onPilih={setFilterKelas} />
            <Text style={gaya.total}>{tampil.length} soal ditampilkan. "Umum" berarti soal muncul di ujian semua kelas.</Text>
          </View>
        }
        ListEmptyComponent={<Text style={gaya.kosong}>Tidak ada soal pada pilihan ini.</Text>}
        renderItem={({ item, index }) => (
          <Kartu>
            <View style={gaya.atas}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Lencana teks={`${infoJenis(item.jenis).ikon} ${infoJenis(item.jenis).singkat}`} warna={infoJenis(item.jenis).warna} latar={infoJenis(item.jenis).warnaLatar} />
                <Text style={gaya.nomor}>  #{index + 1}</Text>
              </View>
              {untukSemua(item) ? (
                <Lencana teks="Semua kelas" nada="netral" />
              ) : (
                <Lencana teks={item.kelasIds.map(namaKelas).join(', ')} nada="peringatan" />
              )}
            </View>
            <Text style={gaya.teks} numberOfLines={4}>
              {item.teks}
            </Text>
            <GambarSoal nama={item.gambar} tinggi={140} style={{ marginTop: 10, marginBottom: 0 }} />
            <View style={{ marginTop: 8 }}>
              <Ringkasan q={item} />
            </View>
            <View style={gaya.baris}>
              <Tombol
                kecil
                varian="sekunder"
                judul="Ubah"
                onPress={() => navigation.navigate('FormSoal', { babId, jenis: item.jenis, soalId: item.id })}
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
  namaBab: { fontSize: 20, fontWeight: '800', color: WARNA.utamaGelap, marginBottom: 10 },
  labelFilter: { fontSize: 13, fontWeight: '600', color: WARNA.teks, marginTop: 16, marginBottom: 8 },
  total: { fontSize: 12, color: WARNA.abu, marginTop: 4 },
  kosong: { textAlign: 'center', color: WARNA.abu, marginTop: 32, lineHeight: 20 },
  atas: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  nomor: { fontSize: 12, color: WARNA.abu },
  teks: { fontSize: 15, fontWeight: '600', color: WARNA.teks, lineHeight: 21 },
  kunci: { fontSize: 13, color: WARNA.benar, lineHeight: 19 },
  baris: { flexDirection: 'row', marginTop: 12 },
});
