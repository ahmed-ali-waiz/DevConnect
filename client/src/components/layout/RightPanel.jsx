import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search as SearchIcon } from 'lucide-react';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import { getTrendingHashtags } from '../../services/searchService';
import { getSuggestedUsers, toggleFollow } from '../../services/userService';

const RightPanel = () => {
  const navigate = useNavigate();
  const authUser = useSelector(state => state.auth.user);
  const [trendingTags, setTrendingTags] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [following, setFollowing] = useState({});

  // Initialize following map from authUser so already-followed users show correct state
  useEffect(() => {
    if (authUser?.following?.length) {
      setFollowing(prev => {
        const map = { ...prev };
        authUser.following.forEach(f => { map[f._id || f] = true; });
        return map;
      });
    }
  }, [authUser?.following]);

  useEffect(() => {
    getTrendingHashtags()
      .then(data => setTrendingTags(data.slice(0, 5)))
      .catch(() => {});
    getSuggestedUsers()
      .then(data => setSuggestions((data.users || data).slice(0, 4)))
      .catch(() => {});
  }, []);

  const handleFollow = async (userId) => {
    try {
      const res = await toggleFollow(userId);
      setFollowing(prev => ({ ...prev, [userId]: res.following }));
    } catch {}
  };

  return (
    <motion.aside
      initial={{ x: 280, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
      className="hidden lg:block w-[280px] xl:w-[320px] h-screen sticky top-0 py-6 px-4 space-y-6 overflow-y-auto custom-scrollbar"
    >
      {/* Search */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-(--text-muted) group-focus-within:text-(--accent-primary) transition-colors">
          <SearchIcon size={18} />
        </div>
        <input
          type="text"
          placeholder="Search DevConnect"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              navigate(`/search?q=${encodeURIComponent(e.target.value.trim())}`);
              e.target.value = '';
            }
          }}
          className="w-full bg-(--bg-glass) border border-(--border-glass) rounded-full py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-(--accent-primary) focus:shadow-[0_0_0_1px_rgba(110,231,247,0.3)] transition-all placeholder-(--text-muted)"
        />
      </div>

      {/* Trending Today */}
      <div className="glass-card p-4">
        <h3 className="font-display font-bold text-lg mb-4">Trending Today</h3>
        <div className="space-y-4">
          {trendingTags.length > 0 ? trendingTags.map((trend, idx) => (
            <div
              key={idx}
              onClick={() => navigate(`/search?q=${encodeURIComponent('#' + (trend.tag || trend._id))}`)}
              className="flex justify-between items-center group cursor-pointer"
            >
              <div>
                <p className="text-xs text-(--text-muted)">Trending</p>
                <p className="font-semibold text-(--text-primary) group-hover:text-(--accent-primary) transition-colors">
                  #{trend.tag || trend._id}
                </p>
                <p className="text-xs text-(--text-muted)">{trend.count || trend.posts || 0} posts</p>
              </div>
              <div className="w-8 h-4 opacity-50 group-hover:opacity-100 transition-opacity">
                <svg viewBox="0 0 100 30" className="w-full h-full stroke-(--accent-primary) fill-transparent stroke-2">
                  <path d={`M0,${20 - idx} Q20,${30 + idx * 5} 40,15 T100,${10 + idx}`} />
                </svg>
              </div>
            </div>
          )) : (
            <p className="text-sm text-(--text-muted)">No trending tags yet</p>
          )}
        </div>
      </div>

      {/* Who to follow */}
      {suggestions.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="font-display font-bold text-lg mb-4">Who to Follow</h3>
          <div className="space-y-4">
            {suggestions.map((u) => (
              <div key={u._id} className="flex items-center justify-between">
                <div
                  className="flex items-center space-x-2 truncate cursor-pointer"
                  onClick={() => navigate(`/profile/${u.username}`)}
                >
                  <Avatar src={u.profilePic} alt={u.name} size="sm" />
                  <div className="truncate">
                    <p className="font-semibold text-sm truncate hover:underline">{u.name}</p>
                    <p className="text-xs text-(--text-muted) truncate">@{u.username}</p>
                  </div>
                </div>
                <Button
                  variant={following[u._id] ? 'ghost' : 'secondary'}
                  size="sm"
                  className="ml-2 px-3 py-1 text-xs flex-shrink-0"
                  onClick={() => handleFollow(u._id)}
                >
                  {following[u._id] ? 'Following' : 'Follow'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Links */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-(--text-muted) px-2">
        <a href="#" className="hover:underline">Terms of Service</a>
        <a href="#" className="hover:underline">Privacy Policy</a>
        <a href="#" className="hover:underline">Cookie Policy</a>
        <span>© 2026 DevConnect.</span>
      </div>
    </motion.aside>
  );
};

export default RightPanel;
