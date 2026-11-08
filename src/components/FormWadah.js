import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import Layar from './Layar';
import { JARAK } from '../theme';

// Layar berisi formulir: bisa digulir dan tidak tertutup keyboard.
// tanpaPadding: isi menempel ke tepi layar (dipakai halaman login yang punya banner penuh).
export default function FormWadah({ children, edges, tanpaPadding = false }) {
  return (
    <Layar edges={edges}>
      <KeyboardAvoidingView
        style={gaya.isi}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={tanpaPadding ? gaya.gulirPenuh : gaya.gulir}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Layar>
  );
}

const gaya = StyleSheet.create({
  isi: { flex: 1 },
  gulir: { padding: JARAK.lg, paddingBottom: JARAK.xl * 2 },
  gulirPenuh: { paddingBottom: JARAK.xl * 2 },
});
