// gambarService: menyimpan gambar soal / lampiran jawaban di Firestore (koleksi "gambar"),
// tanpa Firebase Storage, jadi tidak perlu paket Blaze.
//
// Gambar dikecilkan dan dikompres dulu (JPEG, lebar maksimal 900 px) lalu disimpan sebagai teks base64
// di dokumen terpisah. Di data soal / jawaban hanya dicatat NAMA gambar-nya.
// Batas satu dokumen Firestore adalah 1 MiB, jadi ukuran hasil kompres dijaga di bawah ~450 KB.
//
// Memerlukan paket: npx expo install expo-image-manipulator

import { Image } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

const KOLEKSI = 'gambar';
const BATAS_BASE64 = 600000; // karakter base64 (sekitar 450 KB)
// Percobaan berurutan: makin kecil jika hasil masih terlalu besar
const PERCOBAAN = [
  { lebar: 900, mutu: 0.5 },
  { lebar: 700, mutu: 0.4 },
  { lebar: 520, mutu: 0.35 },
];

const namaValid = (n) => typeof n === 'string' && /^[A-Za-z0-9_.-]+$/.test(n) && n !== '.' && n !== '..';

const buatNama = () => `gbr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}.jpg`;

// Cache di memori supaya gambar yang sama tidak dibaca dari server berulang kali (menghemat kuota baca)
const cache = new Map();

const ukuranGambar = (uri) =>
  new Promise((selesai) => {
    Image.getSize(
      uri,
      (lebar, tinggi) => selesai({ lebar, tinggi }),
      () => selesai(null)
    );
  });

// Mengecilkan gambar lalu mengembalikan teks base64 (tanpa awalan data:)
async function kompres(uri, lebarTarget, mutu, lebarAsli) {
  const M = ImageManipulator;
  const perluKecil = !lebarAsli || lebarAsli > lebarTarget;

  // API baru (SDK 52 ke atas)
  if (M.ImageManipulator && typeof M.ImageManipulator.manipulate === 'function') {
    const konteks = M.ImageManipulator.manipulate(uri);
    if (perluKecil) konteks.resize({ width: lebarTarget });
    const gambar = await konteks.renderAsync();
    const hasil = await gambar.saveAsync({ compress: mutu, format: M.SaveFormat.JPEG, base64: true });
    return hasil.base64;
  }

  // API lama
  const aksi = perluKecil ? [{ resize: { width: lebarTarget } }] : [];
  const hasil = await M.manipulateAsync(uri, aksi, { compress: mutu, format: M.SaveFormat.JPEG, base64: true });
  return hasil.base64;
}

// Alamat (URI) gambar untuk ditampilkan. Mengembalikan null jika nama tidak valid atau gambar tidak ada.
export async function ambilUriGambar(nama) {
  if (!namaValid(nama)) return null;
  if (cache.has(nama)) return cache.get(nama);
  const snap = await getDoc(doc(db, KOLEKSI, nama));
  if (!snap.exists()) return null;
  const data = snap.data().data;
  if (typeof data !== 'string' || !data) return null;
  const uri = `data:image/jpeg;base64,${data}`;
  cache.set(nama, uri);
  return uri;
}

// Mengompres gambar dari alamat sementara (hasil galeri/kamera) lalu menyimpannya ke Firestore.
// Mengembalikan nama gambar yang disimpan.
export async function simpanGambar(uriSumber) {
  if (!uriSumber) throw new Error('Gambar tidak ditemukan.');
  if (!auth.currentUser) throw new Error('Sesi login berakhir. Silakan login ulang.');

  const ukuran = await ukuranGambar(uriSumber);
  let base64 = null;
  for (const p of PERCOBAAN) {
    const hasil = await kompres(uriSumber, p.lebar, p.mutu, ukuran ? ukuran.lebar : null);
    if (hasil && hasil.length <= BATAS_BASE64) {
      base64 = hasil;
      break;
    }
  }
  if (!base64) {
    throw new Error('Gambar terlalu besar atau terlalu rumit. Pilih gambar lain atau ambil foto dengan resolusi lebih kecil.');
  }

  const nama = buatNama();
  await setDoc(doc(db, KOLEKSI, nama), {
    data: base64,
    pemilik: auth.currentUser.uid,
    dibuat: Date.now(),
  });
  cache.set(nama, `data:image/jpeg;base64,${base64}`);
  return nama;
}

// Menghapus gambar. Aman dipanggil walaupun gambar sudah tidak ada atau bukan milik pengguna.
export async function hapusGambar(nama) {
  if (!namaValid(nama)) return;
  cache.delete(nama);
  try {
    await deleteDoc(doc(db, KOLEKSI, nama));
  } catch (e) {
    // abaikan: gagal menghapus gambar tidak boleh menggagalkan proses lain
  }
}

export function kosongkanCacheGambar() {
  cache.clear();
}

export { namaValid as namaGambarValid };
