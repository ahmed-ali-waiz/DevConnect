import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { isProfileComplete } from '../utils/profile';
import { updateProfile } from '../services/userService';
import { updateProfileOptimistic } from '../store/slices/authSlice';
import Button from '../components/ui/Button';

const OnboardingPage = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    bio: '',
    location: '',
    website: '',
    github: '',
    profilePic: null,
    coverImage: null,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (isProfileComplete(user)) {
      navigate('/', { replace: true });
      return;
    }
    setFormData((prev) => ({
      ...prev,
      name: user.name || '',
      username: user.username || '',
      bio: user.bio || '',
      location: user.location || '',
      website: user.website || '',
      github: user.github || '',
    }));
  }, [user, navigate]);

  const handleChange = (key) => (e) => {
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleFile = (key) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormData((prev) => ({ ...prev, [key]: file }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.username.trim() || !formData.bio.trim()) {
      toast.error('Please fill in name, username, and a short bio.');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateProfile(formData);
      dispatch(updateProfileOptimistic(updated));
      toast.success('Profile completed!');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete profile');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center pt-14 md:pt-0 px-4">
      <div className="w-full max-w-xl glass-card p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-display font-bold mb-2">Complete your profile</h1>
        <p className="text-sm text-(--text-muted) mb-6">
          This helps other developers discover and connect with you.
        </p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-(--text-muted) mb-1">Full name</label>
              <input
                type="text"
                className="input-field w-full"
                value={formData.name}
                onChange={handleChange('name')}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--text-muted) mb-1">Username</label>
              <input
                type="text"
                className="input-field w-full"
                value={formData.username}
                onChange={handleChange('username')}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-(--text-muted) mb-1">Short bio</label>
            <textarea
              className="input-field w-full h-24 resize-none"
              maxLength={300}
              placeholder="Tell other devs what you work on..."
              value={formData.bio}
              onChange={handleChange('bio')}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-(--text-muted) mb-1">Location</label>
              <input
                type="text"
                className="input-field w-full"
                value={formData.location}
                onChange={handleChange('location')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--text-muted) mb-1">Website</label>
              <input
                type="url"
                className="input-field w-full"
                placeholder="https://..."
                value={formData.website}
                onChange={handleChange('website')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--text-muted) mb-1">GitHub</label>
              <input
                type="text"
                className="input-field w-full"
                placeholder="github username"
                value={formData.github}
                onChange={handleChange('github')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-(--text-muted) mb-1">Profile picture</label>
              <input type="file" accept="image/*" onChange={handleFile('profilePic')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--text-muted) mb-1">Cover photo</label>
              <input type="file" accept="image/*" onChange={handleFile('coverImage')} />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="submit" isLoading={saving}>
              Finish setup
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OnboardingPage;

