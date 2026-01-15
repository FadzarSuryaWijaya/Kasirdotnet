'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/lib/auth';
import { cashDrawerApi, type CashDrawerSummaryResponse, type CashDrawerHistoryResponse } from '@/app/lib/api';

const formatTimeWIB = (dateStr: string) => {
  const date = new Date(dateStr);
  date.setHours(date.getHours() + 7);
  return date.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

type ModalType = 'deposit' | 'withdraw' | 'adjust' | 'set' | null;

export default function CashDrawerPage() {
  const { user, loading: authLoading } = useAuth();
  const [summary, setSummary] = useState<CashDrawerSummaryResponse | null>(null);
  const [history, setHistory] = useState<CashDrawerHistoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [modalType, setModalType] = useState<ModalType>(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [summaryData, historyData] = await Promise.all([
        cashDrawerApi.getSummary(),
        cashDrawerApi.getHistory(undefined, undefined, 50)
      ]);
      setSummary(summaryData);
      setHistory(historyData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type: ModalType) => {
    setModalType(type);
    setAmount(type === 'set' && summary ? summary.currentBalance.toString() : '');
    setNotes('');
  };

  const handleSave = async () => {
    if (!amount || !notes.trim()) return;
    try {
      setSaving(true);
      const amountNum = parseFloat(amount);
      
      if (modalType === 'deposit') {
        await cashDrawerApi.deposit(amountNum, notes);
      } else if (modalType === 'withdraw') {
        await cashDrawerApi.withdraw(amountNum, notes);
      } else if (modalType === 'adjust') {
        await cashDrawerApi.adjust(amountNum, notes);
      } else if (modalType === 'set') {
        await cashDrawerApi.setBalance(amountNum, notes);
      }
      
      setModalType(null);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const getModalTitle = () => {
    switch (modalType) {
      case 'deposit': return 'Setoran Kas';
      case 'withdraw': return 'Pengambilan Kas';
      case 'adjust': return 'Penyesuaian Kas';
      case 'set': return 'Set Saldo Kas';
      default: return '';
    }
  };

  const getAmountLabel = () => {
    switch (modalType) {
      case 'deposit': return 'Jumlah Setoran';
      case 'withdraw': return 'Jumlah Pengambilan';
      case 'adjust': return 'Jumlah (+/-)';
      case 'set': return 'Saldo Baru';
      default: return 'Jumlah';
    }
  };

  const getMovementColor = (type: string, amount: number) => {
    if (type === 'Withdrawal' || amount < 0) return 'text-red-600';
    if (type === 'Deposit' || type === 'SalesIn' || amount > 0) return 'text-green-600';
    return 'text-blue-600';
  };

  const getMovementBg = (type: string) => {
    switch (type) {
      case 'SessionOpen': return 'bg-blue-100 text-blue-700';
      case 'SessionClose': return 'bg-purple-100 text-purple-700';
      case 'SalesIn': return 'bg-green-100 text-green-700';
      case 'Withdrawal': return 'bg-red-100 text-red-700';
      case 'Deposit': return 'bg-emerald-100 text-emerald-700';
      case 'Adjustment': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (authLoading) return <div className="flex min-h-screen items-center justify-center"><span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span></div>;
  if (!user || user.role !== 'Admin') return <div className="flex min-h-screen items-center justify-center text-red-600">Unauthorized</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold">Kas / Cash Drawer</h1>
          <p className="text-sm text-gray-500">Kelola saldo kas toko</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>}

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
              <p className="text-xs text-gray-500">Saldo Kas Saat Ini</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.currentBalance)}</p>
              <p className="text-xs text-gray-400 mt-1">Update: {formatTimeWIB(summary.lastUpdated)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-xs text-gray-500">Kas Masuk Hari Ini</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.todayCashIn)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-xs text-gray-500">Kas Keluar Hari Ini</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.todayCashOut)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-xs text-gray-500">Shift Aktif</p>
              <p className="text-2xl font-bold text-orange-600">{summary.activeSessions}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow p-4 mb-4 flex flex-wrap gap-2">
          <button onClick={() => openModal('deposit')} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <span className="material-symbols-outlined text-lg">add_circle</span>
            Setoran
          </button>
          <button onClick={() => openModal('withdraw')} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            <span className="material-symbols-outlined text-lg">remove_circle</span>
            Pengambilan
          </button>
          <button onClick={() => openModal('adjust')} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
            <span className="material-symbols-outlined text-lg">tune</span>
            Penyesuaian
          </button>
          <button onClick={() => openModal('set')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <span className="material-symbols-outlined text-lg">edit</span>
            Set Saldo
          </button>
        </div>

        {/* History Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 bg-gray-50 border-b font-bold text-sm">Riwayat Kas</div>
          {loading ? (
            <div className="p-8 text-center"><span className="material-symbols-outlined animate-spin text-3xl text-blue-500">progress_activity</span></div>
          ) : history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left">Waktu</th>
                    <th className="px-4 py-3 text-left">Tipe</th>
                    <th className="px-4 py-3 text-right">Jumlah</th>
                    <th className="px-4 py-3 text-right">Saldo</th>
                    <th className="px-4 py-3 text-left">Catatan</th>
                    <th className="px-4 py-3 text-left">User</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {history.map(h => (
                    <tr key={h.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-500">{formatTimeWIB(h.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getMovementBg(h.movementType)}`}>
                          {h.movementLabel}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${getMovementColor(h.movementType, h.amount)}`}>
                        {h.amount > 0 ? '+' : ''}{formatCurrency(h.amount)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-500">
                        {formatCurrency(h.balanceBefore)} → {formatCurrency(h.balanceAfter)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-[200px] truncate" title={h.notes || h.reference || ''}>
                        {h.notes || h.reference || '-'}
                      </td>
                      <td className="px-4 py-3 text-xs">{h.userName || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400">Belum ada riwayat kas</div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-bold">{getModalTitle()}</h3>
              <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4 space-y-4">
              {summary && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-500">Saldo saat ini</p>
                  <p className="font-bold text-lg">{formatCurrency(summary.currentBalance)}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">{getAmountLabel()}</label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder={modalType === 'adjust' ? 'Contoh: 50000 atau -50000' : '0'}
                  min={modalType === 'adjust' ? undefined : 0}
                />
                {modalType === 'adjust' && (
                  <p className="text-xs text-gray-500 mt-1">Gunakan angka negatif untuk mengurangi</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Catatan <span className="text-red-500">*</span></label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Alasan / keterangan..."
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t flex gap-2 justify-end">
              <button onClick={() => setModalType(null)} className="px-4 py-2 border rounded-lg">Batal</button>
              <button
                onClick={handleSave}
                disabled={saving || !amount || !notes.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
