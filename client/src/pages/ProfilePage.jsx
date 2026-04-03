import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Settings, Grid3X3, MessageSquare, Bookmark,
  Heart, Play, Image as ImageIcon, Code2, ExternalLink,
  MessageCircle, Loader2, User as UserIcon
} from 'lucide-react';
import { format } from 'date-fns';
import Avatar from '../components/ui/Avatar';
import FollowersModal from '../components/FollowersModal';
import { getUserProfile, toggleFollow } from '../services/userService';
import { getUserPosts, getUserReplies, getUserLikedPosts, getUserMediaPosts, getUserCodePosts } from '../services/postService';
import { createConversation } from '../services/chatService';
import { addFollowing, removeFollowing } from '../store/slices/authSlice';

const formatCount = (n) => {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}K`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

// Grid tile for posts
const PostTile = ({ post }) => {
  const thumb = post.images?.[0] || post.image || null;
  const hasVideo = !!post.video;
  const hasMultiple = (post.images?.length || 0) > 1;
  const likeCount = post.likes?.length ?? 0;
  const commentCount = post.commentCount ?? post.comments?.length ?? 0;

  return (
    <Link to={`/post/${post._id}`} className="relative block aspect-square overflow-hidden bg-[#1a1a1a] group">
      {thumb ? (
        <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
      ) : hasVideo ? (
        <video src={post.video} className="w-full h-full object-cover" muted preload="metadata" />
      ) : (
        <div className="w-full h-full flex items-center justify-center p-3 bg-gradient-to-br from-[#1a1a1a] to-[#262626]">
          <p className="text-[11px] text-[#a8a8a8] line-clamp-4 text-center leading-relaxed">
            {post.text || 'No preview'}
          </p>
        </div>
      )}
      {/* Type indicator */}
      {hasMultiple && (
        <div className="absolute top-2 right-2">
          <ImageIcon size={16} className="text-white drop-shadow-lg" />
        </div>
      )}
      {hasVideo && (
        <div className="absolute top-2 right-2">
          <Play size={16} className="text-white fill-white drop-shadow-lg" />
        </div>
      )}
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-5">
        <div className="flex items-center gap-1.5 text-white font-semibold text-sm">
          <Heart size={18} className="fill-white" /> {formatCount(likeCount)}
        </div>
        <div className="flex items-center gap-1.5 text-white font-semibold text-sm">
          <MessageCircle size={18} className="fill-white" /> {formatCount(commentCount)}
        </div>
      </div>
    </Link>
  );
};

const ProfilePage = () => {
  const { username } = useParams();
  const { user: currentUser } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [followersModal, setFollowersModal] = useState({ open: false, tab: 'followers' });

  const isOwnProfile = currentUser && profile && currentUser._id === profile._id;
  // Check follow status from Redux state for global consistency
  const isFollowing = currentUser?.following?.some((f) => String(f._id || f) === String(profile?._id));

  useEffect(() => {
    if (!username) return;
    const load = async () => {
      setLoading(true);
      setActiveTab('posts');
      try {
        const userData = await getUserProfile(username);
        const postsData = await getUserPosts(userData._id).catch(() => ({ posts: [] }));
        setProfile(userData);
        setPosts(postsData.posts || []);
      } catch {
        setProfile(null);
        toast.error('User not found');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username]);

  const loadTabData = useCallback(async (tab) => {
    if (!profile) return;
    setTabLoading(true);
    setPosts([]);
    try {
      let data;
      switch (tab) {
        case 'posts': data = await getUserPosts(profile._id); break;
        case 'replies': data = await getUserReplies(profile._id); break;
        case 'likes': data = await getUserLikedPosts(profile._id); break;
        case 'media': data = await getUserMediaPosts(profile._id); break;
        case 'code': data = await getUserCodePosts(profile._id); break;
        default: data = { posts: [] };
      }
      setPosts(data.posts || []);
    } catch {
      setPosts([]);
    } finally {
      setTabLoading(false);
    }
  }, [profile]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    loadTabData(tab);
  };

  const handleFollow = async () => {
    if (!currentUser || !profile) return;
    setFollowLoading(true);
    const willBeFollowing = !isFollowing;
    
    // Optimistic update via Redux (syncs globally)
    if (willBeFollowing) {
      dispatch(addFollowing(profile._id));
    } else {
      dispatch(removeFollowing(profile._id));
    }
    
    // Also update local profile state for follower count
    setProfile((p) => ({
      ...p,
      followers: willBeFollowing
        ? [...(p.followers || []), currentUser]
        : p.followers.filter((f) => String(f._id) !== String(currentUser._id)),
    }));
    
    try {
      await toggleFollow(profile._id);
      toast.success(willBeFollowing ? 'Following' : 'Unfollowed');
    } catch {
      // Revert Redux state
      if (willBeFollowing) {
        dispatch(removeFollowing(profile._id));
      } else {
        dispatch(addFollowing(profile._id));
      }
      // Revert local profile state
      setProfile((p) => ({
        ...p,
        followers: willBeFollowing
          ? p.followers.filter((f) => String(f._id) !== String(currentUser._id))
          : [...(p.followers || []), currentUser],
      }));
      toast.error('Failed to update follow');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!profile) return;
    try {
      const conversation = await createConversation(profile._id);
      navigate(`/chat?conversationId=${conversation._id}`);
    } catch {
      toast.error('Failed to open conversation');
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="w-full flex-1 bg-black min-h-dvh">
        <div className="sticky top-0 z-30 bg-black border-b border-[#262626] h-14 flex items-center px-4">
          <ArrowLeft size={24} className="text-white opacity-50" />
        </div>
        <div className="animate-pulse px-4 pt-4 space-y-4">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-[#262626] shrink-0" />
            <div className="flex-1 flex justify-around">
              {[1,2,3].map(i => <div key={i} className="h-10 w-14 bg-[#262626] rounded" />)}
            </div>
          </div>
          <div className="h-3 w-32 bg-[#262626] rounded" />
          <div className="h-2 w-48 bg-[#262626] rounded" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center bg-black min-h-dvh text-center p-8">
        <p className="text-white text-lg font-semibold mb-2">User not found</p>
        <p className="text-[#a8a8a8] text-sm mb-4">@{username} hasn't joined DevConnect yet.</p>
        <button onClick={() => navigate(-1)} className="text-[#0095f6] font-semibold hover:underline">Go back</button>
      </div>
    );
  }

  const followerCount = profile.followers?.length ?? profile.followerCount ?? 0;
  const followingCount = profile.following?.length ?? profile.followingCount ?? 0;
  const postCount = profile.postCount ?? posts.length ?? 0;

  const tabs = [
    { key: 'posts', icon: <Grid3X3 size={22} /> },
    { key: 'replies', icon: <MessageSquare size={22} /> },
    { key: 'media', icon: <ImageIcon size={22} /> },
    { key: 'code', icon: <Code2 size={22} /> },
    { key: 'likes', icon: <Heart size={22} /> },
  ];

  return (
    <div className="w-full flex-1 flex flex-col bg-black min-h-dvh">

      {/* ── HEADER ── */}
      <div className="md:hidden sticky top-0 z-30 bg-black border-b border-[#262626] flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-5">
          <button onClick={() => navigate(-1)} className="text-white hover:opacity-70 transition-opacity">
            <ArrowLeft size={24} strokeWidth={2.5} />
          </button>
          <h1 className="text-[17px] font-bold text-accent-primary truncate max-w-[150px]">{profile.username}</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/bookmarks')} className="text-white hover:opacity-70 transition-opacity">
            <Bookmark size={24} strokeWidth={2} />
          </button>
          {isOwnProfile && (
            <button onClick={() => navigate('/settings')} className="text-white hover:opacity-70">
              <Settings size={24} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 md:pb-6">

        {/* ── PROFILE INFO ── */}
        <div className="px-4 pt-4">
          
          {/* Desktop Username Header - Only visible on desktop */}
          <div className="hidden md:flex items-center gap-4 mb-6">
            <h1 className="text-2xl font-bold text-accent-primary">@{profile.username}</h1>
          </div>

          {/* Avatar + Stats row (Instagram style) */}
          <div className="flex items-center gap-6 mb-4">
            {/* Avatar */}
            <div className="shrink-0 flex items-center justify-center">
              <Avatar 
                src={profile.profilePic} 
                alt={profile.name} 
                size="xl" 
                hasStory={profile.hasStory}
                userId={profile._id}
                className="md:scale-125 origin-center" 
              />
            </div>

            {/* Stats */}
            <div className="flex-1 flex justify-around text-center">
              <div>
                <p className="text-[17px] font-bold text-white">{formatCount(postCount)}</p>
                <p className="text-[13px] text-accent-primary">posts</p>
              </div>
              <button onClick={() => setFollowersModal({ open: true, tab: 'followers' })}>
                <p className="text-[17px] font-bold text-white">{formatCount(followerCount)}</p>
                <p className="text-[13px] text-accent-primary">followers</p>
              </button>
              <button onClick={() => setFollowersModal({ open: true, tab: 'following' })}>
                <p className="text-[17px] font-bold text-white">{formatCount(followingCount)}</p>
                <p className="text-[13px] text-accent-primary">following</p>
              </button>
            </div>
          </div>

          {/* Name + Bio */}
          <div className="mb-4">
            <p className="text-[14px] font-semibold text-white">{profile.name}</p>
            {profile.bio && (
              <p className="text-[14px] text-[#e0e0e0] mt-1 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
            )}
            {profile.website && (
              <a
                href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noreferrer"
                className="text-[14px] text-[#e0f1ff] font-medium mt-1 inline-flex items-center gap-1 hover:underline"
              >
                <ExternalLink size={12} />
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            {profile.createdAt && (
              <p className="text-[12px] text-[#a8a8a8] mt-1">Joined {format(new Date(profile.createdAt), 'MMMM yyyy')}</p>
            )}
          </div>

          {/* Action Buttons */}
          {isOwnProfile ? (
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => navigate('/settings')}
                className="flex-1 py-1.5 text-[13px] font-semibold text-white bg-[#262626] rounded-lg hover:bg-[#363636] transition-colors"
              >
                Edit profile
              </button>
              <button
                className="flex-1 py-1.5 text-[13px] font-semibold text-white bg-[#262626] rounded-lg hover:bg-[#363636] transition-colors"
              >
                Share profile
              </button>
            </div>
          ) : currentUser ? (
            <div className="flex gap-2 mb-4">
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`flex-1 py-1.5 text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50 ${
                  isFollowing
                    ? 'bg-[#262626] text-white hover:bg-[#363636]'
                    : 'bg-[#0095f6] text-white hover:bg-[#1aa1f7]'
                }`}
              >
                {followLoading ? (
                  <Loader2 size={14} className="animate-spin inline" />
                ) : isFollowing ? 'Following' : 'Follow'}
              </button>
              <button
                onClick={handleMessage}
                className="flex-1 py-1.5 text-[13px] font-semibold text-white bg-[#262626] rounded-lg hover:bg-[#363636] transition-colors"
              >
                Message
              </button>
            </div>
          ) : null}
        </div>

        {/* ── TABS (Icon strip like Instagram) ── */}
        <div className="border-t border-[#262626] flex">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex-1 flex justify-center py-3 transition-colors relative ${
                activeTab === tab.key ? 'text-white' : 'text-[#a8a8a8]'
              }`}
            >
              {tab.icon}
              {activeTab === tab.key && (
                <motion.div
                  layoutId="profileTabIndicator"
                  className="absolute top-0 left-0 right-0 h-0.5 bg-white"
                />
              )}
            </button>
          ))}
        </div>

        {/* ── CONTENT ── */}
        {tabLoading ? (
          <div className="grid grid-cols-3 gap-0.5">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-square bg-[#1a1a1a] animate-pulse" />
            ))}
          </div>
        ) : posts.length > 0 ? (
          activeTab === 'replies' ? (
            // Replies as list
            <div className="px-4 pt-3 space-y-3">
              {posts.map((comment) => (
                <div key={comment._id} className="bg-[#1a1a1a] rounded-xl p-3 border border-[#262626]">
                  {comment.post && (
                    <p className="text-[12px] text-[#a8a8a8] mb-1.5">
                      Replying to{' '}
                      <Link to={`/post/${comment.post._id}`} className="text-[#0095f6] hover:underline">
                        @{comment.post.author?.username}
                      </Link>
                      's post
                    </p>
                  )}
                  <p className="text-[13px] text-white">{comment.text}</p>
                  <p className="text-[11px] text-[#a8a8a8] mt-1.5">{format(new Date(comment.createdAt), 'MMM d, yyyy')}</p>
                </div>
              ))}
            </div>
          ) : (
            // Grid for all other tabs
            <div className="grid grid-cols-3 gap-0.5">
              {posts.map((post) => (
                <PostTile key={post._id} post={post} />
              ))}
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full border-2 border-[#363636] flex items-center justify-center mb-3">
              {activeTab === 'posts' && <Grid3X3 size={28} className="text-[#a8a8a8]" />}
              {activeTab === 'replies' && <MessageSquare size={28} className="text-[#a8a8a8]" />}
              {activeTab === 'media' && <ImageIcon size={28} className="text-[#a8a8a8]" />}
              {activeTab === 'code' && <Code2 size={28} className="text-[#a8a8a8]" />}
              {activeTab === 'likes' && <Heart size={28} className="text-[#a8a8a8]" />}
            </div>
            <p className="text-white font-semibold text-base">
              {activeTab === 'posts' ? 'No Posts Yet' :
               activeTab === 'replies' ? 'No Replies Yet' :
               activeTab === 'media' ? 'No Media Yet' :
               activeTab === 'code' ? 'No Code Snippets' :
               'No Liked Posts'}
            </p>
          </div>
        )}
      </div>

      {/* Followers/Following Modal */}
      <AnimatePresence>
        {followersModal.open && (
          <FollowersModal
            isOpen={true}
            onClose={() => setFollowersModal((prev) => ({ ...prev, open: false }))}
            userId={profile._id}
            initialTab={followersModal.tab}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfilePage;
