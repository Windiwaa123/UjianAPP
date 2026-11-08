import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ambilUriGambar, namaGambarValid } from '../services/gambarService';
import { RADIUS, WARNA } from '../theme';

// Menampilkan gambar soal. Ketuk gambar untuk memperbesar.
// Tidak menampilkan apa pun jika soal tidak punya gambar.
//
// Agar gambar terlihat bagus di semua ukuran layar dan tidak gepeng:
//  - tinggi kotak dihitung dari RASIO ASLI gambar dan lebar layar (bukan tinggi tetap),
//  - gambar selalu ditampilkan utuh dengan resizeMode "contain" (tidak ditarik atau dipotong),
//  - gambar yang sangat tinggi dibatasi sampai `tinggi` x 1,5 supaya tidak memenuhi layar (ketuk untuk memperbesar).
// `tinggi` dipakai juga sebagai tinggi sementara saat rasio gambar belum diketahui.
const PADDING_KOTAK = 6;

export default function GambarSoal({ nama, tinggi = 200, style }) {
  const [galat, setGalat] = useState(false);
  const [besar, setBesar] = useState(false);
  const [uri, setUri] = useState(null);
  const [rasio, setRasio] = useState(null); // lebar / tinggi gambar asli
  const [lebar, setLebar] = useState(0); // lebar kotak saat ini

  // Gambar disimpan di Firestore, jadi dimuat secara asinkron (hasilnya di-cache)
  useEffect(() => {
    let aktif = true;
    setGalat(false);
    setUri(null);
    setRasio(null);
    if (!namaGambarValid(nama)) return undefined;
    ambilUriGambar(nama)
      .then((u) => {
        if (!aktif) return;
        if (u) setUri(u);
        else setGalat(true);
      })
      .catch(() => {
        if (aktif) setGalat(true);
      });
    return () => {
      aktif = false;
    };
  }, [nama]);

  // Membaca ukuran asli gambar untuk menghitung rasionya
  useEffect(() => {
    if (!uri) return undefined;
    let aktif = true;
    Image.getSize(
      uri,
      (w, h) => {
        if (aktif && w > 0 && h > 0) setRasio(w / h);
      },
      () => {} // gagal membaca ukuran: tetap tampil dengan tinggi bawaan
    );
    return () => {
      aktif = false;
    };
  }, [uri]);

  if (!namaGambarValid(nama)) return null;

  if (!uri && !galat) {
    return (
      <View style={[gaya.kotak, { height: Math.min(tinggi, 90), justifyContent: 'center' }, style]}>
        <ActivityIndicator color={WARNA.utama} />
      </View>
    );
  }

  if (galat) {
    return <Text style={[gaya.galat, style]}>Gambar tidak dapat ditampilkan.</Text>;
  }

  // Tinggi gambar mengikuti rasio aslinya pada lebar kotak yang tersedia
  const lebarIsi = Math.max(0, lebar - PADDING_KOTAK * 2);
  const tinggiMaks = Math.round(tinggi * 1.5);
  const tinggiGambar = rasio && lebarIsi > 0 ? Math.max(60, Math.min(lebarIsi / rasio, tinggiMaks)) : tinggi;

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setBesar(true)}
        onLayout={(e) => setLebar(e.nativeEvent.layout.width)}
        style={[gaya.kotak, style]}
      >
        <Image
          source={{ uri }}
          style={{ width: '100%', height: tinggiGambar }}
          resizeMode="contain"
          onError={() => setGalat(true)}
        />
        <Text style={gaya.petunjuk}>Ketuk untuk memperbesar</Text>
      </TouchableOpacity>

      <Modal visible={besar} transparent animationType="fade" onRequestClose={() => setBesar(false)}>
        <View style={gaya.latar}>
          <Image source={{ uri }} style={gaya.gambarBesar} resizeMode="contain" />
          <TouchableOpacity style={gaya.tutup} onPress={() => setBesar(false)}>
            <Text style={gaya.teksTutup}>Tutup</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const gaya = StyleSheet.create({
  kotak: {
    backgroundColor: WARNA.putih,
    borderWidth: 1,
    borderColor: WARNA.garis,
    borderRadius: RADIUS.md,
    padding: PADDING_KOTAK,
    marginBottom: 14,
    overflow: 'hidden',
  },
  petunjuk: { fontSize: 11, color: WARNA.abu, textAlign: 'center', marginTop: 4 },
  galat: { fontSize: 12, color: WARNA.abu, fontStyle: 'italic', marginBottom: 12 },
  latar: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  gambarBesar: { width: '100%', height: '80%' },
  tutup: {
    marginTop: 16,
    backgroundColor: WARNA.putih,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  teksTutup: { fontWeight: '700', color: WARNA.utamaGelap, fontSize: 16 },
});
