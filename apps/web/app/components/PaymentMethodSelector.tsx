interface PaymentMethodSelectorProps {
  value: 'Cash' | 'QRIS';
  onChange: (method: 'Cash' | 'QRIS') => void;
}

export function PaymentMethodSelector({
  value,
  onChange,
}: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-gray-700">
        Metode Pembayaran
      </label>
      <div className="space-y-2">
        <button
          onClick={() => onChange('Cash')}
          className={`w-full py-3 px-4 rounded-lg font-semibold transition-all border-2 ${
            value === 'Cash'
              ? 'bg-blue-50 border-blue-600 text-blue-600'
              : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
          }`}
        >
          Tunai (Cash)
        </button>
        <button
          onClick={() => onChange('QRIS')}
          className={`w-full py-3 px-4 rounded-lg font-semibold transition-all border-2 ${
            value === 'QRIS'
              ? 'bg-blue-50 border-blue-600 text-blue-600'
              : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
          }`}
        >
          QRIS
        </button>
      </div>
    </div>
  );
}
