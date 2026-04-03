import { NavLink, useLocation, useSearchParams } from 'react-router-dom';
import {
  Home as HomeIcon,
  Search as SearchIcon,
  PlusSquare as PlusIcon,
  Code2 as CodeIcon,
  MessageSquare as ChatIcon,
  User as UserIcon,
  Bookmark as BookmarkIcon
} from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { clearAllUnread } from '../../store/slices/chatSlice';
import Avatar from '../ui/Avatar';

const MobileNav = ({ onCompose }) => {
  const { user } = useSelector(state => state.auth);
  const { unreadCount } = useSelector(state => state.notifications);
  const { totalUnreadMessages } = useSelector(state => state.chat);
  const dispatch = useDispatch();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const isChatPage = location.pathname === '/chat';
  const isActiveChat = isChatPage && !!searchParams.get('conversationId');

  const navItems = [
    { icon: HomeIcon, path: '/' },
    { icon: SearchIcon, path: '/search' },
    { icon: PlusIcon, isAction: true },
    { icon: CodeIcon, path: '/code' },
    { icon: ChatIcon, path: '/chat', badge: totalUnreadMessages, onClick: () => dispatch(clearAllUnread()) },
    { icon: UserIcon, path: user ? `/profile/${user.username}` : '/login', isAvatar: true },
  ];

  return (
    <>
      {/* Mobile Topbar — hidden on pages that render their own header */}
      {(!isChatPage && location.pathname !== '/' && location.pathname !== '/notifications' && location.pathname !== '/search' && location.pathname !== '/settings' && location.pathname !== '/bookmarks' && location.pathname !== '/code' && !location.pathname.startsWith('/post/') && !location.pathname.startsWith('/profile/')) && (
        <div className="md:hidden sticky top-0 z-50 bg-(--bg-primary)/90 backdrop-blur-md border-b border-(--border-glass) flex items-center justify-between px-4 h-14">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-linear-to-br from-(--accent-primary) to-(--accent-secondary) flex items-center justify-center text-(--bg-primary) font-bold text-base font-display">
              DC
            </div>
            <span className="font-display font-bold text-base">DevConnect</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/bookmarks')} className="text-(--text-primary) hover:opacity-70 transition-opacity">
              <BookmarkIcon size={20} strokeWidth={2} />
            </button>
            {user && <Avatar src={user.profilePic} alt={user.name} size="sm" hasStory={user.hasStory} />}
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      {!isActiveChat && (
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-(--bg-primary)/95 backdrop-blur-xl border-t border-(--border-glass)"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="flex items-center justify-around h-14 px-1">
            {navItems.map((item, idx) => {
              if (item.isAction) {
                return (
                  <button
                    key={idx}
                    onClick={onCompose}
                    className="relative flex items-center justify-center p-2 rounded-xl transition-all -translate-y-3 touch-target"
                  >
                    <div className="w-11 h-11 rounded-full bg-linear-to-tr from-(--accent-primary) to-(--accent-secondary) flex items-center justify-center shadow-lg shadow-(--shadow-glow)">
                      <item.icon size={22} className="text-(--bg-primary)" />
                    </div>
                  </button>
                );
              }

              return (
                <NavLink
                  key={idx}
                  to={item.path}
                  onClick={item.onClick}
                  className={({ isActive }) =>
                    `relative flex items-center justify-center p-2 rounded-xl transition-all touch-target ${
                      isActive ? 'text-(--accent-primary)' : 'text-(--text-muted) hover:text-(--text-primary)'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {item.isAvatar && user ? (
                        <div className={`p-0.5 rounded-full ${isActive ? 'border-2 border-(--accent-primary)' : ''}`}>
                          <Avatar src={user.profilePic} alt={user.name} size="sm" hasStory={user.hasStory} />
                        </div>
                      ) : (
                        <div className="relative">
                          <item.icon size={22} />
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
      )}
    </>
  );
};

export default MobileNav;
