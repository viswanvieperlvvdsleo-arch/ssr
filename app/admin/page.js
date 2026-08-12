"use client";

import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { useCMS } from '../../components/CMSContext';
import AdminCombosTab from '../../components/AdminCombosTab';

export default function AdminDashboard() {
  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Dashboard state
  const [activeTab, setActiveTab] = useState('slots'); // 'slots', 'bookings', 'messages', 'users'
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { globalContent, updateContent, triggerSave, isSaving, saveSuccess } = useCMS();
  const comboOffers = globalContent.comboOffers || { sticker: {}, predefined: [], catalogPrices: {} };

  // Form state for creating slots
  const [slotDate, setSlotDate] = useState('');
  const [slotStart, setSlotStart] = useState('10:00');
  const [slotEnd, setSlotEnd] = useState('11:00');
  const [actionLoading, setActionLoading] = useState(false);

  // CMS State
  const [cmsPhone, setCmsPhone] = useState('+91 9010062578');
  const [cmsEmail, setCmsEmail] = useState('sales@ssrbusinesssolutions.com');
  const [cmsModules, setCmsModules] = useState([
    { id: "sd", name: "SAP SD", image: "/services/functional modules/sd.png", tagline: "Sales & Distribution", what: "SAP SD manages the complete order-to-cash process, from customer inquiries to product delivery and billing.", does: "It streamlines sales, pricing, shipping, invoicing, and customer relationship processes across industries.", benefit: "By optimizing sales operations, SAP SD improves customer satisfaction and accelerates business growth.", eligible: "Sales executives, business analysts, supply chain professionals, and MBA graduates with commerce background.", level: "Beginner to Advanced" },
    { id: "mm", name: "SAP MM", image: "/services/functional modules/MM.png", tagline: "Materials Management", what: "SAP MM manages the procurement and movement of materials across the entire supply chain.", does: "It streamlines purchasing, inventory management, warehouse operations, and vendor collaboration for efficient resource planning.", benefit: "Ensuring the right materials are available at the right time — reducing costs, improving inventory accuracy, and supporting uninterrupted business operations.", eligible: "Supply chain professionals, procurement officers, warehouse managers, and engineering graduates.", level: "Beginner to Advanced" },
    { id: "hcm", name: "SAP HCM", image: "/services/functional modules/HCM.png", tagline: "Human Capital Management", what: "SAP HCM covers end-to-end HR processes from hire to retire within an organization.", does: "It handles payroll, time management, organizational management, personnel administration, and talent development.", benefit: "SAP HCM empowers HR teams to manage the workforce efficiently, improve compliance, and enhance employee experience.", eligible: "HR professionals, payroll executives, MBA-HR graduates, and personnel managers.", level: "Beginner to Advanced" },
    { id: "pp", name: "SAP PP", image: "/services/functional modules/pp.png", tagline: "Production Planning", what: "SAP PP handles manufacturing and production planning processes within an enterprise.", does: "It covers MRP, capacity planning, production orders, shop floor control, and material requirements planning.", benefit: "SAP PP ensures smooth production operations by optimizing resources, reducing lead times, and meeting delivery schedules.", eligible: "Production engineers, manufacturing managers, industrial engineers, and operations management professionals.", level: "Beginner to Advanced" },
    { id: "fi", name: "SAP FI", image: "/services/functional modules/FI.png", tagline: "Financial Accounting", what: "SAP FI handles core financial accounting and reporting functions within an organization.", does: "It manages general ledger, accounts payable, accounts receivable, asset accounting, and bank accounting.", benefit: "SAP FI provides real-time financial visibility, regulatory compliance, and accurate financial reporting for business decisions.", eligible: "Accountants, finance professionals, CAs, commerce graduates, and MBA-Finance students.", level: "Beginner to Advanced" },
    { id: "fico", name: "SAP FICO", image: "/services/functional modules/FICO.png", tagline: "Finance & Controlling", what: "SAP FICO integrates Financial Accounting (FI) and Controlling (CO) for complete financial management.", does: "It handles financial reporting, cost center accounting, profit center management, internal orders, and budgeting.", benefit: "Provides real-time financial visibility, regulatory compliance, and cost control for strategic business decisions.", eligible: "Finance managers, cost accountants, CAs, ICWAs, and finance professionals.", level: "Beginner to Advanced" }
  ]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [moduleForm, setModuleForm] = useState({ id: '', name: '', tagline: '', image: '', what: '', does: '', benefit: '', eligible: '', level: 'Beginner to Advanced' });
  const [cmsSaveNotice, setCmsSaveNotice] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedModules = localStorage.getItem('ssr_cms_modules');
      const savedPhone = localStorage.getItem('ssr_cms_phone');
      const savedEmail = localStorage.getItem('ssr_cms_email');
      if (savedModules) setCmsModules(JSON.parse(savedModules));
      if (savedPhone) setCmsPhone(savedPhone);
      if (savedEmail) setCmsEmail(savedEmail);
    }
  }, []);

  const saveCmsData = (updatedModules, updatedPhone = cmsPhone, updatedEmail = cmsEmail) => {
    setCmsModules(updatedModules);
    setCmsPhone(updatedPhone);
    setCmsEmail(updatedEmail);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ssr_cms_modules', JSON.stringify(updatedModules));
      localStorage.setItem('ssr_cms_phone', updatedPhone);
      localStorage.setItem('ssr_cms_email', updatedEmail);
    }
    setCmsSaveNotice('✅ Changes saved globally!');
    setTimeout(() => setCmsSaveNotice(''), 3000);
  };

  useEffect(() => {
    const storedPasscode = sessionStorage.getItem('admin_passcode');
    if (storedPasscode) {
      setPasscode(storedPasscode);
      void verifyAndLoad(storedPasscode);
    }
  }, []);

  const verifyAndLoad = async (codeToVerify) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: codeToVerify })
      });

      if (!res.ok) {
        throw new Error('Invalid passcode.');
      }

      sessionStorage.setItem('admin_passcode', codeToVerify);
      setIsAuthenticated(true);
      void loadDashboardData(codeToVerify);
    } catch (err) {
      setAuthError(err.message || 'Incorrect passcode. Access denied.');
      sessionStorage.removeItem('admin_passcode');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!passcode.trim()) return;
    void verifyAndLoad(passcode.trim());
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (err) {
      console.error('Failed to logout on server:', err);
    }
    sessionStorage.removeItem('admin_passcode');
    setIsAuthenticated(false);
    setPasscode('');
    setSlots([]);
    setBookings([]);
    setMessages([]);
  };

  const loadDashboardData = async (code = passcode) => {
    setLoading(true);
    setError('');
    try {
      const headers = { 'x-admin-password': code };
      const [slotsRes, bookingsRes, messagesRes, usersRes] = await Promise.all([
        fetch('/api/admin/slots', { headers, cache: 'no-store' }),
        fetch('/api/admin/bookings', { headers, cache: 'no-store' }),
        fetch('/api/admin/messages', { headers, cache: 'no-store' }),
        fetch('/api/users/register', { headers, cache: 'no-store' })
      ]);

      if (!slotsRes.ok || !bookingsRes.ok || !messagesRes.ok) {
        throw new Error('Failed to retrieve dashboard records.');
      }

      const [slotsData, bookingsData, messagesData] = await Promise.all([
        slotsRes.json(),
        bookingsRes.json(),
        messagesRes.json()
      ]);

      setSlots(slotsData);
      setBookings(bookingsData);
      setMessages(messagesData);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }
    } catch (err) {
      setError(err.message || 'Error pulling database entries.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSlotSubmit = async (e) => {
    e.preventDefault();
    if (!slotDate || !slotStart || !slotEnd) return;
    setActionLoading(true);
    const headers = { 'x-admin-password': passcode, 'Content-Type': 'application/json' };
    try {
      const res = await fetch('/api/admin/slots', {
        method: 'POST',
        headers,
        cache: 'no-store',
        body: JSON.stringify({
          date: slotDate,
          startTime: slotStart,
          endTime: slotEnd
        })
      });

      if (!res.ok) {
        throw new Error('Failed to insert new slot.');
      }

      setSlotDate('');
      void loadDashboardData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSlot = async (id) => {
    if (!confirm('Are you sure you want to delete this availability slot?')) return;
    const headers = { 'x-admin-password': passcode };
    try {
      const res = await fetch(`/api/admin/slots?id=${id}`, {
        method: 'DELETE',
        headers,
        cache: 'no-store'
      });

      if (!res.ok) {
        throw new Error('Failed to delete availability slot.');
      }

      void loadDashboardData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteMessage = async (id) => {
    if (!confirm('Are you sure you want to delete this contact lead message?')) return;
    const headers = { 'x-admin-password': passcode };
    try {
      const res = await fetch(`/api/admin/messages?id=${id}`, {
        method: 'DELETE',
        headers,
        cache: 'no-store'
      });

      if (!res.ok) {
        throw new Error('Failed to delete contact lead.');
      }

      void loadDashboardData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Login View
  if (!isAuthenticated) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0B1A30] via-[#122A4E] to-[#071120] px-4 py-20 text-white transition-all duration-500">
          <div className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] text-center relative overflow-hidden">
            {/* Background Glow Ring */}
            <div className="absolute -top-16 -left-16 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>

            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/40 bg-white/10 text-xs font-semibold tracking-[0.24em] text-white">
              S S R
            </div>
            
            <h1 className="text-xl font-bold tracking-[0.3em] uppercase text-white/90">Admin Portal</h1>
            <p className="mt-2 text-xs text-white/60 leading-5">Please enter the security password to manage website slots and visitor records.</p>
            
            <form onSubmit={handleLoginSubmit} className="mt-8 space-y-4">
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Passcode"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-center text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
              />
              
              {authError && (
                <div className="text-xs text-red-400 font-semibold mt-2 animate-pulse">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-xl hover:-translate-y-0.5 hover:shadow-blue-500/25 transition duration-300 disabled:opacity-50"
              >
                {authLoading ? 'Verifying...' : 'Unlock Dashboard'}
              </button>
            </form>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Authenticated View
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-[#0B1A30] via-[#122A4E] to-[#071120] text-white py-24 px-4 sm:px-6 lg:px-8 transition-all duration-500">
        <div className="max-w-7xl mx-auto">
          {/* Header Panel */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/5 backdrop-blur-2xl border border-white/10 p-6 rounded-3xl mb-8">
            <div>
              <span className="text-xs uppercase tracking-[0.3em] text-blue-400 font-bold">MANAGEMENT SYSTEM</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wider bg-gradient-to-r from-white via-blue-100 to-blue-300 bg-clip-text text-transparent mt-1">SSR ADMIN DASHBOARD</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (typeof window !== "undefined") {
                    sessionStorage.setItem("ssr_is_edit_mode", "true");
                    window.location.href = "/services/functional";
                  }
                }}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] border border-blue-400/40 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl transition text-white shadow-lg shadow-blue-500/20"
              >
                ⚙️ Visual Website Editor
              </button>
              <button
                onClick={() => loadDashboardData()}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] border border-white/10 bg-white/5 hover:bg-white/10 rounded-2xl transition"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] bg-red-500/25 border border-red-500/40 hover:bg-red-500/35 rounded-2xl text-red-200 transition"
              >
                Log Out
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/50">Total Time Slots</span>
                <div className="text-2xl font-bold mt-1">{slots.length}</div>
              </div>
              <div className="text-2xl">🗓️</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/50">Booked Meetings</span>
                <div className="text-2xl font-bold mt-1 text-emerald-400">{bookings.length}</div>
              </div>
              <div className="text-2xl">🤝</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/50">Contact Leads</span>
                <div className="text-2xl font-bold mt-1 text-blue-400">{messages.length}</div>
              </div>
              <div className="text-2xl">✉️</div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-500/15 border border-red-500/30 text-red-200 text-sm p-4 rounded-2xl mb-8 animate-pulse">
              {error}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex border-b border-white/10 gap-2 mb-8 overflow-x-auto pb-1">
            {[
              { id: 'slots', label: 'Availability Slots' },
              { id: 'bookings', label: 'Bookings Log' },
              { id: 'messages', label: 'Contact Messages' },
              { id: 'users', label: `Registered Users (${users.length})` },
              { id: 'combos', label: '🎁 Combo Offers' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 text-xs uppercase tracking-[0.2em] font-semibold border-b-2 transition duration-300 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-white/55 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content Panels */}
          {activeTab === 'slots' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Creator Column */}
              <div className="bg-white/5 border border-white/10 p-6 rounded-3xl h-fit">
                <h2 className="text-lg font-bold tracking-wider mb-4 text-white/90">CREATE NEW SLOT</h2>
                <form onSubmit={handleCreateSlotSubmit} className="space-y-4 text-sm">
                  <div>
                    <label className="block text-xs text-white/50 uppercase tracking-wider mb-2">Slot Date</label>
                    <input
                      type="date"
                      required
                      value={slotDate}
                      onChange={(e) => setSlotDate(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-white/50 uppercase tracking-wider mb-2">Start Time</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 10:00"
                        value={slotStart}
                        onChange={(e) => setSlotStart(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/50 uppercase tracking-wider mb-2">End Time</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 11:00"
                        value={slotEnd}
                        onChange={(e) => setSlotEnd(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full rounded-xl bg-blue-500 py-2.5 text-xs uppercase tracking-wider font-semibold hover:bg-blue-600 transition"
                  >
                    {actionLoading ? 'Creating...' : 'Create Availability Slot'}
                  </button>
                </form>
              </div>

              {/* Slots List Column */}
              <div className="lg:col-span-2 bg-white/5 border border-white/10 p-6 rounded-3xl">
                <h2 className="text-lg font-bold tracking-wider mb-4 text-white/90">SLOTS REPOSITORY</h2>
                {slots.length === 0 ? (
                  <div className="text-center py-10 text-white/40 text-sm">No availability slots defined in the database.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-white/50 uppercase tracking-wider">
                          <th className="pb-3 font-semibold">Date</th>
                          <th className="pb-3 font-semibold">Time</th>
                          <th className="pb-3 font-semibold">Status</th>
                          <th className="pb-3 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {slots.map((slot) => (
                          <tr key={slot.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-4">{new Date(slot.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</td>
                            <td className="py-4 font-mono">{slot.startTime} - {slot.endTime}</td>
                            <td className="py-4">
                              {slot.isBooked ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Booked</span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">Open</span>
                              )}
                            </td>
                            <td className="py-4 text-right">
                              <button
                                onClick={() => handleDeleteSlot(slot.id)}
                                className="px-3 py-1 rounded-lg bg-red-500/20 border border-red-500/35 hover:bg-red-500/35 text-red-200 transition"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
              <h2 className="text-lg font-bold tracking-wider mb-4 text-white/90">SCHEDULED MEETINGS LOG</h2>
              {bookings.length === 0 ? (
                <div className="text-center py-10 text-white/40 text-sm">No visitor bookings logged yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-white/50 uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Scheduled Date</th>
                        <th className="pb-3 font-semibold">Time</th>
                        <th className="pb-3 font-semibold">Visitor Name</th>
                        <th className="pb-3 font-semibold">Contact Email</th>
                        <th className="pb-3 font-semibold">Phone</th>
                        <th className="pb-3 font-semibold">Purpose</th>
                        <th className="pb-3 font-semibold text-right">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((booking) => (
                        <tr key={booking.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-4 font-medium">{booking.availability ? new Date(booking.availability.date).toLocaleDateString() : 'N/A'}</td>
                          <td className="py-4 font-mono">{booking.availability ? `${booking.availability.startTime} - ${booking.availability.endTime}` : 'N/A'}</td>
                          <td className="py-4 font-bold">{booking.visitorName}</td>
                          <td className="py-4 text-white/70">{booking.visitorEmail || 'Not provided'}</td>
                          <td className="py-4 font-mono text-white/70">{booking.visitorPhone || 'Not provided'}</td>
                          <td className="py-4 text-white/70">{booking.purpose || 'Not provided'}</td>
                          <td className="py-4 text-white/50 text-right">{new Date(booking.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
              <h2 className="text-lg font-bold tracking-wider mb-4 text-white/90">CONTACT FORM LEADS</h2>
              {messages.length === 0 ? (
                <div className="text-center py-10 text-white/40 text-sm">No contact message leads captured yet.</div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className="bg-white/5 border border-white/10 p-5 rounded-2xl transition hover:border-white/20">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/5 pb-3">
                        <div>
                          <span className="text-xs font-bold text-white/90">{msg.name}</span>
                          <span className="mx-2 text-white/30">|</span>
                          <span className="text-xs text-blue-400 font-mono">{msg.email}</span>
                          {msg.phone && (
                            <>
                              <span className="mx-2 text-white/30">|</span>
                              <span className="text-xs text-white/50 font-mono">{msg.phone}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-[10px] text-white/40 font-mono">
                            {new Date(msg.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="px-2.5 py-1 text-[10px] rounded-lg bg-red-500/20 border border-red-500/35 hover:bg-red-500/35 text-red-200 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <div className="text-xs font-bold text-blue-300 uppercase tracking-wider">Subject: {msg.subject}</div>
                        <p className="mt-2 text-xs leading-relaxed text-white/85 whitespace-pre-wrap bg-black/20 p-3 rounded-xl border border-white/5">
                          {msg.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
              <h2 className="text-lg font-bold tracking-wider mb-2 text-white/90">REGISTERED USERS</h2>
              <p className="text-xs text-white/40 mb-6">Users who signed up via the Services page. Contact them to convert leads into enrollments.</p>
              {users.length === 0 ? (
                <div className="text-center py-16 text-white/40 text-sm">No users have registered yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        {['S.No.', 'Name', 'Phone', 'Email', 'Module Interested', 'Registered On'].map(h => (
                          <th key={h} style={{
                            padding: '10px 14px', textAlign: 'left',
                            fontSize: '0.68rem', fontWeight: 700,
                            letterSpacing: '0.1em', textTransform: 'uppercase',
                            color: 'rgba(100,180,255,0.8)'
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user, i) => (
                        <tr key={user.id || i} style={{
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          transition: 'background 0.2s',
                        }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>{i + 1}</td>
                          <td style={{ padding: '12px 14px', color: '#fff', fontWeight: 600, fontSize: '0.88rem' }}>{user.name}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <a href={`tel:${user.phone}`} style={{ color: '#4fc3f7', fontSize: '0.85rem', textDecoration: 'none', fontFamily: 'monospace' }}>{user.phone}</a>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <a href={`mailto:${user.email}`} style={{ color: '#4fc3f7', fontSize: '0.82rem', textDecoration: 'none', fontFamily: 'monospace' }}>{user.email}</a>
                          </td>
                          <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem' }}>{user.module}</td>
                          <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                            {new Date(user.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'combos' && (
            <AdminCombosTab />
          )}

        </div>
      </main>
      <Footer />
    </>
  );
}
