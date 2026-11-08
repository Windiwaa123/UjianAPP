import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Layar from '../../components/Layar';
import Kartu from '../../components/Kartu';
import Tombol from '../../components/Tombol';
import Lencana from '../../components/Lencana';
import dataService from '../../services/dataService';
import { paketExcelSiap, pesanPaket, pilihFileExcel } from '../../services/excelService';
import { parseSoalDariSheets } from '../../utils/importSoal';
import { BATAS_PER_JENIS, JENIS_SOAL } from '../../utils/jenisSoal';
import { info } from '../../utils/dialog';
import { RADIUS, WARNA } from '../../theme';

const TAMPIL_GALAT = 40; // jumlah baris bermasalah yang ditampilkan

export default function ImporSoalScreen({ navigation, route }) {
  const babId = route.params.babId;
  const [bab, setBab] = useState(null);
  const [membaca, setMembaca] = useState(false);
  const [mengimpor, setMengimpor] = useState(false);
  const [laporan, setLaporan] = useState(null);

  useEffect(() => {
    dataService.ambilBab(babId).then(setBab);
  }, [babId]);

  // Membaca file, lalu memeriksanya TANPA menyimpan apa pun (simulasi)
  const pilihFile = async () => {
    if (!paketExcelSiap()) {
      info('Paket belum terpasang', pesanPaket());
      return;
    }
    setMembaca(true);
    try {
      const berkas = await pilihFileExcel();
      if (!berkas) return;
      const kelas = await dataService.ambilSemuaKelas();
      const baca = parseSoalDariSheets(berkas.sheets, kelas);
      const periksa = await dataService.tambahSoalMassal(babId, baca.soal, { simulasi: true });
      setLaporan({
        namaFile: berkas.namaFile,
        soal: baca.soal,
        siap: periksa.berhasil,
        perJenis: periksa.perJenis,
        galat: [...baca.galat, ...periksa.gagal],
      });
    } catch (e) {
      info('File belum bisa dipakai', e.message || 'Terjadi kesalahan saat membaca file.');
    } finally {
      setMembaca(false);
    }
  };

  const impor = async () => {
    setMengimpor(true);
    try {
      // Diperiksa ulang saat menyimpan, kalau-kalau data bab berubah sejak pemeriksaan
      const hasil = await dataService.tambahSoalMassal(babId, laporan.soal);
      const tambahan = hasil.gagal.length ? `\n${hasil.gagal.length} soal dilewati karena masalah baru.` : '';
      info('Impor selesai', `${hasil.berhasil} soal berhasil ditambahkan ke ${bab ? bab.nama : 'bab ini'}.${tambahan}`);
      navigation.goBack();
    } catch (e) {
      info('Impor gagal', e.message || 'Terjadi kesalahan saat menyimpan soal.');
      setMengimpor(false);
    }
  };

  const jumlahGalat = laporan ? laporan.galat.length : 0;

  return (
    <Layar edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={gaya.isi} showsVerticalScrollIndicator={false}>
        <Text style={gaya.judul}>Upload soal dari Excel</Text>
        <Text style={gaya.bab}>Tujuan: {bab ? bab.nama : '...'}</Text>

        {!laporan && (
          <>
            <Kartu>
              <Text style={gaya.subjudul}>Cara memakai</Text>
              <Text style={gaya.langkah}>1. Buka file Template_Soal.xlsx (ada di folder "template" pada proyek) di komputer.</Text>
              <Text style={gaya.langkah}>2. Isi soal di sheet sesuai jenisnya. Satu baris = satu soal. Jangan ubah baris judul.</Text>
              <Text style={gaya.langkah}>3. Simpan sebagai .xlsx, lalu kirim ke HP (WhatsApp, Google Drive, atau kabel).</Text>
              <Text style={gaya.langkah}>4. Tekan tombol di bawah, pilih file, dan periksa laporannya sebelum diimpor.</Text>
            </Kartu>

            <Kartu>
              <Text style={gaya.subjudul}>Sheet di template</Text>
              {JENIS_SOAL.map((j) => (
                <Text key={j.kunci} style={gaya.baris}>
                  {j.ikon} <Text style={gaya.tebal}>{j.kunci === 'bs' ? 'BenarSalah' : j.kunci === 'jodoh' ? 'Menjodohkan' : j.singkat}</Text>
                  {' - '}
                  {j.label}
                  {j.batas === null ? ' (tanpa batas)' : ` (maks ${BATAS_PER_JENIS} per bab)`}
                </Text>
              ))}
              <Text style={gaya.catatan}>
                Batas dihitung bersama soal yang sudah ada di bab ini. Soal yang melewati batas, bermasalah, atau sama persis
                dengan yang sudah ada akan dilewati dan dilaporkan; soal lainnya tetap bisa diimpor. Gambar ditambahkan
                lewat Ubah soal setelah impor.
              </Text>
            </Kartu>

            <Tombol judul="📂  Pilih file Excel (.xlsx)" onPress={pilihFile} memuat={membaca} />
            {membaca && <Text style={gaya.catatan}>Membaca dan memeriksa file...</Text>}
          </>
        )}

        {!!laporan && (
          <>
            <Text style={gaya.namaFile} numberOfLines={2}>
              📄 {laporan.namaFile}
            </Text>

            <Kartu style={laporan.siap > 0 ? gaya.kartuSiap : gaya.kartuKosong}>
              <Text style={[gaya.besar, { color: laporan.siap > 0 ? WARNA.benar : WARNA.abu }]}>
                {laporan.siap > 0 ? `✅ ${laporan.siap} soal siap diimpor` : 'Tidak ada soal yang bisa diimpor'}
              </Text>
              {laporan.siap > 0 && (
                <View style={gaya.barisChip}>
                  {JENIS_SOAL.filter((j) => laporan.perJenis[j.kunci] > 0).map((j) => (
                    <View key={j.kunci} style={{ marginRight: 6, marginBottom: 6 }}>
                      <Lencana teks={`${j.ikon} ${j.singkat}: ${laporan.perJenis[j.kunci]}`} warna={j.warna} latar={j.warnaLatar} />
                    </View>
                  ))}
                </View>
              )}
            </Kartu>

            {jumlahGalat > 0 && (
              <Kartu style={gaya.kartuGalat}>
                <Text style={[gaya.besar, { color: WARNA.peringatan }]}>⚠️ {jumlahGalat} masalah ditemukan</Text>
                <Text style={gaya.catatan}>Baris di bawah ini dilewati. Perbaiki di Excel lalu upload ulang, atau abaikan jika tidak perlu.</Text>
                {laporan.galat.slice(0, TAMPIL_GALAT).map((g, i) => (
                  <View key={i} style={gaya.itemGalat}>
                    <Text style={gaya.labelGalat}>{g.label}</Text>
                    <Text style={gaya.pesanGalat}>{g.pesan}</Text>
                  </View>
                ))}
                {jumlahGalat > TAMPIL_GALAT && <Text style={gaya.catatan}>...dan {jumlahGalat - TAMPIL_GALAT} masalah lainnya.</Text>}
              </Kartu>
            )}

            <Tombol
              judul={
                laporan.siap === 0
                  ? 'Tidak ada yang bisa diimpor'
                  : jumlahGalat > 0
                  ? `Impor ${laporan.siap} soal yang valid`
                  : `Impor ${laporan.siap} soal`
              }
              onPress={impor}
              disabled={laporan.siap === 0 || membaca}
              memuat={mengimpor}
              style={{ marginTop: 6 }}
            />
            <Tombol
              judul="Pilih file lain"
              varian="sekunder"
              onPress={() => {
                setLaporan(null);
              }}
              disabled={mengimpor}
              style={{ marginTop: 10 }}
            />
          </>
        )}
        {membaca && !laporan && <ActivityIndicator style={{ marginTop: 16 }} color={WARNA.utama} />}
      </ScrollView>
    </Layar>
  );
}

const gaya = StyleSheet.create({
  isi: { padding: 16, paddingBottom: 48 },
  judul: { fontSize: 22, fontWeight: '800', color: WARNA.utamaGelap },
  bab: { fontSize: 14, color: WARNA.abu, marginTop: 2, marginBottom: 14 },
  subjudul: { fontSize: 15, fontWeight: '800', color: WARNA.utamaGelap, marginBottom: 8 },
  langkah: { fontSize: 13, color: WARNA.teks, lineHeight: 20, marginBottom: 4 },
  baris: { fontSize: 13, color: WARNA.teks, lineHeight: 21 },
  tebal: { fontWeight: '800' },
  catatan: { fontSize: 12, color: WARNA.abu, lineHeight: 18, marginTop: 8 },
  namaFile: { fontSize: 14, fontWeight: '700', color: WARNA.teks, marginBottom: 10 },
  kartuSiap: { backgroundColor: WARNA.benarLatar, borderColor: '#BBF7D0' },
  kartuKosong: { backgroundColor: WARNA.putih },
  kartuGalat: { backgroundColor: WARNA.peringatanLatar, borderColor: '#FDE68A' },
  besar: { fontSize: 17, fontWeight: '800' },
  barisChip: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  itemGalat: {
    backgroundColor: WARNA.putih,
    borderRadius: RADIUS.sm,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  labelGalat: { fontSize: 12, fontWeight: '800', color: WARNA.peringatan },
  pesanGalat: { fontSize: 13, color: WARNA.teks, lineHeight: 19, marginTop: 2 },
});
