# 🚀 Vercel Simple Deploy - Nx Monorepo (No Config Files)

## 🎯 Tujuan

Deploy Nx monorepo ke Vercel dengan setup minimal, tanpa `vercel.json`, `.vercelignore`, atau `.npmrc`.

---

## ✅ Setup yang Diperlukan

### 1. Root `package.json` (WAJIB)

File: `package.json` (root)

```json
{
  "name": "kasirdotnet-monorepo",
  "dependencies": {
    "next": "16.1.1",
    "react": "19.2.3",
    "react-dom": "19.2.3"
  },
  "devDependencies": {
    "@nx/js": "18.0.0",
    "@nx/next": "18.0.0",
    "@nx/workspace": "18.0.0",
    "nx": "18.0.0",
    ...
  }
}
```

**Penting**: `next`, `react`, `react-dom` HARUS ada di root `dependencies`.

### 2. `apps/web/package.json`

File: `apps/web/package.json`

```json
{
  "name": "@kasirdotnet/web",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@tanstack/react-table": "^8.21.3",
    "lucide-react": "^0.562.0",
    "next": "16.1.1",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "recharts": "^3.6.0"
  }
}
```

### 3. `.nvmrc` (Optional tapi Recommended)

File: `apps/web/.nvmrc`

```
18.17.0
```

### 4. `.env.example` (Template)

File: `apps/web/.env.example`

```
NEXT_PUBLIC_API_URL=http://localhost:5136
```

---

## 🚀 Deploy ke Vercel (Step-by-Step)

### Step 1: Push ke GitHub

```bash
git add .
git commit -m "feat: setup for vercel deployment"
git push origin main
```

### Step 2: Import Project ke Vercel

1. Buka https://vercel.com/dashboard
2. Klik **Add New** → **Project**
3. Pilih repository GitHub: `Kasirdotnet`
4. Klik **Import**

### Step 3: Configure Project

**Framework Preset**: `Next.js` (auto-detected)

**Root Directory**: 
- Klik **Edit**
- Pilih: `apps/web`
- Klik **Continue**

**Build and Output Settings**:
- **Build Command**: `npm run build` (default, biarkan)
- **Output Directory**: `.next` (default, biarkan)
- **Install Command**: `npm install` (default, biarkan)

**Environment Variables**:
- Klik **Add**
- **Key**: `NEXT_PUBLIC_API_URL`
- **Value**: `https://api.yourdomain.com`
- **Environments**: `Production`
- Klik **Add**

### Step 4: Deploy

Klik **Deploy** dan tunggu ~2-3 menit.

---

## ✅ Vercel Dashboard Configuration

### Build & Development Settings

Setelah deploy pertama, buka Settings:

1. **Settings** → **Build & Development Settings**

2. **Framework Preset**: `Next.js`

3. **Root Directory**: `apps/web`

4. **Build Command**: 
   ```
   npm run build
   ```

5. **Output Directory**: 
   ```
   .next
   ```

6. **Install Command**: 
   ```
   npm install --legacy-peer-deps
   ```
   
   **PENTING**: Tambahkan `--legacy-peer-deps` untuk Nx compatibility

7. **Node.js Version**: `18.x` (default)

8. Klik **Save**

### Environment Variables

1. **Settings** → **Environment Variables**

2. Add:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://api.yourdomain.com`
   - **Environments**: `Production`

3. Klik **Save**

---

## 🔍 Verify Deployment

### 1. Check Build Logs

1. Vercel Dashboard → **Deployments**
2. Klik deployment terbaru
3. Buka **Logs**
4. Verifikasi:
   - ✅ `npm install` berhasil
   - ✅ Next.js version detected
   - ✅ Build berhasil
   - ✅ Deployment successful

### 2. Check Frontend

1. Buka URL deployment (contoh: `https://kasir-web.vercel.app`)
2. Verifikasi halaman loading
3. DevTools (F12) → Console:
   ```javascript
   console.log(process.env.NEXT_PUBLIC_API_URL)
   ```
4. Verifikasi output: `https://api.yourdomain.com`

### 3. Test API Connection

1. Login dengan `admin` / `admin123`
2. DevTools → Network tab
3. Verifikasi request ke `https://api.yourdomain.com/api/auth/login`
4. Verifikasi response 200 OK

---

## 📋 File Structure (Minimal)

```
kasirdotnet/
├── package.json                    # Root (WAJIB: next, react, react-dom)
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── nx.json
├── .gitignore
│
└── apps/
    └── web/
        ├── package.json            # Web app dependencies
        ├── .nvmrc                  # Node version (optional)
        ├── .env.example            # Template (tracked)
        ├── .env.local              # Development (ignored)
        ├── .env.production         # Production (ignored)
        ├── next.config.ts
        ├── tsconfig.json
        ├── tailwind.config.ts
        └── app/
            └── ...
```

**Files yang TIDAK perlu:**
- ❌ `vercel.json`
- ❌ `.vercelignore`
- ❌ `.npmrc`

**Semua konfigurasi di Vercel Dashboard!**

---

## 🎯 Checklist

### Local Setup
- [x] Root `package.json` punya `next`, `react`, `react-dom`
- [x] `apps/web/package.json` configured
- [x] `.nvmrc` configured (optional)
- [x] `.env.example` created
- [x] Files di-commit dan di-push

### Vercel Dashboard
- [ ] Project di-import
- [ ] Root Directory: `apps/web`
- [ ] Install Command: `npm install --legacy-peer-deps`
- [ ] Environment variable di-set
- [ ] Build berhasil
- [ ] Deployment successful

### Verification
- [ ] Frontend accessible
- [ ] API URL correct
- [ ] Login berfungsi
- [ ] API calls berfungsi

---

## 🐛 Troubleshooting

### Issue 1: "Next.js not detected"

**Penyebab**: Root `package.json` tidak punya `next`

**Solusi**:
```json
// package.json (root)
{
  "dependencies": {
    "next": "16.1.1",
    "react": "19.2.3",
    "react-dom": "19.2.3"
  }
}
```

### Issue 2: "npm install error"

**Penyebab**: Peer dependency conflicts

**Solusi**:
1. Vercel Dashboard → Settings → Build & Development Settings
2. Install Command: `npm install --legacy-peer-deps`
3. Save dan redeploy

### Issue 3: "Root Directory not found"

**Penyebab**: Root Directory salah

**Solusi**:
1. Vercel Dashboard → Settings → General
2. Root Directory: `apps/web`
3. Save dan redeploy

### Issue 4: "Environment variable not loaded"

**Penyebab**: Environment variable tidak di-set

**Solusi**:
1. Vercel Dashboard → Settings → Environment Variables
2. Add: `NEXT_PUBLIC_API_URL` = `https://api.yourdomain.com`
3. Save dan redeploy

---

## 🎓 Best Practices

### ✅ DO

- ✅ Tambahkan `next`, `react`, `react-dom` ke root `package.json`
- ✅ Set Root Directory ke `apps/web` di Vercel
- ✅ Gunakan `--legacy-peer-deps` untuk Nx monorepo
- ✅ Set environment variables di Vercel Dashboard
- ✅ Commit `.env.example` sebagai template
- ✅ Ignore `.env.local` dan `.env.production`

### ❌ DON'T

- ❌ Jangan buat `vercel.json` (gunakan Dashboard)
- ❌ Jangan commit `.env.local` atau `.env.production`
- ❌ Jangan hardcode API URL di code
- ❌ Jangan lupa set Root Directory

---

## 📚 Summary

| Aspek | Konfigurasi |
|-------|-------------|
| **Root Directory** | `apps/web` (di Vercel Dashboard) |
| **Install Command** | `npm install --legacy-peer-deps` (di Vercel Dashboard) |
| **Build Command** | `npm run build` (default) |
| **Output Directory** | `.next` (default) |
| **Environment Variables** | Set di Vercel Dashboard |
| **Config Files** | ❌ Tidak perlu `vercel.json` |

---

## 🎯 Kesimpulan

**Setup Minimal untuk Nx Monorepo di Vercel:**

1. ✅ Root `package.json` dengan `next`, `react`, `react-dom`
2. ✅ Vercel Dashboard: Root Directory = `apps/web`
3. ✅ Vercel Dashboard: Install Command = `npm install --legacy-peer-deps`
4. ✅ Vercel Dashboard: Environment Variables

**Tidak perlu:**
- ❌ `vercel.json`
- ❌ `.vercelignore`
- ❌ `.npmrc`

**Semua konfigurasi di Vercel Dashboard = Lebih simple & maintainable!**

---

**Last Updated**: January 2026  
**Version**: 2.0.0  
**Status**: Production Ready (Simplified)
