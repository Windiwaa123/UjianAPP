import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WARNA } from '../theme';

// Pembungkus layar dengan area aman. Untuk layar yang memakai header bawaan,
// berikan edges={['bottom', 'left', 'right']}.
export default function Layar({ children, edges = ['top', 'bottom', 'left', 'right'], style }) {
  return (
    <SafeAreaView edges={edges} style={[gaya.wadah, style]}>
      {children}
    </SafeAreaView>
  );
}

const gaya = StyleSheet.create({
  wadah: { flex: 1, backgroundColor: WARNA.latar },
});
