'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, logout } from '@/app/lib/auth';
import { posApi, transactionsApi, heldOrdersApi, categoriesApi, sessionsApi, type ProductDto, type CreateTransactionRequest, type DiscountType, type HeldOrderResponse, type CashierSessionResponse } from '@/app/lib/api';
import PaymentModal from '@/app/components/PaymentModal';
import HoldOrderModal from '@/app/components/HoldOrderModal';
import ItemDetailModal from '@/app/components/ItemDetailModal';
import ShiftModal from '@/app/components/ShiftModal';

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

interface CartItem {
  product: ProductDto;
  qty: number;
  // Item-level discount
  discountType: ItemDiscountType;
  discountValue: number;
  note: string;
}

// Calculate final price for a cart item after item-level discount
const calculateItemFinalPrice = (item: CartItem): number => {
  const lineTotal = item.product.price * item.qty;
  const discountAmount = item.discountType === 'percent'
    ? (lineTotal * item.discountValue / 100)
    : item.discountValue;
  return Math.max(0, lineTotal - discountAmount);
};

// Calculate item discount amount
const calculateItemDiscount = (item: CartItem): number => {
  const lineTotal = item.product.price * item.qty;
  return item.discountType === 'percent'
    ? (lineTotal * item.discountValue / 100)
    : item.discountValue;
};

export default function PosPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [products, setProducts] = useState<ProductDto[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Global discount state (applied after item discounts)
  const [discountInput, setDiscountInput] = useState<string>('0');
  const [discountType, setDiscountType] = useState<DiscountType>('percent');

  // Tax state from settings
  const [taxRate, setTaxRate] = useState<number>(0.11); // Default 11%
  const [taxMode, setTaxMode] = useState<'default' | 'custom'>('default');
  const [taxPercentage, setTaxPercentage] = useState<number>(11);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Hold order modal state
  const [showHoldModal, setShowHoldModal] = useState(false);

  // Item detail modal state
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedCartItem, setSelectedCartItem] = useState<CartItem | null>(null);

  // Categories with icon support
  const [categories, setCategories] = useState<Array<{ 
    id: string; 
    name: string; 
    iconPreset?: string;
    iconCustom?: string;
  }>>([]);

  // Shift/Session state
  const [activeSession, setActiveSession] = useState<CashierSessionResponse | null>(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Load tax settings on mount
  useEffect(() => {
    const loadTaxSettings = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5136';
        const res = await fetch(`${API_BASE_URL}/api/settings`);
        if (res.ok) {
          const settings = await res.json();
          const mode = settings.tax_mode?.value || 'default';
          let tax = 11; // Default 11%
          
          setTaxMode(mode as 'default' | 'custom');
          
          if (mode === 'custom') {
            tax = parseFloat(settings.custom_tax?.value) || 11;
          } else {
            tax = parseFloat(settings.default_tax?.value) || 11;
          }
          
          setTaxPercentage(tax);
          setTaxRate(tax / 100); // Convert percentage to decimal
        }
      } catch (err) {
        console.error('Failed to load tax settings:', err);
        // Keep default 11% tax rate
      }
    };
    loadTaxSettings();
  }, []);

  // Load active session on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        setSessionLoading(true);
        const res = await sessionsApi.getActive();
        setActiveSession(res.hasActiveSession ? res.session! : null);
      } catch (err) {
        console.error('Failed to load session:', err);
      } finally {
        setSessionLoading(false);
      }
    };
    loadSession();
  }, []);

  const refreshSession = async () => {
    try {
      const res = await sessionsApi.getActive();
      setActiveSession(res.hasActiveSession ? res.session! : null);
    } catch (err) {
      console.error('Failed to refresh session:', err);
    }
  };

  // Load categories once on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await categoriesApi.getAll();
        setCategories(cats.map(c => ({
          id: c.id,
          name: c.name,
          iconPreset: c.iconPreset,
          iconCustom: c.iconCustom,
        })));
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    loadCategories();
  }, []);

  // Load products when search or category filter changes
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const prods = await posApi.getProducts(search || undefined, categoryFilter || undefined);
        setProducts(prods);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, [search, categoryFilter]);

  const addToCart = (product: ProductDto) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      setCart(cart.map(item => 
        item.product.id === product.id 
          ? { ...item, qty: item.qty + 1 } 
          : item
      ));
    } else {
      setCart([...cart, { 
        product, 
        qty: 1,
        discountType: 'percent',
        discountValue: 0,
        note: '',
      }]);
    }
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        return { ...item, qty: Math.max(1, item.qty + delta) };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountInput('0');
    setDiscountType('percent');
  };

  // Open item detail modal
  const openItemDetail = (item: CartItem) => {
    setSelectedCartItem(item);
    setShowItemModal(true);
  };

  // Save item detail changes
  const handleSaveItemDetail = (data: {
    qty: number;
    discountType: ItemDiscountType;
    discountValue: number;
    note: string;
  }) => {
    if (!selectedCartItem) return;
    
    setCart(prev => prev.map(item => {
      if (item.product.id === selectedCartItem.product.id) {
        return {
          ...item,
          qty: data.qty,
          discountType: data.discountType,
          discountValue: data.discountValue,
          note: data.note,
        };
      }
      return item;
    }));
    setSelectedCartItem(null);
  };

  // Remove item from modal
  const handleRemoveFromModal = () => {
    if (!selectedCartItem) return;
    removeFromCart(selectedCartItem.product.id);
    setSelectedCartItem(null);
  };

  // Calculate totals
  // Step 1: Sum of all item final prices (after item-level discounts)
  const subtotalAfterItemDiscounts = cart.reduce((sum, item) => sum + calculateItemFinalPrice(item), 0);
  
  // Step 2: Total item-level discounts
  const totalItemDiscounts = cart.reduce((sum, item) => sum + calculateItemDiscount(item), 0);
  
  // Step 3: Original subtotal (before any discounts)
  const originalSubtotal = cart.reduce((sum, item) => sum + (item.product.price * item.qty), 0);

  // Step 4: Global discount (applied on subtotalAfterItemDiscounts)
  const globalDiscountValue = parseFloat(discountInput) || 0;
  const calculatedGlobalDiscount = discountType === 'percent'
    ? (subtotalAfterItemDiscounts * globalDiscountValue / 100)
    : globalDiscountValue;

  // Step 5: Tax on amount after all discounts
  const taxableAmount = subtotalAfterItemDiscounts - calculatedGlobalDiscount;
  const tax = taxableAmount * taxRate;

  // Step 6: Final total
  const total = taxableAmount + tax;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (!activeSession) {
      alert('Anda harus memulai shift terlebih dahulu!');
      setShowShiftModal(true);
      return;
    }
    setShowPaymentModal(true);
  };

  const processPayment = async (paymentMethod: 'Cash' | 'QRIS', paidAmount: number) => {
    try {
      setSubmitting(true);
      setShowPaymentModal(false);

      const transactionData: CreateTransactionRequest = {
        items: cart.map(item => ({ 
          productId: item.product.id, 
          qty: item.qty,
        })),
        discount: globalDiscountValue,
        discountType: discountType,
        tax: tax,
        paymentMethod: paymentMethod,
        paidAmount: paidAmount,
      };

      const result = await transactionsApi.create(transactionData);
      router.push(`/kasir/receipt/${result.id}`);
    } catch (err) {
      alert('Transaction failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleHoldOrder = async (customerName: string, notes: string) => {
    try {
      await heldOrdersApi.create({
        customerName,
        notes,
        items: cart.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          price: item.product.price,
          qty: item.qty,
        })),
        discount: globalDiscountValue,
        discountType: discountType,
      });
      clearCart();
    } catch (err) {
      alert('Gagal menyimpan pesanan');
    }
  };

  const handleResumeOrder = (order: HeldOrderResponse) => {
    const resumedCart: CartItem[] = order.items.map(item => ({
      product: {
        id: item.productId,
        name: item.productName,
        price: item.price,
        categoryId: '',
        isActive: true,
      },
      qty: item.qty,
      discountType: 'percent',
      discountValue: 0,
      note: '',
    }));
    setCart(resumedCart);
    setDiscountInput(String(order.discount));
    setDiscountType(order.discountType as DiscountType);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#f5f7f8] text-[#111418]">
      {/* --- TOP HEADER --- */}
      <header className="flex-none flex items-center justify-between whitespace-nowrap border-b border-[#e5e7eb] bg-white px-6 py-3 z-20 shadow-sm">
        <div className="flex items-center gap-8 flex-1">
          <div className="flex items-center gap-3">
            <div className="size-8 text-[#3c83f6]">
              <span className="material-symbols-outlined text-4xl">coffee_maker</span>
            </div>
            <h2 className="text-xl font-bold leading-tight tracking-[-0.015em]">CoffeePOS</h2>
          </div>

          <label className="flex flex-col min-w-40 h-10 max-w-96 flex-1">
            <div className="flex w-full flex-1 items-stretch rounded-lg h-full">
              <div className="text-[#60708a] flex border-none bg-[#f0f2f5] items-center justify-center pl-4 rounded-l-lg border-r-0">
                <span className="material-symbols-outlined text-xl">search</span>
              </div>
              <input
                className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg rounded-l-none border-none bg-[#f0f2f5] h-full placeholder:text-[#60708a] px-4 pl-2 text-base focus:outline-0"
                placeholder="Search menu items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </label>
        </div>

        <div className="flex items-center justify-end gap-6">
          {/* Shift Status Button */}
          {!sessionLoading && (
            <button
              onClick={() => setShowShiftModal(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeSession 
                  ? 'bg-green-50 hover:bg-green-100 text-green-700 border border-green-200' 
                  : 'bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200'
              }`}
            >
              <span className="material-symbols-outlined text-xl">
                {activeSession ? 'timer' : 'play_circle'}
              </span>
              <span className="text-sm font-bold">
                {activeSession ? 'Shift Aktif' : 'Mulai Shift'}
              </span>
            </button>
          )}
          {user?.role === 'Admin' && (
            <button
              onClick={() => router.push('/admin')}
              className="flex items-center gap-2 cursor-pointer bg-purple-50 hover:bg-purple-100 text-purple-600 px-4 py-2 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
              <span className="text-sm font-bold">Admin</span>
            </button>
          )}
          <div className="flex items-center gap-3 bg-[#f0f2f5] rounded-lg p-1 pr-4">
            <div className="bg-white p-1.5 rounded-md shadow-sm">
              <span className="material-symbols-outlined text-[#3c83f6] text-xl">schedule</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-[#60708a]">Cashier</span>
              <span className="text-sm font-bold">{user?.name}</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 cursor-pointer bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            <span className="text-sm font-bold">Logout</span>
          </button>
        </div>
      </header>

      {/* --- MAIN CONTENT SPLIT --- */}
      <main className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL: PRODUCTS (65%) */}
        <section className="w-[65%] flex flex-col bg-[#f8fafc] relative border-r border-gray-200">
          <div className="px-6 py-4 bg-[#f8fafc]/95 backdrop-blur z-10 sticky top-0">
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              <button
                onClick={() => setCategoryFilter('')}
                className={`flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg px-6 transition-all active:scale-95 ${categoryFilter === ''
                  ? 'bg-[#3c83f6] text-white shadow-md shadow-blue-500/20'
                  : 'bg-white border border-gray-100 text-[#111418] hover:bg-gray-50'
                }`}
              >
                <span className="material-symbols-outlined text-xl">grid_view</span>
                <p className="text-sm font-bold">ALL</p>
              </button>

              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg px-6 transition-all ${categoryFilter === cat.id
                    ? 'bg-[#3c83f6] text-white shadow-md'
                    : 'bg-white border border-gray-100 text-[#111418] hover:bg-gray-50'
                  }`}
                >
                  {cat.iconCustom ? (
                    <i className={`${cat.iconCustom} text-lg`}></i>
                  ) : cat.iconPreset ? (
                    <span className="material-symbols-outlined text-xl">{cat.iconPreset}</span>
                  ) : null}
                  <p className="text-sm font-bold">{cat.name}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-24">
            {loading ? (
              <div className="text-center py-10 text-gray-400">Loading products...</div>
            ) : (
              <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="group flex flex-col gap-3 p-3 rounded-xl bg-white shadow-sm border border-transparent hover:border-[#3c83f6]/50 hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
                  >
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                      {product.imageUrl ? (
                        <img
                          src={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5136'}${product.imageUrl}`}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (() => {
                        const category = categories.find(c => c.id === product.categoryId);
                        return category?.iconCustom ? (
                          <i className={`${category.iconCustom} text-4xl text-gray-400`}></i>
                        ) : (
                          <span className="material-symbols-outlined text-4xl text-gray-300">
                            {category?.iconPreset || 'coffee'}
                          </span>
                        );
                      })()}
                    </div>
                    <div>
                      <p className="text-[#111418] text-base font-bold leading-normal truncate">{product.name}</p>
                      <p className="text-[#3c83f6] text-sm font-bold leading-normal mt-1">
                        {formatRupiah(product.price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-4">
              <button
                onClick={() => cart.length > 0 ? setShowHoldModal(true) : alert('Cart kosong')}
                className="flex flex-1 items-center justify-center gap-2 h-12 rounded-lg border-2 border-[#f0f2f5] text-[#60708a] font-bold hover:bg-[#f0f2f5] transition-colors"
              >
                <span className="material-symbols-outlined">pending</span>
                Hold Order
              </button>
              <button
                onClick={() => router.push('/kasir/history')}
                className="flex flex-1 items-center justify-center gap-2 h-12 rounded-lg border-2 border-[#f0f2f5] text-[#60708a] font-bold hover:bg-[#f0f2f5] transition-colors"
              >
                <span className="material-symbols-outlined">receipt_long</span>
                History
              </button>
            </div>
          </div>
        </section>

        {/* RIGHT PANEL: CART (35%) */}
        <aside className="w-[35%] flex flex-col bg-white border-l border-[#e5e7eb] shadow-xl z-20">
          <div className="flex items-center justify-between p-5 border-b border-[#f0f2f5]">
            <div className="flex items-center gap-3">
              <h3 className="text-[#111418] text-xl font-bold leading-tight">Current Order</h3>
              <span className="bg-blue-50 text-[#3c83f6] px-2.5 py-0.5 rounded-full text-xs font-bold">
                Items: {cart.length}
              </span>
            </div>
            <button
              onClick={clearCart}
              className="text-red-500 hover:text-red-600 text-sm font-semibold flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">delete_sweep</span>
              Clear All
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <span className="material-symbols-outlined text-6xl mb-2">shopping_cart</span>
                <p>Cart is empty</p>
              </div>
            ) : (
              cart.map((item) => {
                const hasDiscount = item.discountValue > 0;
                const originalLineTotal = item.product.price * item.qty;
                const finalPrice = calculateItemFinalPrice(item);
                
                return (
                  <div 
                    key={item.product.id} 
                    onClick={() => openItemDetail(item)}
                    className="group flex items-start gap-4 p-3 rounded-lg hover:bg-[#f8fafc] border border-transparent hover:border-blue-200 transition-colors cursor-pointer"
                  >
                    <div className="bg-gray-100 aspect-square rounded-lg size-16 shrink-0 flex items-center justify-center relative overflow-hidden">
                      {item.product.imageUrl ? (
                        <img
                          src={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5136'}${item.product.imageUrl}`}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (() => {
                        const category = categories.find(c => c.id === item.product.categoryId);
                        return category?.iconCustom ? (
                          <i className={`${category.iconCustom} text-2xl text-gray-400`}></i>
                        ) : (
                          <span className="material-symbols-outlined text-gray-400">
                            {category?.iconPreset || 'coffee'}
                          </span>
                        );
                      })()}
                      {hasDiscount && (
                        <div className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {item.discountType === 'percent' ? `${item.discountValue}%` : 'Disc'}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex-1 min-w-0">
                          <p className="text-[#111418] text-base font-bold leading-tight truncate">{item.product.name}</p>
                          {item.note && (
                            <p className="text-xs text-gray-500 truncate mt-0.5">📝 {item.note}</p>
                          )}
                        </div>
                        <div className="text-right ml-2">
                          {hasDiscount ? (
                            <>
                              <p className="text-xs text-gray-400 line-through">{formatRupiah(originalLineTotal)}</p>
                              <p className="text-[#111418] text-base font-bold text-green-600">{formatRupiah(finalPrice)}</p>
                            </>
                          ) : (
                            <p className="text-[#111418] text-base font-bold">{formatRupiah(originalLineTotal)}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-3 bg-[#f0f2f5] rounded-lg p-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); updateCartQty(item.product.id, -1); }}
                            className="size-6 flex items-center justify-center rounded-md bg-white shadow-sm text-gray-600 hover:text-[#3c83f6]"
                          >
                            <span className="material-symbols-outlined text-base">remove</span>
                          </button>
                          <span className="text-sm font-bold w-4 text-center">{item.qty}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); updateCartQty(item.product.id, 1); }}
                            className="size-6 flex items-center justify-center rounded-md bg-[#3c83f6] text-white shadow-sm hover:bg-blue-600"
                          >
                            <span className="material-symbols-outlined text-base">add</span>
                          </button>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFromCart(item.product.id); }}
                          className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cart Footer / Totals */}
          <div className="p-6 bg-[#f8fafc] border-t border-[#e5e7eb]">
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-[#60708a] text-sm">
                <span>Subtotal</span>
                <span className="font-medium text-[#111418]">{formatRupiah(originalSubtotal)}</span>
              </div>

              {/* Show item-level discounts total if any */}
              {totalItemDiscounts > 0 && (
                <div className="flex justify-between text-green-600 text-sm">
                  <span>Diskon Item</span>
                  <span className="font-medium">- {formatRupiah(totalItemDiscounts)}</span>
                </div>
              )}

              {/* Global Discount Input Row */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#60708a] text-sm">Diskon Global</span>
                <div className="flex items-center gap-2">
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => { setDiscountType('percent'); setDiscountInput('0'); }}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${discountType === 'percent'
                        ? 'bg-white text-[#3c83f6] shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDiscountType('nominal'); setDiscountInput('0'); }}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${discountType === 'nominal'
                        ? 'bg-white text-[#3c83f6] shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Rp
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={discountType === 'percent' ? 100 : undefined}
                    step={discountType === 'percent' ? 1 : 500}
                    value={discountInput}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (discountType === 'percent') {
                        const num = parseFloat(val);
                        if (num > 100) val = '100';
                        if (num < 0) val = '0';
                      }
                      setDiscountInput(val);
                    }}
                    className="w-24 px-3 py-1.5 text-sm text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3c83f6]/30 focus:border-[#3c83f6]"
                    placeholder="0"
                  />
                </div>
              </div>

              {calculatedGlobalDiscount > 0 && (
                <div className="flex justify-between text-green-600 text-sm">
                  <span>Potongan Global {discountType === 'percent' ? `(${globalDiscountValue}%)` : ''}</span>
                  <span className="font-medium">- {formatRupiah(calculatedGlobalDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between text-[#60708a] text-sm">
                <span>Pajak {taxMode === 'default' ? '(PPN 11%)' : `(${taxPercentage}%)`}</span>
                <span className="font-medium text-[#111418]">{formatRupiah(tax)}</span>
              </div>
              <div className="h-px bg-gray-200 my-2"></div>
              <div className="flex justify-between items-end">
                <span className="text-[#111418] text-lg font-bold">Total</span>
                <span className="text-[#3c83f6] text-2xl font-bold">{formatRupiah(total)}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={submitting || cart.length === 0}
              className="w-full h-14 bg-[#3c83f6] hover:bg-blue-600 active:bg-blue-700 disabled:bg-gray-400 text-white rounded-xl text-lg font-bold shadow-lg shadow-blue-500/30 flex items-center justify-between px-6 transition-all active:scale-[0.99]"
            >
              <span>{submitting ? 'Processing...' : 'PAY NOW'}</span>
              <span className="bg-white/20 px-3 py-1 rounded-lg text-base">{formatRupiah(total)}</span>
            </button>
          </div>
        </aside>
      </main>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={processPayment}
        total={total}
      />

      {/* Hold Order Modal */}
      <HoldOrderModal
        isOpen={showHoldModal}
        onClose={() => setShowHoldModal(false)}
        onHoldOrder={handleHoldOrder}
        onResumeOrder={handleResumeOrder}
      />

      {/* Item Detail Modal */}
      <ItemDetailModal
        isOpen={showItemModal}
        onClose={() => { setShowItemModal(false); setSelectedCartItem(null); }}
        item={selectedCartItem ? {
          productId: selectedCartItem.product.id,
          productName: selectedCartItem.product.name,
          unitPrice: selectedCartItem.product.price,
          qty: selectedCartItem.qty,
          discountType: selectedCartItem.discountType,
          discountValue: selectedCartItem.discountValue,
          note: selectedCartItem.note,
        } : null}
        onSave={handleSaveItemDetail}
        onRemove={handleRemoveFromModal}
      />

      {/* Shift Modal */}
      <ShiftModal
        isOpen={showShiftModal}
        onClose={() => setShowShiftModal(false)}
        session={activeSession}
        onSessionChange={refreshSession}
      />
    </div>
  );
}
