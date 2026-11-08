import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Layar from '../components/Layar';
import Tombol from '../components/Tombol';
import Lencana from '../components/Lencana';
import { useAuth } from '../context/AuthContext';
import dataService from '../services/dataService';
import { konfirmasi } from '../utils/dialog';
import { formatDurasi, formatTanggal } from '../utils/format';
import { BAYANGAN, RADIUS, WARNA } from '../theme';

// Isi satu folder mata pelajaran: daftar bab (Matematika 1, 2, 3, ...).
// bab berikutnya terbuka setelah bab sebelumnya mencapai nilai lulus (KKM).
export default function SiswaFolderScreen({ navigation, route }) {
  const { mapelId } = route.params;
  const { pengguna } = useAuth();
  const [data, setData] = useState(null);

  // Dimuat ulang setiap folder dibuka, supaya status kunci dan nilai selalu terbaru
  useFocusEffect(
    useCallback(() => {
      let aktif = true;
      (async () => {
        const status = await dataService.ambilStatusBabSiswa(pengguna.id);
        if (aktif) setData(status);
      })();
      return () => {
        aktif = false;
      };
    }, [pengguna.id])
  );

  const mulai = (item) => {
    const ulang = item.percobaan > 0;
    konfirmasi(
      ulang ? `Kerjakan ulang ${item.bab.nama}?` : `Mulai ${item.bab.nama}?`,
      ulang
        ? `Waktu ${item.durasiMenit} menit akan langsung berjalan. Ini percobaan ke-${item.percobaan + 1}. Percobaan sebelumnya tetap tercatat. Tombol kembali dikunci sampai jawaban dikumpulkan.`
        : `Waktu ${item.durasiMenit} menit akan langsung berjalan. Tombol kembali dikunci sampai jawaban dikumpulkan.`,
      () => navigation.navigate('Ujian', { babId: item.bab.id }),
      'Mulai'
    );
  };

  if (!data) {
    return (
      <Layar edges={['bottom', 'left', 'right']}>
        <View style={gaya.tengah}>
          <ActivityIndicator size="large" color={WARNA.utama} />
        </View>
      </Layar>
    );
  }

  const kkm = data.kkm;
  const m = data.mapel.find((x) => x.bab.id === mapelId);
  if (!m || m.aktif.length === 0) {
    return (
      <Layar edges={['bottom', 'left', 'right']}>
        <Text style={gaya.kosong}>Folder ini belum berisi soal untuk kelas Anda.</Text>
      </Layar>
    );
  }

  const persen = Math.round((m.jumlahLulus / m.aktif.length) * 100);

  return (
    <Layar edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={gaya.isi} showsVerticalScrollIndicator={false}>
        <View style={gaya.ringkasan}>
          <View style={gaya.barisProgres}>
            <Text style={gaya.namaFolder}>📁 {m.bab.nama}</Text>
            <Text style={gaya.persen}>{persen}%</Text>
          </View>
          <View style={gaya.jalur}>
            <View style={[gaya.isiJalur, { width: `${persen}%` }]} />
          </View>
          <Text style={gaya.detail}>
            {m.jumlahLulus} dari {m.aktif.length} bab lulus. Kerjakan berurutan; bab berikutnya terbuka setelah nilai mencapai {kkm}.
          </Text>
        </View>

        {m.aktif.map((d, idx) => {
          const terkunci = d.status === 'terkunci';
          const lulus = d.status === 'lulus';
          const ulang = d.status === 'ulang';
          const terbuka = d.status === 'terbuka';
          const warnaNilai = d.hasil && d.hasil.nilai >= kkm ? WARNA.benar : WARNA.salah;
          return (
            <View key={d.bab.id} style={[gaya.kartuBab, terkunci && gaya.kartuTerkunci]}>
              <View style={gaya.barisBab}>
                <View
                  style={[
                    gaya.nomorBab,
                    lulus && { backgroundColor: WARNA.benarLatar },
                    (terbuka || ulang) && { backgroundColor: WARNA.utama },
                    terkunci && { backgroundColor: WARNA.garis },
                  ]}
                >
                  <Text
                    style={[
                      gaya.teksNomor,
                      lulus && { color: WARNA.benar },
                      (terbuka || ulang) && { color: WARNA.putih },
                      terkunci && { color: WARNA.abu },
                    ]}
                  >
                    {terkunci ? '🔒' : lulus ? '✓' : idx + 1}
                  </Text>
                </View>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={[gaya.namaBab, terkunci && { color: WARNA.abu }]}>{d.bab.nama}</Text>
                  <Text style={gaya.detail}>
                    {d.jumlahSoal} soal · {d.durasiMenit} menit
                  </Text>
                </View>
                {lulus && <Lencana teks="Lulus" nada="benar" />}
                {ulang && <Lencana teks="Belum lulus" nada="salah" />}
                {terbuka && <Lencana teks="Giliran Anda" nada="netral" />}
                {terkunci && <Lencana teks="Terkunci" nada="peringatan" />}
              </View>

              {terkunci && (
                <Text style={gaya.petunjukKunci}>
                  Selesaikan {d.menungguBab} dengan nilai minimal {kkm} untuk membuka bab ini.
                </Text>
              )}

              {terbuka && <Tombol judul="▶  Mulai Ujian" onPress={() => mulai(d)} style={{ marginTop: 14 }} />}

              {(lulus || ulang) && d.hasil && (
                <View style={{ marginTop: 12 }}>
                  <View style={gaya.kotakNilai}>
                    <View style={{ flex: 1 }}>
                      <Text style={gaya.detail}>
                        Percobaan ke-{d.percobaan}                                    {formatTanggal(d.hasil.waktu)}
                      </Text>
                      <Text style={gaya.detail}>Waktu {formatDurasi(d.hasil.durasiDetik)}</Text>
                      {d.percobaan > 1 && d.terbaik && <Text style={gaya.detail}>Nilai tertinggi: {d.terbaik.nilai}</Text>}
                      {ulang && (
                        <Text style={[gaya.detail, { color: WARNA.salah, fontWeight: '700' }]}>
                          Nilai minimal {kkm}. Ulangi untuk membuka bab berikutnya.
                        </Text>
                      )}
                    </View>
                    <Text style={[gaya.nilai, { color: warnaNilai }]}>{d.hasil.nilai}</Text>
                  </View>
                  <View style={gaya.barisTombol}>
                    <Tombol
                      kecil
                      varian="sekunder"
                      judul="Lihat hasil"
                      onPress={() => navigation.navigate('Hasil', { hasilId: d.hasil.id })}
                      style={{ marginTop: 10, marginRight: 8 }}
                    />
                    <Tombol kecil judul="Kerjakan ulang" onPress={() => mulai(d)} style={{ marginTop: 10 }} />
                  </View>
                  
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </Layar>
  );
}

const gaya = StyleSheet.create({
  tengah: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  isi: { padding: 16, paddingBottom: 40 },
  kosong: { color: WARNA.abu, fontSize: 14, textAlign: 'center', marginTop: 40, paddingHorizontal: 24 },
  ringkasan: {
    backgroundColor: WARNA.putih,
    borderRadius: RADIUS.lg,
    padding: 18,
    marginBottom: 16,
    ...BAYANGAN,
  },
  barisProgres: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  namaFolder: { fontSize: 19, fontWeight: '800', color: WARNA.utamaGelap, flex: 1, paddingRight: 8 },
  persen: { fontSize: 14, fontWeight: '800', color: WARNA.utama },
  jalur: { height: 10, borderRadius: 5, backgroundColor: WARNA.terang, overflow: 'hidden' },
  isiJalur: { height: 10, borderRadius: 5, backgroundColor: WARNA.utama },
  kartuBab: {
    backgroundColor: WARNA.putih,
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: WARNA.garis,
    ...BAYANGAN,
  },
  kartuTerkunci: { backgroundColor: '#F1F5F9', shadowOpacity: 0, elevation: 0 },
  barisBab: { flexDirection: 'row', alignItems: 'center' },
  nomorBab: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: WARNA.terang,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  teksNomor: { fontSize: 18, fontWeight: '800', color: WARNA.utama },
  namaBab: { fontSize: 16, fontWeight: '800', color: WARNA.teks },
  detail: { fontSize: 12, color: WARNA.abu, marginTop: 3, lineHeight: 18 },
  petunjukKunci: { fontSize: 12, color: WARNA.abu, marginTop: 10 },
  kotakNilai: { flexDirection: 'row', alignItems: 'center', backgroundColor: WARNA.latar, borderRadius: RADIUS.sm + 2, padding: 12 },
  nilai: { fontSize: 30, fontWeight: '700' },
  barisTombol: { flexDirection: 'row', flexWrap: 'wrap' },
});
