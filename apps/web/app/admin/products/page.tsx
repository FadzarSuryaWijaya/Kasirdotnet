'use client';

import { useEffect, useState, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { categoriesApi, productsApi, type ProductDto, type CategoryDto } from '@/app/lib/api';
import { DataTable } from '@/app/components/ui/DataTable';
import ProductModal from '@/app/components/ProductModal';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5136';

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDto | null>(null);

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
          <button
            onClick={() => handleEdit(row.original)}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-xl">edit</span>
          </button>
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
        />
      )}

      <ProductModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        product={editingProduct}
        categories={categories}
      />
    </div>
  );
}
