'use client';

import { useState } from 'react';
import { sessionsApi, type CashierSessionResponse } from '@/app/lib/api';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: CashierSessionResponse | null;
  onSessionChange: () => void;
}

const formatRupiah = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

const formatTimeWIB = (dateStr: string) => {
  const date = new Date(dateStr);
  date.setHours(date.getHours() + 7);
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

export default function ShiftModal({ isOpen, onClose, session, onSessionChange }: ShiftModalProps) {
  const [openingCash, setOpeningCash] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleStartShift = async () => {
    if (!openingCash) {
      setError('Masukkan saldo awal kas');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await sessionsApi.start({ openingCash: parseFloat(openingCash) });
      setOpeningCash('');
      onSessionChange();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memulai shift');
    } finally {
      setLoading(false);
    }
  };

  const handleEndShift = async () => {
    if (!closingCash) {
      setError('Masukkan jumlah uang fisik');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await sessionsApi.end({ 
        closingCash: parseFloat(closingCash),
        notes: notes || undefined
      });
      setClosingCash('');
      setNotes('');
      onSessionChange();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengakhiri shift');
    } finally {
      setLoading(false);
    }
  };

  // Start Shift View
  if (!session) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-green-500">play_circle</span>
              Mulai Shift
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-medium mb-1">⚠️ Anda belum memulai shift</p>
              <p>Masukkan saldo awal kas di laci untuk memulai shift dan mulai transaksi.</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Saldo Awal Kas (Rp)</label>
              <input
                type="number"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                className="w-full border rounded-lg px-4 py-3 text-lg"
                placeholder="0"
                autoFocus
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
          <div className="px-6 py-4 border-t flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-3 border rounded-lg font-medium">
              Batal
            </button>
            <button
              onClick={handleStartShift}
              disabled={loading || !openingCash}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined">play_arrow</span>
              )}
              Mulai Shift
            </button>
          </div>
        </div>
      </div>
    );
  }

  // End Shift View
  const expectedCash = session.expectedCash;
  const diff = closingCash ? parseFloat(closingCash) - expectedCash : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-red-500">stop_circle</span>
            Akhiri Shift
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Session Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Mulai Shift</span>
              <span className="font-medium">{formatTimeWIB(session.startTime)} WIB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Saldo Awal</span>
              <span className="font-medium">{formatRupiah(session.openingCash)}</span>
            </div>
            <hr />
            <div className="flex justify-between">
              <span className="text-gray-500">Total Transaksi</span>
              <span className="font-medium">{session.totalTransactions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Penjualan Cash</span>
              <span className="font-medium text-green-600">{formatRupiah(session.totalCash)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Penjualan Non-Cash</span>
              <span className="font-medium text-blue-600">{formatRupiah(session.totalNonCash)}</span>
            </div>
            <hr />
            <div className="flex justify-between font-bold">
              <span>Kas Seharusnya</span>
              <span className="text-lg">{formatRupiah(expectedCash)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Uang Fisik di Laci (Rp)</label>
            <input
              type="number"
              value={closingCash}
              onChange={(e) => setClosingCash(e.target.value)}
              className="w-full border rounded-lg px-4 py-3 text-lg"
              placeholder="Hitung dan masukkan jumlah uang"
            />
          </div>

          {closingCash && (
            <div className={`p-3 rounded-lg text-sm font-medium ${
              diff === 0 ? 'bg-green-100 text-green-700' :
              diff > 0 ? 'bg-blue-100 text-blue-700' :
              'bg-red-100 text-red-700'
            }`}>
              Selisih: {diff === 0 ? 'Pas ✓' : diff > 0 ? `+${formatRupiah(diff)} (Lebih)` : `${formatRupiah(diff)} (Kurang)`}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Catatan (opsional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              rows={2}
              placeholder="Catatan tambahan..."
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-3 border rounded-lg font-medium">
            Batal
          </button>
          <button
            onClick={handleEndShift}
            disabled={loading || !closingCash}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined">stop</span>
            )}
            Akhiri Shift
          </button>
        </div>
      </div>
    </div>
  );
}
