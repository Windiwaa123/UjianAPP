import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RADIUS, WARNA } from '../theme';

// Tabel soal benar/salah dengan tiga kolom: Pernyataan | Benar | Salah.
// Siswa mencentang satu kotak pada setiap baris. Ketuk kotak yang sama sekali lagi untuk mengosongkan.
//   pernyataan : [{ teks }]
//   jawaban    : { indeks: true | false }   (true = Benar)
//   onUbah     : (jawabanBaru) => void
function Kotak({ aktif, warna, onPress, label }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: aktif }}
      accessibilityLabel={label}
      style={[gaya.kotak, aktif && { backgroundColor: warna, borderColor: warna }]}
    >
      {aktif && <Text style={gaya.centang}>✓</Text>}
    </TouchableOpacity>
  );
}

export default function TabelBenarSalah({ pernyataan, jawaban, onUbah }) {
  const j = jawaban || {};

  const pilih = (i, nilai) => {
    const baru = { ...j };
    if (baru[i] === nilai) delete baru[i];
    else baru[i] = nilai;
    onUbah(baru);
  };

  return (
    <View style={gaya.tabel}>
      <View style={gaya.kepala}>
        <Text style={[gaya.teksKepala, { flex: 1, textAlign: 'left' }]}>Pernyataan</Text>
        <Text style={[gaya.teksKepala, gaya.kolomTeks, { color: '#BBF7D0' }]}>Benar</Text>
        <Text style={[gaya.teksKepala, gaya.kolomTeks, { color: '#FECACA' }]}>Salah</Text>
      </View>
      {pernyataan.map((p, i) => (
        <View key={i} style={[gaya.baris, i % 2 === 1 && gaya.barisGenap, i === pernyataan.length - 1 && gaya.barisAkhir]}>
          <Text style={gaya.teks}>
            {i + 1}. {p.teks}
          </Text>
          <View style={gaya.kolom}>
            <Kotak aktif={j[i] === true} warna={WARNA.benar} onPress={() => pilih(i, true)} label={`Benar untuk pernyataan ${i + 1}`} />
          </View>
          <View style={gaya.kolom}>
            <Kotak aktif={j[i] === false} warna={WARNA.salah} onPress={() => pilih(i, false)} label={`Salah untuk pernyataan ${i + 1}`} />
          </View>
        </View>
      ))}
    </View>
  );
}

const gaya = StyleSheet.create({
  tabel: {
    borderWidth: 1,
    borderColor: WARNA.garis,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: WARNA.putih,
  },
  kepala: { flexDirection: 'row', alignItems: 'center', backgroundColor: WARNA.utama, paddingVertical: 10, paddingHorizontal: 12 },
  teksKepala: { fontSize: 13, fontWeight: '800', color: WARNA.putih, textAlign: 'center' },
  kolom: { width: 62, alignItems: 'center', justifyContent: 'center' },
  kolomTeks: { width: 62, textAlign: 'center' },
  baris: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: WARNA.garis,
  },
  barisGenap: { backgroundColor: WARNA.latar },
  barisAkhir: { borderBottomWidth: 0 },
  teks: { flex: 1, fontSize: 15, lineHeight: 21, color: WARNA.teks, paddingRight: 8 },
  kotak: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: WARNA.garis,
    backgroundColor: WARNA.putih,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centang: { color: WARNA.putih, fontSize: 18, fontWeight: '900', marginTop: -1 },
});
