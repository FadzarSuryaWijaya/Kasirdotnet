'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/lib/auth';
import { transactionsApi, type TransactionListItemResponse, type TransactionResponse } from '@/app/lib/api';

const formatTimeWIB = (dateStr: string) => {
  const date = new Date(dateStr);
  date.setHours(date.getHours() + 7);
  return date.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

export default function AdminTransactionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<TransactionListItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Void modal
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<TransactionListItemResponse | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [txDetail, setTxDetail] = useState<TransactionResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    loadData();
  }, [page, selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await transactionsApi.list(page, 20, selectedDate, selectedDate, false);
      setTransactions(data.items);
      setTotalPages(data.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openVoidModal = (tx: TransactionListItemResponse) => {
    setSelectedTx(tx);
    setVoidReason('');
    setShowVoidModal(true);
  };

  const handleVoid = async () => {
    if (!selectedTx || !voidReason.trim()) return;
    try {
      setVoiding(true);
      await transactionsApi.void(selectedTx.id, voidReason);
      setShowVoidModal(false);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal void transaksi');
    } finally {
      setVoiding(false);
    }
  };

  const openDetail = async (txId: string) => {
    setLoadingDetail(true);
    setShowDetailModal(true);
    try {
      const detail = await transactionsApi.getById(txId);
      setTxDetail(detail);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  if (authLoading) return <div className="flex min-h-screen items-center justify-center"><span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span></div>;
  if (!user || user.role !== 'Admin') return <div className="flex min-h-screen items-center justify-center text-red-600">Unauthorized</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Daftar Transaksi</h1>
            <p className="text-sm text-gray-500">Kelola dan void transaksi</p>
          </div>
          <input type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setPage(1); }} className="border rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>}

        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-8 text-center"><span className="material-symbols-outlined animate-spin text-3xl text-blue-500">progress_activity</span></div>
          ) : transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left">Invoice</th>
                    <th className="px-4 py-3 text-left">Kasir</th>
                    <th className="px-4 py-3 text-center">Items</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-center">Metode</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-left">Waktu</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transactions.map(t => (
                    <tr key={t.id} className={`hover:bg-gray-50 ${t.status === 'Voided' ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3 font-mono text-xs">{t.invoiceNo}</td>
                      <td className="px-4 py-3">{t.cashierName}</td>
                      <td className="px-4 py-3 text-center">{t.itemCount}</td>
                      <td className={`px-4 py-3 text-right font-medium ${t.status === 'Voided' ? 'text-red-600 line-through' : ''}`}>{formatCurrency(t.total)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.paymentMethod === 'Cash' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{t.paymentMethod}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.status === 'Voided' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {t.status === 'Voided' ? 'Void' : 'Selesai'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatTimeWIB(t.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openDetail(t.id)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Detail">
                            <span className="material-symbols-outlined text-lg">visibility</span>
                          </button>
                          {t.status !== 'Voided' && (
                            <button onClick={() => openVoidModal(t)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Void">
                              <span className="material-symbols-outlined text-lg">block</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400">Tidak ada transaksi</div>
          )}

          {totalPages > 1 && (
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <p className="text-sm text-gray-500">Halaman {page} dari {totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Void Modal */}
      {showVoidModal && selectedTx && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-bold text-red-600">Void Transaksi</h3>
              <button onClick={() => setShowVoidModal(false)} className="text-gray-400 hover:text-gray-600"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700 font-medium">⚠️ Perhatian</p>
                <p className="text-xs text-red-600 mt-1">Void transaksi akan mengembalikan stok dan membatalkan penjualan. Aksi ini tidak dapat dibatalkan.</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-500">Invoice</p>
                <p className="font-mono font-bold">{selectedTx.invoiceNo}</p>
                <p className="text-sm text-gray-500 mt-2">Total</p>
                <p className="font-bold text-lg">{formatCurrency(selectedTx.total)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Alasan Void <span className="text-red-500">*</span></label>
                <textarea value={voidReason} onChange={e => setVoidReason(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} placeholder="Contoh: Salah input, pelanggan batal, dll..." />
              </div>
            </div>
            <div className="px-4 py-3 border-t flex gap-2 justify-end">
              <button onClick={() => setShowVoidModal(false)} className="px-4 py-2 border rounded-lg">Batal</button>
              <button onClick={handleVoid} disabled={voiding || !voidReason.trim()} className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50">
                {voiding ? 'Memproses...' : 'Void Transaksi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-bold">Detail Transaksi</h3>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {loadingDetail ? (
                <div className="text-center py-8"><span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span></div>
              ) : txDetail ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><p className="text-gray-500">Invoice</p><p className="font-mono font-bold">{txDetail.invoiceNo}</p></div>
                    <div><p className="text-gray-500">Kasir</p><p className="font-medium">{txDetail.cashierName}</p></div>
                    <div><p className="text-gray-500">Waktu</p><p>{formatTimeWIB(txDetail.createdAt)}</p></div>
                    <div><p className="text-gray-500">Metode</p><p>{txDetail.paymentMethod}</p></div>
                  </div>
                  {txDetail.status === 'Voided' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-red-700">Transaksi Void</p>
                      <p className="text-xs text-red-600">Oleh: {txDetail.voidedByName}</p>
                      <p className="text-xs text-red-600">Alasan: {txDetail.voidReason}</p>
                    </div>
                  )}
                  <div className="border-t pt-4">
                    <p className="font-medium mb-2">Items</p>
                    <div className="space-y-2">
                      {txDetail.items.map(item => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{item.productName} x{item.qty}</span>
                          <span>{formatCurrency(item.lineTotal)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="border-t pt-4 space-y-1 text-sm">
                    <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(txDetail.subtotal)}</span></div>
                    {txDetail.discount > 0 && <div className="flex justify-between text-red-600"><span>Diskon</span><span>-{formatCurrency(txDetail.discount)}</span></div>}
                    {txDetail.tax > 0 && <div className="flex justify-between"><span>Pajak</span><span>{formatCurrency(txDetail.tax)}</span></div>}
                    <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total</span><span>{formatCurrency(txDetail.total)}</span></div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400">Data tidak ditemukan</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
