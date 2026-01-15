'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/lib/auth';
import { stockApi, type StockSummaryResponse, type StockHistoryResponse } from '@/app/lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5136';

const formatTimeWIB = (dateStr: string) => {
  const date = new Date(dateStr);
  date.setHours(date.getHours() + 7);
  return date.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

interface ProductStock {
  id: string;
  name: string;
  categoryName: string;
  stock: number;
  trackStock: boolean;
  isLowStock: boolean;
  isOutOfStock: boolean;
}

export default function StockPage() {
  const { user, loading: authLoading } = useAuth();
  const [summary, setSummary] = useState<StockSummaryResponse | null>(null);
  const [history, setHistory] = useState<StockHistoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'low'>('all');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'restock' | 'adjust' | 'set'>('restock');
  const [selectedProduct, setSelectedProduct] = useState<ProductStock | null>(null);
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // History modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [productHistory, setProductHistory] = useState<StockHistoryResponse[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [summaryData, historyData] = await Promise.all([
        stockApi.getSummary(filter === 'low'),
        stockApi.getAllHistory(50)
      ]);
      setSummary(summaryData);
      setHistory(historyData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type: 'restock' | 'adjust' | 'set', product: ProductStock) => {
    setModalType(type);
    setSelectedProduct(product);
    setQuantity(type === 'set' ? product.stock.toString() : '');
    setNotes('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!selectedProduct || !quantity) return;
    try {
      setSaving(true);
      const qty = parseInt(quantity);
      if (modalType === 'restock') {
        await stockApi.restock(selectedProduct.id, qty, notes || undefined);
      } else if (modalType === 'adjust') {
        await stockApi.adjust(selectedProduct.id, qty, notes || undefined);
      } else {
        await stockApi.setStock(selectedProduct.id, qty, notes || undefined);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const toggleTrackStock = async (product: ProductStock) => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_BASE_URL}/api/stock/${product.id}/track-stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ trackStock: !product.trackStock })
      });
      if (!res.ok) throw new Error('Failed to toggle');
      loadData();
    } catch (err) {
      alert('Gagal mengubah status tracking');
    }
  };

  const enableAllTracking = async () => {
    if (!confirm('Aktifkan tracking stok untuk semua produk?')) return;
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_BASE_URL}/api/stock/enable-all-tracking`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      alert(data.message);
      loadData();
    } catch (err) {
      alert('Gagal mengaktifkan tracking');
    }
  };

  const openHistory = async (product: ProductStock) => {
    setHistoryLoading(true);
    setShowHistoryModal(true);
    setSelectedProduct(product);
    try {
      const data = await stockApi.getProductHistory(product.id, 50);
      setProductHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  if (authLoading) return <div className="flex min-h-screen items-center justify-center"><span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span></div>;
  if (!user || user.role !== 'Admin') return <div className="flex min-h-screen items-center justify-center text-red-600">Unauthorized</div>;

  const untrackedCount = summary?.products.filter(p => !p.trackStock).length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Inventori / Stok</h1>
            <p className="text-sm text-gray-500">Kelola stok barang fisik di toko</p>
          </div>
          {untrackedCount > 0 && (
            <button onClick={enableAllTracking} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">inventory_2</span>
              Aktifkan Semua ({untrackedCount})
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>}

        {/* Warning banner for untracked products */}
        {untrackedCount > 0 && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <span className="material-symbols-outlined text-amber-600">info</span>
            <div>
              <p className="font-medium text-amber-800">Ada {untrackedCount} produk belum di-track stoknya</p>
              <p className="text-sm text-amber-700">Produk tanpa tracking tidak akan berkurang saat dijual.</p>
            </div>
          </div>
        )}

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-xs text-gray-500">Total Produk</p>
              <p className="text-2xl font-bold text-blue-600">{summary.totalProducts}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-xs text-gray-500">Di-track</p>
              <p className="text-2xl font-bold text-green-600">{summary.totalProducts - untrackedCount}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-xs text-gray-500">Stok Menipis</p>
              <p className="text-2xl font-bold text-orange-600">{summary.lowStockCount}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-xs text-gray-500">Stok Habis</p>
              <p className="text-2xl font-bold text-red-600">{summary.outOfStockCount}</p>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="bg-white rounded-lg shadow p-4 mb-4 flex items-center gap-4">
          <span className="text-sm font-medium text-gray-600">Filter:</span>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button onClick={() => setFilter('all')} className={`px-4 py-1.5 text-sm font-medium rounded-md ${filter === 'all' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600'}`}>Semua</button>
            <button onClick={() => setFilter('low')} className={`px-4 py-1.5 text-sm font-medium rounded-md ${filter === 'low' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-600'}`}>Stok Menipis</button>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Products list */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-3 bg-gray-50 border-b font-bold text-sm">Daftar Produk</div>
            {loading ? (
              <div className="p-8 text-center"><span className="material-symbols-outlined animate-spin text-3xl text-blue-500">progress_activity</span></div>
            ) : summary && summary.products.length > 0 ? (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Produk</th>
                      <th className="px-3 py-2 text-center">Track</th>
                      <th className="px-3 py-2 text-right">Stok</th>
                      <th className="px-3 py-2 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {summary.products.map(p => (
                      <tr key={p.id} className={`hover:bg-gray-50 ${!p.trackStock ? 'bg-gray-50/50' : ''}`}>
                        <td className="px-3 py-2">
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.categoryName}</p>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button onClick={() => toggleTrackStock(p as ProductStock)} className={`w-10 h-5 rounded-full transition-colors relative ${p.trackStock ? 'bg-green-500' : 'bg-gray-300'}`}>
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${p.trackStock ? 'left-5' : 'left-0.5'}`} />
                          </button>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {p.trackStock ? (
                            <span className={`px-2 py-1 rounded text-xs font-bold ${p.isOutOfStock ? 'bg-red-100 text-red-700' : p.isLowStock ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{p.stock}</span>
                          ) : (
                            <span className="text-gray-400 text-xs">∞</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {p.trackStock ? (
                            <div className="flex items-center justify-center gap-0.5">
                              <button onClick={() => openModal('restock', p as ProductStock)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Restok"><span className="material-symbols-outlined text-base">add_circle</span></button>
                              <button onClick={() => openModal('adjust', p as ProductStock)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Adjust"><span className="material-symbols-outlined text-base">tune</span></button>
                              <button onClick={() => openModal('set', p as ProductStock)} className="p-1 text-orange-600 hover:bg-orange-50 rounded" title="Set"><span className="material-symbols-outlined text-base">edit</span></button>
                              <button onClick={() => openHistory(p as ProductStock)} className="p-1 text-gray-600 hover:bg-gray-100 rounded" title="Riwayat"><span className="material-symbols-outlined text-base">history</span></button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-400">
                <span className="material-symbols-outlined text-4xl mb-2">inventory_2</span>
                <p>Tidak ada produk</p>
                <p className="text-sm mt-1">Tambahkan produk di menu Produk</p>
              </div>
            )}
          </div>

          {/* Recent history */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-3 bg-gray-50 border-b font-bold text-sm">Riwayat Terbaru</div>
            {history.length > 0 ? (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left">Produk</th>
                      <th className="px-4 py-2 text-center">Tipe</th>
                      <th className="px-4 py-2 text-right">Qty</th>
                      <th className="px-4 py-2 text-left">Waktu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {history.map(h => (
                      <tr key={h.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <p className="font-medium truncate max-w-[150px]">{h.productName}</p>
                          {h.reference && <p className="text-xs text-gray-500">{h.reference}</p>}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${h.movementType === 'In' ? 'bg-green-100 text-green-700' : h.movementType === 'Out' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                            {h.movementType === 'In' ? 'Masuk' : h.movementType === 'Out' ? 'Keluar' : 'Adjust'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right font-medium">
                          <span className={h.quantity > 0 ? 'text-green-600' : 'text-red-600'}>{h.quantity > 0 ? '+' : ''}{h.quantity}</span>
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-500">{formatTimeWIB(h.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-400">
                <span className="material-symbols-outlined text-4xl mb-2">history</span>
                <p>Belum ada riwayat</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stock Modal */}
      {showModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-bold">{modalType === 'restock' ? 'Restok Barang' : modalType === 'adjust' ? 'Penyesuaian Stok' : 'Set Stok'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium">{selectedProduct.name}</p>
                <p className="text-sm text-gray-500">Stok saat ini: <span className="font-bold">{selectedProduct.stock}</span></p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{modalType === 'restock' ? 'Jumlah Masuk' : modalType === 'adjust' ? 'Jumlah (+/-)' : 'Stok Baru'}</label>
                <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder={modalType === 'adjust' ? 'Contoh: 5 atau -3' : '0'} min={modalType === 'restock' ? 1 : modalType === 'set' ? 0 : undefined} />
                {modalType === 'adjust' && <p className="text-xs text-gray-500 mt-1">Gunakan angka negatif untuk mengurangi</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Catatan (opsional)</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Alasan perubahan..." />
              </div>
            </div>
            <div className="px-4 py-3 border-t flex gap-2 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg">Batal</button>
              <button onClick={handleSave} disabled={saving || !quantity} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-bold">Riwayat: {selectedProduct.name}</h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-600"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {historyLoading ? (
                <div className="text-center py-8"><span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span></div>
              ) : productHistory.length > 0 ? (
                <div className="space-y-2">
                  {productHistory.map(h => (
                    <div key={h.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${h.movementType === 'In' ? 'bg-green-100 text-green-700' : h.movementType === 'Out' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          {h.movementType === 'In' ? 'Masuk' : h.movementType === 'Out' ? 'Keluar' : 'Adjust'}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">{formatTimeWIB(h.createdAt)}</p>
                        {h.notes && <p className="text-xs text-gray-400">{h.notes}</p>}
                        {h.reference && <p className="text-xs text-blue-500">{h.reference}</p>}
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${h.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>{h.quantity > 0 ? '+' : ''}{h.quantity}</p>
                        <p className="text-xs text-gray-500">{h.stockBefore} → {h.stockAfter}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">Belum ada riwayat</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
