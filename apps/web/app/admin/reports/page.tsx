'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/lib/auth';
import Link from 'next/link';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5136';

const formatRupiah = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

interface ReportSummary {
  // Today
  todaySales: number;
  todayTransactions: number;
  todayCash: number;
  todayQris: number;
  // This month
  monthSales: number;
  monthTransactions: number;
  // This year
  yearSales: number;
  yearTransactions: number;
  // Sessions
  activeSessions: number;
  todaySessions: number;
  // Comparison
  yesterdaySales: number;
  lastMonthSales: number;
}

interface MonthlySales {
  month: string;
  sales: number;
  transactions: number;
}

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [monthlySales, setMonthlySales] = useState<MonthlySales[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      const res = await fetch(`${API_BASE_URL}/api/reports/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to load summary');
      
      const data = await res.json();
      setSummary(data.summary);
      setMonthlySales(data.monthlySales || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const calcChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  if (authLoading) return <div className="flex min-h-screen items-center justify-center"><span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span></div>;
  if (!user || user.role !== 'Admin') return <div className="flex min-h-screen items-center justify-center text-red-600">Unauthorized</div>;

  const todayChange = summary ? calcChange(summary.todaySales, summary.yesterdaySales) : 0;
  const monthChange = summary ? calcChange(summary.monthSales, summary.lastMonthSales) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold">Laporan</h1>
          <p className="text-sm text-gray-500">Ringkasan penjualan dan performa toko</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>}

        {loading ? (
          <div className="text-center py-12"><span className="material-symbols-outlined animate-spin text-4xl text-blue-500">progress_activity</span></div>
        ) : summary ? (
          <div className="space-y-6">
            {/* Quick Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link href="/admin/reports/daily" className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow border-l-4 border-blue-500">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-blue-500 text-2xl">calendar_today</span>
                  <div>
                    <p className="font-bold">Laporan Harian</p>
                    <p className="text-xs text-gray-500">Detail per hari</p>
                  </div>
                </div>
              </Link>
              <Link href="/admin/reports/sessions" className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow border-l-4 border-green-500">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-green-500 text-2xl">schedule</span>
                  <div>
                    <p className="font-bold">Laporan Shift</p>
                    <p className="text-xs text-gray-500">Per kasir & shift</p>
                  </div>
                </div>
              </Link>
              <Link href="/admin/transactions" className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow border-l-4 border-orange-500">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-orange-500 text-2xl">receipt_long</span>
                  <div>
                    <p className="font-bold">Transaksi</p>
                    <p className="text-xs text-gray-500">Daftar & void</p>
                  </div>
                </div>
              </Link>
              <Link href="/admin/cash-drawer" className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow border-l-4 border-purple-500">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-purple-500 text-2xl">account_balance_wallet</span>
                  <div>
                    <p className="font-bold">Kas Toko</p>
                    <p className="text-xs text-gray-500">Saldo & riwayat</p>
                  </div>
                </div>
              </Link>
            </div>

            {/* Today Summary */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 py-3 bg-blue-50 border-b flex items-center justify-between">
                <h2 className="font-bold text-blue-800 flex items-center gap-2">
                  <span className="material-symbols-outlined">today</span>
                  Hari Ini
                </h2>
                {summary.activeSessions > 0 && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    {summary.activeSessions} shift aktif
                  </span>
                )}
              </div>
              <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Total Penjualan</p>
                  <p className="text-2xl font-bold text-blue-600">{formatRupiah(summary.todaySales)}</p>
                  {summary.yesterdaySales > 0 && (
                    <p className={`text-xs ${todayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {todayChange >= 0 ? '↑' : '↓'} {Math.abs(todayChange).toFixed(1)}% vs kemarin
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500">Transaksi</p>
                  <p className="text-2xl font-bold text-green-600">{summary.todayTransactions}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Cash</p>
                  <p className="text-xl font-bold text-emerald-600">{formatRupiah(summary.todayCash)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">QRIS</p>
                  <p className="text-xl font-bold text-purple-600">{formatRupiah(summary.todayQris)}</p>
                </div>
              </div>
            </div>

            {/* Month & Year Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow">
                <div className="px-4 py-3 bg-green-50 border-b">
                  <h2 className="font-bold text-green-800 flex items-center gap-2">
                    <span className="material-symbols-outlined">date_range</span>
                    Bulan Ini
                  </h2>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-500">Total Penjualan</p>
                  <p className="text-2xl font-bold text-green-600">{formatRupiah(summary.monthSales)}</p>
                  {summary.lastMonthSales > 0 && (
                    <p className={`text-xs ${monthChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {monthChange >= 0 ? '↑' : '↓'} {Math.abs(monthChange).toFixed(1)}% vs bulan lalu
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-2">{summary.monthTransactions} transaksi</p>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow">
                <div className="px-4 py-3 bg-orange-50 border-b">
                  <h2 className="font-bold text-orange-800 flex items-center gap-2">
                    <span className="material-symbols-outlined">calendar_month</span>
                    Tahun Ini
                  </h2>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-500">Total Penjualan</p>
                  <p className="text-2xl font-bold text-orange-600">{formatRupiah(summary.yearSales)}</p>
                  <p className="text-sm text-gray-500 mt-2">{summary.yearTransactions} transaksi</p>
                </div>
              </div>
            </div>

            {/* Monthly Chart */}
            {monthlySales.length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-4 py-3 bg-gray-50 border-b">
                  <h2 className="font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined">bar_chart</span>
                    Penjualan Bulanan
                  </h2>
                </div>
                <div className="p-4">
                  <div className="flex items-end gap-2 h-48">
                    {monthlySales.map((m, i) => {
                      const maxSales = Math.max(...monthlySales.map(x => x.sales), 1);
                      const height = (m.sales / maxSales) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center group">
                          <div className="w-full flex flex-col items-center justify-end h-40">
                            <div 
                              className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer relative"
                              style={{ height: `${Math.max(height, 2)}%` }}
                              title={`${m.month}: ${formatRupiah(m.sales)}`}
                            >
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                {formatRupiah(m.sales)}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-gray-500 mt-2">{m.month}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
            Tidak ada data
          </div>
        )}
      </div>
    </div>
  );
}
