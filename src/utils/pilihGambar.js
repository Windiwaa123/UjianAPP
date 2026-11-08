import * as ImagePicker from 'expo-image-picker';

// Mengembalikan alamat sementara gambar, atau null jika pengguna membatalkan.
const ambilAlamat = (hasil) => {
  if (!hasil || hasil.canceled || hasil.cancelled) return null;
  if (!hasil.assets || hasil.assets.length === 0) return null;
  return hasil.assets[0].uri || null;
};

export async function ambilDariGaleri() {
  const hasil = await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
  return ambilAlamat(hasil);
}

export async function ambilDariKamera() {
  const izin = await ImagePicker.requestCameraPermissionsAsync();
  if (!izin.granted) {
    throw new Error('Izin kamera ditolak. Aktifkan izin kamera di pengaturan HP, atau pilih gambar dari galeri.');
  }
  const hasil = await ImagePicker.launchCameraAsync({ quality: 0.6 });
  return ambilAlamat(hasil);
}
