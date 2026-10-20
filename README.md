# 🪙 TieroSaver — Smart Personal Finance & Budget Tracker

**TieroSaver** adalah aplikasi web manajemen keuangan pribadi modern yang dirancang untuk membantu generasi muda (*Gen Z* dan profesional muda) mengendalikan kebiasaan belanja, mematuhi batas anggaran (*budget limits*), serta mencapai target tabungan secara terukur dan disiplin.

---

## ✨ Fitur-Fitur Utama

1. **Autentikasi Multi-User**:
   - Register akun & Login aman berbasis **JWT Token** dan enkripsi sandi **Bcrypt**.
2. **Dashboard Finansial & Visualisasi Interaktif**:
   - 4 Kartu KPI Real-Time: Hari Ini, Minggu Ini, Bulan Ini, dan Total Tabungan.
   - **Hollow Donut Chart**: Proporsi pengeluaran per kategori dengan Center KPI nominal dan progress bar pada legenda.
   - **Grafik Tren Fluktuasi Harian**: Toggle antara **Spline Area Chart** (kurva halus bergradien) dan **Bar Chart** vertikal, dilengkapi strip ringkasan (Rata-rata, Puncak Belanja, Hari Aktif).
   - Custom *Dark Glassmorphism Tooltips*.
3. **Pencatatan & Manajemen Pengeluaran (Expense Tracker)**:
   - Input transaksi cepat dengan format Rupiah otomatis (separator titik).
   - Kalender tanggal fleksibel (*Hari Ini*, *Kemarin*, *Besok*, atau pilih tanggal spesifik).
   - Data Table responsif dengan **Sorting** (Terbaru, Terlama, Nominal Tertinggi/Terendah), **Pencarian instan**, dan **Filter Kategori**.
   - **Full CRUD**: Tambah, **Edit Transaksi** (modal popup), dan Hapus dengan modal konfirmasi aman.
   - Ekspor laporan pengeluaran ke file **CSV** (Excel ready).
   - Tombol **Quick Add** mengambang dari mana saja.
4. **Batas Anggaran (Budget Limits)**:
   - Pengaturan kuota maksimal pengeluaran per Hari (*Daily*), per Minggu (*Weekly*), dan per Bulan (*Monthly*).
   - Indikator status otomatis: **Aman (Hijau)**, **Mendekati Batas (Kuning)**, dan **Melebihi Batas (Merah)**.
5. **Target Tabungan (Savings Goals)**:
   - Pembuatan berbagai target impian (nama target, nominal target, tenggat waktu).
   - Fitur Setor (*Deposit*) dan Tarik Dana (*Withdraw*).
   - Progress bar persentase ketercapaian dan estimasi sisa kebutuhan.
   - Mini tabel riwayat mutasi tabungan.
6. **UI/UX Modern & Estetika**:
   - **Dark Mode & Light Mode**: Switcher tema tersimpan di `localStorage`.
   - **Mobile Bottom Navigation Dock**: Navigasi ergonomis 1 tangan di layar smartphone.
   - **Toast Notifications & Modal Konfirmasi**: Bebas dari pop-up `alert()` / `confirm()` bawaan browser.

---

## 🛠️ Tech Stack

- **Frontend**:
  - React 18 & TypeScript
  - Vite
  - Tailwind CSS (dengan Dark Mode)
  - Recharts (Visualisasi Grafik)
  - Lucide React (Icons)
  - Axios
- **Backend**:
  - Go (Golang) 1.22+
  - Gin Web Framework
  - GORM (Object Relational Mapping)
  - JWT (`golang-jwt/jwt`) & Bcrypt
- **Database**:
  - SQLite (Portabel untuk pengembangan lokal)
  - PostgreSQL (Siap migrasi untuk skala produksi)

---

## 🚀 Panduan Menjalankan Project

### 1. Prasyarat
- [Node.js](https://nodejs.org/) (versi 18+) & [pnpm](https://pnpm.io/)
- [Go](https://golang.org/) (versi 1.21+)

### 2. Menjalankan Backend (Go)
```bash
cd backend
go run cmd/server/main.go
```
> Server backend akan berjalan di `http://localhost:8081`.

### 3. Menjalankan Frontend (React + Vite)
Buka terminal baru:
```bash
cd frontend
pnpm install
pnpm dev
```
> Buka browser di `http://localhost:5173`.

---

## 📂 Struktur Repositori

```text
tierosaver/
├── backend/
│   ├── cmd/server/main.go         # Entry point server Gin
│   ├── config/config.go           # Konfigurasi aplikasi & database
│   ├── controllers/               # Controller REST API (Auth, Expense, Budget, Savings)
│   ├── database/db.go             # Koneksi Database (SQLite / Postgres)
│   ├── middleware/                # JWT Auth Middleware
│   ├── models/                    # Skema struct data GORM
│   └── routes/routes.go           # Routing endpoint API
├── frontend/
│   ├── src/
│   │   ├── components/            # Komponen UI (Dashboard, Expenses, Limits, Savings, Auth)
│   │   ├── context/               # Context (Auth, Theme, Toast)
│   │   ├── services/              # Client API Axios
│   │   ├── utils/                 # Formatter Rupiah, Tanggal, & CSV
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── .gitignore
└── README.md
```

---

## 📄 Lisensi
Didistribusikan di bawah lisensi MIT. Silakan gunakan dan kembangkan untuk kebutuhan pribadi maupun tim Anda.
