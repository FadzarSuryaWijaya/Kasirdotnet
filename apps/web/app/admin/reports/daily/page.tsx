'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/lib/auth';
import { reportsApi, type DailyReportResponse, type ClosureStatusResponse } from '@/app/lib/api';
import { Input } from '@/app/components/ui/Input';

const formatRupiah = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

export default function DailyReportPage() {
  const { user, loading: authLoading } = useAuth();
  const [report, setReport] = useState<DailyReportResponse | null>(null);
  const [closureStatus, setClosureStatus] = useState<ClosureStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Close day modal
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [physicalCash, setPhysicalCash] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [reportData, statusData] = await Promise.all([
        reportsApi.getDailyReport(selectedDate),
        reportsApi.getClosureStatus(selectedDate)
      ]);
      setReport(reportData);
      setClosureStatus(statusData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeWIB = (dateStr: string) => {
    const date = new Date(dateStr);
    date.setHours(date.getHours() + 7);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateTimeWIB = (dateStr: string) => {
    const date = new Date(dateStr);
    date.setHours(date.getHours() + 7);
    return date.toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
  };

  const handleCloseDay = async () => {
    if (!physicalCash) return;
    try {
      setClosing(true);
      await reportsApi.closeDay({
        date: selectedDate,
        physicalCashCount: parseFloat(physicalCash),
        notes: closeNotes || undefined
      });
      setShowCloseModal(false);
      setPhysicalCash('');
      setCloseNotes('');
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menutup hari');
    } finally {
      setClosing(false);
    }
  };

  const handleReopenDay = async () => {
    if (!report?.closure || !confirm('Yakin ingin membuka kembali hari ini? Data closure akan dihapus.')) return;
    try {
      // Need closure ID - get from closureStatus
      if (closureStatus?.closure?.id) {
        await reportsApi.reopenDay(closureStatus.closure.id);
        loadData();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal membuka hari');
    }
  };

  const exportToExcel = () => {
    if (!report) return;
    let csv = `LAPORAN HARIAN\nTanggal,${report.date}\nStatus,${report.isClosed ? 'CLOSED' : 'OPEN'}\n\n`;
    csv += `RINGKASAN\nTotal Penjualan,${report.totalSales}\nTotal Transaksi,${report.totalTransactions}\n`;
    csv += `Total Qty,${report.totalQty}\nTotal Diskon,${report.totalDiscount}\nTotal Pajak,${report.totalTax}\n\n`;
    if (report.closure) {
      csv += `REKONSILIASI KAS\nKas Sistem,${closureStatus?.systemCashTotal || 0}\nKas Fisik,${report.closure.physicalCashCount}\nSelisih,${report.closure.cashDifference}\n\n`;
    }
    csv += `METODE PEMBAYARAN\nMetode,Jumlah,Total\n`;
    report.byPaymentMethod.forEach(m => { csv += `${m.method},${m.count},${m.amount}\n`; });
    csv += `\nPRODUK TERJUAL\nProduk,Qty,Total\n`;
    report.topProducts.forEach(p => { csv += `${p.productName},${p.qtySold},${p.totalSales}\n`; });
    csv += `\nTRANSAKSI\nInvoice,Jam,Total,Metode,Kasir\n`;
    report.transactions.forEach(t => { csv += `${t.invoiceNo},${formatTimeWIB(t.createdAt)},${t.total},${t.paymentMethod},${t.cashierName}\n`; });
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `laporan-${report.date}.csv`;
    link.click();
  };

  if (authLoading) return <div className="flex min-h-screen items-center justify-center"><span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span></div>;
  if (!user || user.role !== 'Admin') return <div className="flex min-h-screen items-center justify-center text-red-600">Unauthorized</div>;

  const cashDiff = report?.closure?.cashDifference || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b"><div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div><h1 className="text-xl font-bold">Laporan Harian</h1></div>
        {report && (
          <div className={`px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 ${report.isClosed ? 'bg-green-600 text-white' : 'bg-amber-100 text-amber-800 border border-amber-300'}`}>
            <span className="material-symbols-outlined text-lg">{report.isClosed ? 'verified' : 'edit_note'}</span>
            {report.isClosed ? 'FINAL' : 'DRAFT'}
            <span className="text-xs font-normal opacity-80">({report.isClosed ? 'Dikunci' : 'Belum Ditutup'})</span>
          </div>
        )}
      </div></div>

      <div className="max-w-7xl mx-auto p-4">
        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-4 flex flex-wrap items-end gap-4">
          <div className="w-48"><Input label="Tanggal" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} /></div>
          <button onClick={exportToExcel} disabled={!report} className="px-3 py-2 bg-green-600 text-white rounded text-sm disabled:opacity-50 flex items-center gap-1"><span className="material-symbols-outlined text-lg">table_view</span>Excel</button>
          <button onClick={() => window.print()} disabled={!report} className="px-3 py-2 bg-gray-600 text-white rounded text-sm disabled:opacity-50 flex items-center gap-1"><span className="material-symbols-outlined text-lg">print</span>Print</button>
          <div className="flex-1" />
          {report && !report.isClosed && (
            <button 
              onClick={() => { setPhysicalCash(String(closureStatus?.systemCashTotal || 0)); setShowCloseModal(true); }} 
              disabled={closureStatus?.openSessions && closureStatus.openSessions.length > 0}
              className="px-4 py-2 bg-red-600 text-white rounded text-sm font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              title={closureStatus?.openSessions && closureStatus.openSessions.length > 0 ? 'Tutup semua shift terlebih dahulu' : ''}
            >
              <span className="material-symbols-outlined text-lg">lock</span>Tutup Hari
            </button>
          )}
          {report?.isClosed && (
            <button onClick={handleReopenDay} className="px-4 py-2 bg-orange-500 text-white rounded text-sm font-medium flex items-center gap-1"><span className="material-symbols-outlined text-lg">lock_open</span>Buka Kembali</button>
          )}
        </div>

        {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>}

        {loading ? (
          <div className="text-center py-12"><span className="material-symbols-outlined text-4xl animate-spin text-blue-500">progress_activity</span><p className="mt-2 text-gray-500">Memuat...</p></div>
        ) : report ? (
          <div className="space-y-4">
            {/* Closure Info Banner */}
            {report.isClosed && report.closure && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-600">verified</span>
                  <div className="flex-1">
                    <p className="font-medium text-amber-800">Hari Sudah Ditutup</p>
                    <p className="text-sm text-amber-700">Ditutup oleh {report.closure.closedByName} pada {formatDateTimeWIB(report.closure.closedAt)} WIB</p>
                    {report.closure.notes && <p className="text-sm text-amber-600 mt-1">Catatan: {report.closure.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-amber-600">Selisih Kas</p>
                    <p className={`text-lg font-bold ${cashDiff === 0 ? 'text-green-600' : cashDiff > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {cashDiff === 0 ? 'Pas' : cashDiff > 0 ? `+${formatRupiah(cashDiff)}` : formatRupiah(cashDiff)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Open Sessions Warning */}
            {!report.isClosed && closureStatus && closureStatus.openSessions && closureStatus.openSessions.length > 0 && (
              <div className="bg-orange-50 border border-orange-300 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-orange-600">warning</span>
                  <div>
                    <p className="font-medium text-orange-800">Shift Masih Aktif</p>
                    <p className="text-sm text-orange-700">Tutup semua shift sebelum menutup hari:</p>
                    <ul className="mt-2 space-y-1">
                      {closureStatus.openSessions.map(s => (
                        <li key={s.sessionId} className="text-sm text-orange-700 flex items-center gap-2">
                          <span className="material-symbols-outlined text-base">person</span>
                          {s.cashierName} (mulai {formatTimeWIB(s.startTime)} WIB)
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Day Summary Box */}
            {closureStatus && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-lg">schedule</span>Ringkasan Hari</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><p className="text-gray-500">Transaksi Pertama</p><p className="font-medium">{closureStatus.firstTransactionAt ? formatTimeWIB(closureStatus.firstTransactionAt) + ' WIB' : '-'}</p></div>
                  <div><p className="text-gray-500">Transaksi Terakhir</p><p className="font-medium">{closureStatus.lastTransactionAt ? formatTimeWIB(closureStatus.lastTransactionAt) + ' WIB' : '-'}</p></div>
                  <div><p className="text-gray-500">Total Kas (Cash)</p><p className="font-medium text-green-600">{formatRupiah(closureStatus.systemCashTotal)}</p></div>
                  <div><p className="text-gray-500">Total Non-Cash (QRIS)</p><p className="font-medium text-blue-600">{formatRupiah(closureStatus.systemQrisTotal)}</p></div>
                </div>
              </div>
            )}

            {/* Summary Cards Row 1 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-xs text-gray-500">Total Penjualan</p>
                <p className="text-lg font-bold text-blue-600">{formatRupiah(report.totalSales)}</p>
                {report.salesChange !== undefined && report.salesChange !== null && (
                  <p className={`text-xs ${report.salesChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {report.salesChange >= 0 ? '↑' : '↓'} {Math.abs(report.salesChange).toFixed(1)}% vs kemarin
                  </p>
                )}
              </div>
              <div className="bg-white rounded-lg shadow p-4"><p className="text-xs text-gray-500">Total Transaksi</p><p className="text-lg font-bold text-green-600">{report.totalTransactions}</p></div>
              <div className="bg-white rounded-lg shadow p-4"><p className="text-xs text-gray-500">Rata-rata</p><p className="text-lg font-bold text-orange-600">{formatRupiah(report.totalTransactions > 0 ? report.totalSales / report.totalTransactions : 0)}</p></div>
              <div className="bg-white rounded-lg shadow p-4"><p className="text-xs text-gray-500">Total Qty</p><p className="text-lg font-bold text-purple-600">{report.totalQty}</p></div>
            </div>

            {/* Summary Cards Row 2 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-lg shadow p-4"><p className="text-xs text-gray-500">Item Terjual</p><p className="text-lg font-bold text-indigo-600">{report.totalItemsSold}</p></div>
              <div className="bg-white rounded-lg shadow p-4"><p className="text-xs text-gray-500">Total Diskon</p><p className="text-lg font-bold text-red-500">{formatRupiah(report.totalDiscount)}</p></div>
              <div className="bg-white rounded-lg shadow p-4"><p className="text-xs text-gray-500">Total Pajak</p><p className="text-lg font-bold text-amber-600">{formatRupiah(report.totalTax)}</p></div>
              <div className="bg-white rounded-lg shadow p-4"><p className="text-xs text-gray-500">Net Sales</p><p className="text-lg font-bold text-teal-600">{formatRupiah(report.totalSales - report.totalDiscount)}</p></div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow">
                <div className="px-4 py-3 bg-gray-50 border-b font-bold text-sm">Metode Pembayaran</div>
                <div className="p-4 space-y-3">
                  {report.byPaymentMethod.length > 0 ? report.byPaymentMethod.map((m, i) => {
                    const pct = report.totalSales > 0 ? (m.amount / report.totalSales) * 100 : 0;
                    const colors = ['bg-blue-500', 'bg-green-500', 'bg-orange-500'];
                    return (
                      <div key={m.method}>
                        <div className="flex justify-between text-sm mb-1"><span>{m.method === 'Cash' ? 'Tunai' : m.method}</span><span>{formatRupiah(m.amount)} ({pct.toFixed(1)}%)</span></div>
                        <div className="w-full bg-gray-200 rounded-full h-3"><div className={`${colors[i % 3]} h-3 rounded-full`} style={{ width: `${pct}%` }} /></div>
                        <p className="text-xs text-gray-500">{m.count} transaksi</p>
                      </div>
                    );
                  }) : <p className="text-gray-400 text-center py-4">Tidak ada data</p>}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow">
                <div className="px-4 py-3 bg-gray-50 border-b font-bold text-sm">Penjualan Per Jam</div>
                <div className="p-4">
                  {report.hourlySales.length > 0 ? (
                    <div className="flex items-end gap-0.5 h-32">
                      {Array.from({ length: 24 }, (_, h) => {
                        const d = report.hourlySales.find(x => x.hour === h);
                        const max = Math.max(...report.hourlySales.map(x => x.amount), 1);
                        const ht = d ? (d.amount / max) * 100 : 0;
                        return (
                          <div key={h} className="flex-1 flex flex-col items-center group" title={d ? `${h}:00 - ${formatRupiah(d.amount)}` : `${h}:00`}>
                            <div className={`w-full rounded-t ${ht > 0 ? 'bg-blue-500' : 'bg-gray-100'}`} style={{ height: `${Math.max(ht, 2)}%` }} />
                            {h % 6 === 0 && <span className="text-[9px] text-gray-400 mt-1">{h}</span>}
                          </div>
                        );
                      })}
                    </div>
                  ) : <p className="text-gray-400 text-center py-8">Tidak ada data</p>}
                </div>
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 py-3 bg-gray-50 border-b font-bold text-sm">Produk Terjual (Top 10)</div>
              {report.topProducts.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-gray-100"><tr><th className="px-4 py-2 text-left">#</th><th className="px-4 py-2 text-left">Produk</th><th className="px-4 py-2 text-right">Qty</th><th className="px-4 py-2 text-right">Total</th></tr></thead>
                  <tbody className="divide-y">
                    {report.topProducts.map((p, i) => <tr key={p.productId} className="hover:bg-gray-50"><td className="px-4 py-2 text-gray-500">{i + 1}</td><td className="px-4 py-2">{p.productName}</td><td className="px-4 py-2 text-right">{p.qtySold}</td><td className="px-4 py-2 text-right font-medium">{formatRupiah(p.totalSales)}</td></tr>)}
                  </tbody>
                </table>
              ) : <div className="p-8 text-center text-gray-400">Tidak ada produk terjual</div>}
            </div>

            {/* Transactions */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 py-3 bg-gray-50 border-b font-bold text-sm">Daftar Transaksi</div>
              {report.transactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100"><tr><th className="px-4 py-2 text-left">Invoice</th><th className="px-4 py-2 text-left">Jam</th><th className="px-4 py-2 text-right">Total</th><th className="px-4 py-2 text-center">Metode</th><th className="px-4 py-2 text-left">Kasir</th><th className="px-4 py-2 text-right">Item</th></tr></thead>
                    <tbody className="divide-y">
                      {report.transactions.map(t => (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-mono text-xs">{t.invoiceNo}</td>
                          <td className="px-4 py-2">{formatTimeWIB(t.createdAt)}</td>
                          <td className="px-4 py-2 text-right font-medium">{formatRupiah(t.total)}</td>
                          <td className="px-4 py-2 text-center"><span className={`px-2 py-0.5 rounded text-xs ${t.paymentMethod === 'Cash' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{t.paymentMethod === 'Cash' ? 'Tunai' : t.paymentMethod}</span></td>
                          <td className="px-4 py-2">{t.cashierName}</td>
                          <td className="px-4 py-2 text-right">{t.itemCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div className="p-8 text-center text-gray-400"><span className="material-symbols-outlined text-4xl mb-2">receipt_long</span><p>Tidak ada transaksi</p></div>}
            </div>
          </div>
        ) : <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">Pilih tanggal untuk melihat laporan</div>}
      </div>

      {/* Close Day Modal */}
      {showCloseModal && closureStatus && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-bold">Tutup Kasir / Tutup Hari</h3>
              <button onClick={() => setShowCloseModal(false)} className="text-gray-400 hover:text-gray-600"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Tanggal</span><span className="font-medium">{new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Total Transaksi</span><span className="font-medium">{closureStatus.totalTransactions}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Total Penjualan</span><span className="font-medium">{formatRupiah(closureStatus.systemTotalSales)}</span></div>
                <hr />
                <div className="flex justify-between"><span className="text-gray-500">Kas (Cash) Sistem</span><span className="font-bold text-green-600">{formatRupiah(closureStatus.systemCashTotal)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Non-Cash (QRIS)</span><span className="font-medium text-blue-600">{formatRupiah(closureStatus.systemQrisTotal)}</span></div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Kas Fisik di Laci (Rp)</label>
                <input type="number" value={physicalCash} onChange={e => setPhysicalCash(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="Masukkan jumlah uang fisik" />
                {physicalCash && (
                  <div className={`mt-2 p-2 rounded text-sm ${parseFloat(physicalCash) - closureStatus.systemCashTotal === 0 ? 'bg-green-100 text-green-700' : parseFloat(physicalCash) - closureStatus.systemCashTotal > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                    Selisih: {parseFloat(physicalCash) - closureStatus.systemCashTotal === 0 ? 'Pas ✓' : formatRupiah(parseFloat(physicalCash) - closureStatus.systemCashTotal)}
                    {parseFloat(physicalCash) - closureStatus.systemCashTotal > 0 && ' (Lebih)'}
                    {parseFloat(physicalCash) - closureStatus.systemCashTotal < 0 && ' (Kurang)'}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Catatan (opsional)</label>
                <textarea value={closeNotes} onChange={e => setCloseNotes(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} placeholder="Catatan tambahan..." />
              </div>
            </div>
            <div className="px-4 py-3 border-t flex gap-2 justify-end">
              <button onClick={() => setShowCloseModal(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
              <button onClick={handleCloseDay} disabled={!physicalCash || closing} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-1">
                {closing ? <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span> : <span className="material-symbols-outlined text-lg">lock</span>}
                Tutup Hari
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
