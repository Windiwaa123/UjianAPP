import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Kartu from './Kartu';
import GambarSoal from './GambarSoal';
import Lencana from './Lencana';
import { HURUF } from '../utils/format';
import { infoJenis } from '../utils/jenisSoal';
import { WARNA } from '../theme';

// Satu baris pembahasan di layar hasil siswa.
// Kunci jawaban TIDAK ditampilkan (dan memang tidak tersimpan di hasil): siswa hanya melihat jawabannya
// sendiri beserta tanda benar/salah, karena bab boleh dikerjakan ulang.
export default function RincianJawaban({ r, nomor }) {
  const tipe = r.tipe || 'pg';
  const poin = r.poin || 0;
  const penuh = poin >= 1;
  const warnaHasil = !r.terjawab || !penuh ? WARNA.salah : WARNA.benar;
  const j = infoJenis(tipe);
  const sebagian = r.terjawab && poin > 0 && poin < 1;

  return (
    <Kartu style={{ borderLeftWidth: 5, borderLeftColor: penuh ? WARNA.benar : sebagian ? WARNA.aksen : WARNA.salah }}>
      <View style={gaya.atas}>
        <Lencana teks={`${j.ikon} ${j.singkat}`} warna={j.warna} latar={j.warnaLatar} />
        <Text style={[gaya.status, { color: penuh ? WARNA.benar : sebagian ? WARNA.peringatan : WARNA.salah }]}>
          {penuh ? '✓ Benar' : sebagian ? '◐ Sebagian benar' : r.terjawab ? '✗ Salah' : '– Kosong'}
        </Text>
      </View>
      <Text style={gaya.soal}>
        {nomor}. {r.teks}
      </Text>
      <GambarSoal nama={r.gambar} tinggi={160} style={{ marginTop: 8, marginBottom: 4 }} />

      {tipe === 'pg' && (
        <Text style={[gaya.baris, { color: warnaHasil }]}>
          Jawaban Anda: {r.jawaban === null ? '(tidak dijawab)' : `${HURUF[r.jawaban]}. ${r.pilihan[r.jawaban]}`}
        </Text>
      )}

      {tipe === 'pgk' && (
        <Text style={[gaya.baris, { color: warnaHasil }]}>
          Jawaban Anda:{' '}
          {r.jawaban === null ? '(tidak dijawab)' : r.jawaban.map((i) => `${HURUF[i]}. ${r.pilihan[i]}`).join('; ')}
        </Text>
      )}

      {tipe === 'jodoh' && (
        <View style={{ marginTop: 6 }}>
          {r.pasangan.map((p, i) => {
            const pilih = r.jawaban ? r.jawaban[i] : undefined;
            const benar = r.benarPasangan ? !!r.benarPasangan[i] : pilih === i;
            return (
              <Text key={i} style={[gaya.baris, { color: benar ? WARNA.benar : WARNA.salah, marginTop: 3 }]}>
                {benar ? '✓' : '✗'} {p.kiri} → {pilih === undefined ? '(tidak dijodohkan)' : r.pasangan[pilih].kanan}
              </Text>
            );
          })}
          {r.terjawab && (
            <Text style={gaya.poin}>
              Pasangan benar: {Math.round(poin * r.pasangan.length)} dari {r.pasangan.length}
            </Text>
          )}
        </View>
      )}

      {tipe === 'bs' && (
        <View style={{ marginTop: 6 }}>
          {r.pernyataan.map((p, i) => {
            const pilih = r.jawaban ? r.jawaban[i] : undefined;
            const benar = r.benarPernyataan ? !!r.benarPernyataan[i] : false;
            return (
              <Text key={i} style={[gaya.baris, { color: benar ? WARNA.benar : WARNA.salah, marginTop: 3 }]}>
                {benar ? '✓' : '✗'} {p.teks} — Jawaban Anda:{' '}
                {typeof pilih !== 'boolean' ? '(kosong)' : pilih ? 'Benar' : 'Salah'}
              </Text>
            );
          })}
          {r.terjawab && (
            <Text style={gaya.poin}>
              Pernyataan benar: {Math.round(poin * r.pernyataan.length)} dari {r.pernyataan.length}
            </Text>
          )}
        </View>
      )}

      {tipe === 'isian' && (
        <Text style={[gaya.baris, { color: warnaHasil }]}>
          Jawaban Anda: {r.jawaban === null ? '(tidak dijawab)' : r.jawaban}
        </Text>
      )}

      {tipe === 'uraian' && (
        <Text style={gaya.poin}>Soal uraian dari versi lama{r.skor != null ? ` - skor ${r.skor} dari 100` : ''}.</Text>
      )}
    </Kartu>
  );
}

const gaya = StyleSheet.create({
  atas: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  status: { fontSize: 12, fontWeight: '800' },
  soal: { fontSize: 15, fontWeight: '600', color: WARNA.teks, lineHeight: 21 },
  baris: { fontSize: 14, marginTop: 6, lineHeight: 20 },
  poin: { fontSize: 12, color: WARNA.abu, marginTop: 6 },
});
