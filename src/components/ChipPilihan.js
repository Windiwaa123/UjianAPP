import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WARNA } from '../theme';

// Deretan pilihan berbentuk "chip". Dipakai untuk memilih kelas dan untuk filter.
//   item   : [{ kunci, label }]
//   aktif  : (kunci) => boolean
//   onPilih: (kunci) => void
export default function ChipPilihan({ item, aktif, onPilih, style }) {
  return (
    <View style={[gaya.baris, style]}>
      {item.map((i) => {
        const a = aktif(i.kunci);
        return (
          <TouchableOpacity
            key={i.kunci}
            activeOpacity={0.8}
            onPress={() => onPilih(i.kunci)}
            style={[gaya.chip, a && gaya.chipAktif]}
          >
            <Text style={[gaya.teks, a && gaya.teksAktif]}>{i.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const gaya = StyleSheet.create({
  baris: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: WARNA.utama,
    backgroundColor: WARNA.putih,
    marginRight: 8,
    marginBottom: 8,
  },
  chipAktif: { backgroundColor: WARNA.utama },
  teks: { fontSize: 13, fontWeight: '700', color: WARNA.utama },
  teksAktif: { color: WARNA.putih },
});
