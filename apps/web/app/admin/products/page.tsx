'use client';

import { useEffect, useState, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { categoriesApi, productsApi, type ProductDto, type CategoryDto } from '@/app/lib/api';
import { DataTable } from '@/app/components/ui/DataTable';
import ProductModal from '@/app/components/ProductModal';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5136';

interface DeleteCheckResult {
  canDelete: boolean;
  hasTransactions: boolean;
  hasStockHistory: boolean;
  transactionCount: number;
  stockHistoryCount: number;
  message: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDto | null>(null);

  // Delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductDto | ProductDto[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteCheckResult, setDeleteCheckResult] = useState<DeleteCheckResult | null>(null);
  const [checkingDelete, setCheckingDelete] = useState(false);
  const [deleteStep, setDeleteStep] = useState<'select' | 'confirm'>('select'); // Step 1: select action, Step 2: confirm
  const [selectedAction, setSelectedAction] = useState<'deactivate' | 'permanent' | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [productsData, categoriesData] = await Promise.all([
        productsApi.getAll(),
        categoriesApi.getAll(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setShowModal(true);
  };

  const handleEdit = (product: ProductDto) => {
    setEditingProduct(product);
    setShowModal(true);
  };

  const handleSave = async (data: {
    name: string;
    categoryId: string;
    price: number;
    imageUrl?: string;
    isActive: boolean;
  }) => {
    if (editingProduct) {
      await productsApi.update(editingProduct.id, {
        name: data.name,
        categoryId: data.categoryId,
        price: data.price,
        imageUrl: data.imageUrl,
      });
      if (editingProduct.isActive !== data.isActive) {
        await productsApi.updateActive(editingProduct.id, data.isActive);
      }
    } else {
      await productsApi.create({
        name: data.name,
        categoryId: data.categoryId,
        price: data.price,
        imageUrl: data.imageUrl,
        isActive: data.isActive,
      });
    }
    await loadData();
  };

  const handleToggleActive = async (product: ProductDto) => {
    try {
      await productsApi.updateActive(product.id, !product.isActive);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const handleDeleteClick = async (product: ProductDto) => {
    setDeleteTarget(product);
    setShowDeleteModal(true);
    setCheckingDelete(true);
    
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_BASE_URL}/api/products/${product.id}/check-delete`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDeleteCheckResult(data);
        
        // Jika produk sudah nonaktif, langsung ke step confirm dengan action permanent
        if (!product.isActive) {
          setSelectedAction('permanent');
          setDeleteStep('confirm');
        }
      }
    } catch (err) {
      console.error('Failed to check delete:', err);
    } finally {
      setCheckingDelete(false);
    }
  };

  const handleDeleteSelected = async (selectedProducts: ProductDto[]) => {
    setDeleteTarget(selectedProducts);
    setShowDeleteModal(true);
    setCheckingDelete(true);
    
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_BASE_URL}/api/products/check-delete-batch`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ ids: selectedProducts.map(p => p.id) }),
      });
      if (res.ok) {
        const data = await res.json();
        setDeleteCheckResult(data);
        
        // Jika semua produk sudah nonaktif, langsung ke step confirm dengan action permanent
        const allInactive = selectedProducts.every(p => !p.isActive);
        if (allInactive) {
          setSelectedAction('permanent');
          setDeleteStep('confirm');
        }
      }
    } catch (err) {
      console.error('Failed to check delete:', err);
    } finally {
      setCheckingDelete(false);
    }
  };

  const handleConfirmDelete = async (action: 'deactivate' | 'permanent') => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const token = localStorage.getItem('authToken');
      const forceDelete = action === 'permanent';
      
      if (Array.isArray(deleteTarget)) {
        // Multi delete
        const ids = deleteTarget.map(p => p.id);
        const res = await fetch(`${API_BASE_URL}/api/products/delete-batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ids, forceDelete }),
        });
        if (!res.ok) throw new Error('Failed to delete products');
        const data = await res.json();
        alert(data.message);
      } else {
        // Single delete
        const res = await fetch(`${API_BASE_URL}/api/products/${deleteTarget.id}?forceDelete=${forceDelete}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to delete product');
        const data = await res.json();
        alert(data.message);
      }

      setShowDeleteModal(false);
      setDeleteTarget(null);
      setDeleteCheckResult(null);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus produk');
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo<ColumnDef<ProductDto, unknown>[]>(
    () => [
      {
        accessorKey: 'imageUrl',
        header: 'Gambar',
        enableSorting: false,
        cell: ({ row }) => {
          const imageUrl = row.original.imageUrl;
          const category = categories.find(c => c.id === row.original.categoryId);
          return (
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
              {imageUrl ? (
                <img
                  src={`${API_BASE_URL}${imageUrl}`}
                  alt={row.original.name}
                  className="w-full h-full object-cover"
                />
              ) : category?.iconCustom ? (
                <i className={`${category.iconCustom} text-lg text-gray-400`}></i>
              ) : (
                <span className="material-symbols-outlined text-gray-400">
                  {category?.iconPreset || 'image'}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'name',
        header: 'Nama Produk',
        cell: ({ row }) => (
          <span className="font-medium text-gray-900">{row.original.name}</span>
        ),
      },
      {
        accessorKey: 'categoryName',
        header: 'Kategori',
        cell: ({ row }) => (
          <span className="text-gray-600">{row.original.categoryName || '-'}</span>
        ),
      },
      {
        accessorKey: 'price',
        header: 'Harga',
        cell: ({ row }) => (
          <span className="font-medium text-blue-600">
            Rp {row.original.price.toLocaleString('id-ID')}
          </span>
        ),
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        cell: ({ row }) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleActive(row.original);
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              row.original.isActive
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${row.original.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
            {row.original.isActive ? 'Aktif' : 'Nonaktif'}
          </button>
        ),
      },
      {
        id: 'actions',
        header: 'Aksi',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleEdit(row.original)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit"
            >
              <span className="material-symbols-outlined text-xl">edit</span>
            </button>
            <button
              onClick={() => handleDeleteClick(row.original)}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Hapus"
            >
              <span className="material-symbols-outlined text-xl">delete</span>
            </button>
          </div>
        ),
      },
    ],
    [categories]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const deleteCount = Array.isArray(deleteTarget) ? deleteTarget.length : 1;
  const deleteNames = Array.isArray(deleteTarget) 
    ? deleteTarget.slice(0, 3).map(p => p.name).join(', ') + (deleteTarget.length > 3 ? ` dan ${deleteTarget.length - 3} lainnya` : '')
    : deleteTarget?.name;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Produk</h1>
        <p className="text-sm text-gray-500 mt-1">Kelola daftar produk yang dijual</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {categories.length === 0 ? (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-orange-700">
          Buat kategori terlebih dahulu sebelum menambah produk
        </div>
      ) : (
        <DataTable
          data={products}
          columns={columns}
          searchPlaceholder="Cari produk..."
          onAdd={handleAdd}
          addButtonText="Tambah Produk"
          enableSelection={true}
          onDeleteSelected={handleDeleteSelected}
          deleteButtonText="Hapus"
          getRowId={(row) => row.id}
          renderMobileCard={(product, isSelected, onToggleSelect) => {
            const category = categories.find(c => c.id === product.categoryId);
            return (
              <div className={`bg-white rounded-lg shadow-sm border p-4 ${isSelected ? 'ring-2 ring-blue-500 border-blue-300' : 'border-gray-200'}`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={onToggleSelect}
                    className="w-4 h-4 mt-1 rounded border-gray-300 text-blue-600"
                  />
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                    {product.imageUrl ? (
                      <img src={`${API_BASE_URL}${product.imageUrl}`} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-gray-400 text-2xl">{category?.iconPreset || 'image'}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
                    <p className="text-sm text-gray-500">{product.categoryName}</p>
                    <p className="text-sm font-semibold text-blue-600 mt-1">Rp {product.price.toLocaleString('id-ID')}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleActive(product); }}
                      className={`px-2 py-1 rounded-full text-xs font-medium ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {product.isActive ? 'Aktif' : 'Nonaktif'}
                    </button>
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(product)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded">
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button onClick={() => handleDeleteClick(product)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded">
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          }}
        />
      )}

      <ProductModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        product={editingProduct}
        categories={categories}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="px-4 py-3 border-b flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600">warning</span>
              <h3 className="font-bold text-gray-900">Hapus Produk</h3>
            </div>
            <div className="p-4">
              {deleteStep === 'select' ? (
                <>
                  <p className="text-gray-600 mb-2">
                    Produk yang akan dihapus:
                  </p>
                  <p className="font-medium text-gray-900 mb-4">
                    {deleteNames}
                  </p>

                  {checkingDelete ? (
                    <div className="flex items-center justify-center py-4">
                      <span className="material-symbols-outlined animate-spin text-blue-600">progress_activity</span>
                      <span className="ml-2 text-gray-500">Memeriksa data terkait...</span>
                    </div>
                  ) : deleteCheckResult && (
                    <div className="space-y-3">
                      {/* Info data terkait */}
                      {(deleteCheckResult.hasTransactions || deleteCheckResult.hasStockHistory) && (
                        <div className={`p-3 rounded-lg border ${deleteCheckResult.hasTransactions ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                          <p className={`text-sm font-medium ${deleteCheckResult.hasTransactions ? 'text-red-800' : 'text-amber-800'}`}>
                            <span className="material-symbols-outlined text-base align-middle mr-1">info</span>
                            Data Terkait Ditemukan:
                          </p>
                          <ul className={`text-sm mt-1 ml-6 list-disc ${deleteCheckResult.hasTransactions ? 'text-red-700' : 'text-amber-700'}`}>
                            {deleteCheckResult.hasTransactions && (
                              <li>{deleteCheckResult.transactionCount} riwayat transaksi (di menu Transaksi)</li>
                            )}
                            {deleteCheckResult.hasStockHistory && (
                              <li>{deleteCheckResult.stockHistoryCount} riwayat stok (di menu Inventori)</li>
                            )}
                          </ul>
                        </div>
                      )}

                      {/* Opsi aksi */}
                      <div className="border rounded-lg divide-y">
                        {/* Opsi Nonaktifkan - hanya jika produk masih aktif */}
                        {Array.isArray(deleteTarget) ? (
                          // Multi-delete: tampilkan nonaktifkan jika ada produk aktif
                          deleteTarget.some(p => p.isActive) && (
                            <button
                              onClick={() => { setSelectedAction('deactivate'); setDeleteStep('confirm'); }}
                              disabled={deleting}
                              className="w-full p-3 text-left hover:bg-gray-50 transition-colors flex items-start gap-3"
                            >
                              <span className="material-symbols-outlined text-amber-600 mt-0.5">visibility_off</span>
                              <div>
                                <p className="font-medium text-gray-900">Nonaktifkan</p>
                                <p className="text-sm text-gray-500">Produk tidak akan muncul di kasir, tapi data tetap tersimpan untuk laporan.</p>
                              </div>
                            </button>
                          )
                        ) : (
                          // Single delete: tampilkan nonaktifkan jika produk masih aktif
                          deleteTarget.isActive && (
                            <button
                              onClick={() => { setSelectedAction('deactivate'); setDeleteStep('confirm'); }}
                              disabled={deleting}
                              className="w-full p-3 text-left hover:bg-gray-50 transition-colors flex items-start gap-3"
                            >
                              <span className="material-symbols-outlined text-amber-600 mt-0.5">visibility_off</span>
                              <div>
                                <p className="font-medium text-gray-900">Nonaktifkan</p>
                                <p className="text-sm text-gray-500">Produk tidak akan muncul di kasir, tapi data tetap tersimpan untuk laporan.</p>
                              </div>
                            </button>
                          )
                        )}

                        {/* Opsi Hapus Permanen - hanya jika tidak ada transaksi */}
                        {deleteCheckResult.canDelete ? (
                          <button
                            onClick={() => { setSelectedAction('permanent'); setDeleteStep('confirm'); }}
                            disabled={deleting}
                            className="w-full p-3 text-left hover:bg-red-50 transition-colors flex items-start gap-3"
                          >
                            <span className="material-symbols-outlined text-red-600 mt-0.5">delete_forever</span>
                            <div>
                              <p className="font-medium text-red-700">Hapus Permanen</p>
                              <p className="text-sm text-gray-500">
                                {deleteCheckResult.hasStockHistory 
                                  ? 'Produk dan riwayat stok akan dihapus permanen. Tidak bisa dikembalikan!'
                                  : 'Produk akan dihapus permanen dari database. Tidak bisa dikembalikan!'}
                              </p>
                            </div>
                          </button>
                        ) : (
                          <div className="w-full p-3 bg-gray-50 flex items-start gap-3 opacity-60">
                            <span className="material-symbols-outlined text-gray-400 mt-0.5">block</span>
                            <div>
                              <p className="font-medium text-gray-500">Hapus Permanen</p>
                              <p className="text-sm text-gray-400">Tidak tersedia karena produk memiliki riwayat transaksi.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <span className="material-symbols-outlined text-base align-middle mr-1">info</span>
                      Anda akan <span className="font-bold">{selectedAction === 'deactivate' ? 'NONAKTIFKAN' : 'HAPUS PERMANEN'}</span> produk berikut:
                    </p>
                    <p className="text-sm font-medium text-blue-900 mt-2">{deleteNames}</p>
                  </div>

                  {selectedAction === 'permanent' && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800 font-medium">
                        <span className="material-symbols-outlined text-base align-middle mr-1">warning</span>
                        Perhatian: Tindakan ini TIDAK BISA DIKEMBALIKAN!
                      </p>
                      <p className="text-sm text-red-700 mt-1">Data produk akan dihapus permanen dari database.</p>
                    </div>
                  )}

                  <p className="text-gray-600 text-sm">
                    Apakah Anda yakin ingin {selectedAction === 'deactivate' ? 'nonaktifkan' : 'hapus permanen'} produk ini?
                  </p>
                </>
              )}
            </div>
            <div className="px-4 py-3 border-t flex justify-end gap-2 bg-gray-50">
              <button
                onClick={() => {
                  if (deleteStep === 'confirm') {
                    setDeleteStep('select');
                    setSelectedAction(null);
                  } else {
                    setShowDeleteModal(false);
                    setDeleteTarget(null);
                    setDeleteCheckResult(null);
                  }
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                disabled={deleting}
              >
                {deleteStep === 'confirm' ? 'Kembali' : 'Batal'}
              </button>
              {deleteStep === 'confirm' && (
                <button
                  onClick={() => handleConfirmDelete(selectedAction!)}
                  disabled={deleting}
                  className={`px-4 py-2 text-white rounded-lg ${
                    selectedAction === 'permanent'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  } disabled:opacity-50`}
                >
                  {deleting ? 'Memproses...' : (selectedAction === 'deactivate' ? 'Nonaktifkan' : 'Hapus Permanen')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
