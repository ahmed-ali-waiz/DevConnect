import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, User, Lock, Bell, Moon, EyeOff, ShieldAlert, Check, Camera, X, ChevronRight, Loader2, LogOut } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import Modal from '../components/ui/Modal';
import { updateProfile, updateNotificationPreferences, updatePrivacySettings } from '../services/userService';
import { changePassword, deleteAccount, deactivateAccount, logout as logoutApi } from '../services/authService';
import { updateProfileOptimistic, logout as logoutAction } from '../store/slices/authSlice';
import { useTheme } from '../context/ThemeContext';

// ── Toggle Switch ────────────────────────────────────────────────
const Toggle = ({ enabled, onChange }) => (
  <button
    type="button"
    onClick={onChange}
    className={`w-[44px] h-[26px] rounded-full relative transition-colors shrink-0 ${
      enabled ? 'bg-[#0095f6]' : 'bg-[#363636]'
    }`}
  >
    <span
      className={`absolute top-[3px] w-5 h-5 rounded-full bg-white transition-all shadow-sm ${
        enabled ? 'right-[3px]' : 'left-[3px]'
      }`}
    />
  </button>
);

// ── Input Field ──────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div>
    <label className="block text-[13px] font-medium text-[#a8a8a8] mb-1.5">{label}</label>
    {children}
  </div>
);

const inputClass = "w-full bg-[#1a1a1a] border border-[#363636] rounded-xl px-4 py-3 text-[14px] text-white placeholder-[#555] outline-none focus:border-[#0095f6] transition-colors";

const SettingsPage = () => {
  const { user } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { theme, toggleTheme, accentColor, setAccentColor } = useTheme();
  const [activeSection, setActiveSection] = useState(null); // null = main menu
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '', username: '', email: '', bio: '', location: '', website: '', github: '',
  });

  const [profilePicFile, setProfilePicFile] = useState(null);
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState(null);
  const profilePicRef = useRef(null);
  const coverImageRef = useRef(null);

  const [securityForm, setSecurityForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [notifPrefs, setNotifPrefs] = useState({
    newFollowers: true, likes: true, comments: true, mentions: true, messages: true,
  });
  const [privacySettings, setPrivacySettings] = useState({
    isPrivate: false, hideFromSearch: false, showOnlineStatus: true,
  });
  const [dangerModal, setDangerModal] = useState({ show: false, type: null });
  const [dangerPassword, setDangerPassword] = useState('');
  const [dangerLoading, setDangerLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '', username: user.username || '', email: user.email || '',
        bio: user.bio || '', location: user.location || '', website: user.website || '', github: user.github || '',
      });
      if (user.notificationPreferences) setNotifPrefs(user.notificationPreferences);
      if (user.privacySettings) setPrivacySettings(user.privacySettings);
    }
  }, [user]);

  const handleProfilePicChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfilePicFile(file);
    setProfilePicPreview(URL.createObjectURL(file));
  };
  const handleCoverImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverImageFile(file);
    setCoverImagePreview(URL.createObjectURL(file));
  };
  const clearProfilePic = () => { setProfilePicFile(null); setProfilePicPreview(null); if (profilePicRef.current) profilePicRef.current.value = ''; };
  const clearCoverImage = () => { setCoverImageFile(null); setCoverImagePreview(null); if (coverImageRef.current) coverImageRef.current.value = ''; };

  const handleSave = async (e) => {
    e?.preventDefault();
    setIsSaving(true);
    try {
      if (activeSection === 'account') {
        const payload = { ...formData };
        if (profilePicFile) payload.profilePic = profilePicFile;
        if (coverImageFile) payload.coverImage = coverImageFile;
        const updated = await updateProfile(payload);
        dispatch(updateProfileOptimistic(updated));
        clearProfilePic(); clearCoverImage();
        toast.success('Profile updated!');
      } else if (activeSection === 'security') {
        if (!securityForm.currentPassword || !securityForm.newPassword) return toast.error('All fields are required');
        if (securityForm.newPassword !== securityForm.confirmPassword) return toast.error('Passwords do not match');
        if (securityForm.newPassword.length < 6) return toast.error('Password must be at least 6 characters');
        await changePassword(securityForm.currentPassword, securityForm.newPassword);
        setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        toast.success('Password changed!');
      } else if (activeSection === 'notifications') {
        const updated = await updateNotificationPreferences(notifPrefs);
        dispatch(updateProfileOptimistic({ notificationPreferences: updated }));
        toast.success('Notifications updated!');
      } else if (activeSection === 'privacy') {
        const updated = await updatePrivacySettings(privacySettings);
        dispatch(updateProfileOptimistic({ privacySettings: updated }));
        toast.success('Privacy settings saved!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDangerAction = async () => {
    if (!dangerPassword) return toast.error('Password required');
    setDangerLoading(true);
    try {
      if (dangerModal.type === 'delete') { await deleteAccount(dangerPassword); toast.success('Account deleted'); }
      else { await deactivateAccount(dangerPassword); toast.success('Account deactivated'); }
      dispatch(logoutAction()); navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setDangerLoading(false); setDangerModal({ show: false, type: null }); setDangerPassword('');
    }
  };

  const handleLogout = async () => {
    try { await logoutApi(); } catch {}
    dispatch(logoutAction());
    navigate('/login');
  };

  const menuItems = [
    { key: 'account', icon: User, label: 'Edit profile', desc: 'Name, username, bio, images' },
    { key: 'security', icon: Lock, label: 'Password', desc: 'Change your password' },
    { key: 'notifications', icon: Bell, label: 'Notifications', desc: 'Push and email preferences' },
    { key: 'privacy', icon: EyeOff, label: 'Privacy', desc: 'Account visibility settings' },
    { key: 'appearance', icon: Moon, label: 'Appearance', desc: 'Theme and accent color' },
    { key: 'danger', icon: ShieldAlert, label: 'Account actions', desc: 'Delete or deactivate', danger: true },
  ];

  const notifKeys = [
    { key: 'newFollowers', label: 'New followers' },
    { key: 'likes', label: 'Likes on posts' },
    { key: 'comments', label: 'Comments' },
    { key: 'mentions', label: 'Mentions' },
    { key: 'messages', label: 'Messages' },
  ];

  const privacyKeys = [
    { key: 'isPrivate', label: 'Private account', desc: 'Only approved followers can see your posts' },
    { key: 'hideFromSearch', label: 'Hide from search', desc: 'Your profile won\'t appear in search results' },
    { key: 'showOnlineStatus', label: 'Show online status', desc: 'Let others see when you\'re active' },
  ];

  // ── Render Section Content ──────────────────────────────────
  const renderSection = () => {
    switch (activeSection) {
      case 'account':
        return (
          <form onSubmit={handleSave} className="space-y-5 px-4 pt-4 pb-32">
            {/* Profile Picture */}
            <div className="flex flex-col items-center py-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#363636]">
                  <img
                    src={profilePicPreview || user?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=262626&color=fff`}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => profilePicRef.current?.click()}
                  className="absolute bottom-0 right-0 w-7 h-7 bg-[#0095f6] rounded-full flex items-center justify-center border-2 border-black"
                >
                  <Camera size={14} className="text-white" />
                </button>
                {profilePicPreview && (
                  <button type="button" onClick={clearProfilePic} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white">
                    <X size={10} />
                  </button>
                )}
              </div>
              <button type="button" onClick={() => profilePicRef.current?.click()} className="text-[13px] font-semibold text-[#0095f6] mt-3 hover:text-white transition-colors">
                Change profile photo
              </button>
              <input ref={profilePicRef} type="file" accept="image/*" onChange={handleProfilePicChange} className="hidden" />
            </div>

            <Field label="Name">
              <input type="text" className={inputClass} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </Field>
            <Field label="Username">
              <input type="text" className={inputClass} value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
            </Field>
            <Field label="Email">
              <input type="email" className={inputClass} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </Field>
            <Field label="Bio">
              <textarea className={`${inputClass} h-24 resize-none`} value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} placeholder="Tell us about yourself..." maxLength={300} />
            </Field>
            <Field label="Location">
              <input type="text" className={inputClass} value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
            </Field>
            <Field label="Website">
              <input type="url" className={inputClass} value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} placeholder="https://..." />
            </Field>
            <Field label="GitHub">
              <input type="text" className={inputClass} value={formData.github} onChange={e => setFormData({ ...formData, github: e.target.value })} placeholder="github username" />
            </Field>

            {/* Cover Image */}
            <Field label="Cover image">
              <div className="relative">
                <div className="w-full h-28 rounded-xl overflow-hidden bg-[#1a1a1a] border border-[#363636] group cursor-pointer" onClick={() => coverImageRef.current?.click()}>
                  <img
                    src={coverImagePreview || user?.coverImage || 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=400&auto=format&fit=crop'}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera size={24} className="text-white" />
                  </div>
                </div>
                {coverImagePreview && (
                  <button type="button" onClick={clearCoverImage} className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white">
                    <X size={12} />
                  </button>
                )}
              </div>
              <input ref={coverImageRef} type="file" accept="image/*" onChange={handleCoverImageChange} className="hidden" />
            </Field>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3 bg-[#0095f6] text-white font-semibold rounded-xl hover:bg-[#1aa1f7] disabled:opacity-50 transition-colors text-[14px]"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin inline mr-2" /> : null}
              Save Changes
            </button>
          </form>
        );

      case 'security':
        return (
          <form onSubmit={handleSave} className="space-y-5 px-4 pt-4 pb-32">
            <Field label="Current password">
              <input type="password" className={inputClass} placeholder="Enter current password" value={securityForm.currentPassword} onChange={e => setSecurityForm({ ...securityForm, currentPassword: e.target.value })} />
            </Field>
            <Field label="New password">
              <input type="password" className={inputClass} placeholder="Enter new password" value={securityForm.newPassword} onChange={e => setSecurityForm({ ...securityForm, newPassword: e.target.value })} />
            </Field>
            <Field label="Confirm new password">
              <input type="password" className={inputClass} placeholder="Confirm new password" value={securityForm.confirmPassword} onChange={e => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })} />
            </Field>
            <button type="submit" disabled={isSaving} className="w-full py-3 bg-[#0095f6] text-white font-semibold rounded-xl hover:bg-[#1aa1f7] disabled:opacity-50 transition-colors text-[14px]">
              {isSaving ? <Loader2 size={16} className="animate-spin inline mr-2" /> : null}
              Change Password
            </button>
          </form>
        );

      case 'notifications':
        return (
          <div className="px-4 pt-2 pb-32">
            {notifKeys.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-4 border-b border-[#262626]">
                <span className="text-[14px] text-white">{label}</span>
                <Toggle enabled={notifPrefs[key]} onChange={() => setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }))} />
              </div>
            ))}
            <button onClick={handleSave} disabled={isSaving} className="w-full mt-6 py-3 bg-[#0095f6] text-white font-semibold rounded-xl hover:bg-[#1aa1f7] disabled:opacity-50 transition-colors text-[14px]">
              {isSaving ? <Loader2 size={16} className="animate-spin inline mr-2" /> : null}
              Save Preferences
            </button>
          </div>
        );

      case 'privacy':
        return (
          <div className="px-4 pt-2 pb-32">
            {privacyKeys.map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-4 border-b border-[#262626]">
                <div className="min-w-0 pr-4">
                  <p className="text-[14px] text-white">{label}</p>
                  <p className="text-[12px] text-[#a8a8a8] mt-0.5">{desc}</p>
                </div>
                <Toggle enabled={privacySettings[key]} onChange={() => setPrivacySettings(prev => ({ ...prev, [key]: !prev[key] }))} />
              </div>
            ))}
            <button onClick={handleSave} disabled={isSaving} className="w-full mt-6 py-3 bg-[#0095f6] text-white font-semibold rounded-xl hover:bg-[#1aa1f7] disabled:opacity-50 transition-colors text-[14px]">
              {isSaving ? <Loader2 size={16} className="animate-spin inline mr-2" /> : null}
              Save Privacy Settings
            </button>
          </div>
        );

      case 'appearance':
        return (
          <div className="px-4 pt-4 pb-32 space-y-8">
            {/* Theme */}
            <div>
              <p className="text-[14px] font-semibold text-white mb-3">Theme</p>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => theme !== 'dark' && toggleTheme()} className={`p-4 rounded-xl border-2 ${theme === 'dark' ? 'border-[#0095f6]' : 'border-[#363636]'} bg-[#1a1a1a] flex flex-col items-center gap-2 relative`}>
                  <div className="w-full h-12 rounded-lg bg-[#000] border border-[#333]" />
                  <span className="text-[13px] text-white font-medium">Dark</span>
                  {theme === 'dark' && <div className="absolute top-2 right-2 w-5 h-5 bg-[#0095f6] rounded-full flex items-center justify-center"><Check size={12} className="text-white" /></div>}
                </button>
                <button type="button" onClick={() => theme !== 'light' && toggleTheme()} className={`p-4 rounded-xl border-2 ${theme === 'light' ? 'border-[#0095f6]' : 'border-[#363636]'} bg-[#1a1a1a] flex flex-col items-center gap-2 relative`}>
                  <div className="w-full h-12 rounded-lg bg-white border border-gray-200" />
                  <span className="text-[13px] text-white font-medium">Light</span>
                  {theme === 'light' && <div className="absolute top-2 right-2 w-5 h-5 bg-[#0095f6] rounded-full flex items-center justify-center"><Check size={12} className="text-white" /></div>}
                </button>
              </div>
            </div>

            {/* Accent Color */}
            <div>
              <p className="text-[14px] font-semibold text-white mb-1">Accent Color</p>
              <p className="text-[12px] text-[#a8a8a8] mb-4">Choose the highlight color for buttons, links and interactive elements</p>
              <div className="grid grid-cols-5 gap-3">
                {[
                  { hex: '#6EE7F7', name: 'Cyan' },
                  { hex: '#A78BFA', name: 'Purple' },
                  { hex: '#34D399', name: 'Green' },
                  { hex: '#FB923C', name: 'Orange' },
                  { hex: '#F43F5E', name: 'Rose' },
                ].map(({ hex, name }) => {
                  const isActive = (accentColor || '#6EE7F7') === hex;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setAccentColor(hex)}
                      className="flex flex-col items-center gap-2"
                    >
                      <div
                        className={`w-12 h-12 rounded-full border-[3px] flex items-center justify-center transition-all ${isActive ? 'border-white scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: hex }}
                      >
                        {isActive && <Check size={18} className="text-black" strokeWidth={3} />}
                      </div>
                      <span className={`text-[11px] font-medium ${isActive ? 'text-white' : 'text-[#a8a8a8]'}`}>{name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 'danger':
        return (
          <div className="px-4 pt-4 pb-32 space-y-4">
            <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
              <p className="text-[14px] font-semibold text-red-400 mb-1">Delete account</p>
              <p className="text-[13px] text-[#a8a8a8] mb-3">Permanently delete your account and all data. This cannot be undone.</p>
              <button type="button" onClick={() => setDangerModal({ show: true, type: 'delete' })} className="px-4 py-2 text-[13px] font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors">
                Delete Account
              </button>
            </div>
            <div className="p-4 rounded-xl border border-orange-500/20 bg-orange-500/5">
              <p className="text-[14px] font-semibold text-orange-400 mb-1">Deactivate account</p>
              <p className="text-[13px] text-[#a8a8a8] mb-3">Hide your profile temporarily. Reactivate by logging in.</p>
              <button type="button" onClick={() => setDangerModal({ show: true, type: 'deactivate' })} className="px-4 py-2 text-[13px] font-semibold text-orange-400 bg-orange-500/10 rounded-lg hover:bg-orange-500/20 transition-colors">
                Deactivate Account
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col bg-black min-h-dvh">

      {/* ── HEADER ── */}
      <div className="md:hidden sticky top-0 z-30 bg-black border-b border-[#262626] flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-5">
          <button onClick={() => activeSection ? setActiveSection(null) : navigate(-1)} className="text-white hover:opacity-70 transition-opacity">
            <ArrowLeft size={24} strokeWidth={2.5} />
          </button>
          <h1 className="text-[17px] font-bold text-white">
            {activeSection ? menuItems.find(m => m.key === activeSection)?.label || 'Settings' : 'Settings'}
          </h1>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

        {/* ── LEFT: Menu (always visible on desktop, toggle on mobile) ── */}
        <div className={`md:w-72 md:border-r md:border-[#262626] md:flex md:flex-col overflow-y-auto ${activeSection ? 'hidden md:flex' : 'flex flex-col'}`}>

          {/* Desktop header */}
          <div className="hidden md:block p-6 border-b border-[#262626]">
            <h2 className="text-xl font-bold text-white">Settings</h2>
          </div>

          {/* User card */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-[#262626]">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-[#363636] shrink-0">
              <img
                src={user?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=262626&color=fff`}
                alt={user?.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-white truncate">{user?.name}</p>
              <p className="text-[13px] text-[#a8a8a8] truncate">@{user?.username}</p>
            </div>
          </div>

          {/* Menu items */}
          <div className="flex-1 py-2">
            {menuItems.map(item => (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left ${
                  activeSection === item.key
                    ? 'bg-[#1a1a1a]'
                    : 'hover:bg-[#0a0a0a]'
                }`}
              >
                <item.icon size={20} className={item.danger ? 'text-red-400' : 'text-[#a8a8a8]'} />
                <div className="flex-1 min-w-0">
                  <p className={`text-[14px] font-medium ${item.danger ? 'text-red-400' : 'text-white'}`}>{item.label}</p>
                  <p className="text-[12px] text-[#a8a8a8] truncate">{item.desc}</p>
                </div>
                <ChevronRight size={16} className="text-[#555] shrink-0" />
              </button>
            ))}
          </div>

          {/* Logout */}
          <div className="border-t border-[#262626] p-4 pb-24 md:pb-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/5 rounded-xl transition-colors"
            >
              <LogOut size={20} />
              <span className="text-[14px] font-semibold">Log out</span>
            </button>
          </div>
        </div>

        {/* ── RIGHT: Section content ── */}
        <div className={`flex-1 overflow-y-auto bg-black ${!activeSection ? 'hidden md:flex md:items-center md:justify-center' : 'flex flex-col'}`}>
          {activeSection ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
                className="w-full max-w-lg mx-auto"
              >
                {renderSection()}
              </motion.div>
            </AnimatePresence>
          ) : (
            <p className="text-[#555] text-sm">Select a setting to get started</p>
          )}
        </div>
      </div>

      {/* ── Danger Modal ── */}
      <AnimatePresence>
        {dangerModal.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setDangerModal({ show: false, type: null }); setDangerPassword(''); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#262626] rounded-2xl p-6 w-full max-w-sm border border-[#363636]"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className={`text-lg font-bold mb-2 ${dangerModal.type === 'delete' ? 'text-red-400' : 'text-orange-400'}`}>
                {dangerModal.type === 'delete' ? 'Delete Account' : 'Deactivate Account'}
              </h3>
              <p className="text-[13px] text-[#a8a8a8] mb-4">
                {dangerModal.type === 'delete'
                  ? 'This will permanently delete your account and all data. This action cannot be undone.'
                  : 'Your profile will be hidden until you reactivate by logging in.'}
              </p>
              <input
                type="password"
                className={inputClass}
                value={dangerPassword}
                onChange={e => setDangerPassword(e.target.value)}
                placeholder="Enter your password to confirm"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => { setDangerModal({ show: false, type: null }); setDangerPassword(''); }}
                  className="flex-1 py-2.5 text-[14px] font-semibold bg-[#363636] text-white rounded-xl hover:bg-[#484848] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDangerAction}
                  disabled={dangerLoading}
                  className="flex-1 py-2.5 text-[14px] font-semibold bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {dangerLoading ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}
                  {dangerModal.type === 'delete' ? 'Delete' : 'Deactivate'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsPage;
