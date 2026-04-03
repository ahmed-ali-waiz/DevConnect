import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import { forgotPassword } from '../services/authService';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
      toast.success('Reset link sent!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reset email');
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

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-(--bg-primary) p-6">
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

        {sent ? (
          <motion.div variants={itemVariants} className="text-center py-8">
            <CheckCircle size={48} className="mx-auto text-green-400 mb-4" />
            <h2 className="text-2xl font-display font-bold text-white mb-2">Check your email</h2>
            <p className="text-(--text-muted) mb-6">We've sent a password reset link to <span className="text-white">{email}</span></p>
            <Link to="/login">
              <Button variant="secondary">Back to Sign In</Button>
            </Link>
          </motion.div>
        ) : (
          <>
            <motion.div variants={itemVariants} className="mb-8">
              <h2 className="text-3xl font-display font-bold text-white mb-2">Forgot password?</h2>
              <p className="text-(--text-muted)">Enter your email and we'll send you a reset link.</p>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <motion.div variants={itemVariants}>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-(--text-muted)">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    className="input-field w-full pl-10 h-12 text-base"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Button type="submit" className="w-full h-12 text-lg" isLoading={isLoading}>
                  Send Reset Link
                </Button>
              </motion.div>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
