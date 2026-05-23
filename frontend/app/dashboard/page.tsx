"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import {
  TrendingUp, Users, Calendar, Settings, Plus, Edit3,
  Package, LayoutDashboard, Camera, Image as ImageIcon, UploadCloud,
  Clock, Trash2, Save, X, CheckCircle2, AlertCircle, ChevronDown, ChevronLeft, ChevronRight,
  Star, MessageSquare, Phone, Search,
  ArrowUpRight, ArrowDownRight, Download, Lightbulb, Mail, Tag, Percent
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
  const [staffForm, setStaffForm] = useState({ firstName: "", lastName: "", avatarUrl: "", role: "", specialty: "" });
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [savingStaff, setSavingStaff] = useState(false);
  const [financeChartView, setFinanceChartView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [appointmentView, setAppointmentView] = useState<'list' | 'calendar'>('calendar');
  const [calendarWeekOffset, setCalendarWeekOffset] = useState(0);
  const [calViewMode, setCalViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [calDayOffset, setCalDayOffset] = useState(0);
  const [listFilter, setListFilter] = useState('all');
  const [listSearch, setListSearch] = useState('');
  const [selectedApt, setSelectedApt] = useState<any>(null);
  const [detailRejectMode, setDetailRejectMode] = useState(false);
  const [detailRejectReason, setDetailRejectReason] = useState('');
  const [detailRejectError, setDetailRejectError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingShop, setDeletingShop] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [campaignForm, setCampaignForm] = useState({ title: "", type: "percentage", discount_value: "", start_date: "", end_date: "", service_ids: [] as number[], is_active: true });

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

      const campaignsRes = await supabase.from('campaigns').select('*').eq('shop_id', shopData.id).order('created_at', { ascending: false });
      setCampaigns(campaignsRes.data || []);

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
      email: fd.get('email') as string,
      instagram: fd.get('instagram') as string,
      description: fd.get('bio') as string,
      iban: fd.get('iban') as string,
      city: fd.get('city') as string,
      district: fd.get('district') as string,
      neighborhood: fd.get('neighborhood') as string,
      street: fd.get('street') as string,
      building_no: fd.get('building_no') as string,
      postal_code: fd.get('postal_code') as string,
      maps_link: fd.get('maps_link') as string,
      free_cancel_hours: parseInt(fd.get('free_cancel_hours') as string) || 24,
      cancellation_policy: fd.get('cancellation_policy') as string,
      no_show_policy: fd.get('no_show_policy') as string,
      deposit_info: fd.get('deposit_info') as string,
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

  const handleCampaignSubmit = async () => {
    if (!shop?.id || !campaignForm.title || !campaignForm.start_date || !campaignForm.end_date) return;
    setSavingCampaign(true);
    const payload = {
      shop_id: shop.id,
      title: campaignForm.title,
      type: campaignForm.type,
      discount_value: campaignForm.discount_value ? parseFloat(campaignForm.discount_value) : null,
      start_date: campaignForm.start_date,
      end_date: campaignForm.end_date,
      service_ids: campaignForm.service_ids,
      is_active: campaignForm.is_active,
    };
    const { error } = editingCampaign
      ? await supabase.from('campaigns').update(payload).eq('id', editingCampaign.id)
      : await supabase.from('campaigns').insert([payload]);
    if (!error) {
      setIsCampaignModalOpen(false);
      setEditingCampaign(null);
      setCampaignForm({ title: "", type: "percentage", discount_value: "", start_date: "", end_date: "", service_ids: [], is_active: true });
      const res = await supabase.from('campaigns').select('*').eq('shop_id', shop.id).order('created_at', { ascending: false });
      setCampaigns(res.data || []);
    }
    setSavingCampaign(false);
  };

  const handleDeleteCampaign = async (id: number) => {
    if (!confirm("Bu kampanya silinsin mi?")) return;
    await supabase.from('campaigns').delete().eq('id', id);
    setCampaigns(prev => prev.filter(c => c.id !== id));
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
    const payload: any = {
      shop_id: shop.id,
      first_name: staffForm.firstName.trim(),
      last_name: staffForm.lastName.trim(),
      avatar_url: staffForm.avatarUrl || null,
      role: staffForm.role.trim() || null,
      specialty: staffForm.specialty.trim() || null,
    };
    const { error } = editingStaff
      ? await supabase.from('staff').update(payload).eq('id', editingStaff.id)
      : await supabase.from('staff').insert([payload]);
    if (error) { alert("Hata: " + error.message); }
    else {
      setIsStaffModalOpen(false);
      setEditingStaff(null);
      setStaffForm({ firstName: "", lastName: "", avatarUrl: "", role: "", specialty: "" });
      fetchInitialData();
    }
    setSavingStaff(false);
  };

  const openStaffEdit = (s: any) => {
    setEditingStaff(s);
    setStaffForm({ firstName: s.first_name || "", lastName: s.last_name || "", avatarUrl: s.avatar_url || "", role: s.role || "", specialty: s.specialty || "" });
    setIsStaffModalOpen(true);
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

  // Profile completion system
  const profileSteps = [
    { label: 'Kapak fotoğrafı ekle', desc: 'Müşteriler işletmeni ilk bunu görür', done: !!shop?.image_url, weight: 20, tab: 'branding', icon: '📸' },
    { label: 'İlk hizmetini oluştur', desc: 'Randevu alabilmek için en az 1 hizmet gerekli', done: services.length > 0, weight: 20, tab: 'services', icon: '✂️' },
    { label: 'Çalışma saatlerini ayarla', desc: 'Müşteriler müsait zamanını görsün', done: shopHours.some(h => !h.is_closed), weight: 20, tab: 'hours', icon: '🕐' },
    { label: 'Kapak fotoğrafı yükle', desc: 'Profesyonel görünüm için zorunlu', done: !!shop?.image_url, weight: 0, tab: 'branding', icon: '🖼️' },
    { label: 'Kendini / çalışanını ekle', desc: 'Müşteriler çalışan seçerek rezervasyon yapsın', done: staff.length > 0, weight: 10, tab: 'staff', icon: '👤' },
    { label: 'İşletme açıklaması ekle', desc: 'Güven oluşturur, daha fazla tıklanma sağlar', done: !!shop?.description, weight: 10, tab: 'settings', icon: '📝' },
    { label: 'Galeri fotoğrafı yükle', desc: 'Yaptığın işleri sergile', done: (shop?.gallery_urls?.length || 0) > 0, weight: 10, tab: 'branding', icon: '🎨' },
    { label: 'Instagram hesabını bağla', desc: 'Sosyal kanıt ve takipçi dönüşümü', done: !!shop?.instagram, weight: 10, tab: 'settings', icon: '📱' },
  ].filter((s, i, arr) => !(i === 3)); // kapak fotoğrafı zaten üstte var, tekrarlananı kaldır

  const profilePct = Math.min(100, profileSteps.reduce((sum, s) => sum + (s.done ? s.weight : 0), 0));
  const canPublish = !!(shop?.image_url && services.length > 0 && shopHours.some(h => !h.is_closed));
  const isPublished = !!shop?.is_active;

  const handlePublish = async () => {
    if (!shop?.id || !canPublish) return;
    await supabase.from('shops').update({ is_active: true }).eq('id', shop.id);
    fetchInitialData();
  };

  // Calendar view helpers
  const calHours = Array.from({ length: 14 }, (_, i) => i + 8); // 08–21
  const calHourH = 64; // px per hour
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
    { id: '__unassigned', label: 'Tüm Personel', avatar: null as string | null, role: '' },
    ...staff.map((s: any) => ({ id: s.id, label: `${s.first_name} ${s.last_name}`, avatar: (s.avatar_url as string | null) || null, role: (s.role as string) || '' })),
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
            { id: "campaigns", label: "Kampanyalar", icon: <Tag size={18}/> },
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
              <div className="animate-in fade-in duration-500 space-y-8 mb-8">

                {/* ── Profil Tamamlama Kartı (sadece yayınlanmamışsa göster) ── */}
                {!isPublished && (
                  <div className="bg-black rounded-[2.5rem] p-8 md:p-10 overflow-hidden relative">
                    {/* bg glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, #00A3AD, transparent)', transform: 'translate(40%, -40%)' }} />

                    <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
                      {/* Ring */}
                      <div className="flex-shrink-0 relative" style={{ width: 120, height: 120 }}>
                        <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                          <circle
                            cx="60" cy="60" r="52" fill="none"
                            stroke={profilePct === 100 ? '#22c55e' : '#00A3AD'}
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeDasharray="327"
                            strokeDashoffset={327 - (327 * profilePct / 100)}
                            style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease' }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-black text-white leading-none">{profilePct}%</span>
                          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Tamamlandı</span>
                        </div>
                      </div>

                      {/* Text + Checklist */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#00A3AD] mb-1">Profil Durumu</p>
                        <h3 className="text-xl font-black uppercase tracking-tight text-white mb-1">
                          {profilePct === 100 ? 'Yayına Hazır! 🎉' : profilePct >= 60 ? 'Çok Yaklaştın!' : 'Profilini Tamamla'}
                        </h3>
                        <p className="text-[11px] text-gray-500 font-medium mb-5">
                          {canPublish
                            ? 'Minimum gereksinimler karşılandı. İstersen şimdi yayına alabilirsin.'
                            : `Yayına çıkmak için ${profileSteps.filter(s => !s.done && s.weight >= 20).length} kritik adım kaldı.`}
                        </p>

                        {/* Checklist */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
                          {profileSteps.map((step, i) => (
                            <button
                              key={i}
                              onClick={() => setActiveTab(step.tab)}
                              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-left group ${step.done ? 'opacity-60 cursor-default' : 'hover:bg-white/5 cursor-pointer'}`}
                            >
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${step.done ? 'bg-[#00A3AD]' : 'border-2 border-gray-700 group-hover:border-[#00A3AD]'}`}>
                                {step.done && (
                                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className={`text-[11px] font-black uppercase tracking-wider leading-tight ${step.done ? 'text-gray-600 line-through' : 'text-white'}`}>{step.label}</p>
                                {!step.done && <p className="text-[10px] text-gray-600 font-medium mt-0.5 truncate">{step.desc}</p>}
                              </div>
                              {!step.done && (
                                <svg className="flex-shrink-0 ml-auto text-gray-700 group-hover:text-[#00A3AD] transition-colors" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
                              )}
                            </button>
                          ))}
                        </div>

                        {/* Publish button */}
                        <button
                          disabled={!canPublish}
                          onClick={handlePublish}
                          className={`inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${
                            canPublish
                              ? 'bg-[#00A3AD] text-white hover:bg-white hover:text-black shadow-lg shadow-[#00A3AD]/30'
                              : 'bg-white/5 text-gray-600 cursor-not-allowed'
                          }`}
                        >
                          {canPublish ? '🚀 İşletmeni Yayına Al' : `Yayına almak için ${3 - [shop?.image_url, services.length > 0, shopHours.some(h => !h.is_closed)].filter(Boolean).length} adım kaldı`}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Yayınlanmış badge */}
                {isPublished && (
                  <div className="flex items-center gap-4 bg-green-50 border border-green-100 rounded-2xl px-6 py-4">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 size={16} className="text-white" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-green-700">İşletme Yayında</p>
                      <p className="text-[10px] font-bold text-green-600 mt-0.5">Müşteriler profilini Randezy'de bulabilir ve randevu alabilir.</p>
                    </div>
                    <button
                      onClick={() => router.push(`/shop/${shop?.id}`)}
                      className="ml-auto flex-shrink-0 text-[10px] font-black uppercase tracking-widest text-green-600 hover:text-green-800 flex items-center gap-1"
                    >
                      Profilimi Gör →
                    </button>
                  </div>
                )}

                {/* Metrik kartlar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              </div>
            )}

            {/* 2. GÖRSEL KİMLİK */}
            {activeTab === "branding" && (
              <div className="animate-in slide-in-from-right-4 space-y-8">

                {/* Kapak fotoğrafı yoksa uyarı */}
                {!shop?.image_url && (
                  <div className="flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4">
                    <AlertCircle size={18} className="text-amber-500 flex-shrink-0" />
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-amber-700">Kapak Fotoğrafı Eksik</p>
                      <p className="text-[10px] font-bold text-amber-600 mt-0.5">Müşteri sayfanızın daha profesyonel görünmesi için bir kapak fotoğrafı yüklemeniz önerilir.</p>
                    </div>
                  </div>
                )}

                {/* Onboarding rehber banner */}
                <div className="bg-black rounded-[2.5rem] p-8 md:p-10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#00A3AD] mb-2">Rehber</p>
                  <h3 className="text-xl font-black uppercase tracking-tighter text-white italic mb-2">İşletmenizi en iyi şekilde gösterin</h3>
                  <p className="text-xs font-bold text-gray-400 mb-7">Kaliteli ve profesyonel fotoğraflar müşteri güvenini artırır, daha fazla rezervasyon almanıza yardımcı olur.</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { icon: <Camera size={13}/>, text: "Net ve yüksek çözünürlüklü fotoğraflar kullanın" },
                      { icon: <Lightbulb size={13}/>, text: "Gün ışığı veya güçlü aydınlatma tercih edin" },
                      { icon: <CheckCircle2 size={13}/>, text: "İşletmenizi temiz ve düzenli gösterin" },
                    ].map((g, i) => (
                      <div key={i} className="flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-2xl px-4 py-3.5 transition-all">
                        <div className="text-[#00A3AD] flex-shrink-0">{g.icon}</div>
                        <p className="text-[11px] font-bold text-gray-300">{g.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bölüm 1: Tabela & İç Mekan */}
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 md:p-10">
                  <div className="flex items-center gap-3 mb-8">
                    <h3 className="text-sm font-black uppercase tracking-tighter">Tabela & İç Mekan</h3>
                    <div className="relative group/tip1">
                      <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-[#00A3AD] hover:text-white transition-all cursor-help text-[10px] font-black">?</div>
                      <div className="absolute left-0 top-7 z-30 w-72 bg-black text-white text-[11px] font-bold leading-relaxed rounded-2xl p-4 opacity-0 group-hover/tip1:opacity-100 transition-all pointer-events-none shadow-2xl">
                        Buraya yüklediğiniz fotoğraflar müşterilerinizin işletmenizi ilk gördüğü alanlarda gösterilir. Net, aydınlık ve profesyonel fotoğraflar daha fazla güven oluşturur ve rezervasyon oranını artırır.
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {/* A) Kapak Fotoğrafı - ZORUNLU */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[11px] font-black uppercase tracking-widest">Kapak Fotoğrafı</p>
                        <span className="text-[9px] font-black uppercase tracking-widest bg-red-50 text-red-500 px-2 py-0.5 rounded-full border border-red-100">Zorunlu</span>
                      </div>
                      <p className="text-[10px] font-bold text-gray-400 mb-4">Müşteri sayfasında hero alanında gösterilen ana görseldir. İşletmenizi en iyi şekilde yansıtmalıdır.</p>
                      <label className="group block cursor-pointer">
                        <div className={`relative rounded-[2rem] overflow-hidden border-2 border-dashed transition-all ${shop?.image_url ? 'border-transparent' : 'border-gray-200 hover:border-[#00A3AD] hover:shadow-[0_0_0_4px_rgba(0,163,173,0.08)]'}`} style={{ aspectRatio: '16/7' }}>
                          {shop?.image_url ? (
                            <>
                              <img src={shop.image_url} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                <div className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase shadow-xl">
                                  <UploadCloud size={14}/> Fotoğrafı Değiştir
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full bg-gray-50 group-hover:bg-[#E6F6F7] transition-all flex flex-col items-center justify-center gap-4 py-12">
                              <div className="w-16 h-16 rounded-2xl bg-gray-100 group-hover:bg-[#00A3AD]/10 flex items-center justify-center transition-all">
                                <UploadCloud size={28} className="text-gray-300 group-hover:text-[#00A3AD] transition-colors" />
                              </div>
                              <div className="text-center">
                                <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 group-hover:text-[#00A3AD] transition-colors mb-1">Kapak Fotoğrafı Yükle</p>
                                <p className="text-[10px] font-bold text-gray-400 max-w-xs mx-auto">Buraya işletmenizin dışarıdan çekilmiş net bir fotoğrafını yükleyin. Tabelanız ve giriş kısmı görünmelidir.</p>
                              </div>
                            </div>
                          )}
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0]; if (!file) return;
                          const url = await handleFileUpload(file, 'shop-covers');
                          if(url && shop?.id) { await supabase.from('shops').update({ image_url: url }).eq('id', shop.id); fetchInitialData(); }
                        }} />
                      </label>
                    </div>

                    {/* B) Tabela/Dış Cephe + C) İç Mekan */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* B) Tabela / Dış Cephe */}
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-widest mb-1">Tabela / Dış Cephe</p>
                        <p className="text-[10px] font-bold text-gray-400 mb-3">Müşteriler işletmenizi sokakta daha kolay bulabilir.</p>
                        <label className="group block cursor-pointer">
                          <div className={`rounded-3xl overflow-hidden border-2 border-dashed transition-all ${(shop?.gallery_urls || [])[0] ? 'border-transparent' : 'border-gray-200 hover:border-[#00A3AD] hover:shadow-[0_0_0_4px_rgba(0,163,173,0.08)]'}`} style={{ aspectRatio: '4/3' }}>
                            {(shop?.gallery_urls || [])[0] ? (
                              <div className="relative h-full">
                                <img src={(shop.gallery_urls)[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                  <div className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl font-black text-[10px] uppercase"><Plus size={12}/> Ekle</div>
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-full bg-gray-50 group-hover:bg-[#E6F6F7] transition-all flex flex-col items-center justify-center gap-3 min-h-[180px]">
                                <ImageIcon size={24} className="text-gray-200 group-hover:text-[#00A3AD] transition-colors" />
                                <p className="text-[10px] font-bold text-gray-400 group-hover:text-[#00A3AD] text-center px-6 transition-colors">Tabelanızı ve dış görünüşünüzü net ve aydınlık şekilde yükleyin.</p>
                              </div>
                            )}
                          </div>
                          <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                            const file = e.target.files?.[0]; if (!file) return;
                            const url = await handleFileUpload(file, 'gallery');
                            if(url && shop?.id) { const g = [...(shop.gallery_urls || []), url]; await supabase.from('shops').update({ gallery_urls: g }).eq('id', shop.id); fetchInitialData(); }
                          }} />
                        </label>
                      </div>

                      {/* C) İç Mekan */}
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-widest mb-1">İç Mekan</p>
                        <p className="text-[10px] font-bold text-gray-400 mb-3">Kaliteli iç mekan fotoğrafları müşteri güvenini artırır.</p>
                        <div className="grid grid-cols-2 gap-2">
                          {(shop?.gallery_urls || []).slice(1, 4).map((url: string, i: number) => (
                            <div key={i} className="aspect-square rounded-2xl overflow-hidden">
                              <img src={url} className="w-full h-full object-cover" />
                            </div>
                          ))}
                          <label className="group cursor-pointer">
                            <div className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 hover:border-[#00A3AD] hover:shadow-[0_0_0_4px_rgba(0,163,173,0.08)] transition-all flex flex-col items-center justify-center gap-1.5 group-hover:bg-[#E6F6F7] group-hover:scale-[1.02]">
                              <Plus size={18} className="text-gray-300 group-hover:text-[#00A3AD] transition-colors" />
                              <p className="text-[9px] font-black text-gray-300 group-hover:text-[#00A3AD] uppercase tracking-widest transition-colors">Ekle</p>
                            </div>
                            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                              const file = e.target.files?.[0]; if (!file) return;
                              const url = await handleFileUpload(file, 'gallery');
                              if(url && shop?.id) { const g = [...(shop.gallery_urls || []), url]; await supabase.from('shops').update({ gallery_urls: g }).eq('id', shop.id); fetchInitialData(); }
                            }} />
                          </label>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 mt-2">Koltuklarınızı, aynalarınızı ve iç dizaynınızı net ışık altında gösterin.</p>
                      </div>
                    </div>

                    {/* D) Opsiyonel bilgi */}
                    <div className="flex items-center gap-3 bg-[#E6F6F7] rounded-2xl px-5 py-4">
                      <Lightbulb size={15} className="text-[#00A3AD] flex-shrink-0" />
                      <p className="text-[11px] font-bold text-[#00A3AD]">Dekorasyon ve ambiyans fotoğrafları eklemek rezervasyon dönüşümünü artırabilir.</p>
                      <span className="ml-auto text-[9px] font-black uppercase tracking-widest bg-[#00A3AD]/10 text-[#00A3AD] px-2.5 py-1 rounded-full flex-shrink-0 whitespace-nowrap">Opsiyonel</span>
                    </div>
                  </div>
                </div>

                {/* Bölüm 2: Favori Kesimleriniz */}
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 md:p-10">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-sm font-black uppercase tracking-tighter">Favori Kesimleriniz</h3>
                    <div className="relative group/tip2">
                      <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-[#00A3AD] hover:text-white transition-all cursor-help text-[10px] font-black">?</div>
                      <div className="absolute left-0 top-7 z-30 w-72 bg-black text-white text-[11px] font-bold leading-relaxed rounded-2xl p-4 opacity-0 group-hover/tip2:opacity-100 transition-all pointer-events-none shadow-2xl">
                        Yüklediğiniz kesim fotoğrafları müşteri kararını doğrudan etkiler. Net, yakın çekim ve kaliteli sonuç fotoğrafları daha fazla rezervasyon sağlar.
                      </div>
                    </div>
                  </div>
                  <div className="space-y-0.5 mb-6">
                    <p className="text-[10px] font-bold text-gray-400">Fade, sakal, uzun saç, boyama veya özel işlemlerinizden örnekler ekleyin.</p>
                    <p className="text-[10px] font-bold text-gray-400">Fotoğraflarda saç modeli net görünmeli, arka plan sade ve ışık dengeli olmalıdır.</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(shop?.haircut_urls || []).map((url: string, i: number) => (
                      <div key={i} className="aspect-square rounded-2xl overflow-hidden">
                        <img src={url} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                      </div>
                    ))}
                    {Array.from({ length: Math.max(0, 4 - (shop?.haircut_urls || []).length) }).map((_, i) => (
                      <label key={`hc-${i}`} className="group cursor-pointer">
                        <div className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 hover:border-[#00A3AD] hover:shadow-[0_0_0_4px_rgba(0,163,173,0.08)] transition-all flex flex-col items-center justify-center gap-2 group-hover:bg-[#E6F6F7] group-hover:scale-[1.02]">
                          <Camera size={20} className="text-gray-200 group-hover:text-[#00A3AD] transition-colors" />
                          <p className="text-[9px] font-black text-gray-300 group-hover:text-[#00A3AD] uppercase tracking-widest transition-colors">Ekle</p>
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0]; if (!file) return;
                          const url = await handleFileUpload(file, 'haircuts');
                          if(url && shop?.id) { const g = [...(shop.haircut_urls || []), url]; await supabase.from('shops').update({ haircut_urls: g }).eq('id', shop.id); fetchInitialData(); }
                        }} />
                      </label>
                    ))}
                    {(shop?.haircut_urls || []).length >= 4 && (
                      <label className="group cursor-pointer">
                        <div className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 hover:border-[#00A3AD] hover:shadow-[0_0_0_4px_rgba(0,163,173,0.08)] transition-all flex flex-col items-center justify-center gap-2 group-hover:bg-[#E6F6F7]">
                          <Plus size={20} className="text-gray-200 group-hover:text-[#00A3AD] transition-colors" />
                          <p className="text-[9px] font-black text-gray-300 group-hover:text-[#00A3AD] uppercase tracking-widest transition-colors">Daha Fazla</p>
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0]; if (!file) return;
                          const url = await handleFileUpload(file, 'haircuts');
                          if(url && shop?.id) { const g = [...(shop.haircut_urls || []), url]; await supabase.from('shops').update({ haircut_urls: g }).eq('id', shop.id); fetchInitialData(); }
                        }} />
                      </label>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* 3. RANDEVULAR */}
            {activeTab === "appointments" && (
              <div className="animate-in fade-in duration-300">
                {/* Top Controls Bar */}
                <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
                  {/* Navigation */}
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => { setCalDayOffset(0); setCalendarWeekOffset(0); }}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[11px] font-black uppercase tracking-widest text-black hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                    >Bugün</button>
                    <div className="flex items-center bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                      <button
                        onClick={() => { if (calViewMode === 'day') setCalDayOffset(o => o - 1); else if (calViewMode === 'week') setCalendarWeekOffset(o => o - 1); else setCalDayOffset(o => o - 30); }}
                        className="px-3 py-2.5 text-gray-400 hover:text-black hover:bg-gray-50 transition-all border-r border-gray-200"
                      ><ChevronLeft size={15}/></button>
                      <button
                        onClick={() => { if (calViewMode === 'day') setCalDayOffset(o => o + 1); else if (calViewMode === 'week') setCalendarWeekOffset(o => o + 1); else setCalDayOffset(o => o + 30); }}
                        className="px-3 py-2.5 text-gray-400 hover:text-black hover:bg-gray-50 transition-all"
                      ><ChevronRight size={15}/></button>
                    </div>
                    <p className="text-base font-black text-black tracking-tight">
                      {calViewMode === 'month' || appointmentView === 'list'
                        ? calCurrentDay.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
                        : calViewMode === 'week'
                        ? `${calWeekDays[0].toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} — ${calWeekDays[6].toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}`
                        : calCurrentDay.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                      }
                    </p>
                  </div>
                  {/* Right controls */}
                  <div className="flex items-center gap-2">
                    {appointmentView === 'calendar' && (
                      <div className="flex items-center bg-gray-100 rounded-xl p-1">
                        {(['day', 'week', 'month'] as const).map(m => (
                          <button key={m} onClick={() => setCalViewMode(m)}
                            className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${calViewMode === m ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-700'}`}
                          >{m === 'day' ? 'Gün' : m === 'week' ? 'Hafta' : 'Ay'}</button>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center bg-gray-100 rounded-xl p-1">
                      <button onClick={() => setAppointmentView('calendar')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${appointmentView === 'calendar' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-700'}`}
                      ><Calendar size={13}/> Takvim</button>
                      <button onClick={() => setAppointmentView('list')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${appointmentView === 'list' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-700'}`}
                      ><LayoutDashboard size={13}/> Liste</button>
                    </div>
                  </div>
                </div>

                {/* ── LİSTE GÖRÜNÜMÜ ── */}
                {appointmentView === 'list' && (
                  <div>
                    {/* Filter bar */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 mb-4 flex items-center gap-2 flex-wrap">
                      <div className="flex gap-1.5 flex-wrap">
                        {[
                          { val: 'all', label: 'Tümü', count: appointments.length },
                          { val: 'Beklemede', label: 'Bekleyen', count: appointments.filter((a:any)=>a.status==='Beklemede').length },
                          { val: 'Onaylandı', label: 'Onaylı', count: appointments.filter((a:any)=>a.status==='Onaylandı').length },
                          { val: 'İptal Edildi', label: 'İptal', count: appointments.filter((a:any)=>a.status==='İptal Edildi').length },
                          { val: 'Tamamlandı', label: 'Tamamlanan', count: appointments.filter((a:any)=>a.status==='Tamamlandı').length },
                          { val: 'Gelmedi', label: 'Gelmedi', count: appointments.filter((a:any)=>a.status==='Gelmedi').length },
                        ].map(f => (
                          <button key={f.val} onClick={() => setListFilter(f.val)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${listFilter === f.val ? 'bg-black text-white shadow-sm' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                          >
                            {f.label}
                            {f.count > 0 && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${listFilter === f.val ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'}`}>{f.count}</span>}
                          </button>
                        ))}
                      </div>
                      <div className="ml-auto flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                        <Search size={13} className="text-gray-400 flex-shrink-0"/>
                        <input type="text" placeholder="Müşteri ara..." className="bg-transparent outline-none text-xs font-bold text-black placeholder-gray-400 w-32"
                          value={listSearch} onChange={e => setListSearch(e.target.value)} />
                      </div>
                    </div>
                    {/* Rows */}
                    {(() => {
                      let filtered = appointments as any[];
                      if (listFilter !== 'all') filtered = filtered.filter((a:any) => a.status === listFilter);
                      if (listSearch.trim()) filtered = filtered.filter((a:any) =>
                        (a.profiles?.full_name||'').toLowerCase().includes(listSearch.toLowerCase()) ||
                        (a.service_name||'').toLowerCase().includes(listSearch.toLowerCase())
                      );
                      if (filtered.length === 0) return (
                        <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
                          <p className="font-black text-gray-300 uppercase tracking-widest italic text-sm">Randevu bulunamadı</p>
                        </div>
                      );
                      const monthNames = ['OCA','ŞUB','MAR','NİS','MAY','HAZ','TEM','AĞU','EYL','EKİ','KAS','ARA'];
                      const borderCls: Record<string,string> = { 'Beklemede':'border-l-amber-400','Onaylandı':'border-l-emerald-500','İptal Edildi':'border-l-red-400','Tamamlandı':'border-l-blue-500','Gelmedi':'border-l-gray-300' };
                      const badgeCls: Record<string,string> = { 'Beklemede':'bg-amber-50 text-amber-700','Onaylandı':'bg-emerald-50 text-emerald-700','İptal Edildi':'bg-red-50 text-red-600','Tamamlandı':'bg-blue-50 text-blue-700','Gelmedi':'bg-gray-100 text-gray-600' };
                      return (
                        <div className="space-y-2">
                          {filtered.map((apt:any) => {
                            const dp = (apt.appointment_date||'').split('-');
                            const monthLabel = dp[1] ? monthNames[parseInt(dp[1])-1] : '';
                            return (
                              <div key={apt.id}
                                className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${borderCls[apt.status]||'border-l-gray-300'} shadow-sm hover:shadow-md hover:border-gray-200 transition-all cursor-pointer group`}
                                onClick={()=>{ setSelectedApt(apt); setDetailRejectMode(false); setDetailRejectReason(''); setDetailRejectError(''); }}
                              >
                                <div className="flex items-center px-5 py-4 gap-4">
                                  <div className="flex-shrink-0 w-14 text-center">
                                    <p className="text-xl font-black text-black leading-none">{apt.appointment_time?.slice(0,5) ?? '--:--'}</p>
                                    <p className="text-[9px] font-black text-gray-400 uppercase mt-1">{dp[2]} {monthLabel}</p>
                                  </div>
                                  <div className="w-px h-10 bg-gray-100 flex-shrink-0"/>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-black truncate">{apt.profiles?.full_name || 'Misafir'}</p>
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                      <span className="text-[11px] font-bold text-gray-500 truncate">{apt.service_name}</span>
                                      {apt.staff && <span className="text-[11px] font-bold text-[#00A3AD] truncate">· {apt.staff.first_name} {apt.staff.last_name}</span>}
                                      {apt.profiles?.phone && <span className="text-[11px] text-gray-400 truncate">· {apt.profiles.phone}</span>}
                                    </div>
                                  </div>
                                  <p className="text-sm font-black text-black flex-shrink-0 hidden md:block">₺{apt.price}</p>
                                  <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full flex-shrink-0 ${badgeCls[apt.status]||'bg-gray-100 text-gray-600'}`}>{apt.status}</span>
                                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                    {apt.status === 'Beklemede' && (
                                      <button onClick={e=>{e.stopPropagation();updateAppointmentStatus(apt.id,'Onaylandı');}} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-500 hover:text-white transition-all" title="Onayla"><CheckCircle2 size={14}/></button>
                                    )}
                                    {apt.profiles?.phone && (
                                      <a href={`tel:${apt.profiles.phone}`} onClick={e=>e.stopPropagation()} className="p-2 bg-gray-50 text-gray-500 rounded-lg hover:bg-gray-100 transition-all"><Phone size={14}/></a>
                                    )}
                                  </div>
                                  <ChevronRight size={15} className="text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0"/>
                                </div>
                                {apt.cancel_reason && (
                                  <p className="px-5 pb-3 text-[10px] font-bold text-red-400 italic truncate">Red: {apt.cancel_reason}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* ── TAKVİM GÖRÜNÜMÜ ── */}
                {appointmentView === 'calendar' && (
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Renk açıklamaları */}
                    <div className="flex items-center gap-5 px-6 py-3 border-b border-gray-100 flex-wrap">
                      {[
                        { label: 'Beklemede', cls: 'bg-amber-400' },
                        { label: 'Onaylandı', cls: 'bg-emerald-500' },
                        { label: 'İptal Edildi', cls: 'bg-red-400' },
                        { label: 'Tamamlandı', cls: 'bg-blue-500' },
                        { label: 'Gelmedi', cls: 'bg-gray-400' },
                      ].map(s => (
                        <div key={s.label} className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.cls}`} />
                          <span className="text-[11px] font-bold text-gray-500">{s.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Calendar body */}
                    {calViewMode === 'day' && (
                      <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '700px' }}>
                        <div style={{ minWidth: `${64 + Math.max(dayViewColumns.length, 1) * 160}px` }}>
                          {/* Staff column headers with avatars */}
                          <div className="flex sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
                            <div style={{ width: '64px', flexShrink: 0 }} />
                            {dayViewColumns.map((col) => (
                              <div key={col.id} style={{ width: '160px', flexShrink: 0 }} className="border-l border-gray-100 py-3 px-2 flex flex-col items-center gap-1.5">
                                <div className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center border-2 border-white shadow-sm ${col.id === '__unassigned' ? 'bg-gray-100' : 'bg-[#E6F6F7]'}`}>
                                  {col.id === '__unassigned' ? (
                                    <Users size={16} className="text-gray-400" />
                                  ) : col.avatar ? (
                                    <img src={col.avatar} className="w-full h-full object-cover" alt="" />
                                  ) : (
                                    <span className="text-sm font-black text-[#00A3AD]">{col.label.charAt(0)}</span>
                                  )}
                                </div>
                                <p className="text-[10px] font-black text-gray-700 text-center truncate w-full">{col.label}</p>
                                {col.role && <p className="text-[8px] font-bold text-gray-400 uppercase text-center truncate w-full">{col.role}</p>}
                              </div>
                            ))}
                          </div>
                          {/* Time grid */}
                          <div className="flex relative">
                            {/* Time axis with current-time badge */}
                            <div style={{ width: '64px', flexShrink: 0 }} className="relative">
                              {calHours.map(h => {
                                const rowTop = (h - 8) * calHourH;
                                const showBadge = isCurrentDayToday && currentTimeTop >= rowTop && currentTimeTop < rowTop + calHourH;
                                return (
                                  <div key={h} style={{ height: `${calHourH}px` }} className="relative border-b border-gray-50 flex items-start justify-end pr-3 pt-1.5">
                                    {showBadge ? (
                                      <span className="absolute right-1.5 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full z-10 leading-none"
                                        style={{ top: `${Math.max(2, currentTimeTop - rowTop - 8)}px` }}>
                                        {`${String(_now.getHours()).padStart(2,'0')}:${String(_now.getMinutes()).padStart(2,'0')}`}
                                      </span>
                                    ) : (
                                      <span className="text-[11px] font-semibold text-gray-300">{`${h}:00`}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            {/* Staff columns */}
                            {dayViewColumns.map((col) => {
                              const colApts = getColApts(col.id);
                              return (
                                <div key={col.id}
                                  style={{ width: '160px', flexShrink: 0, height: `${calHours.length * calHourH}px` }}
                                  className="border-l border-gray-100 relative">
                                  {calHours.map(h => (
                                    <div key={h} className="absolute w-full border-b border-gray-100" style={{ top: `${(h - 8) * calHourH}px` }} />
                                  ))}
                                  {calHours.map(h => (
                                    <div key={`hh${h}`} className="absolute w-full border-b border-dashed border-gray-50" style={{ top: `${(h - 8) * calHourH + calHourH / 2}px` }} />
                                  ))}
                                  {colApts.map((apt: any) => {
                                    const tParts = (apt.appointment_time || '08:00').split(':');
                                    const aH = Math.max(8, Math.min(20, parseInt(tParts[0]) || 8));
                                    const aM = parseInt(tParts[1]) || 0;
                                    const topPx = (aH - 8) * calHourH + (aM / 60) * calHourH;
                                    const dur = services.find((s: any) => s.name === apt.service_name)?.duration || 60;
                                    const heightPx = Math.max(44, (dur / 60) * calHourH);
                                    const endMin = aH * 60 + aM + dur;
                                    const endH = Math.floor(endMin / 60), endM = endMin % 60;
                                    const aptColors: Record<string,string> = {
                                      'Beklemede': 'bg-amber-50 border-amber-400 text-amber-900 hover:bg-amber-100',
                                      'Onaylandı': 'bg-emerald-50 border-emerald-400 text-emerald-900 hover:bg-emerald-100',
                                      'İptal Edildi': 'bg-red-50 border-red-400 text-red-900 hover:bg-red-100',
                                      'Tamamlandı': 'bg-blue-50 border-blue-400 text-blue-900 hover:bg-blue-100',
                                      'Gelmedi': 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100',
                                    };
                                    const cls = aptColors[apt.status] || 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100';
                                    return (
                                      <div key={apt.id}
                                        className={`absolute left-1.5 right-1.5 rounded-xl border-l-[3px] overflow-hidden cursor-pointer hover:shadow-md hover:z-10 transition-all duration-150 ${cls}`}
                                        style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                                        onClick={() => { setSelectedApt(apt); setDetailRejectMode(false); setDetailRejectReason(''); setDetailRejectError(''); }}>
                                        <div className="px-2.5 py-2 h-full flex flex-col">
                                          <p className="text-[9px] font-semibold opacity-60 leading-none mb-1">
                                            {`${String(aH).padStart(2,'0')}:${String(aM).padStart(2,'0')} – ${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`}
                                          </p>
                                          <p className="text-[11px] font-black truncate">{apt.profiles?.full_name || 'Misafir'}</p>
                                          {heightPx >= 54 && <p className="text-[9px] opacity-70 truncate mt-0.5">{apt.service_name}</p>}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                            {/* Current time red line */}
                            {isCurrentDayToday && currentTimeTop >= 0 && currentTimeTop <= calHours.length * calHourH && (
                              <div className="absolute z-30 pointer-events-none flex items-center"
                                style={{ top: `${currentTimeTop}px`, left: '64px', right: 0 }}>
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0 -translate-x-1.5" />
                                <div className="flex-1 h-[2px] bg-red-500/50" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {calViewMode === 'week' && (
                      <div style={{ overflowY: 'auto', maxHeight: '700px', minWidth: '720px', overflowX: 'auto' }}>
                        <div style={{ minWidth: '720px' }}>
                          <div className="flex sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
                            <div style={{ width: '64px', flexShrink: 0 }} />
                            {calWeekDays.map((day, i) => {
                              const ds = day.toISOString().split('T')[0];
                              const isToday = ds === today;
                              const cnt = appointments.filter((a: any) => a.appointment_date === ds).length;
                              return (
                                <div key={i}
                                  className={`flex-1 text-center py-3 border-l border-gray-100 cursor-pointer hover:bg-gray-50 transition-all ${isToday ? 'bg-[#00A3AD]/5' : ''}`}
                                  onClick={() => { const off = Math.round((day.getTime() - new Date(new Date().setHours(0,0,0,0)).getTime()) / 86400000); setCalDayOffset(off); setCalViewMode('day'); }}
                                >
                                  <p className={`text-[10px] font-black uppercase tracking-widest ${isToday ? 'text-[#00A3AD]' : 'text-gray-400'}`}>{calDayNames[i]}</p>
                                  <div className={`text-sm font-black mx-auto w-8 h-8 flex items-center justify-center rounded-full mt-0.5 ${isToday ? 'bg-[#00A3AD] text-white' : 'text-black'}`}>{day.getDate()}</div>
                                  {cnt > 0 && <p className="text-[9px] font-bold text-[#00A3AD] mt-0.5">{cnt}</p>}
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex">
                            <div style={{ width: '64px', flexShrink: 0 }}>
                              {calHours.map(h => (
                                <div key={h} style={{ height: `${calHourH}px` }} className="border-b border-gray-50 flex items-start justify-end pr-3 pt-1.5">
                                  <span className="text-[11px] font-semibold text-gray-300">{`${h}:00`}</span>
                                </div>
                              ))}
                            </div>
                            {calWeekDays.map((day, di) => {
                              const ds = day.toISOString().split('T')[0];
                              const isToday = ds === today;
                              const dayApts = appointments.filter((a: any) => a.appointment_date === ds);
                              return (
                                <div key={di}
                                  className={`flex-1 border-l border-gray-100 relative ${isToday ? 'bg-[#00A3AD]/[0.02]' : ''}`}
                                  style={{ height: `${calHours.length * calHourH}px` }}>
                                  {calHours.map(h => (
                                    <div key={h} className="absolute w-full border-b border-gray-100" style={{ top: `${(h - 8) * calHourH}px` }} />
                                  ))}
                                  {calHours.map(h => (
                                    <div key={`hh${h}`} className="absolute w-full border-b border-dashed border-gray-50" style={{ top: `${(h - 8) * calHourH + calHourH / 2}px` }} />
                                  ))}
                                  {dayApts.map((apt: any) => {
                                    const tParts = (apt.appointment_time || '08:00').split(':');
                                    const aH = Math.max(8, Math.min(20, parseInt(tParts[0]) || 8));
                                    const aM = parseInt(tParts[1]) || 0;
                                    const topPx = (aH - 8) * calHourH + (aM / 60) * calHourH;
                                    const dur = services.find((s: any) => s.name === apt.service_name)?.duration || 60;
                                    const heightPx = Math.max(32, (dur / 60) * calHourH);
                                    const aptColors: Record<string,string> = { 'Beklemede':'bg-amber-50 border-amber-400 text-amber-900','Onaylandı':'bg-emerald-50 border-emerald-400 text-emerald-900','İptal Edildi':'bg-red-50 border-red-400 text-red-900','Tamamlandı':'bg-blue-50 border-blue-400 text-blue-900','Gelmedi':'bg-gray-50 border-gray-300 text-gray-700' };
                                    const cls = aptColors[apt.status] || 'bg-gray-50 border-gray-300 text-gray-700';
                                    return (
                                      <div key={apt.id}
                                        className={`absolute left-0.5 right-0.5 rounded-lg border-l-[3px] overflow-hidden cursor-pointer hover:shadow-md hover:z-10 transition-all duration-150 ${cls}`}
                                        style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                                        onClick={() => { setSelectedApt(apt); setDetailRejectMode(false); setDetailRejectReason(''); setDetailRejectError(''); }}>
                                        <div className="px-2 py-1.5">
                                          <p className="text-[10px] font-black truncate">{apt.profiles?.full_name || 'Misafir'}</p>
                                          {heightPx >= 46 && <p className="text-[8px] opacity-70 truncate">{apt.appointment_time?.slice(0,5)} · {apt.service_name}</p>}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {calViewMode === 'month' && (() => {
                      const mStart = new Date(calCurrentDay); mStart.setDate(1); mStart.setHours(0,0,0,0);
                      const firstDow = mStart.getDay();
                      const offset = firstDow === 0 ? 6 : firstDow - 1;
                      const mEnd = new Date(mStart); mEnd.setMonth(mEnd.getMonth()+1); mEnd.setDate(0);
                      const cells: Date[] = [];
                      for (let i = offset; i > 0; i--) { const d = new Date(mStart); d.setDate(d.getDate()-i); cells.push(d); }
                      for (let i = 1; i <= mEnd.getDate(); i++) { const d = new Date(mStart); d.setDate(i); cells.push(d); }
                      while (cells.length % 7 !== 0) { const d = new Date(cells[cells.length-1]); d.setDate(d.getDate()+1); cells.push(d); }
                      const mColors: Record<string,string> = { 'Beklemede':'bg-amber-400','Onaylandı':'bg-emerald-500','İptal Edildi':'bg-red-400','Tamamlandı':'bg-blue-500','Gelmedi':'bg-gray-400' };
                      return (
                        <div>
                          <div className="grid grid-cols-7 border-b border-gray-100">
                            {['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'].map(d => (
                              <div key={d} className="py-2 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">{d}</div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7">
                            {cells.map((day, i) => {
                              const ds = day.toISOString().split('T')[0];
                              const isThisMonth = day.getMonth() === mStart.getMonth();
                              const isTodayCell = ds === today;
                              const dayApts = appointments.filter((a: any) => a.appointment_date === ds);
                              return (
                                <div key={i}
                                  className={`min-h-[90px] border-b border-r border-gray-100 p-2 cursor-pointer hover:bg-gray-50 transition-all ${!isThisMonth ? 'opacity-25' : ''} ${isTodayCell ? 'bg-[#00A3AD]/5' : ''}`}
                                  onClick={() => { const off = Math.round((day.getTime()-new Date(new Date().setHours(0,0,0,0)).getTime())/86400000); setCalDayOffset(off); setCalViewMode('day'); }}>
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-black mb-1 ${isTodayCell ? 'bg-[#00A3AD] text-white' : 'text-gray-700'}`}>{day.getDate()}</div>
                                  {dayApts.slice(0,3).map((apt: any) => (
                                    <div key={apt.id}
                                      className={`text-[9px] font-bold text-white px-1.5 py-0.5 rounded-md mb-0.5 truncate ${mColors[apt.status]||'bg-gray-400'}`}
                                      onClick={e=>{e.stopPropagation();setSelectedApt(apt);setDetailRejectMode(false);setDetailRejectReason('');setDetailRejectError('');}}>
                                      {apt.appointment_time?.slice(0,5)} {apt.profiles?.full_name?.split(' ')[0]||'Misafir'}
                                    </div>
                                  ))}
                                  {dayApts.length > 3 && <p className="text-[9px] font-bold text-gray-400">+{dayApts.length-3}</p>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Bottom summary bar */}
                    <div className="border-t border-gray-100 px-6 py-3 flex items-center gap-5 flex-wrap">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Özet:</p>
                      {[
                        { label: 'Toplam', value: calCurrentDayApts.length, cls: 'text-black' },
                        { label: 'Beklemede', value: calCurrentDayApts.filter((a: any) => a.status === 'Beklemede').length, cls: 'text-amber-500' },
                        { label: 'Onaylı', value: calCurrentDayApts.filter((a: any) => a.status === 'Onaylandı').length, cls: 'text-emerald-600' },
                        { label: 'İptal', value: calCurrentDayApts.filter((a: any) => a.status === 'İptal Edildi').length, cls: 'text-red-500' },
                      ].map((s) => (
                        <div key={s.label} className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-400 font-bold">{s.label}:</span>
                          <span className={`text-sm font-black ${s.cls}`}>{s.value}</span>
                        </div>
                      ))}
                      {(() => {
                        const decided = calCurrentDayApts.filter((a: any) => a.status === 'Onaylandı' || a.status === 'İptal Edildi').length;
                        const approved = calCurrentDayApts.filter((a: any) => a.status === 'Onaylandı').length;
                        if (!decided) return null;
                        return (
                          <div className="flex items-center gap-1.5 ml-auto">
                            <span className="text-[10px] text-gray-400 font-bold">Onay Oranı:</span>
                            <span className="text-sm font-black text-[#00A3AD]">%{Math.round(approved/decided*100)}</span>
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
                  <div className="py-16 px-8 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100 shadow-sm">
                    <div className="w-20 h-20 rounded-full bg-[#E6F6F7] flex items-center justify-center mx-auto mb-6 text-4xl">✂️</div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-black mb-3">Henüz hizmet eklemediniz</h3>
                    <p className="text-sm font-medium text-gray-400 max-w-xs mx-auto mb-2 leading-relaxed">Hizmet olmadan randevu alınamaz. İlk hizmetini ekle, müşterilerin seni keşfetmeye başlasın.</p>
                    <p className="text-[10px] font-black text-[#00A3AD] uppercase tracking-widest mb-8">Randevu almak için en az 1 hizmet gerekli</p>
                    <button
                      onClick={() => { setEditingService(null); setServiceForm({ name: "", price: "", duration: "", image_url: "" }); setIsServiceModalOpen(true); }}
                      className="inline-flex items-center gap-2 bg-black text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#00A3AD] transition-all shadow-xl"
                    >
                      <Plus size={16} /> İlk Hizmetini Ekle
                    </button>
                  </div>
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
                  {/* Apply to all */}
                  <div className="flex gap-3 pt-2">
                    {shopHours.filter(h => !h.is_closed).slice(0, 1).map((ref, _) => (
                      <button key="apply-all" type="button"
                        onClick={() => setShopHours(prev => prev.map(h => h.is_closed ? h : { ...h, open_time: ref.open_time, close_time: ref.close_time }))}
                        className="flex-1 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest border-2 border-dashed border-gray-200 text-gray-400 hover:border-[#00A3AD] hover:text-[#00A3AD] transition-all"
                      >
                        Tüm Haftaya Uygula ({ref.open_time?.slice(0,5)} – {ref.close_time?.slice(0,5)})
                      </button>
                    ))}
                  </div>
                  <button onClick={handleSaveHours} disabled={savingHours} className="w-full bg-black text-white py-6 rounded-[2rem] font-black uppercase tracking-widest text-xs mt-2 hover:bg-[#00A3AD] transition-all flex items-center justify-center gap-3">
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
                    <button onClick={() => { setEditingStaff(null); setStaffForm({ firstName: "", lastName: "", avatarUrl: "", role: "", specialty: "" }); setIsStaffModalOpen(true); }} className="bg-black text-white px-10 py-5 rounded-2xl font-black text-xs uppercase hover:bg-[#00A3AD] transition-all shadow-xl flex items-center gap-2"><Plus size={18} /> Personel Ekle</button>
                  )}
                </div>
                {staff.length === 0 ? (
                  <div className="py-16 px-8 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100 shadow-sm">
                    <div className="w-20 h-20 rounded-full bg-[#E6F6F7] flex items-center justify-center mx-auto mb-6 text-4xl">👤</div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-black mb-3">Henüz çalışan eklemediniz</h3>
                    <p className="text-sm font-medium text-gray-400 max-w-xs mx-auto mb-2 leading-relaxed">Müşterileriniz çalışan seçerek rezervasyon oluşturabilir.</p>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-8">Tek çalışıyorsanız kendinizi ekleyin.</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        onClick={() => {
                          const fullName = (shop as any)?.profiles?.full_name || '';
                          const parts = fullName.trim().split(' ');
                          const firstName = parts[0] || '';
                          const lastName = parts.slice(1).join(' ') || '';
                          setEditingStaff(null);
                          setStaffForm({ firstName, lastName, avatarUrl: (shop as any)?.profiles?.avatar_url || '', role: 'Sahibi', specialty: '' });
                          setIsStaffModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 bg-black text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#00A3AD] transition-all shadow-xl"
                      >
                        👤 Kendimi Ekle
                      </button>
                      <button
                        onClick={() => { setEditingStaff(null); setStaffForm({ firstName: "", lastName: "", avatarUrl: "", role: "", specialty: "" }); setIsStaffModalOpen(true); }}
                        className="inline-flex items-center gap-2 border-2 border-gray-100 text-gray-500 px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-gray-300 transition-all"
                      >
                        <Plus size={14} /> Başkasını Ekle
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {staff.map((s) => (
                      <div key={s.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all flex items-center gap-5">
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-[#E6F6F7] border-4 border-white shadow-md flex items-center justify-center flex-shrink-0">
                          {s.avatar_url ? <img src={s.avatar_url} className="w-full h-full object-cover" alt={s.first_name} /> : <span className="text-2xl font-black text-[#00A3AD]">{s.first_name?.charAt(0)}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm uppercase tracking-tight text-black leading-tight">{s.first_name} {s.last_name}</p>
                          {s.role && <p className="text-[10px] font-black text-[#00A3AD] uppercase tracking-widest mt-0.5">{s.role}</p>}
                          {s.specialty && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 truncate">{s.specialty}</p>}
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <button onClick={() => openStaffEdit(s)} className="p-2 text-gray-400 hover:text-[#00A3AD] transition-colors" title="Düzenle"><Edit3 size={15}/></button>
                          <button onClick={async () => { if(confirm("Personel silinsin mi?")) { await supabase.from('staff').delete().eq('id', s.id); fetchInitialData(); } }} className="p-2 text-gray-300 hover:text-red-500 transition-colors" title="Sil"><Trash2 size={15}/></button>
                        </div>
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

            {/* 8. KAMPANYALAR */}
            {activeTab === "campaigns" && (
              <div className="animate-in slide-in-from-right-4">
                <div className="flex justify-between items-center mb-12">
                  <h2 className="text-4xl font-black uppercase tracking-tighter italic">Kampanyalar</h2>
                  <button
                    onClick={() => { setEditingCampaign(null); setCampaignForm({ title: "", type: "percentage", discount_value: "", start_date: "", end_date: "", service_ids: [], is_active: true }); setIsCampaignModalOpen(true); }}
                    className="bg-black text-white px-10 py-5 rounded-2xl font-black text-xs uppercase hover:bg-[#00A3AD] transition-all shadow-xl flex items-center gap-2"
                  >
                    <Plus size={18} /> Kampanya Oluştur
                  </button>
                </div>

                {campaigns.length === 0 ? (
                  <div className="py-20 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-100 text-gray-300 font-black uppercase text-xs tracking-widest italic">
                    Henüz kampanya oluşturmadınız
                  </div>
                ) : (
                  <div className="space-y-4">
                    {campaigns.map((c) => {
                      const todayStr = new Date().toISOString().slice(0, 10);
                      const isActive = c.is_active && c.start_date <= todayStr && c.end_date >= todayStr;
                      const isUpcoming = c.start_date > todayStr;
                      const isExpired = c.end_date < todayStr;
                      const typeLabel = c.type === 'percentage' ? `%${c.discount_value} İndirim`
                        : c.type === 'fixed' ? `₺${c.discount_value} İndirim`
                        : c.type === 'today_special' ? 'Bugüne Özel'
                        : 'Son Dakika';
                      return (
                        <div key={c.id} className={`bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6 hover:shadow-xl transition-all ${isActive ? 'border-[#00A3AD]/30' : 'border-gray-100'}`}>
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-[#00A3AD]' : isUpcoming ? 'bg-amber-100' : 'bg-gray-100'}`}>
                            <Percent size={22} className={isActive ? 'text-white' : isUpcoming ? 'text-amber-500' : 'text-gray-400'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <p className="font-black text-sm uppercase tracking-tight text-black">{c.title}</p>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${isActive ? 'bg-[#00A3AD] text-white' : isUpcoming ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
                                {isActive ? 'Aktif' : isUpcoming ? 'Yakında' : 'Sona Erdi'}
                              </span>
                            </div>
                            <p className="text-[11px] font-bold text-[#00A3AD] uppercase tracking-wide">{typeLabel}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                              {c.start_date} → {c.end_date}
                              {c.service_ids?.length > 0 && ` · ${c.service_ids.length} hizmet`}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <button
                              onClick={async () => {
                                await supabase.from('campaigns').update({ is_active: !c.is_active }).eq('id', c.id);
                                setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, is_active: !x.is_active } : x));
                              }}
                              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${c.is_active ? 'bg-[#00A3AD]/10 text-[#00A3AD] hover:bg-red-50 hover:text-red-500' : 'bg-gray-100 text-gray-400 hover:bg-[#00A3AD]/10 hover:text-[#00A3AD]'}`}
                            >
                              {c.is_active ? 'Durdur' : 'Aktif Et'}
                            </button>
                            <button
                              onClick={() => { setEditingCampaign(c); setCampaignForm({ title: c.title, type: c.type, discount_value: c.discount_value?.toString() || "", start_date: c.start_date, end_date: c.end_date, service_ids: c.service_ids || [], is_active: c.is_active }); setIsCampaignModalOpen(true); }}
                              className="p-2 text-gray-400 hover:text-[#00A3AD] transition-colors"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button onClick={() => handleDeleteCampaign(c.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
                  <div className="space-y-2"><label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">E-posta</label><input name="email" type="email" defaultValue={shop?.email} placeholder="info@isletme.com" className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" /></div>
                  <div className="space-y-2"><label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Instagram</label><input name="instagram" defaultValue={shop?.instagram} placeholder="@kullaniciadi" className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" /></div>
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
                    <div className="space-y-2"><label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Posta Kodu</label><input name="postal_code" defaultValue={shop?.postal_code} placeholder="34000" className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" /></div>
                  </div>
                  <div className="space-y-2 mt-6">
                    <label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Google Maps Linki</label>
                    <input name="maps_link" defaultValue={shop?.maps_link} placeholder="https://maps.google.com/..." className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" />
                  </div>
                  {/* Map preview */}
                  {(shop?.district || shop?.city) && (
                    <div className="mt-6 rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
                      <div className="h-48">
                        <iframe
                          title="Harita önizleme"
                          className="w-full h-full border-0"
                          loading="lazy"
                          src={`https://maps.google.com/maps?q=${encodeURIComponent([shop.street, shop.building_no, shop.neighborhood, shop.district, shop.city].filter(Boolean).join(', '))}&output=embed&z=15`}
                        />
                      </div>
                      <div className="px-5 py-3 bg-gray-50">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Harita Önizleme — Adres değiştikten sonra kaydedin</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* İPTAL POLİTİKASI */}
                <div className="border-t border-gray-100 pt-10">
                  <p className="text-[10px] font-black text-[#00A3AD] uppercase tracking-widest mb-2">İptal & No-Show Politikası</p>
                  <p className="text-xs text-gray-400 font-medium mb-6">Bu metin, müşterilerin işletme profilinizde "İptal Politikası" butonuna tıkladığında gösterilir.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Ücretsiz İptal Süresi (saat)</label>
                      <input name="free_cancel_hours" type="number" min="0" max="168" defaultValue={shop?.free_cancel_hours ?? 24} placeholder="24" className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" />
                      <p className="ml-6 text-[9px] text-gray-300 font-bold uppercase tracking-widest">Randevudan kaç saat önce ücretsiz iptal edilebilir</p>
                    </div>
                    <div className="space-y-2">
                      <label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Depozito Bilgisi</label>
                      <input name="deposit_info" defaultValue={shop?.deposit_info} placeholder="örn. Randevu tutarının %30'u" className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" />
                    </div>
                  </div>
                  <div className="space-y-2 mt-6">
                    <label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">İptal Politikası Metni</label>
                    <textarea name="cancellation_policy" rows={4} defaultValue={shop?.cancellation_policy} placeholder="Randevunuzu belirtilen süre içinde iptal etmezseniz veya randevuya gelmezseniz işletme iptal/no-show politikası uygulayabilir. Nihai karar hizmet sağlayıcıya aittir." className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black resize-none" />
                  </div>
                  <div className="space-y-2 mt-6">
                    <label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">No-Show Açıklaması</label>
                    <textarea name="no_show_policy" rows={3} defaultValue={shop?.no_show_policy} placeholder="Randevuya haber vermeksizin gelmeyen müşteriler için uygulanan politika..." className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black resize-none" />
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

      {/* KAMPANYA MODALI */}
      {isCampaignModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <div className="bg-white w-full max-w-lg rounded-[4rem] p-12 relative animate-in zoom-in duration-300 text-black overflow-y-auto max-h-[90vh]">
            <button onClick={() => { setIsCampaignModalOpen(false); setEditingCampaign(null); }} className="absolute top-10 right-10 text-gray-300 hover:text-black transition-colors"><X size={28}/></button>
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-8">{editingCampaign ? "Kampanyayı Düzenle" : "Kampanya Oluştur"}</h3>
            <div className="space-y-5">
              <input
                placeholder="Kampanya başlığı *"
                className="w-full p-5 bg-gray-50 rounded-3xl font-black text-sm outline-none border-2 border-transparent focus:border-[#00A3AD] text-black"
                value={campaignForm.title}
                onChange={e => setCampaignForm(f => ({ ...f, title: e.target.value }))}
              />
              <div className="relative">
                <select
                  className="w-full p-5 bg-gray-50 rounded-3xl font-black text-sm outline-none border-2 border-transparent focus:border-[#00A3AD] text-black appearance-none"
                  value={campaignForm.type}
                  onChange={e => setCampaignForm(f => ({ ...f, type: e.target.value }))}
                >
                  <option value="percentage">Yüzde İndirim (%)</option>
                  <option value="fixed">Sabit Tutar İndirimi (₺)</option>
                  <option value="today_special">Bugüne Özel</option>
                  <option value="last_minute">Son Dakika</option>
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
              </div>
              {(campaignForm.type === 'percentage' || campaignForm.type === 'fixed') && (
                <input
                  type="number"
                  placeholder={campaignForm.type === 'percentage' ? "İndirim oranı (%) *" : "İndirim tutarı (₺) *"}
                  className="w-full p-5 bg-gray-50 rounded-3xl font-black text-sm outline-none border-2 border-transparent focus:border-[#00A3AD] text-black"
                  value={campaignForm.discount_value}
                  onChange={e => setCampaignForm(f => ({ ...f, discount_value: e.target.value }))}
                />
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="ml-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Başlangıç</label>
                  <input
                    type="date"
                    className="w-full p-5 bg-gray-50 rounded-3xl font-black text-sm outline-none border-2 border-transparent focus:border-[#00A3AD] text-black"
                    value={campaignForm.start_date}
                    onChange={e => setCampaignForm(f => ({ ...f, start_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="ml-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Bitiş</label>
                  <input
                    type="date"
                    className="w-full p-5 bg-gray-50 rounded-3xl font-black text-sm outline-none border-2 border-transparent focus:border-[#00A3AD] text-black"
                    value={campaignForm.end_date}
                    onChange={e => setCampaignForm(f => ({ ...f, end_date: e.target.value }))}
                  />
                </div>
              </div>
              {services.length > 0 && (
                <div>
                  <label className="ml-4 text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Hizmet Seç (isteğe bağlı — boşsa tümü geçerli)</label>
                  <div className="bg-gray-50 rounded-3xl p-4 space-y-2 max-h-40 overflow-y-auto">
                    {services.map((svc: any) => (
                      <label key={svc.id} className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={campaignForm.service_ids.includes(svc.id)}
                          onChange={e => setCampaignForm(f => ({
                            ...f,
                            service_ids: e.target.checked
                              ? [...f.service_ids, svc.id]
                              : f.service_ids.filter(id => id !== svc.id)
                          }))}
                          className="accent-[#00A3AD] w-4 h-4"
                        />
                        <span className="text-sm font-bold text-black group-hover:text-[#00A3AD] transition-colors">{svc.name} — ₺{svc.price}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={campaignForm.is_active}
                  onChange={e => setCampaignForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="accent-[#00A3AD] w-5 h-5"
                />
                <span className="font-black text-sm text-black">Hemen aktif et</span>
              </label>
              <button
                onClick={handleCampaignSubmit}
                disabled={savingCampaign || !campaignForm.title || !campaignForm.start_date || !campaignForm.end_date}
                className="w-full bg-[#00A3AD] text-white py-5 rounded-3xl font-black uppercase text-xs shadow-xl tracking-widest hover:bg-black transition-all disabled:opacity-30"
              >
                {savingCampaign ? "KAYDEDİLİYOR..." : editingCampaign ? "GÜNCELLE" : "YAYINLA"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERSONEL MODALI */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <div className="bg-white w-full max-w-md rounded-[4rem] p-10 relative animate-in zoom-in duration-300 text-black overflow-y-auto max-h-[90vh]">
            <button onClick={() => { setIsStaffModalOpen(false); setEditingStaff(null); setStaffForm({ firstName: "", lastName: "", avatarUrl: "", role: "", specialty: "" }); }} className="absolute top-8 right-8 text-gray-300 hover:text-black transition-colors"><X size={28}/></button>
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-8">{editingStaff ? "Personeli Düzenle" : "Personel Ekle"}</h3>
            <div className="flex flex-col items-center gap-5">
              <label className="relative cursor-pointer group">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-[#E6F6F7] border-4 border-white shadow-xl flex items-center justify-center">
                  {staffForm.avatarUrl ? <img src={staffForm.avatarUrl} className="w-full h-full object-cover" /> : <span className="text-3xl font-black text-[#00A3AD]">{staffForm.firstName?.charAt(0) || "?"}</span>}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all rounded-full">
                  <UploadCloud size={20} className="text-white" />
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0]; if(!file) return;
                  const url = await handleFileUpload(file, 'staff-avatars');
                  if(url) setStaffForm(f => ({...f, avatarUrl: url}));
                }} />
              </label>
              <div className="w-full grid grid-cols-2 gap-4">
                <input placeholder="İsim *" className="p-5 bg-gray-50 rounded-3xl font-black text-sm outline-none border-2 border-transparent focus:border-[#00A3AD] text-black" value={staffForm.firstName} onChange={e => setStaffForm(f => ({...f, firstName: e.target.value}))} />
                <input placeholder="Soyisim *" className="p-5 bg-gray-50 rounded-3xl font-black text-sm outline-none border-2 border-transparent focus:border-[#00A3AD] text-black" value={staffForm.lastName} onChange={e => setStaffForm(f => ({...f, lastName: e.target.value}))} />
              </div>
              <input placeholder="Rol (örn. Kuaför, Berber)" className="w-full p-5 bg-gray-50 rounded-3xl font-black text-sm outline-none border-2 border-transparent focus:border-[#00A3AD] text-black" value={staffForm.role} onChange={e => setStaffForm(f => ({...f, role: e.target.value}))} />
              <input placeholder="Uzmanlık (örn. Saç Boyama, Fade)" className="w-full p-5 bg-gray-50 rounded-3xl font-black text-sm outline-none border-2 border-transparent focus:border-[#00A3AD] text-black" value={staffForm.specialty} onChange={e => setStaffForm(f => ({...f, specialty: e.target.value}))} />
              <button onClick={handleStaffSubmit} disabled={savingStaff || !staffForm.firstName.trim() || !staffForm.lastName.trim()} className="w-full bg-[#00A3AD] text-white py-5 rounded-3xl font-black uppercase text-xs shadow-xl tracking-widest hover:bg-black transition-all disabled:opacity-30">
                {savingStaff ? "KAYDEDİLİYOR..." : editingStaff ? "GÜNCELLE" : "EKLE"}
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

      {/* RANDEVU DETAY MODALİ */}
      {selectedApt && (() => {
        const close = () => { setSelectedApt(null); setDetailRejectMode(false); setDetailRejectReason(''); setDetailRejectError(''); };
        const nameParts = (selectedApt.profiles?.full_name || 'M').split(' ');
        const initials = nameParts.map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
        const aptId = (selectedApt.id as string)?.slice(-8)?.toUpperCase() || '--------';
        const timeline = [
          { label: 'Randevu oluşturuldu', time: selectedApt.created_at as string | null, color: 'bg-blue-400' },
          ...(selectedApt.status !== 'Beklemede' ? [{
            label: `Durum güncellendi: ${selectedApt.status}`,
            time: (selectedApt.updated_at || selectedApt.created_at) as string | null,
            color: selectedApt.status === 'Onaylandı' ? 'bg-emerald-400' : selectedApt.status === 'İptal Edildi' ? 'bg-red-400' : selectedApt.status === 'Tamamlandı' ? 'bg-blue-500' : 'bg-gray-400',
          }] : []),
        ];
        return (
          <>
            <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm" onClick={close} />
            <div className="fixed z-[201] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[520px] max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 p-8 space-y-6">

              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <span className={`inline-block text-[10px] font-black uppercase px-3 py-1 rounded-full border ${calStatusCls[selectedApt.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {selectedApt.status}
                  </span>
                  <p className="text-[10px] font-bold text-gray-400 mt-1.5 uppercase tracking-widest">Randevu #{aptId}</p>
                </div>
                <button onClick={close} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-all text-gray-400 hover:text-black">
                  <X size={20} />
                </button>
              </div>

              {/* Müşteri kartı */}
              <div className="flex items-center gap-4 bg-gray-50 rounded-2xl p-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00A3AD] to-[#007a82] flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-black text-lg">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-black text-black truncate">{selectedApt.profiles?.full_name || 'Misafir'}</h4>
                  {selectedApt.profiles?.email && (
                    <p className="text-[11px] text-gray-400 font-medium truncate">{selectedApt.profiles.email}</p>
                  )}
                </div>
                {selectedApt.profiles?.phone && (
                  <div className="flex gap-2 flex-shrink-0">
                    <a href={`tel:${selectedApt.profiles.phone}`} className="w-10 h-10 flex items-center justify-center bg-black text-white rounded-xl hover:bg-[#00A3AD] transition-all" title="Ara">
                      <Phone size={16} />
                    </a>
                    <a href={`https://wa.me/${(selectedApt.profiles.phone as string).replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="w-10 h-10 flex items-center justify-center bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all" title="WhatsApp">
                      <MessageSquare size={16} />
                    </a>
                  </div>
                )}
              </div>

              {/* Detay grid */}
              <div className="grid grid-cols-2 gap-3">
                {([
                  { label: 'Tarih', value: selectedApt.appointment_date },
                  { label: 'Saat', value: (selectedApt.appointment_time as string)?.slice(0, 5) || '--:--' },
                  { label: 'Hizmet', value: selectedApt.service_name },
                  { label: 'Personel', value: selectedApt.staff ? `${selectedApt.staff.first_name} ${selectedApt.staff.last_name}` : 'Atanmadı' },
                  { label: 'Fiyat', value: `₺${selectedApt.price}` },
                  { label: 'Süre', value: selectedApt.duration_minutes ? `${selectedApt.duration_minutes} dk` : '—' },
                ] as { label: string; value: string }[]).map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-2xl px-4 py-3">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                    <p className="text-sm font-black text-black truncate">{value}</p>
                  </div>
                ))}
              </div>

              {/* Red gerekçesi */}
              {selectedApt.cancel_reason && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
                  <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-2">Red Gerekçesi</p>
                  <p className="text-sm text-red-500 font-medium">{selectedApt.cancel_reason}</p>
                </div>
              )}

              {/* Aksiyon butonları */}
              {!detailRejectMode && (
                <div className="flex flex-col gap-2">
                  {selectedApt.status === 'Beklemede' && (
                    <button onClick={handleDetailApprove} className="w-full py-3.5 bg-emerald-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-emerald-600 transition-all">
                      ✓ Onayla
                    </button>
                  )}
                  {selectedApt.status === 'Onaylandı' && (
                    <button onClick={handleDetailComplete} className="w-full py-3.5 bg-blue-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-600 transition-all">
                      ✓ Tamamlandı İşaretle
                    </button>
                  )}
                  {(selectedApt.status === 'Beklemede' || selectedApt.status === 'Onaylandı') && (
                    <>
                      <button onClick={() => setDetailRejectMode(true)} className="w-full py-3.5 bg-red-50 text-red-500 border border-red-100 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">
                        ✕ Reddet / İptal Et
                      </button>
                      <button onClick={handleDetailNoShow} className="w-full py-3.5 bg-gray-100 text-gray-600 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-gray-200 transition-all">
                        ⚠ Gelmedi (No-Show)
                      </button>
                    </>
                  )}
                  <button onClick={handleDetailDelete} className="w-full py-3 text-gray-400 text-[10px] font-black uppercase tracking-widest hover:text-red-500 transition-colors">
                    🗑 Randevuyu Kalıcı Sil
                  </button>
                </div>
              )}

              {/* Red formu */}
              {detailRejectMode && (
                <div className="bg-red-50 rounded-2xl p-5 space-y-4 animate-in slide-in-from-top-2">
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Red Gerekçesi — En az 10 kelime</p>
                  <textarea
                    rows={4}
                    placeholder="Müşteriye iletilecek red açıklamasını yazın..."
                    className="w-full bg-white rounded-xl p-4 text-sm font-bold text-black outline-none border-2 border-transparent focus:border-red-400 resize-none"
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

              {/* Aktivite zaman çizelgesi */}
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">Aktivite</p>
                <div className="space-y-3">
                  {timeline.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${item.color}`} />
                      <div>
                        <p className="text-xs font-bold text-black">{item.label}</p>
                        <p className="text-[10px] text-gray-400 font-medium">
                          {item.time ? new Date(item.time).toLocaleString('tr-TR') : '—'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </>
        );
      })()}
    </div>
  );
}
