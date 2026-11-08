import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Layar from '../components/Layar';
import Tombol from '../components/Tombol';
import RincianJawaban from '../components/RincianJawaban';
import dataService from '../services/dataService';
import { konfirmasi } from '../utils/dialog';
import { formatDurasi } from '../utils/format';
import { BAYANGAN, RADIUS, WARNA } from '../theme';

export default function HasilScreen({ navigation, route }) {
  const [hasil, setHasil] = useState(null);
  const [pengaturan, setPengaturan] = useState(null);

  // Dimuat ulang setiap layar ini dibuka
  useFocusEffect(
    useCallback(() => {
      let aktif = true;
      (async () => {
        const [h, p] = await Promise.all([dataService.ambilHasil(route.params.hasilId), dataService.ambilPengaturan()]);
        if (aktif) {
          setHasil(h);
          setPengaturan(p);
        }
      })();
      return () => {
        aktif = false;
      };
    }, [route.params.hasilId])
  );

  // Kembali ke folder mata pelajaran tempat bab ini berada (mapel lama tanpa bab: ke beranda)
  const keFolder = async () => {
    try {
      const bab = await dataService.ambilBab(hasil.babId);
      const induk = bab && bab.indukId ? await dataService.ambilBab(bab.indukId) : null;
      if (induk) {
        navigation.navigate('FolderSiswa', { mapelId: induk.id, mapelNama: induk.nama });
        return;
      }
    } catch (e) {
      // jika gagal, kembali ke beranda saja
    }
    navigation.navigate('BerandaSiswa');
  };

  // Bab boleh dikerjakan ulang kapan saja, baik nilai belum lulus maupun sudah lulus
  const ulangi = () => {
    konfirmasi(
      'Kerjakan ulang bab ini?',
      'Waktu akan langsung berjalan. Hasil percobaan ini disimpan sebagai percobaan baru, dan percobaan sebelumnya tetap tercatat. Tombol kembali dikunci sampai jawaban dikumpulkan.',
      () => navigation.navigate('Ujian', { babId: hasil.babId }),
      'Mulai'
    );
  };

  if (!hasil || !pengaturan) {
    return (
      <Layar>
        <View style={gaya.tengah}>
          <ActivityIndicator size="large" color={WARNA.utama} />
        </View>
      </Layar>
    );
  }
  const keBeranda = () => navigation.navigate('BerandaSiswa');
  const lulus = hasil.lulus;
  const warna = lulus ? WARNA.benar : WARNA.peringatan;
  const latar = lulus ? WARNA.benarLatar : WARNA.peringatanLatar;

  return (
    <Layar>
      <ScrollView contentContainerStyle={gaya.isi} showsVerticalScrollIndicator={false}>
        <Text style={gaya.judul}>Hasil {hasil.babNama || 'Ujian'}</Text>
        {!!hasil.percobaan && <Text style={gaya.percobaan}>Percobaan ke-{hasil.percobaan}</Text>}
        {hasil.otomatis && (
          <View style={gaya.kotakWaktu}>
            <Text style={gaya.teksWaktu}>⏰ Waktu habis, jawaban Anda dikumpulkan otomatis.</Text>
          </View>
        )}

        <View style={[gaya.kotakNilai, { backgroundColor: latar }]}>
          <Text style={gaya.emoji}>{lulus ? '🎉' : '💪'}</Text>
          <Text style={[gaya.status, { color: warna }]}>{lulus ? 'Hebat, kamu lulus!' : 'Ayo, tingkatkan lagi!'}</Text>
          <View style={[gaya.lingkaran, { borderColor: warna }]}>
            <Text style={[gaya.nilai, { color: warna }]}>{hasil.nilai}</Text>
            <Text style={gaya.dari}>dari 100</Text>
          </View>
          <View style={gaya.barisStat}>
            <View style={gaya.stat}>
              <Text style={[gaya.angka, { color: WARNA.benar }]}>{hasil.benar}</Text>
              <Text style={gaya.labelStat}>Benar</Text>
            </View>
            <View style={gaya.stat}>
              <Text style={[gaya.angka, { color: WARNA.salah }]}>{hasil.salah}</Text>
              <Text style={gaya.labelStat}>Salah</Text>
            </View>
            <View style={gaya.stat}>
              <Text style={[gaya.angka, { color: WARNA.abu }]}>{hasil.kosong}</Text>
              <Text style={gaya.labelStat}>Kosong</Text>
            </View>
          </View>
          <Text style={gaya.keterangan}>⏱ Waktu pengerjaan {formatDurasi(hasil.durasiDetik)}</Text>
        </View>

        <Text style={gaya.pesan}>
          {lulus
            ? `Nilai Anda mencapai batas minimal (${hasil.kkm}). Anda tetap boleh mengerjakan ulang untuk memperbaiki nilai.`
            : `Nilai Anda belum mencapai batas minimal (${hasil.kkm}). Kerjakan ulang untuk membuka bab berikutnya.`}
        </Text>

        <Tombol judul="🔁  Kerjakan Ulang" onPress={ulangi} style={{ marginBottom: 10 }} />
        <Tombol judul="📁  Kembali ke Folder" varian="sekunder" onPress={keFolder} />
      

        <Text style={gaya.bagian}>📝 Jawaban Anda</Text>
        <Text style={gaya.catatan}>
          Tanda benar atau salah ditampilkan untuk setiap soal. Kunci jawaban tidak ditampilkan.
        </Text>
        {hasil.rincian.map((r, i) => (
          <RincianJawaban key={r.soalId} r={r} nomor={i + 1} />
        ))}
          <Tombol judul="🏠  Ke Beranda" varian="sekunder" onPress={keBeranda} />
          
      </ScrollView>
    </Layar>
  );
}

const gaya = StyleSheet.create({
  tengah: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  isi: { padding: 20, paddingBottom: 40 },
  judul: { fontSize: 24, fontWeight: '800', color: WARNA.utamaGelap, marginBottom: 4 },
  percobaan: { fontSize: 14, color: WARNA.abu, marginBottom: 12 },
  kotakWaktu: { backgroundColor: WARNA.peringatanLatar, padding: 10, borderRadius: RADIUS.sm, marginBottom: 12 },
  teksWaktu: { color: WARNA.peringatan, fontSize: 13 },
  kotakNilai: { alignItems: 'center', padding: 24, borderRadius: RADIUS.lg, ...BAYANGAN },
  emoji: { fontSize: 48 },
  status: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginTop: 4, marginBottom: 16 },
  lingkaran: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 8,
    backgroundColor: WARNA.putih,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nilai: { fontSize: 44, fontWeight: '800' },
  dari: { fontSize: 12, color: WARNA.abu },
  barisStat: { flexDirection: 'row', marginTop: 20, alignSelf: 'stretch' },
  stat: { flex: 1, alignItems: 'center' },
  angka: { fontSize: 24, fontWeight: '800' },
  labelStat: { fontSize: 12, color: WARNA.abu, marginTop: 2 },
  keterangan: { fontSize: 13, color: WARNA.abu, marginTop: 16, textAlign: 'center' },
  pesan: { fontSize: 15, color: WARNA.teks, lineHeight: 22, marginVertical: 16 },
  catatan: { fontSize: 13, color: WARNA.abu, marginBottom: 12, lineHeight: 19 },
  bagian: { fontSize: 18, fontWeight: '800', color: WARNA.utamaGelap, marginTop: 28, marginBottom: 10 },
});
