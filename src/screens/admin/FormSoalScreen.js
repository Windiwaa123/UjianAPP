import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FormWadah from '../../components/FormWadah';
import Input from '../../components/Input';
import Tombol from '../../components/Tombol';
import ChipPilihan from '../../components/ChipPilihan';
import GambarSoal from '../../components/GambarSoal';
import dataService from '../../services/dataService';
import { hapusGambar, simpanGambar } from '../../services/gambarService';
import { ambilDariGaleri, ambilDariKamera } from '../../utils/pilihGambar';
import { info } from '../../utils/dialog';
import { HURUF } from '../../utils/format';
import { infoJenis } from '../../utils/jenisSoal';
import { RADIUS, WARNA } from '../../theme';

const PERNYATAAN_AWAL = [
  { teks: '', benar: true },
  { teks: '', benar: false },
  { teks: '', benar: true },
];

const PASANGAN_AWAL = [
  { kiri: '', kanan: '' },
  { kiri: '', kanan: '' },
  { kiri: '', kanan: '' },
];

export default function FormSoalScreen({ navigation, route }) {
  const { babId, jenis, soalId } = route.params;
  const infoJ = infoJenis(jenis);

  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [memprosesGambar, setMemprosesGambar] = useState(false);
  const [teks, setTeks] = useState('');
  const [pilihan, setPilihan] = useState(['', '', '', '']);
  const [kunci, setKunci] = useState(null); // PG: angka. PGK: array angka
  const [pasangan, setPasangan] = useState(PASANGAN_AWAL);
  const [kunciIsian, setKunciIsian] = useState('');
  const [pernyataan, setPernyataan] = useState(PERNYATAAN_AWAL);
  const [kelas, setKelas] = useState([]);
  const [kelasIds, setKelasIds] = useState([]); // kosong = semua kelas
  const [gambar, setGambar] = useState(null); // nama file gambar

  // File gambar yang dibuat selama form ini terbuka (belum tentu jadi disimpan)
  const baruRef = useRef([]);
  const tersimpanRef = useRef(false);

  useEffect(() => {
    (async () => {
      setKelas(await dataService.ambilSemuaKelas());
      if (jenis === 'pgk') setKunci([]);
      if (soalId) {
        const s = await dataService.ambilSoal(soalId);
        if (s) {
          setTeks(s.teks);
          setKelasIds(s.kelasIds || []);
          setGambar(s.gambar || null);
          if (s.pilihan) setPilihan(s.pilihan);
          if (s.kunci !== undefined && (jenis === 'pg' || jenis === 'pgk')) setKunci(s.kunci);
          if (s.pasangan) setPasangan(s.pasangan);
          if (jenis === 'isian') setKunciIsian((s.kunci || []).join('\n'));
          if (s.pernyataan) setPernyataan(s.pernyataan.map((p) => ({ teks: p.teks, benar: !!p.benar })));
        }
      }
      setMemuat(false);
    })();
  }, [soalId, jenis]);

  // Jika form ditutup tanpa menyimpan, buang file gambar yang baru dibuat
  useEffect(
    () => () => {
      if (!tersimpanRef.current) baruRef.current.forEach((n) => hapusGambar(n));
    },
    []
  );

  const ubahPilihan = (i, nilai) => setPilihan((lama) => lama.map((p, idx) => (idx === i ? nilai : p)));
  const ubahPernyataan = (i, perubahan) =>
    setPernyataan((lama) => lama.map((p, idx) => (idx === i ? { ...p, ...perubahan } : p)));
  const ubahPasangan = (i, sisi, nilai) =>
    setPasangan((lama) => lama.map((p, idx) => (idx === i ? { ...p, [sisi]: nilai } : p)));

  const pilihKelas = (kunciChip) => {
    if (kunciChip === 'semua') {
      setKelasIds([]);
      return;
    }
    setKelasIds((lama) => (lama.includes(kunciChip) ? lama.filter((k) => k !== kunciChip) : [...lama, kunciChip]));
  };

  const pilihGambar = async (sumber) => {
    setMemprosesGambar(true);
    try {
      const uri = sumber === 'kamera' ? await ambilDariKamera() : await ambilDariGaleri();
      if (!uri) return;
      const nama = await simpanGambar(uri);
      // Gambar pengganti: buang gambar sementara sebelumnya yang belum disimpan ke soal
      if (gambar && baruRef.current.includes(gambar)) {
        await hapusGambar(gambar);
        baruRef.current = baruRef.current.filter((n) => n !== gambar);
      }
      baruRef.current.push(nama);
      setGambar(nama);
    } catch (e) {
      info('Gambar belum bisa dipakai', e.message || 'Terjadi kesalahan saat memilih gambar.');
    } finally {
      setMemprosesGambar(false);
    }
  };

  const lepasGambar = async () => {
    if (gambar && baruRef.current.includes(gambar)) {
      await hapusGambar(gambar);
      baruRef.current = baruRef.current.filter((n) => n !== gambar);
    }
    // Gambar milik soal yang sudah tersimpan baru dihapus filenya saat soal disimpan
    setGambar(null);
  };

  const simpan = async () => {
    setMenyimpan(true);
    try {
      const data = { babId, jenis, teks, kelasIds, gambar, pilihan, kunci, pasangan, pernyataan };
      if (jenis === 'isian') data.kunci = kunciIsian;
      if (soalId) await dataService.ubahSoal(soalId, data);
      else await dataService.tambahSoal(data);
      tersimpanRef.current = true;
      // Buang gambar sementara yang tidak jadi dipakai
      baruRef.current.filter((n) => n !== gambar).forEach((n) => hapusGambar(n));
      navigation.goBack();
    } catch (e) {
      info('Soal belum lengkap', e.message);
      setMenyimpan(false);
    }
  };

  if (memuat) {
    return (
      <FormWadah edges={['bottom', 'left', 'right']}>
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={WARNA.utama} />
      </FormWadah>
    );
  }

  const itemKelas = [{ kunci: 'semua', label: 'Semua kelas' }, ...kelas.map((k) => ({ kunci: k.id, label: k.nama }))];
  const kunciPgk = Array.isArray(kunci) ? kunci : [];

  const togglePgk = (i) =>
    setKunci(kunciPgk.includes(i) ? kunciPgk.filter((x) => x !== i) : [...kunciPgk, i].sort());

  return (
    <FormWadah edges={['bottom', 'left', 'right']}>
      <View style={gaya.kotakJenis}>
        <Text style={gaya.teksJenis}>{infoJ.label}</Text>
        <Text style={gaya.petunjukJenis}>{infoJ.petunjuk}</Text>
      </View>

      <Text style={gaya.label}>Soal ini untuk kelas</Text>
      <ChipPilihan
        item={itemKelas}
        aktif={(k) => (k === 'semua' ? kelasIds.length === 0 : kelasIds.includes(k))}
        onPilih={pilihKelas}
      />
      <Text style={gaya.petunjuk}>
        {kelas.length === 0
          ? 'Belum ada kelas, jadi soal ini berlaku untuk semua siswa. Buat kelas di menu Kelola Kelas.'
          : 'Pilih satu atau lebih kelas. "Semua kelas" berarti soal muncul di ujian seluruh siswa.'}
      </Text>

      <Input
        label="Teks soal"
        value={teks}
        onChangeText={setTeks}
        placeholder="Tulis pertanyaan di sini"
        multiline
        autoCapitalize="sentences"
        autoCorrect
      />

      <Text style={gaya.label}>Gambar soal (opsional)</Text>
      {gambar ? (
        <GambarSoal nama={gambar} tinggi={180} style={{ marginBottom: 10 }} />
      ) : (
        <Text style={gaya.petunjuk}>Belum ada gambar. Tambahkan jika soal memerlukan gambar, grafik, atau diagram.</Text>
      )}
      <View style={gaya.barisGambar}>
        <Tombol
          kecil
          varian="sekunder"
          judul={gambar ? 'Ganti dari galeri' : 'Pilih dari galeri'}
          onPress={() => pilihGambar('galeri')}
          disabled={memprosesGambar}
          style={{ marginRight: 8, marginBottom: 8 }}
        />
        <Tombol
          kecil
          varian="sekunder"
          judul="Ambil foto"
          onPress={() => pilihGambar('kamera')}
          disabled={memprosesGambar}
          style={{ marginRight: 8, marginBottom: 8 }}
        />
        {!!gambar && (
          <Tombol kecil varian="bahaya" judul="Hapus gambar" onPress={lepasGambar} disabled={memprosesGambar} style={{ marginBottom: 8 }} />
        )}
      </View>
      {memprosesGambar && <ActivityIndicator color={WARNA.utama} style={{ marginBottom: 12 }} />}
      <View style={{ height: 8 }} />

      {/* ---- Pilihan ganda & pilihan ganda kompleks ---- */}
      {(jenis === 'pg' || jenis === 'pgk') && (
        <>
          {HURUF.map((h, i) => (
            <Input
              key={h}
              label={`Pilihan ${h}`}
              value={pilihan[i]}
              onChangeText={(v) => ubahPilihan(i, v)}
              placeholder={`Jawaban ${h}`}
              autoCapitalize="sentences"
            />
          ))}
          <Text style={gaya.label}>{jenis === 'pg' ? 'Kunci jawaban' : 'Kunci jawaban (pilih minimal 2)'}</Text>
          <View style={gaya.barisKunci}>
            {HURUF.map((h, i) => {
              const aktif = jenis === 'pg' ? kunci === i : kunciPgk.includes(i);
              return (
                <TouchableOpacity
                  key={h}
                  style={[gaya.kunci, aktif && gaya.kunciAktif]}
                  onPress={() => (jenis === 'pg' ? setKunci(i) : togglePgk(i))}
                >
                  <Text style={[gaya.teksKunci, aktif && { color: WARNA.putih }]}>{h}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {jenis === 'pgk' && (
            <Text style={[gaya.petunjuk, { marginTop: -12 }]}>
              Siswa dianggap benar hanya jika semua jawaban benar dipilih dan tidak ada yang salah dipilih.
            </Text>
          )}
        </>
      )}

      {/* ---- Menjodohkan ---- */}
      {jenis === 'jodoh' && (
        <>
          <Text style={gaya.label}>Pasangan (kiri dan kanan yang benar)</Text>
          <Text style={gaya.petunjuk}>
            Isi tiap baris dengan pasangan yang benar. Saat ujian, kotak kanan diacak otomatis. Isi kotak kanan tidak boleh
            ada yang sama.
          </Text>
          {pasangan.map((p, i) => (
            <View key={i} style={gaya.barisPasangan}>
              <Input
                style={{ flex: 1, marginRight: 8, marginBottom: 0 }}
                value={p.kiri}
                onChangeText={(v) => ubahPasangan(i, 'kiri', v)}
                placeholder={`Kiri ${i + 1}`}
                autoCapitalize="sentences"
              />
              <Input
                style={{ flex: 1, marginBottom: 0 }}
                value={p.kanan}
                onChangeText={(v) => ubahPasangan(i, 'kanan', v)}
                placeholder={`Kanan ${i + 1}`}
                autoCapitalize="sentences"
              />
            </View>
          ))}
          <View style={gaya.barisGambar}>
            <Tombol
              kecil
              varian="sekunder"
              judul="Tambah pasangan"
              disabled={pasangan.length >= 6}
              onPress={() => setPasangan([...pasangan, { kiri: '', kanan: '' }])}
              style={{ marginRight: 8, marginBottom: 16 }}
            />
            <Tombol
              kecil
              varian="sekunder"
              judul="Kurangi pasangan"
              disabled={pasangan.length <= 2}
              onPress={() => setPasangan(pasangan.slice(0, -1))}
              style={{ marginBottom: 16 }}
            />
          </View>
          <Text style={[gaya.petunjuk, { marginTop: -8 }]}>
            Minimal 2 dan maksimal 6 pasangan. Nilai soal dihitung dari jumlah pasangan yang benar.
          </Text>
        </>
      )}

      {/* ---- Isian singkat ---- */}
      {jenis === 'isian' && (
        <>
          <Input
            label="Jawaban yang benar"
            value={kunciIsian}
            onChangeText={setKunciIsian}
            placeholder={'Contoh:\n8\ndelapan'}
            multiline
            autoCapitalize="none"
          />
          <Text style={[gaya.petunjuk, { marginTop: -6 }]}>
            Tulis satu jawaban per baris jika ada lebih dari satu jawaban yang diterima. Huruf besar/kecil dan spasi
            berlebih diabaikan. Bilangan dibandingkan sebagai angka (3,5 sama dengan 3.5).
          </Text>
        </>
      )}

      {/* ---- Benar / Salah ---- */}
      {jenis === 'bs' && (
        <>
          <Text style={gaya.label}>Pernyataan dan kuncinya</Text>
          <Text style={gaya.petunjuk}>
            Tulis tiap pernyataan, lalu tandai kuncinya Benar atau Salah. Siswa akan melihat tabel dengan tiga kolom
            (Pernyataan, Benar, Salah) dan mencentang sendiri. Nilai soal dihitung dari jumlah pernyataan yang dijawab
            benar.
          </Text>
          {pernyataan.map((p, i) => (
            <View key={i} style={gaya.kotakPernyataan}>
              <Input
                label={`Pernyataan ${i + 1}`}
                value={p.teks}
                onChangeText={(v) => ubahPernyataan(i, { teks: v })}
                placeholder="Tulis pernyataan di sini"
                multiline
                autoCapitalize="sentences"
                style={{ marginBottom: 8 }}
              />
              <View style={gaya.barisKunciBs}>
                <Text style={gaya.labelKunciBs}>Kunci:</Text>
                <TouchableOpacity
                  style={[gaya.pilBs, p.benar && { backgroundColor: WARNA.benar, borderColor: WARNA.benar }]}
                  onPress={() => ubahPernyataan(i, { benar: true })}
                >
                  <Text style={[gaya.teksPilBs, p.benar && { color: WARNA.putih }]}>✓ Benar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[gaya.pilBs, !p.benar && { backgroundColor: WARNA.salah, borderColor: WARNA.salah }]}
                  onPress={() => ubahPernyataan(i, { benar: false })}
                >
                  <Text style={[gaya.teksPilBs, !p.benar && { color: WARNA.putih }]}>✗ Salah</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <View style={gaya.barisGambar}>
            <Tombol
              kecil
              varian="sekunder"
              judul="Tambah pernyataan"
              disabled={pernyataan.length >= 8}
              onPress={() => setPernyataan([...pernyataan, { teks: '', benar: true }])}
              style={{ marginRight: 8, marginBottom: 16 }}
            />
            <Tombol
              kecil
              varian="sekunder"
              judul="Kurangi pernyataan"
              disabled={pernyataan.length <= 2}
              onPress={() => setPernyataan(pernyataan.slice(0, -1))}
              style={{ marginBottom: 16 }}
            />
          </View>
          <Text style={[gaya.petunjuk, { marginTop: -8 }]}>Minimal 2 dan maksimal 8 pernyataan.</Text>
        </>
      )}

      <Tombol judul={soalId ? 'Simpan Perubahan' : 'Simpan Soal'} onPress={simpan} memuat={menyimpan} disabled={memprosesGambar} />
    </FormWadah>
  );
}

const gaya = StyleSheet.create({
  kotakJenis: { backgroundColor: WARNA.terang, borderRadius: RADIUS.md, padding: 12, marginBottom: 16 },
  teksJenis: { fontSize: 15, fontWeight: '800', color: WARNA.utamaGelap },
  petunjukJenis: { fontSize: 12, color: WARNA.abu, marginTop: 2, lineHeight: 17 },
  label: { fontSize: 14, fontWeight: '600', color: WARNA.teks, marginBottom: 8 },
  petunjuk: { fontSize: 12, color: WARNA.abu, lineHeight: 17, marginBottom: 14 },
  barisGambar: { flexDirection: 'row', flexWrap: 'wrap' },
  barisKunci: { flexDirection: 'row', marginBottom: 24 },
  barisPasangan: { flexDirection: 'row', marginBottom: 10 },
  kotakPernyataan: {
    backgroundColor: WARNA.putih,
    borderWidth: 1,
    borderColor: WARNA.garis,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 12,
  },
  barisKunciBs: { flexDirection: 'row', alignItems: 'center' },
  labelKunciBs: { fontSize: 13, fontWeight: '700', color: WARNA.abu, marginRight: 10 },
  pilBs: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: WARNA.garis,
    backgroundColor: WARNA.putih,
    marginRight: 8,
  },
  teksPilBs: { fontSize: 13, fontWeight: '800', color: WARNA.abu },
  kunci: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: WARNA.utama,
    borderRadius: RADIUS.md,
    marginRight: 8,
    backgroundColor: WARNA.putih,
  },
  kunciAktif: { backgroundColor: WARNA.utama },
  teksKunci: { fontSize: 16, fontWeight: '700', color: WARNA.utama },
});
