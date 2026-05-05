// apps/web/app/admin/page.tsx
// LOKASK Admin Dashboard — server-side with Supabase
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Stats {
  totalUsers: number;
  totalProviders: number;
  totalBookings: number;
  completedBookings: number;
  totalRevenue: number;
  totalServices: number;
  activeServices: number;
  newUsersToday: number;
}

interface RecentUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  city: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<RecentUser[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'bookings' | 'services'>('overview');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [
        { count: totalUsers },
        { count: totalProviders },
        { count: totalBookings },
        { count: completedBookings },
        { count: totalServices },
        { count: activeServices },
        { data: payments },
        { data: recentUsers },
        { data: recentBookings },
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).in('role', ['provider', 'both']),
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('services').select('*', { count: 'exact', head: true }),
        supabase.from('services').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('payments').select('amount').eq('status', 'succeeded'),
        supabase.from('users').select('id, full_name, email, role, city, created_at').order('created_at', { ascending: false }).limit(10),
        supabase.from('bookings').select(`
          id, status, total_amount, scheduled_at, created_at,
          service:services(title),
          customer:users!bookings_customer_id_fkey(full_name),
          provider:users!bookings_provider_id_fkey(full_name)
        `).order('created_at', { ascending: false }).limit(20),
      ]);

      const totalRevenue = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);

      setStats({
        totalUsers: totalUsers ?? 0,
        totalProviders: totalProviders ?? 0,
        totalBookings: totalBookings ?? 0,
        completedBookings: completedBookings ?? 0,
        totalRevenue,
        totalServices: totalServices ?? 0,
        activeServices: activeServices ?? 0,
        newUsersToday: 0,
      });
      setUsers((recentUsers || []) as RecentUser[]);
      setBookings(recentBookings || []);
    } finally {
      setLoading(false);
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    pending: '#F59E0B',
    confirmed: '#06B6D4',
    in_progress: '#6C63FF',
    completed: '#10B981',
    cancelled: '#EF4444',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-violet-400 text-lg font-semibold animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Sidebar */}
      <div className="flex">
        <aside className="w-64 min-h-screen bg-slate-900 border-r border-slate-800 flex flex-col p-6 fixed top-0 left-0 bottom-0">
          <div className="flex items-center gap-2 mb-10">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center text-lg font-black">⚡</div>
            <div>
              <span className="text-lg font-black tracking-widest text-white">LOKASK</span>
              <span className="text-xs text-slate-500 ml-2">Admin</span>
            </div>
          </div>

          <nav className="space-y-1 flex-1">
            {[
              { id: 'overview', icon: '📊', label: 'Overview' },
              { id: 'users', icon: '👥', label: 'Users' },
              { id: 'bookings', icon: '📅', label: 'Bookings' },
              { id: 'services', icon: '🛠', label: 'Services' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left ${
                  activeTab === item.id
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="pt-6 border-t border-slate-800">
            <a href="/" className="text-sm text-slate-500 hover:text-white transition-colors">
              ← Back to site
            </a>
          </div>
        </aside>

        {/* Main content */}
        <main className="ml-64 flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-white">
              {activeTab === 'overview' && 'Platform Overview'}
              {activeTab === 'users' && 'User Management'}
              {activeTab === 'bookings' && 'Booking Activity'}
              {activeTab === 'services' && 'Service Listings'}
            </h1>
            <p className="text-slate-400 mt-1">
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && stats && (
            <>
              {/* Stats grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                  { label: 'Total Users', value: stats.totalUsers, icon: '👥', color: 'violet', delta: '+12% this week' },
                  { label: 'Active Providers', value: stats.totalProviders, icon: '🛠', color: 'cyan', delta: `${Math.round((stats.totalProviders / (stats.totalUsers || 1)) * 100)}% of users` },
                  { label: 'Total Bookings', value: stats.totalBookings, icon: '📅', color: 'amber', delta: `${stats.completedBookings} completed` },
                  { label: 'Total Volume', value: `€${stats.totalRevenue.toFixed(0)}`, icon: '💰', color: 'emerald', delta: '0% platform fee' },
                  { label: 'Active Services', value: stats.activeServices, icon: '⚡', color: 'violet', delta: `${stats.totalServices} total` },
                  { label: 'Completion Rate', value: `${stats.totalBookings ? Math.round((stats.completedBookings / stats.totalBookings) * 100) : 0}%`, icon: '✅', color: 'emerald', delta: 'of all bookings' },
                ].map(stat => (
                  <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{stat.icon}</span>
                      <span className="text-xs text-slate-500">{stat.delta}</span>
                    </div>
                    <p className="text-3xl font-black text-white mb-1">{stat.value}</p>
                    <p className="text-sm text-slate-400">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Recent users preview */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-white">Recent Sign-ups</h2>
                  <button onClick={() => setActiveTab('users')} className="text-sm text-violet-400 hover:text-violet-300">
                    View all →
                  </button>
                </div>
                <div className="space-y-3">
                  {users.slice(0, 5).map(user => (
                    <div key={user.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-800/50 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-violet-600/20 flex items-center justify-center text-sm font-bold text-violet-400">
                        {user.full_name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{user.full_name}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                        user.role === 'provider' ? 'bg-cyan-900/50 text-cyan-400'
                        : user.role === 'both' ? 'bg-violet-900/50 text-violet-400'
                        : 'bg-slate-800 text-slate-400'
                      }`}>
                        {user.role}
                      </span>
                      <p className="text-xs text-slate-600 whitespace-nowrap">
                        {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-800">
                <div className="flex items-center gap-4">
                  <input
                    type="search"
                    placeholder="Search users..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      {['Name', 'Email', 'Role', 'City', 'Joined'].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {users.map(user => (
                      <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center text-xs font-bold text-violet-400">
                              {user.full_name?.charAt(0)?.toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-white">{user.full_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">{user.email}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                            user.role === 'provider' ? 'bg-cyan-900/50 text-cyan-400'
                            : user.role === 'both' ? 'bg-violet-900/50 text-violet-400'
                            : 'bg-slate-800 text-slate-400'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">{user.city || '—'}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bookings Tab */}
          {activeTab === 'bookings' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      {['Service', 'Customer', 'Provider', 'Amount', 'Status', 'Scheduled'].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {bookings.map(booking => (
                      <tr key={booking.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-white max-w-[200px] truncate">
                          {booking.service?.title || '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">
                          {booking.customer?.full_name || '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">
                          {booking.provider?.full_name || '—'}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-emerald-400">
                          €{Number(booking.total_amount).toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium px-2 py-1 rounded-lg" style={{
                            backgroundColor: `${STATUS_COLORS[booking.status]}20`,
                            color: STATUS_COLORS[booking.status],
                          }}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {new Date(booking.scheduled_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
