import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { BAYANGAN, RADIUS, WARNA } from '../theme';

// varian: 'utama' | 'sekunder' | 'bahaya' | 'teks'
export default function Tombol({
  judul,
  onPress,
  varian = 'utama',
  disabled = false,
  memuat = false,
  kecil = false,
  style,
}) {
  const mati = disabled || memuat;
  const warnaLabel =
    varian === 'utama' || varian === 'bahaya' ? WARNA.putih : varian === 'teks' ? WARNA.abu : WARNA.utama;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={mati}
      style={[gaya.dasar, kecil && gaya.kecil, gaya[varian], mati && gaya.mati, style]}
    >
      {memuat ? (
        <ActivityIndicator color={warnaLabel} />
      ) : (
        <Text style={[gaya.label, kecil && gaya.labelKecil, { color: warnaLabel }]}>{judul}</Text>
      )}
    </TouchableOpacity>
  );
}

const gaya = StyleSheet.create({
  dasar: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  kecil: { paddingVertical: 8, paddingHorizontal: 14, minHeight: 38, borderRadius: RADIUS.sm + 2 },
  utama: { backgroundColor: WARNA.utama, ...BAYANGAN, shadowColor: WARNA.utama, shadowOpacity: 0.3 },
  sekunder: { backgroundColor: WARNA.putih, borderWidth: 1.5, borderColor: WARNA.utama },
  bahaya: { backgroundColor: WARNA.salah },
  teks: { backgroundColor: 'transparent' },
  mati: { opacity: 0.45 },
  label: { fontSize: 16, fontWeight: '700' },
  labelKecil: { fontSize: 13 },
});
