'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/lib/auth';
import { transactionsApi, type TransactionListItemResponse } from '@/app/lib/api';

const formatRupiah = (number: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number);
};

type FilterType = 'day' | 'month' | 'year';

export default function HistoryPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [transactions, setTransactions] = useState<TransactionListItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filter state
  const [filterType, setFilterType] = useState<FilterType>('day');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  // Stats
  const [omzet, setOmzet] = useState(0);

  // Calculate date range based on filter
  const getDateRange = () => {
    const now = new Date();
    let dateFrom: string;
    let dateTo: string;

    if (filterType === 'day') {
      dateFrom = selectedDate;
      dateTo = selectedDate;
    } else if (filterType === 'month') {
      const [year, month] = selectedMonth.split('-');
      dateFrom = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      dateTo = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;
    } else {
      dateFrom = `${selectedYear}-01-01`;
      dateTo = `${selectedYear}-12-31`;
    }

    return { dateFrom, dateTo };
  };

  // Get filter label
  const getFilterLabel = () => {
    if (filterType === 'day') {
      return new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } else if (filterType === 'month') {
      const [year, month] = selectedMonth.split('-');
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    } else {
      return `Tahun ${selectedYear}`;
    }
  };

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setLoading(true);
        const { dateFrom, dateTo } = getDateRange();
        
        const result = await transactionsApi.list(page, 20, dateFrom, dateTo, true);
        setTransactions(result.items);
        setTotalPages(result.pages);
        setTotalCount(result.total);

        // Calculate omzet from all transactions in range (need to load all for accurate total)
        // For now, we'll show page total and indicate it's partial if there are more pages
        const pageOmzet = result.items.reduce((acc, curr) => acc + curr.total, 0);
        
        // If only 1 page, this is the total. Otherwise, we need a separate API call for accurate total
        if (result.pages <= 1) {
          setOmzet(pageOmzet);
        } else {
          // Load all to get accurate total (or ideally have a summary endpoint)
          let allOmzet = 0;
          for (let p = 1; p <= result.pages; p++) {
            const pageResult = await transactionsApi.list(p, 100, dateFrom, dateTo, true);
            allOmzet += pageResult.items.reduce((acc, curr) => acc + curr.total, 0);
          }
          setOmzet(allOmzet);
        }
      } catch (err) {
        console.error('Failed to load transactions', err);
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, [page, filterType, selectedDate, selectedMonth, selectedYear]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [filterType, selectedDate, selectedMonth, selectedYear]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f5f7f8] text-[#111418] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between whitespace-nowrap border-b border-[#e5e7eb] bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="size-8 text-[#3c83f6]">
              <span className="material-symbols-outlined text-4xl">receipt_long</span>
            </div>
            <h2 className="text-xl font-bold leading-tight tracking-[-0.015em]">Riwayat Transaksi</h2>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/kasir')} className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg transition-colors">
            <span className="material-symbols-outlined text-xl">point_of_sale</span>
            <span className="text-sm font-bold">Kembali ke POS</span>
          </button>
          <div className="flex items-center gap-3 bg-[#f0f2f5] rounded-lg p-1 pr-4">
            <div className="bg-white p-1.5 rounded-md shadow-sm">
              <span className="material-symbols-outlined text-[#3c83f6] text-xl">person</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-[#60708a]">Cashier</span>
              <span className="text-sm font-bold">{user.name}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* Filter Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Filter Type Tabs */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setFilterType('day')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${filterType === 'day' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Harian
              </button>
              <button
                onClick={() => setFilterType('month')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${filterType === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Bulanan
              </button>
              <button
                onClick={() => setFilterType('year')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${filterType === 'year' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Tahunan
              </button>
            </div>

            {/* Date Picker based on filter type */}
            {filterType === 'day' && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              />
            )}
            {filterType === 'month' && (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              />
            )}
            {filterType === 'year' && (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            )}

            <div className="flex-1" />
            <span className="text-sm text-gray-500">{getFilterLabel()}</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="size-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
              <span className="material-symbols-outlined text-2xl">payments</span>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">
                Omzet {filterType === 'day' ? 'Hari Ini' : filterType === 'month' ? 'Bulan Ini' : 'Tahun Ini'}
              </p>
              <p className="text-xl font-bold text-gray-900">{formatRupiah(omzet)}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="size-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <span className="material-symbols-outlined text-2xl">receipt_long</span>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Transaksi</p>
              <p className="text-xl font-bold text-gray-900">{totalCount} Struk</p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500">Memuat data transaksi...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <span className="material-symbols-outlined text-4xl mb-2 text-gray-300">search_off</span>
              <p>Tidak ada transaksi pada periode ini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-gray-100 text-[#60708a] text-xs uppercase tracking-wider font-bold">
                    <th className="px-6 py-4">Invoice</th>
                    <th className="px-6 py-4">Waktu</th>
                    <th className="px-6 py-4">Items</th>
                    <th className="px-6 py-4 text-right">Total</th>
                    <th className="px-6 py-4 text-center">Metode</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="font-bold text-[#111418] group-hover:text-blue-600 transition-colors">{tx.invoiceNo}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">{new Date(tx.createdAt).toLocaleDateString('id-ID')}</span>
                          <span className="text-xs text-gray-500">
                            {(() => {
                              const date = new Date(tx.createdAt);
                              const wibDate = new Date(date.getTime() + (7 * 60 * 60 * 1000));
                              return wibDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                            })()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-600">{tx.itemCount} Item</td>
                      <td className="px-6 py-4 text-right"><span className="font-bold text-[#111418]">{formatRupiah(tx.total)}</span></td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${tx.paymentMethod === 'Cash' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                          {tx.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => router.push(`/kasir/receipt/${tx.id}`)} className="flex items-center justify-center gap-2 text-[#3c83f6] hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors w-full md:w-auto mx-auto">
                          <span className="material-symbols-outlined text-xl">print</span>
                          <span className="text-sm font-bold">Cetak Struk</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-gray-100 px-6 py-4 bg-[#f8fafc] flex items-center justify-between">
              <span className="text-sm text-gray-500">Halaman <span className="font-bold text-gray-900">{page}</span> dari {totalPages}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 transition-colors">Prev</button>
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 transition-colors">Next</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
