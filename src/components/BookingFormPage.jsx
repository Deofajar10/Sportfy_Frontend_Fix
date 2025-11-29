import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import { apiClient } from '../api/client';
import { getUser } from '../utils/auth';

export function BookingFormPage({ bookingData, onNavigate, onBack }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    teamName: '',
    findOpponent: false,
    findPlayers: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const buildDateTime = (date, timeRange) => {
    if (!timeRange?.includes('-')) return { start: null, end: null };
    const [startStr, endStr] = timeRange.split('-').map((s) => s.trim());
    const start = new Date(`${date}T${startStr}:00`);
    const end = new Date(`${date}T${endStr}:00`);
    return { start, end };
  };

  const toNumericId = (value) => {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
    const digits = String(value || '').match(/\d+/);
    if (digits) {
      const parsed = Number(digits[0]);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const user = getUser();
    if (!user?.id) {
      toast.error('Silakan login terlebih dahulu.');
      return;
    }

    const courtId = toNumericId(bookingData?.courtId || bookingData?.court?.id || bookingData?.court);
    const fromBookingData = bookingData?.startTime && bookingData?.endTime
      ? { start: new Date(bookingData.startTime), end: new Date(bookingData.endTime) }
      : buildDateTime(bookingData?.date, bookingData?.time);

    const { start, end } = fromBookingData;

    if (!courtId || !(start instanceof Date) || !(end instanceof Date) || Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) {
      toast.error('Data jadwal tidak valid.');
      return;
    }

    setIsSubmitting(true);

    try {
      let bookingId = toNumericId(bookingData?.id || bookingData?.bookingId);

      if (!bookingId) {
        const bookingResponse = await apiClient('/bookings', {
          method: 'POST',
          data: {
            userId: user.id,
            courtId,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            teamName: formData.teamName,
            findOpponent: formData.findOpponent,
          },
        });

        const created = bookingResponse?.data || bookingResponse;
        bookingId = toNumericId(created?.id);
      }

      if (!bookingId) throw new Error('Booking tidak valid');

      localStorage.setItem('lastBookingId', bookingId);

      const paymentResponse = await apiClient(`/payments/booking/${bookingId}`, {
        method: 'POST',
      });

      const redirectUrl =
        paymentResponse?.data?.data?.redirectUrl ||
        paymentResponse?.data?.redirectUrl;

      if (!redirectUrl) {
        toast.error('Gagal mendapatkan link pembayaran Midtrans.');
        return;
      }

      window.location.href = redirectUrl;
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Terjadi kesalahan jaringan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.name.trim() !== '' && formData.phone.trim() !== '';

  return (
    <div className="min-h-screen bg-[#121212] py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Button
          onClick={onBack}
          variant="outline"
          className="mb-6 bg-[#282828] text-white border-white/10 hover:bg-[#3E3E3E]"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali ke Beranda
        </Button>

        <div className="bg-[#181818] rounded-xl shadow-sm p-8 border border-white/10">
          <h1 className="text-white mb-6 text-3xl">Formulir Pemesanan</h1>

          <div className="bg-[#1DB954]/10 border border-[#1DB954]/20 rounded-lg p-6 mb-8">
            <h2 className="text-white mb-4">Ringkasan Pesanan</h2>
            <div className="space-y-2">
              <p className="text-gray-300"><span className="text-gray-400">Lapangan:</span> {bookingData.court || bookingData.courtId}</p>
              <p className="text-gray-300"><span className="text-gray-400">Jadwal:</span> {formatDate(bookingData.date)}, {bookingData.time}</p>
              <p className="text-white"><span className="text-gray-400">Harga Perkiraan:</span> Rp{(bookingData.price || bookingData.priceFrom || 0).toLocaleString('id-ID')}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-white">Data Diri</h2>
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-300">Nama Lengkap <span className="text-red-500">*</span></Label>
              <Input id="name" type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nama Lengkap" className="bg-[#282828] border-white/10 text-white" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gray-300">Nomor WhatsApp <span className="text-red-500">*</span></Label>
              <Input id="phone" type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Contoh: 0812xxx" className="bg-[#282828] border-white/10 text-white" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">Email (opsional)</Label>
              <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="bg-[#282828] border-white/10 text-white" />
            </div>

            <div className="border-t border-white/10 pt-6 mt-8">
              <h2 className="text-white mb-4">Opsi Tanding</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="teamName" className="text-gray-300">Nama Tim (opsional)</Label>
                  <Input id="teamName" type="text" value={formData.teamName} onChange={(e) => setFormData({ ...formData, teamName: e.target.value })} className="bg-[#282828] border-white/10 text-white" />
                </div>
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="findOpponent"
                    checked={formData.findOpponent}
                    onCheckedChange={(checked) => setFormData({ ...formData, findOpponent: checked === true })}
                    className="border-white/20"
                  />
                  <div className="flex-1">
                    <label htmlFor="findOpponent" className="text-white cursor-pointer">Cari Lawan Tanding</label>
                    <p className="text-sm text-gray-400">Slot Anda akan tampil di menu Laga Terbuka.</p>
                  </div>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={!isFormValid || isSubmitting} className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-black py-6 rounded-full">
              {isSubmitting ? 'Memproses...' : 'Konfirmasi Booking'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
