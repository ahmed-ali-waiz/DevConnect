import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import { resetPassword } from '../services/authService';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    if (formData.password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }
    setIsLoading(true);
    try {
      await resetPassword(token, formData.password);
      setSuccess(true);
      toast.success('Password reset successfully!');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-(--bg-primary) p-6">
        <div className="text-center">
          <h2 className="text-2xl font-display font-bold text-white mb-4">Invalid Reset Link</h2>
          <p className="text-(--text-muted) mb-6">This link is missing or invalid.</p>
          <Link to="/forgot-password"><Button>Request New Link</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-(--bg-primary) p-6">
      <motion.div
        className="w-full max-w-md glass-card p-8 sm:p-10 !bg-[rgba(255,255,255,0.02)]"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="mb-2">
          <Link to="/login" className="inline-flex items-center space-x-1 text-sm text-(--text-muted) hover:text-white transition-colors">
            <ArrowLeft size={16} />
            <span>Back to login</span>
          </Link>
        </motion.div>

        {success ? (
          <motion.div variants={itemVariants} className="text-center py-8">
            <CheckCircle size={48} className="mx-auto text-green-400 mb-4" />
            <h2 className="text-2xl font-display font-bold text-white mb-2">Password Reset!</h2>
            <p className="text-(--text-muted)">Redirecting to login...</p>
          </motion.div>
        ) : (
          <>
            <motion.div variants={itemVariants} className="mb-8">
              <h2 className="text-3xl font-display font-bold text-white mb-2">Reset Password</h2>
              <p className="text-(--text-muted)">Enter your new password below.</p>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <motion.div variants={itemVariants} className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-(--text-muted)">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="New password"
                    className="input-field w-full pl-10 pr-10 h-12"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-(--text-muted) hover:text-white transition-colors">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-(--text-muted)">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    className="input-field w-full pl-10 h-12"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                  />
                </div>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Button type="submit" className="w-full h-12 text-lg" isLoading={isLoading}>
                  Reset Password
                </Button>
              </motion.div>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
