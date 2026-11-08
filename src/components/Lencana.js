import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WARNA } from '../theme';

// nada: 'benar' | 'salah' | 'netral' | 'peringatan'
// Warna bisa diganti langsung lewat props `warna` dan `latar` (dipakai untuk label jenis soal).
export default function Lencana({ teks, nada = 'netral', warna, latar }) {
  const peta = {
    benar: { bg: WARNA.benarLatar, fg: WARNA.benar },
    salah: { bg: WARNA.salahLatar, fg: WARNA.salah },
    peringatan: { bg: WARNA.peringatanLatar, fg: WARNA.peringatan },
    netral: { bg: WARNA.terang, fg: WARNA.utamaGelap },
  };
  const w = peta[nada] || peta.netral;
  return (
    <View style={[gaya.kotak, { backgroundColor: latar || w.bg }]}>
      <Text style={[gaya.teks, { color: warna || w.fg }]}>{teks}</Text>
    </View>
  );
}

const gaya = StyleSheet.create({
  kotak: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  teks: { fontSize: 12, fontWeight: '700' },
});
