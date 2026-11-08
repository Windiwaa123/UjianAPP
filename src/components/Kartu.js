import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BAYANGAN, RADIUS, WARNA } from '../theme';

export default function Kartu({ children, style }) {
  return <View style={[gaya.kartu, style]}>{children}</View>;
}

const gaya = StyleSheet.create({
  kartu: {
    backgroundColor: WARNA.putih,
    borderWidth: 1,
    borderColor: WARNA.garis,
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 14,
    ...BAYANGAN,
  },
});
