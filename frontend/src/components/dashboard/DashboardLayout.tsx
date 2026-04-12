import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Bot, MessageSquare, LogOut, Zap } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/');
  };

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/dashboard/agents', icon: Bot, label: 'Agents' },
    { to: '/dashboard/conversations', icon: MessageSquare, label: 'Conversations' },
  ];

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg)' }}>
      <aside className="w-60 flex flex-col flex-shrink-0 border-r" style={{ background: 'var(--bg-2, #0c0a1a)', borderColor: 'var(--border)' }}>
        {/* Logo */}
        <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}>
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white text-base tracking-tight">SupportAI</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive ? 'active-nav' : 'inactive-nav'
                }`
              }
              style={({ isActive }) => isActive ? {
                background: 'rgba(139,92,246,0.15)',
                color: 'var(--primary-light)',
                boxShadow: 'inset 0 0 0 1px rgba(139,92,246,0.3)',
              } : {
                color: 'var(--text-muted)',
              }}
            >
              {({ isActive }) => (
                <>
                  <Icon className="w-4 h-4 flex-shrink-0" style={{ color: isActive ? 'var(--primary-light)' : 'inherit' }} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
            <span className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium capitalize"
              style={{ background: 'rgba(139,92,246,0.15)', color: 'var(--primary-light)', border: '1px solid rgba(139,92,246,0.25)' }}>
              {user?.plan}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--error)'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto scrollbar-thin">
        <Outlet />
      </main>
    </div>
  );
}
