import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Lock, Bell, Moon, EyeOff, ShieldAlert, Check, Camera, X } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { updateProfile, updateNotificationPreferences, updatePrivacySettings } from '../services/userService';
import { changePassword, deleteAccount, deactivateAccount } from '../services/authService';
import { updateProfileOptimistic, logout as logoutAction } from '../store/slices/authSlice';
import { useTheme } from '../context/ThemeContext';

const SettingsPage = () => {
  const { user } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { theme, toggleTheme, accentColor, setAccentColor } = useTheme();
  const [activeTab, setActiveTab] = useState('Account');
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '', username: '', email: '', bio: '', location: '', website: '', github: '',
  });

  // Profile picture / cover image upload state
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState(null);
  const profilePicInputRef = useRef(null);
  const coverImageInputRef = useRef(null);

  // Skills state
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');

  // Security state
  const [securityForm, setSecurityForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  // Notification preferences state
  const [notifPrefs, setNotifPrefs] = useState({
    newFollowers: true, likes: true, comments: true, mentions: true, messages: true,
  });

  // Privacy settings state
  const [privacySettings, setPrivacySettings] = useState({
    isPrivate: false, hideFromSearch: false, showOnlineStatus: true,
  });

  // Danger zone modal
  const [dangerModal, setDangerModal] = useState({ show: false, type: null });
  const [dangerPassword, setDangerPassword] = useState('');
  const [dangerLoading, setDangerLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        username: user.username || '',
        email: user.email || '',
        bio: user.bio || '',
        location: user.location || '',
        website: user.website || '',
        github: user.github || '',
      });
      setSkills(user.skills || []);
      if (user.notificationPreferences) {
        setNotifPrefs(user.notificationPreferences);
      }
      if (user.privacySettings) {
        setPrivacySettings(user.privacySettings);
      }
    }
  }, [user]);

  const sidebarItems = [
    { id: 'Account', icon: User },
    { id: 'Security', icon: Lock },
    { id: 'Notifications', icon: Bell },
    { id: 'Appearance', icon: Moon },
    { id: 'Privacy', icon: EyeOff },
    { id: 'Danger Zone', icon: ShieldAlert, danger: true },
  ];

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (activeTab === 'Account') {
        const updated = await updateProfile(formData);
        dispatch(updateProfileOptimistic(updated));
        toast.success('Settings saved!');
      } else if (activeTab === 'Security') {
        if (!securityForm.currentPassword || !securityForm.newPassword) {
          toast.error('All fields are required');
          return;
        }
        if (securityForm.newPassword !== securityForm.confirmPassword) {
          toast.error('Passwords do not match');
          return;
        }
        if (securityForm.newPassword.length < 6) {
          toast.error('Password must be at least 6 characters');
          return;
        }
        await changePassword(securityForm.currentPassword, securityForm.newPassword);
        setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        toast.success('Password changed!');
      } else if (activeTab === 'Notifications') {
        const updated = await updateNotificationPreferences(notifPrefs);
        dispatch(updateProfileOptimistic({ notificationPreferences: updated }));
        toast.success('Notification preferences saved!');
      } else if (activeTab === 'Privacy') {
        const updated = await updatePrivacySettings(privacySettings);
        dispatch(updateProfileOptimistic({ privacySettings: updated }));
        toast.success('Privacy settings saved!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDangerAction = async () => {
    if (!dangerPassword) return toast.error('Password is required');
    setDangerLoading(true);
    try {
      if (dangerModal.type === 'delete') {
        await deleteAccount(dangerPassword);
        toast.success('Account deleted');
      } else {
        await deactivateAccount(dangerPassword);
        toast.success('Account deactivated');
      }
      dispatch(logoutAction());
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setDangerLoading(false);
      setDangerModal({ show: false, type: null });
      setDangerPassword('');
    }
  };

  const notifKeys = [
    { key: 'newFollowers', label: 'New followers' },
    { key: 'likes', label: 'Likes on posts' },
    { key: 'comments', label: 'Comments' },
    { key: 'mentions', label: 'Mentions' },
    { key: 'messages', label: 'Messages' },
  ];

  const privacyKeys = [
    { key: 'isPrivate', label: 'Private account' },
    { key: 'hideFromSearch', label: 'Hide from search' },
    { key: 'showOnlineStatus', label: 'Show online status' },
  ];

  const accentColors = [
    { hex: '#6EE7F7', name: 'cyan' },
    { hex: '#A78BFA', name: 'purple' },
    { hex: '#34D399', name: 'green' },
    { hex: '#FB923C', name: 'orange' },
    { hex: '#F43F5E', name: 'rose' },
  ];

  const currentAccent = accentColor || '#6EE7F7';

  return (
    <div className="w-full flex-1 flex flex-col md:flex-row pt-14 md:pt-0 h-[calc(100vh-56px)] md:h-screen">

      {/* Settings Navigation Sidebar */}
      <div className="w-full md:w-64 border-r border-(--border-glass) bg-(--bg-primary) flex flex-col overflow-y-auto custom-scrollbar md:h-full">
        <div className="p-4 md:p-6 border-b border-(--border-glass) sticky top-0 bg-(--bg-primary)/90 backdrop-blur-md z-10 hidden md:block">
          <h2 className="text-xl font-display font-bold">Settings</h2>
          <p className="text-sm text-(--text-muted) mt-1">Manage your account configurations.</p>
        </div>

        <div className="flex md:flex-col overflow-x-auto md:overflow-x-visible custom-scrollbar p-2 md:p-4 space-x-2 md:space-x-0 md:space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap md:whitespace-normal flex-shrink-0 ${
                activeTab === item.id
                  ? item.danger
                    ? 'bg-red-500/10 text-red-500 font-semibold'
                    : 'bg-(--accent-primary)/10 text-(--accent-primary) font-semibold'
                  : item.danger
                    ? 'text-red-400 hover:bg-red-500/10'
                    : 'text-(--text-muted) hover:text-white hover:bg-(--bg-glass)'
              }`}
            >
              <item.icon size={18} />
              <span>{item.id}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Settings Main Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-(--bg-primary)/50 p-4 sm:p-6 md:p-8 relative">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="max-w-2xl"
        >
          <div className="mb-8">
            <h1 className="text-2xl font-display font-bold mb-2">{activeTab}</h1>
            <p className="text-(--text-muted)">Update your {activeTab.toLowerCase()} settings and preferences here.</p>
          </div>

          <form onSubmit={handleSave} className="glass-card p-6 md:p-8 space-y-6">

            {activeTab === 'Account' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-(--text-muted) mb-1">Full Name</label>
                  <input type="text" className="input-field w-full" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-(--text-muted) mb-1">Username</label>
                  <input type="text" className="input-field w-full" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-(--text-muted) mb-1">Email Address</label>
                  <input type="email" className="input-field w-full" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-(--text-muted) mb-1">Bio</label>
                  <textarea className="input-field w-full h-24 resize-none" value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} placeholder="Tell us about yourself..." maxLength={300} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-(--text-muted) mb-1">Location</label>
                    <input type="text" className="input-field w-full" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-(--text-muted) mb-1">Website</label>
                    <input type="url" className="input-field w-full" value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} placeholder="https://..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-(--text-muted) mb-1">GitHub</label>
                    <input type="text" className="input-field w-full" value={formData.github} onChange={e => setFormData({ ...formData, github: e.target.value })} placeholder="github username" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Security' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-(--text-muted) mb-1">Current Password</label>
                  <input type="password" className="input-field w-full" placeholder="Enter current password" value={securityForm.currentPassword} onChange={e => setSecurityForm({ ...securityForm, currentPassword: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-(--text-muted) mb-1">New Password</label>
                  <input type="password" className="input-field w-full" placeholder="Enter new password" value={securityForm.newPassword} onChange={e => setSecurityForm({ ...securityForm, newPassword: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-(--text-muted) mb-1">Confirm New Password</label>
                  <input type="password" className="input-field w-full" placeholder="Confirm new password" value={securityForm.confirmPassword} onChange={e => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })} />
                </div>
              </div>
            )}

            {activeTab === 'Notifications' && (
              <div className="space-y-4">
                {notifKeys.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-(--border-glass)">
                    <span className="text-sm font-medium">{label}</span>
                    <button
                      type="button"
                      onClick={() => setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }))}
                      className={`w-10 h-6 rounded-full relative transition-colors ${notifPrefs[key] ? 'bg-(--accent-primary)' : 'bg-(--bg-glass) border border-(--border-glass)'}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 rounded-full transition-all ${notifPrefs[key] ? 'right-1 bg-(--bg-primary)' : 'left-1 bg-(--text-muted)'}`} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'Appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-(--text-primary) mb-4">Theme Preference</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button type="button" onClick={() => theme !== 'dark' && toggleTheme()} className={`flex flex-col items-center justify-center p-4 border-2 ${theme === 'dark' ? 'border-(--accent-primary)' : 'border-(--border-glass)'} rounded-xl bg-(--bg-secondary) relative`}>
                      <div className="w-16 h-10 rounded-md bg-[#050810] border border-[#222] mb-3 overflow-hidden flex flex-col">
                        <div className="h-2 bg-[#111] w-full" />
                        <div className="flex-1 bg-[#050810] flex gap-1 p-1">
                          <div className="w-3 h-full bg-[#111] rounded-[2px]" />
                          <div className="flex-1 h-full bg-[#111] rounded-[2px]" />
                        </div>
                      </div>
                      <span className="text-sm font-medium">Dark Mode</span>
                      {theme === 'dark' && (
                        <div className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 bg-(--accent-primary) rounded-full text-black">
                          <Check size={12} />
                        </div>
                      )}
                    </button>
                    <button type="button" onClick={() => theme !== 'light' && toggleTheme()} className={`flex flex-col items-center justify-center p-4 border-2 ${theme === 'light' ? 'border-(--accent-primary)' : 'border-(--border-glass)'} rounded-xl bg-(--bg-secondary) relative`}>
                      <div className="w-16 h-10 rounded-md bg-white border border-gray-200 mb-3" />
                      <span className="text-sm font-medium">Light Mode</span>
                      {theme === 'light' && (
                        <div className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 bg-(--accent-primary) rounded-full text-black">
                          <Check size={12} />
                        </div>
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-(--border-glass)">
                  <h3 className="text-sm font-medium text-(--text-primary) mb-4">Accent Color</h3>
                  <div className="flex space-x-3">
                    {accentColors.map(({ hex, name }) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setAccentColor(hex)}
                        className={`w-8 h-8 rounded-full shadow-lg border-2 ${currentAccent === hex ? 'border-white' : 'border-transparent'} flex items-center justify-center`}
                        style={{ backgroundColor: hex }}
                      >
                        {currentAccent === hex && <Check size={14} className="text-[#050810]" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Privacy' && (
              <div className="space-y-4">
                {privacyKeys.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-(--border-glass)">
                    <span className="text-sm font-medium">{label}</span>
                    <button
                      type="button"
                      onClick={() => setPrivacySettings(prev => ({ ...prev, [key]: !prev[key] }))}
                      className={`w-10 h-6 rounded-full relative transition-colors ${privacySettings[key] ? 'bg-(--accent-primary)' : 'bg-(--bg-glass) border border-(--border-glass)'}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 rounded-full transition-all ${privacySettings[key] ? 'right-1 bg-(--bg-primary)' : 'left-1 bg-(--text-muted)'}`} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'Danger Zone' && (
              <div className="space-y-4">
                <div className="p-4 border border-red-500/20 bg-red-500/5 rounded-xl">
                  <h3 className="text-red-500 font-bold mb-1">Delete Account</h3>
                  <p className="text-sm text-(--text-muted) mb-4">Once you delete your account, there is no going back. Please be certain.</p>
                  <Button variant="danger" type="button" onClick={() => setDangerModal({ show: true, type: 'delete' })}>Delete Account</Button>
                </div>
                <div className="p-4 border border-orange-500/20 bg-orange-500/5 rounded-xl">
                  <h3 className="text-orange-500 font-bold mb-1">Deactivate Account</h3>
                  <p className="text-sm text-(--text-muted) mb-4">This will hide your profile temporarily.</p>
                  <Button type="button" className="bg-orange-500/10 text-orange-500 hover:bg-orange-500/20" onClick={() => setDangerModal({ show: true, type: 'deactivate' })}>Deactivate Account</Button>
                </div>
              </div>
            )}

            {/* Save Button */}
            {activeTab !== 'Danger Zone' && activeTab !== 'Appearance' && (
              <div className="pt-4 flex justify-end">
                <Button type="submit" isLoading={isSaving} className="min-w-[120px]">
                  Save Changes
                </Button>
              </div>
            )}
          </form>
        </motion.div>
      </div>

      {/* Danger Zone Confirmation Modal */}
      <Modal isOpen={dangerModal.show} onClose={() => { setDangerModal({ show: false, type: null }); setDangerPassword(''); }}>
        <div className="p-6 max-w-sm mx-auto">
          <h3 className={`text-xl font-display font-bold mb-2 ${dangerModal.type === 'delete' ? 'text-red-500' : 'text-orange-500'}`}>
            {dangerModal.type === 'delete' ? 'Delete Account' : 'Deactivate Account'}
          </h3>
          <p className="text-sm text-(--text-muted) mb-4">
            {dangerModal.type === 'delete'
              ? 'This will permanently delete your account and all data. This action cannot be undone.'
              : 'Your profile will be hidden until you reactivate by logging in.'}
          </p>
          <div className="mb-4">
            <label className="block text-sm font-medium text-(--text-muted) mb-1">Enter your password to confirm</label>
            <input type="password" className="input-field w-full" value={dangerPassword} onChange={e => setDangerPassword(e.target.value)} placeholder="Your password" />
          </div>
          <div className="flex space-x-3">
            <Button variant="secondary" type="button" onClick={() => { setDangerModal({ show: false, type: null }); setDangerPassword(''); }} className="flex-1">Cancel</Button>
            <Button variant="danger" type="button" onClick={handleDangerAction} isLoading={dangerLoading} className="flex-1">
              {dangerModal.type === 'delete' ? 'Delete' : 'Deactivate'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SettingsPage;
