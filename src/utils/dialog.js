import { Alert } from 'react-native';

// Dialog konfirmasi dengan dua tombol
export const konfirmasi = (judul, pesan, onYa, teksYa = 'Ya', bahaya = false) => {
  Alert.alert(judul, pesan, [
    { text: 'Batal', style: 'cancel' },
    { text: teksYa, style: bahaya ? 'destructive' : 'default', onPress: onYa },
  ]);
};

export const info = (judul, pesan) => Alert.alert(judul, pesan, [{ text: 'OK' }]);
