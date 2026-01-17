'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/app/lib/auth';
import { transactionsApi, type TransactionResponse } from '@/app/lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5136';

interface StoreSettings {
  store_name: string;
  store_address: string;
  store_phone: string;
  receipt_footer: string;
}

export default function ReceiptPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const transactionId = params.id as string;

  const [transaction, setTransaction] = useState<TransactionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [printing, setPrinting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    store_name: '',
    store_address: '',
    store_phone: '',
    receipt_footer: 'Terima Kasih'
  });

  // refs for cleanup
  const fallbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Load transaction and settings in parallel
        const [tx, settingsRes] = await Promise.all([
          transactionsApi.getById(transactionId),
          fetch(`${API_BASE_URL}/api/settings`).then(r => r.ok ? r.json() : null)
        ]);
        
        setTransaction(tx);
        
        if (settingsRes) {
          setStoreSettings({
            store_name: settingsRes.store_name?.value || '',
            store_address: settingsRes.store_address?.value || '',
            store_phone: settingsRes.store_phone?.value || '',
            receipt_footer: settingsRes.receipt_footer?.value || 'Barang yang dibeli tidak dapat ditukar/dikembalikan'
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load transaction');
      } finally {
        setLoading(false);
      }
    };

    if (transactionId) {
      loadData();
    }
  }, [authLoading, user, router, transactionId]);

  useEffect(() => {
    // cleanup on unmount
    return () => {
      if (typeof window !== 'undefined') {
        window.onafterprint = null;
        window.onbeforeprint = null;
      }
      if (fallbackTimerRef.current) {
        window.clearTimeout(fallbackTimerRef.current);
      }
    };
  }, []);

  const handlePrint = () => {
    if (!transaction) return;

    setPrinting(true);

    // simpan title lama dan set title baru => Chrome/Save-as-PDF gunakan document.title untuk default filename
    const prevTitle = document.title;
    const invoice = transaction.invoiceNo ? transaction.invoiceNo.replace(/\s+/g, '_') : 'struk';
    document.title = `struk-${invoice}`;

    // onafterprint untuk restore segera setelah printing selesai
    window.onafterprint = () => {
      document.title = prevTitle;
      setPrinting(false);
      // hapus handler
      window.onafterprint = null;
      window.onbeforeprint = null;
      if (fallbackTimerRef.current) {
        window.clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };

    // fallback restore (beberapa environment tidak memanggil onafterprint)
    fallbackTimerRef.current = window.setTimeout(() => {
      document.title = prevTitle;
      setPrinting(false);
      window.onafterprint = null;
      window.onbeforeprint = null;
      fallbackTimerRef.current = null;
    }, 5000);

    // beri sedikit jeda agar title ter-update sebelum dialog print muncul
    setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        // kalau ada error, restore segera
        document.title = prevTitle;
        setPrinting(false);
        if (fallbackTimerRef.current) {
          window.clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = null;
        }
      }
    }, 120);
  };

  const handleDownloadPdf = async () => {
    if (!transaction) return;

    setDownloadingPdf(true);
    setError('');
    
    try {
      const token = localStorage.getItem('authToken');  // ✅ Key yang benar untuk match dengan api.ts
      
      if (!token) {
        throw new Error('Token tidak ditemukan. Silakan login kembali.');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5136';
      const url = `${apiUrl}/api/transactions/${transactionId}/pdf?receiptWidth=58mm`;

      console.log('PDF Download Request:', { url, hasToken: !!token });

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf'
        }
      });

      console.log('PDF Response Status:', response.status, 'Content-Type:', response.headers.get('content-type'));

      // Extract error details dari response jika ada error
      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        let errorMessage = `HTTP ${response.status}`;

        // Coba parse JSON error response dari backend
        if (contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.details || errorMessage;
            
            // Log details untuk debugging
            console.error('Backend Error Response:', errorData);
          } catch (parseErr) {
            console.warn('Could not parse error JSON response');
          }
        } else if (contentType.includes('text/html') || contentType.includes('text/plain')) {
          // Jika response adalah HTML atau plain text error page
          const text = await response.text();
          console.error('Received HTML/text error response:', text.substring(0, 200));
          
          if (response.status === 401) {
            errorMessage = 'Token tidak valid atau sudah expired. Silakan login kembali.';
          } else if (response.status === 403) {
            errorMessage = 'Anda tidak memiliki akses ke dokumen ini.';
          } else if (response.status === 404) {
            errorMessage = 'Struk transaksi tidak ditemukan.';
          } else {
            errorMessage = `Server error (${response.status}): Gagal membuat PDF`;
          }
        }

        throw new Error(errorMessage);
      }

      // Validate response is actually PDF
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/pdf')) {
        const text = await response.text();
        console.error('Expected PDF but got:', contentType, 'Content:', text.substring(0, 200));
        throw new Error(`Format tidak sesuai. Diharapkan PDF tetapi menerima: ${contentType}`);
      }

      const blob = await response.blob();
      
      // Validate blob is not empty
      if (blob.size === 0) {
        throw new Error('File PDF kosong');
      }

      console.log('PDF blob received, size:', blob.size);

      const urlBlob = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlBlob;
      a.download = `struk-${transaction.invoiceNo.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        window.URL.revokeObjectURL(urlBlob);
        document.body.removeChild(a);
      }, 100);
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Gagal download PDF (unknown error)';
      setError(errorMsg);
      console.error('PDF download error:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (authLoading || loading) return <div className="p-8 text-center font-mono">Loading...</div>;
  if (!user) return null;
  if (error) return <div className="p-8 text-center text-red-600 font-mono">{error}</div>;
  if (!transaction) return <div className="p-8 text-center font-mono">Transaksi tidak ditemukan</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* CSS khusus print */}
      <style jsx global>{`
        @media print {
          /* sembunyikan semua elemen di body, kecuali area struk */
          body * { visibility: hidden; }

          /* set ukuran kertas lebar thermal */
          @page {
            size: 58mm auto;
            margin: 0;
          }

          /* tampilkan hanya area struk */
          #printable-area, #printable-area * {
            visibility: visible;
          }

          /* posisikan struk di pojok kiri atas, tetap gunakan lebar 58mm */
          #printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 58mm;
            box-shadow: none !important;
            /* hindari pemecahan halaman */
            page-break-after: avoid;
            page-break-before: avoid;
            page-break-inside: avoid;
            break-inside: avoid;
            /* kecilkan padding untuk print agar tidak melebihi satu halaman */
            padding: 4px !important;
            margin: 0 !important;
          }

          /* pastikan background putih dan tidak ada overflow yang mengacaukan layout */
          html, body {
            height: auto;
            background: white !important;
            overflow: visible !important;
          }
        }

        /* sembunyikan tombol navigasi ketika print (tailwind print:hidden kadang cukup, ini fallback) */
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Tombol Navigasi (disembunyikan saat print) */}
      <div className="max-w-md mx-auto mb-6 flex justify-between items-center gap-2 print:hidden no-print">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-600 hover:text-black flex items-center gap-2"
        >
          &larr; Kembali
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="px-3 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 disabled:opacity-50"
          >
            {downloadingPdf ? 'Mendownload...' : '⬇ PDF'}
          </button>
          <button
            onClick={handlePrint}
            disabled={printing}
            className="px-4 py-2 bg-black text-white text-sm font-medium rounded hover:bg-gray-800 disabled:opacity-50"
          >
            {printing ? 'Mencetak...' : 'Cetak Struk'}
          </button>
        </div>
      </div>

      {/* AREA STRUK */}
      <div
        id="printable-area"
        className="max-w-[58mm] mx-auto bg-white shadow-lg print:shadow-none print:w-[58mm] print:max-w-none text-black font-mono text-[10px] leading-relaxed"
      >
        <div className="p-4 print:p-2 print:pb-6">
          {/* Header Toko */}
          <div className="text-center mb-2 pb-2 border-b border-dashed border-black">
            <h2 className="text-sm font-bold uppercase mb-1">{storeSettings.store_name}</h2>
            <div className="text-[9px] leading-tight whitespace-normal break-words">
              {storeSettings.store_address && storeSettings.store_phone ? (
                <p className="overflow-hidden text-ellipsis">{storeSettings.store_address} | Telp: {storeSettings.store_phone}</p>
              ) : (
                <>
                  {storeSettings.store_address && <p className="overflow-hidden text-ellipsis">{storeSettings.store_address}</p>}
                  {storeSettings.store_phone && <p className="overflow-hidden text-ellipsis">Telp: {storeSettings.store_phone}</p>}
                </>
              )}
            </div>
          </div>

          {/* Info Transaksi */}
          <div className="mb-2 pb-2 border-b border-dashed border-black text-[11px]">
            <div className="flex justify-between">
              <span>No:</span>
              <span>{transaction.invoiceNo}</span>
            </div>
            <div className="flex justify-between">
              <span>Tgl:</span>
              <span>{(() => {
                const date = new Date(transaction.createdAt);
                date.setHours(date.getHours() + 7);
                return date.toLocaleString('id-ID', {
                  day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
                });
              })()}</span>
            </div>
            <div className="flex justify-between">
              <span>Kasir:</span>
              <span className="uppercase">{transaction.cashierName}</span>
            </div>
          </div>

          {/* List Barang */}
          <div className="mb-2 pb-2 border-b border-dashed border-black">
            {transaction.items.map(item => (
              <div key={item.id} className="mb-1">
                <div className="font-bold text-[11px]">{item.productName}</div>
                <div className="flex justify-between pl-2 text-[10px]">
                  <span>{item.qty} x {item.unitPrice.toLocaleString('id-ID')}</span>
                  <span>{item.lineTotal.toLocaleString('id-ID')}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Total Harga */}
          <div className="flex flex-col gap-1 mb-2 pb-2 border-b border-dashed border-black text-[11px]">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{transaction.subtotal.toLocaleString('id-ID')}</span>
            </div>
            {transaction.discount > 0 && (
              <div className="flex justify-between">
                <span>Diskon</span>
                <span>({transaction.discount.toLocaleString('id-ID')})</span>
              </div>
            )}
            {transaction.tax > 0 && (
              <div className="flex justify-between">
                <span>Pajak</span>
                <span>{transaction.tax.toLocaleString('id-ID')}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-xs mt-1 pt-1 border-t border-dotted border-black">
              <span>TOTAL</span>
              <span>Rp{transaction.total.toLocaleString('id-ID')}</span>
            </div>
          </div>

          {/* Pembayaran */}
          <div className="mb-4 text-[11px]">
            <div className="flex justify-between">
              <span className="uppercase">{transaction.paymentMethod}</span>
              <span>{transaction.paidAmount.toLocaleString('id-ID')}</span>
            </div>
            {transaction.changeAmount > 0 && (
              <div className="flex justify-between">
                <span>Kembali</span>
                <span>{transaction.changeAmount.toLocaleString('id-ID')}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="uppercase font-bold mb-1">{storeSettings.receipt_footer}</p>
            <p className="text-[9px]">Barang yang dibeli tidak dapat ditukar/dikembalikan</p>
          </div>
        </div>
      </div>
    </div>
  );
}
