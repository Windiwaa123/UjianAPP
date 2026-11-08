// Fungsi murni untuk menilai jawaban. Tidak bergantung pada React Native.
//
// Bentuk jawaban siswa menurut jenis soal:
//   pg     : angka indeks pilihan                      contoh 2
//   pgk    : array indeks pilihan                      contoh [0, 2]
//   jodoh  : objek { indeksKiri: indeksKananAsli }     contoh { 0: 1, 1: 0 }
//   isian  : teks                                      contoh "Jakarta"
//   bs     : objek { indeksPernyataan: true | false }  contoh { 0: true, 1: false }  (true = Benar)
//
// KUNCI JAWABAN TIDAK DISIMPAN SEBAGAI TEKS di soal yang dibaca siswa.
// Soal yang dibaca siswa hanya memuat sidik jari (hash) kunci: `kunciHash` dan `garam`.
// Kunci asli ada di koleksi "kunci" yang hanya bisa dibaca admin (lihat firestore.rules).
// pisahKunci() dipakai admin saat menyimpan soal; hitungPoin() dipakai saat menilai jawaban.
// Semua jenis soal dinilai otomatis.

import { sha256Hex } from './hash';

export const normalisasiTeks = (s) =>
  String(s === undefined || s === null ? '' : s)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!]+$/, '');

const keAngka = (s) => {
  const t = normalisasiTeks(s).replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(t) ? parseFloat(t) : null;
};

// Isian dianggap benar jika sama dengan salah satu kunci (huruf besar/kecil dan spasi diabaikan).
// Bilangan dibandingkan sebagai angka, jadi "3,5" sama dengan "3.5".
// (Versi teks biasa, hanya untuk soal lama yang belum memakai hash.)
export function cocokIsian(jawaban, daftarKunci) {
  const j = normalisasiTeks(jawaban);
  if (!j) return false;
  const jn = keAngka(jawaban);
  return (daftarKunci || []).some((k) => {
    if (normalisasiTeks(k) === j) return true;
    const kn = keAngka(k);
    return jn !== null && kn !== null && jn === kn;
  });
}

// ---------- Hash kunci ----------
const hash = (soalId, jenis, nilai, garam) => sha256Hex(`${soalId}|${jenis}|${nilai}|${garam}`);

const buatGaram = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const kunciPgk = (arr) =>
  [...new Set(arr)]
    .filter((i) => Number.isInteger(i))
    .sort((a, b) => a - b)
    .join(',');

// Hash untuk satu jawaban isian: bentuk teks, dan bentuk angka jika berupa bilangan
const hashIsian = (soalId, garam, teks) => {
  const hasil = [hash(soalId, 'isian', `t:${normalisasiTeks(teks)}`, garam)];
  const angka = keAngka(teks);
  if (angka !== null) hasil.push(hash(soalId, 'isian', `n:${angka}`, garam));
  return hasil;
};

const acak = (daftar) => {
  const salinan = [...daftar];
  for (let i = salinan.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [salinan[i], salinan[j]] = [salinan[j], salinan[i]];
  }
  return salinan;
};

// Memisahkan soal yang sudah divalidasi menjadi:
//   publik  : bagian yang boleh dibaca siswa (tanpa kunci)
//   rahasia : kunci asli, disimpan di koleksi "kunci" (hanya admin)
// `soal` berisi kunci/pasangan/pedoman asli seperti hasil validasiSoal.
export function pisahKunci(soalId, soal) {
  const garam = buatGaram();
  switch (soal.jenis) {
    case 'pg':
      return {
        publik: { pilihan: soal.pilihan, garam, kunciHash: hash(soalId, 'pg', soal.kunci, garam) },
        rahasia: { kunci: soal.kunci },
      };
    case 'pgk':
      return {
        publik: { pilihan: soal.pilihan, garam, kunciHash: hash(soalId, 'pgk', kunciPgk(soal.kunci), garam) },
        rahasia: { kunci: soal.kunci },
      };
    case 'jodoh': {
      // Kotak kanan disimpan dengan urutan diacak, supaya urutan data tidak membocorkan pasangannya.
      const n = soal.pasangan.length;
      const kanan = soal.pasangan.map((p) => p.kanan);
      let urutan = acak(kanan.map((_, i) => i));
      for (let t = 0; t < 10 && n > 1 && urutan.every((v, i) => v === i); t++) urutan = acak(kanan.map((_, i) => i));
      // urutan[posisiBaru] = indeks asli. Posisi baru dari pasangan asli i:
      const posisiBaru = {};
      urutan.forEach((asli, p) => {
        posisiBaru[asli] = p;
      });
      return {
        publik: {
          pasangan: soal.pasangan.map((p, i) => ({ kiri: p.kiri, kanan: kanan[urutan[i]] })),
          garam,
          kunciHash: soal.pasangan.map((_, i) => hash(soalId, 'jodoh', `${i}:${posisiBaru[i]}`, garam)),
        },
        rahasia: { pasangan: soal.pasangan },
      };
    }
    case 'isian': {
      const semua = [];
      soal.kunci.forEach((k) => hashIsian(soalId, garam, k).forEach((h) => semua.push(h)));
      return { publik: { garam, kunciHash: [...new Set(semua)] }, rahasia: { kunci: soal.kunci } };
    }
    case 'bs': {
      // Soal publik hanya memuat teks pernyataan. Kunci benar/salah ada di koleksi "kunci".
      const n = soal.pernyataan.length;
      return {
        publik: {
          pernyataan: soal.pernyataan.map((p) => ({ teks: p.teks })),
          garam,
          kunciHash: soal.pernyataan.map((p, i) => hash(soalId, 'bs', `${i}:${p.benar ? 1 : 0}`, garam)),
        },
        rahasia: { pernyataan: soal.pernyataan.slice(0, n).map((p) => ({ teks: p.teks, benar: !!p.benar })) },
      };
    }
    default:
      return { publik: {}, rahasia: {} };
  }
}

// ---------- Memeriksa jawaban ----------
export function adaJawaban(soal, j) {
  switch (soal.jenis || 'pg') {
    case 'pg':
      return Number.isInteger(j);
    case 'pgk':
      return Array.isArray(j) && j.length > 0;
    case 'jodoh':
      return !!j && typeof j === 'object' && Object.keys(j).length > 0;
    case 'isian':
      return typeof j === 'string' && j.trim() !== '';
    case 'bs':
      return !!j && typeof j === 'object' && Object.keys(j).some((k) => typeof j[k] === 'boolean');
    default:
      return false;
  }
}

// Untuk soal menjodohkan: array true/false per pasangan (true = pasangan benar)
export function periksaPasangan(soal, j) {
  const n = soal.pasangan.length;
  const hasil = [];
  for (let i = 0; i < n; i++) {
    const pilih = j ? j[i] : undefined;
    if (pilih === undefined || pilih === null) {
      hasil.push(false);
    } else if (Array.isArray(soal.kunciHash)) {
      hasil.push(hash(soal.id, 'jodoh', `${i}:${pilih}`, soal.garam) === soal.kunciHash[i]);
    } else {
      hasil.push(pilih === i); // soal lama tanpa hash: urutan data = pasangan benar
    }
  }
  return hasil;
}

// Untuk soal benar/salah: array true/false per pernyataan (true = jawaban siswa cocok dengan kunci)
export function periksaPernyataan(soal, j) {
  const hasil = [];
  soal.pernyataan.forEach((p, i) => {
    const pilih = j ? j[i] : undefined;
    if (typeof pilih !== 'boolean') {
      hasil.push(false);
    } else if (Array.isArray(soal.kunciHash)) {
      hasil.push(hash(soal.id, 'bs', `${i}:${pilih ? 1 : 0}`, soal.garam) === soal.kunciHash[i]);
    } else {
      hasil.push(pilih === !!p.benar); // soal tanpa hash (tampilan admin)
    }
  });
  return hasil;
}

// Poin 0 sampai 1. Semua jenis dinilai otomatis.
export function hitungPoin(soal, j) {
  if (!adaJawaban(soal, j)) return 0;
  const berHash = soal.kunciHash !== undefined && soal.kunciHash !== null;
  switch (soal.jenis || 'pg') {
    case 'pg':
      if (berHash) return hash(soal.id, 'pg', j, soal.garam) === soal.kunciHash ? 1 : 0;
      return j === soal.kunci ? 1 : 0;
    case 'pgk': {
      if (berHash) return hash(soal.id, 'pgk', kunciPgk(j), soal.garam) === soal.kunciHash ? 1 : 0;
      const a = [...new Set(j)].sort();
      const b = [...soal.kunci].sort();
      return a.length === b.length && a.every((v, i) => v === b[i]) ? 1 : 0;
    }
    case 'jodoh': {
      const n = soal.pasangan.length;
      const benar = periksaPasangan(soal, j).filter(Boolean).length;
      return n ? benar / n : 0;
    }
    case 'isian':
      if (berHash) {
        const set = new Set(soal.kunciHash);
        return hashIsian(soal.id, soal.garam, j).some((h) => set.has(h)) ? 1 : 0;
      }
      return cocokIsian(j, soal.kunci) ? 1 : 0;
    case 'bs': {
      // Poin sebanding jumlah pernyataan yang dijawab benar (3 dari 4 benar = 0,75 poin)
      const n = soal.pernyataan.length;
      const benar = periksaPernyataan(soal, j).filter(Boolean).length;
      return n ? benar / n : 0;
    }
    default:
      return 0;
  }
}

// Rincian satu soal yang disimpan bersama hasil ujian.
// Kunci jawaban SENGAJA tidak ikut disimpan, supaya tidak terbaca siswa.
export function buatRincian(soal, j) {
  const jenis = soal.jenis || 'pg';
  const terjawab = adaJawaban(soal, j);
  const dasar = { soalId: soal.id, tipe: jenis, teks: soal.teks, gambar: soal.gambar || null, terjawab };
  switch (jenis) {
    case 'pg':
      return { ...dasar, pilihan: soal.pilihan, jawaban: terjawab ? j : null, poin: hitungPoin(soal, j) };
    case 'pgk':
      return {
        ...dasar,
        pilihan: soal.pilihan,
        jawaban: terjawab ? [...new Set(j)].sort() : null,
        poin: hitungPoin(soal, j),
      };
    case 'jodoh':
      return {
        ...dasar,
        pasangan: soal.pasangan,
        jawaban: terjawab ? j : null,
        benarPasangan: periksaPasangan(soal, terjawab ? j : null),
        poin: hitungPoin(soal, j),
      };
    case 'isian':
      return { ...dasar, jawaban: terjawab ? j.trim() : null, poin: hitungPoin(soal, j) };
    case 'bs':
      return {
        ...dasar,
        pernyataan: soal.pernyataan.map((p) => ({ teks: p.teks })),
        jawaban: terjawab ? j : null,
        benarPernyataan: periksaPernyataan(soal, terjawab ? j : null),
        poin: hitungPoin(soal, j),
      };
    default:
      return dasar;
  }
}

// Menghitung nilai satu bab dari rincian. Setiap soal bernilai sama (1 poin), poin soal bisa pecahan
// (menjodohkan dan benar/salah dinilai per pasangan/pernyataan).
// Hasil lama yang masih memuat soal uraian (jenis yang sudah dihapus) dihitung dari skor yang pernah diberikan,
// dan tidak pernah berstatus menunggu.
export function ringkas(rincian, kkm) {
  let benar = 0;
  let salah = 0;
  let kosong = 0;
  let poinTotal = 0;
  rincian.forEach((r) => {
    if (r.tipe === 'uraian') {
      poinTotal += (r.skor || 0) / 100;
      if (!r.terjawab) kosong += 1;
      else if ((r.skor || 0) >= 100) benar += 1;
      else salah += 1;
      return;
    }
    poinTotal += r.poin || 0;
    if (!r.terjawab) kosong += 1;
    else if ((r.poin || 0) >= 1) benar += 1;
    else salah += 1;
  });
  const total = rincian.length;
  const nilai = total ? Math.round((poinTotal / total) * 1000) / 10 : 0;
  return { benar, salah, kosong, total, nilai, status: 'final', lulus: nilai >= kkm };
}
