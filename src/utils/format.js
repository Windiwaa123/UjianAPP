const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const dua = (n) => String(n).padStart(2, '0');

// 125 -> "02:05"
export const formatWaktu = (detik) => {
  const d = Math.max(0, Math.floor(detik));
  return `${dua(Math.floor(d / 60))}:${dua(d % 60)}`;
};

// 125 -> "2 mnt 5 dtk"
export const formatDurasi = (detik) => {
  const d = Math.max(0, Math.floor(detik || 0));
  return `${Math.floor(d / 60)} mnt ${d % 60} dtk`;
};

// ISO -> "11 Okt 2026, 09.41"
export const formatTanggal = (iso) => {
  const t = new Date(iso);
  if (isNaN(t.getTime())) return '-';
  return `${t.getDate()} ${BULAN[t.getMonth()]} ${t.getFullYear()}, ${dua(t.getHours())}.${dua(t.getMinutes())}`;
};

// Mengacak urutan array tanpa mengubah array asli
export const acakArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const HURUF = ['A', 'B', 'C', 'D'];
