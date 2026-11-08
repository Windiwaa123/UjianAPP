import React, { useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import Tombol from './Tombol';
import { RADIUS, WARNA } from '../theme';

const BARIS = 64; // tinggi tiap baris (tetap, supaya posisi titik bisa dihitung)
const TITIK = 20;
const WARNA_GARIS = ['#1F6F5C', '#C2410C', '#1D4ED8', '#A21CAF', '#B45309', '#0F766E'];

// Garis lurus dari (x1,y1) ke (x2,y2): sebuah View tipis yang diputar
function Garis({ x1, y1, x2, y2, warna }) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const panjang = Math.sqrt(dx * dx + dy * dy);
  const sudut = Math.atan2(dy, dx);
  return (
    <View
      style={{
        position: 'absolute',
        left: (x1 + x2) / 2 - panjang / 2,
        top: (y1 + y2) / 2 - 1.5,
        width: panjang,
        height: 3,
        borderRadius: 2,
        backgroundColor: warna,
        transform: [{ rotate: `${sudut}rad` }],
      }}
    />
  );
}

// Papan menjodohkan.
//   pasangan    : [{ kiri, kanan }] urutan asli (indeks = pasangan yang benar)
//   urutanKanan : urutan acak tampilan kotak kanan, berisi indeks asli
//   jawaban     : { indeksKiri: indeksKananAsli }
//   onUbah      : (jawabanBaru) => void
//   onSeret     : (sedangMenyeret) => void, untuk mengunci gulir layar saat menarik garis
// Cara pakai: tarik garis dari kotak kiri ke kotak kanan (atau sebaliknya), atau ketuk kiri lalu ketuk kanan.
export default function PapanJodoh({ pasangan, urutanKanan, jawaban, onUbah, onSeret }) {
  const [lebar, setLebar] = useState(0);
  const [pilih, setPilih] = useState(null); // kotak kiri yang sedang dipilih (mode ketuk)
  const [seret, setSeret] = useState(null); // { sisi, baris, x, y } saat jari menarik garis

  const n = pasangan.length;
  const kotakLebar = lebar * 0.36;
  const xKiri = kotakLebar + 14;
  const xKanan = lebar - kotakLebar - 14;
  const yPusat = (b) => b * BARIS + BARIS / 2;
  const posisiKanan = {};
  urutanKanan.forEach((asli, b) => {
    posisiKanan[asli] = b;
  });

  // Ref agar PanResponder (dibuat sekali) selalu membaca nilai terbaru
  const dataRef = useRef({});
  dataRef.current = { lebar, n, urutanKanan, jawaban, onUbah, onSeret, pilih };
  const mulaiRef = useRef(null);
  const digeserRef = useRef(false);

  const sambung = (kiri, asli) => {
    const { jawaban: j, onUbah: ubah } = dataRef.current;
    const baru = {};
    Object.keys(j || {}).forEach((k) => {
      if (j[k] !== asli && Number(k) !== kiri) baru[k] = j[k]; // satu kotak hanya satu garis
    });
    baru[kiri] = asli;
    ubah(baru);
  };

  const lepas = (kiri) => {
    const { jawaban: j, onUbah: ubah } = dataRef.current;
    const baru = { ...(j || {}) };
    delete baru[kiri];
    ubah(baru);
  };

  const ketuk = (sisi, baris) => {
    const { jawaban: j, urutanKanan: u, pilih: dipilih } = dataRef.current;
    if (sisi === 'kiri') {
      if (dipilih === baris) {
        // ketuk dua kali pada kotak yang sama: hapus garisnya
        if (j && j[baris] !== undefined) lepas(baris);
        setPilih(null);
      } else {
        setPilih(baris);
      }
      return;
    }
    const asli = u[baris];
    if (dipilih !== null) {
      sambung(dipilih, asli);
      setPilih(null);
    } else {
      const pemilik = Object.keys(j || {}).find((k) => j[k] === asli);
      if (pemilik !== undefined) setPilih(Number(pemilik));
    }
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const { lebar: w, n: jumlah } = dataRef.current;
        const { locationX: x, locationY: y } = e.nativeEvent;
        mulaiRef.current = {
          x,
          y,
          sisi: x < w / 2 ? 'kiri' : 'kanan',
          baris: Math.min(jumlah - 1, Math.max(0, Math.floor(y / BARIS))),
        };
        digeserRef.current = false;
        dataRef.current.onSeret(true);
      },
      onPanResponderMove: (e, g) => {
        const m = mulaiRef.current;
        if (!m) return;
        if (Math.abs(g.dx) + Math.abs(g.dy) > 8) {
          digeserRef.current = true;
          setSeret({ sisi: m.sisi, baris: m.baris, x: m.x + g.dx, y: m.y + g.dy });
        }
      },
      onPanResponderRelease: (e, g) => {
        const { lebar: w, n: jumlah, urutanKanan: u } = dataRef.current;
        const m = mulaiRef.current;
        dataRef.current.onSeret(false);
        setSeret(null);
        if (!m) return;
        if (!digeserRef.current) {
          ketuk(m.sisi, m.baris);
          return;
        }
        const x = m.x + g.dx;
        const y = m.y + g.dy;
        const sisiAkhir = x < w / 2 ? 'kiri' : 'kanan';
        const barisAkhir = Math.min(jumlah - 1, Math.max(0, Math.floor(y / BARIS)));
        if (sisiAkhir === m.sisi) return;
        const kiri = m.sisi === 'kiri' ? m.baris : barisAkhir;
        const posKanan = m.sisi === 'kiri' ? barisAkhir : m.baris;
        sambung(kiri, u[posKanan]);
        setPilih(null);
      },
      onPanResponderTerminate: () => {
        dataRef.current.onSeret(false);
        setSeret(null);
      },
    })
  ).current;

  const j = jawaban || {};
  const warnaKiri = (i) => WARNA_GARIS[i % WARNA_GARIS.length];

  return (
    <View>
      <View style={{ height: n * BARIS }} onLayout={(e) => setLebar(e.nativeEvent.layout.width)}>
        {lebar > 0 && (
          <>
            {/* Lapisan gambar: tidak menerima sentuhan */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              {Object.keys(j).map((k) => {
                const i = Number(k);
                const b = posisiKanan[j[k]];
                if (b === undefined || i >= n) return null;
                return (
                  <Garis key={`g${k}`} x1={xKiri} y1={yPusat(i)} x2={xKanan} y2={yPusat(b)} warna={warnaKiri(i)} />
                );
              })}
              {seret && (
                <Garis
                  x1={seret.sisi === 'kiri' ? xKiri : xKanan}
                  y1={yPusat(seret.baris)}
                  x2={seret.x}
                  y2={seret.y}
                  warna={WARNA.abu}
                />
              )}

              {pasangan.map((p, i) => {
                const terhubung = j[i] !== undefined;
                const dipilih = pilih === i;
                return (
                  <React.Fragment key={`k${i}`}>
                    <View
                      style={[
                        gaya.kotak,
                        { left: 0, top: i * BARIS + 4, width: kotakLebar },
                        terhubung && { borderColor: warnaKiri(i), borderWidth: 2 },
                        dipilih && gaya.kotakPilih,
                      ]}
                    >
                      <Text style={gaya.teks} numberOfLines={3}>
                        {p.kiri}
                      </Text>
                    </View>
                    <View
                      style={[
                        gaya.titik,
                        { left: xKiri - TITIK / 2, top: yPusat(i) - TITIK / 2 },
                        terhubung ? { backgroundColor: warnaKiri(i), borderColor: warnaKiri(i) } : null,
                        dipilih && gaya.titikPilih,
                      ]}
                    />
                  </React.Fragment>
                );
              })}

              {urutanKanan.map((asli, b) => {
                const pemilik = Object.keys(j).find((k) => j[k] === asli);
                const terhubung = pemilik !== undefined;
                const warna = terhubung ? warnaKiri(Number(pemilik)) : null;
                return (
                  <React.Fragment key={`r${asli}`}>
                    <View
                      style={[
                        gaya.kotak,
                        { right: 0, top: b * BARIS + 4, width: kotakLebar },
                        terhubung && { borderColor: warna, borderWidth: 2 },
                      ]}
                    >
                      <Text style={gaya.teks} numberOfLines={3}>
                        {pasangan[asli].kanan}
                      </Text>
                    </View>
                    <View
                      style={[
                        gaya.titik,
                        { left: xKanan - TITIK / 2, top: yPusat(b) - TITIK / 2 },
                        terhubung ? { backgroundColor: warna, borderColor: warna } : null,
                      ]}
                    />
                  </React.Fragment>
                );
              })}
            </View>

            {/* Lapisan sentuhan di atas semuanya */}
            <View style={StyleSheet.absoluteFill} {...pan.panHandlers} />
          </>
        )}
      </View>
      <Text style={gaya.petunjuk}>
        Tarik garis dari kiri ke kanan, atau ketuk kotak kiri lalu kotak kanan. Ketuk kotak kiri dua kali untuk menghapus
        garisnya.
      </Text>
      {Object.keys(j).length > 0 && (
        <Tombol kecil varian="sekunder" judul="Hapus semua garis" onPress={() => onUbah({})} style={{ alignSelf: 'flex-start' }} />
      )}
    </View>
  );
}

const gaya = StyleSheet.create({
  kotak: {
    position: 'absolute',
    height: BARIS - 8,
    backgroundColor: WARNA.putih,
    borderWidth: 1,
    borderColor: WARNA.garis,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  kotakPilih: { borderColor: WARNA.utamaGelap, borderWidth: 3 },
  teks: { fontSize: 13, color: WARNA.teks, lineHeight: 17 },
  titik: {
    position: 'absolute',
    width: TITIK,
    height: TITIK,
    borderRadius: TITIK / 2,
    borderWidth: 2,
    borderColor: WARNA.abu,
    backgroundColor: WARNA.putih,
  },
  titikPilih: { borderColor: WARNA.utamaGelap, borderWidth: 3 },
  petunjuk: { fontSize: 12, color: WARNA.abu, lineHeight: 17, marginTop: 10, marginBottom: 8 },
});
