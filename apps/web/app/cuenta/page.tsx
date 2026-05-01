'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Bell, CheckCircle2, ChevronRight, CreditCard, Eye, EyeOff, Heart, HelpCircle, Info, Languages, LogOut, MapPin, MessageSquare, PackageCheck, Send, ShieldCheck, Star, Ticket, Trash2, TriangleAlert, UserRound, Wallet } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useStoreLocale } from '@/context/LocaleContext';

type AccountSection = 'orders' | 'reviews' | 'profile' | 'coupons' | 'credit' | 'favorites' | 'addresses' | 'locale' | 'payments' | 'security' | 'notifications' | 'messages' | 'help';
type OrderFilter = 'all' | 'processing' | 'shipped' | 'delivered' | 'returns';
type AuthNoticeTone = 'success' | 'info' | 'warning' | 'error';
type AuthNotice = { tone: AuthNoticeTone; title: string; message: string; fields?: string[] };

const authNoticeStyles: Record<AuthNoticeTone, { wrap: string; icon: string; Icon: typeof AlertCircle }> = {
  success: { wrap: 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100', icon: 'bg-emerald-500/15 text-emerald-200', Icon: CheckCircle2 },
  info: { wrap: 'border-orange-400/35 bg-orange-500/10 text-orange-100', icon: 'bg-orange-500/15 text-orange-200', Icon: Info },
  warning: { wrap: 'border-yellow-400/35 bg-yellow-500/10 text-yellow-100', icon: 'bg-yellow-500/15 text-yellow-100', Icon: TriangleAlert },
  error: { wrap: 'border-red-400/35 bg-red-500/10 text-red-100', icon: 'bg-red-500/15 text-red-200', Icon: AlertCircle },
};

function authFieldMessages(error: unknown, t: (key: string) => string) {
  const errors = ((error as any)?.errors || (error as any)?.data?.errors || {}) as Record<string, string[] | undefined>;
  const fields: string[] = [];
  if (errors.name?.length) fields.push(t('auth.error.nameFormat'));
  if (errors.email?.length) fields.push(t('auth.error.emailFormat'));
  if (errors.password?.length) fields.push(t('auth.error.passwordFormat'));
  if (errors.code?.length) fields.push(t('auth.error.codeFormat'));
  if (errors.confirmPassword?.length) fields.push(t('auth.error.confirmPasswordFormat'));
  return fields;
}

function authErrorNotice(error: unknown, mode: 'login' | 'register', t: (key: string) => string): AuthNotice {
  const status = Number((error as any)?.status ?? -1);
  const raw = error instanceof Error ? error.message : '';
  const fields = authFieldMessages(error, t);

  if (status === 0) return { tone: 'warning', title: t('auth.notice.warning'), message: t('auth.error.network') };
  if (status === 408) return { tone: 'warning', title: t('auth.notice.warning'), message: t('auth.error.timeout') };
  if (fields.length) return { tone: 'error', title: t('auth.error.checkFields'), message: t('auth.error.fixFields'), fields };
  if (mode === 'register' && status === 409) return { tone: 'warning', title: t('auth.notice.warning'), message: t('auth.error.emailExists') };
  if (mode === 'login' && status === 401) return { tone: 'error', title: t('auth.notice.error'), message: t('auth.error.invalidCredentials') };
  if (status === 403 && /verificar|verify/i.test(raw)) return { tone: 'warning', title: t('auth.notice.warning'), message: t('auth.error.verifyEmail') };
  if (status === 403 && /bloquead|blocked/i.test(raw)) return { tone: 'error', title: t('auth.notice.error'), message: t('auth.error.blocked') };
  if (status === 423) return { tone: 'warning', title: t('auth.notice.warning'), message: t('auth.error.locked') };
  return { tone: 'error', title: t('auth.notice.error'), message: raw || t('auth.error.generic') };
}

function codeErrorNotice(error: unknown, t: (key: string) => string): AuthNotice {
  const status = Number((error as any)?.status ?? -1);
  const fields = authFieldMessages(error, t);
  if (fields.length) return { tone: 'error', title: t('auth.error.checkFields'), message: t('auth.error.fixFields'), fields };
  if (status === 0) return { tone: 'warning', title: t('auth.notice.warning'), message: t('auth.error.network') };
  if (status === 408) return { tone: 'warning', title: t('auth.notice.warning'), message: t('auth.error.timeout') };
  return { tone: 'error', title: t('auth.notice.error'), message: t('auth.error.invalidCodeDetail') };
}

const menu: { key: AccountSection; icon: ReactNode }[] = [
  { key: 'orders', icon: <PackageCheck size={19} /> },
  { key: 'reviews', icon: <Star size={19} /> },
  { key: 'profile', icon: <UserRound size={19} /> },
  { key: 'coupons', icon: <Ticket size={19} /> },
  { key: 'credit', icon: <Wallet size={19} /> },
  { key: 'favorites', icon: <Heart size={19} /> },
  { key: 'addresses', icon: <MapPin size={19} /> },
  { key: 'locale', icon: <Languages size={19} /> },
  { key: 'payments', icon: <CreditCard size={19} /> },
  { key: 'security', icon: <ShieldCheck size={19} /> },
  { key: 'notifications', icon: <Bell size={19} /> },
  { key: 'messages', icon: <MessageSquare size={19} /> },
  { key: 'help', icon: <HelpCircle size={19} /> },
];

const orderTabs: { key: OrderFilter; statuses?: string[] }[] = [
  { key: 'all' },
  { key: 'processing', statuses: ['PENDING', 'AWAITING_SHIPPING_CONFIRMATION', 'AWAITING_CUSTOMER_APPROVAL', 'PROCESSING', 'PACKED'] },
  { key: 'shipped', statuses: ['SHIPPED'] },
  { key: 'delivered', statuses: ['DELIVERED'] },
  { key: 'returns', statuses: ['CANCELLED', 'RETURNED', 'REFUNDED'] },
];

const rdProvinces = ['Azua', 'Baoruco', 'Barahona', 'Dajabon', 'Distrito Nacional', 'Duarte', 'El Seibo', 'Elias Pina', 'Espaillat', 'Hato Mayor', 'Hermanas Mirabal', 'Independencia', 'La Altagracia', 'La Romana', 'La Vega', 'Maria Trinidad Sanchez', 'Monsenor Nouel', 'Monte Cristi', 'Monte Plata', 'Pedernales', 'Peravia', 'Puerto Plata', 'Samana', 'San Cristobal', 'San Jose de Ocoa', 'San Juan', 'San Pedro de Macoris', 'Sanchez Ramirez', 'Santiago', 'Santiago Rodriguez', 'Santo Domingo', 'Valverde'];
const usStates = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'Ohio', 'Oregon', 'Pennsylvania', 'South Carolina', 'Tennessee', 'Texas', 'Utah', 'Virginia', 'Washington', 'Wisconsin'];
const rdCities: Record<string, string[]> = {
  'Distrito Nacional': ['Santo Domingo de Guzman'],
  'Santo Domingo': ['Santo Domingo Este', 'Santo Domingo Norte', 'Santo Domingo Oeste', 'Boca Chica', 'Los Alcarrizos', 'Pedro Brand'],
  Santiago: ['Santiago de los Caballeros', 'Tamboril', 'Villa Gonzalez', 'Licey al Medio'],
  'La Vega': ['La Vega', 'Jarabacoa', 'Constanza', 'Jima Abajo'],
  'Puerto Plata': ['Puerto Plata', 'Sosua', 'Cabarete', 'Imbert'],
  'La Romana': ['La Romana', 'Villa Hermosa', 'Guaymate'],
  'La Altagracia': ['Higuey', 'Bavaro', 'Punta Cana', 'San Rafael del Yuma'],
  'San Cristobal': ['San Cristobal', 'Bajos de Haina', 'Villa Altagracia', 'Cambita Garabitos'],
  'San Pedro de Macoris': ['San Pedro de Macoris', 'Consuelo', 'Quisqueya', 'Guayacanes'],
  Duarte: ['San Francisco de Macoris', 'Pimentel', 'Castillo', 'Villa Riva'],
  Samana: ['Samana', 'Las Terrenas', 'Sanchez'],
  Barahona: ['Barahona', 'Cabral', 'Enriquillo', 'Vicente Noble'],
  Azua: ['Azua de Compostela', 'Padre Las Casas', 'Las Yayas de Viajama'],
  Peravia: ['Bani', 'Nizao', 'Matanzas'],
  'San Juan': ['San Juan de la Maguana', 'Las Matas de Farfan', 'Bohechio'],
};
const usCities: Record<string, string[]> = {
  Florida: ['Miami', 'Orlando', 'Tampa', 'Jacksonville'],
  'New York': ['New York City', 'Buffalo', 'Rochester', 'Albany'],
  Texas: ['Houston', 'Dallas', 'Austin', 'San Antonio'],
  California: ['Los Angeles', 'San Diego', 'San Francisco', 'Sacramento'],
  'New Jersey': ['Newark', 'Jersey City', 'Paterson', 'Elizabeth'],
};

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium text-white/60">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-white/40">{hint}</span>}</label>;
}

function AuthNoticeBox({ notice }: { notice: AuthNotice }) {
  const style = authNoticeStyles[notice.tone];
  const Icon = style.Icon;
  return (
    <div role={notice.tone === 'error' ? 'alert' : 'status'} className={`rounded-2xl border p-4 text-sm shadow-[0_18px_50px_rgba(0,0,0,.18)] ${style.wrap}`}>
      <div className="flex gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl ${style.icon}`}><Icon size={18} /></span>
        <div className="min-w-0 flex-1">
          <b className="block text-base text-white">{notice.title}</b>
          <p className="mt-1 leading-relaxed">{notice.message}</p>
          {notice.fields?.length ? <ul className="mt-3 list-disc space-y-1 pl-5">{notice.fields.map(field => <li key={field}>{field}</li>)}</ul> : null}
        </div>
      </div>
    </div>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center"><h3 className="text-lg font-semibold text-white">{title}</h3><p className="mt-2 text-sm text-white/45">{text}</p></div>;
}

function Toggle({ checked, onChange, title, text }: { checked: boolean; onChange: (checked: boolean) => void; title: string; text: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition ${checked ? 'border-orange-400/50 bg-orange-500/10' : 'border-white/10 bg-white/[.035] hover:bg-white/[.055]'}`}>
      <span><b>{title}</b><span className="mt-1 block text-sm text-white/45">{text}</span></span>
      <span className={`relative h-7 w-12 rounded-full transition ${checked ? 'bg-orange-500' : 'bg-white/15'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${checked ? 'left-6' : 'left-1'}`} /></span>
    </button>
  );
}

const cardBrand = (digits: string) => {
  if (/^4/.test(digits)) return 'Visa';
  if (/^5[1-5]/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'American Express';
  if (/^6/.test(digits)) return 'Discover';
  return 'Card';
};

export default function CuentaPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user, login, register, verifyLoginCode, verifyEmail, resendVerification, updatePreferences, refreshMe, logout } = useAuth();
  const { favorites, removeFavorite } = useFavorites();
  const { country, language, currency, symbol, setCountry, setLanguage, setCurrency, formatPrice, t } = useStoreLocale();

  const [section, setSection] = useState<AccountSection>('orders');
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('all');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [enableEmailCodeLogin, setEnableEmailCodeLogin] = useState(false);
  const [challengeId, setChallengeId] = useState('');
  const [codeMode, setCodeMode] = useState<'none' | 'login' | 'email'>('none');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [authNotice, setAuthNotice] = useState<AuthNotice | null>(null);
  const [loading, setLoading] = useState(false);

  const [profileForm, setProfileForm] = useState({ name: '', whatsapp: '', preferredContact: 'SYSTEM', country: 'RD', region: '', language: 'es', currency: 'DOP', notifyOrders: true, notifyPromos: false, notifySupport: true, notifyDrops: true });
  const [addressForm, setAddressForm] = useState({ country: 'RD', province: '', city: '', line1: '', zip: '', isDefault: true });
  const [paymentForm, setPaymentForm] = useState({ cardNumber: '', holderName: '', expires: '', isDefault: true });
  const [ticketForm, setTicketForm] = useState({ subject: '', category: 'GENERAL', message: '', preferredContact: 'SYSTEM', contactWhatsapp: '' });
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const accountMenuLabels: Record<AccountSection, string> = {
    orders: t('account.orders'),
    reviews: t('account.reviews'),
    profile: t('account.profile'),
    coupons: t('account.coupons'),
    credit: t('account.credit'),
    favorites: t('account.favorites'),
    addresses: t('account.addresses'),
    locale: t('account.locale'),
    payments: t('account.payments'),
    security: t('account.security'),
    notifications: t('account.notifications'),
    messages: t('account.messages'),
    help: t('account.help'),
  };
  const orderLabels: Record<OrderFilter, string> = {
    all: t('orders.all'),
    processing: t('orders.processing'),
    shipped: t('orders.shipped'),
    delivered: t('orders.delivered'),
    returns: t('orders.returns'),
  };
  const contactLabels: Record<string, string> = { SYSTEM: t('contact.system'), WHATSAPP: t('contact.whatsapp') };
  const statusLabels: Record<string, string> = {
    OPEN: t('status.open'),
    WAITING_CUSTOMER: t('status.waitingCustomer'),
    ANSWERED: t('status.answered'),
    CLOSED: t('status.closed'),
    PENDING: t('status.pending'),
    AWAITING_SHIPPING_CONFIRMATION: t('status.awaitingShipping'),
    AWAITING_CUSTOMER_APPROVAL: t('status.awaitingApproval'),
    PROCESSING: t('status.processing'),
    PACKED: t('status.packed'),
    SHIPPED: t('status.shipped'),
    DELIVERED: t('status.delivered'),
    CANCELLED: t('status.cancelled'),
  };
  const helpCategories = [
    ['GENERAL', t('help.category.general')],
    ['ORDERS', t('help.category.orders')],
    ['SHIPPING', t('help.category.shipping')],
    ['RETURNS', t('help.category.returns')],
    ['PAYMENTS', t('help.category.payments')],
    ['ACCOUNT', t('help.category.account')],
  ] as const;

  const accountQuery = useQuery({ queryKey: ['account-preferences'], queryFn: () => api<any>('/account/preferences'), enabled: Boolean(user) });
  const orderQuery = useQuery({ queryKey: ['my-orders'], queryFn: () => api<any[]>('/orders/mine'), enabled: Boolean(user) });
  const addressQuery = useQuery({ queryKey: ['account-addresses'], queryFn: () => api<any[]>('/account/addresses'), enabled: Boolean(user) });
  const paymentQuery = useQuery({ queryKey: ['account-payments'], queryFn: () => api<any[]>('/account/payment-methods'), enabled: Boolean(user) });
  const ticketQuery = useQuery({ queryKey: ['account-tickets'], queryFn: () => api<any[]>('/account/tickets'), enabled: Boolean(user) });
  const messageQuery = useQuery({ queryKey: ['account-messages'], queryFn: () => api<any[]>('/account/messages'), enabled: Boolean(user) });

  useEffect(() => {
    const p = accountQuery.data;
    if (!p) return;
    setProfileForm({
      name: p.name || '',
      whatsapp: p.whatsapp || '',
      preferredContact: p.preferredContact === 'WHATSAPP' ? 'WHATSAPP' : 'SYSTEM',
      country: p.country || 'RD',
      region: p.region || '',
      language: p.language || 'es',
      currency: p.currency || 'DOP',
      notifyOrders: p.notifyOrders ?? true,
      notifyPromos: p.notifyPromos ?? false,
      notifySupport: p.notifySupport ?? true,
      notifyDrops: p.notifyDrops ?? true,
    });
    if (p.country === 'RD' || p.country === 'US') setCountry(p.country);
    if (p.language === 'es' || p.language === 'en') setLanguage(p.language);
    if (p.currency === 'DOP' || p.currency === 'USD') setCurrency(p.currency);
  }, [accountQuery.data, setCountry, setCurrency, setLanguage]);

  const provinceOptions = addressForm.country === 'RD' ? rdProvinces : usStates;
  const cityOptions = addressForm.country === 'RD'
    ? (rdCities[addressForm.province] || (addressForm.province ? [addressForm.province] : []))
    : (usCities[addressForm.province] || (addressForm.province ? [addressForm.province] : []));
  const activeTab = orderTabs.find(tab => tab.key === orderFilter) || orderTabs[0];
  const filteredOrders = useMemo(() => {
    const orders = orderQuery.data || [];
    if (orderFilter === 'all') return orders;
    return orders.filter(order => activeTab.statuses?.includes(order.status));
  }, [orderQuery.data, orderFilter, activeTab.statuses]);

  const orderDecision = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'ACCEPT' | 'CANCEL' }) => api('/orders/' + id + '/customer-decision', { method: 'POST', body: JSON.stringify({ decision }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-orders'] }),
  });
  const saveProfile = useMutation({
    mutationFn: (payload: any) => api('/account/preferences', { method: 'PATCH', body: JSON.stringify(payload) }),
    onSuccess: async (data: any) => {
      if (data.country === 'RD' || data.country === 'US') setCountry(data.country);
      if (data.language === 'es' || data.language === 'en') setLanguage(data.language);
      if (data.currency === 'DOP' || data.currency === 'USD') setCurrency(data.currency);
      await refreshMe();
      qc.invalidateQueries({ queryKey: ['account-preferences'] });
      setMsg(t('common.saved'));
    },
    onError: () => setMsg(t('common.saveError')),
  });
  const addAddress = useMutation({
    mutationFn: () => api('/account/addresses', { method: 'POST', body: JSON.stringify(addressForm) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account-addresses'] });
      setAddressForm({ country: 'RD', province: '', city: '', line1: '', zip: '', isDefault: true });
      setMsg(t('addresses.saved'));
    },
    onError: () => setMsg(t('addresses.saveError')),
  });
  const deleteAddress = useMutation({ mutationFn: (id: string) => api('/account/addresses/' + id, { method: 'DELETE' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['account-addresses'] }) });
  const addPayment = useMutation({
    mutationFn: () => {
      const digits = paymentForm.cardNumber.replace(/\D/g, '');
      if (digits.length < 12) throw new Error(t('payments.invalidNumber'));
      if (!paymentForm.holderName.trim()) throw new Error(t('payments.invalidHolder'));
      if (!/^\d{2}\/\d{2}$/.test(paymentForm.expires)) throw new Error(t('payments.invalidExpires'));
      return api('/account/payment-methods', { method: 'POST', body: JSON.stringify({ type: 'CARD', label: `${cardBrand(digits)} ${t('payments.ending')} ${digits.slice(-4)}`, brand: cardBrand(digits), last4: digits.slice(-4), holderName: paymentForm.holderName, isDefault: paymentForm.isDefault }) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account-payments'] });
      setPaymentForm({ cardNumber: '', holderName: '', expires: '', isDefault: true });
      setMsg(t('payments.saved'));
    },
    onError: (e: any) => setMsg(e.message || t('payments.saveError')),
  });
  const deletePayment = useMutation({ mutationFn: (id: string) => api('/account/payment-methods/' + id, { method: 'DELETE' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['account-payments'] }) });
  const createTicket = useMutation({
    mutationFn: () => api('/account/tickets', { method: 'POST', body: JSON.stringify({ ...ticketForm, contactPhone: null }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account-tickets'] });
      qc.invalidateQueries({ queryKey: ['account-messages'] });
      setTicketForm({ subject: '', category: 'GENERAL', message: '', preferredContact: 'SYSTEM', contactWhatsapp: '' });
      setSection('messages');
    },
    onError: () => setMsg(t('help.ticketError')),
  });
  const replyTicket = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => api('/account/tickets/' + id + '/messages', { method: 'POST', body: JSON.stringify({ body }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account-tickets'] });
      qc.invalidateQueries({ queryKey: ['account-messages'] });
      setReplyText({});
    },
  });
  const changePassword = useMutation({
    mutationFn: () => api('/account/security/password', { method: 'PATCH', body: JSON.stringify(passwordForm) }),
    onSuccess: () => {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMsg(t('security.passwordUpdated'));
    },
    onError: () => setMsg(t('security.passwordError')),
  });

  const switchMode = (next: 'login' | 'register') => {
    setMode(next);
    setMsg('');
    setAuthNotice(null);
    setCodeMode('none');
    setPassword('');
    if (next === 'register') {
      setEmail('');
      setName('');
    }
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    setAuthNotice(null);
    try {
      if (mode === 'register') {
        const data: any = await register(name, email, password, enableEmailCodeLogin);
        if (data?.requiresEmailVerification) {
          setCodeMode('email');
          setAuthNotice({ tone: 'info', title: t('auth.notice.info'), message: t('auth.createdVerify') });
        } else {
          setMode('login');
          setPassword('');
          setAuthNotice({ tone: 'success', title: t('auth.notice.success'), message: t('auth.createdLogin') });
        }
      } else {
        const result: any = await login(email, password);
        if (result?.requiresCode) {
          setChallengeId(result.challengeId);
          setCodeMode('login');
          setAuthNotice({ tone: 'info', title: t('auth.notice.info'), message: t('auth.loginCodeSent') });
          return;
        }
        if (result?.requiresEmailVerification) {
          setCodeMode('email');
          setAuthNotice({ tone: 'warning', title: t('auth.notice.warning'), message: t('auth.mustVerify') });
          return;
        }
        if (result?.user?.role !== 'CUSTOMER') router.push('/dixnissowner');
      }
    } catch (error) {
      setAuthNotice(authErrorNotice(error, mode, t));
    } finally {
      setLoading(false);
    }
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    setAuthNotice(null);
    try {
      if (codeMode === 'login') {
        await verifyLoginCode(challengeId, code);
        const saved = localStorage.getItem('mb_user');
        const savedUser = saved ? JSON.parse(saved) : null;
        if (savedUser?.role !== 'CUSTOMER') router.push('/dixnissowner');
      } else {
        await verifyEmail(email, code);
        setCodeMode('none');
        setMode('login');
        setCode('');
        setPassword('');
        setAuthNotice({ tone: 'success', title: t('auth.notice.success'), message: t('auth.emailVerified') });
      }
    } catch (error) {
      setAuthNotice(codeErrorNotice(error, t));
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setLoading(true);
    setMsg('');
    setAuthNotice(null);
    try {
      const data = await resendVerification(email);
      setAuthNotice({ tone: 'info', title: t('auth.notice.info'), message: data?.message || t('auth.codeResent') });
    } catch (error) {
      setAuthNotice(authErrorNotice(error, mode, t));
    } finally {
      setLoading(false);
    }
  }

  async function toggle2FA(next: boolean) {
    setLoading(true);
    setMsg('');
    try {
      await updatePreferences({ twoFactorEmailEnabled: next });
      setMsg(next ? t('security.2faOn') : t('security.2faOff'));
    } catch {
      setMsg(t('security.preferenceError'));
    } finally {
      setLoading(false);
    }
  }

  if (user) return <section className="min-h-screen bg-[#050403] px-4 pb-16 pt-24 text-white md:px-6">
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-white/45">{t('account.breadcrumb')}</p>
          <h1 className="mt-2 text-3xl font-semibold">{t('account.hello')}, {user.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full border border-white/10 bg-white/[.04] px-4 py-2">{language.toUpperCase()} · {currency} · {symbol}</span>
          {user.role !== 'CUSTOMER' && <Link href="/dixnissowner" className="btn-ghost">{t('account.adminPanel')}</Link>}
          <button onClick={logout} className="inline-flex items-center gap-2 rounded-2xl border border-orange-400/30 bg-orange-500 px-5 py-3 text-sm font-black uppercase tracking-[.12em] text-black shadow-lg shadow-orange-500/15 transition hover:bg-orange-400"><LogOut size={17} /> {t('account.logout')}</button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
        <aside className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:block lg:space-y-1 lg:overflow-visible lg:px-0 lg:pb-0">
          {menu.map(item => (
            <button key={item.key} onClick={() => setSection(item.key)} className={`flex min-w-[210px] items-center justify-between rounded-xl px-4 py-3 text-left text-sm transition lg:w-full lg:min-w-0 ${section === item.key ? 'bg-orange-500 text-black' : 'text-white/72 hover:bg-white/[.06] hover:text-white'}`}>
              <span className="flex items-center gap-3">{item.icon}{accountMenuLabels[item.key]}</span>
              <ChevronRight size={16} className={section === item.key ? 'opacity-100' : 'opacity-35'} />
            </button>
          ))}
        </aside>

        <AnimatePresence mode="wait">
          <motion.main
            key={section}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="min-w-0"
          >
            {section === 'orders' && <div className="space-y-5">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <h2 className="text-2xl font-semibold">{t('account.orders')}</h2>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {orderTabs.map(tab => <button key={tab.key} onClick={() => setOrderFilter(tab.key)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm transition ${orderFilter === tab.key ? 'bg-orange-500 text-black' : 'bg-white/[.05] text-white/60 hover:bg-white/10 hover:text-white'}`}>{orderLabels[tab.key]}</button>)}
                </div>
              </div>
              {filteredOrders.length ? filteredOrders.map((o: any) => {
                const activeIndex = o.status === 'DELIVERED' ? 3 : o.status === 'SHIPPED' ? 2 : o.status === 'PACKED' ? 1 : o.status === 'PROCESSING' ? 0 : -1;
                const orderCurrency = o.currency === 'USD' ? 'US$' : 'RD$';
                return <article key={o.id} className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <b>{t('orders.order')} #{o.id.slice(0, 8)}</b>
                      <p className="mt-1 text-sm text-white/45">{statusLabels[o.status] || o.status} · {t('orders.total')} {orderCurrency} {Number(o.total || 0).toLocaleString(language === 'en' ? 'en-US' : 'es-DO')}</p>
                      {o.shippingPrice ? <p className="mt-1 text-xs text-white/35">{t('orders.shipping')}: {orderCurrency} {Number(o.shippingPrice).toLocaleString(language === 'en' ? 'en-US' : 'es-DO')}</p> : null}
                    </div>
                    {o.awaitingCustomerApproval && <div className="flex gap-2"><button onClick={() => orderDecision.mutate({ id: o.id, decision: 'ACCEPT' })} className="rounded-full bg-green-500 px-4 py-2 text-sm font-bold text-black">{t('orders.approveShipping')}</button><button onClick={() => orderDecision.mutate({ id: o.id, decision: 'CANCEL' })} className="rounded-full bg-red-500/20 px-4 py-2 text-sm text-red-100">{t('orders.cancelOrder')}</button></div>}
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-2 text-center text-xs md:grid-cols-4"><span className={`rounded-full py-2 ${activeIndex >= 0 ? 'bg-orange-500/25 text-orange-100' : 'bg-white/10 text-white/35'}`}>{t('orders.stepProcessing')}</span><span className={`rounded-full py-2 ${activeIndex >= 1 ? 'bg-orange-500/25 text-orange-100' : 'bg-white/10 text-white/35'}`}>{t('orders.stepPacked')}</span><span className={`rounded-full py-2 ${activeIndex >= 2 ? 'bg-orange-500/25 text-orange-100' : 'bg-white/10 text-white/35'}`}>{t('orders.stepShipped')}</span><span className={`rounded-full py-2 ${activeIndex >= 3 ? 'bg-green-500/25 text-green-100' : 'bg-white/10 text-white/35'}`}>{t('orders.stepDelivered')}</span></div>
                  {(o.deliveryPlace || o.driverName || o.shippingReference || o.shippingInvoiceUrl || o.shippingInvoicePdfUrl) && <div className="mt-4 rounded-2xl bg-black/25 p-4 text-sm text-white/55"><p>{o.deliveryPlace ? `${t('orders.deliveryPlace')}: ${o.deliveryPlace}` : ''}</p><p>{o.driverName ? `${t('orders.driver')}: ${o.driverName} ${o.driverPhone || ''}` : ''}</p><p>{o.shippingReference ? `${t('orders.reference')}: ${o.shippingReference}` : ''}</p>{o.shippingInvoiceUrl && <a className="mr-4 text-orange-200 underline" href={o.shippingInvoiceUrl} target="_blank">{t('orders.uploadedInvoice')}</a>}{o.shippingInvoicePdfUrl && <a className="text-orange-200 underline" href={o.shippingInvoicePdfUrl} target="_blank">{t('orders.generatedPdf')}</a>}</div>}
                </article>;
              }) : <Empty title={t(`orders.empty.${activeTab.key}.title`)} text={t(`orders.empty.${activeTab.key}.text`)} />}
            </div>}

            {section === 'profile' && <div className="space-y-5"><h2 className="text-2xl font-semibold">{t('account.profile')}</h2><div className="grid gap-4 md:grid-cols-2"><Field label={t('profile.name')}><input className="input-dark" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} /></Field><Field label={t('profile.email')}><input className="input-dark" value={user.email} disabled /></Field><Field label={t('profile.whatsapp')}><input className="input-dark" value={profileForm.whatsapp} onChange={e => setProfileForm({ ...profileForm, whatsapp: e.target.value })} /></Field><Field label={t('profile.preferredContact')}><select className="input-dark" value={profileForm.preferredContact} onChange={e => setProfileForm({ ...profileForm, preferredContact: e.target.value })}>{Object.entries(contactLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field></div><button className="btn-ember" onClick={() => saveProfile.mutate({ name: profileForm.name, whatsapp: profileForm.whatsapp, phone: null, preferredContact: profileForm.preferredContact })}>{t('profile.save')}</button></div>}

            {section === 'addresses' && <div className="space-y-5"><h2 className="text-2xl font-semibold">{t('account.addresses')}</h2><div className="grid gap-4 md:grid-cols-2"><Field label={t('addresses.country')}><select className="input-dark" value={addressForm.country} onChange={e => setAddressForm({ ...addressForm, country: e.target.value, province: '', city: '', zip: e.target.value === 'US' ? '' : addressForm.zip })}><option value="RD">{t('common.countryRD')}</option><option value="US">{t('common.countryUS')}</option></select></Field><Field label={addressForm.country === 'RD' ? t('addresses.province') : t('addresses.state')} hint={t('addresses.provinceHint')}><input className="input-dark" list="province-options" value={addressForm.province} onChange={e => setAddressForm({ ...addressForm, province: e.target.value, city: '' })} /><datalist id="province-options">{provinceOptions.map(p => <option key={p} value={p} />)}</datalist></Field><Field label={t('addresses.city')} hint={t('addresses.cityHint')}><input className="input-dark" list="city-options" value={addressForm.city} onChange={e => setAddressForm({ ...addressForm, city: e.target.value })} /><datalist id="city-options">{cityOptions.map(c => <option key={c} value={c} />)}</datalist></Field><Field label={t('addresses.zip')}><input className="input-dark" value={addressForm.zip} onChange={e => setAddressForm({ ...addressForm, zip: e.target.value })} /></Field><div className="md:col-span-2"><Field label={t('addresses.full')}><input className="input-dark" value={addressForm.line1} onChange={e => setAddressForm({ ...addressForm, line1: e.target.value })} placeholder={t('addresses.placeholder')} /></Field></div><label className="flex items-center gap-2 text-sm text-white/60"><input type="checkbox" checked={addressForm.isDefault} onChange={e => setAddressForm({ ...addressForm, isDefault: e.target.checked })} /> {t('addresses.default')}</label></div><button className="btn-ember" onClick={() => addAddress.mutate()}>{t('addresses.add')}</button><div className="grid gap-3">{addressQuery.data?.map((a: any) => <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.035] p-4"><div><b>{a.line1}</b><p className="text-sm text-white/45">{a.city} · {a.province} · {a.country} {a.zip ? `· ${a.zip}` : ''} {a.isDefault ? `· ${t('common.default')}` : ''}</p></div><button className="btn-ghost" onClick={() => deleteAddress.mutate(a.id)}>{t('common.delete')}</button></div>)}</div></div>}

            {section === 'locale' && <div className="space-y-5"><h2 className="text-2xl font-semibold">{t('account.locale')}</h2><div className="grid gap-4 md:grid-cols-2"><Field label={t('addresses.country')}><select className="input-dark" value={profileForm.country} onChange={e => setProfileForm({ ...profileForm, country: e.target.value, currency: e.target.value === 'US' ? 'USD' : 'DOP' })}><option value="RD">{t('common.countryRD')}</option><option value="US">{t('common.countryUS')}</option></select></Field><Field label={t('locale.region')}><input className="input-dark" value={profileForm.region} onChange={e => setProfileForm({ ...profileForm, region: e.target.value })} /></Field><Field label={t('locale.language')}><select className="input-dark" value={profileForm.language} onChange={e => setProfileForm({ ...profileForm, language: e.target.value })}><option value="es">{t('locale.spanish')}</option><option value="en">{t('locale.english')}</option></select></Field><Field label={t('locale.currency')}><select className="input-dark" value={profileForm.currency} onChange={e => setProfileForm({ ...profileForm, currency: e.target.value })}><option value="DOP">RD$ / DOP</option><option value="USD">US$ / USD</option></select></Field></div><p className="text-sm text-white/45">{t('locale.current')}: {country} · {language.toUpperCase()} · {currency}</p><button className="btn-ember" onClick={() => saveProfile.mutate({ country: profileForm.country, region: profileForm.region, language: profileForm.language, currency: profileForm.currency })}>{t('common.save')}</button></div>}

            {section === 'payments' && <div className="space-y-5"><h2 className="text-2xl font-semibold">{t('payments.title')}</h2><div className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><div className="grid gap-4 md:grid-cols-2"><Field label={t('payments.holder')}><input className="input-dark" value={paymentForm.holderName} onChange={e => setPaymentForm({ ...paymentForm, holderName: e.target.value })} /></Field><Field label={t('payments.number')} hint={t('payments.securityHint')}><input className="input-dark" inputMode="numeric" maxLength={19} value={paymentForm.cardNumber} onChange={e => setPaymentForm({ ...paymentForm, cardNumber: e.target.value.replace(/[^\d ]/g, '') })} /></Field><Field label={t('payments.expires')}><input className="input-dark" placeholder="MM/YY" maxLength={5} value={paymentForm.expires} onChange={e => setPaymentForm({ ...paymentForm, expires: e.target.value.replace(/[^\d/]/g, '') })} /></Field><label className="flex items-center gap-2 self-end text-sm text-white/60"><input type="checkbox" checked={paymentForm.isDefault} onChange={e => setPaymentForm({ ...paymentForm, isDefault: e.target.checked })} /> {t('payments.default')}</label></div><button className="btn-ember mt-5" onClick={() => addPayment.mutate()}>{t('payments.add')}</button></div><div className="grid gap-3">{paymentQuery.data?.map((p: any) => <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.035] p-4"><div><b>{p.holderName || p.label}</b><p className="text-sm text-white/45">{p.brand || t('payments.card')} ···· {p.last4 || '0000'} {p.isDefault ? `· ${t('common.default')}` : ''}</p></div><button className="btn-ghost" onClick={() => deletePayment.mutate(p.id)}>{t('common.delete')}</button></div>)}</div></div>}

            {section === 'security' && <div className="space-y-5"><h2 className="text-2xl font-semibold">{t('account.security')}</h2><Toggle checked={Boolean(user.twoFactorEmailEnabled)} onChange={toggle2FA} title={t('security.emailCode')} text={t('security.emailCodeText')} /><div className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><h3 className="text-lg font-semibold">{t('security.changePassword')}</h3><div className="mt-4 grid gap-4 md:grid-cols-3"><Field label={t('security.currentPassword')}><input className="input-dark" type="password" value={passwordForm.currentPassword} onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} /></Field><Field label={t('security.newPassword')}><input className="input-dark" type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} /></Field><Field label={t('security.confirmPassword')}><input className="input-dark" type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} /></Field></div><button className="btn-ember mt-5" onClick={() => changePassword.mutate()}>{t('security.updatePassword')}</button></div><button onClick={logout} className="btn-ghost inline-flex">{t('security.signOutDevice')}</button></div>}

            {section === 'notifications' && <div className="space-y-5"><h2 className="text-2xl font-semibold">{t('notifications.title')}</h2><div className="grid gap-3 md:grid-cols-2"><Toggle checked={profileForm.notifyOrders} onChange={v => setProfileForm({ ...profileForm, notifyOrders: v })} title={t('notifications.ordersTitle')} text={t('notifications.ordersText')} /><Toggle checked={profileForm.notifyDrops} onChange={v => setProfileForm({ ...profileForm, notifyDrops: v })} title={t('notifications.dropsTitle')} text={t('notifications.dropsText')} /><Toggle checked={profileForm.notifySupport} onChange={v => setProfileForm({ ...profileForm, notifySupport: v })} title={t('notifications.supportTitle')} text={t('notifications.supportText')} /><Toggle checked={profileForm.notifyPromos} onChange={v => setProfileForm({ ...profileForm, notifyPromos: v })} title={t('notifications.promosTitle')} text={t('notifications.promosText')} /></div><button className="btn-ember" onClick={() => saveProfile.mutate({ notifyOrders: profileForm.notifyOrders, notifyDrops: profileForm.notifyDrops, notifySupport: profileForm.notifySupport, notifyPromos: profileForm.notifyPromos })}>{t('notifications.save')}</button></div>}

            {section === 'help' && <div className="space-y-5"><h2 className="text-2xl font-semibold">{t('account.help')}</h2><div className="grid gap-4 md:grid-cols-2"><Field label={t('help.subject')}><input className="input-dark" value={ticketForm.subject} onChange={e => setTicketForm({ ...ticketForm, subject: e.target.value })} /></Field><Field label={t('help.category')}><select className="input-dark" value={ticketForm.category} onChange={e => setTicketForm({ ...ticketForm, category: e.target.value })}>{helpCategories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label={t('help.preferredContact')}><select className="input-dark" value={ticketForm.preferredContact} onChange={e => setTicketForm({ ...ticketForm, preferredContact: e.target.value })}>{Object.entries(contactLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field><Field label={t('profile.whatsapp')}><input className="input-dark" value={ticketForm.contactWhatsapp} onChange={e => setTicketForm({ ...ticketForm, contactWhatsapp: e.target.value })} /></Field><div className="md:col-span-2"><Field label={t('help.message')}><textarea className="input-dark min-h-[130px]" value={ticketForm.message} onChange={e => setTicketForm({ ...ticketForm, message: e.target.value })} /></Field></div></div><button className="btn-ember" onClick={() => createTicket.mutate()}><Send size={16} /> {t('help.openTicket')}</button></div>}

            {section === 'messages' && <div className="space-y-5"><h2 className="text-2xl font-semibold">{t('account.messages')}</h2>{messageQuery.data?.length ? <div className="space-y-3">{messageQuery.data.map((m: any) => <div key={`${m.type}-${m.id}`} className="rounded-2xl border border-white/10 bg-white/[.035] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><b>{m.title}</b><span className="text-xs text-white/35">{new Date(m.createdAt).toLocaleString(language === 'en' ? 'en-US' : 'es-DO')}</span></div><p className="mt-2 text-sm text-white/60">{m.body}</p><p className="mt-2 text-xs text-orange-200">{m.from}</p></div>)}</div> : <Empty title={t('messages.emptyTitle')} text={t('messages.emptyText')} />}{ticketQuery.data?.length ? <div className="mt-6 space-y-4"><h3 className="text-lg font-semibold">{t('messages.tickets')}</h3>{ticketQuery.data.map((ticket: any) => <div key={ticket.id} className="rounded-2xl border border-white/10 bg-black/25 p-4"><div className="flex flex-wrap justify-between gap-2"><b>{ticket.subject}</b><span className="text-sm text-orange-200">{statusLabels[ticket.status] || ticket.status}</span></div><div className="mt-3 space-y-2">{ticket.messages.map((m: any) => <p key={m.id} className={`rounded-xl px-3 py-2 text-sm ${m.fromStaff ? 'bg-orange-500/10 text-orange-50' : 'bg-white/[.05] text-white/60'}`}>{m.body}</p>)}</div><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input className="input-dark" value={replyText[ticket.id] || ''} onChange={e => setReplyText({ ...replyText, [ticket.id]: e.target.value })} placeholder={t('messages.replyPlaceholder')} /><button className="btn-ember" onClick={() => replyTicket.mutate({ id: ticket.id, body: replyText[ticket.id] || '' })}>{t('common.send')}</button></div></div>)}</div> : null}</div>}

            {section === 'favorites' && <div className="space-y-5"><h2 className="text-2xl font-semibold">{t('account.favorites')}</h2>{favorites.length ? <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{favorites.map((product) => <article key={product.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.035]"><Link href={`/producto?slug=${encodeURIComponent(product.slug)}`}><div className="aspect-square bg-white/[.04]">{product.imageUrl || product.mainImage ? <img src={product.imageUrl || product.mainImage || ''} alt={product.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-white/25"><Heart /></div>}</div><div className="p-4"><h3 className="line-clamp-2 min-h-[44px] text-sm font-semibold leading-snug">{product.name}</h3>{product.description && <p className="mt-2 line-clamp-2 text-xs text-white/45">{product.description}</p>}<p className="mt-3 font-bold">{formatPrice(product)}</p></div></Link><button onClick={() => removeFavorite(product.id)} className="mx-4 mb-4 flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 hover:text-red-100"><Trash2 size={15} /> {t('favorites.remove')}</button></article>)}</div> : <Empty title={t('favorites.emptyTitle')} text={t('favorites.emptyText')} />}</div>}

            {section === 'coupons' && <div className="space-y-5"><h2 className="text-2xl font-semibold">{t('account.coupons')}</h2><Empty title={t('coupons.emptyTitle')} text={t('coupons.emptyText')} /></div>}
            {section === 'credit' && <div className="space-y-5"><h2 className="text-2xl font-semibold">{t('account.credit')}</h2><Empty title={t('credit.emptyTitle')} text={t('credit.emptyText')} /></div>}
            {section === 'reviews' && <div className="space-y-5"><h2 className="text-2xl font-semibold">{t('account.reviews')}</h2><Empty title={t('reviews.emptyTitle')} text={t('reviews.emptyText')} /></div>}

            {msg && <p className="mt-6 rounded-2xl border border-orange-400/30 bg-orange-500/10 p-3 text-sm text-orange-100">{msg}</p>}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  </section>;

  const isRegister = mode === 'register';

  return <section className="min-h-screen px-4 pt-28 text-white">
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[.9fr_1.1fr]">
      <div className="rounded-[2rem] border border-white/10 bg-white/[.035] p-8">
        <div className="mb-5 inline-flex rounded-full border border-white/10 px-4 py-2 text-xs text-white/55">{t('auth.badge')}</div>
        <h1 className="text-3xl font-semibold md:text-5xl">{isRegister ? t('auth.createAccount') : t('auth.signIn')}</h1>
        <p className="mt-4 max-w-xl text-white/55">{isRegister ? t('auth.registerIntro') : t('auth.loginIntro')}</p>
      </div>
      <form onSubmit={codeMode === 'none' ? submit : submitCode} autoComplete="off" className="rounded-[2rem] border border-white/10 bg-white/[.035] p-8">
        {codeMode === 'none' && <div className="mb-6 flex rounded-2xl bg-black/40 p-1"><button type="button" onClick={() => switchMode('login')} className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold ${mode === 'login' ? 'bg-orange-500 text-black' : 'text-white/55'}`}>{t('auth.signIn')}</button><button type="button" onClick={() => switchMode('register')} className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold ${mode === 'register' ? 'bg-orange-500 text-black' : 'text-white/55'}`}>{t('auth.createAccount')}</button></div>}
        <div className="space-y-4">
          {codeMode === 'none' ? <>
            {isRegister && <label className="block"><span className="mb-2 block text-sm text-white/60">{t('auth.displayName')}</span><input className="input-dark" autoComplete="name" placeholder={t('auth.displayNamePlaceholder')} value={name} onChange={e => setName(e.target.value)} /></label>}
            <label className="block"><span className="mb-2 block text-sm text-white/60">{t('auth.email')}</span><input className="input-dark" autoComplete={isRegister ? 'off' : 'email'} name={isRegister ? 'new_email' : 'email'} placeholder={t('auth.emailPlaceholder')} type="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
            <label className="block"><span className="mb-2 block text-sm text-white/60">{t('auth.password')}</span><div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/35 px-4 py-3"><input className="w-full bg-transparent text-sm outline-none placeholder:text-white/25" autoComplete={isRegister ? 'new-password' : 'current-password'} name={isRegister ? 'new_password' : 'password'} placeholder={t('auth.password')} type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="text-white/50 hover:text-white">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{isRegister && <p className="mt-2 text-xs text-white/40">{t('auth.passwordHint')}</p>}</label>
            {isRegister && <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/65"><input type="checkbox" checked={enableEmailCodeLogin} onChange={e => setEnableEmailCodeLogin(e.target.checked)} className="mt-1 accent-orange-500" /><span>{t('auth.emailCodeOptIn')} <b className="text-white/80">{t('auth.emailCodeOptInBold')}</b></span></label>}
          </> : <><p className="text-sm text-white/55">{t('auth.codeSent')} <b>{email}</b>.</p><input className="input-dark text-center tracking-[.5em]" placeholder="000000" inputMode="numeric" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} /></>}
          <button disabled={loading} className="btn-ember w-full justify-center">{loading ? `${t('common.processing')}...` : codeMode === 'none' ? (mode === 'login' ? t('auth.enter') : t('auth.createAccount')) : t('auth.verifyCode')}</button>
          {codeMode === 'email' && <button type="button" disabled={loading} onClick={resend} className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm text-white/60 hover:text-white">{t('auth.resendCode')}</button>}
          {authNotice && <AuthNoticeBox notice={authNotice} />}
        </div>
      </form>
    </div>
  </section>;
}
