import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import toast from 'react-hot-toast';
import { User, Mail, Lock, CheckCircle2, XCircle, ArrowRight, ArrowLeft, Camera, Github } from 'lucide-react';
import Button from '../components/ui/Button';
import { register as registerApi, checkUsername } from '../services/authService';
import { updateProfile } from '../services/userService';
import { setUser, setToken } from '../store/slices/authSlice';

// Utility for debouncing username check
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const RegisterPage = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '', username: '', email: '', password: '', confirmPassword: '', bio: '', githubUsername: ''
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const avatarInputRef = useRef(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // States specifically for UX feedback
  const [usernameStatus, setUsernameStatus] = useState(null); // 'checking', 'available', 'taken'
  const [error, setError] = useState('');
  const debouncedUsername = useDebounce(formData.username.toLowerCase().trim(), 500);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const formRef = useRef(null);

  // Username availability check via API
  useEffect(() => {
    if (debouncedUsername.length >= 3 && /^[a-zA-Z0-9_]+$/.test(debouncedUsername)) {
      setUsernameStatus('checking');
      checkUsername(debouncedUsername)
        .then((res) => setUsernameStatus(res.available ? 'available' : 'taken'))
        .catch(() => setUsernameStatus(null));
    } else {
      setUsernameStatus(null);
    }
  }, [debouncedUsername]);

  const handleNext = () => setStep(s => Math.min(s + 1, 3));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step < 3) {
      handleNext();
      return;
    }
    if (formData.password !== formData.confirmPassword || usernameStatus === 'taken') return;

    setIsLoading(true);
    setError('');
    try {
      const data = await registerApi({
        name: formData.name.trim(),
        username: formData.username.trim().toLowerCase(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });
      dispatch(setToken(data.token));
      dispatch(setUser({ _id: data._id, name: data.name, username: data.username, email: data.email, profilePic: data.profilePic, role: data.role, isVerified: data.isVerified }));

      // Upload optional profile data after registration
      if (formData.bio || formData.githubUsername || avatarFile) {
        try {
          const updated = await updateProfile({
            bio: formData.bio || undefined,
            github: formData.githubUsername || undefined,
            profilePic: avatarFile || undefined,
          });
          dispatch(setUser({ _id: data._id, name: data.name, username: data.username, email: data.email, profilePic: updated.profilePic || data.profilePic, role: data.role, bio: updated.bio, github: updated.github }));
        } catch {
          // Non-critical, ignore
        }
      }

      toast.success('Account created! Welcome to DevConnect.');
      import('canvas-confetti').then(({ default: confetti }) => {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#6EE7F7', '#A78BFA', '#34D399'] });
      });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (pass) => {
    let score = 0;
    if (pass.length > 5) score += 1;
    if (pass.length > 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const strength = getPasswordStrength(formData.password);
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-400', 'bg-green-500'];

  // Left Panel Animation from LoginPage logic
  const leftPanelRef = useRef(null);
  useGSAP(() => {
    const dots = gsap.utils.toArray('.particle-dot');
    dots.forEach((dot) => {
      gsap.to(dot, { y: '+=30', x: '+=15', duration: "random(3, 6)", repeat: -1, yoyo: true, ease: 'sine.inOut', delay: "random(0, 2)" });
    });
    gsap.to('.brand-logo', { y: -15, duration: 3, repeat: -1, yoyo: true, ease: 'sine.inOut' });
  }, { scope: leftPanelRef });

  const stepVariants = {
    hidden: (direction) => ({ opacity: 0, x: direction > 0 ? 50 : -50 }),
    visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
    exit: (direction) => ({ opacity: 0, x: direction < 0 ? 50 : -50, transition: { duration: 0.4, ease: "easeIn" } })
  };

  // Direction state for animation
  const [direction, setDirection] = useState(1);
  const setStepWithDirection = (newStep) => {
    setDirection(newStep > step ? 1 : -1);
    setStep(newStep);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-(--bg-primary) overflow-hidden">
      {/* Left Panel */}
      <div ref={leftPanelRef} className="hidden md:flex md:w-1/2 lg:w-[45%] relative overflow-hidden bg-linear-to-br from-[#050810] to-[#0d1117] items-center justify-center p-12 order-2 md:order-1 border-r border-(--border-glass)">
        {/* Abstract shapes matching login */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-(--accent-primary) rounded-full mix-blend-screen filter blur-[100px] opacity-20"></div>
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-(--accent-secondary) rounded-full mix-blend-screen filter blur-[100px] opacity-20"></div>
        
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="particle-dot absolute w-1.5 h-1.5 rounded-full bg-white/20 blur-[1px]" style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%` }} />
        ))}

        <div className="relative z-10 max-w-xl text-center flex flex-col items-center">
          <div className="brand-logo w-24 h-24 mb-8 rounded-2xl bg-(--bg-glass) backdrop-blur-md border border-(--border-glass) flex items-center justify-center shadow-[0_0_50px_rgba(110,231,247,0.2)]">
            <svg className="w-12 h-12 text-(--accent-primary)" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <h1 className="text-4xl lg:text-5xl font-display font-bold text-white mb-6">
            Join the <br/>
            <span className="text-transparent bg-clip-text bg-linear-to-r from-(--accent-primary) to-(--accent-secondary)">
              community
            </span>
          </h1>
          <p className="text-lg text-(--text-muted)">
            Create your portfolio, share ideas, and connect with developers worldwide.
          </p>
        </div>
      </div>

      {/* Right Panel - Registration Wizard */}
      <div className="w-full md:w-1/2 lg:w-[55%] flex flex-col justify-center p-6 sm:p-12 relative z-10 order-1 md:order-2">
        <div className="max-w-md w-full mx-auto relative">
          
          {/* Progress Bar */}
          <div className="mb-10 mt-8 md:mt-0">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-(--text-muted) uppercase tracking-wider">Step {step} of 3</span>
              <span className="text-sm text-(--accent-primary) font-medium">
                {step === 1 ? 'Personal Info' : step === 2 ? 'Security' : 'Profile Docs'}
              </span>
            </div>
            <div className="h-2 w-full bg-(--bg-glass) rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-linear-to-r from-(--accent-primary) to-(--accent-secondary)"
                initial={{ width: 0 }}
                animate={{ width: `${(step / 3) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="relative min-h-[350px]">
            <AnimatePresence custom={direction} mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1" custom={direction} variants={stepVariants} initial="hidden" animate="visible" exit="exit"
                  className="space-y-4"
                >
                  <h2 className="text-3xl font-display font-bold mb-6">Who are you?</h2>
                  
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" size={18} />
                    <input type="text" placeholder="Full Name" required className="input-field w-full pl-10 h-12" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted) font-mono">@</span>
                    <input type="text" placeholder="Username" required className={`input-field w-full pl-10 pr-10 h-12 ${usernameStatus === 'taken' ? 'border-red-500/50 focus:border-red-500' : ''}`} value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {usernameStatus === 'checking' && <div className="w-4 h-4 rounded-full border-2 border-(--text-muted) border-t-transparent animate-spin"/>}
                      {usernameStatus === 'available' && <CheckCircle2 size={18} className="text-(--accent-green)" />}
                      {usernameStatus === 'taken' && <XCircle size={18} className="text-red-500" />}
                    </div>
                  </div>
                  {usernameStatus === 'taken' && <p className="text-xs text-red-500 mt-1">Username is already taken.</p>}

                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" size={18} />
                    <input type="email" placeholder="Email Address" required className="input-field w-full pl-10 h-12" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2" custom={direction} variants={stepVariants} initial="hidden" animate="visible" exit="exit"
                  className="space-y-4"
                >
                  <h2 className="text-3xl font-display font-bold mb-6">Secure your account</h2>
                  
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" size={18} />
                    <input type={showPassword ? 'text' : 'password'} placeholder="Password" required minLength={6} className="input-field w-full pl-10 pr-10 h-12" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                  </div>

                  {formData.password.length > 0 && (
                    <div className="pt-1 pb-2">
                      <div className="flex gap-1 h-1.5 w-full">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className={`flex-1 rounded-full ${i < strength ? strengthColors[strength - 1] : 'bg-(--bg-glass)'} transition-colors duration-300`} />
                        ))}
                      </div>
                      <p className="text-xs text-(--text-muted) mt-1.5 flex justify-between">
                        <span>Password strength</span>
                        <span>{strength < 2 ? 'Weak' : strength < 4 ? 'Good' : 'Strong'}</span>
                      </p>
                    </div>
                  )}

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" size={18} />
                    <input type={showPassword ? 'text' : 'password'} placeholder="Confirm Password" required minLength={6} className={`input-field w-full pl-10 pr-10 h-12 ${formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-red-500/50' : ''}`} value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} />
                  </div>
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
                  )}
                  
                  <label className="flex items-center space-x-3 pt-2 cursor-pointer">
                    <input type="checkbox" className="form-checkbox bg-transparent border-(--border-glass) rounded text-(--accent-primary) focus:ring-0" required />
                    <span className="text-sm text-(--text-muted)">I agree to the <a href="#" className="text-(--accent-primary) hover:underline">Terms of Service</a> & Privacy Policy</span>
                  </label>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3" custom={direction} variants={stepVariants} initial="hidden" animate="visible" exit="exit"
                  className="space-y-4"
                >
                  <h2 className="text-3xl font-display font-bold mb-6">Make it yours</h2>
                  
                  <div className="flex justify-center mb-6">
                    <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                      <div className="w-24 h-24 rounded-full border-2 border-(--border-glass) border-dashed flex items-center justify-center bg-(--bg-glass) overflow-hidden group-hover:border-(--accent-primary) transition-colors">
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                        ) : (
                          <Camera size={24} className="text-(--text-muted) group-hover:text-(--accent-primary) transition-colors" />
                        )}
                      </div>
                      <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-xs font-semibold">Upload</span>
                      </div>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setAvatarFile(file);
                            setAvatarPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <Github className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" size={18} />
                    <input type="text" placeholder="GitHub Username (Optional)" className="input-field w-full pl-10 h-12" value={formData.githubUsername} onChange={e => setFormData({...formData, githubUsername: e.target.value})} />
                  </div>

                  <textarea 
                    placeholder="Short bio... tell us what languages you use!" 
                    className="input-field w-full h-24 resize-none"
                    value={formData.bio}
                    onChange={e => setFormData({...formData, bio: e.target.value})}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute bottom-0 w-full flex justify-between pt-6 border-t border-(--border-glass) mt-8">
              {step > 1 ? (
                <Button variant="ghost" onClick={() => setStepWithDirection(step - 1)} className="px-0">
                  <ArrowLeft size={16} className="mr-2" /> Back
                </Button>
              ) : (
                <p className="text-sm text-(--text-muted) self-center">
                  Have an account? <Link to="/login" className="text-(--text-primary) hover:text-(--accent-primary) font-semibold transition-colors">Log In</Link>
                </p>
              )}

              <Button 
                type={step === 3 ? "submit" : "button"} 
                onClick={step < 3 ? () => setStepWithDirection(step + 1) : undefined}
                className="ml-auto min-w-[120px]"
                isLoading={isLoading}
                disabled={usernameStatus === 'taken' || (step === 2 && formData.password !== formData.confirmPassword)}
              >
                {step === 3 ? 'Create Account' : (
                  <>Next <ArrowRight size={16} className="ml-2" /></>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
