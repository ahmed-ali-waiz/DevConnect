import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home as HomeIcon,
  Search as SearchIcon,
  Bell as BellIcon,
  MessageSquare as ChatIcon,
  Bookmark as BookmarkIcon,
  TrendingUp as TrendingIcon,
  User as UserIcon,
  Settings as SettingsIcon,
  LogOut as LogOutIcon
} from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { clearAllUnread } from '../../store/slices/chatSlice';
import { logout as logoutApi } from '../../services/authService';
import Avatar from '../ui/Avatar';

const Sidebar = ({ onCompose }) => {
  const { user } = useSelector(state => state.auth);
  const { unreadCount } = useSelector(state => state.notifications);
  const { conversations } = useSelector(state => state.chat);
  const unreadMessages = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const navItems = [
    { icon: HomeIcon, label: 'Home', path: '/' },
    { icon: SearchIcon, label: 'Search', path: '/search' },
    { icon: BellIcon, label: 'Notifications', path: '/notifications', badge: unreadCount },
    { icon: ChatIcon, label: 'Messages', path: '/chat', badge: unreadMessages, onClick: () => dispatch(clearAllUnread()) },
    { icon: BookmarkIcon, label: 'Bookmarks', path: '/bookmarks' },
    { icon: TrendingIcon, label: 'Trending', path: '/trending' },
    { icon: UserIcon, label: 'Profile', path: user ? `/profile/${user.username}` : '/login' },
    { icon: SettingsIcon, label: 'Settings', path: '/settings' },
  ];

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // ignore
    }
    dispatch(logout());
    navigate('/login');
  };

  return (
    <motion.aside 
      initial={{ x: -260, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="hidden md:flex flex-col w-16 xl:w-64 h-dvh min-h-0 sticky top-0 shrink-0 self-start border-r border-(--border-glass) pt-4 pb-6 px-2 xl:px-4"
    >
      {/* Logo */}
      <div className="flex items-center justify-center xl:justify-start px-1 xl:px-2 mb-6">
        <div 
          className="w-10 h-10 xl:w-12 xl:h-12 rounded-xl bg-linear-to-br from-(--accent-primary) to-(--accent-secondary) flex items-center justify-center text-(--bg-primary) font-bold text-lg xl:text-xl font-display shadow-md shrink-0"
        >
          DC
        </div>
        <span className="hidden xl:block ml-3 text-xl font-display font-bold">DevConnect</span>
      </div>

      {/* Nav Items */}
      <nav className="flex min-h-0 flex-1 flex-col space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            onClick={item.onClick}
            className={({ isActive }) =>
              `nav-item relative flex items-center justify-center xl:justify-start px-2 xl:px-4 py-3 rounded-xl transition-all duration-300 group min-h-[44px]
              ${isActive 
                ? 'bg-(--bg-glass) text-(--text-primary) font-semibold' 
                : 'text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-glass)'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div 
                    layoutId="activeNavIndicator"
                    className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-(--accent-primary) rounded-r-full shadow-(--shadow-glow)"
                  />
                )}
                <div className="relative shrink-0">
                  <item.icon className="w-6 h-6" />
                  {item.badge > 0 && (
                    <motion.div 
                      key={item.badge}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold"
                    >
                      {item.badge > 9 ? '9+' : item.badge}
                    </motion.div>
                  )}
                </div>
                <span className="hidden xl:block ml-4 text-sm">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Card at bottom */}
      {user ? (
        <div className="mt-auto pt-4 border-t border-(--border-glass)">
          <button className="w-full flex items-center justify-center xl:justify-between p-2 rounded-xl hover:bg-(--bg-glass) transition-colors group">
            <div className="flex items-center overflow-hidden">
              <Avatar src={user.profilePic} alt={user.name} size="md" className="shrink-0" />
              <div className="hidden xl:flex flex-col items-start truncate text-left ml-3">
                <span className="font-semibold text-sm truncate w-full">{user.name}</span>
                <span className="text-xs text-(--text-muted) truncate w-full">@{user.username}</span>
              </div>
            </div>
            <div onClick={handleLogout} className="hidden xl:block opacity-0 group-hover:opacity-100 transition-opacity text-(--text-muted) hover:text-red-400 p-2 ml-auto">
              <LogOutIcon size={18} />
            </div>
          </button>
        </div>
      ) : (
        <div className="mt-auto pt-4 border-t border-(--border-glass)">
          <NavLink to="/login" className="flex items-center justify-center xl:justify-start px-2 xl:px-4 py-3 rounded-xl text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-glass) transition-colors text-sm font-semibold min-h-[44px]">
            Sign In
          </NavLink>
        </div>
      )}
    </motion.aside>
  );
};

export default Sidebar;
