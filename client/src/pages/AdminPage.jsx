import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, FileText, Activity, AlertTriangle, Ban, ShieldCheck,
  CheckCircle2, XCircle, Trash2, Eye,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import {
  getAdminStats, getAdminUsers, toggleBan, getAdminPosts, getReports, updateReport,
} from '../services/adminService';
import { deletePost } from '../services/postService';
import toast from 'react-hot-toast';

const TABS = ['Overview', 'Users', 'Posts', 'Reports'];

const AdminPage = () => {
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);
  const [activeTab, setActiveTab] = useState('Overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Role guard
  useEffect(() => {
    if (user && user.role !== 'admin') navigate('/', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    setLoading(true);
    Promise.all([
      getAdminStats(),
      getAdminUsers(),
      getAdminPosts(),
      getReports(),
    ])
      .then(([statsData, usersData, postsData, reportsData]) => {
        setStats(statsData);
        setUsers(usersData.users || usersData);
        setPosts(postsData.posts || postsData);
        setReports(reportsData.reports || reportsData);
      })
      .catch(() => toast.error('Failed to load admin data'))
      .finally(() => setLoading(false));
  }, [user]);

  const handleToggleBan = async (userId) => {
    try {
      const updated = await toggleBan(userId);
      setUsers(prev =>
        prev.map(u => u._id === userId ? { ...u, isDeactivated: updated.isDeactivated } : u)
      );
      toast.success(updated.isDeactivated ? 'User banned' : 'User unbanned');
    } catch {
      toast.error('Failed to update user status');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await deletePost(postId);
      setPosts(prev => prev.filter(p => p._id !== postId));
      toast.success('Post deleted');
    } catch {
      toast.error('Failed to delete post');
    }
  };

  const handleUpdateReport = async (reportId, status) => {
    try {
      await updateReport(reportId, { status });
      setReports(prev =>
        prev.map(r => r._id === reportId ? { ...r, status } : r)
      );
      toast.success(`Report ${status}`);
    } catch {
      toast.error('Failed to update report');
    }
  };

  // Build chart data from stats.userGrowth or generate last-7-day placeholders
  const chartData = (() => {
    if (stats?.userGrowth?.length) return stats.userGrowth;
    // fallback: last 7 days labels with 0
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }), users: 0 };
    });
  })();

  const statCards = stats ? [
    { label: 'Total Users',  value: stats.totalUsers?.toLocaleString()  || '—', icon: Users,         color: 'text-(--accent-primary)',   bg: 'bg-(--accent-primary)/10'   },
    { label: 'Total Posts',  value: stats.totalPosts?.toLocaleString()  || '—', icon: FileText,       color: 'text-(--accent-secondary)', bg: 'bg-(--accent-secondary)/10' },
    { label: 'Active Today', value: stats.activeToday?.toLocaleString() || '—', icon: Activity,       color: 'text-emerald-400',          bg: 'bg-emerald-400/10'          },
    { label: 'Reports',      value: stats.reports?.toLocaleString()     || '0', icon: AlertTriangle,  color: 'text-amber-400',            bg: 'bg-amber-400/10'            },
  ] : [];

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="w-full flex-1 flex flex-col pt-14 md:pt-0 overflow-y-auto custom-scrollbar h-[calc(100dvh-56px)] md:h-dvh">

      {/* Header */}
      <div className="sticky top-0 z-30 bg-(--bg-primary)/90 backdrop-blur-md border-b border-(--border-glass) py-4 px-4 sm:px-8">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck size={26} className="text-(--accent-secondary)" />
          <h1 className="text-2xl font-display font-bold">Admin Dashboard</h1>
        </div>
        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? 'bg-(--accent-primary)/15 text-(--accent-primary)'
                  : 'text-(--text-muted) hover:bg-(--bg-glass)'
              }`}
            >
              {tab}
              {tab === 'Reports' && reports.filter(r => r.status === 'pending').length > 0 && (
                <span className="ml-1.5 bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {reports.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-8 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-(--accent-primary) border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── OVERVIEW ── */}
            {activeTab === 'Overview' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                {/* Stat cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {statCards.map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="glass-card p-6"
                    >
                      <div className={`inline-flex p-3 rounded-2xl ${stat.bg} mb-4`}>
                        <stat.icon size={22} className={stat.color} />
                      </div>
                      <h3 className="text-3xl font-display font-bold mb-1">{stat.value}</h3>
                      <p className="text-sm text-(--text-muted) font-medium">{stat.label}</p>
                    </motion.div>
                  ))}
                </div>

                {/* User growth chart */}
                <div className="glass-card p-6">
                  <h3 className="font-display font-bold text-lg mb-6">User Growth</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="accentGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="var(--accent-primary)" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}   />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: 12, fontSize: 12 }}
                        labelStyle={{ color: 'var(--text-primary)' }}
                        itemStyle={{ color: 'var(--accent-primary)' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="users"
                        stroke="var(--accent-primary)"
                        strokeWidth={2}
                        fill="url(#accentGrad)"
                        dot={false}
                        activeDot={{ r: 4, fill: 'var(--accent-primary)' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Recent users preview */}
                <div className="glass-card overflow-hidden">
                  <div className="p-5 border-b border-(--border-glass) flex justify-between items-center">
                    <h3 className="font-display font-bold text-lg">Recent Users</h3>
                    <button onClick={() => setActiveTab('Users')} className="text-sm text-(--accent-primary) hover:underline">View all</button>
                  </div>
                  <UsersTable users={users.slice(0, 5)} onToggleBan={handleToggleBan} />
                </div>
              </motion.div>
            )}

            {/* ── USERS ── */}
            {activeTab === 'Users' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card overflow-hidden">
                <div className="p-5 border-b border-(--border-glass)">
                  <h3 className="font-display font-bold text-lg">All Users ({users.length})</h3>
                </div>
                <UsersTable users={users} onToggleBan={handleToggleBan} />
              </motion.div>
            )}

            {/* ── POSTS ── */}
            {activeTab === 'Posts' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card overflow-hidden">
                <div className="p-5 border-b border-(--border-glass)">
                  <h3 className="font-display font-bold text-lg">All Posts ({posts.length})</h3>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-(--border-glass) text-xs text-(--text-muted) uppercase tracking-wider">
                        <th className="px-5 py-3 font-medium">Author</th>
                        <th className="px-5 py-3 font-medium">Content</th>
                        <th className="px-5 py-3 font-medium">Likes</th>
                        <th className="px-5 py-3 font-medium">Date</th>
                        <th className="px-5 py-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-(--border-glass)">
                      {posts.map(post => (
                        <tr key={post._id} className="hover\:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Avatar src={post.author?.profilePic} size="xs" alt={post.author?.name} />
                              <div>
                                <p className="font-semibold text-(--text-primary) text-xs">{post.author?.name}</p>
                                <p className="text-[11px] text-(--text-muted)">@{post.author?.username}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 max-w-\[260px]">
                            <p className="truncate text-(--text-muted) text-xs">{post.text || <em>No text</em>}</p>
                          </td>
                          <td className="px-5 py-3 text-xs text-(--text-muted)">{post.likes?.length ?? 0}</td>
                          <td className="px-5 py-3 whitespace-nowrap text-(--text-muted) text-xs">
                            {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button
                              onClick={() => handleDeletePost(post._id)}
                              className="p-1.5 text-red-400 hover:bg-red-400/10 rounded transition-colors"
                              title="Delete post"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {posts.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-5 py-10 text-center text-(--text-muted) text-sm">No posts found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* ── REPORTS ── */}
            {activeTab === 'Reports' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card overflow-hidden">
                <div className="p-5 border-b border-(--border-glass) flex items-center justify-between">
                  <h3 className="font-display font-bold text-lg">Content Reports ({reports.length})</h3>
                  <div className="flex gap-2">
                    {['pending', 'reviewed', 'dismissed'].map(s => (
                      <span key={s} className="text-[11px] text-(--text-muted)">
                        {reports.filter(r => r.status === s).length} {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="divide-y divide-(--border-glass)">
                  {reports.map(report => (
                    <div key={report._id} className="p-5 hover\:bg-white/[0.02] transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge
                              variant={report.status === 'pending' ? 'warning' : report.status === 'reviewed' ? 'success' : 'default'}
                              className="text-[10px] uppercase"
                            >
                              {report.status}
                            </Badge>
                            <span className="text-xs font-semibold text-(--accent-primary) capitalize">{report.reason?.replace(/_/g, ' ')}</span>
                            <span className="text-[11px] text-(--text-muted)">
                              by @{report.reporter?.username} · {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : '—'}
                            </span>
                          </div>
                          {report.description && (
                            <p className="text-sm text-(--text-muted) mt-1">{report.description}</p>
                          )}
                          {report.reportedPost && (
                            <p className="text-xs text-(--text-dim) mt-1">
                              Post: <span className="text-(--text-muted)">{report.reportedPost?.text?.slice(0, 80) || report.reportedPost}</span>
                            </p>
                          )}
                          {report.reportedUser && (
                            <p className="text-xs text-(--text-dim) mt-1">
                              User: <span className="text-(--text-muted)">@{report.reportedUser?.username || report.reportedUser}</span>
                            </p>
                          )}
                        </div>
                        {report.status === 'pending' && (
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => handleUpdateReport(report._id, 'reviewed')}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-400/10 border border-emerald-400/30 rounded-lg transition-colors"
                            >
                              <CheckCircle2 size={13} /> Review
                            </button>
                            <button
                              onClick={() => handleUpdateReport(report._id, 'dismissed')}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-(--text-muted) hover:bg-white/5 border border-(--border-glass) rounded-lg transition-colors"
                            >
                              <XCircle size={13} /> Dismiss
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {reports.length === 0 && (
                    <div className="py-14 text-center text-(--text-muted) text-sm">No reports found</div>
                  )}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Extracted to avoid repetition
const UsersTable = ({ users, onToggleBan }) => (
  <div className="overflow-x-auto custom-scrollbar">
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="border-b border-(--border-glass) text-xs text-(--text-muted) uppercase tracking-wider">
          <th className="px-5 py-3 font-medium">User</th>
          <th className="px-5 py-3 font-medium">Joined</th>
          <th className="px-5 py-3 font-medium">Status</th>
          <th className="px-5 py-3 font-medium text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="text-sm divide-y divide-(--border-glass)">
        {users.map(u => (
          <tr key={u._id} className="hover\:bg-white/[0.02] transition-colors">
            <td className="px-5 py-3 whitespace-nowrap">
              <div className="flex items-center gap-3">
                <Avatar src={u.profilePic} size="sm" alt={u.name} />
                <div>
                  <p className="font-bold text-(--text-primary)">{u.name}</p>
                  <p className="text-xs text-(--text-muted)">@{u.username}</p>
                </div>
              </div>
            </td>
            <td className="px-5 py-3 whitespace-nowrap text-(--text-muted) text-xs">
              {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
            </td>
            <td className="px-5 py-3 whitespace-nowrap">
              <Badge variant={u.isDeactivated ? 'danger' : 'success'} className="text-[10px] uppercase">
                {u.isDeactivated ? 'banned' : 'active'}
              </Badge>
            </td>
            <td className="px-5 py-3 whitespace-nowrap text-right">
              <button
                onClick={() => onToggleBan(u._id)}
                className={`p-1.5 rounded transition-colors ${
                  u.isDeactivated ? 'text-emerald-400 hover:bg-emerald-400/10' : 'text-red-400 hover:bg-red-400/10'
                }`}
                title={u.isDeactivated ? 'Unban' : 'Ban'}
              >
                <Ban size={16} />
              </button>
            </td>
          </tr>
        ))}
        {users.length === 0 && (
          <tr>
            <td colSpan={4} className="px-5 py-10 text-center text-(--text-muted) text-sm">No users found</td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

export default AdminPage;
