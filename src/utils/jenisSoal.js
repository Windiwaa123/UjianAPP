// Daftar jenis soal. Urutan di sini juga menjadi urutan soal saat ujian.
//
// Batas jumlah soal: Pilihan Ganda (pg) TIDAK dibatasi. Jenis lainnya maksimal 5 soal per bab.
export const BATAS_PER_JENIS = 5;

export const JENIS_SOAL = [
  {
    kunci: 'pg',
    label: 'Pilihan Ganda',
    singkat: 'PG',
    ikon: '🔘',
    warna: '#4F46E5',
    warnaLatar: '#EEF2FF',
    batas: null, // tanpa batas
    petunjuk: 'Pilih satu jawaban yang benar.',
  },
  {
    kunci: 'pgk',
    label: 'Pilihan Ganda Kompleks',
    singkat: 'PGK',
    ikon: '☑️',
    warna: '#7C3AED',
    warnaLatar: '#F3E8FF',
    batas: BATAS_PER_JENIS,
    petunjuk: 'Pilih semua jawaban yang benar. Jawaban benar lebih dari satu.',
  },
  {
    kunci: 'jodoh',
    label: 'Menjodohkan',
    singkat: 'Jodoh',
    ikon: '🔗',
    warna: '#0891B2',
    warnaLatar: '#CFFAFE',
    batas: BATAS_PER_JENIS,
    petunjuk: 'Tarik garis dari kotak kiri ke pasangannya di kotak kanan (atau ketuk kiri lalu kanan).',
  },
  {
    kunci: 'isian',
    label: 'Isian Singkat',
    singkat: 'Isian',
    ikon: '✏️',
    warna: '#EA580C',
    warnaLatar: '#FFEDD5',
    batas: BATAS_PER_JENIS,
    petunjuk: 'Tulis jawaban singkat berupa angka atau kata.',
  },
  {
    kunci: 'bs',
    label: 'Benar / Salah',
    singkat: 'B/S',
    ikon: '✅',
    warna: '#16A34A',
    warnaLatar: '#DCFCE7',
    batas: BATAS_PER_JENIS,
    petunjuk: 'Baca setiap pernyataan, lalu centang kolom Benar atau Salah.',
  },
];

export const jenisValid = (k) => JENIS_SOAL.some((j) => j.kunci === k);
export const infoJenis = (k) => JENIS_SOAL.find((j) => j.kunci === k) || JENIS_SOAL[0];

// Batas soal untuk satu jenis di dalam satu bab. null = tanpa batas.
export const batasJenis = (k) => {
  const j = JENIS_SOAL.find((x) => x.kunci === k);
  return j ? j.batas : BATAS_PER_JENIS;
};

// Teks penghitung, contoh "3/5" atau "7" (tanpa batas)
export const teksJumlah = (k, jumlah) => {
  const b = batasJenis(k);
  return b === null ? `${jumlah}` : `${jumlah}/${b}`;
};

export const sudahPenuh = (k, jumlah) => {
  const b = batasJenis(k);
  return b !== null && jumlah >= b;
};
