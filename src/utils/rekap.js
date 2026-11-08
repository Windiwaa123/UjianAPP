// Pengelompokan hasil ujian per folder mata pelajaran untuk layar Rekap Nilai admin.
export const ID_LAINNYA = '__lainnya';

const urut = (a, b) => (a.urutan || 0) - (b.urutan || 0);

// Mengembalikan daftar folder: [{ id, nama, subBab: [bab], hasil: [hasil] }]
// Satu folder per bab induk (mata pelajaran), sesuai urutan di Kelola Bab.
// Hasil yang babnya sudah dihapus dikumpulkan di folder "Lainnya" supaya tidak hilang dari rekap.
export function kelompokkanRekap(hasil, bab) {
  const babById = new Map(bab.map((b) => [b.id, b]));
  const folders = bab
    .filter((b) => !b.indukId)
    .sort(urut)
    .map((m) => {
      const anak = bab.filter((b) => b.indukId === m.id).sort(urut);
      return { id: m.id, nama: m.nama, subBab: anak.length > 0 ? anak : [m], hasil: [] };
    });
  const folderById = new Map(folders.map((f) => [f.id, f]));
  const lain = { id: ID_LAINNYA, nama: 'Lainnya (bab sudah dihapus)', subBab: [], hasil: [] };

  hasil.forEach((h) => {
    const b = babById.get(h.babId);
    const idFolder = b ? b.indukId || b.id : null;
    (folderById.get(idFolder) || lain).hasil.push(h);
  });
  if (lain.hasil.length > 0) folders.push(lain);
  return folders;
}

// Ringkasan satu folder. Rata-rata memakai nilai tertinggi tiap siswa di tiap sub-bab,
// supaya siswa yang mengulang tidak dihitung berkali-kali.
export function ringkasFolder(hasil) {
  const terbaik = new Map();
  hasil.forEach((h) => {
    const kunci = `${h.siswaId}|${h.babId}`;
    const lama = terbaik.get(kunci);
    if (!lama || h.nilai > lama.nilai) terbaik.set(kunci, h);
  });
  const nilai = [...terbaik.values()];
  const rata = nilai.length ? Math.round((nilai.reduce((t, h) => t + h.nilai, 0) / nilai.length) * 10) / 10 : null;
  return {
    jumlahHasil: hasil.length,
    jumlahSiswa: new Set(hasil.map((h) => h.siswaId)).size,
    rata,
    lulus: nilai.filter((h) => h.lulus).length,
    totalNilai: nilai.length,
  };
}
