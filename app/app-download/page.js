'use client';

import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

export default function AppDownloadPage() {
  const roles = [
    { role: 'Super Admin', function: 'Full system control & global oversight', chat: 'Anyone', group: 'Full Group / Channel Creation', post: 'Edit/delete Any post/comment' },
    { role: 'Admin', function: 'Managing platform, users, batches & content', chat: 'Anyone', group: 'Create Groups, Announcements', post: 'Delete Any post/comment' },
    { role: 'Employee', function: 'Operations, booking management & support', chat: 'Anyone', group: 'Create Groups & Broadcasts', post: 'Standard user rights' },
    { role: 'Trainer', function: 'Delivering sessions, guiding learners', chat: 'Super Admin, Admin, Employees', group: 'Cannot create groups', post: 'Create posts; delete own comments' },
    { role: 'Participant', function: 'Course learning, server sandbox usage', chat: 'Super Admin, Admin, Employees', group: 'Cannot create groups', post: 'Delete own posts & comments only' }
  ];

  const features = [
    {
      title: "Authentication & Role Gateway",
      description: "Visual entry point selecting Participant, Trainer, Employee, or Admin. Automatic role-aware navigation and permissions.",
      icon: "🔐"
    },
    {
      title: "Home Feed & Content",
      description: "Interactive posts with rich banners, filtering system, real-time likes, saved posts, and full-screen draggable comment sheets.",
      icon: "📰"
    },
    {
      title: "Admin-Centric Chat",
      description: "Segmented chat tabs, live filtering, swipe gestures, role-based actions, dot read receipts, and media attachments with preview & edit tools.",
      icon: "💬"
    },
    {
      title: "SAP Server Booking",
      description: "Server grid view displaying SAP instance details. Integrated booking modal for duration and system user quota management.",
      icon: "🖥️"
    },
    {
      title: "Security & Data Integrity",
      description: "Enterprise access controls, JWT tokens, WebSockets, and strict RBAC enforced on both UI and backend layers.",
      icon: "🛡️"
    }
  ];

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-50 pt-24 pb-16">
        <section className="container mx-auto px-4 mb-16 mt-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 animate-fade-in">
              SSR SAP Learning &amp; Social Management Platform
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed mb-10">
              An enterprise-grade, Admin-Controlled educational and social platform designed specifically for SAP training institutes, corporate learners, consultants, and administrators.
            </p>
            <button
              className="bg-[#0A6ED1] hover:bg-[#063D8A] text-white font-bold py-4 px-10 rounded-full text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 mx-auto"
              onClick={() => window.open('/ssr-app', '_blank')}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Download App
            </button>
          </div>
        </section>

        <section className="container mx-auto px-4 mb-20">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 mb-8 border-b pb-4">User Roles & Permission Matrix (RBAC)</h2>
            <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-sm uppercase tracking-wider">
                    <th className="p-4 font-semibold border-b">Role</th>
                    <th className="p-4 font-semibold border-b">Platform Function</th>
                    <th className="p-4 font-semibold border-b">Private Chat</th>
                    <th className="p-4 font-semibold border-b">Group Creation</th>
                    <th className="p-4 font-semibold border-b">Post Management</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-600">
                  {roles.map((r, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-[#0A6ED1]">{r.role}</td>
                      <td className="p-4">{r.function}</td>
                      <td className="p-4">{r.chat}</td>
                      <td className="p-4">{r.group}</td>
                      <td className="p-4">{r.post}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 mb-20">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 mb-8 border-b pb-4">Module Specifications & Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f, i) => (
                <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                  <div className="text-4xl mb-4">{f.icon}</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{f.title}</h3>
                  <p className="text-slate-600 leading-relaxed text-sm">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 mb-20">
          <div className="max-w-5xl mx-auto bg-slate-900 rounded-2xl p-10 text-white shadow-xl">
            <h2 className="text-3xl font-bold mb-8 border-b border-slate-700 pb-4 text-[#F0AB00]">Enterprise Technology Stack</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div>
                <h3 className="text-xl font-bold text-emerald-400 mb-4">Frontend Engine</h3>
                <ul className="space-y-3 text-slate-300">
                  <li><span className="font-semibold text-white">Framework:</span> Next.js & React</li>
                  <li><span className="font-semibold text-white">Design System:</span> Custom SAP Brand Identity (SAP Blue, SAP Gold)</li>
                  <li><span className="font-semibold text-white">State Management:</span> Context API & Redux</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-bold text-blue-400 mb-4">Backend Infrastructure</h3>
                <ul className="space-y-3 text-slate-300">
                  <li><span className="font-semibold text-white">Framework:</span> Node.js</li>
                  <li><span className="font-semibold text-white">Database:</span> Prisma ORM with MongoDB/PostgreSQL</li>
                  <li><span className="font-semibold text-white">Security:</span> JWT, Argon2 Hashing, Strict Validation</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Ready to experience the platform?</h2>
          <button
            className="bg-[#0A6ED1] hover:bg-[#063D8A] text-white font-bold py-4 px-10 rounded-full text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 mx-auto"
            onClick={() => window.open('/ssr-app', '_blank')}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Download Now
          </button>
        </section>

      </main>
      <Footer />
    </>
  );
}
