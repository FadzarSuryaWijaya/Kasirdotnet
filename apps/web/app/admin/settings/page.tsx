'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5136';

interface SettingValue {
  value: string;
  description: string;
}

type Settings = Record<string, SettingValue>;

interface ResetOptions {
  resetTransactions: boolean;
  resetSessions: boolean;
  resetDailyReports: boolean;
  resetStockHistory: boolean;
  resetProductStock: boolean;
  resetCashDrawer: boolean;
}

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Reset data state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmCode, setResetConfirmCode] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetOptions, setResetOptions] = useState<ResetOptions>({
    resetTransactions: true,
    resetSessions: true,
    resetDailyReports: true,
    resetStockHistory: true,
    resetProductStock: true,
    resetCashDrawer: true
  });

  // Form state
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_BASE_URL}/api/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load settings');
      const data = await res.json();
      setSettings(data);
      
      // Initialize form data
      const initial: Record<string, string> = {};
      Object.entries(data).forEach(([key, val]) => {
        initial[key] = (val as SettingValue).value;
      });
      setFormData(initial);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) throw new Error('Failed to save settings');
      setSuccess('Pengaturan berhasil disimpan');
      
      // Trigger sidebar refresh by reloading the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleResetData = async () => {
    if (resetConfirmCode !== 'RESET-DATA') {
      alert('Kode konfirmasi salah. Ketik "RESET-DATA" untuk melanjutkan.');
      return;
    }

    try {
      setResetting(true);
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_BASE_URL}/api/settings/reset-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          confirmCode: resetConfirmCode,
          ...resetOptions
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal reset data');

      setShowResetModal(false);
      setResetConfirmCode('');
      setSuccess(`Data berhasil direset! Transaksi: ${data.result.transactionsDeleted}, Sesi: ${data.result.sessionsDeleted}, Laporan: ${data.result.dailyReportsDeleted}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal reset data');
    } finally {
      setResetting(false);
    }
  };

  if (authLoading) return <div className="flex min-h-screen items-center justify-center"><span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span></div>;
  if (!user || user.role !== 'Admin') return <div className="flex min-h-screen items-center justify-center text-red-600">Unauthorized</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold">Pengaturan</h1>
          <p className="text-sm text-gray-500">Konfigurasi toko dan sistem</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>}
        {success && <div className="mb-4 p-4 bg-green-100 text-green-700 rounded">{success}</div>}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <span className="material-symbols-outlined animate-spin text-3xl text-blue-500">progress_activity</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Store Info */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 py-3 bg-gray-50 border-b font-bold text-sm">Informasi Toko</div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nama Toko</label>
                  <input
                    type="text"
                    value={formData.store_name || ''}
                    onChange={e => handleChange('store_name', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Nama toko"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Alamat</label>
                  <input
                    type="text"
                    value={formData.store_address || ''}
                    onChange={e => handleChange('store_address', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Alamat toko"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Telepon</label>
                  <input
                    type="text"
                    value={formData.store_phone || ''}
                    onChange={e => handleChange('store_phone', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Nomor telepon"
                  />
                </div>
              </div>
            </div>

            {/* Operations */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 py-3 bg-gray-50 border-b font-bold text-sm">Operasional</div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Jam Buka</label>
                    <input
                      type="time"
                      value={formData.opening_hour || '08:00'}
                      onChange={e => handleChange('opening_hour', e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Jam Tutup</label>
                    <input
                      type="time"
                      value={formData.closing_hour || '22:00'}
                      onChange={e => handleChange('closing_hour', e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
                
                {/* Tax Mode */}
                <div>
                  <label className="block text-sm font-medium mb-2">Mode Pajak</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tax_mode"
                        value="default"
                        checked={formData.tax_mode === 'default'}
                        onChange={e => handleChange('tax_mode', e.target.value)}
                        className="w-4 h-4"
                      />
                      <span>Default (11% - PPN Indonesia)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tax_mode"
                        value="custom"
                        checked={formData.tax_mode === 'custom'}
                        onChange={e => handleChange('tax_mode', e.target.value)}
                        className="w-4 h-4"
                      />
                      <span>Custom</span>
                    </label>
                  </div>
                </div>

                {/* Tax Input */}
                {formData.tax_mode === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Pajak Custom (%)</label>
                    <input
                      type="number"
                      value={formData.custom_tax || '11'}
                      onChange={e => handleChange('custom_tax', e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                      min="0"
                      max="100"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">Batas Stok Menipis</label>
                  <input
                    type="number"
                    value={formData.low_stock_threshold || '5'}
                    onChange={e => handleChange('low_stock_threshold', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Produk dengan stok di bawah angka ini akan ditandai "menipis"</p>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 py-3 bg-gray-50 border-b font-bold text-sm">Metode Pembayaran</div>
              <div className="p-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.payment_cash_enabled === 'true'}
                    onChange={e => handleChange('payment_cash_enabled', e.target.checked ? 'true' : 'false')}
                    className="w-5 h-5 rounded"
                  />
                  <span className="font-medium">Cash</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.payment_qris_enabled === 'true'}
                    onChange={e => handleChange('payment_qris_enabled', e.target.checked ? 'true' : 'false')}
                    className="w-5 h-5 rounded"
                  />
                  <span className="font-medium">QRIS</span>
                </label>
              </div>
            </div>

            {/* Receipt */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 py-3 bg-gray-50 border-b font-bold text-sm">Struk</div>
              <div className="p-4">
                <label className="block text-sm font-medium mb-1">Footer Struk</label>
                <textarea
                  value={formData.receipt_footer || ''}
                  onChange={e => handleChange('receipt_footer', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={2}
                  placeholder="Pesan di bagian bawah struk"
                />
              </div>
            </div>

            {/* Danger Zone - Reset Data */}
            <div className="bg-white rounded-lg shadow border-2 border-red-200">
              <div className="px-4 py-3 bg-red-50 border-b border-red-200 font-bold text-sm text-red-700 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">warning</span>
                Zona Berbahaya
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900">Reset Data Ujicoba</p>
                    <p className="text-sm text-gray-500 mt-1">Hapus semua data transaksi, sesi kasir, laporan, dan riwayat stok. Data produk dan kategori tetap dipertahankan.</p>
                  </div>
                  <button
                    onClick={() => setShowResetModal(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium whitespace-nowrap"
                  >
                    Reset Data
                  </button>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reset Data Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-4 py-3 border-b flex items-center gap-2 bg-red-50">
              <span className="material-symbols-outlined text-red-600">warning</span>
              <h3 className="font-bold text-red-700">Reset Data</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                <p className="font-medium">Perhatian!</p>
                <p>Tindakan ini tidak dapat dibatalkan. Data yang dihapus tidak bisa dikembalikan.</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Pilih data yang akan dihapus:</p>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={resetOptions.resetTransactions} onChange={e => setResetOptions(prev => ({ ...prev, resetTransactions: e.target.checked }))} className="w-4 h-4 rounded" />
                  <span>Transaksi & Item Transaksi</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={resetOptions.resetSessions} onChange={e => setResetOptions(prev => ({ ...prev, resetSessions: e.target.checked }))} className="w-4 h-4 rounded" />
                  <span>Sesi Kasir (Shift)</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={resetOptions.resetDailyReports} onChange={e => setResetOptions(prev => ({ ...prev, resetDailyReports: e.target.checked }))} className="w-4 h-4 rounded" />
                  <span>Laporan Harian</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={resetOptions.resetStockHistory} onChange={e => setResetOptions(prev => ({ ...prev, resetStockHistory: e.target.checked }))} className="w-4 h-4 rounded" />
                  <span>Riwayat Stok</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={resetOptions.resetProductStock} onChange={e => setResetOptions(prev => ({ ...prev, resetProductStock: e.target.checked }))} className="w-4 h-4 rounded" />
                  <span>Reset Stok Produk ke 0</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={resetOptions.resetCashDrawer} onChange={e => setResetOptions(prev => ({ ...prev, resetCashDrawer: e.target.checked }))} className="w-4 h-4 rounded" />
                  <span>Riwayat Kas & Saldo Kas</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ketik <span className="font-mono bg-gray-100 px-1 rounded">RESET-DATA</span> untuk konfirmasi:</label>
                <input
                  type="text"
                  value={resetConfirmCode}
                  onChange={e => setResetConfirmCode(e.target.value.toUpperCase())}
                  className="w-full border rounded-lg px-3 py-2 font-mono"
                  placeholder="RESET-DATA"
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t flex gap-2 justify-end bg-gray-50">
              <button onClick={() => { setShowResetModal(false); setResetConfirmCode(''); }} className="px-4 py-2 border rounded-lg">Batal</button>
              <button
                onClick={handleResetData}
                disabled={resetting || resetConfirmCode !== 'RESET-DATA'}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {resetting ? 'Menghapus...' : 'Hapus Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
