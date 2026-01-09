import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar"; // Import sidebar yg baru dibuat

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HydroFlow Depot System",
  description: "Aplikasi Manajemen Depot Air Minum",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${inter.className} bg-gray-50 bg-opacity-50`}>
        <div className="flex min-h-screen">
          {/* Sidebar nempel statis di kiri */}
          <Sidebar />
          
          {/* Area Konten Utama (digeser 64 unit ke kanan -> w-64) */}
          <main className="flex-1 ml-64 p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}