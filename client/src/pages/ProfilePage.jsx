import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import toast from 'react-hot-toast';
import { MapPin, Link as LinkIcon, Calendar, MessageCircle, UserPlus, UserMinus, FileCode2, Pin } from 'lucide-react';
import { format } from 'date-fns';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import PostCard from '../components/post/PostCard';
import Skeleton from '../components/ui/Skeleton';
import FollowersModal from '../components/FollowersModal';
import { getUserProfile, toggleFollow } from '../services/userService';
import { getUserPosts, getUserReplies, getUserLikedPosts, getUserMediaPosts, getUserCodePosts } from '../services/postService';
import { createConversation } from '../services/chatService';

gsap.registerPlugin(ScrollTrigger);

const ProfilePage = () => {
  const { username } = useParams();
  const { user: currentUser } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Posts');
  const [followersModal, setFollowersModal] = useState({ open: false, tab: 'followers' });
  const containerRef = useRef(null);

  const isOwnProfile = currentUser && profile && currentUser._id === profile._id;
  const isFollowing = profile?.followers?.some((f) => String(f._id) === String(currentUser?._id));

  useEffect(() => {
    if (!username) return;
    const load = async () => {
      setLoading(true);
      setActiveTab('Posts');
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
        case 'Posts':
          data = await getUserPosts(profile._id);
          break;
        case 'Replies':
          data = await getUserReplies(profile._id);
          break;
        case 'Likes':
          data = await getUserLikedPosts(profile._id);
          break;
        case 'Media':
          data = await getUserMediaPosts(profile._id);
          break;
        case 'Code':
          data = await getUserCodePosts(profile._id);
          break;
        default:
          data = { posts: [] };
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
    
    // Calculate the action based on current state
    const willBeFollowing = !isFollowing;
    
    // Optimistic update - update UI immediately
    setProfile((p) => ({
      ...p,
      followers: willBeFollowing 
        ? [...(p.followers || []), currentUser] 
        : p.followers.filter((f) => String(f._id) !== String(currentUser._id)),
    }));
    
    try {
      const response = await toggleFollow(profile._id);
      // Verify with backend response
      setProfile((p) => ({
        ...p,
        followers: willBeFollowing 
          ? [...(p.followers || [])]
          : p.followers.filter((f) => String(f._id) !== String(currentUser._id)),
      }));
      toast.success(willBeFollowing ? 'Following' : 'Unfollowed');
    } catch (error) {
      // Revert optimistic update on error
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

  useGSAP(() => {
    if (!containerRef.current) return;
    gsap.to('.cover-image-parallax', {
      yPercent: 30,
      ease: 'none',
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: 'bottom top',
        scrub: true
      }
    });

    gsap.to('.profile-avatar-wrapper', {
      y: -5,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
  }, { scope: containerRef, dependencies: [profile] });

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton type="image" className="h-48 w-full" />
        <div className="flex gap-4">
          <Skeleton type="avatar" className="w-24 h-24" />
          <div className="flex-1 space-y-2">
            <Skeleton type="text" className="w-1/2" />
            <Skeleton type="text" className="w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center text-(--text-muted) flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-20 h-20 mx-auto bg-(--bg-glass) rounded-full flex items-center justify-center mb-4 border border-(--border-glass)">
          <MapPin size={32} className="opacity-50" />
        </div>
        <p className="text-lg font-display font-bold text-(--text-primary) mb-1">User not found</p>
        <p className="text-sm mb-6">@{username} hasn't joined DevConnect yet.</p>
        {!currentUser ? (
          <Link to="/register">
            <Button>Register here</Button>
          </Link>
        ) : (
          <Link to="/">
            <Button variant="secondary">Back to Home</Button>
          </Link>
        )}
      </div>
    );
  }

  const followerCount = profile.followers?.length ?? profile.followerCount ?? 0;
  const followingCount = profile.following?.length ?? profile.followingCount ?? 0;

  return (
    <div ref={containerRef} className="pb-20 md:pb-8 w-full block overflow-x-hidden">
      {/* Cover Image Header */}
      <div className="relative w-full h-50 sm:h-70 overflow-hidden group border-b border-(--border-glass)">
        <div
          className="cover-image-parallax absolute inset-0 w-full h-[130%] -top-[15%] bg-cover bg-center"
          style={{ backgroundImage: `url(${profile.coverImage || 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2000&auto=format&fit=crop'})` }}
        />
        <div className="absolute inset-0 bg-linear-to-t from-(--bg-primary) via-(--bg-primary)/40 to-transparent" />
      </div>

      <div className="px-4 sm:px-6 relative">
        {/* Avatar & Actions row */}
        <div className="flex justify-between items-end -mt-16 sm:-mt-20 mb-4">
          <div className="profile-avatar-wrapper relative z-10 w-24 h-24 sm:w-32 sm:h-32 rounded-full p-1 bg-linear-to-tr from-(--accent-primary) to-(--accent-secondary) shadow-2xl">
            <div className="w-full h-full rounded-full border-4 border-(--bg-primary) overflow-hidden bg-(--bg-primary)">
              <img src={profile.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=0D1117&color=6EE7F7`} alt={profile.name} className="w-full h-full object-cover" />
            </div>
          </div>

          {!isOwnProfile && currentUser && (
            <div className="flex space-x-2 z-10 pt-4">
              <Button variant="ghost" size="icon" className="border border-(--border-glass) bg-(--bg-secondary)/50 backdrop-blur-md" onClick={handleMessage}>
                <MessageCircle size={18} />
              </Button>
              <Button className="px-6" onClick={handleFollow} isLoading={followLoading} disabled={followLoading}>
                {isFollowing ? <><UserMinus size={16} className="mr-2" /> Unfollow</> : <><UserPlus size={16} className="mr-2" /> Follow</>}
              </Button>
            </div>
          )}
        </div>

        {/* Profile Info */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-(--text-primary) flex items-center space-x-2">
            <span>{profile.name}</span>
            {profile.isVerified && (
              <Badge variant="primary" className="ml-2 px-1.5!">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </Badge>
            )}
          </h1>
          <p className="text-(--text-muted) mt-1 font-medium">@{profile.username}</p>

          {profile.bio && (
            <p className="mt-4 text-[15px] leading-relaxed text-(--text-primary) max-w-3xl">
              {profile.bio}
            </p>
          )}

          <div className="flex flex-wrap gap-y-2 gap-x-4 mt-4 text-[13px] text-(--text-muted)">
            {profile.location && (
              <div className="flex items-center space-x-1">
                <MapPin size={14} /><span>{profile.location}</span>
              </div>
            )}
            {profile.website && (
              <div className="flex items-center space-x-1 hover:text-(--accent-primary)">
                <LinkIcon size={14} />
                <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noreferrer">
                  {profile.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
            {profile.createdAt && (
              <div className="flex items-center space-x-1">
                <Calendar size={14} /><span>Joined {format(new Date(profile.createdAt), 'MMMM yyyy')}</span>
              </div>
            )}
          </div>

          {profile.skills?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.skills.map((skill, i) => (
                <Badge key={i} variant="neutral" className="text-[10px] uppercase font-bold tracking-wider">{skill}</Badge>
              ))}
            </div>
          )}

          <div className="flex items-center space-x-6 mt-6">
            <button onClick={() => setFollowersModal({ open: true, tab: 'following' })} className="flex items-baseline space-x-1 hover:underline">
              <span className="font-bold text-(--text-primary)">{followingCount}</span>
              <span className="text-sm text-(--text-muted)">Following</span>
            </button>
            <button onClick={() => setFollowersModal({ open: true, tab: 'followers' })} className="flex items-baseline space-x-1 hover:underline">
              <span className="font-bold text-(--text-primary)">{followerCount}</span>
              <span className="text-sm text-(--text-muted)">Followers</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-(--border-glass) px-4">
        <div className="flex space-x-8 overflow-x-auto custom-scrollbar">
          {['Posts', 'Replies', 'Likes', 'Media', 'Code'].map(tab => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className="relative py-4 text-sm font-semibold transition-colors group"
            >
              <span className={activeTab === tab ? 'text-(--text-primary)' : 'text-(--text-muted) group-hover:text-(--text-primary)'}>
                {tab}
              </span>
              {activeTab === tab && (
                <motion.div
                  layoutId="profileTab"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-(--accent-primary) rounded-t-full shadow-(--shadow-glow)"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 sm:p-6 min-h-[40vh]">
        {/* Pinned Post */}
        {activeTab === 'Posts' && profile.pinnedPost && (
          <div className="mb-4">
            <div className="flex items-center space-x-2 text-(--text-muted) text-xs mb-2 px-2">
              <Pin size={12} />
              <span>Pinned post</span>
            </div>
            <PostCard post={profile.pinnedPost} />
          </div>
        )}

        {tabLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} type="card" />)}
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-4">
            {activeTab === 'Replies' ? (
              posts.map((comment) => (
                <div key={comment._id} className="glass-card p-4 rounded-xl">
                  {comment.post && (
                    <div className="mb-2 text-xs text-(--text-muted)">
                      Replying to <Link to={`/post/${comment.post._id}`} className="text-(--accent-primary) hover:underline">@{comment.post.author?.username}</Link>'s post
                    </div>
                  )}
                  <p className="text-sm text-(--text-primary)">{comment.text}</p>
                  <p className="text-xs text-(--text-muted) mt-2">{format(new Date(comment.createdAt), 'MMM d, yyyy')}</p>
                </div>
              ))
            ) : (
              posts.map((post) => (
                <PostCard key={post._id} post={post} />
              ))
            )}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-(--text-muted) py-16">
            <div className="w-20 h-20 mx-auto bg-(--bg-glass) rounded-full flex items-center justify-center mb-4 border border-(--border-glass)">
              <FileCode2 size={32} className="opacity-50" />
            </div>
            <p className="text-lg font-display mb-1">
              {activeTab === 'Posts' ? `${profile.name} hasn't posted yet.` :
               activeTab === 'Replies' ? 'No replies yet.' :
               activeTab === 'Likes' ? 'No liked posts yet.' :
               activeTab === 'Media' ? 'No media posts yet.' :
               'No code snippets yet.'}
            </p>
          </motion.div>
        )}
      </div>

      {/* Followers / Following Modal */}
      <FollowersModal
        isOpen={followersModal.open}
        onClose={() => setFollowersModal({ open: false, tab: 'followers' })}
        userId={profile._id}
        initialTab={followersModal.tab}
      />
    </div>
  );
};

export default ProfilePage;
