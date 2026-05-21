"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import {
  TrendingUp, Users, Calendar, Settings, Plus, Edit3,
  Package, LayoutDashboard, Camera, Image as ImageIcon, UploadCloud,
  Clock, Trash2, Save, X, CheckCircle2, AlertCircle, ChevronDown, Star, MessageSquare,
  ArrowUpRight, ArrowDownRight, Download, Lightbulb, Mail
} from "lucide-react";

const cities = [
  "Adana","Adıyaman","Afyonkarahisar","Ağrı","Aksaray","Amasya","Ankara","Antalya","Ardahan","Artvin",
  "Aydın","Balıkesir","Bartın","Batman","Bayburt","Bilecik","Bingöl","Bitlis","Bolu","Burdur",
  "Bursa","Çanakkale","Çankırı","Çorum","Denizli","Diyarbakır","Düzce","Edirne","Elazığ","Erzincan",
  "Erzurum","Eskişehir","Gaziantep","Giresun","Gümüşhane","Hakkari","Hatay","Iğdır","Isparta","İstanbul",
  "İzmir","Kahramanmaraş","Karabük","Karaman","Kars","Kastamonu","Kayseri","Kilis","Kırıkkale","Kırklareli",
  "Kırşehir","Kocaeli","Konya","Kütahya","Malatya","Manisa","Mardin","Mersin","Muğla","Muş",
  "Nevşehir","Niğde","Ordu","Osmaniye","Rize","Sakarya","Samsun","Siirt","Sinop","Sivas",
  "Şanlıurfa","Şırnak","Tekirdağ","Tokat","Trabzon","Tunceli","Uşak","Van","Yalova","Yozgat","Zonguldak"
].sort();

const daysOfWeek = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [shop, setShop] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [shopHours, setShopHours] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [serviceForm, setServiceForm] = useState({ name: "", price: "", duration: "", image_url: "" });
  const [savingHours, setSavingHours] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [staff, setStaff] = useState<any[]>([]);
  const [staffForm, setStaffForm] = useState({ firstName: "", lastName: "", avatarUrl: "" });
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [savingStaff, setSavingStaff] = useState(false);
  const [financeChartView, setFinanceChartView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [appointmentView, setAppointmentView] = useState<'list' | 'calendar'>('calendar');
  const [calendarWeekOffset, setCalendarWeekOffset] = useState(0);
  const [calViewMode, setCalViewMode] = useState<'day' | 'week'>('day');
  const [calDayOffset, setCalDayOffset] = useState(0);
  const [selectedApt, setSelectedApt] = useState<any>(null);
  const [detailRejectMode, setDetailRejectMode] = useState(false);
  const [detailRejectReason, setDetailRejectReason] = useState('');
  const [detailRejectError, setDetailRejectError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingShop, setDeletingShop] = useState(false);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/'); return; }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'business_owner') { router.replace('/'); return; }

    const { data: shopList } = await supabase
      .from('shops')
      .select('*, profiles(avatar_url, full_name)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1);
    const shopData = shopList?.[0] || null;

    if (shopData) {
      setShop(shopData);
      const [servicesRes, appointmentsRes, hoursRes, reviewsRes, staffRes] = await Promise.all([
        supabase.from('services').select('*').eq('shop_id', shopData.id).order('created_at', { ascending: false }),
        supabase.from('appointments').select('*, profiles(full_name, phone, email), staff(first_name, last_name)').eq('shop_id', shopData.id).order('appointment_date', { ascending: true }).order('appointment_time', { ascending: true }),
        supabase.from('shop_hours').select('*').eq('shop_id', shopData.id).order('day_of_week', { ascending: true }),
        supabase.from('reviews').select('*, profiles(full_name)').eq('shop_id', shopData.id).order('created_at', { ascending: false }),
        supabase.from('staff').select('*').eq('shop_id', shopData.id).order('created_at', { ascending: true }),
      ]);
      setServices(servicesRes.data || []);
      setAppointments(appointmentsRes.data || []);
      setReviews(reviewsRes.data || []);
      setStaff(staffRes.data || []);

      const hours = hoursRes.data || [];
      if (hours.length === 0) {
        setShopHours(daysOfWeek.map((day, i) => ({
          day_of_week: i === 6 ? 0 : i + 1,
          day_name: day,
          open_time: "09:00",
          close_time: "20:00",
          is_closed: false,
          shop_id: shopData.id,
        })));
      } else {
        const dayNames = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
        setShopHours(hours.map((h: any) => ({ ...h, day_name: dayNames[h.day_of_week] })));
      }
    } else {
      setShop(null);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  // Realtime subscription for appointments
  useEffect(() => {
    if (!shop?.id) return;
    const channel = supabase
      .channel(`appointments-${shop.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `shop_id=eq.${shop.id}` },
        () => fetchInitialData()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [shop?.id, fetchInitialData]);

  const handleFileUpload = async (file: File, folder: string) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('randezy_images').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('randezy_images').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err: any) {
      alert("Hata: " + err.message);
      return null;
    }
  };

  const handleServiceSubmit = async (e: any) => {
    e.preventDefault();
    if (!shop?.id) return;
    const payload = { shop_id: shop.id, name: serviceForm.name, price: parseFloat(serviceForm.price), duration: parseInt(serviceForm.duration), image_url: serviceForm.image_url };
    const { error } = editingService
      ? await supabase.from('services').update(payload).eq('id', editingService.id)
      : await supabase.from('services').insert([payload]);
    if (!error) { setIsServiceModalOpen(false); setEditingService(null); setServiceForm({ name: "", price: "", duration: "", image_url: "" }); fetchInitialData(); }
  };

  const updateAppointmentStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', id);
    if (!error) {
      fetchInitialData();
      if (newStatus === 'Onaylandı') {
        const apt = appointments.find(a => a.id === id);
        if (apt) {
          fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'appointment_confirmed',
              appointmentId: apt.id,
              customerEmail: apt.profiles?.email,
              customerName: apt.profiles?.full_name || 'Müşteri',
              shopName: shop?.name || '',
              serviceName: apt.service_name,
              appointmentDate: apt.appointment_date,
              appointmentTime: apt.appointment_time?.slice(0, 5),
            }),
          }).catch(() => {});
        }
      }
    }
  };

  const handleReject = async (id: string) => {
    const words = rejectReason.trim().split(/\s+/).filter(Boolean);
    if (words.length < 10) {
      setRejectError(`En az 10 kelime gerekli. Şu an: ${words.length} kelime.`);
      return;
    }
    const apt = appointments.find(a => a.id === id);
    await supabase.from('appointments').update({ status: 'İptal Edildi', cancel_reason: rejectReason.trim() }).eq('id', id);
    setRejectingId(null);
    setRejectReason("");
    setRejectError("");
    fetchInitialData();
    if (apt) {
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'appointment_rejected',
          appointmentId: apt.id,
          customerEmail: apt.profiles?.email,
          customerName: apt.profiles?.full_name || 'Müşteri',
          shopName: shop?.name || '',
          serviceName: apt.service_name,
          appointmentDate: apt.appointment_date,
          appointmentTime: apt.appointment_time?.slice(0, 5),
          reason: rejectReason.trim(),
        }),
      }).catch(() => {});
    }
  };

  const handleDetailApprove = async () => {
    if (!selectedApt) return;
    await updateAppointmentStatus(selectedApt.id, 'Onaylandı');
    setSelectedApt((prev: any) => prev ? { ...prev, status: 'Onaylandı' } : null);
  };

  const handleDetailRejectSubmit = async () => {
    if (!selectedApt) return;
    const words = detailRejectReason.trim().split(/\s+/).filter(Boolean);
    if (words.length < 10) {
      setDetailRejectError(`En az 10 kelime gerekli. Şu an: ${words.length} kelime.`);
      return;
    }
    const apt = selectedApt;
    await supabase.from('appointments').update({ status: 'İptal Edildi', cancel_reason: detailRejectReason.trim() }).eq('id', apt.id);
    setSelectedApt(null);
    setDetailRejectMode(false);
    setDetailRejectReason('');
    setDetailRejectError('');
    fetchInitialData();
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'appointment_rejected',
        appointmentId: apt.id,
        customerEmail: apt.profiles?.email,
        customerName: apt.profiles?.full_name || 'Müşteri',
        shopName: shop?.name || '',
        serviceName: apt.service_name,
        appointmentDate: apt.appointment_date,
        appointmentTime: apt.appointment_time?.slice(0, 5),
        reason: detailRejectReason.trim(),
      }),
    }).catch(() => {});
  };

  const handleDetailDelete = async () => {
    if (!selectedApt) return;
    if (!confirm('Bu randevuyu kalıcı olarak silmek istediğinize emin misiniz?')) return;
    await supabase.from('appointments').delete().eq('id', selectedApt.id);
    setSelectedApt(null);
    fetchInitialData();
  };

  const handleDetailNoShow = async () => {
    if (!selectedApt) return;
    await updateAppointmentStatus(selectedApt.id, 'Gelmedi');
    setSelectedApt((prev: any) => prev ? { ...prev, status: 'Gelmedi' } : null);
  };

  const handleDetailComplete = async () => {
    if (!selectedApt) return;
    await updateAppointmentStatus(selectedApt.id, 'Tamamlandı');
    setSelectedApt((prev: any) => prev ? { ...prev, status: 'Tamamlandı' } : null);
  };

  const handleSettingsSubmit = async (e: any) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('profiles').upsert({ id: user.id, email: user.email, role: 'business_owner', full_name: fd.get('name') as string });

    // Mevcut dükkanı bul — yoksa yeni oluştur, varsa üzerine yaz
    let shopId = shop?.id;
    if (!shopId) {
      const { data: existing } = await supabase.from('shops').select('id').eq('owner_id', user.id).limit(1).maybeSingle();
      shopId = existing?.id;
    }

    const { error } = await supabase.from('shops').upsert({
      id: shopId,
      owner_id: user.id,
      name: fd.get('name') as string,
      legal_name: fd.get('legal_name') as string,
      mersis_no: fd.get('mersis_no') as string,
      tax_office: fd.get('tax_office') as string,
      tax_no: fd.get('tax_no') as string,
      category: shop?.category || 'BERBER',
      shop_phone: fd.get('phone') as string,
      description: fd.get('bio') as string,
      iban: fd.get('iban') as string,
      city: fd.get('city') as string,
      district: fd.get('district') as string,
      neighborhood: fd.get('neighborhood') as string,
      street: fd.get('street') as string,
      building_no: fd.get('building_no') as string,
    });

    if (!error) { alert("Ayarlar kaydedildi!"); fetchInitialData(); setActiveTab("overview"); }
    else { alert("Hata: " + error.message); }
  };

  const handleDeleteShop = async () => {
    if (!shop?.id) return;
    setDeletingShop(true);
    try {
      await supabase.from('reviews').delete().eq('shop_id', shop.id);
      await supabase.from('appointments').delete().eq('shop_id', shop.id);
      await supabase.from('shop_hours').delete().eq('shop_id', shop.id);
      await supabase.from('staff').delete().eq('shop_id', shop.id);
      await supabase.from('services').delete().eq('shop_id', shop.id);
      await supabase.from('shops').delete().eq('id', shop.id);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from('profiles').update({ role: 'customer' }).eq('id', user.id);
      router.replace('/');
    } catch {
      alert("Silme işlemi başarısız oldu.");
      setDeletingShop(false);
    }
  };

  const handleSaveHours = async () => {
    if (!shop?.id) return;
    setSavingHours(true);
    const hoursToUpsert = shopHours.map(h => ({
      shop_id: shop.id,
      day_of_week: h.day_of_week,
      open_time: h.open_time,
      close_time: h.close_time,
      is_closed: h.is_closed,
      ...(h.id ? { id: h.id } : {}),
    }));
    const { error } = await supabase.from('shop_hours').upsert(hoursToUpsert, { onConflict: 'shop_id,day_of_week' });
    setSavingHours(false);
    if (error) { alert("Hata: " + error.message); }
    else { alert("Çalışma saatleri kaydedildi!"); fetchInitialData(); }
  };

  const updateHour = (index: number, field: string, value: any) => {
    setShopHours(prev => prev.map((h, i) => i === index ? { ...h, [field]: value } : h));
  };

  const handleStaffSubmit = async () => {
    if (!shop?.id || !staffForm.firstName.trim() || !staffForm.lastName.trim()) return;
    setSavingStaff(true);
    const { error } = await supabase.from('staff').insert([{
      shop_id: shop.id,
      first_name: staffForm.firstName.trim(),
      last_name: staffForm.lastName.trim(),
      avatar_url: staffForm.avatarUrl || null,
    }]);
    if (error) { alert("Hata: " + error.message); }
    else { setIsStaffModalOpen(false); fetchInitialData(); }
    setSavingStaff(false);
  };

  // Real metrics
  const confirmedAppointments = appointments.filter(a => a.status === 'Onaylandı');
  const totalRevenue = confirmedAppointments.reduce((sum, a) => sum + (parseFloat(a.price) || 0), 0);
  const uniqueCustomers = new Set(appointments.map(a => a.user_id)).size;
  const pendingCount = appointments.filter(a => a.status === 'Beklemede').length;
  const pendingAppointments = appointments.filter(a => a.status === 'Beklemede');
  const otherAppointments = appointments.filter(a => a.status !== 'Beklemede');

  // Finance computed values
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.slice(0, 7);
  const fPrevMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);
  const cancelledAll = appointments.filter((a: any) => a.status === 'İptal Edildi');
  const confirmedThisMonth = confirmedAppointments.filter((a: any) => a.appointment_date?.startsWith(currentMonth));
  const confirmedPrevMonth = confirmedAppointments.filter((a: any) => a.appointment_date?.startsWith(fPrevMonth));
  const cancelledThisMonth = cancelledAll.filter((a: any) => a.appointment_date?.startsWith(currentMonth));
  const todayRevenue = confirmedAppointments.filter((a: any) => a.appointment_date === today).reduce((s: number, a: any) => s + (parseFloat(a.price) || 0), 0);
  const monthlyRevenue = confirmedThisMonth.reduce((s: number, a: any) => s + (parseFloat(a.price) || 0), 0);
  const prevMonthRevenue = confirmedPrevMonth.reduce((s: number, a: any) => s + (parseFloat(a.price) || 0), 0);
  const monthlyApptCount = confirmedThisMonth.length;
  const avgBasket = monthlyApptCount > 0 ? monthlyRevenue / monthlyApptCount : 0;
  const cancellationLoss = cancelledThisMonth.reduce((s: number, a: any) => s + (parseFloat(a.price) || 0), 0);
  const finEstExpenses = monthlyRevenue * 0.30;
  const finNetProfit = monthlyRevenue - finEstExpenses;

  const dailyRevChart = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i));
    const dateStr = d.toISOString().split('T')[0];
    return { date: dateStr, label: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }), value: confirmedAppointments.filter((a: any) => a.appointment_date === dateStr).reduce((s: number, a: any) => s + (parseFloat(a.price) || 0), 0) };
  });

  const weeklyRevChart = Array.from({ length: 8 }, (_, i) => {
    const now = new Date();
    const monday = new Date(now); monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1) - 7 * (7 - i));
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    const startStr = monday.toISOString().split('T')[0], endStr = sunday.toISOString().split('T')[0];
    return { label: `H${i + 1}`, value: confirmedAppointments.filter((a: any) => a.appointment_date >= startStr && a.appointment_date <= endStr).reduce((s: number, a: any) => s + (parseFloat(a.price) || 0), 0) };
  });

  const monthlyRevChart = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    const mStr = d.toISOString().slice(0, 7);
    return { label: d.toLocaleDateString('tr-TR', { month: 'short' }), value: confirmedAppointments.filter((a: any) => a.appointment_date?.startsWith(mStr)).reduce((s: number, a: any) => s + (parseFloat(a.price) || 0), 0) };
  });

  const staffPerf = staff.map((s: any) => {
    const appts = confirmedAppointments.filter((a: any) => a.staff_id === s.id);
    const rev = appts.reduce((sum: number, a: any) => sum + (parseFloat(a.price) || 0), 0);
    return { ...s, revenue: rev, apptCount: appts.length, avgBasket: appts.length > 0 ? rev / appts.length : 0 };
  }).sort((a: any, b: any) => b.revenue - a.revenue);

  const servicePerf = services.map((s: any) => {
    const appts = confirmedAppointments.filter((a: any) => a.service_name === s.name);
    const totalRev = appts.reduce((sum: number, a: any) => sum + (parseFloat(a.price) || 0), 0);
    const svcNet = totalRev * 0.75;
    return { ...s, salesCount: appts.length, totalRevenue: totalRev, svcNet, margin: totalRev > 0 ? 75 : 0 };
  }).sort((a: any, b: any) => b.svcNet - a.svcNet);

  const heatmapData: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  appointments.forEach((a: any) => {
    if (!a.appointment_date || !a.appointment_time) return;
    const d = new Date(a.appointment_date + 'T12:00:00');
    const dayIdx = d.getDay(); const hour = parseInt(a.appointment_time.split(':')[0]);
    if (!isNaN(dayIdx) && !isNaN(hour) && hour >= 0 && hour < 24) heatmapData[dayIdx][hour]++;
  });
  const heatmapMax = Math.max(1, ...heatmapData.flat());
  const heatmapHours = Array.from({ length: 14 }, (_, i) => i + 8);

  const totalCancellations = cancelledAll.length;
  const cancellationRate = appointments.length > 0 ? (totalCancellations / appointments.length * 100) : 0;

  const custCounts: Record<string, number> = {};
  appointments.forEach((a: any) => { if (a.user_id) custCounts[a.user_id] = (custCounts[a.user_id] || 0) + 1; });
  const totalCust = Object.keys(custCounts).length;
  const returningCust = Object.values(custCounts).filter(c => c > 1).length;
  const newCust = totalCust - returningCust;
  const loyaltyRate = totalCust > 0 ? (returningCust / totalCust * 100) : 0;

  const fDayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const smartSuggestions: string[] = [];
  let lbDay = -1, lbHour = 9, lbVal = Infinity;
  for (let d = 1; d <= 5; d++) { for (let h = 9; h <= 17; h++) { if (heatmapData[d][h] < lbVal) { lbVal = heatmapData[d][h]; lbDay = d; lbHour = h; } } }
  if (appointments.length > 0 && lbDay > -1) smartSuggestions.push(`${fDayNames[lbDay]} ${lbHour}:00–${lbHour + 1}:00 arası düşük yoğunluk var. Bu saatler için kampanya önerilir.`);
  if (servicePerf.length > 0 && servicePerf[0].totalRevenue > 0) smartSuggestions.push(`"${servicePerf[0].name}" en yüksek kâr marjına sahip hizmet (%${servicePerf[0].margin.toFixed(0)}).`);
  if (cancellationRate > 10) smartSuggestions.push(`İptal oranı %${cancellationRate.toFixed(1)} — müşterilere hatırlatma mesajı gönderilmesi önerilir.`);
  if (staffPerf.length > 0 && staffPerf[0].revenue > 0) smartSuggestions.push(`En çok ciro getiren personel: ${staffPerf[0].first_name} ${staffPerf[0].last_name} (₺${staffPerf[0].revenue.toLocaleString('tr-TR')}).`);
  const satTotal = heatmapData[6].reduce((a: number, b: number) => a + b, 0);
  const allDayTotals = heatmapData.map((d: number[]) => d.reduce((a: number, b: number) => a + b, 0));
  if (satTotal > 0 && satTotal === Math.max(...allDayTotals)) smartSuggestions.push('Cumartesi günleri kapasite tamamen doluyor. Rezervasyon önceliği veya fiyat optimizasyonu uygulanabilir.');
  if (monthlyRevenue > prevMonthRevenue && prevMonthRevenue > 0) smartSuggestions.push(`Bu ay geçen aya göre %${((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue * 100).toFixed(1)} daha fazla ciro elde edildi.`);

  // Calendar view helpers
  const calHours = Array.from({ length: 14 }, (_, i) => i + 8); // 08–21
  const calHourH = 60; // px per hour
  const calDayNames = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const _calBase = new Date();
  const _calDay = _calBase.getDay();
  const calWeekStart = new Date(_calBase);
  calWeekStart.setDate(_calBase.getDate() - (_calDay === 0 ? 6 : _calDay - 1) + calendarWeekOffset * 7);
  calWeekStart.setHours(0, 0, 0, 0);
  const calWeekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(calWeekStart);
    d.setDate(calWeekStart.getDate() + i);
    return d;
  });
  const calStatusCls: Record<string, string> = {
    'Beklemede': 'bg-yellow-400 border-yellow-500 text-yellow-900',
    'Onaylandı': 'bg-emerald-500 border-emerald-600 text-white',
    'İptal Edildi': 'bg-red-500 border-red-600 text-white',
    'Tamamlandı': 'bg-blue-500 border-blue-600 text-white',
    'Gelmedi': 'bg-gray-400 border-gray-500 text-white',
  };

  const calCurrentDay = (() => {
    const d = new Date();
    d.setDate(d.getDate() + calDayOffset);
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const calCurrentDayStr = calCurrentDay.toISOString().split('T')[0];
  const calCurrentDayApts = appointments.filter((a: any) => a.appointment_date === calCurrentDayStr);
  const isCurrentDayToday = calCurrentDayStr === today;
  const _now = new Date();
  const currentTimeTop = isCurrentDayToday ? (_now.getHours() + _now.getMinutes() / 60 - 8) * calHourH : -1;
  const dayViewColumns = [
    { id: '__unassigned', label: 'Atanmamış' },
    ...staff.map((s: any) => ({ id: s.id, label: `${s.first_name} ${s.last_name}` })),
  ];
  const getColApts = (colId: string) =>
    colId === '__unassigned'
      ? calCurrentDayApts.filter((a: any) => !a.staff_id)
      : calCurrentDayApts.filter((a: any) => a.staff_id === colId);

  if (loading) return <div className="h-screen bg-black flex items-center justify-center font-black text-[#00A3AD] animate-pulse uppercase tracking-[0.5em]">RANDEZY.PRO YÜKLENİYOR...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-black">
      {/* SIDEBAR */}
      <aside className="w-72 bg-black fixed h-full flex flex-col p-8 z-50 shadow-2xl">
        <div className="mb-12"><h2 className="text-2xl font-black text-white tracking-tighter italic">RANDEZY<span className="text-[#00A3AD]">.PRO</span></h2><div className="h-[2px] w-8 bg-[#00A3AD] mt-1"></div></div>
        <nav className="flex-1 space-y-2">
          {[
            { id: "overview", label: "Dashboard", icon: <LayoutDashboard size={18}/> },
            { id: "branding", label: "Görsel Kimlik", icon: <Camera size={18}/> },
            { id: "appointments", label: "Randevular", icon: <Calendar size={18}/> },
            { id: "reviews", label: "Yorumlar", icon: <MessageSquare size={18}/> },
            { id: "services", label: "Hizmet Yönetimi", icon: <Package size={18}/> },
            { id: "hours", label: "Çalışma Saatleri", icon: <Clock size={18}/> },
            { id: "staff", label: "Personel", icon: <Users size={18}/> },
            { id: "finance", label: "Finans", icon: <TrendingUp size={18}/> },
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${activeTab === item.id ? "bg-[#00A3AD] text-white shadow-lg shadow-[#00A3AD]/20" : "text-gray-500 hover:text-white hover:bg-white/5"}`}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        <div className="pt-6 border-t border-white/10">
          <button onClick={() => setActiveTab("settings")} className={`w-full flex items-center gap-4 px-6 py-4 font-black text-[11px] uppercase tracking-widest transition-all ${activeTab === 'settings' ? 'text-[#00A3AD]' : 'text-gray-500 hover:text-white'}`}>
            <Settings size={18}/> Ayarlar
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-72 p-12 overflow-y-auto">
        <header className="flex justify-between items-center mb-16">
          <div className="relative w-96 opacity-50 pointer-events-none"><input type="text" placeholder="Arama yakında..." className="w-full pl-14 pr-6 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm outline-none font-bold text-xs" /></div>
          <div className="flex items-center gap-6 bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm">
            <div className="text-right">
              <p className="text-xs font-black uppercase text-black">{shop?.name || "Kurulum Bekliyor"}</p>
              <p className="text-[9px] font-bold text-[#00A3AD] uppercase tracking-widest">Premium İşletme</p>
            </div>
            <div className="w-10 h-10 bg-black rounded-xl overflow-hidden shadow-xl border-2 border-white">
               {shop?.profiles?.avatar_url ? <img src={shop.profiles.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[#00A3AD] font-black">{shop?.name?.charAt(0) || "P"}</div>}
            </div>
          </div>
        </header>

        {!shop && activeTab !== "settings" ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 bg-[#E6F6F7] rounded-full flex items-center justify-center mb-8"><AlertCircle size={40} className="text-[#00A3AD]" /></div>
            <h2 className="text-3xl font-black uppercase tracking-tighter mb-4 italic text-black">Dükkan Verisi Bulunamadı</h2>
            <button onClick={() => setActiveTab("settings")} className="bg-black text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-[#00A3AD] transition-all">Dükkanı Kur</button>
          </div>
        ) : (
          <>
            {/* 1. OVERVIEW */}
            {activeTab === "overview" && (
              <div className="animate-in fade-in duration-500 grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                  <TrendingUp className="text-[#00A3AD] mb-4" size={24}/>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Toplam Kazanç</p>
                  <h3 className="text-4xl font-black text-black">₺{totalRevenue.toLocaleString('tr-TR')}</h3>
                  <p className="text-[9px] text-gray-300 mt-1 uppercase font-bold tracking-wider">Onaylanan randevulardan</p>
                </div>
                <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                  <Users className="text-[#00A3AD] mb-4" size={24}/>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Benzersiz Müşteri</p>
                  <h3 className="text-4xl font-black text-black">{uniqueCustomers}</h3>
                </div>
                <div className="bg-black text-white p-10 rounded-[3rem] shadow-2xl">
                  <Calendar className="text-[#00A3AD] mb-4" size={24}/>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bekleyen Randevu</p>
                  <h3 className="text-4xl font-black">{pendingCount}</h3>
                </div>
              </div>
            )}

            {/* 2. GÖRSEL KİMLİK */}
            {activeTab === "branding" && (
              <div className="animate-in slide-in-from-right-4 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm text-center">
                  <h4 className="text-[11px] font-black uppercase tracking-widest mb-6">Tabela & Dış Cephe</h4>
                  <div className="aspect-video bg-gray-50 rounded-3xl overflow-hidden mb-6 relative">{shop?.image_url ? <img src={shop.image_url} className="w-full h-full object-cover" /> : <ImageIcon className="absolute inset-0 m-auto text-gray-200" size={40} />}</div>
                  <label className="w-full flex items-center justify-center gap-3 py-5 bg-black text-white rounded-3xl font-black text-[10px] uppercase cursor-pointer hover:bg-[#00A3AD] transition-all"><UploadCloud size={16}/> Fotoğraf Yükle
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      const url = await handleFileUpload(file, 'shop-covers');
                      if(url && shop?.id) { await supabase.from('shops').update({ image_url: url }).eq('id', shop.id); fetchInitialData(); }
                    }} />
                  </label>
                </div>
                <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm text-center">
                  <h4 className="text-[11px] font-black uppercase tracking-widest mb-6">İç Mekan Galerisi</h4>
                  <div className="grid grid-cols-2 gap-2 mb-6 h-32 overflow-hidden">
                    {(shop?.gallery_urls || []).slice(0, 4).map((url: string, i: number) => <img key={i} src={url} className="h-full w-full object-cover rounded-xl" />)}
                  </div>
                  <label className="w-full flex items-center justify-center gap-3 py-5 bg-black text-white rounded-3xl font-black text-[10px] uppercase cursor-pointer hover:bg-[#00A3AD] transition-all"><Plus size={16}/> Ekle
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      const url = await handleFileUpload(file, 'gallery');
                      if(url && shop?.id) { const g = [...(shop.gallery_urls || []), url]; await supabase.from('shops').update({ gallery_urls: g }).eq('id', shop.id); fetchInitialData(); }
                    }} />
                  </label>
                </div>
              </div>
            )}

            {/* 3. RANDEVULAR */}
            {activeTab === "appointments" && (
              <div className="animate-in slide-in-from-right-4">
                {/* Header + View Toggle */}
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-black uppercase tracking-tighter italic">Randevu Trafiği</h2>
                  <div className="flex items-center bg-white border border-gray-100 rounded-2xl p-1 shadow-sm gap-1">
                    <button
                      onClick={() => setAppointmentView('calendar')}
                      className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${appointmentView === 'calendar' ? 'bg-black text-white shadow' : 'text-gray-400 hover:text-black'}`}
                    >
                      <Calendar size={13}/> Takvim
                    </button>
                    <button
                      onClick={() => setAppointmentView('list')}
                      className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${appointmentView === 'list' ? 'bg-black text-white shadow' : 'text-gray-400 hover:text-black'}`}
                    >
                      <LayoutDashboard size={13}/> Liste
                    </button>
                  </div>
                </div>

                {/* ── LİSTE GÖRÜNÜMÜ ── */}
                {appointmentView === 'list' && (
                  <>
                    {appointments.length === 0 && (
                      <div className="py-20 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-100 text-gray-300 font-black uppercase text-xs tracking-widest italic">Henüz randevu talebi yok</div>
                    )}
                    {pendingAppointments.length > 0 && (
                      <div className="mb-10">
                        <div className="flex items-center gap-3 mb-5">
                          <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Bekleyen Talepler</span>
                          <span className="min-w-[20px] h-5 px-1.5 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center text-[10px] font-black">{pendingAppointments.length}</span>
                        </div>
                        <div className="space-y-4">
                          {pendingAppointments.map((apt) => (
                            <div key={apt.id} className="bg-white rounded-[2.5rem] border border-orange-100 overflow-hidden group hover:border-orange-300 transition-all">
                              <div className="p-8 flex items-center justify-between">
                                <div className="flex items-center gap-8">
                                  <div className="bg-black text-[#00A3AD] px-6 py-4 rounded-2xl font-black text-center flex-shrink-0">
                                    <p className="text-[9px] uppercase opacity-50">{apt.appointment_date}</p>
                                    <p className="text-lg">{apt.appointment_time?.slice(0,5) ?? "--:--"}</p>
                                  </div>
                                  <div>
                                    <h4 className="text-xl font-black uppercase">{apt.profiles?.full_name || apt.profiles?.email || "Misafir"}</h4>
                                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">
                                      {apt.service_name}
                                      {apt.staff && <span className="text-[#00A3AD]"> • {apt.staff.first_name} {apt.staff.last_name}</span>}
                                      {(apt.profiles?.phone || apt.profiles?.email) && ` • ${apt.profiles?.phone || apt.profiles?.email}`}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 flex-shrink-0">
                                  <span className="px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest bg-yellow-50 text-yellow-600">{apt.status}</span>
                                  <div className="flex gap-2">
                                    <button onClick={() => updateAppointmentStatus(apt.id, 'Onaylandı')} className="p-3 bg-black text-white rounded-xl hover:bg-green-600 transition-all" title="Onayla"><CheckCircle2 size={18}/></button>
                                    <button onClick={() => { setRejectingId(rejectingId === apt.id ? null : apt.id); setRejectReason(""); setRejectError(""); }} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all" title="Reddet"><X size={18}/></button>
                                  </div>
                                </div>
                              </div>
                              {rejectingId === apt.id && (
                                <div className="border-t border-red-100 bg-red-50 p-6 animate-in slide-in-from-top-2">
                                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3">Red Gerekçesi — En az 10 kelime yazın</p>
                                  <textarea rows={3} placeholder="Müşteriye iletilecek red açıklamasını yazın..." className="w-full bg-white rounded-2xl p-4 text-sm font-bold text-black outline-none border-2 border-transparent focus:border-red-400 resize-none mb-2" value={rejectReason} onChange={e => { setRejectReason(e.target.value); setRejectError(""); }} />
                                  {rejectError && <p className="text-[11px] font-bold text-red-500 mb-2">{rejectError}</p>}
                                  <div className="flex gap-3">
                                    <button onClick={() => handleReject(apt.id)} className="bg-red-500 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all">Reddet ve Gönder</button>
                                    <button onClick={() => { setRejectingId(null); setRejectReason(""); setRejectError(""); }} className="bg-white text-gray-400 px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:text-black transition-all">Vazgeç</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {otherAppointments.length > 0 && (
                      <div>
                        {pendingAppointments.length > 0 && (
                          <div className="flex items-center gap-4 mb-6">
                            <div className="flex-1 h-px bg-gray-100"></div>
                            <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest px-2">Onaylı & Geçmiş</span>
                            <div className="flex-1 h-px bg-gray-100"></div>
                          </div>
                        )}
                        <div className="space-y-4">
                          {otherAppointments.map((apt) => (
                            <div key={apt.id} className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden group hover:border-[#00A3AD] transition-all">
                              <div className="p-8 flex items-center justify-between">
                                <div className="flex items-center gap-8">
                                  <div className="bg-black text-[#00A3AD] px-6 py-4 rounded-2xl font-black text-center flex-shrink-0">
                                    <p className="text-[9px] uppercase opacity-50">{apt.appointment_date}</p>
                                    <p className="text-lg">{apt.appointment_time?.slice(0,5) ?? "--:--"}</p>
                                  </div>
                                  <div>
                                    <h4 className="text-xl font-black uppercase">{apt.profiles?.full_name || apt.profiles?.email || "Misafir"}</h4>
                                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">
                                      {apt.service_name}
                                      {apt.staff && <span className="text-[#00A3AD]"> • {apt.staff.first_name} {apt.staff.last_name}</span>}
                                      {(apt.profiles?.phone || apt.profiles?.email) && ` • ${apt.profiles?.phone || apt.profiles?.email}`}
                                    </p>
                                    {apt.cancel_reason && <p className="text-[10px] font-bold text-red-400 mt-1 italic">Red gerekçesi: {apt.cancel_reason}</p>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 flex-shrink-0">
                                  <span className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest ${apt.status === 'Onaylandı' ? 'bg-green-50 text-green-600' : apt.status === 'İptal Edildi' ? 'bg-red-50 text-red-500' : 'bg-yellow-50 text-yellow-600'}`}>{apt.status}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── TAKVİM GÖRÜNÜMÜ ── */}
                {appointmentView === 'calendar' && (
                  <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => { setCalDayOffset(0); setCalendarWeekOffset(0); }}
                          className="px-5 py-2.5 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#00A3AD] transition-all"
                        >Bugün</button>
                        <button
                          onClick={() => calViewMode === 'day' ? setCalDayOffset(o => o - 1) : setCalendarWeekOffset(o => o - 1)}
                          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-all text-gray-500 font-black text-xl select-none"
                        >‹</button>
                        <button
                          onClick={() => calViewMode === 'day' ? setCalDayOffset(o => o + 1) : setCalendarWeekOffset(o => o + 1)}
                          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-all text-gray-500 font-black text-xl select-none"
                        >›</button>
                        <p className="text-[11px] font-black text-black uppercase tracking-widest">
                          {calViewMode === 'day'
                            ? calCurrentDay.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                            : `${calWeekDays[0].toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} — ${calWeekDays[6].toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}`
                          }
                        </p>
                      </div>
                      <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-1 gap-1">
                        <button
                          onClick={() => setCalViewMode('day')}
                          className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${calViewMode === 'day' ? 'bg-black text-white shadow' : 'text-gray-400 hover:text-black'}`}
                        >Günlük</button>
                        <button
                          onClick={() => setCalViewMode('week')}
                          className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${calViewMode === 'week' ? 'bg-black text-white shadow' : 'text-gray-400 hover:text-black'}`}
                        >Haftalık</button>
                      </div>
                    </div>

                    {/* Renk açıklamaları */}
                    <div className="flex items-center gap-5 px-8 py-3 border-b border-gray-100 bg-gray-50/60 flex-wrap">
                      {[
                        { label: 'Beklemede', cls: 'bg-yellow-400' },
                        { label: 'Onaylandı', cls: 'bg-emerald-500' },
                        { label: 'İptal Edildi', cls: 'bg-red-500' },
                        { label: 'Tamamlandı', cls: 'bg-blue-500' },
                        { label: 'Gelmedi', cls: 'bg-gray-400' },
                      ].map(s => (
                        <div key={s.label} className="flex items-center gap-1.5">
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.cls}`} />
                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{s.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Calendar body */}
                    <div style={{ overflowY: 'auto', maxHeight: '660px' }}>
                      {calViewMode === 'day' ? (
                        /* ── GÜNLÜK GÖRÜNÜM ── */
                        <div style={{ overflowX: 'auto' }}>
                          <div style={{ minWidth: `${52 + dayViewColumns.length * 160}px` }}>
                            {/* Personel sütun başlıkları */}
                            <div className="flex sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
                              <div style={{ width: '52px', flexShrink: 0 }} />
                              {dayViewColumns.map((col) => (
                                <div key={col.id} style={{ width: '160px', flexShrink: 0 }} className="text-center py-3 border-l border-gray-100">
                                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest truncate px-2">{col.label}</p>
                                </div>
                              ))}
                            </div>
                            {/* Saat grid + kartlar */}
                            <div className="flex relative">
                              <div style={{ width: '52px', flexShrink: 0 }}>
                                {calHours.map(h => (
                                  <div key={h} style={{ height: `${calHourH}px` }} className="border-b border-gray-50 flex items-start justify-end pr-2 pt-1.5">
                                    <span className="text-[8px] font-black text-gray-300">{h}:00</span>
                                  </div>
                                ))}
                              </div>
                              {dayViewColumns.map((col) => {
                                const colApts = getColApts(col.id);
                                return (
                                  <div
                                    key={col.id}
                                    style={{ width: '160px', flexShrink: 0, height: `${calHours.length * calHourH}px` }}
                                    className="border-l border-gray-100 relative"
                                  >
                                    {calHours.map(h => (
                                      <div key={h} className="absolute w-full border-b border-gray-100" style={{ top: `${(h - 8) * calHourH}px` }} />
                                    ))}
                                    {calHours.map(h => (
                                      <div key={`hh${h}`} className="absolute w-full border-b border-gray-50" style={{ top: `${(h - 8) * calHourH + calHourH / 2}px` }} />
                                    ))}
                                    {colApts.map((apt: any) => {
                                      const parts = (apt.appointment_time || '08:00').split(':');
                                      const aH = Math.max(8, Math.min(20, parseInt(parts[0]) || 8));
                                      const aM = parseInt(parts[1]) || 0;
                                      const top = (aH - 8) * calHourH + (aM / 60) * calHourH;
                                      const dur = services.find((s: any) => s.name === apt.service_name)?.duration || 60;
                                      const height = Math.max(32, (dur / 60) * calHourH);
                                      const cls = calStatusCls[apt.status] || 'bg-gray-300 border-gray-400 text-gray-800';
                                      return (
                                        <div
                                          key={apt.id}
                                          className={`absolute left-1 right-1 rounded-lg border-l-4 px-1.5 py-1 overflow-hidden cursor-pointer hover:shadow-xl hover:z-10 hover:scale-[1.02] transition-all duration-150 ${cls}`}
                                          style={{ top: `${top}px`, height: `${height}px` }}
                                          onClick={() => { setSelectedApt(apt); setDetailRejectMode(false); setDetailRejectReason(''); setDetailRejectError(''); }}
                                        >
                                          <p className="text-[9px] font-black truncate leading-tight">{apt.profiles?.full_name || 'Misafir'}</p>
                                          <p className="text-[8px] opacity-80 truncate">{apt.appointment_time?.slice(0, 5)} · {apt.service_name}</p>
                                          {height >= 52 && <p className="text-[8px] opacity-60 truncate">₺{apt.price}</p>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                              {/* Şimdiki zaman göstergesi */}
                              {currentTimeTop >= 0 && currentTimeTop <= calHours.length * calHourH && (
                                <div
                                  className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                                  style={{ top: `${currentTimeTop}px` }}
                                >
                                  <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0 -translate-x-1.5" style={{ marginLeft: '52px' }} />
                                  <div className="flex-1 h-[2px] bg-red-500 opacity-80" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* ── HAFTALIK GÖRÜNÜM ── */
                        <div style={{ minWidth: '700px' }}>
                          <div className="flex sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
                            <div style={{ width: '52px', flexShrink: 0 }} />
                            {calWeekDays.map((day, i) => {
                              const ds = day.toISOString().split('T')[0];
                              const isToday = ds === today;
                              const cnt = appointments.filter((a: any) => a.appointment_date === ds).length;
                              return (
                                <div
                                  key={i}
                                  className={`flex-1 text-center py-3 border-l border-gray-100 cursor-pointer hover:bg-gray-50 transition-all ${isToday ? 'bg-[#00A3AD]/5' : ''}`}
                                  onClick={() => { setCalViewMode('day'); const offset = Math.round((day.getTime() - new Date(new Date().setHours(0,0,0,0)).getTime()) / 86400000); setCalDayOffset(offset); }}
                                >
                                  <p className={`text-[8px] font-black uppercase tracking-widest ${isToday ? 'text-[#00A3AD]' : 'text-gray-400'}`}>{calDayNames[i]}</p>
                                  <div className={`text-base font-black mx-auto w-8 h-8 flex items-center justify-center rounded-full ${isToday ? 'bg-[#00A3AD] text-white' : 'text-black'}`}>{day.getDate()}</div>
                                  {cnt > 0 && <p className="text-[7px] font-black text-[#00A3AD] uppercase mt-0.5">{cnt} randevu</p>}
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex">
                            <div style={{ width: '52px', flexShrink: 0 }}>
                              {calHours.map(h => (
                                <div key={h} style={{ height: `${calHourH}px` }} className="border-b border-gray-50 flex items-start justify-end pr-2 pt-1.5">
                                  <span className="text-[8px] font-black text-gray-300">{h}:00</span>
                                </div>
                              ))}
                            </div>
                            {calWeekDays.map((day, di) => {
                              const ds = day.toISOString().split('T')[0];
                              const isToday = ds === today;
                              const dayApts = appointments.filter((a: any) => a.appointment_date === ds);
                              return (
                                <div
                                  key={di}
                                  className={`flex-1 border-l border-gray-100 relative ${isToday ? 'bg-[#00A3AD]/[0.02]' : ''}`}
                                  style={{ height: `${calHours.length * calHourH}px` }}
                                >
                                  {calHours.map(h => (
                                    <div key={h} className="absolute w-full border-b border-gray-100" style={{ top: `${(h - 8) * calHourH}px` }} />
                                  ))}
                                  {calHours.map(h => (
                                    <div key={`hh${h}`} className="absolute w-full border-b border-gray-50" style={{ top: `${(h - 8) * calHourH + calHourH / 2}px` }} />
                                  ))}
                                  {dayApts.map((apt: any) => {
                                    const parts = (apt.appointment_time || '08:00').split(':');
                                    const aH = Math.max(8, Math.min(20, parseInt(parts[0]) || 8));
                                    const aM = parseInt(parts[1]) || 0;
                                    const top = (aH - 8) * calHourH + (aM / 60) * calHourH;
                                    const dur = services.find((s: any) => s.name === apt.service_name)?.duration || 60;
                                    const height = Math.max(32, (dur / 60) * calHourH);
                                    const cls = calStatusCls[apt.status] || 'bg-gray-300 border-gray-400 text-gray-800';
                                    return (
                                      <div
                                        key={apt.id}
                                        className={`absolute left-0.5 right-0.5 rounded-lg border-l-4 px-1.5 py-1 overflow-hidden cursor-pointer hover:shadow-xl hover:z-10 hover:scale-[1.02] transition-all duration-150 ${cls}`}
                                        style={{ top: `${top}px`, height: `${height}px` }}
                                        onClick={() => { setSelectedApt(apt); setDetailRejectMode(false); setDetailRejectReason(''); setDetailRejectError(''); }}
                                      >
                                        <p className="text-[9px] font-black truncate leading-tight">{apt.profiles?.full_name || 'Misafir'}</p>
                                        <p className="text-[8px] opacity-80 truncate">{apt.appointment_time?.slice(0, 5)} · {apt.service_name}</p>
                                        {apt.staff && height >= 52 && (
                                          <p className="text-[8px] opacity-70 truncate">{apt.staff.first_name} {apt.staff.last_name}</p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Alt özet çubuğu */}
                    <div className="border-t border-gray-100 px-8 py-4 bg-gray-50/60 flex items-center gap-6 flex-wrap">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Günlük Özet</p>
                      {[
                        { label: 'Toplam', value: calCurrentDayApts.length, cls: 'text-black' },
                        { label: 'Beklemede', value: calCurrentDayApts.filter((a: any) => a.status === 'Beklemede').length, cls: 'text-yellow-500' },
                        { label: 'Onaylı', value: calCurrentDayApts.filter((a: any) => a.status === 'Onaylandı').length, cls: 'text-emerald-600' },
                        { label: 'İptal', value: calCurrentDayApts.filter((a: any) => a.status === 'İptal Edildi').length, cls: 'text-red-500' },
                      ].map((s) => (
                        <div key={s.label} className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{s.label}:</span>
                          <span className={`text-sm font-black ${s.cls}`}>{s.value}</span>
                        </div>
                      ))}
                      {(() => {
                        const decided = calCurrentDayApts.filter((a: any) => a.status === 'Onaylandı' || a.status === 'İptal Edildi').length;
                        const approved = calCurrentDayApts.filter((a: any) => a.status === 'Onaylandı').length;
                        if (decided === 0) return null;
                        return (
                          <div className="flex items-center gap-1.5 ml-auto">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Onay Oranı:</span>
                            <span className="text-sm font-black text-[#00A3AD]">%{Math.round(approved / decided * 100)}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3.5 YORUMLAR */}
            {activeTab === "reviews" && (
              <div className="animate-in slide-in-from-right-4">
                <h2 className="text-3xl font-black uppercase tracking-tighter mb-8 italic">Müşteri Yorumları</h2>
                {reviews.length === 0 ? (
                  <div className="py-20 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-100 text-gray-300 font-black uppercase text-xs tracking-widest italic">Henüz yorum yapılmamış</div>
                ) : (
                  <div className="space-y-4">
                    {/* Ortalama */}
                    <div className="bg-black text-white p-8 rounded-[2.5rem] flex items-center gap-8 mb-6">
                      <div className="text-center">
                        <p className="text-5xl font-black text-[#00A3AD]">{(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)}</p>
                        <p className="text-[9px] uppercase tracking-widest text-gray-400 mt-1">Ortalama Puan</p>
                      </div>
                      <div>
                        <div className="flex gap-1 mb-2">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={20} className={s <= Math.round(reviews.reduce((a, r) => a + r.rating, 0) / reviews.length) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'} />
                          ))}
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{reviews.length} değerlendirme</p>
                      </div>
                    </div>

                    {reviews.map((r) => (
                      <div key={r.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-black text-base uppercase tracking-tight">{r.profiles?.full_name || "Anonim"}</p>
                          <div className="flex items-center gap-3">
                            <div className="flex gap-1">
                              {[1,2,3,4,5].map(s => (
                                <Star key={s} size={14} className={s <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'} />
                              ))}
                            </div>
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{new Date(r.created_at).toLocaleDateString('tr-TR')}</span>
                          </div>
                        </div>
                        {r.comment && <p className="text-gray-500 text-sm font-medium">{r.comment}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 4. HİZMET YÖNETİMİ */}
            {activeTab === "services" && (
              <div className="animate-in slide-in-from-right-4">
                <div className="flex justify-between items-center mb-12">
                  <h2 className="text-4xl font-black uppercase tracking-tighter italic">Servis & Portfolyo</h2>
                  <button onClick={() => { setEditingService(null); setServiceForm({ name: "", price: "", duration: "", image_url: "" }); setIsServiceModalOpen(true); }} className="bg-black text-white px-10 py-5 rounded-2xl font-black text-xs uppercase hover:bg-[#00A3AD] transition-all shadow-xl flex items-center gap-2"><Plus size={18} /> Yeni Ekle</button>
                </div>
                {services.length === 0 ? (
                  <div className="py-20 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-100 text-gray-300 font-black uppercase text-xs tracking-widest italic">Henüz hizmet eklemediniz</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {services.map((s) => (
                      <div key={s.id} className="bg-white rounded-[3.5rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500">
                        <div className="h-48 bg-gray-50">{s.image_url && <img src={s.image_url} className="w-full h-full object-cover" />}</div>
                        <div className="p-8">
                          <h4 className="font-black uppercase text-xl mb-2">{s.name}</h4>
                          <p className="text-[10px] font-black text-[#00A3AD] mb-8">₺{s.price} • {s.duration} DK</p>
                          <div className="flex gap-2">
                            <button onClick={() => { setEditingService(s); setServiceForm({ name: s.name, price: s.price.toString(), duration: s.duration.toString(), image_url: s.image_url }); setIsServiceModalOpen(true); }} className="flex-1 py-3 bg-gray-50 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1"><Edit3 size={14}/> Düzenle</button>
                            <button onClick={async () => { if(confirm("Silinsin mi?")) { await supabase.from('services').delete().eq('id', s.id); fetchInitialData(); } }} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={18}/></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 5. ÇALIŞMA SAATLERİ */}
            {activeTab === "hours" && (
              <div className="animate-in slide-in-from-right-4 max-w-2xl">
                <h2 className="text-4xl font-black uppercase tracking-tighter italic mb-12">Çalışma Saatleri</h2>
                <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm space-y-4">
                  {shopHours.map((h, i) => (
                    <div key={i} className={`flex items-center justify-between p-6 rounded-[2rem] transition-all ${h.is_closed ? 'bg-gray-50 opacity-60' : 'border-2 border-gray-50'}`}>
                      <div className="flex items-center gap-4">
                        <button onClick={() => updateHour(i, 'is_closed', !h.is_closed)} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${h.is_closed ? 'bg-gray-200 border-gray-200' : 'bg-[#00A3AD] border-[#00A3AD]'}`}>
                          {!h.is_closed && <CheckCircle2 size={14} className="text-white" />}
                        </button>
                        <span className="font-black uppercase text-[10px] tracking-widest w-24">{h.day_name}</span>
                      </div>
                      {!h.is_closed ? (
                        <div className="flex items-center gap-2">
                          <input type="time" className="bg-gray-100 p-2 rounded-lg text-xs font-bold text-black border-none focus:ring-1 ring-[#00A3AD]" value={h.open_time} onChange={(e) => updateHour(i, 'open_time', e.target.value)} />
                          <span className="text-gray-300 font-bold">–</span>
                          <input type="time" className="bg-gray-100 p-2 rounded-lg text-xs font-bold text-black border-none focus:ring-1 ring-[#00A3AD]" value={h.close_time} onChange={(e) => updateHour(i, 'close_time', e.target.value)} />
                        </div>
                      ) : (
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest italic">TATİL / KAPALI</span>
                      )}
                    </div>
                  ))}
                  <button onClick={handleSaveHours} disabled={savingHours} className="w-full bg-black text-white py-6 rounded-[2rem] font-black uppercase tracking-widest text-xs mt-4 hover:bg-[#00A3AD] transition-all flex items-center justify-center gap-3">
                    <Save size={18}/> {savingHours ? "Kaydediliyor..." : "Saatleri Kaydet"}
                  </button>
                </div>
              </div>
            )}

            {/* 6. PERSONEL */}
            {activeTab === "staff" && (
              <div className="animate-in slide-in-from-right-4">
                <div className="flex justify-between items-center mb-12">
                  <h2 className="text-4xl font-black uppercase tracking-tighter italic">Personel</h2>
                  {staff.length < 10 && (
                    <button onClick={() => { setStaffForm({ firstName: "", lastName: "", avatarUrl: "" }); setIsStaffModalOpen(true); }} className="bg-black text-white px-10 py-5 rounded-2xl font-black text-xs uppercase hover:bg-[#00A3AD] transition-all shadow-xl flex items-center gap-2"><Plus size={18} /> Personel Ekle</button>
                  )}
                </div>
                {staff.length === 0 ? (
                  <div className="py-20 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-100 text-gray-300 font-black uppercase text-xs tracking-widest italic">Henüz personel eklemediniz</div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    {staff.map((s) => (
                      <div key={s.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col items-center gap-4 hover:shadow-xl transition-all">
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-[#E6F6F7] border-4 border-white shadow-lg flex items-center justify-center">
                          {s.avatar_url ? <img src={s.avatar_url} className="w-full h-full object-cover" /> : <span className="text-2xl font-black text-[#00A3AD]">{s.first_name?.charAt(0)}</span>}
                        </div>
                        <div className="text-center">
                          <p className="font-black text-sm uppercase tracking-tight">{s.first_name}</p>
                          <p className="font-bold text-xs uppercase tracking-wider text-gray-400">{s.last_name}</p>
                        </div>
                        <button onClick={async () => { if(confirm("Personel silinsin mi?")) { await supabase.from('staff').delete().eq('id', s.id); fetchInitialData(); } }} className="p-2 text-red-400 hover:text-red-600 transition-colors"><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 7. FİNANS */}
            {activeTab === "finance" && (
              <div className="animate-in slide-in-from-right-4 space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-4xl font-black uppercase tracking-tighter italic">Finans Paneli</h2>
                  <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest bg-white px-5 py-2.5 rounded-2xl border border-gray-100">
                    {new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                  </span>
                </div>

                {/* ÖZET KARTLAR */}
                <div className="grid grid-cols-3 gap-5">
                  <div className="bg-black text-white p-8 rounded-[2.5rem] shadow-2xl">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Bugünkü Ciro</p>
                    <h3 className="text-3xl font-black text-[#00A3AD]">₺{todayRevenue.toLocaleString('tr-TR')}</h3>
                    <p className="text-[9px] text-gray-600 mt-2 font-bold uppercase tracking-widest">Bugün onaylanan randevular</p>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Aylık Ciro</p>
                      {prevMonthRevenue > 0 && (
                        <span className={`flex items-center gap-0.5 text-[9px] font-black px-2 py-0.5 rounded-full ${monthlyRevenue >= prevMonthRevenue ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                          {monthlyRevenue >= prevMonthRevenue ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                          %{Math.abs((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue * 100).toFixed(1)}
                        </span>
                      )}
                    </div>
                    <h3 className="text-3xl font-black text-black">₺{monthlyRevenue.toLocaleString('tr-TR')}</h3>
                    <p className="text-[9px] text-gray-300 mt-2 font-bold uppercase tracking-widest">{monthlyApptCount} randevudan</p>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Est. Net Kar</p>
                    <h3 className="text-3xl font-black text-[#00A3AD]">₺{finNetProfit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</h3>
                    <p className="text-[9px] text-gray-300 mt-2 font-bold uppercase tracking-widest">%30 gider tahminiyle</p>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Aylık Randevu</p>
                    <h3 className="text-3xl font-black text-black">{monthlyApptCount}</h3>
                    <p className="text-[9px] text-gray-300 mt-2 font-bold uppercase tracking-widest">Bu ay onaylanan</p>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Ort. Sepet Tutarı</p>
                    <h3 className="text-3xl font-black text-black">₺{avgBasket.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</h3>
                    <p className="text-[9px] text-gray-300 mt-2 font-bold uppercase tracking-widest">Randevu başına ortalama</p>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-red-50 shadow-sm hover:shadow-xl transition-all">
                    <p className="text-[10px] font-black text-red-300 uppercase tracking-widest mb-3">İptal Kaybı</p>
                    <h3 className="text-3xl font-black text-red-400">₺{cancellationLoss.toLocaleString('tr-TR')}</h3>
                    <p className="text-[9px] text-red-200 mt-2 font-bold uppercase tracking-widest">{cancelledThisMonth.length} iptalden kaybedilen</p>
                  </div>
                </div>

                {/* CİRO GRAFİĞİ */}
                <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-[11px] font-black uppercase tracking-widest">Ciro Trendi</h3>
                    <div className="flex gap-2">
                      {(['daily', 'weekly', 'monthly'] as const).map(v => (
                        <button key={v} onClick={() => setFinanceChartView(v)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${financeChartView === v ? 'bg-black text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                          {v === 'daily' ? 'Günlük' : v === 'weekly' ? 'Haftalık' : 'Aylık'}
                        </button>
                      ))}
                    </div>
                  </div>
                  {(() => {
                    const chartData = financeChartView === 'daily' ? dailyRevChart : financeChartView === 'weekly' ? weeklyRevChart : monthlyRevChart;
                    const maxVal = Math.max(1, ...chartData.map((d: any) => d.value));
                    return (
                      <div className="flex items-end gap-1.5 h-44 pt-8">
                        {chartData.map((d: any, i: number) => {
                          const pct = (d.value / maxVal) * 100;
                          const isToday = financeChartView === 'daily' && d.date === today;
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                              <div className="relative flex-1 w-full flex items-end">
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-[8px] font-black text-[#00A3AD] bg-[#00A3AD]/10 px-2 py-0.5 rounded-lg pointer-events-none">
                                  ₺{d.value.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                                </div>
                                <div
                                  className={`w-full rounded-t-xl transition-all duration-700 ${isToday ? 'bg-[#00A3AD]' : d.value > 0 ? 'bg-[#00A3AD]/40 group-hover:bg-[#00A3AD]/70' : 'bg-gray-100'}`}
                                  style={{ height: `${Math.max(3, pct)}%` }}
                                />
                              </div>
                              <div className="text-[7px] font-bold text-gray-400 uppercase truncate w-full text-center">{d.label}</div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* KAR & GİDER */}
                <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                  <h3 className="text-[11px] font-black uppercase tracking-widest mb-8">Kar & Gider Analizi — Bu Ay</h3>
                  <div className="space-y-5">
                    {[
                      { label: 'Toplam Gelir', value: monthlyRevenue, pct: 100, color: 'bg-[#00A3AD]' },
                      { label: 'Tahmini Gider (%30)', value: finEstExpenses, pct: 30, color: 'bg-gray-300' },
                      { label: 'Net Kar', value: finNetProfit, pct: 70, color: 'bg-black' },
                    ].map((item, i) => (
                      <div key={i}>
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{item.label}</p>
                          <p className="text-sm font-black text-black">₺{item.value.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</p>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color} rounded-full transition-all duration-700`} style={{ width: `${item.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* PERSONEL + HİZMET */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                    <h3 className="text-[11px] font-black uppercase tracking-widest mb-6">Personel Performansı</h3>
                    {staffPerf.length === 0 ? (
                      <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest italic py-10 text-center">Personel verisi yok</p>
                    ) : (
                      <div className="space-y-4">
                        {staffPerf.map((s: any, i: number) => {
                          const maxRev = staffPerf[0].revenue || 1;
                          return (
                            <div key={s.id} className={`p-4 rounded-2xl ${i === 0 && s.revenue > 0 ? 'bg-[#00A3AD]/5 border border-[#00A3AD]/20' : 'bg-gray-50'}`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-[#E6F6F7] flex items-center justify-center text-[10px] font-black text-[#00A3AD] flex-shrink-0 overflow-hidden">
                                    {s.avatar_url ? <img src={s.avatar_url} className="w-full h-full object-cover" alt="" /> : s.first_name?.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="text-xs font-black uppercase">{s.first_name} {s.last_name}</p>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase">{s.apptCount} randevu • Ort. ₺{s.avgBasket.toFixed(0)}</p>
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-sm font-black">₺{s.revenue.toLocaleString('tr-TR')}</p>
                                  {i === 0 && s.revenue > 0 && <p className="text-[8px] font-black text-[#00A3AD] uppercase">En Yüksek</p>}
                                </div>
                              </div>
                              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-[#00A3AD] rounded-full" style={{ width: `${Math.max(2, (s.revenue / maxRev) * 100)}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                    <h3 className="text-[11px] font-black uppercase tracking-widest mb-6">Hizmet Kârlılığı</h3>
                    {servicePerf.length === 0 ? (
                      <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest italic py-10 text-center">Hizmet verisi yok</p>
                    ) : (
                      <div className="space-y-4">
                        {servicePerf.slice(0, 5).map((s: any, i: number) => {
                          const maxRev = servicePerf[0].totalRevenue || 1;
                          return (
                            <div key={s.id} className={`p-4 rounded-2xl ${i === 0 && s.totalRevenue > 0 ? 'bg-[#00A3AD]/5 border border-[#00A3AD]/20' : 'bg-gray-50'}`}>
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p className="text-xs font-black uppercase">{s.name}</p>
                                  <p className="text-[9px] font-bold text-gray-400 uppercase">{s.salesCount} satış • Marj %{s.margin.toFixed(0)}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-sm font-black">₺{s.totalRevenue.toLocaleString('tr-TR')}</p>
                                  {i === 0 && s.totalRevenue > 0 && <p className="text-[8px] font-black text-[#00A3AD] uppercase">En Kârlı</p>}
                                </div>
                              </div>
                              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-[#00A3AD] rounded-full" style={{ width: `${Math.max(2, (s.totalRevenue / maxRev) * 100)}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* SAAT BAZLI YOĞUNLUK */}
                <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                  <h3 className="text-[11px] font-black uppercase tracking-widest mb-8">Saat Bazlı Yoğunluk Analizi</h3>
                  <div className="overflow-x-auto">
                    <div className="min-w-[500px]">
                      <div className="flex gap-1 mb-2 ml-10">
                        {heatmapHours.map(h => (
                          <div key={h} className="flex-1 text-center text-[7px] font-black text-gray-300">{h}</div>
                        ))}
                      </div>
                      {['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'].map((day, di) => (
                        <div key={di} className="flex gap-1 mb-1 items-center">
                          <div className="w-10 text-[8px] font-black text-gray-400 uppercase flex-shrink-0">{day}</div>
                          {heatmapHours.map(h => {
                            const val = heatmapData[di][h];
                            const intensity = val / heatmapMax;
                            return (
                              <div
                                key={h}
                                className="flex-1 h-7 rounded-md cursor-default transition-all"
                                style={{ backgroundColor: val === 0 ? '#F9FAFB' : `rgba(0,163,173,${0.12 + intensity * 0.88})` }}
                                title={`${day} ${h}:00 — ${val} randevu`}
                              />
                            );
                          })}
                        </div>
                      ))}
                      <div className="flex items-center gap-2 mt-5 justify-end">
                        <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Boş</span>
                        {[0.12, 0.34, 0.56, 0.78, 1.0].map((o, i) => (
                          <div key={i} className="w-5 h-4 rounded" style={{ backgroundColor: `rgba(0,163,173,${o})` }} />
                        ))}
                        <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Dolu</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* İPTAL + MÜŞTERİ + ÖNERİLER */}
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-white p-10 rounded-[3rem] border border-red-50 shadow-sm">
                    <h3 className="text-[10px] font-black uppercase tracking-widest mb-6 text-red-400">İptal Analizi</h3>
                    <div className="space-y-6">
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Toplam İptal</p>
                        <p className="text-3xl font-black text-black">{totalCancellations}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Kaybedilen Gelir</p>
                        <p className="text-2xl font-black text-red-400">₺{cancellationLoss.toLocaleString('tr-TR')}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">İptal Oranı</p>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-red-400 rounded-full transition-all duration-700" style={{ width: `${Math.min(100, cancellationRate)}%` }} />
                          </div>
                          <span className="text-xs font-black text-red-400 flex-shrink-0">%{cancellationRate.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                    <h3 className="text-[10px] font-black uppercase tracking-widest mb-6">Müşteri Analizi</h3>
                    <div className="space-y-6">
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Yeni Müşteri</p>
                        <p className="text-3xl font-black text-black">{newCust}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Tekrar Gelen</p>
                        <p className="text-3xl font-black text-[#00A3AD]">{returningCust}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Sadakat Oranı</p>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#00A3AD] rounded-full transition-all duration-700" style={{ width: `${Math.min(100, loyaltyRate)}%` }} />
                          </div>
                          <span className="text-xs font-black text-[#00A3AD] flex-shrink-0">%{loyaltyRate.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-black p-10 rounded-[3rem] shadow-2xl">
                    <div className="flex items-center gap-3 mb-6">
                      <Lightbulb size={16} className="text-[#00A3AD]" />
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Akıllı Öneriler</h3>
                    </div>
                    {smartSuggestions.length === 0 ? (
                      <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest italic">Yeterli veri bekleniyor...</p>
                    ) : (
                      <div className="space-y-4">
                        {smartSuggestions.map((tip: string, i: number) => (
                          <div key={i} className="flex gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#00A3AD] flex-shrink-0 mt-1.5" />
                            <p className="text-[10px] font-bold text-gray-400 leading-relaxed">{tip}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* RAPORLAR */}
                <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                  <h3 className="text-[11px] font-black uppercase tracking-widest mb-6">Raporlar</h3>
                  <div className="flex flex-wrap gap-4">
                    <button onClick={() => alert('PDF raporu yakında aktif olacak.')} className="flex items-center gap-3 px-8 py-4 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#00A3AD] transition-all shadow-xl">
                      <Download size={16} /> PDF İndir
                    </button>
                    <button onClick={() => alert('Excel raporu yakında aktif olacak.')} className="flex items-center gap-3 px-8 py-4 bg-gray-50 text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-200">
                      <Download size={16} /> Excel İndir
                    </button>
                    <button onClick={() => alert('Muhasebeci paylaşımı yakında aktif olacak.')} className="flex items-center gap-3 px-8 py-4 bg-gray-50 text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-200">
                      <Mail size={16} /> Muhasebeciye Gönder
                    </button>
                  </div>
                  <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest mt-5">Rapor indirme özelliği yakında aktif olacak.</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* AYARLAR */}
        {activeTab === "settings" && (
          <div className="animate-in slide-in-from-bottom-4 max-w-5xl">
            <div className="bg-white rounded-[4rem] p-16 shadow-2xl border border-gray-100">
              <h2 className="text-4xl font-black uppercase tracking-tighter mb-10 italic underline decoration-[#00A3AD] decoration-8 underline-offset-8">Kurumsal Mühür</h2>
              <form className="space-y-10" onSubmit={handleSettingsSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-2"><label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tabela Adı</label><input name="name" defaultValue={shop?.name} required className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" /></div>
                  <div className="space-y-2"><label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Resmi Ünvan</label><input name="legal_name" defaultValue={shop?.legal_name} required className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2"><label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">MERSİS NO</label><input name="mersis_no" defaultValue={shop?.mersis_no} className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" /></div>
                  <div className="space-y-2"><label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Vergi Dairesi</label><input name="tax_office" defaultValue={shop?.tax_office} className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" /></div>
                  <div className="space-y-2"><label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Vergi No</label><input name="tax_no" defaultValue={shop?.tax_no} className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-2"><label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">İletişim Hattı</label><input name="phone" defaultValue={shop?.shop_phone} required className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" /></div>
                  <div className="space-y-2"><label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">IBAN</label><input name="iban" defaultValue={shop?.iban} className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" /></div>
                </div>
                {/* ADRES */}
                <div className="border-t border-gray-100 pt-10">
                  <p className="text-[10px] font-black text-[#00A3AD] uppercase tracking-widest mb-6">Adres Bilgileri</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 relative">
                      <label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">İl</label>
                      <select name="city" defaultValue={shop?.city || ""} className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black appearance-none">
                        <option value="">İl Seçiniz</option>
                        {cities.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown className="absolute right-6 bottom-6 text-gray-400 pointer-events-none" size={18} />
                    </div>
                    <div className="space-y-2"><label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">İlçe</label><input name="district" defaultValue={shop?.district} className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" /></div>
                    <div className="space-y-2"><label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Mahalle</label><input name="neighborhood" defaultValue={shop?.neighborhood} className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" /></div>
                    <div className="space-y-2"><label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sokak / Cadde</label><input name="street" defaultValue={shop?.street} className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" /></div>
                    <div className="space-y-2"><label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Bina No</label><input name="building_no" defaultValue={shop?.building_no} className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" /></div>
                  </div>
                </div>
                <button type="submit" className="w-full bg-black text-white py-8 rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-xs shadow-2xl hover:bg-[#00A3AD] transition-all flex items-center justify-center gap-4"><Save size={20} /> Kaydet ve Mühürle</button>
              </form>

              {/* Tehlikeli Bölge */}
              <div className="mt-16 border-t-2 border-dashed border-red-100 pt-12">
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">Tehlikeli Bölge</p>
                <p className="text-xs text-gray-400 font-medium mb-6">Bu işlem geri alınamaz. İşletmeye ait tüm veriler (randevular, personel, hizmetler, yorumlar) kalıcı olarak silinir.</p>
                <button
                  onClick={() => { setDeleteConfirmText(""); setShowDeleteModal(true); }}
                  className="flex items-center gap-3 px-8 py-4 bg-red-50 text-red-500 border-2 border-red-100 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                >
                  <Trash2 size={16} /> İşletmeyi Kalıcı Olarak Sil
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SİLME ONAY MODALI */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
            <div className="bg-white w-full max-w-md rounded-[3.5rem] p-12 text-black animate-in zoom-in duration-300">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-8">
                <Trash2 size={28} className="text-red-500" />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tighter mb-3">Emin misin?</h3>
              <p className="text-sm text-gray-500 font-medium mb-8">
                Bu işlem <span className="font-black text-black">geri alınamaz</span>. Onaylamak için aşağıya işletme adını yaz:
                <span className="block mt-2 font-black text-[#00A3AD]">"{shop?.name}"</span>
              </p>
              <input
                type="text"
                placeholder="İşletme adını yaz..."
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-5 text-sm font-bold text-black outline-none focus:border-red-400 mb-6"
              />
              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-5 rounded-2xl font-black text-xs uppercase tracking-widest border-2 border-gray-100 text-gray-400 hover:bg-gray-50 transition-all"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleDeleteShop}
                  disabled={deleteConfirmText !== shop?.name || deletingShop}
                  className="flex-1 py-5 rounded-2xl font-black text-xs uppercase tracking-widest bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-30"
                >
                  {deletingShop ? "Siliniyor..." : "Kalıcı Sil"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* PERSONEL MODALI */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <div className="bg-white w-full max-w-md rounded-[4rem] p-12 relative animate-in zoom-in duration-300 text-black">
            <button onClick={() => setIsStaffModalOpen(false)} className="absolute top-10 right-10 text-gray-300 hover:text-black transition-colors"><X size={32}/></button>
            <h3 className="text-3xl font-black uppercase tracking-tighter mb-10">Personel Ekle</h3>
            <div className="flex flex-col items-center gap-6">
              <label className="relative cursor-pointer group">
                <div className="w-28 h-28 rounded-full overflow-hidden bg-[#E6F6F7] border-4 border-white shadow-xl flex items-center justify-center">
                  {staffForm.avatarUrl ? <img src={staffForm.avatarUrl} className="w-full h-full object-cover" /> : <span className="text-4xl font-black text-[#00A3AD]">{staffForm.firstName?.charAt(0) || "?"}</span>}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all rounded-full">
                  <UploadCloud size={24} className="text-white" />
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0]; if(!file) return;
                  const url = await handleFileUpload(file, 'staff-avatars');
                  if(url) setStaffForm(f => ({...f, avatarUrl: url}));
                }} />
              </label>
              <input placeholder="İsim" className="w-full p-6 bg-gray-50 rounded-3xl font-black text-sm outline-none border-2 border-transparent focus:border-[#00A3AD] text-black" value={staffForm.firstName} onChange={e => setStaffForm(f => ({...f, firstName: e.target.value}))} />
              <input placeholder="Soyisim" className="w-full p-6 bg-gray-50 rounded-3xl font-black text-sm outline-none border-2 border-transparent focus:border-[#00A3AD] text-black" value={staffForm.lastName} onChange={e => setStaffForm(f => ({...f, lastName: e.target.value}))} />
              <button onClick={handleStaffSubmit} disabled={savingStaff || !staffForm.firstName.trim() || !staffForm.lastName.trim()} className="w-full bg-[#00A3AD] text-white py-6 rounded-3xl font-black uppercase text-xs shadow-xl tracking-widest hover:bg-black transition-all disabled:opacity-30">
                {savingStaff ? "EKLENİYOR..." : "EKLE"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SERVİS MODALI */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <div className="bg-white w-full max-w-lg rounded-[4rem] p-12 relative animate-in zoom-in duration-300 text-black">
            <button onClick={() => setIsServiceModalOpen(false)} className="absolute top-10 right-10 text-gray-300 hover:text-black transition-colors"><X size={32}/></button>
            <h3 className="text-3xl font-black uppercase tracking-tighter mb-10">{editingService ? "Hizmeti Düzenle" : "Hizmet Ekle"}</h3>
            <form onSubmit={handleServiceSubmit} className="space-y-6">
              <div className="mb-4">
                {serviceForm.image_url ? <img src={serviceForm.image_url} className="h-40 w-full object-cover rounded-3xl" /> : (
                  <label className="flex flex-col items-center justify-center h-40 bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl cursor-pointer hover:border-[#00A3AD] transition-all"><UploadCloud className="text-gray-300 mb-2" size={32} /><span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Fotoğraf Yükle</span><input type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if(!file) return; const url = await handleFileUpload(file, 'service-portfolios'); if(url) setServiceForm({...serviceForm, image_url: url}); }} /></label>
                )}
              </div>
              <input required placeholder="Hizmet Adı" className="w-full p-6 bg-gray-50 rounded-3xl font-black text-sm outline-none border-2 border-transparent focus:border-[#00A3AD] text-black" value={serviceForm.name} onChange={e => setServiceForm({...serviceForm, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-6">
                <input required type="number" placeholder="Fiyat (₺)" className="w-full p-6 bg-gray-50 rounded-3xl font-black text-sm outline-none border-2 border-transparent focus:border-[#00A3AD] text-black" value={serviceForm.price} onChange={e => setServiceForm({...serviceForm, price: e.target.value})} />
                <input required type="number" placeholder="Süre (DK)" className="w-full p-6 bg-gray-50 rounded-3xl font-black text-sm outline-none border-2 border-transparent focus:border-[#00A3AD] text-black" value={serviceForm.duration} onChange={e => setServiceForm({...serviceForm, duration: e.target.value})} />
              </div>
              <button className="w-full bg-[#00A3AD] text-white py-6 rounded-3xl font-black uppercase text-xs shadow-xl tracking-widest hover:bg-black transition-all">YAYINLA</button>
            </form>
          </div>
        </div>
      )}

      {/* RANDEVU DETAY PANELİ */}
      {selectedApt && (
        <>
          <div
            className="fixed inset-0 z-[150] bg-black/30 backdrop-blur-sm"
            onClick={() => { setSelectedApt(null); setDetailRejectMode(false); setDetailRejectReason(''); setDetailRejectError(''); }}
          />
          <div className="fixed top-0 right-0 bottom-0 z-[160] w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-black uppercase tracking-tighter">Randevu Detayı</h3>
              <button
                onClick={() => { setSelectedApt(null); setDetailRejectMode(false); setDetailRejectReason(''); setDetailRejectError(''); }}
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-all text-gray-400 hover:text-black"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 p-8 space-y-5">
              {/* Durum + tarih */}
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-black uppercase px-4 py-1.5 rounded-full border ${calStatusCls[selectedApt.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                  {selectedApt.status}
                </span>
                <span className="text-[9px] font-bold text-gray-400 uppercase">{selectedApt.appointment_date} · {selectedApt.appointment_time?.slice(0, 5)}</span>
              </div>

              {/* Müşteri */}
              <div className="bg-gray-50 rounded-[2rem] p-6">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Müşteri</p>
                <h4 className="text-xl font-black uppercase text-black mb-3">{selectedApt.profiles?.full_name || 'Misafir'}</h4>
                {selectedApt.profiles?.phone && (
                  <div className="flex gap-2">
                    <a
                      href={`tel:${selectedApt.profiles.phone}`}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#00A3AD] transition-all"
                    >📞 Ara</a>
                    <a
                      href={`https://wa.me/${selectedApt.profiles.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-green-600 transition-all"
                    >💬 WhatsApp</a>
                  </div>
                )}
                {selectedApt.profiles?.email && (
                  <p className="text-[10px] font-bold text-gray-400 mt-3">{selectedApt.profiles.email}</p>
                )}
              </div>

              {/* Randevu bilgileri */}
              <div className="bg-gray-50 rounded-[2rem] p-6 space-y-3">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Randevu</p>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-gray-400 uppercase">Hizmet</span>
                  <span className="text-sm font-black text-black">{selectedApt.service_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-gray-400 uppercase">Fiyat</span>
                  <span className="text-sm font-black text-[#00A3AD]">₺{selectedApt.price}</span>
                </div>
                {selectedApt.staff && (
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase">Personel</span>
                    <span className="text-sm font-black text-black">{selectedApt.staff.first_name} {selectedApt.staff.last_name}</span>
                  </div>
                )}
              </div>

              {/* Red gerekçesi */}
              {selectedApt.cancel_reason && (
                <div className="bg-red-50 border border-red-100 rounded-[2rem] p-6">
                  <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-2">Red Gerekçesi</p>
                  <p className="text-sm text-red-500 font-medium">{selectedApt.cancel_reason}</p>
                </div>
              )}

              {/* Aksiyon butonları */}
              {!detailRejectMode && (
                <div className="space-y-3 pt-2">
                  {selectedApt.status === 'Beklemede' && (
                    <button onClick={handleDetailApprove} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all">
                      ✓ Onayla
                    </button>
                  )}
                  {selectedApt.status === 'Onaylandı' && (
                    <button onClick={handleDetailComplete} className="w-full py-4 bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all">
                      ✓ Tamamlandı
                    </button>
                  )}
                  {(selectedApt.status === 'Beklemede' || selectedApt.status === 'Onaylandı') && (
                    <>
                      <button onClick={() => setDetailRejectMode(true)} className="w-full py-4 bg-red-50 text-red-500 border border-red-100 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">
                        ✕ Reddet
                      </button>
                      <button onClick={handleDetailNoShow} className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all">
                        ⚠ Gelmedi (No-Show)
                      </button>
                    </>
                  )}
                  <button onClick={handleDetailDelete} className="w-full py-4 bg-gray-50 text-gray-400 border border-gray-100 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all">
                    🗑 Randevuyu Sil
                  </button>
                </div>
              )}

              {/* Red formu */}
              {detailRejectMode && (
                <div className="bg-red-50 rounded-[2rem] p-6 space-y-4 animate-in slide-in-from-top-2">
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Red Gerekçesi — En az 10 kelime</p>
                  <textarea
                    rows={4}
                    placeholder="Müşteriye iletilecek red açıklamasını yazın..."
                    className="w-full bg-white rounded-2xl p-4 text-sm font-bold text-black outline-none border-2 border-transparent focus:border-red-400 resize-none"
                    value={detailRejectReason}
                    onChange={e => { setDetailRejectReason(e.target.value); setDetailRejectError(''); }}
                  />
                  {detailRejectError && <p className="text-[11px] font-bold text-red-500">{detailRejectError}</p>}
                  <div className="flex gap-3">
                    <button onClick={handleDetailRejectSubmit} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all">Gönder</button>
                    <button onClick={() => { setDetailRejectMode(false); setDetailRejectReason(''); setDetailRejectError(''); }} className="flex-1 py-3 bg-white text-gray-400 border border-gray-100 rounded-xl font-black text-[10px] uppercase tracking-widest hover:text-black transition-all">Vazgeç</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
