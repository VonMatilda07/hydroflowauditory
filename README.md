# 💧 HydroFlow - Depot Audit System

![Next JS](https://img.shields.io/badge/Next-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white)
![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)

Aplikasi manajemen operasional dan audit modern khusus untuk usaha **Depot Air Minum**.
Dibuat untuk mengatasi masalah "kebocoran" air, pencatatan manual yang berantakan, dan pemantauan jarak jauh bagi pemilik depot.

## 🚀 Fitur Utama

### 1. 🛒 Point of Sales (Kasir Cerdas)
- **Transaksi Cepat:** Interface kasir yang intuitif dan minim klik.
- **Multi-Payment:** Dukungan pembayaran **Tunai**, **Transfer/QRIS**, **Bon (Hutang)**, dan **Free (Promo)**.
- **Validasi Hutang:** Sistem otomatis mewajibkan nama pelanggan jika memilih metode "Bon".
- **Ongkir Driver:** Input ongkos kirim terpisah agar tidak tercampur dengan omzet penjualan air.
- **Keranjang Realtime:** Kalkulasi total belanja dan ongkir secara otomatis.

### 2. 💧 Audit & Keamanan Air (Anti-Tuyul)
- **Logika Selisih:** Membandingkan jumlah liter air yang terjual (berdasarkan struk sistem) vs kenaikan angka meteran fisik.
- **Status Otomatis:** Dashboard langsung memberikan notifikasi **"Bocor/Mines"** atau **"Aman"**.
- **Log Meteran:** Pencatatan angka meteran per shift (Opening & Closing).

### 3. 📊 Dashboard Eksekutif
- **Grafik Tren Omzet:** Visualisasi pendapatan harian/mingguan dengan *Area Chart*.
- **Top Produk:** Analisa 5 produk terlaris menggunakan *Horizontal Bar Chart*.
- **Komposisi Pembayaran:** Grafik *Donut Chart* untuk melihat porsi pendapatan Tunai vs Hutang (Bon).
- **Laba Bersih:** Perhitungan otomatis (Omzet - Pengeluaran) secara realtime.

### 4. 📉 Manajemen Keuangan
- **Expense Tracker:** Catat pengeluaran operasional (Bensin, Tisu, Makan, Gaji, Maintenance).
- **Arus Kas:** Visualisasi perbandingan Pemasukan vs Pengeluaran.

### 5. 📑 Laporan Detail
- **Filter Fleksibel:** Preset (Hari ini, Minggu ini, Bulan ini) dan Custom Range (Dari tgl X sampai tgl Y).
- **Multi-View:** Tab khusus untuk Transaksi, Pengeluaran, dan Log Meteran.
- **Export to CSV:** Download data laporan ke format Excel dengan satu klik.

### 6. ⚙️ Pengaturan Mandiri
- **Product Manager:** Owner bisa mengubah nama produk, harga, dan estimasi penggunaan liter air langsung dari aplikasi tanpa coding.

---

## 🛠️ Teknologi yang Digunakan

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
- **Language:** TypeScript
- **Database:** [Supabase](https://supabase.com/) (PostgreSQL)
- **Styling:** Tailwind CSS
- **UI Components:** [Shadcn UI](https://ui.shadcn.com/)
- **Charts:** Recharts
- **Icons:** Lucide React

---

## 💻 Cara Menjalankan di Laptop (Local)

Ikuti langkah ini untuk menjalankan aplikasi di komputer sendiri:

1. **Clone Repository**
   ```bash
   git clone [https://github.com/USERNAME-KAMU/hydroflow-app.git](https://github.com/USERNAME-KAMU/hydroflow-app.git)
   cd hydroflow-app
   ```
Install Dependencies
```bash
npm install
```
---
```bash
Setup Environment Variables Buat file .env.local di folder paling luar (sejajar dengan package.json), lalu isi dengan kredensial Supabase kamu:
NEXT_PUBLIC_SUPABASE_URL=[https://project-id-kamu.supabase.co](https://project-id-kamu.supabase.co)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
---
Jalankan Server
```bash
npm run dev
```
Buka http://localhost:3000 di browser.

☁️ Cara Deploy (Online)
Aplikasi ini dioptimalkan untuk deploy menggunakan Vercel.

Push kodingan ke GitHub.

Buka dashboard Vercel -> Add New Project.

Import repository GitHub hydroflow-app kamu.

Masukkan Environment Variables (sama seperti langkah local di atas).

Klik Deploy.

📝 Struktur Database (Supabase)
Pastikan tabel-tabel berikut sudah dibuat di SQL Editor Supabase agar aplikasi berjalan lancar:

products (id, name, price, category, water_usage_liter)

transactions (id, total_amount, shipping_cost, payment_type, status, notes, created_at)

transaction_items (id, transaction_id, product_name, quantity, price_at_transaction, product_id)

meter_readings (id, meter_value, shift, reported_by, date, created_at)

expenses (id, category, amount, description, date)

HydroFlow v1.0 - Dibuat dengan ☕ dan Next.js.


### 💡 Tips:
Jangan lupa ganti bagian `https://github.com/USERNAME-KAMU/hydroflow-app.git` dengan l
