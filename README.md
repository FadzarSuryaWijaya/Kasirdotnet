# ☕ Warung Kopi POS

Sistem Point of Sale (POS) modern untuk warung kopi dan usaha retail kecil. Dibangun dengan .NET 9 (Backend) dan Next.js 16 (Frontend).

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![.NET](https://img.shields.io/badge/.NET-9.0-purple)
![Next.js](https://img.shields.io/badge/Next.js-16-black)

## ✨ Fitur Utama

### 🛒 POS Kasir
- Antarmuka kasir yang intuitif dan responsif
- Pencarian produk cepat dengan kategori
- Keranjang belanja dengan edit quantity
- Pembayaran Cash & QRIS
- Cetak struk thermal (58mm/80mm)
- Hold/pending order untuk transaksi tertunda

### 📊 Laporan & Analitik
- **Laporan Harian** - Ringkasan penjualan per hari dengan status DRAFT/FINAL
- **Laporan Shift** - Detail penjualan per sesi kasir
- **Ringkasan** - Dashboard dengan grafik penjualan bulanan
- Export laporan ke PDF

### 📦 Manajemen Inventori
- Tracking stok produk (opsional per produk)
- Restok, penyesuaian, dan set stok manual
- Riwayat pergerakan stok lengkap
- Notifikasi stok menipis/habis

### 💰 Manajemen Kas
- Saldo kas toko (cash drawer)
- Setoran & pengambilan kas
- Otomatis update saat tutup hari
- Riwayat mutasi kas

### ⚙️ Pengaturan
- Informasi toko (nama, alamat, telepon)
- Jam operasional
- Pajak (default 11% PPN atau custom)
- Metode pembayaran aktif
- Footer struk custom
- Reset data ujicoba

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | .NET 9, Entity Framework Core, SQL Server |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Auth | JWT Bearer Token |
| Monorepo | Nx 18, pnpm |

## 📁 Struktur Proyek

```
kasirdotnet/
├── apps/
│   ├── api/                 # .NET Backend
│   │   ├── Controllers/     # API Endpoints
│   │   ├── Models/          # Entity Models
│   │   ├── DTOs/            # Data Transfer Objects
│   │   ├── Services/        # Business Logic
│   │   ├── Data/            # DbContext
│   │   └── Migrations/      # EF Migrations
│   └── web/                 # Next.js Frontend
│       ├── app/
│       │   ├── admin/       # Admin Pages
│       │   ├── kasir/       # Cashier POS
│       │   ├── components/  # Shared Components
│       │   └── lib/         # Utilities & API
│       └── public/
└── packages/                # Shared Packages (future)
```

## 🚀 Quick Start

### Prerequisites
- [Node.js 18+](https://nodejs.org/)
- [.NET 9 SDK](https://dotnet.microsoft.com/download)
- [SQL Server](https://www.microsoft.com/sql-server) (LocalDB / Express / Full)
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)

### 1. Clone Repository

```bash
git clone https://github.com/username/kasirdotnet.git
cd kasirdotnet
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Setup Database

Buat file `apps/api/appsettings.Development.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=WarungKopiDB;Trusted_Connection=True;TrustServerCertificate=True;"
  },
  "Jwt": {
    "Key": "YourSuperSecretKeyHere_MinLength32Chars!",
    "Issuer": "WarungKopiAPI",
    "Audience": "WarungKopiWeb"
  }
}
```

### 4. Run Database Migration

```bash
cd apps/api
dotnet ef database update
```

### 5. Start Development Servers

**Terminal 1 - Backend API:**
```bash
cd apps/api
dotnet run
```
> API berjalan di `http://localhost:5136`

**Terminal 2 - Frontend Web:**
```bash
cd apps/web
pnpm dev
```
> Web berjalan di `http://localhost:3000`

## 👤 Default Users

| Username | Password | Role | Akses |
|----------|----------|------|-------|
| `admin` | `admin123` | Admin | Full access |
| `kasir` | `kasir123` | Kasir | POS only |

## 📱 Halaman

| Path | Deskripsi | Role |
|------|-----------|------|
| `/` | Login | All |
| `/kasir` | POS Kasir | Kasir, Admin |
| `/admin` | Dashboard | Admin |
| `/admin/products` | Kelola Produk | Admin |
| `/admin/categories` | Kelola Kategori | Admin |
| `/admin/stock` | Inventori/Stok | Admin |
| `/admin/cash` | Kas Toko | Admin |
| `/admin/reports` | Ringkasan Laporan | Admin |
| `/admin/reports/daily` | Laporan Harian | Admin |
| `/admin/reports/shift` | Laporan Shift | Admin |
| `/admin/settings` | Pengaturan | Admin |

## 🔌 API Endpoints

<details>
<summary><b>Auth</b></summary>

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/register` | Register (Admin) |
| GET | `/api/auth/me` | Get current user |

</details>

<details>
<summary><b>Products</b></summary>

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/products` | List semua produk |
| GET | `/api/products/{id}` | Detail produk |
| POST | `/api/products` | Tambah produk |
| PUT | `/api/products/{id}` | Update produk |
| DELETE | `/api/products/{id}` | Hapus produk |

</details>

<details>
<summary><b>Transactions</b></summary>

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/transactions` | List transaksi |
| GET | `/api/transactions/{id}` | Detail transaksi |
| POST | `/api/transactions` | Buat transaksi baru |
| POST | `/api/transactions/{id}/void` | Void transaksi |

</details>

<details>
<summary><b>Sessions</b></summary>

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/sessions/current` | Sesi aktif |
| POST | `/api/sessions/open` | Buka shift |
| POST | `/api/sessions/close` | Tutup shift |

</details>

<details>
<summary><b>Reports</b></summary>

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/reports/daily` | Laporan harian |
| GET | `/api/reports/summary` | Ringkasan dashboard |
| POST | `/api/reports/close-day` | Tutup hari |

</details>

<details>
<summary><b>Stock</b></summary>

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/stock` | Summary stok |
| GET | `/api/stock/history` | Riwayat stok |
| POST | `/api/stock/{id}/restock` | Tambah stok |
| POST | `/api/stock/{id}/adjust` | Penyesuaian stok |
| PATCH | `/api/stock/{id}/track-stock` | Toggle tracking |

</details>

<details>
<summary><b>Settings</b></summary>

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/settings` | Get semua setting |
| PUT | `/api/settings` | Update settings |
| POST | `/api/settings/reset-data` | Reset data ujicoba |

</details>

## 📝 Catatan Penting

### Timezone
- Backend menyimpan waktu dalam **UTC**
- Frontend menampilkan waktu **WIB (UTC+7)**
- `BusinessDate` adalah sumber kebenaran untuk semua laporan

### Alur Bisnis Harian
```
1. Buka Shift    → Kasir login, input saldo awal kas
2. Transaksi     → Proses penjualan di POS
3. Tutup Shift   → Kasir tutup shift, sistem hitung selisih
4. Tutup Hari    → Admin tutup hari, kas update otomatis
```

### Inventory
- Produk bisa di-set untuk track stok atau tidak
- Produk tanpa tracking = stok unlimited (tidak berkurang saat dijual)
- Produk dengan tracking = stok berkurang otomatis saat transaksi

## 🔧 Development Commands

```bash
# Install dependencies
pnpm install

# Run API
cd apps/api && dotnet run

# Run Web
cd apps/web && pnpm dev

# Build API
cd apps/api && dotnet build

# Build Web
cd apps/web && pnpm build

# Add EF Migration
cd apps/api && dotnet ef migrations add MigrationName

# Update Database
cd apps/api && dotnet ef database update

# Run with Parallel dev
cd kasirdotnet && pnpm -r --parallel dev

# Run & build project
cd kasirdotnet && pnpm build
pnpm start
```

## 🤝 Contributing

1. Fork repository
2. Buat branch fitur (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

## 📄 License

MIT License - Silakan gunakan untuk keperluan pribadi atau komersial.

---

<p align="center">Made with ❤️ for Indonesian small businesses</p>
