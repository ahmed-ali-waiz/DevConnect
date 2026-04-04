import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Github, Mail, Lock, ArrowRight } from 'lucide-react';
import Button from '../components/ui/Button';
import { login as loginApi, getCurrentUser } from '../services/authService';
import { setUser, setToken } from '../store/slices/authSlice';

const API_BASE = import.meta.env.VITE_API_URL || 'https://devconnect-production-2055.up.railway.app';

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const containerRef = useRef(null);
  const formRef = useRef(null);

  // Handle OAuth callback (token or error in URL)
  useEffect(() => {
    const token = searchParams.get('token');
    const err = searchParams.get('error');
    if (!token && !err) return;
    if (token) {
      dispatch(setToken(token));
      getCurrentUser()
        .then((user) => {
          dispatch(setUser(user));
          toast.success('Welcome back!');
          navigate('/', { replace: true });
          window.history.replaceState({}, '', '/login');
        })
        .catch(() => {
          localStorage.removeItem('token');
          setError('Session expired. Please sign in again.');
        });
    } else if (err) {
      const messages = {
        oauth_failed: 'OAuth sign-in failed. Please try again.',
        no_code: 'Sign-in was cancelled.',
        google_not_configured: 'Google sign-in is not configured.',
        github_not_configured: 'GitHub sign-in is not configured.',
      };
      setError(messages[err] || 'Something went wrong.');
    }
  }, [searchParams, dispatch, navigate]);

  useGSAP(() => {
    // Left panel particles animation
    const dots = gsap.utils.toArray('.particle-dot');
    dots.forEach((dot, i) => {
      gsap.to(dot, {
        y: '+=30',
        x: '+=15',
        rotation: 360,
        duration: "random(3, 6)",
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: "random(0, 2)"
      });
    });

    // Logo float
    gsap.to('.brand-logo', {
      y: -15,
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
  }, { scope: containerRef });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      gsap.fromTo(formRef.current, 
        { x: -10 }, 
        { x: 10, duration: 0.1, repeat: 4, yoyo: true, ease: "power1.inOut", onComplete: () => gsap.to(formRef.current, { x: 0 }) }
      );
      return;
    }
    
    setIsLoading(true);
    setError('');
    try {
      const data = await loginApi(formData.email, formData.password);
      dispatch(setToken(data.token));
      dispatch(setUser({ _id: data._id, name: data.name, username: data.username, email: data.email, profilePic: data.profilePic, role: data.role }));
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div ref={containerRef} className="min-h-[100dvh] flex flex-col md:flex-row bg-(--bg-primary)">
      {/* Left Panel - Brand */}
      <div className="hidden md:flex md:w-1/2 lg:w-[55%] relative overflow-hidden bg-linear-to-br from-[#050810] to-[#0d1117] items-center justify-center p-12">
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-(--accent-primary) rounded-full mix-blend-screen filter blur-[100px] opacity-20"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-(--accent-secondary) rounded-full mix-blend-screen filter blur-[100px] opacity-20"></div>
        
        {/* Particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <div 
            key={i} 
            className="particle-dot absolute w-1.5 h-1.5 rounded-full bg-white/20 blur-[1px]"
            style={{ 
              top: `${Math.random() * 100}%`, 
              left: `${Math.random() * 100}%` 
            }}
          />
        ))}

        <div className="relative z-10 max-w-xl text-center flex flex-col items-center">
          <div className="brand-logo w-32 h-32 mb-8 rounded-2xl bg-linear-to-br from-(--accent-primary) to-(--accent-secondary) flex items-center justify-center text-(--bg-primary) font-bold text-6xl font-display shadow-[0_0_50px_rgba(110,231,247,0.4)]">
            DC
          </div>
          <h1 className="text-4xl lg:text-5xl font-display font-bold text-white mb-6 leading-tight">
            Where developers <br/>
            <span className="text-transparent bg-clip-text bg-linear-to-r from-(--accent-primary) to-(--accent-secondary)">
              connect & grow.
            </span>
          </h1>
          <p className="text-lg text-(--text-muted) mb-12">
            Join a global network of 50K+ developers. Share your journey, code, and collaborations.
          </p>
          
          <div className="flex gap-8 text-(--text-primary)">
            <div className="text-center">
              <h4 className="font-bold text-2xl font-display">50K+</h4>
              <p className="text-sm text-(--text-muted)">Developers</p>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div className="text-center">
              <h4 className="font-bold text-2xl font-display">2M+</h4>
              <p className="text-sm text-(--text-muted)">Posts</p>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div className="text-center">
              <h4 className="font-bold text-2xl font-display">100K+</h4>
              <p className="text-sm text-(--text-muted)">Projects</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full md:w-1/2 lg:w-[45%] flex items-center justify-center p-6 sm:p-12 relative z-10">
        <motion.div 
          className="login-card w-full max-w-md glass-card p-8 sm:p-10 !bg-[rgba(255,255,255,0.02)]"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Mobile Logo */}
          <div className="md:hidden flex justify-center mb-8">
            <div className="w-16 h-16 rounded-xl bg-linear-to-br from-(--accent-primary) to-(--accent-secondary) flex items-center justify-center text-(--bg-primary) font-bold text-3xl font-display shadow-lg">
              DC
            </div>
          </div>

          <motion.div variants={itemVariants} className="mb-8">
            <h2 className="text-3xl font-display font-bold text-white mb-2">Welcome back 👋</h2>
            <p className="text-(--text-muted)">Sign in to your DevConnect account.</p>
          </motion.div>

          {/* OAuth Buttons */}
          <motion.div variants={itemVariants} className="space-y-3 mb-8">
            <a
              href={`${API_BASE}/api/v1/auth/github`}
              className="w-full flex items-center justify-center space-x-3 py-2.5 px-4 rounded-xl bg-[#24292e] hover:bg-[#2f363d] text-white transition-colors border border-white/10"
            >
              <Github size={20} />
              <span className="font-medium">Continue with GitHub</span>
            </a>
            <a
              href={`${API_BASE}/api/v1/auth/google`}
              className="w-full flex items-center justify-center space-x-3 py-2.5 px-4 rounded-xl bg-white text-black hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="font-medium text-gray-800">Continue with Google</span>
            </a>
          </motion.div>

          <motion.div variants={itemVariants} className="flex items-center space-x-4 mb-8">
            <div className="flex-1 h-px bg-(--border-glass)"></div>
            <span className="text-[10px] text-(--text-muted) uppercase tracking-widest font-bold">Or with email</span>
            <div className="flex-1 h-px bg-(--border-glass)"></div>
          </motion.div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
            <motion.div variants={itemVariants} className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-(--text-muted)">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  placeholder="name@example.com"
                  className="input-field w-full pl-10 h-12 text-base"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-(--text-muted)">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  className="input-field w-full pl-10 pr-10 h-12 text-base"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-(--text-muted) hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex justify-end">
              <Link to="/forgot-password" className="flex items-center space-x-1 text-sm text-(--accent-primary) hover:text-white transition-colors group">
                <span>Forgot password?</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Button type="submit" className="w-full h-12 text-lg" isLoading={isLoading}>
                Sign In
              </Button>
            </motion.div>
          </form>

          <motion.p variants={itemVariants} className="mt-8 text-center text-(--text-muted) text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-white hover:text-(--accent-primary) font-semibold transition-colors">
              Register here
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
