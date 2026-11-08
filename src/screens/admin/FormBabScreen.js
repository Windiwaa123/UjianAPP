import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import FormWadah from '../../components/FormWadah';
import Input from '../../components/Input';
import Tombol from '../../components/Tombol';
import dataService from '../../services/dataService';
import { info } from '../../utils/dialog';
import { WARNA } from '../../theme';

export default function FormBabScreen({ navigation, route }) {
  const babId = route.params?.babId;
  const indukId = route.params?.indukId || null; // terisi = sedang mengisi bab
  const indukNama = route.params?.indukNama || '';
  const [memuat, setMemuat] = useState(!!babId);
  const [menyimpan, setMenyimpan] = useState(false);
  const [nama, setNama] = useState('');
  const [durasi, setDurasi] = useState('');

  useEffect(() => {
    if (!babId) return;
    (async () => {
      const b = await dataService.ambilBab(babId);
      if (b) {
        setNama(b.nama);
        setDurasi(b.durasiMenit ? String(b.durasiMenit) : '');
      }
      setMemuat(false);
    })();
  }, [babId]);

  const simpan = async () => {
    setMenyimpan(true);
    try {
      const data = { nama, durasiMenit: durasi, indukId };
      if (babId) await dataService.ubahBab(babId, data);
      else await dataService.tambahBab(data);
      navigation.goBack();
    } catch (e) {
      info(indukId ? 'Bab belum valid' : 'Mapel belum valid', e.message);
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
        label={indukId ? 'Nama Bab' : 'Nama Mapel (mata pelajaran)'}
        value={nama}
        onChangeText={setNama}
        placeholder={indukId ? `Contoh: ${indukNama || 'Matematika'} 1` : 'Contoh: Matematika'}
        autoCapitalize="sentences"
        maxLength={40}
      />
      {indukId ? (
        <Input
          label="Durasi bab (menit, opsional)"
          value={durasi}
          onChangeText={setDurasi}
          placeholder="Kosongkan untuk memakai durasi di Pengaturan Ujian"
          keyboardType="number-pad"
        />
      ) : null}
      <Text style={{ fontSize: 12, color: WARNA.abu, lineHeight: 17, marginBottom: 20 }}>
        {indukId
          ? 'Urutan bab diatur di daftar dengan tombol Naik dan Turun. Siswa harus mencapai nilai lulus di sub-bab sebelumnya untuk membuka sub-bab berikutnya.'
          : 'Setelah mapel dibuat, buka foldernya untuk menambah bab (misalnya Matematika 1, Matematika 2) dan mengisi soalnya.'}
      </Text>
      <Tombol judul={babId ? 'Simpan Perubahan' : indukId ? 'Simpan Bab' : 'Simpan Mapel'} onPress={simpan} memuat={menyimpan} />
    </FormWadah>
  );
}
