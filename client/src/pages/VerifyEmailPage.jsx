import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Button from '../components/ui/Button';
import { verifyEmail } from '../services/authService';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }
    verifyEmail(token)
      .then((data) => {
        setStatus('success');
        setMessage(data.message);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed');
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-(--bg-primary) p-6">
      <motion.div
        className="w-full max-w-md glass-card p-8 sm:p-10 !bg-[rgba(255,255,255,0.02)] text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {status === 'loading' && (
          <>
            <Loader2 size={48} className="mx-auto text-(--accent-primary) mb-4 animate-spin" />
            <h2 className="text-2xl font-display font-bold text-white mb-2">Verifying Email...</h2>
            <p className="text-(--text-muted)">Please wait while we verify your email address.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle size={48} className="mx-auto text-green-400 mb-4" />
            <h2 className="text-2xl font-display font-bold text-white mb-2">Email Verified!</h2>
            <p className="text-(--text-muted) mb-6">{message}</p>
            <Link to="/"><Button>Go to Home</Button></Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle size={48} className="mx-auto text-red-400 mb-4" />
            <h2 className="text-2xl font-display font-bold text-white mb-2">Verification Failed</h2>
            <p className="text-(--text-muted) mb-6">{message}</p>
            <Link to="/"><Button variant="secondary">Go to Home</Button></Link>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default VerifyEmailPage;
