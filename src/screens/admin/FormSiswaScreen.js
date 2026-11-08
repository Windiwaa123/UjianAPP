import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import FormWadah from '../../components/FormWadah';
import Input from '../../components/Input';
import Tombol from '../../components/Tombol';
import ChipPilihan from '../../components/ChipPilihan';
import dataService from '../../services/dataService';
import { info } from '../../utils/dialog';
import { WARNA } from '../../theme';

export default function FormSiswaScreen({ navigation, route }) {
  const siswaId = route.params?.siswaId;
  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [nama, setNama] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [kelas, setKelas] = useState([]);
  const [kelasId, setKelasId] = useState(null);

  useEffect(() => {
    (async () => {
      setKelas(await dataService.ambilSemuaKelas());
      if (siswaId) {
        const s = await dataService.ambilSiswa(siswaId);
        if (s) {
          setNama(s.nama);
          setUsername(s.username);
          setKelasId(s.kelasId || null);
        }
      }
      setMemuat(false);
    })();
  }, [siswaId]);

  const simpan = async () => {
    setMenyimpan(true);
    try {
      const data = { nama, username, password, kelasId };
      if (siswaId) await dataService.ubahSiswa(siswaId, data);
      else await dataService.tambahSiswa(data);
      navigation.goBack();
    } catch (e) {
      info('Data belum lengkap', e.message);
      setMenyimpan(false);
    }
  };

  if (memuat) {
    return (
      <FormWadah edges={['bottom', 'left', 'right']}>
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={WARNA.utama} />
      </FormWadah>
    );
  }

  return (
    <FormWadah edges={['bottom', 'left', 'right']}>
      <Input
        label="Nama lengkap"
        value={nama}
        onChangeText={setNama}
        placeholder="Contoh: Siti Aminah"
        autoCapitalize="words"
      />

      <Text style={gaya.label}>Kelas</Text>
      {kelas.length === 0 ? (
        <Text style={gaya.peringatan}>
          Belum ada kelas. Siswa ini hanya akan menerima soal untuk "Semua kelas". Buat kelas lebih dulu di menu
          Kelola Kelas jika soal ingin dibedakan.
        </Text>
      ) : (
        <ChipPilihan
          item={kelas.map((k) => ({ kunci: k.id, label: k.nama }))}
          aktif={(k) => kelasId === k}
          onPilih={setKelasId}
          style={{ marginBottom: 6 }}
        />
      )}

      <Input
        label="Username"
        value={username}
        onChangeText={setUsername}
        placeholder="Contoh: siti01 (huruf kecil/angka, tanpa spasi)"
        editable={!siswaId}
        style={{ marginTop: 10, opacity: siswaId ? 0.6 : 1 }}
      />
      {!siswaId && (
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Minimal 6 karakter"
          rahasia
        />
      )}
      <Text style={gaya.catatan}>
        {siswaId
          ? 'Username dan password tidak bisa diubah dari aplikasi. Jika siswa lupa password, buat akun baru dengan username lain, lalu hapus akun yang lama. Nama dan kelas bisa diubah di sini.'
          : 'Siswa menulis username sendiri saat login. Catat username dan password ini lalu berikan ke siswa, karena password tidak bisa dilihat lagi setelah disimpan. Soal yang diterima siswa mengikuti kelasnya.'}
      </Text>
      <Tombol
        judul={siswaId ? 'Simpan Perubahan' : 'Simpan Siswa'}
        onPress={simpan}
        memuat={menyimpan}
        style={{ marginTop: 16 }}
      />
    </FormWadah>
  );
}

const gaya = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: WARNA.teks, marginBottom: 8 },
  peringatan: {
    fontSize: 13,
    color: WARNA.peringatan,
    backgroundColor: WARNA.peringatanLatar,
    padding: 10,
    borderRadius: 6,
    lineHeight: 18,
    marginBottom: 6,
  },
  catatan: { fontSize: 13, color: WARNA.abu, lineHeight: 19 },
});
