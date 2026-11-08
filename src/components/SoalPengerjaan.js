import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import PapanJodoh from './PapanJodoh';
import TabelBenarSalah from './TabelBenarSalah';
import { HURUF } from '../utils/format';
import { BAYANGAN, RADIUS, WARNA } from '../theme';

// Tampilan jawaban satu soal saat siswa mengerjakan, sesuai jenisnya.
//   jawaban : bentuk jawaban menurut jenis (lihat utils/penilaian.js)
//   onUbah  : (jawabanBaru) => void
export default function SoalPengerjaan({ soal, jawaban, onUbah, urutanKanan, onSeret }) {
  const jenis = soal.jenis || 'pg';

  if (jenis === 'pg') {
    return soal.pilihan.map((p, i) => {
      const dipilih = jawaban === i;
      return (
        <TouchableOpacity
          key={i}
          activeOpacity={0.85}
          style={[gaya.pilihan, dipilih && gaya.pilihanAktif]}
          onPress={() => onUbah(i)}
        >
          <View style={[gaya.bulat, dipilih && gaya.bulatAktif]}>
            <Text style={[gaya.huruf, dipilih && { color: WARNA.putih }]}>{HURUF[i]}</Text>
          </View>
          <Text style={[gaya.teksPilihan, dipilih && gaya.teksPilihanAktif]}>{p}</Text>
        </TouchableOpacity>
      );
    });
  }

  if (jenis === 'pgk') {
    const terpilih = Array.isArray(jawaban) ? jawaban : [];
    const ubah = (i) => {
      const baru = terpilih.includes(i) ? terpilih.filter((x) => x !== i) : [...terpilih, i];
      onUbah(baru.sort());
    };
    return soal.pilihan.map((p, i) => {
      const dipilih = terpilih.includes(i);
      return (
        <TouchableOpacity
          key={i}
          activeOpacity={0.85}
          style={[gaya.pilihan, dipilih && gaya.pilihanAktif]}
          onPress={() => ubah(i)}
        >
          <View style={[gaya.kotakCentang, dipilih && gaya.bulatAktif]}>
            <Text style={[gaya.huruf, dipilih && { color: WARNA.putih }]}>{dipilih ? '✓' : HURUF[i]}</Text>
          </View>
          <Text style={[gaya.teksPilihan, dipilih && gaya.teksPilihanAktif]}>{p}</Text>
        </TouchableOpacity>
      );
    });
  }

  if (jenis === 'jodoh') {
    return (
      <PapanJodoh
        pasangan={soal.pasangan}
        urutanKanan={urutanKanan || soal.pasangan.map((_, i) => i)}
        jawaban={jawaban}
        onUbah={onUbah}
        onSeret={onSeret}
      />
    );
  }

  if (jenis === 'bs') {
    return <TabelBenarSalah pernyataan={soal.pernyataan} jawaban={jawaban} onUbah={onUbah} />;
  }

  // isian singkat
  return (
    <TextInput
      style={gaya.isian}
      value={typeof jawaban === 'string' ? jawaban : ''}
      onChangeText={onUbah}
      placeholder="Ketik jawaban Anda"
      placeholderTextColor={WARNA.abu}
      autoCapitalize="none"
      autoCorrect={false}
      maxLength={100}
    />
  );
}

const gaya = StyleSheet.create({
  pilihan: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WARNA.putih,
    borderWidth: 2,
    borderColor: WARNA.garis,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 10,
  },
  pilihanAktif: { borderColor: WARNA.utama, backgroundColor: WARNA.terang, ...BAYANGAN, shadowOpacity: 0.12 },
  bulat: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: WARNA.utamaMuda,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: WARNA.putih,
  },
  kotakCentang: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: WARNA.utamaMuda,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: WARNA.putih,
  },
  bulatAktif: { backgroundColor: WARNA.utama, borderColor: WARNA.utama },
  huruf: { fontWeight: '800', color: WARNA.utama, fontSize: 16 },
  teksPilihan: { flex: 1, fontSize: 16, color: WARNA.teks, lineHeight: 22 },
  teksPilihanAktif: { fontWeight: '700', color: WARNA.utamaGelap },
  isian: {
    backgroundColor: WARNA.putih,
    borderWidth: 2,
    borderColor: WARNA.garis,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 18,
    color: WARNA.teks,
  },
});
