'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Step = 1 | 2 | 3;
type BusinessType = 'cafe' | 'bakery' | 'cloud';

export default function OnboardingPage() {
  const router = useRouter();

  // Step tracking with browser history awareness
  const [step, setStep] = useState<Step>(1);

  const goToStep = useCallback((newStep: Step) => {
    setStep(newStep);
    if (typeof window !== 'undefined') {
      window.history.pushState({ step: newStep }, '', `?step=${newStep}`);
    }
  }, []);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && typeof e.state.step === 'number') {
        setStep(e.state.step as Step);
      } else {
        setStep(1);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Step 1: Auth State
  const [phone, setPhone] = useState('9845011223');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Step 2: Cafe Details
  const [outletName, setOutletName] = useState('');
  const [city, setCity] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('cafe');
  const [tableCount, setTableCount] = useState(8);
  const [isCounterOnly, setIsCounterOnly] = useState(false);
  const [closingTime, setClosingTime] = useState('23:00');
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  const [wifiName, setWifiName] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [savingLoading, setSavingLoading] = useState(false);

  // Step 3: Preview Item Selection
  const [selectedPreview, setSelectedPreview] = useState({
    name: 'Flat White (Oat Milk)',
    price: '₹260',
    meta: 'Beverage • Double Ristretto',
  });

  // Handle Send OTP
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send-otp', phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');

      setOtpSent(true);
      setOtp('123456'); // Pre-fill test OTP for instantaneous onboarding
    } catch (err: unknown) {
      if (err instanceof Error) {
        setAuthError(err.message);
      } else {
        setAuthError('An error occurred');
      }
    } finally {
      setAuthLoading(false);
    }
  }

  // Handle Verify OTP
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify-otp', phone, otp, name: 'Chef Kabir' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid OTP code');

      // If cafe is already active & configured, skip wizard directly to POS
      if (data.hasExistingSetup) {
        router.push('/pos');
        return;
      }

      // Pre-fill state with existing cafe details if available
      if (data.cafe) {
        if (data.cafe.name && data.cafe.name !== 'My Cafe') setOutletName(data.cafe.name);
        if (data.cafe.city) setCity(data.cafe.city);
        if (data.cafe.closingTime) setClosingTime(data.cafe.closingTime);
        if (data.cafe.googleReviewUrl) setGoogleReviewUrl(data.cafe.googleReviewUrl);
        if (data.cafe.wifiName) setWifiName(data.cafe.wifiName);
        if (data.cafe.wifiPassword) setWifiPassword(data.cafe.wifiPassword);
        if (data.cafe.tables && data.cafe.tables.length > 0) {
          const nonTakeaway = data.cafe.tables.filter((t: any) => t.tableNumber !== 'Takeaway');
          if (nonTakeaway.length > 0) setTableCount(nonTakeaway.length);
        }
      }

      goToStep(2);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setAuthError(err.message);
      } else {
        setAuthError('An error occurred');
      }
    } finally {
      setAuthLoading(false);
    }
  }

  // Handle Google Login Shortcut
  async function handleGoogleLogin() {
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'google-auth', email: 'demo@paros.io', name: 'Kabir Roaster' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google login failed');

      if (data.hasExistingSetup) {
        router.push('/pos');
        return;
      }

      if (data.cafe) {
        if (data.cafe.name && data.cafe.name !== 'My Cafe') setOutletName(data.cafe.name);
        if (data.cafe.city) setCity(data.cafe.city);
        if (data.cafe.closingTime) setClosingTime(data.cafe.closingTime);
        if (data.cafe.googleReviewUrl) setGoogleReviewUrl(data.cafe.googleReviewUrl);
        if (data.cafe.wifiName) setWifiName(data.cafe.wifiName);
        if (data.cafe.wifiPassword) setWifiPassword(data.cafe.wifiPassword);
      }

      goToStep(2);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setAuthError(err.message);
      } else {
        setAuthError('An error occurred');
      }
    } finally {
      setAuthLoading(false);
    }
  }

  // Handle Step 2: Save Cafe Details
  async function handleSaveCafe(e: React.FormEvent) {
    e.preventDefault();
    setSavingLoading(true);

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outletName: outletName || 'Artisan Cafe',
          city: city || 'Bandra West, Mumbai',
          businessType,
          tableCount: isCounterOnly ? 0 : tableCount,
          closingTime,
          googleReviewUrl: googleReviewUrl || null,
          wifiName: wifiName || null,
          wifiPassword: wifiPassword || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save cafe setup');

      goToStep(3);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error during setup');
    } finally {
      setSavingLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-paros-cream text-espresso font-body flex flex-col">
      {/* ── Fixed Top Header ── */}
      <header className="sticky top-0 w-full z-50 bg-white/95 backdrop-blur-md border-b-2 border-espresso">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 3) goToStep(2);
                  else if (step === 2) goToStep(1);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-espresso bg-white hover:bg-paros-yellow text-xs font-display font-black text-espresso shadow-brutal-sm"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Back</span>
              </button>
            ) : null}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-paros-orange text-white flex items-center justify-center font-display font-black text-base border-2 border-espresso shadow-brutal-sm">
                P
              </div>
              <span className="font-display text-xl font-black text-espresso tracking-tight">
                PAROS<span className="text-paros-orange">.</span>
              </span>
            </div>
            <span className="hidden sm:inline-block w-px h-5 bg-espresso/20" />
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-paros-yellow/60 border border-espresso font-display text-xs font-bold uppercase">
              <span className="w-2 h-2 rounded-full bg-paros-matcha animate-pulse" />
              <span>60-Second Setup Wizard</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                if (confirm('Reset local database & cache to start fresh?')) {
                  await fetch('/api/system/reset', {
                    method: 'POST',
                    headers: { 'x-reset-secret': 'paros-dev-reset-key' },
                  });
                  if (typeof window !== 'undefined') localStorage.clear();
                  window.location.reload();
                }
              }}
              className="text-xs font-display font-black text-red-600 bg-red-100 hover:bg-red-200 border border-espresso px-2.5 py-1 rounded-lg uppercase shadow-brutal-sm flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">cleaning_services</span>
              <span>Reset Cache</span>
            </button>
            <Link
              href="/"
              className="text-xs font-display font-bold text-espresso/70 hover:text-espresso"
            >
              Exit to Home
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="flex-1 flex flex-col items-center justify-center py-6 sm:py-10 px-3 sm:px-6">
        {/* ══ STEP 1: AUTH & VERIFICATION ══ */}
        {step === 1 && (
          <div className="w-full max-w-[580px] flex flex-col items-center">
            {/* Stepper Pill */}
            <div className="flex items-center justify-between w-full max-w-[340px] mb-3 px-1 font-display text-xs uppercase font-bold text-espresso/70">
              <span className="text-paros-orange font-black">Step 1 of 3</span>
              <span>Quick Verification</span>
              <span className="text-paros-matcha font-black flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[14px]">bolt</span>60s
              </span>
            </div>
            <div className="w-full max-w-[340px] h-2 bg-white rounded-full border-2 border-espresso overflow-hidden mb-6 p-0.5">
              <div className="h-full bg-paros-orange rounded-full w-1/3 transition-all duration-500" />
            </div>

            {/* Card */}
            <div className="w-full bg-white rounded-3xl border-2 border-espresso shadow-brutal-xl overflow-hidden p-4 sm:p-10 text-center">
              <span className="sticker-badge inline-block bg-paros-yellow text-espresso border-2 border-espresso px-3.5 py-1 rounded-full font-display text-xs font-black uppercase mb-4 shadow-brutal-sm">
                ⚡ Instant 14-Day Free Access • No Card
              </span>

              <h1 className="font-display text-3xl sm:text-4xl font-black text-espresso tracking-tight mb-2">
                Set up your cafe in <span className="text-paros-orange">60 seconds.</span>
              </h1>
              <p className="font-body text-sm text-espresso/70 max-w-md mx-auto mb-6">
                Join 150+ specialty cafes, bakeries, and roasters running zero-hardware, instant cloud operations.
              </p>

              {authError && (
                <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-xl text-red-600 text-xs font-bold">
                  {authError}
                </div>
              )}

              {/* Google Button */}
              <button
                onClick={handleGoogleLogin}
                disabled={authLoading}
                className="brutal-btn w-full py-3.5 px-4 rounded-xl border-2 border-espresso bg-white hover:bg-paros-cream text-espresso font-display font-black text-sm uppercase flex items-center justify-center gap-3 shadow-brutal mb-4"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z" fill="#4285F4" />
                  <path d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" fill="#34A853" />
                  <path d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.98 0 12s.45 3.83 1.25 5.42l4.03-3.15z" fill="#FBBC05" />
                  <path d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>

              <div className="relative w-full flex items-center justify-center my-4">
                <div className="w-full h-px bg-espresso/20" />
                <span className="absolute px-3 bg-white text-espresso/60 font-display text-xs font-bold uppercase">
                  or with Mobile SMS
                </span>
              </div>

              {/* Phone OTP Form */}
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="flex flex-col gap-3">
                  <div className="flex items-center bg-paros-cream border-2 border-espresso rounded-xl px-3 py-1 shadow-brutal-sm">
                    <div className="flex items-center gap-1.5 pr-2 mr-2 border-r-2 border-espresso select-none font-display font-bold text-sm">
                      <span>🇮🇳</span>
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="98765 43210"
                      maxLength={10}
                      required
                      className="w-full bg-transparent font-display text-lg font-bold text-espresso outline-none py-1.5"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="brutal-btn w-full py-3.5 px-4 bg-paros-orange text-white font-display font-black text-sm uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-2"
                  >
                    <span>{authLoading ? 'Sending...' : 'Get Instant OTP'}</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
                  <div className="p-2.5 bg-paros-mint rounded-xl border-2 border-espresso font-display text-xs font-bold text-espresso text-center">
                    ⚡ Code sent to +91 {phone}! Use test code: <span className="underline font-black">123456</span>
                  </div>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    required
                    className="w-full bg-paros-cream border-2 border-espresso rounded-xl px-4 py-3 font-mono text-2xl font-black text-center tracking-[0.4em] outline-none shadow-brutal-sm"
                  />
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="brutal-btn w-full py-3.5 px-4 bg-paros-matcha text-white font-display font-black text-sm uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-2"
                  >
                    <span>{authLoading ? 'Verifying...' : 'Verify & Continue ➔'}</span>
                  </button>
                </form>
              )}

              {/* Feature Points */}
              <div className="mt-8 pt-6 border-t-2 border-dashed border-espresso/20 flex flex-col gap-2.5 text-left text-xs font-body">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-paros-matcha text-[18px]">devices</span>
                  <span><strong>Zero Hardware Required</strong> — Runs on iPad, phone, or laptop</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-paros-matcha text-[18px]">wifi_off</span>
                  <span><strong>100% Offline-Ready Sync</strong> — Works even if cafe Wi-Fi cuts out</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-paros-matcha text-[18px]">receipt_long</span>
                  <span><strong>Free WhatsApp e-Bills</strong> — Direct GST invoice to guest chat</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ STEP 2: CAFE ESSENTIALS ══ */}
        {step === 2 && (
          <div className="w-full max-w-[760px] flex flex-col items-center">
            {/* Stepper Pill */}
            <div className="flex items-center justify-between w-full max-w-[420px] mb-3 px-1 font-display text-xs uppercase font-bold text-espresso/70">
              <span className="text-paros-orange font-black">Step 2 of 3</span>
              <span>Space & Floor Plan</span>
              <span className="text-paros-matcha font-black flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[14px]">bolt</span>15s
              </span>
            </div>
            <div className="w-full max-w-[420px] h-2 bg-white rounded-full border-2 border-espresso overflow-hidden mb-6 p-0.5">
              <div className="h-full bg-paros-orange rounded-full w-2/3 transition-all duration-500" />
            </div>

            {/* Card */}
            <div className="w-full bg-white rounded-3xl border-2 border-espresso shadow-brutal-xl p-4 sm:p-10">
              <h1 className="font-display text-2xl sm:text-3xl font-black text-espresso tracking-tight mb-1">
                Tell us about your space
              </h1>
              <p className="font-body text-sm text-espresso/70 mb-6 sm:mb-8">
                Customize Paros for your exact counter and dining workflow.
              </p>

              <form onSubmit={handleSaveCafe} className="flex flex-col gap-5 sm:gap-6">
                {/* Outlet Name */}
                <div className="flex flex-col gap-2">
                  <label className="font-display text-xs font-black uppercase text-espresso">
                    Outlet / Cafe Name:
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 material-symbols-outlined text-espresso/60 text-[20px]">
                      storefront
                    </span>
                    <input
                      type="text"
                      value={outletName}
                      onChange={(e) => setOutletName(e.target.value)}
                      placeholder="e.g. Third Wave Roasters, Bandra"
                      required
                      className="w-full pl-11 pr-3 sm:pr-32 py-3 bg-paros-cream border-2 border-espresso rounded-xl font-display text-base font-bold text-espresso outline-none shadow-brutal-sm"
                    />
                    <div className="hidden sm:block absolute right-3 bg-paros-yellow px-2 py-0.5 rounded border border-espresso font-display text-[10px] font-black uppercase">
                      Mumbai, MH
                    </div>
                  </div>
                </div>

                {/* Business Type Selector */}
                <div className="flex flex-col gap-2">
                  <label className="font-display text-xs font-black uppercase text-espresso">
                    What best describes your business?
                  </label>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {/* Cafe */}
                    <button
                      type="button"
                      onClick={() => setBusinessType('cafe')}
                      className={`p-4 rounded-2xl border-2 border-espresso text-left transition-all flex flex-col justify-between ${
                        businessType === 'cafe'
                          ? 'bg-paros-yellow border-2 border-espresso shadow-brutal'
                          : 'bg-white hover:bg-paros-cream shadow-brutal-sm'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="material-symbols-outlined text-paros-orange text-[24px]">local_cafe</span>
                        <span className="text-[10px] font-display font-black bg-paros-orange text-white px-2 py-0.5 rounded">POPULAR</span>
                      </div>
                      <div>
                        <p className="font-display font-bold text-sm text-espresso">Cafe & Bistro</p>
                        <p className="font-body text-xs text-espresso/70 mt-0.5">Dine-in + QR + Takeaway</p>
                      </div>
                    </button>

                    {/* Bakery */}
                    <button
                      type="button"
                      onClick={() => setBusinessType('bakery')}
                      className={`p-4 rounded-2xl border-2 border-espresso text-left transition-all flex flex-col justify-between ${
                        businessType === 'bakery'
                          ? 'bg-paros-yellow border-2 border-espresso shadow-brutal'
                          : 'bg-white hover:bg-paros-cream shadow-brutal-sm'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="material-symbols-outlined text-tertiary text-[24px]">bakery_dining</span>
                      </div>
                      <div>
                        <p className="font-display font-bold text-sm text-espresso">Bakery & Bar</p>
                        <p className="font-body text-xs text-espresso/70 mt-0.5">Fast counter + Express pickup</p>
                      </div>
                    </button>

                    {/* Cloud */}
                    <button
                      type="button"
                      onClick={() => setBusinessType('cloud')}
                      className={`p-4 rounded-2xl border-2 border-espresso text-left transition-all flex flex-col justify-between ${
                        businessType === 'cloud'
                          ? 'bg-paros-yellow border-2 border-espresso shadow-brutal'
                          : 'bg-white hover:bg-paros-cream shadow-brutal-sm'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="material-symbols-outlined text-secondary text-[24px]">takeout_dining</span>
                      </div>
                      <div>
                        <p className="font-display font-bold text-sm text-espresso">Cloud Kitchen</p>
                        <p className="font-body text-xs text-espresso/70 mt-0.5">Token display + Aggregators</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Table Stepper */}
                <div className="p-4 bg-paros-cream rounded-2xl border-2 border-espresso flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-display font-bold text-sm text-espresso">
                        How many tables do you have?
                      </p>
                      <p className="font-body text-xs text-espresso/70">
                        We will auto-generate your visual floor grid & QR tags.
                      </p>
                    </div>

                    {!isCounterOnly && (
                      <div className="flex items-center gap-2 bg-white p-1 rounded-xl border-2 border-espresso shadow-brutal-sm self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setTableCount(Math.max(1, tableCount - 1))}
                          className="w-8 h-8 rounded-lg bg-paros-cream hover:bg-paros-yellow border border-espresso flex items-center justify-center font-black text-sm"
                        >
                          -
                        </button>
                        <span className="font-display font-black text-lg text-espresso px-3 tabular-nums">
                          {tableCount} Tables
                        </span>
                        <button
                          type="button"
                          onClick={() => setTableCount(tableCount + 1)}
                          className="w-8 h-8 rounded-lg bg-paros-cream hover:bg-paros-yellow border border-espresso flex items-center justify-center font-black text-sm"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>

                  <label className="flex items-center gap-2 text-xs font-display font-bold text-espresso cursor-pointer pt-2 border-t border-espresso/15">
                    <input
                      type="checkbox"
                      checked={isCounterOnly}
                      onChange={(e) => setIsCounterOnly(e.target.checked)}
                      className="accent-paros-orange w-4 h-4"
                    />
                    <span>I don&apos;t have tables (Counter Billing / Token Mode Only)</span>
                  </label>
                </div>

                {/* Cafe Closing Time & Automated Daily Report */}
                <div className="p-4 bg-paros-mint/20 rounded-2xl border-2 border-espresso flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="font-display text-xs font-black uppercase text-espresso flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-paros-orange text-[18px]">schedule</span>
                      Daily Cafe Closing Time *
                    </label>
                    <span className="text-[10px] font-display font-black bg-paros-matcha text-white px-2 py-0.5 rounded">
                      IST (INDIA)
                    </span>
                  </div>
                  <input
                    type="time"
                    value={closingTime}
                    onChange={(e) => setClosingTime(e.target.value)}
                    required
                    className="w-full p-3 bg-white border-2 border-espresso rounded-xl font-mono text-xl font-bold text-espresso outline-none shadow-brutal-sm"
                  />
                  <p className="font-body text-xs text-espresso/70 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-paros-orange">mail</span>
                    Is time par aapke registered email par din bhar ki sales, cash & expense summary automatically deliver ho jayegi.
                  </p>
                </div>

                {/* Google Review Link (Optional) */}
                <div className="flex flex-col gap-2">
                  <label className="font-display text-xs font-black uppercase text-espresso flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-amber-500 text-[18px]">star</span>
                    Google Maps Review Link (Optional):
                  </label>
                  <input
                    type="url"
                    value={googleReviewUrl}
                    onChange={(e) => setGoogleReviewUrl(e.target.value)}
                    placeholder="https://maps.app.goo.gl/your-cafe-link"
                    className="w-full p-3 bg-paros-cream border-2 border-espresso rounded-xl font-body text-sm text-espresso outline-none shadow-brutal-sm"
                  />
                  <p className="font-body text-[11px] text-espresso/60">
                    Customer ka order SERVED hone par uske phone par 5-star Google review ka popup dikhega.
                  </p>
                </div>

                {/* Guest Wi-Fi (Optional for Printable QR Cards) */}
                <div className="p-4 bg-white rounded-2xl border-2 border-espresso flex flex-col gap-3">
                  <p className="font-display text-xs font-black uppercase text-espresso flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-espresso/70 text-[18px]">wifi</span>
                    Guest Wi-Fi Details (Optional for QR Table Cards):
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={wifiName}
                      onChange={(e) => setWifiName(e.target.value)}
                      placeholder="Wi-Fi Name (SSID)"
                      className="w-full p-2.5 bg-paros-cream border-2 border-espresso rounded-xl font-body text-xs text-espresso outline-none"
                    />
                    <input
                      type="text"
                      value={wifiPassword}
                      onChange={(e) => setWifiPassword(e.target.value)}
                      placeholder="Wi-Fi Password"
                      className="w-full p-2.5 bg-paros-cream border-2 border-espresso rounded-xl font-body text-xs text-espresso outline-none"
                    />
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => goToStep(1)}
                    className="py-4 px-5 bg-white hover:bg-paros-yellow text-espresso font-display font-black text-sm uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-1 shrink-0"
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    disabled={savingLoading}
                    className="brutal-btn flex-1 py-4 px-6 bg-paros-orange text-white font-display font-black text-base uppercase rounded-xl border-2 border-espresso shadow-brutal-lg flex items-center justify-center gap-2"
                  >
                    <span>{savingLoading ? 'Configuring Space...' : 'Launch My Cafe POS ➔'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ══ STEP 3: CELEBRATION & LIVE PREVIEW ══ */}
        {step === 3 && (
          <div className="w-full max-w-[880px] flex flex-col items-center">
            {/* Header Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-paros-mint border-2 border-espresso shadow-brutal-sm mb-4">
              <span className="material-symbols-outlined text-paros-matcha text-[16px]">check_circle</span>
              <span className="font-display text-xs font-black uppercase text-espresso">
                {isCounterOnly
                  ? '⚡ Express Counter & Token Mode Enabled • 0 Tables Needed'
                  : 'Setup Complete • All Terminals Online'}
              </span>
            </div>

            <div className="w-16 h-16 rounded-2xl bg-paros-matcha text-white border-2 border-espresso shadow-brutal flex items-center justify-center text-3xl mb-4 animate-bounce">
              🎉
            </div>

            <h1 className="font-display text-3xl sm:text-5xl font-black text-espresso tracking-tight text-center mb-2">
              {isCounterOnly ? 'Your Express Counter is ready!' : 'Your cafe is ready to take orders!'}
            </h1>
            <p className="font-body text-base text-espresso/70 text-center max-w-lg mb-8">
              {isCounterOnly
                ? 'We configured your outlet in Express Token Mode. Customer orders generate live pickup tokens, dispatch directly to Kitchen KDS, and prompt collection at the counter!'
                : "We've added 5 sample drinks and pastries to your menu so you can test punching a live order right away."}
            </p>

            {/* Sample Menu Cards */}
            <div className="w-full bg-white rounded-3xl border-2 border-espresso shadow-brutal p-4 sm:p-6 mb-6">
              <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-espresso">
                <span className="font-display text-xs sm:text-sm font-black text-espresso uppercase">
                  ⚡ Auto-Provisioned Sample Menu
                </span>
                <span className="text-[11px] sm:text-xs font-display font-bold text-paros-matcha">
                  5 Items Live on POS & QR
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
                {[
                  { name: 'Flat White (Oat)', price: '₹260', icon: '☕', meta: 'Beverage • Double Ristretto' },
                  { name: 'Butter Croissant', price: '₹180', icon: '🥐', meta: 'Bakery • 27 Laminated Layers' },
                  { name: 'Truffle Toast', price: '₹340', icon: '🥪', meta: 'Hot Kitchen • Sourdough Base' },
                  { name: 'Cold Brew Tonic', price: '₹220', icon: '🥤', meta: 'Signature • 18-hr Cold Steep' },
                  { name: 'Basque Cheesecake', price: '₹280', icon: '🍰', meta: 'Dessert • Caramelised Slice' },
                ].map((item) => (
                  <div
                    key={item.name}
                    onClick={() => setSelectedPreview(item)}
                    className={`p-3 rounded-2xl border-2 border-espresso transition-all cursor-pointer flex flex-col justify-between ${
                      selectedPreview.name === item.name
                        ? 'bg-paros-yellow shadow-brutal-sm'
                        : 'bg-paros-cream hover:bg-paros-yellow/40'
                    }`}
                  >
                    <span className="text-2xl mb-1">{item.icon}</span>
                    <div>
                      <p className="font-display font-bold text-xs text-espresso leading-tight">{item.name}</p>
                      <p className="font-display font-black text-xs text-espresso mt-1">{item.price}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Active Item Highlight */}
              <div className="mt-4 p-3 bg-paros-cream rounded-xl border border-espresso flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-paros-matcha animate-ping" />
                  <span className="font-display font-bold text-sm text-espresso">{selectedPreview.name}</span>
                  <span className="text-xs text-espresso/60 hidden sm:inline">• {selectedPreview.meta}</span>
                </div>
                <span className="font-display font-black text-sm text-paros-orange">{selectedPreview.price}</span>
              </div>
            </div>

            {/* Connectivity Status Dock */}
            <div className="w-full bg-paros-yellow/30 rounded-2xl border-2 border-espresso p-4 mb-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-2.5 bg-white p-3 rounded-xl border border-espresso shadow-brutal-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-paros-matcha" />
                <div>
                  <p className="font-display font-bold text-xs uppercase text-espresso">
                    {isCounterOnly ? 'Express Token POS' : 'Counter POS'}
                  </p>
                  <p className="text-[11px] text-paros-matcha font-bold">
                    {isCounterOnly ? 'Token Register Active' : 'Terminal #01 Active'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 bg-white p-3 rounded-xl border border-espresso shadow-brutal-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-paros-matcha" />
                <div>
                  <p className="font-display font-bold text-xs uppercase text-espresso">Kitchen KDS</p>
                  <p className="text-[11px] text-paros-matcha font-bold">Synced (0ms lag)</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 bg-white p-3 rounded-xl border border-espresso shadow-brutal-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-paros-matcha" />
                <div>
                  <p className="font-display font-bold text-xs uppercase text-espresso">WhatsApp Bills</p>
                  <p className="text-[11px] text-paros-matcha font-bold">Cloud Gateway Ready</p>
                </div>
              </div>
            </div>

            {/* Launch Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
              <button
                onClick={() => router.push('/pos')}
                className="brutal-btn w-full sm:w-auto px-8 py-4 bg-paros-orange text-white font-display font-black text-base uppercase rounded-xl border-2 border-espresso shadow-brutal-lg flex items-center justify-center gap-2"
              >
                <span>Open Counter POS & Punch First Order</span>
                <span className="material-symbols-outlined text-[20px]">bolt</span>
              </button>
              <button
                onClick={() => router.push('/admin/menu')}
                className="brutal-btn w-full sm:w-auto px-8 py-4 bg-white text-espresso font-display font-black text-base uppercase rounded-xl border-2 border-espresso shadow-brutal flex items-center justify-center gap-2"
              >
                <span>Upload My Own Menu</span>
                <span className="material-symbols-outlined text-[20px]">upload_file</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
