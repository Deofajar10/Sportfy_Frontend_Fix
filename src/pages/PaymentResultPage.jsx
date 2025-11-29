import { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { apiClient } from '../api/client';
import { toast } from 'sonner';

export function PaymentResultPage({ bookingId: initialBookingId, onNavigate }) {
  const [bookingId, setBookingId] = useState(initialBookingId || '');
  const [booking, setBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryBookingId = params.get('bookingId');
    if (queryBookingId) {
      setBookingId(queryBookingId);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!bookingId) return;
      setIsLoading(true);
      try {
        const { data } = await apiClient(`/bookings/${bookingId}`);
        setBooking(data);
      } catch (error) {
        console.error(error);
        toast.error(error.message || 'Gagal mengambil status pembayaran');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [bookingId]);

  const status = (booking?.paymentStatus || booking?.status || '').toUpperCase();

  const getMessage = () => {
    if (status === 'PAID' || status === 'SETTLEMENT' || status === 'CONFIRMED') {
      return 'Pembayaran berhasil. Booking kamu sudah terkonfirmasi.';
    }
    if (status === 'EXPIRED') {
      return 'Pembayaran kedaluwarsa. Silakan buat booking ulang.';
    }
    if (status === 'CANCELLED' || status === 'CANCELED' || status === 'DENY' || status === 'FAILED') {
      return 'Pembayaran dibatalkan atau ditolak.';
    }
    return 'Pembayaran masih tertunda atau belum kami terima.';
  };

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl bg-[#181818] border border-white/10 rounded-xl p-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-white text-3xl font-semibold">Payment Result</h1>
          <p className="text-gray-400">Ringkasan status pembayaran booking kamu.</p>
        </div>

        <div className="bg-[#282828] border border-white/10 rounded-lg p-6 space-y-4">
          <p className="text-gray-400 text-sm">Booking ID</p>
          <p className="text-white text-xl font-mono">{bookingId || '-'}</p>

          {isLoading && <p className="text-gray-400">Memuat status...</p>}

          {!isLoading && (
            <>
              <p className="text-gray-300">
                Status Pembayaran:{' '}
                <span className="font-semibold text-white">{status || 'UNKNOWN'}</span>
              </p>
              <p className="text-gray-400">{getMessage()}</p>
              {booking && (
                <div className="text-sm text-gray-400 space-y-1">
                  <p>Lapangan: <span className="text-white">{booking?.court?.name || booking.courtId}</span></p>
                  <p>Total: <span className="text-white">Rp{Number(booking.totalPrice || 0).toLocaleString('id-ID')}</span></p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-3">
          <Button className="bg-[#1DB954] hover:bg-[#1ed760] text-black" onClick={() => onNavigate?.('home')}>
            Kembali ke Beranda
          </Button>
          <Button variant="outline" className="border-white/20 text-white" onClick={() => onNavigate?.('booking-status', { bookingId })}>
            Lihat Status Booking
          </Button>
        </div>
      </div>
    </div>
  );
}
