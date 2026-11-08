import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { RADIUS, WARNA } from '../theme';

// Isian teks berlabel. Jika `rahasia` true, tersedia tombol Lihat/Sembunyi.
export default function Input({ label, galat, rahasia = false, style, multiline, ...sisa }) {
  const [tampil, setTampil] = useState(false);

  return (
    <View style={[gaya.wadah, style]}>
      {!!label && <Text style={gaya.label}>{label}</Text>}
      <View style={[gaya.kotak, !!galat && gaya.kotakGalat]}>
        <TextInput
          style={[gaya.input, multiline && gaya.banyakBaris]}
          placeholderTextColor={WARNA.abu}
          secureTextEntry={rahasia && !tampil}
          autoCapitalize="none"
          autoCorrect={false}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          {...sisa}
        />
        {rahasia && (
          <TouchableOpacity onPress={() => setTampil((t) => !t)} style={gaya.lihat}>
            <Text style={gaya.teksLihat}>{tampil ? 'Sembunyi' : 'Lihat'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {!!galat && <Text style={gaya.teksGalat}>{galat}</Text>}
    </View>
  );
}

const gaya = StyleSheet.create({
  wadah: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: '600', color: WARNA.teks, marginBottom: 6 },
  kotak: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WARNA.putih,
    borderWidth: 1,
    borderColor: WARNA.garis,
    borderRadius: RADIUS.md,
  },
  kotakGalat: { borderColor: WARNA.salah },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, color: WARNA.teks },
  banyakBaris: { minHeight: 96 },
  lihat: { paddingHorizontal: 12, paddingVertical: 8 },
  teksLihat: { color: WARNA.utama, fontWeight: '600', fontSize: 13 },
  teksGalat: { color: WARNA.salah, fontSize: 12, marginTop: 4 },
});
