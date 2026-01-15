'use client';

import { useState, useEffect } from 'react';

// Helper for formatting currency
const formatRupiah = (number: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number);
};

type ItemDiscountType = 'percent' | 'fixed';

interface ItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    productId: string;
    productName: string;
    unitPrice: number;
    qty: number;
    discountType: ItemDiscountType;
    discountValue: number;
    note: string;
  } | null;
  onSave: (data: {
    qty: number;
    discountType: ItemDiscountType;
    discountValue: number;
    note: string;
  }) => void;
  onRemove: () => void;
}

export default function ItemDetailModal({
  isOpen,
  onClose,
  item,
  onSave,
  onRemove,
}: ItemDetailModalProps) {
  const [qty, setQty] = useState(1);
  const [discountType, setDiscountType] = useState<ItemDiscountType>('percent');
  const [discountValue, setDiscountValue] = useState(0);
  const [note, setNote] = useState('');

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      setQty(item.qty);
      setDiscountType(item.discountType);
      setDiscountValue(item.discountValue);
      setNote(item.note);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const lineTotal = item.unitPrice * qty;
  const discountAmount = discountType === 'percent'
    ? (lineTotal * discountValue / 100)
    : discountValue;
  const finalPrice = Math.max(0, lineTotal - discountAmount);

  const handleSave = () => {
    onSave({
      qty,
      discountType,
      discountValue,
      note,
    });
    onClose();
  };

  const handleRemove = () => {
    onRemove();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0f172a] to-[#1e293b] p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">{item.productName}</h3>
              <p className="text-blue-300 text-sm font-medium">
                {formatRupiah(item.unitPrice)} / item
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Jumlah
            </label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
              >
                <span className="material-symbols-outlined">remove</span>
              </button>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center text-xl font-bold border border-gray-200 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <button
                onClick={() => setQty(qty + 1)}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
              >
                <span className="material-symbols-outlined">add</span>
              </button>
            </div>
          </div>

          {/* Item Discount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Diskon Item
            </label>
            <div className="flex items-center gap-2">
              {/* Discount Type Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setDiscountType('percent');
                    setDiscountValue(0);
                  }}
                  className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${
                    discountType === 'percent'
                      ? 'bg-white text-blue-500 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDiscountType('fixed');
                    setDiscountValue(0);
                  }}
                  className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${
                    discountType === 'fixed'
                      ? 'bg-white text-blue-500 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Rp
                </button>
              </div>
              {/* Discount Input */}
              <input
                type="number"
                min="0"
                max={discountType === 'percent' ? 100 : lineTotal}
                step={discountType === 'percent' ? 1 : 500}
                value={discountValue}
                onChange={(e) => {
                  let val = parseFloat(e.target.value) || 0;
                  if (discountType === 'percent') {
                    val = Math.min(100, Math.max(0, val));
                  } else {
                    val = Math.min(lineTotal, Math.max(0, val));
                  }
                  setDiscountValue(val);
                }}
                className="flex-1 px-4 py-2 text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                placeholder="0"
              />
            </div>
            {discountAmount > 0 && (
              <p className="text-green-600 text-sm mt-2">
                Potongan: -{formatRupiah(discountAmount)}
              </p>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Catatan
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Tanpa gula, Extra shot..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          {/* Price Summary */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal ({qty}x)</span>
              <span>{formatRupiah(lineTotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Diskon {discountType === 'percent' ? `(${discountValue}%)` : ''}</span>
                <span>-{formatRupiah(discountAmount)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-2 flex justify-between">
              <span className="font-bold text-gray-900">Total Item</span>
              <span className="font-bold text-blue-500 text-lg">{formatRupiah(finalPrice)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-gray-50 border-t border-gray-100 flex gap-3">
          <button
            onClick={handleRemove}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-xl">delete</span>
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold transition-colors"
          >
            Simpan Perubahan
          </button>
        </div>
      </div>
    </div>
  );
}
