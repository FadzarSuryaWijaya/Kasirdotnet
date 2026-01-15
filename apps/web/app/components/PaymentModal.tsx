'use client';

import { useState, useEffect } from 'react';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (paymentMethod: 'Cash' | 'QRIS', paidAmount: number) => void;
    total: number;
}

const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(number);
};

export default function PaymentModal({ isOpen, onClose, onConfirm, total }: PaymentModalProps) {
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'QRIS'>('Cash');
    const [paidAmount, setPaidAmount] = useState<string>('');
    const [error, setError] = useState<string>('');

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setPaidAmount('');
            setPaymentMethod('Cash');
            setError('');
        }
    }, [isOpen]);

    const paidValue = parseFloat(paidAmount) || 0;
    const changeAmount = paymentMethod === 'Cash' ? Math.max(0, paidValue - total) : 0;

    // Quick amount buttons for Cash
    const quickAmounts = [
        { label: 'Uang Pas', value: total },
        { label: formatRupiah(50000), value: 50000 },
        { label: formatRupiah(100000), value: 100000 },
        { label: formatRupiah(200000), value: 200000 },
    ];

    const handleConfirm = () => {
        if (paymentMethod === 'Cash' && paidValue < total) {
            setError('Jumlah bayar kurang dari total');
            return;
        }

        const finalPaidAmount = paymentMethod === 'QRIS' ? total : paidValue;
        onConfirm(paymentMethod, finalPaidAmount);
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
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-[#3c83f6] to-blue-600 text-white">
                    <h2 className="text-xl font-bold">Pembayaran</h2>
                    <p className="text-blue-100 text-sm">Pilih metode pembayaran</p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Total Amount */}
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                        <p className="text-sm text-gray-500 mb-1">Total Bayar</p>
                        <p className="text-3xl font-bold text-[#3c83f6]">{formatRupiah(total)}</p>
                    </div>

                    {/* Payment Method Toggle */}
                    <div className="flex bg-gray-100 rounded-xl p-1">
                        <button
                            type="button"
                            onClick={() => setPaymentMethod('Cash')}
                            className={`flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${paymentMethod === 'Cash'
                                    ? 'bg-white text-[#3c83f6] shadow-md'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <span className="material-symbols-outlined">payments</span>
                            Cash
                        </button>
                        <button
                            type="button"
                            onClick={() => setPaymentMethod('QRIS')}
                            className={`flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${paymentMethod === 'QRIS'
                                    ? 'bg-white text-[#3c83f6] shadow-md'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <span className="material-symbols-outlined">qr_code_2</span>
                            QRIS
                        </button>
                    </div>

                    {/* Cash Input Section */}
                    {paymentMethod === 'Cash' && (
                        <div className="space-y-4">
                            {/* Quick Amounts */}
                            <div className="grid grid-cols-2 gap-2">
                                {quickAmounts.map((qa, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setPaidAmount(String(qa.value))}
                                        className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-all ${paidValue === qa.value
                                                ? 'border-[#3c83f6] bg-blue-50 text-[#3c83f6]'
                                                : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                            }`}
                                    >
                                        {qa.label}
                                    </button>
                                ))}
                            </div>

                            {/* Manual Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Jumlah Uang Diterima
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">Rp</span>
                                    <input
                                        type="number"
                                        value={paidAmount}
                                        onChange={(e) => {
                                            setPaidAmount(e.target.value);
                                            setError('');
                                        }}
                                        className="w-full pl-12 pr-4 py-3 text-lg font-medium border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3c83f6]/30 focus:border-[#3c83f6]"
                                        placeholder="0"
                                    />
                                </div>
                                {error && (
                                    <p className="text-red-500 text-sm mt-1">{error}</p>
                                )}
                            </div>

                            {/* Change Amount */}
                            {paidValue >= total && (
                                <div className="bg-green-50 rounded-xl p-4 flex justify-between items-center">
                                    <span className="text-green-700 font-medium">Kembalian</span>
                                    <span className="text-green-700 text-xl font-bold">{formatRupiah(changeAmount)}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* QRIS Section */}
                    {paymentMethod === 'QRIS' && (
                        <div className="text-center py-8 bg-gray-50 rounded-xl">
                            <div className="w-32 h-32 mx-auto bg-white rounded-xl shadow-inner flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-6xl text-gray-300">qr_code_2</span>
                            </div>
                            <p className="text-gray-500 text-sm">Scan QRIS untuk pembayaran</p>
                            <p className="text-xs text-gray-400 mt-1">Pembayaran exact sesuai total</p>
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
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={paymentMethod === 'Cash' && paidValue < total}
                        className="flex-1 py-3 rounded-xl font-bold bg-[#3c83f6] hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30 disabled:bg-gray-300 disabled:shadow-none transition-all"
                    >
                        Konfirmasi
                    </button>
                </div>
            </div>
        </div>
    );
}
