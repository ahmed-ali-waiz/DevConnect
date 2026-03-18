import { NavLink } from 'react-router-dom';
import {
  Home as HomeIcon,
  Search as SearchIcon,
  PlusSquare as PlusIcon,
  Bell as BellIcon,
  User as UserIcon
} from 'lucide-react';
import { useSelector } from 'react-redux';
import Avatar from '../ui/Avatar';

const MobileNav = ({ onCompose }) => {
  const { user } = useSelector(state => state.auth);
  const { unreadCount } = useSelector(state => state.notifications);

  const navItems = [
    { icon: HomeIcon, path: '/' },
    { icon: SearchIcon, path: '/search' },
    { icon: PlusIcon, isAction: true },
    { icon: BellIcon, path: '/notifications', badge: unreadCount },
    { icon: UserIcon, path: user ? `/profile/${user.username}` : '/login', isAvatar: true },
  ];

  return (
    <>
      {/* Mobile Topbar */}
      <div className="md:hidden sticky top-0 z-40 bg-(--bg-primary)/80 backdrop-blur-md border-b border-(--border-glass) flex items-center justify-between px-4 h-14">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-(--accent-primary) to-(--accent-secondary) flex items-center justify-center text-(--bg-primary) font-bold text-sm font-display">
            DC
          </div>
          <span className="font-display font-bold">DevConnect</span>
        </div>
        {user && <Avatar src={user.profilePic} alt={user.name} size="sm" />}
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-(--bg-primary)/90 backdrop-blur-lg border-t border-(--border-glass) pb-safe">
        <div className="flex items-center justify-around h-14 px-2">
          {navItems.map((item, idx) => {
            if (item.isAction) {
              return (
                <button
                  key={idx}
                  onClick={onCompose}
                  className="relative flex items-center justify-center p-2 rounded-xl transition-all -translate-y-4"
                >
                  <div className="w-12 h-12 rounded-full bg-linear-to-tr from-(--accent-primary) to-(--accent-secondary) flex items-center justify-center shadow-lg shadow-(--shadow-glow)">
                    <item.icon size={24} className="text-(--bg-primary)" />
                  </div>
                </button>
              );
            }

            return (
              <NavLink
                key={idx}
                to={item.path}
                className={({ isActive }) =>
                  `relative flex items-center justify-center p-2 rounded-xl transition-all ${
                    isActive ? 'text-(--accent-primary)' : 'text-(--text-muted) hover:text-(--text-primary)'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {item.isAvatar && user ? (
                      <div className={`p-0.5 rounded-full ${isActive ? 'border-2 border-(--accent-primary)' : ''}`}>
                        <Avatar src={user.profilePic} alt={user.name} size="sm" />
                      </div>
                    ) : (
                      <div className="relative">
                        <item.icon size={24} />
                        {item.badge > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                            {item.badge > 9 ? '9+' : item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default MobileNav;
