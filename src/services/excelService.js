// Memilih dan membaca file Excel (.xlsx) dari HP. Hasilnya diteruskan ke utils/importSoal.js.
//
// Memerlukan dua paket (pasang sekali):  npx expo install expo-document-picker xlsx
// Keduanya dimuat dengan require di dalam try/catch, jadi jika belum terpasang aplikasi tetap berjalan normal dan
// layar upload menampilkan pesan yang jelas (bukan aplikasi yang langsung error).

let DocumentPicker = null;
let XLSX = null;
try {
  DocumentPicker = require('expo-document-picker');
} catch (e) {
  DocumentPicker = null;
}
try {
  XLSX = require('xlsx');
} catch (e) {
  XLSX = null;
}

export const paketExcelSiap = () => !!(DocumentPicker && XLSX);

export const pesanPaket = () =>
  'Fitur upload Excel memerlukan paket expo-document-picker dan xlsx.\n\nJalankan di komputer:\nnpx expo install expo-document-picker xlsx\n\nLalu jalankan ulang aplikasi (atau build APK baru).';

const UKURAN_MAKS = 5 * 1024 * 1024; // 5 MB

// Membaca file lokal menjadi teks base64 lewat fetch + FileReader (tidak butuh paket file-system)
async function bacaBase64(uri) {
  const respons = await fetch(uri);
  const blob = await respons.blob();
  return new Promise((resolve, reject) => {
    const pembaca = new FileReader();
    pembaca.onerror = () => reject(new Error('File tidak bisa dibaca. Coba pilih ulang file-nya.'));
    pembaca.onloadend = () => {
      const hasil = String(pembaca.result || '');
      resolve(hasil.slice(hasil.indexOf(',') + 1));
    };
    pembaca.readAsDataURL(blob);
  });
}

// Membuka pemilih file, lalu membaca semua sheet menjadi { namaSheet: [[sel, ...], ...] }.
// Mengembalikan null jika pengguna membatalkan.
export async function pilihFileExcel() {
  if (!paketExcelSiap()) throw new Error(pesanPaket());

  const hasil = await DocumentPicker.getDocumentAsync({
    type: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream',
      '*/*',
    ],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (hasil.canceled) return null;
  const file = hasil.assets && hasil.assets[0];
  if (!file) return null;

  if (!/\.xlsx$/i.test(file.name || '')) {
    throw new Error('File harus berformat .xlsx. Di Excel: File > Save As > pilih "Excel Workbook (*.xlsx)".');
  }
  if (file.size && file.size > UKURAN_MAKS) throw new Error('Ukuran file terlalu besar (maksimal 5 MB).');

  const base64 = await bacaBase64(file.uri);
  let buku;
  try {
    buku = XLSX.read(base64, { type: 'base64' });
  } catch (e) {
    throw new Error('Isi file tidak bisa dibaca sebagai Excel. Pastikan file tidak rusak atau terkunci password.');
  }

  const sheets = {};
  buku.SheetNames.forEach((nama) => {
    // range: 0 supaya nomor baris sama dengan nomor baris di Excel, walaupun data tidak mulai dari baris 1
    sheets[nama] = XLSX.utils.sheet_to_json(buku.Sheets[nama], { header: 1, defval: '', blankrows: true, range: 0 });
  });
  return { namaFile: file.name, sheets };
}
