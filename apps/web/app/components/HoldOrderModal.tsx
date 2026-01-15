'use client';

import { useState, useEffect } from 'react';
import { heldOrdersApi, type HeldOrderResponse } from '@/app/lib/api';

interface HoldOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onHoldOrder: (customerName: string, notes: string) => void;
    onResumeOrder: (order: HeldOrderResponse) => void;
}

const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(number);
};

const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

export default function HoldOrderModal({ isOpen, onClose, onHoldOrder, onResumeOrder }: HoldOrderModalProps) {
    const [activeTab, setActiveTab] = useState<'hold' | 'list'>('hold');
    const [customerName, setCustomerName] = useState('');
    const [notes, setNotes] = useState('');
    const [heldOrders, setHeldOrders] = useState<HeldOrderResponse[]>([]);
    const [loading, setLoading] = useState(false);

    // Load held orders when modal opens
    useEffect(() => {
        if (isOpen) {
            loadHeldOrders();
        }
    }, [isOpen]);

    const loadHeldOrders = async () => {
        try {
            setLoading(true);
            const orders = await heldOrdersApi.list();
            setHeldOrders(orders);
        } catch (err) {
            console.error('Failed to load held orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleHoldOrder = () => {
        onHoldOrder(customerName, notes);
        setCustomerName('');
        setNotes('');
        onClose();
    };

    const handleResumeOrder = async (order: HeldOrderResponse) => {
        try {
            // Delete from server first
            await heldOrdersApi.delete(order.id);
            // Then resume in UI
            onResumeOrder(order);
            onClose();
        } catch (err) {
            console.error('Failed to resume order:', err);
            alert('Gagal mengambil pesanan');
        }
    };

    const handleDeleteOrder = async (orderId: string) => {
        if (!confirm('Hapus pesanan ini?')) return;
        try {
            await heldOrdersApi.delete(orderId);
            await loadHeldOrders();
        } catch (err) {
            console.error('Failed to delete order:', err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                    <h2 className="text-xl font-bold">Hold Order</h2>
                    <p className="text-amber-100 text-sm">Simpan pesanan sementara</p>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('hold')}
                        className={`flex-1 py-3 font-medium text-sm transition-colors ${activeTab === 'hold'
                                ? 'text-amber-600 border-b-2 border-amber-500'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Simpan Baru
                    </button>
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`flex-1 py-3 font-medium text-sm transition-colors relative ${activeTab === 'list'
                                ? 'text-amber-600 border-b-2 border-amber-500'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Daftar Pending
                        {heldOrders.length > 0 && (
                            <span className="absolute top-2 right-4 bg-amber-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                                {heldOrders.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'hold' ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nama Pelanggan / Meja (Opsional)
                                </label>
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                                    placeholder="Contoh: Meja 5, Pak Budi"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Catatan (Opsional)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 resize-none"
                                    rows={3}
                                    placeholder="Catatan tambahan..."
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {loading ? (
                                <div className="text-center py-8 text-gray-400">Loading...</div>
                            ) : heldOrders.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    <span className="material-symbols-outlined text-4xl mb-2">receipt_long</span>
                                    <p>Tidak ada pesanan pending</p>
                                </div>
                            ) : (
                                heldOrders.map((order) => (
                                    <div
                                        key={order.id}
                                        className="border border-gray-200 rounded-xl p-4 hover:border-amber-300 transition-colors"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="font-bold text-gray-900">
                                                    {order.customerName || 'Tanpa Nama'}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {formatTime(order.createdAt)} • {order.items.length} item
                                                </p>
                                            </div>
                                            <p className="text-amber-600 font-bold">{formatRupiah(order.subtotal)}</p>
                                        </div>
                                        <p className="text-sm text-gray-500 mb-3 line-clamp-1">
                                            {order.items.map(i => `${i.productName} (${i.qty})`).join(', ')}
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleResumeOrder(order)}
                                                className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm transition-colors"
                                            >
                                                Lanjutkan
                                            </button>
                                            <button
                                                onClick={() => handleDeleteOrder(order.id)}
                                                className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        Batal
                    </button>
                    {activeTab === 'hold' && (
                        <button
                            type="button"
                            onClick={handleHoldOrder}
                            className="flex-1 py-3 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/30 transition-all"
                        >
                            Simpan
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
