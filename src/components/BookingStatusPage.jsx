import { useEffect, useState, useRef } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { apiClient } from '../api/client';
import { toast } from 'sonner';

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const formatTime = (iso) => {
  const date = new Date(iso);
  const pad = (num) => String(num).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export function BookingStatusPage({ bookingId: initialBookingId, onNavigate }) {
  const [bookingId, setBookingId] = useState(
    initialBookingId ||
    new URLSearchParams(window.location.search).get('bookingId') ||
    localStorage.getItem('lastBookingId') ||
    ''
  );
  const [booking, setBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Ref untuk menyimpan ID interval agar bisa dihentikan nanti
  const intervalRef = useRef(null);

  // Fungsi fetch status (isBackground = true artinya tidak memunculkan loading spinner)
  const fetchStatus = async (id, isBackground = false) => {
    if (!id) {
      setBooking(null);
      return null;
    }
    
    if (!isBackground) setIsLoading(true);
    
    try {
      const { data } = await apiClient(`/bookings/${id}`);
      setBooking(data);
      
      // Simpan ID terakhir biar user kalau refresh browser gak hilang datanya
      localStorage.setItem('lastBookingId', id);
      return data;
    } catch (error) {
      console.error(error);
      if (!isBackground) {
        toast.error(error.message || 'Gagal mengambil status booking');
        setBooking(null);
      }
      return null;
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };

  // Effect: Jalankan saat halaman dimuat atau bookingId berubah
  useEffect(() => {
    if (!bookingId) return;

    // 1. Ambil data pertama kali
    fetchStatus(bookingId, false).then((data) => {
      
      // 2. Jika statusnya masih 'PENDING', nyalakan timer (Polling)
      if (data && data.status === 'PENDING') {
        
        // Bersihkan timer lama jika ada
        if (intervalRef.current) clearInterval(intervalRef.current);

        // Set timer baru: Cek setiap 5 detik
        intervalRef.current = setInterval(async () => {
          console.log("Auto-checking payment status...");
          const updatedData = await fetchStatus(bookingId, true);
          
          // 3. Jika status BERUBAH (bukan PENDING lagi), hentikan timer
          if (updatedData && updatedData.status !== 'PENDING') {
            clearInterval(intervalRef.current);
            intervalRef.current = null;

            if (updatedData.status === 'PAID') {
              toast.success("Pembayaran Diterima! Booking LUNAS.");
            } else if (['CANCELLED', 'CANCELED', 'DENY', 'EXPIRED'].includes(updatedData.status)) {
              toast.error("Pembayaran Gagal atau Kadaluarsa.");
            }
          }
        }, 5000); 
      }
    });

    // Cleanup: Matikan timer saat user pindah halaman
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [bookingId]);

  // Helper untuk warna status
  const getStatusColor = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'PAID' || s === 'SETTLEMENT' || s === 'CONFIRMED') return 'text-[#1DB954]';
    if (s === 'PENDING') return 'text-yellow-400';
    if (s === 'CANCELLED' || s === 'CANCELED' || s === 'DENY' || s === 'EXPIRED') return 'text-red-400';
    return 'text-white';
  };

  return (
    <div className="min-h-screen bg-[#121212] py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Button
          onClick={() => onNavigate('home')}
          variant="outline"
          className="mb-6 bg-[#282828] text-white border-white/10 hover:bg-[#3E3E3E]"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali ke Beranda
        </Button>

        <div className="bg-[#181818] rounded-xl shadow-sm p-8 border border-white/10">
          <h1 className="text-white mb-6 text-3xl">Status Booking</h1>

          <div className="flex gap-2 mb-6">
            <Input
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              placeholder="Masukkan Booking ID"
              className="bg-[#282828] border-white/10 text-white placeholder:text-gray-500"
            />
            <Button
              onClick={() => fetchStatus(bookingId)}
              disabled={!bookingId || isLoading}
              className="bg-[#1DB954] hover:bg-[#1ed760] text-black"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Cek Manual
            </Button>
          </div>

          {isLoading && !booking && <p className="text-gray-400 text-center py-8">Memuat status booking...</p>}

          {!isLoading && !booking && !bookingId && (
            <p className="text-gray-400 text-center py-8">Masukkan Booking ID untuk melihat status.</p>
          )}

          {booking && (
            <div className="space-y-6 animate-in fade-in-50">
              {/* Kartu Status Utama */}
              <div className="bg-[#282828] border border-white/10 rounded-lg p-6 text-center">
                <p className="text-gray-400 mb-2">Status Pembayaran</p>
                <p className={`text-4xl font-bold ${getStatusColor(booking.status)}`}>
                  {booking.status}
                </p>
                {booking.status === 'PENDING' && (
                  <div className="mt-4 flex flex-col items-center justify-center text-sm text-gray-400 animate-pulse">
                    <p>Menunggu pembayaran...</p>
                    <p>Halaman ini akan otomatis terupdate setelah Anda membayar.</p>
                  </div>
                )}
              </div>

              {/* Detail Booking */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#282828]/50 p-6 rounded-lg border border-white/5">
                <div className="space-y-1">
                  <p className="text-gray-400 text-sm">Lapangan</p>
                  <p className="text-white text-lg font-medium">{booking?.court?.name || booking.courtId}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-400 text-sm">Lokasi</p>
                  <p className="text-white text-lg font-medium">{booking?.court?.location || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-400 text-sm">Tanggal</p>
                  <p className="text-white text-lg font-medium">{formatDate(booking.startTime)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-400 text-sm">Waktu</p>
                  <p className="text-white text-lg font-medium">{`${formatTime(booking.startTime)} - ${formatTime(booking.endTime)}`}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-400 text-sm">Total Harga</p>
                  <p className="text-[#1DB954] text-xl font-bold">Rp{Number(booking.totalPrice || 0).toLocaleString('id-ID')}</p>
                </div>
                 <div className="space-y-1">
                  <p className="text-gray-400 text-sm">ID Booking</p>
                  <p className="text-white text-lg font-mono tracking-wider">{booking.id}</p>
                </div>
              </div>
              
              {/* Pesan Sukses */}
              {booking.status === 'PAID' && (
                 <div className="bg-[#1DB954]/10 border border-[#1DB954]/20 rounded-lg p-4 mt-4 flex items-center justify-center gap-3">
                    <span className="text-2xl">🎉</span>
                    <p className="text-white text-center">
                        Terima kasih! Booking Anda telah terkonfirmasi. Tunjukkan halaman ini kepada petugas.
                    </p>
                 </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}