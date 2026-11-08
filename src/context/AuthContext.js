import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import dataService from '../services/dataService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [pengguna, setPengguna] = useState(null);
  const [memuat, setMemuat] = useState(true);

  // Pulihkan sesi login terakhir dari Firebase Auth (tersimpan di HP)
  useEffect(() => {
    (async () => {
      try {
        await dataService.inisialisasi();
        const sesi = await dataService.ambilSesi();
        if (sesi) setPengguna(sesi);
      } catch (e) {
        console.warn('Gagal menyiapkan aplikasi', e);
      } finally {
        setMemuat(false);
      }
    })();
  }, []);

  const masuk = useCallback(async (peran, username, password) => {
    const user = await dataService.masuk(peran, username, password);
    await dataService.simpanSesi(user);
    setPengguna(user);
  }, []);

  const keluar = useCallback(async () => {
    await dataService.hapusSesi();
    setPengguna(null);
  }, []);

  const nilai = useMemo(() => ({ pengguna, memuat, masuk, keluar }), [pengguna, memuat, masuk, keluar]);

  return <AuthContext.Provider value={nilai}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}
