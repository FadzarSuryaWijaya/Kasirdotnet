'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/lib/auth';
import { transactionsApi, type VoidedTransactionResponse } from '@/app/lib/api';

const formatTimeWIB = (dateStr: string) => {
  const date = new Date(dateStr);
  date.setHours(date.getHours() + 7);
  return date.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

export default function VoidedTransactionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<VoidedTransactionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadData();
  }, [page]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await transactionsApi.getVoided(page, 20);
      setTransactions(data.items);
      setTotalPages(data.pages);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div className="flex min-h-screen items-center justify-center"><span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span></div>;
  if (!user || user.role !== 'Admin') return <div className="flex min-h-screen items-center justify-center text-red-600">Unauthorized</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold">Transaksi Void</h1>
          <p className="text-sm text-gray-500">Daftar transaksi yang telah di-void</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>}

        {/* Summary */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <p className="text-sm text-gray-500">Total Transaksi Void</p>
          <p className="text-2xl font-bold text-red-600">{total}</p>
        </div>

        {/* Table */}
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
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-left">Waktu Transaksi</th>
                    <th className="px-4 py-3 text-left">Waktu Void</th>
                    <th className="px-4 py-3 text-left">Di-void Oleh</th>
                    <th className="px-4 py-3 text-left">Alasan</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transactions.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{t.invoiceNo}</td>
                      <td className="px-4 py-3">{t.cashierName}</td>
                      <td className="px-4 py-3 text-right font-medium text-red-600 line-through">{formatCurrency(t.total)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatTimeWIB(t.createdAt)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{t.voidedAt ? formatTimeWIB(t.voidedAt) : '-'}</td>
                      <td className="px-4 py-3">{t.voidedByName || '-'}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-[200px] truncate" title={t.voidReason || ''}>{t.voidReason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400">Tidak ada transaksi void</div>
          )}

          {/* Pagination */}
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
    </div>
  );
}
