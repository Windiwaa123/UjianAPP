// dataService: seluruh akses data (Firebase Auth + Firestore) ada di file ini.
// Layar-layar aplikasi tidak boleh memanggil Firebase secara langsung.
// Nama fungsi sama dengan versi AsyncStorage lama, jadi layar-layar tidak perlu diubah.
//
// Struktur Firestore:
//   users/{uid}         : nama, username, peran ('admin' | 'siswa'), kelasId, aktif
//   kelas/{id}          : nama, dibuat
//   bab/{id}            : nama, durasiMenit, urutan, indukId
//                         indukId kosong = bab induk / mata pelajaran (misal "Matematika"),
//                         indukId terisi = sub-bab (misal "Matematika 1"). Soal dan hasil ujian menempel di sub-bab.
//   soal/{id}           : babId, jenis, teks, kelasIds, gambar, pilihan, kunciHash, garam, dibuat
//                         (TANPA kunci jawaban: hanya sidik jari/hash, aman dibaca siswa)
//   kunci/{id}          : kunci jawaban asli (HANYA admin yang bisa membaca)
//   hasil/{siswaId_babId_ke}: satu dokumen per percobaan. Siswa boleh mengulang bab berkali-kali,
//                         setiap percobaan tersimpan sebagai dokumen baru yang tidak bisa diubah siswa
//   pengaturan/umum     : judulUjian, durasiMenit, kkm, acakSoal
//   gambar/{nama}       : data (base64), pemilik, dibuat   (lihat gambarService.js)

import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import { auth, db, ambilAuthSekunder } from './firebase';
import { hapusGambar, kosongkanCacheGambar, namaGambarValid } from './gambarService';
import { BATAS_PER_JENIS, JENIS_SOAL, batasJenis, infoJenis, jenisValid } from '../utils/jenisSoal';
import { buatRincian, pisahKunci, ringkas } from '../utils/penilaian';

// Siswa mengetik username saja; untuk Firebase Auth diubah menjadi email palsu username@ujian.app
const DOMAIN_EMAIL = '@ujian.app';
const keEmail = (username) => `${String(username).trim().toLowerCase()}${DOMAIN_EMAIL}`;

const PENGATURAN_BAWAAN = {
  judulUjian: 'Ujian Online',
  durasiMenit: 30,
  kkm: 75, // nilai minimal untuk lulus
  acakSoal: true,
};

// ---------- Fungsi bantu ----------
const buatId = (awalan) =>
  `${awalan}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const bersih = (s) => (typeof s === 'string' ? s.trim() : '');

const tanpaId = ({ id, ...sisa }) => sisa; // eslint-disable-line no-unused-vars

async function ambilDokumen(koleksi, id) {
  const snap = await getDoc(doc(db, koleksi, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

async function ambilKoleksi(nama, ...kondisi) {
  const ref = kondisi.length ? query(collection(db, nama), ...kondisi) : collection(db, nama);
  const snap = await getDocs(ref);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

const simpanDokumen = (koleksi, objek) => setDoc(doc(db, koleksi, objek.id), tanpaId(objek));

// Batch Firestore maksimal 500 operasi, jadi dipecah
async function jalankanBatch(daftarOperasi) {
  for (let i = 0; i < daftarOperasi.length; i += 400) {
    const batch = writeBatch(db);
    daftarOperasi.slice(i, i + 400).forEach((operasi) => operasi(batch));
    await batch.commit();
  }
}

// Cache singkat di memori agar membuka beranda / ujian berulang tidak menghabiskan kuota baca Firestore.
// Dikosongkan otomatis setiap ada perubahan data dari aplikasi ini.
const TTL_CACHE = 30 * 1000;
const memori = {};
async function denganCache(kunci, muat) {
  const c = memori[kunci];
  if (c && Date.now() - c.waktu < TTL_CACHE) return c.nilai;
  const nilai = await muat();
  memori[kunci] = { waktu: Date.now(), nilai };
  return nilai;
}
const bersihkanCache = (...kunci) => {
  if (kunci.length === 0) Object.keys(memori).forEach((k) => delete memori[k]);
  else kunci.forEach((k) => delete memori[k]);
};

// ---------- Inisialisasi ----------
// Data tersimpan di Firebase, jadi tidak ada yang perlu disiapkan di HP.
async function inisialisasi() {
  return true;
}

// ---------- Autentikasi & sesi ----------
function pesanGalatAuth(e) {
  const kode = (e && e.code) || '';
  const tambahan = kode ? ` (${kode})` : ''; // kode galat Firebase, membantu mencari penyebab
  if (
    kode === 'auth/invalid-credential' ||
    kode === 'auth/wrong-password' ||
    kode === 'auth/user-not-found' ||
    kode === 'auth/invalid-email'
  ) {
    return `Username atau password salah bos`;
  }
  if (kode === 'auth/too-many-requests') return `Terlalu banyak percobaan. Coba lagi beberapa menit lagi.${tambahan}`;
  if (kode === 'auth/network-request-failed') return `Tidak ada koneksi internet. Periksa jaringan lalu coba lagi.${tambahan}`;
  if (kode === 'auth/user-disabled') return `Akun ini dinonaktifkan. Hubungi admin.${tambahan}`;
  return `${(e && e.message) || 'Terjadi kesalahan saat login.'}${tambahan}`;
}

const ambilProfil = (uid) => ambilDokumen('users', uid);

const keObjekPengguna = (profil) => ({
  id: profil.id,
  peran: profil.peran,
  nama: profil.nama,
  username: profil.username,
  kelasId: profil.kelasId || null,
});

async function masuk(peran, username, password) {
  const u = bersih(username);
  const p = typeof password === 'string' ? password : '';
  if (!u || !p) throw new Error('Username dan password wajib diisi.');

  let kredensial;
  try {
    kredensial = await signInWithEmailAndPassword(auth, keEmail(u), p);
  } catch (e) {
    throw new Error(pesanGalatAuth(e));
  }

  let profil = null;
  try {
    profil = await ambilProfil(kredensial.user.uid);
  } catch (e) {
    await signOut(auth);
    throw new Error('Data akun tidak dapat dibaca. Periksa koneksi internet lalu coba lagi.');
  }

  if (!profil || profil.aktif === false || profil.peran !== peran) {
    await signOut(auth);
    if (profil && profil.peran && profil.peran !== peran) {
      throw new Error(peran === 'admin' ? 'Akun ini bukan akun admin.' : 'Akun ini adalah akun admin. Pilih masuk sebagai Admin.');
    }
    throw new Error(
      peran === 'admin' ? 'Akun admin belum disiapkan di Firebase.' : 'Akun tidak aktif atau belum terdaftar. Hubungi admin.'
    );
  }
  bersihkanCache();
  return keObjekPengguna(profil);
}

// Firebase menyimpan sesi sendiri, jadi tidak ada yang perlu disimpan manual
const simpanSesi = async () => {};

async function hapusSesi() {
  bersihkanCache();
  kosongkanCacheGambar();
  await signOut(auth);
}

// Menunggu Firebase selesai memulihkan sesi login yang tersimpan di HP
const tungguAuth = () =>
  new Promise((selesai) => {
    const berhenti = onAuthStateChanged(auth, (pengguna) => {
      berhenti();
      selesai(pengguna);
    });
  });

async function ambilSesi() {
  const pengguna = await tungguAuth();
  if (!pengguna) return null;
  try {
    const profil = await ambilProfil(pengguna.uid);
    if (!profil || profil.aktif === false) {
      await signOut(auth);
      return null;
    }
    return keObjekPengguna(profil);
  } catch (e) {
    return null; // misalnya tidak ada internet: tampilkan layar login
  }
}

async function ubahPasswordAdmin(passwordLama, passwordBaru) {
  const pengguna = auth.currentUser;
  if (!pengguna) throw new Error('Sesi login berakhir. Silakan login ulang.');
  if (!passwordBaru || passwordBaru.length < 6) throw new Error('Password baru minimal 6 karakter.');
  try {
    await reauthenticateWithCredential(pengguna, EmailAuthProvider.credential(pengguna.email, passwordLama || ''));
  } catch (e) {
    throw new Error('Password lama salah.');
  }
  try {
    await updatePassword(pengguna, passwordBaru);
  } catch (e) {
    throw new Error(pesanGalatAuth(e));
  }
}

// ---------- Pengaturan ----------
async function ambilPengaturan() {
  const pg = await denganCache('pengaturan', async () => {
    const d = await ambilDokumen('pengaturan', 'umum');
    return d ? tanpaId(d) : {};
  });
  return { ...PENGATURAN_BAWAAN, ...pg };
}

async function simpanPengaturan(data) {
  const judulUjian = bersih(data.judulUjian);
  const durasiMenit = parseInt(data.durasiMenit, 10);
  const kkm = parseInt(data.kkm, 10);
  if (!judulUjian) throw new Error('Judul ujian wajib diisi.');
  if (!durasiMenit || durasiMenit < 1 || durasiMenit > 600) {
    throw new Error('Durasi harus antara 1 sampai 600 menit.');
  }
  if (!kkm || kkm < 1 || kkm > 100) throw new Error('Nilai minimal lulus harus antara 1 sampai 100.');
  const baru = { judulUjian, durasiMenit, kkm, acakSoal: !!data.acakSoal };
  await setDoc(doc(db, 'pengaturan', 'umum'), baru);
  bersihkanCache('pengaturan');
  return baru;
}

// ---------- Kelas ----------
const urutDibuat = (a, b) => (a.dibuat || 0) - (b.dibuat || 0);

const ambilSemuaKelas = () =>
  denganCache('kelas', async () => (await ambilKoleksi('kelas')).sort(urutDibuat));

async function ambilKelas(id) {
  const daftar = await ambilSemuaKelas();
  return daftar.find((k) => k.id === id) || null;
}

function validasiNamaKelas(nama, daftar, idSendiri) {
  const n = bersih(nama);
  if (!n) throw new Error('Nama kelas wajib diisi.');
  if (n.length > 30) throw new Error('Nama kelas maksimal 30 karakter.');
  if (daftar.some((k) => k.id !== idSendiri && k.nama.toLowerCase() === n.toLowerCase())) {
    throw new Error('Nama kelas sudah ada.');
  }
  return n;
}

async function tambahKelas(nama) {
  bersihkanCache('kelas');
  const daftar = await ambilSemuaKelas();
  const kelas = { id: buatId('kelas'), nama: validasiNamaKelas(nama, daftar, null), dibuat: Date.now() };
  await simpanDokumen('kelas', kelas);
  bersihkanCache('kelas');
  return kelas;
}

async function ubahKelas(id, nama) {
  bersihkanCache('kelas');
  const daftar = await ambilSemuaKelas();
  if (!daftar.some((k) => k.id === id)) throw new Error('Kelas tidak ditemukan.');
  const n = validasiNamaKelas(nama, daftar, id);
  await updateDoc(doc(db, 'kelas', id), { nama: n });
  // Nama kelas pada riwayat hasil ikut diperbarui
  const hasil = await ambilKoleksi('hasil', where('kelasId', '==', id));
  await jalankanBatch(hasil.map((h) => (b) => b.update(doc(db, 'hasil', h.id), { kelasNama: n })));
  bersihkanCache('kelas');
}

// Kelas tidak boleh dihapus jika masih dipakai siswa atau soal khusus kelas itu
async function hapusKelas(id) {
  bersihkanCache('kelas', 'soal');
  const [siswa, soal] = await Promise.all([ambilSemuaSiswa(), ambilSemuaSoal()]);
  const jumlahSiswa = siswa.filter((x) => x.kelasId === id).length;
  const soalKhusus = soal.filter((q) => q.kelasIds && q.kelasIds.length === 1 && q.kelasIds[0] === id).length;
  if (jumlahSiswa > 0 || soalKhusus > 0) {
    throw new Error(
      `Kelas masih dipakai oleh ${jumlahSiswa} siswa dan ${soalKhusus} soal khusus. Pindahkan atau hapus dulu.`
    );
  }
  await deleteDoc(doc(db, 'kelas', id));
  // Soal yang berlaku untuk beberapa kelas: cukup lepaskan kelas ini
  const terkait = soal.filter((q) => q.kelasIds && q.kelasIds.includes(id));
  await jalankanBatch(
    terkait.map((q) => (b) => b.update(doc(db, 'soal', q.id), { kelasIds: q.kelasIds.filter((k) => k !== id) }))
  );
  bersihkanCache('kelas', 'soal');
}

// Daftar kelas beserta jumlah siswa dan soal
async function ambilKelasDenganJumlah() {
  const [kelas, siswa, soal] = await Promise.all([ambilSemuaKelas(), ambilSemuaSiswa(), ambilSemuaSoal()]);
  const soalUmum = soal.filter((q) => !q.kelasIds || q.kelasIds.length === 0).length;
  return kelas.map((k) => {
    const soalKhusus = soal.filter((q) => (q.kelasIds || []).includes(k.id)).length;
    return {
      ...k,
      jumlahSiswa: siswa.filter((x) => x.kelasId === k.id).length,
      soalKhusus,
      soalUmum,
      totalSoal: soalKhusus + soalUmum,
    };
  });
}

// ---------- Percobaan ujian ----------
// Siswa boleh mengerjakan bab berkali-kali. Setiap percobaan adalah satu dokumen hasil sendiri.
// Mengelompokkan hasil per (siswa, bab). Tiap kelompok diurutkan: percobaan terbaru lebih dulu.
const kelompokkanPercobaan = (hasil) => {
  const peta = new Map();
  hasil.forEach((h) => {
    const k = `${h.siswaId}|${h.babId}`;
    if (!peta.has(k)) peta.set(k, []);
    peta.get(k).push(h);
  });
  const kelompok = [...peta.values()];
  kelompok.forEach((daftar) =>
    daftar.sort((a, b) => (b.percobaan || 1) - (a.percobaan || 1) || new Date(b.waktu) - new Date(a.waktu))
  );
  return kelompok;
};

// Rata-rata SEMUA ujian yang pernah dikerjakan siswa:
// (nilai ujian pertama + nilai ujian berikutnya + ...) dibagi jumlah ujian yang dikerjakan.
// Pengerjaan ulang sebuah bab dihitung sebagai ujian tersendiri.
const rataSemuaUjian = (daftarHasil) => {
  if (!daftarHasil.length) return { rata: null, jumlahUjian: 0 };
  const total = daftarHasil.reduce((j, h) => j + (h.nilai || 0), 0);
  return { rata: Math.round((total / daftarHasil.length) * 10) / 10, jumlahUjian: daftarHasil.length };
};

// Percobaan dengan nilai tertinggi
const percobaanTerbaik = (daftar) => daftar.reduce((a, b) => (b.nilai > a.nilai ? b : a));

// ---------- Siswa ----------
// Akun siswa = satu akun Firebase Auth + satu dokumen users/{uid}. Hanya admin yang bisa membaca daftar siswa.
const ambilSemuaSiswa = async () => {
  const daftar = await ambilKoleksi('users', where('peran', '==', 'siswa'));
  return daftar
    .filter((s) => s.aktif !== false)
    .sort((a, b) => String(a.nama).localeCompare(String(b.nama), 'id'));
};

async function ambilSiswa(id) {
  const s = await ambilDokumen('users', id);
  return s && s.peran === 'siswa' && s.aktif !== false ? s : null;
}

function validasiSiswa(data, daftarKelas, akunBaru) {
  const nama = bersih(data.nama);
  const username = bersih(data.username).toLowerCase();
  const password = typeof data.password === 'string' ? data.password : '';
  const kelasId = data.kelasId || null;
  if (!nama) throw new Error('Nama siswa wajib diisi.');
  if (akunBaru) {
    if (!username) throw new Error('Username wajib diisi.');
    if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
      throw new Error('Username 3 sampai 30 karakter, hanya huruf, angka, titik, garis bawah, atau strip (tanpa spasi).');
    }
    if (password.length < 6) throw new Error('Password minimal 6 karakter.');
  }
  if (daftarKelas.length > 0 && !kelasId) throw new Error('Pilih kelas siswa.');
  if (kelasId && !daftarKelas.some((k) => k.id === kelasId)) throw new Error('Kelas tidak ditemukan.');
  return { nama, username, password, kelasId };
}

async function tambahSiswa(data) {
  bersihkanCache('kelas');
  const kelas = await ambilSemuaKelas();
  const baru = validasiSiswa(data, kelas, true);

  // Akun dibuat lewat instance Auth kedua supaya sesi admin tidak tergantikan
  const authSekunder = ambilAuthSekunder();
  let kredensial;
  try {
    kredensial = await createUserWithEmailAndPassword(authSekunder, keEmail(baru.username), baru.password);
  } catch (e) {
    if (e && e.code === 'auth/email-already-in-use') {
      throw new Error('Username sudah dipakai (termasuk akun siswa yang sudah dihapus). Gunakan username lain.');
    }
    if (e && e.code === 'auth/weak-password') throw new Error('Password terlalu lemah. Gunakan minimal 6 karakter.');
    throw new Error(pesanGalatAuth(e));
  }

  const uid = kredensial.user.uid;
  try {
    await setDoc(doc(db, 'users', uid), {
      nama: baru.nama,
      username: baru.username,
      peran: 'siswa',
      kelasId: baru.kelasId,
      aktif: true,
      dibuat: Date.now(),
    });
  } catch (e) {
    // Profil gagal dibuat: hapus akun Auth agar username tidak "terpakai" tanpa data
    try {
      await kredensial.user.delete();
    } catch (e2) {
      // abaikan
    }
    throw new Error('Akun siswa gagal disimpan. Periksa koneksi internet lalu coba lagi.');
  } finally {
    try {
      await signOut(authSekunder);
    } catch (e3) {
      // abaikan
    }
  }
  return { id: uid, nama: baru.nama, username: baru.username, kelasId: baru.kelasId };
}

// Username dan password tidak bisa diubah dari aplikasi (Firebase tidak mengizinkan tanpa server).
// Yang bisa diubah: nama dan kelas.
async function ubahSiswa(id, data) {
  bersihkanCache('kelas');
  const kelas = await ambilSemuaKelas();
  const lama = await ambilSiswa(id);
  if (!lama) throw new Error('Data siswa tidak ditemukan.');
  const baru = validasiSiswa(data, kelas, false);
  await updateDoc(doc(db, 'users', id), { nama: baru.nama, kelasId: baru.kelasId });
  // Perbarui nama pada riwayat hasil agar rekap tetap konsisten.
  // Kelas pada riwayat sengaja tidak diubah: itu kelas saat ujian dikerjakan.
  const hasil = await ambilKoleksi('hasil', where('siswaId', '==', id));
  await jalankanBatch(hasil.map((h) => (b) => b.update(doc(db, 'hasil', h.id), { nama: baru.nama })));
}

// Akun Auth tidak bisa dihapus dari aplikasi tanpa server, jadi akun hanya dinonaktifkan:
// tidak muncul di daftar dan tidak bisa login. Riwayat nilainya dihapus.
async function hapusSiswa(id) {
  const hasil = await ambilKoleksi('hasil', where('siswaId', '==', id));
  await jalankanBatch(hasil.map((h) => (b) => b.delete(doc(db, 'hasil', h.id))));
  await updateDoc(doc(db, 'users', id), { aktif: false });
}

// Daftar siswa beserta kelas dan ringkasan ujiannya
async function ambilSiswaDenganStatus() {
  const [siswa, hasil, kelas] = await Promise.all([ambilSemuaSiswa(), ambilSemuaHasil(), ambilSemuaKelas()]);
  return siswa.map((s) => {
    const milik = hasil.filter((h) => h.siswaId === s.id);
    const kelompok = kelompokkanPercobaan(milik); // satu kelompok per bab
    const k = kelas.find((x) => x.id === s.kelasId);
    // Rata-rata dari semua ujian yang pernah dikerjakan (sama dengan yang tampil di beranda siswa)
    return {
      ...s,
      kelasNama: k ? k.nama : null,
      babSelesai: kelompok.length,
      totalPercobaan: milik.length,
      rataNilai: rataSemuaUjian(milik).rata,
    };
  });
}

// ---------- Bab (mata pelajaran) dan Sub-bab (paket soal) ----------
// Dua tingkat, keduanya disimpan di koleksi "bab":
//   bab induk : indukId kosong. Contoh "Matematika". Hanya folder, soal ditaruh di sub-bab.
//   sub-bab   : indukId = id bab induk. Contoh "Matematika 1", "Matematika 2". Soal dan hasil ujian menempel di sini.
// Urutan sub-bab (field "urutan") = urutan pengerjaan siswa di dalam satu bab induk.
// Sub-bab berikutnya terkunci sampai sub-bab sebelumnya mencapai nilai minimal (KKM).
const urutBab = (a, b) => (a.urutan || 0) - (b.urutan || 0);

const ambilSemuaBab = () => denganCache('bab', async () => (await ambilKoleksi('bab')).sort(urutBab));

// Bab yang berada pada tingkat yang sama: indukId null = bab induk, selain itu sub-bab dari induk tersebut
const anakDari = (daftar, indukId) =>
  daftar.filter((b) => (b.indukId || null) === (indukId || null)).sort(urutBab);

async function ambilBab(id) {
  const daftar = await ambilSemuaBab();
  return daftar.find((b) => b.id === id) || null;
}

const ambilSubBab = async (indukId) => anakDari(await ambilSemuaBab(), indukId);

// saudara = daftar bab pada tingkat yang sama (nama harus unik di dalam tingkat itu)
function validasiBab(data, saudara, idSendiri, subBab) {
  const nama = bersih(data.nama);
  if (!nama) throw new Error(subBab ? 'Nama sub-bab wajib diisi.' : 'Nama bab wajib diisi.');
  if (nama.length > 40) throw new Error('Nama maksimal 40 karakter.');
  if (saudara.some((b) => b.id !== idSendiri && b.nama.toLowerCase() === nama.toLowerCase())) {
    throw new Error(subBab ? 'Nama sub-bab sudah ada di bab ini.' : 'Nama bab sudah ada.');
  }
  if (!subBab) return { nama, durasiMenit: null }; // durasi hanya berlaku untuk sub-bab (yang berisi soal)
  const mentah = bersih(String(data.durasiMenit === undefined || data.durasiMenit === null ? '' : data.durasiMenit));
  let durasiMenit = null; // kosong = pakai durasi dari Pengaturan Ujian
  if (mentah !== '') {
    durasiMenit = parseInt(mentah, 10);
    if (!durasiMenit || durasiMenit < 1 || durasiMenit > 600) throw new Error('Durasi harus antara 1 sampai 600 menit.');
  }
  return { nama, durasiMenit };
}

// data: { nama, durasiMenit, indukId }  (indukId kosong = membuat bab induk)
async function tambahBab(data) {
  bersihkanCache('bab');
  const semua = await ambilSemuaBab();
  const indukId = data.indukId || null;
  if (indukId) {
    const induk = semua.find((b) => b.id === indukId);
    if (!induk || induk.indukId) throw new Error('Bab induk tidak ditemukan.');
  }
  const saudara = anakDari(semua, indukId);
  const urutan = saudara.reduce((m, b) => Math.max(m, b.urutan || 0), 0) + 1;
  const bab = { id: buatId('bab'), ...validasiBab(data, saudara, null, !!indukId), indukId, urutan };

  const operasi = [(batch) => batch.set(doc(db, 'bab', bab.id), tanpaId(bab))];
  // Data lama: soal yang dulu ditaruh langsung di bab induk dipindahkan ke sub-bab pertama
  if (indukId && saudara.length === 0) {
    const [soalLama, kunciLama] = await Promise.all([
      ambilKoleksi('soal', where('babId', '==', indukId)),
      ambilKoleksi('kunci', where('babId', '==', indukId)),
    ]);
    soalLama.forEach((q) => operasi.push((batch) => batch.update(doc(db, 'soal', q.id), { babId: bab.id })));
    kunciLama.forEach((k) => operasi.push((batch) => batch.update(doc(db, 'kunci', k.id), { babId: bab.id })));
  }
  await jalankanBatch(operasi);
  bersihkanCache('bab', 'soal');
  return bab;
}

async function ubahBab(id, data) {
  bersihkanCache('bab');
  const semua = await ambilSemuaBab();
  const lama = semua.find((b) => b.id === id);
  if (!lama) throw new Error('Bab tidak ditemukan.');
  const subBab = !!lama.indukId;
  const baru = validasiBab(data, anakDari(semua, lama.indukId), id, subBab);
  await updateDoc(doc(db, 'bab', id), baru);
  // Nama pada riwayat hasil ikut diperbarui
  if (subBab) {
    const hasil = await ambilKoleksi('hasil', where('babId', '==', id));
    await jalankanBatch(hasil.map((h) => (b) => b.update(doc(db, 'hasil', h.id), { babNama: baru.nama })));
  } else {
    const anak = semua.filter((b) => b.indukId === id);
    const hasil = (await Promise.all(anak.map((x) => ambilKoleksi('hasil', where('babId', '==', x.id))))).flat();
    await jalankanBatch(hasil.map((h) => (b) => b.update(doc(db, 'hasil', h.id), { mapelNama: baru.nama })));
  }
  bersihkanCache('bab');
}

// arah: -1 naik, 1 turun. Hanya menggeser di antara bab yang satu tingkat.
async function geserBab(id, arah) {
  bersihkanCache('bab');
  const semua = await ambilSemuaBab();
  const bab = semua.find((b) => b.id === id);
  if (!bab) return;
  const daftar = anakDari(semua, bab.indukId);
  const i = daftar.findIndex((b) => b.id === id);
  const j = i + arah;
  if (i < 0 || j < 0 || j >= daftar.length) return;
  const baru = [...daftar];
  [baru[i], baru[j]] = [baru[j], baru[i]];
  // Tulis ulang nomor urut agar tidak ada nomor kembar
  await jalankanBatch(baru.map((b, idx) => (batch) => batch.update(doc(db, 'bab', b.id), { urutan: idx + 1 })));
  bersihkanCache('bab');
}

// Menghapus bab induk ikut menghapus semua sub-bab dan soalnya. Riwayat hasil siswa tetap tersimpan.
async function hapusBab(id) {
  const semua = await ambilSemuaBab();
  const idHapus = [id, ...semua.filter((b) => b.indukId === id).map((b) => b.id)];
  const milik = (await Promise.all(idHapus.map((i) => ambilKoleksi('soal', where('babId', '==', i))))).flat();
  await jalankanBatch([
    ...idHapus.map((i) => (b) => b.delete(doc(db, 'bab', i))),
    ...milik.map((q) => (b) => b.delete(doc(db, 'soal', q.id))),
    ...milik.map((q) => (b) => b.delete(doc(db, 'kunci', q.id))),
  ]);
  await Promise.all(milik.filter((q) => q.gambar).map((q) => hapusGambar(q.gambar)));
  bersihkanCache('bab', 'soal');
}

const hitungPerJenis = (soalBab) => {
  const per = {};
  JENIS_SOAL.forEach((j) => {
    per[j.kunci] = soalBab.filter((q) => q.jenis === j.kunci).length;
  });
  return per;
};

// Tanpa indukId : daftar bab induk, beserta jumlah sub-bab dan total soal di seluruh sub-babnya.
// Dengan indukId: daftar sub-bab dari bab itu, beserta jumlah soal per jenis.
async function ambilBabDenganJumlah(indukId = null) {
  const [bab, soal] = await Promise.all([ambilSemuaBab(), ambilSemuaSoal()]);
  return anakDari(bab, indukId).map((b) => {
    if (indukId) {
      const milik = soal.filter((q) => q.babId === b.id);
      return { ...b, total: milik.length, perJenis: hitungPerJenis(milik) };
    }
    const idAnak = bab.filter((x) => x.indukId === b.id).map((x) => x.id);
    return {
      ...b,
      jumlahSub: idAnak.length,
      total: soal.filter((q) => idAnak.includes(q.babId)).length,
      totalLangsung: soal.filter((q) => q.babId === b.id).length, // soal lama yang belum dipindah ke sub-bab
    };
  });
}

// ---------- Soal ----------
// Soal berjenis lama yang sudah tidak ada (misalnya Uraian) tidak ditampilkan dan tidak diujikan.
const jenisAktif = (q) => jenisValid(q.jenis);

const ambilSemuaSoal = () =>
  denganCache('soal', async () => (await ambilKoleksi('soal')).filter(jenisAktif).sort(urutDibuat));

// Khusus admin: soal digabung dengan kunci aslinya dari koleksi "kunci".
// Pada soal yang punya kunci rahasia, pasangan (menjodohkan) diganti dengan pasangan asli.
const gabungKunci = (soal, kunci) => {
  if (!kunci) return soal;
  const { id, babId, ...rahasia } = kunci; // eslint-disable-line no-unused-vars
  return { ...soal, ...rahasia };
};

async function ambilSoal(id) {
  const [s, k] = await Promise.all([ambilDokumen('soal', id), ambilDokumen('kunci', id)]);
  return s ? gabungKunci(s, k) : null;
}

async function ambilSoalBab(babId) {
  const [daftar, kunci] = await Promise.all([
    ambilKoleksi('soal', where('babId', '==', babId)),
    ambilKoleksi('kunci', where('babId', '==', babId)),
  ]);
  const petaKunci = {};
  kunci.forEach((k) => {
    petaKunci[k.id] = k;
  });
  return daftar
    .filter(jenisAktif)
    .map((q) => gabungKunci(q, petaKunci[q.id]))
    .sort(urutDibuat);
}

const daftarKunciIsian = (v) =>
  (Array.isArray(v) ? v : String(v || '').split('\n')).map(bersih).filter(Boolean);

// Memeriksa isi soal menurut jenisnya. Mengembalikan objek soal tanpa id.
function validasiSoal(data, daftarKelas) {
  const jenis = data.jenis;
  if (!jenisValid(jenis)) throw new Error('Jenis soal tidak dikenal.');
  const teks = bersih(data.teks);
  if (!teks) throw new Error('Teks soal wajib diisi.');
  const idValid = new Set(daftarKelas.map((k) => k.id));
  // kelasIds kosong = soal berlaku untuk semua kelas
  const kelasIds = [...new Set(Array.isArray(data.kelasIds) ? data.kelasIds : [])].filter((k) => idValid.has(k));
  const gambar = namaGambarValid(data.gambar) ? data.gambar : null;
  const dasar = { jenis, teks, kelasIds, gambar };

  if (jenis === 'pg' || jenis === 'pgk') {
    const pilihan = (data.pilihan || []).map(bersih);
    if (pilihan.length !== 4 || pilihan.some((p) => !p)) throw new Error('Keempat pilihan jawaban wajib diisi.');
    if (jenis === 'pg') {
      if (!Number.isInteger(data.kunci) || data.kunci < 0 || data.kunci > 3) throw new Error('Pilih kunci jawaban.');
      return { ...dasar, pilihan, kunci: data.kunci };
    }
    const kunci = [...new Set(Array.isArray(data.kunci) ? data.kunci : [])]
      .filter((k) => Number.isInteger(k) && k >= 0 && k <= 3)
      .sort();
    if (kunci.length < 2) throw new Error('Pilihan ganda kompleks harus memiliki minimal 2 jawaban benar.');
    return { ...dasar, pilihan, kunci };
  }

  if (jenis === 'jodoh') {
    const pasangan = (data.pasangan || []).map((p) => ({ kiri: bersih(p && p.kiri), kanan: bersih(p && p.kanan) }));
    if (pasangan.length < 2 || pasangan.length > 6) throw new Error('Jumlah pasangan harus antara 2 sampai 6.');
    if (pasangan.some((p) => !p.kiri || !p.kanan)) throw new Error('Semua kotak kiri dan kanan wajib diisi.');
    const kanan = pasangan.map((p) => p.kanan.toLowerCase());
    if (new Set(kanan).size !== kanan.length) throw new Error('Isi kotak kanan tidak boleh sama satu dengan lainnya.');
    return { ...dasar, pasangan };
  }

  if (jenis === 'isian') {
    const kunci = daftarKunciIsian(data.kunci);
    if (kunci.length === 0) throw new Error('Isi minimal satu jawaban yang benar.');
    return { ...dasar, kunci };
  }

  // benar/salah: admin menulis pernyataan dan menentukan kuncinya (benar atau salah)
  const pernyataan = (data.pernyataan || []).map((p) => ({ teks: bersih(p && p.teks), benar: !!(p && p.benar) }));
  if (pernyataan.length < 2 || pernyataan.length > 8) throw new Error('Jumlah pernyataan harus antara 2 sampai 8.');
  if (pernyataan.some((p) => !p.teks)) throw new Error('Semua pernyataan wajib diisi.');
  const teksUnik = pernyataan.map((p) => p.teks.toLowerCase());
  if (new Set(teksUnik).size !== teksUnik.length) throw new Error('Pernyataan tidak boleh sama satu dengan lainnya.');
  return { ...dasar, pernyataan };
}

async function tambahSoal(data) {
  bersihkanCache('kelas', 'bab');
  const [kelas, bab, soalBab] = await Promise.all([
    ambilSemuaKelas(),
    ambilSemuaBab(),
    ambilKoleksi('soal', where('babId', '==', data.babId || '-')),
  ]);
  const b = bab.find((x) => x.id === data.babId);
  if (!b) throw new Error('Bab tidak ditemukan.');
  if (bab.some((x) => x.indukId === b.id)) throw new Error('Pilih salah satu sub-bab untuk menaruh soal, bukan bab induknya.');
  const baru = validasiSoal(data, kelas);
  // Pilihan Ganda tidak dibatasi. Jenis lain maksimal BATAS_PER_JENIS soal per bab.
  const batas = batasJenis(baru.jenis);
  const terpakai = soalBab.filter((q) => q.jenis === baru.jenis).length;
  if (batas !== null && terpakai >= batas) {
    throw new Error(`Soal ${infoJenis(baru.jenis).label} di ${b.nama} sudah mencapai batas ${batas} soal.`);
  }
  const id = buatId('soal');
  const { jenis, teks, kelasIds, gambar } = baru;
  const { publik, rahasia } = pisahKunci(id, baru);
  const soal = { id, babId: b.id, jenis, teks, kelasIds, gambar, ...publik, dibuat: Date.now() };
  await jalankanBatch([
    (batch) => batch.set(doc(db, 'soal', id), tanpaId(soal)),
    (batch) => batch.set(doc(db, 'kunci', id), { babId: b.id, ...rahasia }),
  ]);
  bersihkanCache('soal');
  return soal;
}

// Menyimpan banyak soal sekaligus (impor Excel).
// Setiap soal diperiksa sendiri-sendiri dengan aturan yang SAMA seperti input manual (validasiSoal, batas per jenis).
// Soal yang tidak valid, melebihi batas jenis, atau sama persis dengan soal yang sudah ada di bab itu dilewati
// dan dilaporkan di `gagal`; soal lain tetap disimpan.
//   daftar : [{ jenis, teks, kelasIds, pilihan, kunci, pasangan, pernyataan, label }]
//   opsi.simulasi : true = hanya memeriksa (tidak menulis apa pun ke Firestore)
// Mengembalikan { berhasil, gagal: [{ label, pesan }], perJenis: { pg: n, ... } }
async function tambahSoalMassal(babId, daftar, opsi = {}) {
  bersihkanCache('kelas', 'bab');
  const [kelas, bab, soalBab] = await Promise.all([
    ambilSemuaKelas(),
    ambilSemuaBab(),
    ambilKoleksi('soal', where('babId', '==', babId || '-')),
  ]);
  const b = bab.find((x) => x.id === babId);
  if (!b) throw new Error('Bab tidak ditemukan.');
  if (bab.some((x) => x.indukId === b.id)) throw new Error('Pilih salah satu sub-bab untuk menaruh soal, bukan bab induknya.');

  const terpakai = {};
  const perJenis = {};
  JENIS_SOAL.forEach((j) => {
    terpakai[j.kunci] = 0;
    perJenis[j.kunci] = 0;
  });
  const sudahAda = new Set();
  soalBab.filter(jenisAktif).forEach((q) => {
    terpakai[q.jenis] += 1;
    sudahAda.add(`${q.jenis}|${bersih(q.teks).toLowerCase()}`);
  });

  const operasi = [];
  const gagal = [];
  let berhasil = 0;
  const waktuAwal = Date.now();

  daftar.forEach((data, urutan) => {
    const label = data.label || `Soal ke-${urutan + 1}`;
    try {
      const baru = validasiSoal(data, kelas);
      const batas = batasJenis(baru.jenis);
      if (batas !== null && terpakai[baru.jenis] >= batas) {
        throw new Error(
          `Melewati batas ${batas} soal ${infoJenis(baru.jenis).label} per bab (termasuk yang sudah ada di ${b.nama}).`
        );
      }
      const kunciDuplikat = `${baru.jenis}|${baru.teks.toLowerCase()}`;
      if (sudahAda.has(kunciDuplikat)) throw new Error('Soal yang sama persis sudah ada di bab ini.');

      terpakai[baru.jenis] += 1;
      perJenis[baru.jenis] += 1;
      sudahAda.add(kunciDuplikat);
      berhasil += 1;

      if (!opsi.simulasi) {
        const id = buatId('soal');
        const { jenis, teks, kelasIds, gambar } = baru;
        const { publik, rahasia } = pisahKunci(id, baru);
        // `dibuat` dibuat berurutan agar urutan di Excel sama dengan urutan di aplikasi
        const soal = { babId: b.id, jenis, teks, kelasIds, gambar, ...publik, dibuat: waktuAwal + urutan };
        operasi.push((batch) => batch.set(doc(db, 'soal', id), soal));
        operasi.push((batch) => batch.set(doc(db, 'kunci', id), { babId: b.id, ...rahasia }));
      }
    } catch (e) {
      gagal.push({ label, pesan: e.message });
    }
  });

  if (operasi.length) {
    await jalankanBatch(operasi);
    bersihkanCache('soal');
  }
  return { berhasil, gagal, perJenis };
}

// Jenis soal dan bab tidak bisa diubah setelah soal dibuat
async function ubahSoal(id, data) {
  bersihkanCache('kelas');
  const [kelas, lama] = await Promise.all([ambilSemuaKelas(), ambilDokumen('soal', id)]);
  if (!lama) throw new Error('Soal tidak ditemukan.');
  const baru = validasiSoal({ ...data, jenis: lama.jenis }, kelas);
  const { jenis, teks, kelasIds, gambar } = baru;
  const { publik, rahasia } = pisahKunci(id, baru);
  // set menimpa seluruh dokumen, jadi field lama yang tidak dipakai jenis ini ikut hilang
  await jalankanBatch([
    (batch) =>
      batch.set(doc(db, 'soal', id), {
        babId: lama.babId,
        dibuat: lama.dibuat || Date.now(),
        jenis,
        teks,
        kelasIds,
        gambar,
        ...publik,
      }),
    (batch) => batch.set(doc(db, 'kunci', id), { babId: lama.babId, ...rahasia }),
  ]);
  if (lama.gambar && lama.gambar !== baru.gambar) await hapusGambar(lama.gambar);
  bersihkanCache('soal');
}

async function hapusSoal(id) {
  const soal = await ambilDokumen('soal', id);
  await jalankanBatch([(b) => b.delete(doc(db, 'soal', id)), (b) => b.delete(doc(db, 'kunci', id))]);
  if (soal && soal.gambar) await hapusGambar(soal.gambar);
  bersihkanCache('soal');
}

// Soal yang berhak dikerjakan siswa: soal umum + soal khusus kelasnya
const soalUntukKelas = (soal, kelasId) =>
  soal.filter((q) => {
    const ids = q.kelasIds || [];
    return ids.length === 0 || (kelasId && ids.includes(kelasId));
  });

const urutJenis = (daftar) =>
  JENIS_SOAL.flatMap((j) => daftar.filter((q) => (q.jenis || 'pg') === j.kunci));

// ---------- Status sub-bab per siswa (penguncian) ----------
// status: 'lulus' | 'ulang' | 'terbuka' | 'terkunci' | 'kosong'
//   lulus    : nilai terbaik >= KKM
//   ulang    : sudah dikerjakan tetapi belum mencapai KKM (harus diulang untuk membuka sub-bab berikutnya)
//   terbuka  : giliran dikerjakan, belum pernah dicoba
//   terkunci : sub-bab sebelumnya di bab yang sama belum mencapai KKM
//   kosong   : belum ada soal untuk kelas siswa ini
// Penguncian hanya berlaku di dalam satu bab (mata pelajaran). Antar bab induk siswa bebas memilih.
// Siswa hanya membaca datanya sendiri (profil dan hasilnya), bukan data siswa lain.
async function ambilStatusBabSiswa(siswaId) {
  const [profil, kelas, bab, soal, hasil, pg] = await Promise.all([
    ambilProfil(siswaId),
    ambilSemuaKelas(),
    ambilSemuaBab(),
    ambilSemuaSoal(),
    ambilHasilSiswa(siswaId),
    ambilPengaturan(),
  ]);
  const k = profil && profil.kelasId ? kelas.find((x) => x.id === profil.kelasId) || null : null;
  const soalSiswa = soalUntukKelas(soal, k ? k.id : null);
  const kkm = pg.kkm;

  const mapel = anakDari(bab, null).map((induk) => {
    const anak = anakDari(bab, induk.id);
    // Bab lama tanpa sub-bab: bab itu sendiri dianggap satu paket soal
    const paket = anak.length > 0 ? anak : [induk];

    let jalan = true;
    let penghalang = null;
    const items = paket.map((b) => {
      const jumlahSoal = soalSiswa.filter((q) => q.babId === b.id).length;
      const percobaan = hasil.filter((x) => x.babId === b.id); // sudah diurut terbaru dulu
      const terbaik = percobaan.length ? percobaanTerbaik(percobaan) : null;
      let status;
      let menungguBab = null;
      if (terbaik && terbaik.nilai >= kkm) status = 'lulus';
      else if (jumlahSoal === 0) status = 'kosong';
      else if (jalan) {
        status = percobaan.length > 0 ? 'ulang' : 'terbuka';
        jalan = false;
        penghalang = b.nama;
      } else {
        status = 'terkunci';
        menungguBab = penghalang;
      }
      return {
        bab: b,
        induk,
        jumlahSoal,
        durasiMenit: b.durasiMenit || pg.durasiMenit,
        status,
        hasil: percobaan[0] || null, // percobaan terakhir
        percobaan: percobaan.length,
        terbaik,
        menungguBab,
      };
    });
    const aktif = items.filter((d) => d.status !== 'kosong');
    return {
      bab: induk,
      items,
      aktif,
      jumlahLulus: aktif.filter((d) => d.status === 'lulus').length,
    };
  });

  const daftar = mapel.flatMap((m) => m.items);
  const bersoal = daftar.filter((d) => d.status !== 'kosong');
  const { rata, jumlahUjian } = rataSemuaUjian(hasil);
  return {
    kelas: k ? { id: k.id, nama: k.nama } : null,
    rataNilai: rata,
    jumlahUjian,
    kkm,
    mapel,
    daftar,
    adaBab: bersoal.length > 0,
    semuaSelesai: bersoal.length > 0 && bersoal.every((d) => d.status === 'lulus'),
  };
}

// Soal satu sub-bab untuk dikerjakan siswa. Menolak jika masih terkunci. Yang sudah dikerjakan boleh diulang.
async function ambilUjianBab(siswaId, babId) {
  const status = await ambilStatusBabSiswa(siswaId);
  const item = status.daftar.find((d) => d.bab.id === babId);
  if (!item) throw new Error('Sub-bab tidak ditemukan.');
  if (item.status === 'terkunci') {
    throw new Error(`Selesaikan ${item.menungguBab} dengan nilai minimal ${status.kkm} terlebih dahulu.`);
  }
  if (item.status === 'kosong') throw new Error('Soal untuk bab ini belum tersedia.');
  const soal = await ambilSemuaSoal();
  const untukSiswa = soalUntukKelas(soal, status.kelas ? status.kelas.id : null).filter((q) => q.babId === babId);
  return {
    kelas: status.kelas,
    bab: item.bab,
    mapelNama: item.induk.id !== item.bab.id ? item.induk.nama : null,
    durasiMenit: item.durasiMenit,
    percobaanKe: item.percobaan + 1,
    soal: urutJenis(untukSiswa),
  };
}

// ---------- Penilaian otomatis ----------
// jawaban: { [soalId]: jawaban menurut jenis soal } (lihat utils/penilaian.js)
function nilaiJawaban(daftarSoal, jawaban, kkm) {
  const rincian = daftarSoal.map((s) => buatRincian(s, jawaban[s.id]));
  return { ...ringkas(rincian, kkm), rincian };
}

// ---------- Hasil ujian ----------
const ambilSemuaHasil = () => ambilKoleksi('hasil');

// ID dokumen hasil = siswaId_babId_nomorPercobaan. Aturan keamanan (firestore.rules) hanya mengizinkan siswa
// MEMBUAT dokumen baru, bukan mengubah atau menghapus yang lama, jadi riwayat percobaan tidak bisa dipalsukan.
async function simpanHasil(data) {
  if (!data.babId || !data.siswaId) throw new Error('Data hasil tidak lengkap.');
  const sebelumnya = await ambilKoleksi(
    'hasil',
    where('siswaId', '==', data.siswaId),
    where('babId', '==', data.babId)
  );
  const ke = sebelumnya.reduce((m, h) => Math.max(m, h.percobaan || 1), 0) + 1;
  const id = `${data.siswaId}_${data.babId}_${ke}`;
  const hasil = { ...data, percobaan: ke, waktu: new Date().toISOString() };
  try {
    await setDoc(doc(db, 'hasil', id), hasil);
  } catch (e) {
    if (e && e.code === 'permission-denied') throw new Error('Jawaban ditolak server. Coba kumpulkan lagi.');
    throw e;
  }
  return { id, ...hasil };
}

const ambilHasil = (id) => ambilDokumen('hasil', id);

async function ambilHasilSiswa(siswaId) {
  const daftar = await ambilKoleksi('hasil', where('siswaId', '==', siswaId));
  return daftar.sort((a, b) => new Date(b.waktu) - new Date(a.waktu));
}

// Menghapus satu percobaan dari riwayat (siswa tetap boleh mengerjakan bab itu lagi kapan saja)
async function hapusHasil(id) {
  await deleteDoc(doc(db, 'hasil', id));
}

// ---------- Statistik dashboard admin ----------
async function ambilStatistik() {
  const [siswa, soal, hasil, kelas, bab] = await Promise.all([
    ambilSemuaSiswa(),
    ambilSemuaSoal(),
    ambilSemuaHasil(),
    ambilSemuaKelas(),
    ambilSemuaBab(),
  ]);
  const kelompok = kelompokkanPercobaan(hasil);
  const final = kelompok.map(percobaanTerbaik); // nilai terbaik per siswa per bab
  const rata = final.length ? final.reduce((j, h) => j + h.nilai, 0) / final.length : 0;
  return {
    jumlahSiswa: siswa.length,
    jumlahKelas: kelas.length,
    jumlahBab: bab.filter((b) => !b.indukId).length,
    jumlahSoal: soal.length,
    jawabanMasuk: hasil.length,
    rataNilai: Math.round(rata * 10) / 10,
  };
}

const dataService = {
  inisialisasi,
  // autentikasi
  masuk,
  simpanSesi,
  ambilSesi,
  hapusSesi,
  ubahPasswordAdmin,
  // pengaturan
  ambilPengaturan,
  simpanPengaturan,
  // kelas
  ambilSemuaKelas,
  ambilKelas,
  tambahKelas,
  ubahKelas,
  hapusKelas,
  ambilKelasDenganJumlah,
  // siswa
  ambilSemuaSiswa,
  ambilSiswa,
  tambahSiswa,
  ubahSiswa,
  hapusSiswa,
  ambilSiswaDenganStatus,
  // bab
  ambilSemuaBab,
  ambilBab,
  ambilSubBab,
  tambahBab,
  ubahBab,
  geserBab,
  hapusBab,
  ambilBabDenganJumlah,
  // soal
  ambilSemuaSoal,
  ambilSoal,
  ambilSoalBab,
  tambahSoal,
  tambahSoalMassal,
  ubahSoal,
  hapusSoal,
  ambilStatusBabSiswa,
  ambilUjianBab,
  // hasil & penilaian
  nilaiJawaban,
  simpanHasil,
  ambilSemuaHasil,
  ambilHasil,
  ambilHasilSiswa,
  hapusHasil,
  ambilStatistik,
};

export default dataService;
