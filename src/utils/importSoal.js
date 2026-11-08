// Mengubah isi file Excel (template soal) menjadi daftar soal siap simpan.
// Fungsi murni: tidak memakai React Native maupun Firebase, jadi mudah diuji.
//
// Masukan `sheets` berbentuk { namaSheet: [[sel, sel, ...], ...] } (baris pertama sheet = indeks 0,
// jadi nomor baris Excel = indeks + 1). Sheet yang dikenali (huruf besar/kecil dan spasi diabaikan):
//   PG | PGK | Menjodohkan | Isian | BenarSalah
// Sheet lain (misalnya "Petunjuk") diabaikan.

export const BATAS_BARIS = 500; // maksimal baris yang dibaca per sheet

const norm = (s) =>
  String(s === undefined || s === null ? '' : s)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const teks = (v) => (v === undefined || v === null ? '' : String(v).replace(/\r\n?/g, '\n').trim());

const SHEET_KE_JENIS = {
  pg: 'pg',
  pilihanganda: 'pg',
  pgk: 'pgk',
  pilihangandakompleks: 'pgk',
  menjodohkan: 'jodoh',
  jodoh: 'jodoh',
  isian: 'isian',
  isiansingkat: 'isian',
  benarsalah: 'bs',
  bs: 'bs',
};

export const NAMA_SHEET = { pg: 'PG', pgk: 'PGK', jodoh: 'Menjodohkan', isian: 'Isian', bs: 'BenarSalah' };

const MAKS_PASANGAN = 6;
const MAKS_JAWABAN_ISIAN = 5;
const MAKS_PERNYATAAN = 8;

// Mencari kolom berdasarkan judulnya. `pola` adalah regex terhadap judul yang sudah dinormalkan.
const cariKolom = (peta, pola) => {
  const hasil = peta.find((h) => pola.test(h.nama));
  return hasil ? hasil.indeks : -1;
};

const HURUF_KE_INDEKS = { A: 0, B: 1, C: 2, D: 3, 1: 0, 2: 1, 3: 2, 4: 3 };

function bacaKunciPg(sel) {
  const t = teks(sel).toUpperCase();
  if (!t) throw new Error('Kunci jawaban kosong. Isi dengan A, B, C, atau D.');
  if (!(t in HURUF_KE_INDEKS)) {
    const banyak = t.replace(/[\s,;/&+.\-]|DAN/g, '').length > 1;
    throw new Error(
      banyak
        ? `Kunci "${teks(sel)}" berisi lebih dari satu jawaban. Soal seperti ini harus ditaruh di sheet PGK, bukan PG.`
        : `Kunci "${teks(sel)}" tidak valid. Gunakan A, B, C, atau D.`
    );
  }
  return HURUF_KE_INDEKS[t];
}

function bacaKunciPgk(sel) {
  const t = teks(sel).toUpperCase();
  if (!t) throw new Error('Kunci jawaban kosong. Isi misalnya A,C.');
  const sisa = t.replace(/[\s,;/&+.\-]|DAN/g, '');
  const hasil = [];
  for (const ch of sisa) {
    if (!(ch in HURUF_KE_INDEKS)) throw new Error(`Kunci "${teks(sel)}" tidak valid. Gunakan huruf A sampai D, misalnya A,C.`);
    if (!hasil.includes(HURUF_KE_INDEKS[ch])) hasil.push(HURUF_KE_INDEKS[ch]);
  }
  return hasil.sort();
}

const KUNCI_BENAR = ['benar', 'b', 'true', 'ya', 'betul', '1'];
const KUNCI_SALAH = ['salah', 's', 'false', 'tidak', '0'];

function bacaBenarSalah(sel, nomor) {
  const t = teks(sel).toLowerCase();
  if (KUNCI_BENAR.includes(t)) return true;
  if (KUNCI_SALAH.includes(t)) return false;
  throw new Error(`Kunci pernyataan ${nomor} harus Benar atau Salah${t ? ` (tertulis "${teks(sel)}")` : ' (masih kosong)'}.`);
}

function bacaKelas(sel, daftarKelas) {
  const t = teks(sel);
  if (!t) return [];
  const bagian = t.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
  const ids = [];
  bagian.forEach((nama) => {
    const n = nama.toLowerCase();
    if (['semua', 'umum', 'all', '-'].includes(n)) return;
    const k = daftarKelas.find((x) => x.nama.trim().toLowerCase() === n);
    if (!k) throw new Error(`Kelas "${nama}" belum ada di aplikasi. Buat dulu di menu Kelola Kelas, atau kosongkan kolom Kelas.`);
    if (!ids.includes(k.id)) ids.push(k.id);
  });
  return ids;
}

// Membaca satu sheet. Mengembalikan { soal: [...], galat: [...] }
function bacaSheet(nama, jenis, baris, daftarKelas) {
  const soal = [];
  const galat = [];
  const label = (r) => `Sheet ${nama}, baris ${r}`;

  // Baris judul = baris pertama (dalam 5 baris awal) yang memuat kolom "Soal"
  let barisJudul = -1;
  for (let i = 0; i < Math.min(5, baris.length); i += 1) {
    if ((baris[i] || []).some((s) => /^(teks)?soal$|^pertanyaan$/.test(norm(s)))) {
      barisJudul = i;
      break;
    }
  }
  if (barisJudul < 0) {
    galat.push({ label: `Sheet ${nama}`, pesan: 'Baris judul kolom tidak ditemukan. Pakai template dan jangan mengubah judul kolom "Soal".' });
    return { soal, galat };
  }

  const peta = (baris[barisJudul] || []).map((s, indeks) => ({ nama: norm(s), indeks }));
  const kSoal = cariKolom(peta, /^(teks)?soal$|^pertanyaan$/);
  const kKelas = cariKolom(peta, /^kelas(untuk)?$/);

  // Kolom wajib per jenis
  let kolom = {};
  const hilang = [];
  const wajib = (kunci, pola, judul) => {
    const i = cariKolom(peta, pola);
    if (i < 0) hilang.push(judul);
    kolom[kunci] = i;
  };

  if (jenis === 'pg' || jenis === 'pgk') {
    ['a', 'b', 'c', 'd'].forEach((h) =>
      wajib(`pil_${h}`, new RegExp(`^(pilihan|opsi)?${h}$`), `Pilihan ${h.toUpperCase()}`)
    );
    wajib('kunci', /^kunci(jawaban)?$/, 'Kunci');
  } else if (jenis === 'jodoh') {
    // Pasangan 1 dan 2 wajib ada kolomnya, pasangan 3 dst boleh tidak ada
    for (let i = 1; i <= MAKS_PASANGAN; i += 1) {
      if (i <= 2) {
        wajib(`kiri_${i}`, new RegExp(`^kiri${i}$`), `Kiri ${i}`);
        wajib(`kanan_${i}`, new RegExp(`^kanan${i}$`), `Kanan ${i}`);
      } else {
        kolom[`kiri_${i}`] = cariKolom(peta, new RegExp(`^kiri${i}$`));
        kolom[`kanan_${i}`] = cariKolom(peta, new RegExp(`^kanan${i}$`));
      }
    }
  } else if (jenis === 'isian') {
    wajib('jawaban_1', /^jawaban1$/, 'Jawaban 1');
    for (let i = 2; i <= MAKS_JAWABAN_ISIAN; i += 1) kolom[`jawaban_${i}`] = cariKolom(peta, new RegExp(`^jawaban${i}$`));
  } else {
    for (let i = 1; i <= MAKS_PERNYATAAN; i += 1) {
      if (i <= 2) {
        wajib(`p_${i}`, new RegExp(`^pernyataan${i}$`), `Pernyataan ${i}`);
        wajib(`k_${i}`, new RegExp(`^kunci(jawaban)?${i}$`), `Kunci ${i}`);
      } else {
        kolom[`p_${i}`] = cariKolom(peta, new RegExp(`^pernyataan${i}$`));
        kolom[`k_${i}`] = cariKolom(peta, new RegExp(`^kunci(jawaban)?${i}$`));
      }
    }
  }

  if (kSoal < 0 || hilang.length > 0) {
    galat.push({
      label: `Sheet ${nama}`,
      pesan: `Kolom berikut tidak ditemukan: ${hilang.join(', ') || 'Soal'}. Pakai template dan jangan mengubah judul kolom.`,
    });
    return { soal, galat };
  }

  const sel = (r, i) => (i >= 0 ? teks(r[i]) : '');
  const akhir = Math.min(baris.length, barisJudul + 1 + BATAS_BARIS);

  for (let i = barisJudul + 1; i < akhir; i += 1) {
    const r = baris[i] || [];
    if (r.every((s) => teks(s) === '')) continue; // baris kosong dilewati
    const nomorBaris = i + 1;
    try {
      const teksSoal = sel(r, kSoal);
      if (!teksSoal) throw new Error('Kolom Soal masih kosong.');
      const data = {
        jenis,
        teks: teksSoal,
        kelasIds: kKelas >= 0 ? bacaKelas(r[kKelas], daftarKelas) : [],
        label: label(nomorBaris),
        sheet: nama,
        baris: nomorBaris,
      };

      if (jenis === 'pg' || jenis === 'pgk') {
        data.pilihan = ['a', 'b', 'c', 'd'].map((h) => sel(r, kolom[`pil_${h}`]));
        const kosong = data.pilihan.findIndex((p) => !p);
        if (kosong >= 0) throw new Error(`Pilihan ${'ABCD'[kosong]} masih kosong.`);
        data.kunci = jenis === 'pg' ? bacaKunciPg(r[kolom.kunci]) : bacaKunciPgk(r[kolom.kunci]);
      } else if (jenis === 'jodoh') {
        data.pasangan = [];
        for (let n = 1; n <= MAKS_PASANGAN; n += 1) {
          const kiri = sel(r, kolom[`kiri_${n}`]);
          const kanan = sel(r, kolom[`kanan_${n}`]);
          if (!kiri && !kanan) continue;
          if (!kiri || !kanan) throw new Error(`Pasangan ${n}: kolom Kiri dan Kanan harus sama-sama diisi.`);
          data.pasangan.push({ kiri, kanan });
        }
      } else if (jenis === 'isian') {
        data.kunci = [];
        for (let n = 1; n <= MAKS_JAWABAN_ISIAN; n += 1) {
          const j = sel(r, kolom[`jawaban_${n}`]);
          if (j && !data.kunci.includes(j)) data.kunci.push(j);
        }
      } else {
        data.pernyataan = [];
        for (let n = 1; n <= MAKS_PERNYATAAN; n += 1) {
          const p = sel(r, kolom[`p_${n}`]);
          const k = sel(r, kolom[`k_${n}`]);
          if (!p && !k) continue;
          if (!p) throw new Error(`Pernyataan ${n} masih kosong padahal kuncinya terisi.`);
          data.pernyataan.push({ teks: p, benar: bacaBenarSalah(r[kolom[`k_${n}`]], n) });
        }
      }
      soal.push(data);
    } catch (e) {
      galat.push({ label: label(nomorBaris), pesan: e.message });
    }
  }

  if (baris.length > barisJudul + 1 + BATAS_BARIS) {
    galat.push({ label: `Sheet ${nama}`, pesan: `Hanya ${BATAS_BARIS} baris pertama yang dibaca. Bagi file menjadi beberapa bagian.` });
  }
  return { soal, galat };
}

// Nama sheet dikenali walau ada angka di belakangnya, misalnya "PGK 2" atau "PG1"
const jenisDariNama = (nama) => {
  const n = norm(nama);
  return SHEET_KE_JENIS[n] || SHEET_KE_JENIS[n.replace(/[0-9]+$/, '')] || null;
};

// Sheet yang namanya tidak dikenali (misalnya sheet PGK yang tidak sengaja bernama "3"):
// jenisnya ditebak dari judul kolom. Mengembalikan jenis, 'abu' (PG atau PGK, belum bisa dipastikan), atau null
// (bukan sheet soal, atau kosong).
function tebakJenis(baris) {
  const awal = baris.slice(0, 5);
  const adaJudul = (pola) => awal.some((r) => (r || []).some((s) => pola.test(norm(s))));
  if (!adaJudul(/^(teks)?soal$|^pertanyaan$/)) return null;

  // Harus ada baris soal yang terisi, kalau tidak sheet ini dianggap kosong
  const idxJudul = awal.findIndex((r) => (r || []).some((s) => /^(teks)?soal$|^pertanyaan$/.test(norm(s))));
  const judul = baris[idxJudul] || [];
  const kSoal = judul.findIndex((s) => /^(teks)?soal$|^pertanyaan$/.test(norm(s)));
  const isi = baris.slice(idxJudul + 1).filter((r) => teks((r || [])[kSoal]) !== '');
  if (isi.length === 0) return null;

  if (adaJudul(/^kiri1$/)) return 'jodoh';
  if (adaJudul(/^pernyataan1$/)) return 'bs';
  if (adaJudul(/^jawaban1$/)) return 'isian';
  if (adaJudul(/^(pilihan|opsi)?a$/) && adaJudul(/^kunci(jawaban)?$/)) {
    const kKunci = judul.findIndex((s) => /^kunci(jawaban)?$/.test(norm(s)));
    const banyak = isi.some((r) => teks(r[kKunci]).replace(/[\s,;/&+.\-]|DAN/gi, '').length > 1);
    return banyak ? 'pgk' : 'abu';
  }
  return null;
}

// Titik masuk. daftarKelas: [{ id, nama }]
// Mengembalikan { soal, galat, sheetDibaca }
export function parseSoalDariSheets(sheets, daftarKelas) {
  const hasil = { soal: [], galat: [], sheetDibaca: [] };
  Object.keys(sheets || {}).forEach((nama) => {
    const baris = sheets[nama] || [];
    let jenis = jenisDariNama(nama);
    if (!jenis) {
      const tebakan = tebakJenis(baris);
      if (tebakan === 'abu') {
        hasil.galat.push({
          label: `Sheet ${nama}`,
          pesan: 'Sheet ini berisi soal pilihan ganda tetapi namanya tidak dikenali, jadi dilewati. Ganti nama sheet menjadi PG atau PGK.',
        });
        return;
      }
      if (!tebakan) return; // sheet lain (misalnya Petunjuk) atau sheet kosong: diabaikan
      jenis = tebakan;
    }
    hasil.sheetDibaca.push(nama);
    const r = bacaSheet(nama, jenis, baris, daftarKelas || []);
    hasil.soal.push(...r.soal);
    hasil.galat.push(...r.galat);
  });
  if (hasil.sheetDibaca.length === 0 && hasil.galat.length === 0) {
    hasil.galat.push({
      label: 'File',
      pesan: 'Tidak ada sheet bernama PG, PGK, Menjodohkan, Isian, atau BenarSalah. Pakai file Template_Soal.xlsx.',
    });
  }
  return hasil;
}
