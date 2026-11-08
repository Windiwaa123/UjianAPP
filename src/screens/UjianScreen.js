import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Layar from '../components/Layar';
import Tombol from '../components/Tombol';
import Lencana from '../components/Lencana';
import GambarSoal from '../components/GambarSoal';
import SoalPengerjaan from '../components/SoalPengerjaan';
import { useAuth } from '../context/AuthContext';
import dataService from '../services/dataService';
import { acakArray, formatWaktu } from '../utils/format';
import { JENIS_SOAL, infoJenis } from '../utils/jenisSoal';
import { adaJawaban } from '../utils/penilaian';
import { BAYANGAN, RADIUS, WARNA } from '../theme';

export default function UjianScreen({ navigation, route }) {
  const { pengguna } = useAuth();
  const babId = route.params?.babId;

  const [siap, setSiap] = useState(false);
  const [daftarSoal, setDaftarSoal] = useState([]);
  const [indeks, setIndeks] = useState(0);
  const [jawaban, setJawaban] = useState({});
  const [sisaDetik, setSisaDetik] = useState(0);
  const [mengirim, setMengirim] = useState(false);
  const [babNama, setBabNama] = useState('');
  const [urutanKanan, setUrutanKanan] = useState({}); // urutan acak kotak kanan untuk soal menjodohkan
  const [gulirAktif, setGulirAktif] = useState(true);

  // Ref dipakai agar timer dan auto-submit selalu membaca data terbaru
  const soalRef = useRef([]);
  const jawabanRef = useRef({});
  const pengaturanRef = useRef(null);
  const akhirRef = useRef(0); // waktu berakhir (ms)
  const mulaiRef = useRef(0); // waktu mulai (ms)
  const selesaiRef = useRef(false); // true jika jawaban sudah dikumpulkan
  const autoDipicuRef = useRef(false);
  const kelasRef = useRef(null); // kelas siswa saat ujian dikerjakan
  const babRef = useRef(null);

  // ---- Muat soal & pengaturan, lalu mulai hitung mundur ----
  useEffect(() => {
    let aktif = true;
    (async () => {
      try {
        const [pengaturan, ujian] = await Promise.all([
          dataService.ambilPengaturan(),
          dataService.ambilUjianBab(pengguna.id, babId), // menolak jika bab masih terkunci
        ]);
        if (!aktif) return;
        kelasRef.current = ujian.kelas;
        babRef.current = { ...ujian.bab, mapelNama: ujian.mapelNama };
        // Urutan: per jenis soal (PG, PGK, Menjodohkan, Isian, Benar/Salah). Pengacakan hanya di dalam satu jenis.
        const susunan = pengaturan.acakSoal
          ? JENIS_SOAL.flatMap((j) => acakArray(ujian.soal.filter((q) => q.jenis === j.kunci)))
          : ujian.soal;
        const kanan = {};
        susunan
          .filter((q) => q.jenis === 'jodoh')
          .forEach((q) => {
            const asli = q.pasangan.map((_, i) => i);
            let acak = acakArray(asli);
            for (let t = 0; t < 5 && asli.length > 1 && acak.every((v, i) => v === i); t++) acak = acakArray(asli);
            kanan[q.id] = acak;
          });
        pengaturanRef.current = { ...pengaturan, durasiMenit: ujian.durasiMenit };
        soalRef.current = susunan;
        mulaiRef.current = Date.now();
        akhirRef.current = Date.now() + ujian.durasiMenit * 60 * 1000;
        setBabNama(ujian.mapelNama ? `${ujian.mapelNama} - ${ujian.bab.nama}` : ujian.bab.nama);
        setUrutanKanan(kanan);
        setDaftarSoal(susunan);
        setSisaDetik(ujian.durasiMenit * 60);
        setSiap(true);
      } catch (e) {
        if (!aktif) return;
        selesaiRef.current = true; // tidak ada ujian yang berjalan, jadi tombol kembali boleh dipakai
        Alert.alert('Ujian belum bisa dimulai', e.message || 'Terjadi kesalahan.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    })();
    return () => {
      aktif = false;
    };
  }, [navigation, pengguna.id, babId]);

  // Nomor urut (mulai 0) soal yang belum dijawab sama sekali. Hanya membaca ref, jadi selalu terbaru.
  const soalBelumDijawab = () =>
    soalRef.current.map((q, i) => (adaJawaban(q, jawabanRef.current[q.id]) ? -1 : i)).filter((i) => i >= 0);

  // Pengumpulan manual ditolak selama masih ada soal kosong
  const tolakKarenaKosong = (belum) => {
    const daftarNomor = belum.slice(0, 15).map((i) => i + 1).join(', ') + (belum.length > 15 ? ', ...' : '');
    Alert.alert(
      'Belum bisa dikumpulkan',
      `Masih ada ${belum.length} soal yang belum dijawab sama sekali (nomor ${daftarNomor}). Jawab semua soal terlebih dahulu.`,
      [
        { text: `Ke soal ${belum[0] + 1}`, onPress: () => setIndeks(belum[0]) },
        { text: 'Tutup', style: 'cancel' },
      ]
    );
  };

  // ---- Kumpulkan jawaban: hitung nilai, simpan, lalu tampilkan hasil ----
  // otomatis = true hanya saat waktu habis: saat itu jawaban tetap dikumpulkan walau ada soal kosong
  const kumpulkan = useCallback(
    async (otomatis = false) => {
      if (selesaiRef.current) return;
      if (!otomatis) {
        const belum = soalBelumDijawab();
        if (belum.length > 0) {
          tolakKarenaKosong(belum);
          return;
        }
      }
      selesaiRef.current = true;
      setMengirim(true);
      try {
        const pg = pengaturanRef.current;
        const penilaian = dataService.nilaiJawaban(soalRef.current, jawabanRef.current, pg.kkm);
        const terpakai = Math.round((Date.now() - mulaiRef.current) / 1000);
        const hasil = await dataService.simpanHasil({
          siswaId: pengguna.id,
          nama: pengguna.nama,
          username: pengguna.username,
          babId: babRef.current.id,
          babNama: babRef.current.nama,
          mapelNama: babRef.current.mapelNama || null,
          kelasId: kelasRef.current ? kelasRef.current.id : null,
          kelasNama: kelasRef.current ? kelasRef.current.nama : null,
          ...penilaian,
          kkm: pg.kkm,
          durasiDetik: Math.min(terpakai, pg.durasiMenit * 60),
          otomatis,
        });
        navigation.replace('Hasil', { hasilId: hasil.id });
      } catch (e) {
        selesaiRef.current = false;
        setMengirim(false);
        Alert.alert('Gagal menyimpan', e.message || 'Jawaban belum tersimpan. Tekan tombol Kumpulkan untuk mencoba lagi.');
      }
    },
    [navigation, pengguna]
  );

  // ---- Timer: dihitung dari waktu berakhir agar tetap akurat ----
  useEffect(() => {
    if (!siap) return undefined;
    const hitung = () => {
      const sisa = Math.max(0, Math.ceil((akhirRef.current - Date.now()) / 1000));
      setSisaDetik(sisa);
      if (sisa <= 0 && !autoDipicuRef.current) {
        autoDipicuRef.current = true;
        kumpulkan(true); // auto-submit saat waktu habis
      }
    };
    hitung();
    const id = setInterval(hitung, 1000);
    return () => clearInterval(id);
  }, [siap, kumpulkan]);

  // ---- Kunci ujian: tombol kembali Android & gesture kembali diblokir ----
  useEffect(() => {
    const langganan = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!selesaiRef.current) {
        Alert.alert('Ujian sedang berlangsung', 'Tombol kembali dikunci. Selesaikan ujian dan kumpulkan jawaban Anda.');
      }
      return true;
    });
    const lepas = navigation.addListener('beforeRemove', (e) => {
      if (selesaiRef.current) return;
      e.preventDefault();
      Alert.alert('Ujian sedang berlangsung', 'Anda tidak dapat meninggalkan ujian sebelum jawaban dikumpulkan.');
    });
    return () => {
      langganan.remove();
      lepas();
    };
  }, [navigation]);

  const ubahJawaban = (soalId, nilai) => {
    const baru = { ...jawabanRef.current, [soalId]: nilai };
    jawabanRef.current = baru;
    setJawaban(baru);
  };

  const konfirmasiKumpul = () => {
    const belum = soalBelumDijawab();
    if (belum.length > 0) {
      tolakKarenaKosong(belum);
      return;
    }
    Alert.alert(
      'Kumpulkan jawaban?',
      'Semua soal sudah dijawab. Setelah dikumpulkan, jawaban tidak dapat diubah.',
      [
        { text: 'Periksa lagi', style: 'cancel' },
        { text: 'Kumpulkan', onPress: () => kumpulkan(false) },
      ]
    );
  };

  if (!siap) {
    return (
      <Layar>
        <View style={gaya.tengah}>
          <ActivityIndicator size="large" color={WARNA.utama} />
          <Text style={gaya.memuat}>Menyiapkan soal...</Text>
        </View>
      </Layar>
    );
  }

  const soal = daftarSoal[indeks];
  const terakhir = indeks === daftarSoal.length - 1;
  const hampirHabis = sisaDetik <= 60;
  const sudahJawab = daftarSoal.filter((q) => adaJawaban(q, jawaban[q.id])).length;
  const jenis = infoJenis(soal.jenis);
  const persen = daftarSoal.length ? Math.round((sudahJawab / daftarSoal.length) * 100) : 0;

  return (
    <Layar>
      {/* Kepala: nama bab, progres, dan timer */}
      <View style={gaya.kepala}>
        <View style={gaya.barisKepala}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={gaya.kepalaJudul} numberOfLines={1}>
              {babNama}
            </Text>
            <Text style={gaya.kepalaKet}>
              Terjawab {sudahJawab} dari {daftarSoal.length}
            </Text>
          </View>
          <View style={[gaya.timer, hampirHabis && gaya.timerBahaya]}>
            <Text style={[gaya.teksTimer, hampirHabis && { color: WARNA.salah }]}>⏱ {formatWaktu(sisaDetik)}</Text>
          </View>
        </View>
        <View style={gaya.jalur}>
          <View style={[gaya.isiJalur, { width: `${persen}%` }]} />
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={gaya.isi}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={gulirAktif}
        >
          {/* Kartu soal */}
          <View style={gaya.kartuSoal}>
            <View style={gaya.barisJenis}>
              <Lencana teks={`${jenis.ikon} ${jenis.label}`} warna={jenis.warna} latar={jenis.warnaLatar} />
              <Text style={gaya.nomor}>
                Soal {indeks + 1}/{daftarSoal.length}
              </Text>
            </View>
            <Text style={gaya.teksSoal}>{soal.teks}</Text>
            <GambarSoal nama={soal.gambar} tinggi={220} style={{ marginBottom: 4 }} />
            <Text style={gaya.petunjukJenis}>👉 {jenis.petunjuk}</Text>
          </View>

          <SoalPengerjaan
            key={soal.id}
            soal={soal}
            jawaban={jawaban[soal.id]}
            onUbah={(nilai) => ubahJawaban(soal.id, nilai)}
            urutanKanan={urutanKanan[soal.id]}
            onSeret={(menyeret) => setGulirAktif(!menyeret)}
          />

          <Text style={gaya.petunjukNav}>Loncat ke soal:</Text>
          <View style={gaya.barisNomor}>
            {daftarSoal.map((s, i) => {
              const terjawab = adaJawaban(s, jawaban[s.id]);
              return (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => setIndeks(i)}
                  style={[gaya.kotakNomor, terjawab && gaya.nomorTerjawab, i === indeks && gaya.nomorAktif]}
                >
                  <Text style={[gaya.teksNomor, terjawab && { color: WARNA.putih }]}>{i + 1}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Kaki: navigasi soal */}
      <View style={gaya.kaki}>
        <Tombol
          judul="‹ Sebelumnya"
          varian="sekunder"
          disabled={indeks === 0 || mengirim}
          onPress={() => setIndeks(indeks - 1)}
          style={{ flex: 1, marginRight: 8 }}
        />
        {terakhir ? (
          <Tombol judul="Kumpulkan ✓" onPress={konfirmasiKumpul} memuat={mengirim} style={{ flex: 1, marginLeft: 8 }} />
        ) : (
          <Tombol
            judul="Berikutnya ›"
            onPress={() => setIndeks(indeks + 1)}
            disabled={mengirim}
            style={{ flex: 1, marginLeft: 8 }}
          />
        )}
      </View>
    </Layar>
  );
}

const gaya = StyleSheet.create({
  tengah: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  memuat: { marginTop: 12, color: WARNA.abu },
  kepala: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: WARNA.putih,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    ...BAYANGAN,
  },
  barisKepala: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  kepalaJudul: { fontSize: 18, fontWeight: '800', color: WARNA.utamaGelap },
  kepalaKet: { fontSize: 12, color: WARNA.abu, marginTop: 2 },
  timer: { backgroundColor: WARNA.terang, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  timerBahaya: { backgroundColor: WARNA.salahLatar },
  teksTimer: { fontSize: 18, fontWeight: '800', color: WARNA.utama, fontVariant: ['tabular-nums'] },
  jalur: { height: 8, borderRadius: 4, backgroundColor: WARNA.terang, overflow: 'hidden' },
  isiJalur: { height: 8, borderRadius: 4, backgroundColor: WARNA.utama },
  isi: { padding: 16, paddingBottom: 24 },
  kartuSoal: {
    backgroundColor: WARNA.putih,
    borderRadius: RADIUS.lg,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: WARNA.garis,
    ...BAYANGAN,
  },
  barisJenis: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  nomor: { fontSize: 12, fontWeight: '700', color: WARNA.abu },
  teksSoal: { fontSize: 18, fontWeight: '600', color: WARNA.teks, lineHeight: 26, marginBottom: 12 },
  petunjukJenis: { fontSize: 12, color: WARNA.abu, lineHeight: 17, marginTop: 4 },
  petunjukNav: { marginTop: 18, marginBottom: 8, fontSize: 13, fontWeight: '700', color: WARNA.abu },
  barisNomor: { flexDirection: 'row', flexWrap: 'wrap' },
  kotakNomor: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: WARNA.garis,
    backgroundColor: WARNA.putih,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  nomorTerjawab: { backgroundColor: WARNA.utama, borderColor: WARNA.utama },
  nomorAktif: { borderColor: WARNA.aksen, borderWidth: 3 },
  teksNomor: { fontWeight: '800', color: WARNA.teks },
  kaki: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: WARNA.putih,
    borderTopWidth: 1,
    borderTopColor: WARNA.garis,
  },
});
