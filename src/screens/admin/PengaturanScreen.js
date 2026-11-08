import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native';
import FormWadah from '../../components/FormWadah';
import Input from '../../components/Input';
import Tombol from '../../components/Tombol';
import dataService from '../../services/dataService';
import { info } from '../../utils/dialog';
import { WARNA } from '../../theme';

export default function PengaturanScreen() {
  const [memuat, setMemuat] = useState(true);
  const [judulUjian, setJudulUjian] = useState('');
  const [durasiMenit, setDurasiMenit] = useState('');
  const [kkm, setKkm] = useState('');
  const [acakSoal, setAcakSoal] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);

  const [passLama, setPassLama] = useState('');
  const [passBaru, setPassBaru] = useState('');
  const [passUlang, setPassUlang] = useState('');
  const [mengubah, setMengubah] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await dataService.ambilPengaturan();
      setJudulUjian(p.judulUjian);
      setDurasiMenit(String(p.durasiMenit));
      setKkm(String(p.kkm));
      setAcakSoal(p.acakSoal);
      setMemuat(false);
    })();
  }, []);

  const simpan = async () => {
    setMenyimpan(true);
    try {
      await dataService.simpanPengaturan({ judulUjian, durasiMenit, kkm, acakSoal });
      info('Tersimpan', 'Pengaturan ujian berhasil disimpan.');
    } catch (e) {
      info('Pengaturan belum valid', e.message);
    }
    setMenyimpan(false);
  };

  const ubahPassword = async () => {
    if (passBaru !== passUlang) {
      info('Password tidak sama', 'Password baru dan ulangannya harus sama.');
      return;
    }
    setMengubah(true);
    try {
      await dataService.ubahPasswordAdmin(passLama, passBaru);
      setPassLama('');
      setPassBaru('');
      setPassUlang('');
      info('Berhasil', 'Password admin sudah diganti.');
    } catch (e) {
      info('Gagal mengganti password', e.message);
    }
    setMengubah(false);
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
      <Text style={gaya.bagian}>Pengaturan ujian</Text>
      <Input label="Judul ujian" value={judulUjian} onChangeText={setJudulUjian} autoCapitalize="sentences" />
      <Input
        label="Durasi bawaan per bab (menit)"
        value={durasiMenit}
        onChangeText={setDurasiMenit}
        keyboardType="number-pad"
      />
      <Input
        label="Nilai minimal lulus"
        value={kkm}
        onChangeText={setKkm}
        keyboardType="number-pad"
      />
      <View style={gaya.barisSwitch}>
        <View style={{ flex: 1 }}>
          <Text style={gaya.labelSwitch}>Acak urutan soal</Text>
          <Text style={gaya.ketSwitch}>Urutan diacak di dalam tiap jenis soal. Jenis soal tetap berurutan.</Text>
        </View>
        <Switch
          value={acakSoal}
          onValueChange={setAcakSoal}
          trackColor={{ true: WARNA.utama, false: WARNA.garis }}
        />
      </View>
      <Tombol judul="Simpan Pengaturan" onPress={simpan} memuat={menyimpan} />

      <Text style={[gaya.bagian, { marginTop: 36 }]}>Ganti password admin</Text>
      <Input label="Password lama" value={passLama} onChangeText={setPassLama} rahasia />
      <Input label="Password baru (minimal 6 karakter)" value={passBaru} onChangeText={setPassBaru} rahasia />
      <Input label="Ulangi password baru" value={passUlang} onChangeText={setPassUlang} rahasia />
      <Tombol judul="Ganti Password" varian="sekunder" onPress={ubahPassword} memuat={mengubah} />
    </FormWadah>
  );
}

const gaya = StyleSheet.create({
  bagian: { fontSize: 18, fontWeight: '700', color: WARNA.utamaGelap, marginBottom: 14 },
  barisSwitch: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  labelSwitch: { fontSize: 14, fontWeight: '600', color: WARNA.teks },
  ketSwitch: { fontSize: 12, color: WARNA.abu, marginTop: 2 },
});
