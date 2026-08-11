'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';

export default function AdminEnquiriesPage() {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const fetchEnquiries = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/enquiry');
      const json = await res.json();
      if (json.success) {
        setEnquiries(json.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch enquiries:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredEnquiries = enquiries.filter(item => {
    if (filter === 'contact') return item.type === 'contact_form';
    if (filter === 'combo') return item.type === 'combo';
    return true;
  });

  return (
    <>
      <Navbar />
      <main className="pt-28 pb-20 min-h-screen container mx-auto px-4 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-emerald-400">Admin Lead & Messages Inbox</h1>
            <p className="text-white/60 text-sm">Real-time student inquiries and contact form submissions stored in MongoDB</p>
          </div>
          <div className="flex gap-2 bg-[#152336] p-1.5 rounded-lg border border-white/10">
            <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded text-xs font-bold transition ${filter === 'all' ? 'bg-emerald-500 text-white' : 'text-white/60 hover:text-white'}`}>All ({enquiries.length})</button>
            <button onClick={() => setFilter('contact')} className={`px-3 py-1.5 rounded text-xs font-bold transition ${filter === 'contact' ? 'bg-emerald-500 text-white' : 'text-white/60 hover:text-white'}`}>Contact Messages</button>
            <button onClick={() => setFilter('combo')} className={`px-3 py-1.5 rounded text-xs font-bold transition ${filter === 'combo' ? 'bg-emerald-500 text-white' : 'text-white/60 hover:text-white'}`}>Combo Bookings</button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-white/50">Loading messages from MongoDB Atlas...</div>
        ) : filteredEnquiries.length === 0 ? (
          <div className="bg-[#152336] border border-white/10 rounded-2xl p-12 text-center text-white/50">
            No messages found in database yet. Form submissions will appear here live!
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredEnquiries.map((item) => (
              <div key={item._id} className="bg-[#152336] border border-white/10 hover:border-emerald-500/50 rounded-xl p-5 transition shadow-lg">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-white">{item.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase font-bold">
                        {item.type || 'general'}
                      </span>
                    </div>
                    <p className="text-xs text-white/60 mt-1">📧 {item.email} {item.phone ? `| 📞 ${item.phone}` : ''}</p>
                  </div>
                  <span className="text-xs text-white/40">{new Date(item.createdAt).toLocaleString()}</span>
                </div>
                {item.subject && <div className="text-xs font-bold text-blue-400 mb-2">Subject: {item.subject}</div>}
                <div className="bg-black/30 p-3 rounded-lg text-sm text-white/90 whitespace-pre-wrap border border-white/5">
                  {item.message}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
