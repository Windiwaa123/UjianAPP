# Panduan Firebase UjianApp (tanpa paket Blaze)

## A. Pengaturan sekali di Firebase Console
Proyek: `superexamapp`. Semua langkah gratis.

1. **Authentication > Sign-in method**: aktifkan **Email/Password**.
2. **Firestore Database**: pastikan sudah dibuat (Create database, lokasi `asia-southeast2`).
3. **Buat akun admin pertama**
   - Authentication > Users > **Add user**
     - Email: `admin@ujian.app`
     - Password: pilih sendiri (minimal 6 karakter)
   - Salin **User UID** akun itu.
   - Firestore Database > **Start collection** > Collection ID: `users`
     - Document ID: tempel **User UID** tadi
     - Field:
       - `nama` (string): Administrator
       - `username` (string): admin
       - `peran` (string): admin
       - `aktif` (boolean): true
4. **Firestore Database > Rules**: hapus isi lama, tempel isi file `firestore.rules`, klik **Publish**.
5. Jangan buka menu Storage (tidak dipakai).

## B. Menjalankan di komputer
```
npm install
npx expo install expo-image-manipulator
npx expo start -c
```
`expo-image-manipulator` dipakai untuk mengecilkan gambar sebelum disimpan di Firestore.

Login pertama: pilih **Admin**, username `admin`, password sesuai langkah A3.

## C. Membuat APK
```
npm install -g eas-cli
eas login
eas build -p android --profile preview
```
Jika diminta Android package, isi misalnya `com.sekolahanda.ujianapp`.
Hasilnya link unduh APK untuk dibagikan ke siswa.

## D. Cara kerja
- Admin menambah siswa di menu Kelola Siswa (username + password). Siswa login dengan username saja
  (aplikasi otomatis mengubahnya menjadi `username@ujian.app`).
- Username huruf kecil/angka/titik/garis bawah, 3 sampai 30 karakter. Password minimal 6 karakter.
- Password tidak bisa dilihat lagi setelah disimpan. Catat saat membuat akun.
- Siswa lupa password: buat akun baru dengan username lain, lalu hapus akun lama.
  (Mengganti password akun orang lain butuh server / Cloud Function / paket Blaze.)
- "Hapus siswa" menonaktifkan akun dan menghapus riwayat nilainya. Username lama tidak bisa dipakai lagi.
- Gambar soal dan lampiran jawaban dikompres (maksimal sekitar 450 KB) dan disimpan di Firestore.
- Data diambil setiap layar dibuka (tidak real-time). Untuk memuat ulang, buka ulang layar.

### Kunci jawaban tidak muncul
- Siswa tidak pernah melihat kunci jawaban: di layar hasil hanya tampil jawaban siswa dan tanda benar/salah.
- Di data soal yang dibaca siswa, kunci tidak disimpan sebagai teks, hanya sidik jari (hash).
  Kunci asli ada di koleksi `kunci`, yang hanya bisa dibaca admin.
- Soal menjodohkan: urutan kotak kanan pada data siswa sudah diacak, jadi urutan data tidak membocorkan pasangan.
- Setelan "Tampilkan kunci jawaban" di Pengaturan Ujian sudah dihapus karena tidak dipakai lagi.
- Soal yang dibuat SEBELUM pembaruan ini masih menyimpan kunci sebagai teks. Buka tiap soal lama, tekan
  Ubah lalu Simpan (atau buat ulang) supaya kuncinya dipindah ke koleksi `kunci`.

### Mengerjakan ulang
- Siswa boleh mengerjakan ulang bab kapan saja, baik nilai belum lulus maupun sudah lulus, tanpa batas.
  Tombol "Kerjakan ulang" ada di beranda dan di layar hasil.
- Setiap percobaan tersimpan sebagai riwayat sendiri dan tidak bisa diubah siswa.
- Beranda menampilkan percobaan terakhir dan nilai tertinggi. Rata-rata nilai memakai nilai tertinggi tiap bab.
- Admin: Rekap Nilai menampilkan semua percobaan ("percobaan ke-N").
- Bab berikutnya tetap terbuka setelah bab sebelumnya dikerjakan (belum harus lulus).

## D2. Jenis soal (versi terbaru)
Setiap bab bisa berisi lima jenis soal. Semuanya dinilai otomatis, tidak ada lagi penilaian manual oleh admin.

| Jenis | Batas per bab | Cara dinilai |
|-------|---------------|--------------|
| Pilihan Ganda (PG) | **Tanpa batas** | Benar = 1 poin |
| Pilihan Ganda Kompleks (PGK) | 5 soal | 1 poin hanya jika semua jawaban benar dipilih dan tidak ada yang salah |
| Menjodohkan | 5 soal | Poin sebanding jumlah pasangan yang benar |
| Isian Singkat | 5 soal | Cocok dengan salah satu kunci (huruf besar/kecil diabaikan) |
| Benar / Salah | 5 soal | Poin sebanding jumlah pernyataan yang dijawab benar |

**Soal Benar/Salah.** Admin membuat satu soal berisi 2 sampai 8 pernyataan dan menandai kunci tiap pernyataan
(Benar atau Salah). Siswa melihat tabel tiga kolom (Pernyataan, Benar, Salah) dan mencentang satu kotak di setiap
baris. Ketuk kotak yang sama lagi untuk mengosongkan. Contoh: 4 pernyataan, siswa benar 3, maka soal itu bernilai 0,75 poin.
Kunci benar/salah disimpan di koleksi `kunci` (hanya admin), sama seperti jenis soal lainnya.

**Soal Uraian sudah dihapus.** Soal uraian yang dibuat di versi sebelumnya tidak lagi tampil dan tidak ikut diujikan
(datanya tetap ada di Firestore dan boleh dihapus lewat Firebase Console, koleksi `soal` dan `kunci`).
Hasil lama yang memuat uraian tetap bisa dibuka; nilainya mengikuti skor yang dulu pernah diberikan.

## E. Batasan keamanan yang perlu diketahui
- Kunci jawaban disembunyikan dengan hash. Itu menutup cara paling mudah (melihat di layar hasil atau di
  data Firestore), tetapi bukan pengamanan sungguhan: siswa yang paham pemrograman masih bisa menebak
  kunci pilihan ganda (hanya 4 kemungkinan, dan soal benar/salah hanya 2 kemungkinan per pernyataan) dari hash yang ada. Pengamanan penuh butuh penilaian di server
  (Cloud Function, paket Blaze).
- Nilai pilihan ganda dihitung di HP siswa, jadi siswa yang paham teknis bisa mengirim nilai palsu lewat jalur lain.
- Riwayat percobaan tidak bisa diubah atau dihapus siswa (dijaga di `firestore.rules`).
- Urutan bab (bab 2 terkunci sebelum bab 1 dikerjakan) hanya dijaga di aplikasi.
- Kuota gratis Firestore: sekitar 50.000 baca dan 20.000 tulis per hari. Mengerjakan ulang menambah
  jumlah dokumen hasil, tetapi untuk beberapa kelas masih cukup.

## F. Setelah memperbarui kode
Pembaruan ini (soal Benar/Salah, PG tanpa batas, tampilan baru) **tidak mengubah `firestore.rules`**, jadi aturan tidak
perlu dipublikasikan ulang. Timpa `src/` lalu jalankan `npx expo start -c`.
Kalau Anda memperbarui dari versi yang lebih lama dari ini, tempel ulang isi `firestore.rules` di Firestore Database >
Rules lalu klik **Publish**.
