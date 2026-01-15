'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/lib/auth';
import { sessionsApi, type CashierSessionResponse } from '@/app/lib/api';
import { Input } from '@/app/components/ui/Input';

const formatRupiah = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

const formatTimeWIB = (dateStr: string) => {
  const date = new Date(dateStr);
  date.setHours(date.getHours() + 7);
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

const formatDateWIB = (dateStr: string) => {
  const date = new Date(dateStr);
  date.setHours(date.getHours() + 7);
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function SessionsReportPage() {
  const { user, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<CashierSessionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadSessions();
  }, [dateFrom, dateTo]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await sessionsApi.list(dateFrom, dateTo);
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div className="flex min-h-screen items-center justify-center"><span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span></div>;
  if (!user || user.role !== 'Admin') return <div className="flex min-h-screen items-center justify-center text-red-600">Unauthorized</div>;

  const totalSales = sessions.reduce((sum, s) => sum + s.totalSales, 0);
  const totalDiff = sessions.filter(s => s.status === 'Closed').reduce((sum, s) => sum + s.difference, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold">Laporan Shift Kasir</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-4 flex flex-wrap items-end gap-4">
          <div className="w-40"><Input label="Dari" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
          <div className="w-40"><Input label="Sampai" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
        </div>

        {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>}

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500">Total Shift</p>
            <p className="text-lg font-bold text-blue-600">{sessions.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500">Total Penjualan</p>
            <p className="text-lg font-bold text-green-600">{formatRupiah(totalSales)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500">Shift Aktif</p>
            <p className="text-lg font-bold text-orange-600">{sessions.filter(s => s.status === 'Open').length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500">Total Selisih Kas</p>
            <p className={`text-lg font-bold ${totalDiff === 0 ? 'text-green-600' : totalDiff > 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {totalDiff === 0 ? 'Pas' : totalDiff > 0 ? `+${formatRupiah(totalDiff)}` : formatRupiah(totalDiff)}
            </p>
          </div>
        </div>

        {/* Sessions Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 bg-gray-50 border-b font-bold text-sm">Daftar Shift</div>
          {loading ? (
            <div className="p-8 text-center"><span className="material-symbols-outlined animate-spin text-3xl text-blue-500">progress_activity</span></div>
          ) : sessions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Kasir</th>
                    <th className="px-4 py-2 text-left">Tanggal</th>
                    <th className="px-4 py-2 text-left">Mulai</th>
                    <th className="px-4 py-2 text-left">Selesai</th>
                    <th className="px-4 py-2 text-right">Transaksi</th>
                    <th className="px-4 py-2 text-right">Penjualan</th>
                    <th className="px-4 py-2 text-right">Kas Awal</th>
                    <th className="px-4 py-2 text-right">Kas Akhir</th>
                    <th className="px-4 py-2 text-right">Selisih</th>
                    <th className="px-4 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sessions.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{s.cashierName}</td>
                      <td className="px-4 py-2">{formatDateWIB(s.startTime)}</td>
                      <td className="px-4 py-2">{formatTimeWIB(s.startTime)}</td>
                      <td className="px-4 py-2">{s.endTime ? formatTimeWIB(s.endTime) : '-'}</td>
                      <td className="px-4 py-2 text-right">{s.totalTransactions}</td>
                      <td className="px-4 py-2 text-right font-medium">{formatRupiah(s.totalSales)}</td>
                      <td className="px-4 py-2 text-right">{formatRupiah(s.openingCash)}</td>
                      <td className="px-4 py-2 text-right">{s.status === 'Closed' ? formatRupiah(s.closingCash) : '-'}</td>
                      <td className="px-4 py-2 text-right">
                        {s.status === 'Closed' ? (
                          <span className={`font-medium ${s.difference === 0 ? 'text-green-600' : s.difference > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {s.difference === 0 ? 'Pas' : s.difference > 0 ? `+${formatRupiah(s.difference)}` : formatRupiah(s.difference)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.status === 'Open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {s.status === 'Open' ? 'Aktif' : 'Selesai'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400">
              <span className="material-symbols-outlined text-4xl mb-2">schedule</span>
              <p>Tidak ada shift pada periode ini</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
