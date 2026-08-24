import { useState, useEffect } from 'react';
import { Mail, ShieldAlert, CheckCircle2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  loginUser, 
  socialLogin, 
  forgotPassword, 
  clearError, 
  clearToast 
} from '../../redux/authSlice';
import InputField from '../common/InputField';
import PasswordInput from '../common/PasswordInput';
import SocialLoginButton from '../common/SocialLoginButton';
import AuthButton from '../common/AuthButton';

const LoginPage = () => {
  const dispatch = useDispatch();
  const { 
    isLoading, 
    toast, 
    forgotPasswordLoading, 
    forgotPasswordSuccess, 
    forgotPasswordError 
  } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: '',
    rememberMe: false,
  });

  const [errors, setErrors] = useState({});
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');

  // Clear errors/toasts on mount
  useEffect(() => {
    dispatch(clearError());
    dispatch(clearToast());
  }, [dispatch]);

  // Handle toast automatic clearing
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        dispatch(clearToast());
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, dispatch]);

  // Close modal when forgot password completes successfully
  useEffect(() => {
    if (forgotPasswordSuccess) {
      const timer = setTimeout(() => {
        setShowForgotModal(false);
        setForgotEmail('');
        dispatch(clearError());
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [forgotPasswordSuccess, dispatch]);

  const validateField = (name, value) => {
    let errorMsg = '';
    if (!value.trim()) {
      if (name === 'emailOrUsername') errorMsg = 'Email or Username is required';
      if (name === 'password') errorMsg = 'Password is required';
    }
    setErrors((prev) => ({ ...prev, [name]: errorMsg }));
    return !errorMsg;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const inputValue = type === 'checkbox' ? checked : value;
    setFormData((prev) => ({ ...prev, [name]: inputValue }));
    
    // Clear error as user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    validateField(name, value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const isEmailOrUserValid = validateField('emailOrUsername', formData.emailOrUsername);
    const isPasswordValid = validateField('password', formData.password);

    if (!isEmailOrUserValid || !isPasswordValid) {
      return;
    }

    dispatch(loginUser(formData));
  };

  const handleSocialLogin = (provider) => {
    dispatch(socialLogin({ provider, mode: 'login' }));
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email address');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail)) {
      setForgotError('Please enter a valid email address');
      return;
    }

    setForgotError('');
    dispatch(forgotPassword(forgotEmail));
  };

  return (
    <>
      {toast && (
        <div className={`toast-alert ${toast.type}`}>
          {toast.type === 'success' ? (
            <CheckCircle2 size={20} color="var(--success)" />
          ) : (
            <ShieldAlert size={20} color="var(--error)" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Login UI */}
      <div className="auth-header">
        <h2 className="auth-title">Welcome back</h2>
        <p className="auth-subtitle">Log in to manage your career opportunities</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <InputField
          label="Email or Username"
          name="emailOrUsername"
          type="text"
          placeholder="Enter your email or username"
          value={formData.emailOrUsername}
          onChange={handleInputChange}
          onBlur={handleBlur}
          error={errors.emailOrUsername}
          icon={Mail}
          required
        />

        <div>
          <div className="input-label-row" style={{ marginBottom: '-22px' }}>
            <span /> {/* Spacer */}
            <a 
              href="#forgot-password" 
              className="forgot-password-link animate-fade-in"
              onClick={(e) => {
                e.preventDefault();
                setShowForgotModal(true);
              }}
            >
              Forgot password?
            </a>
          </div>
          <PasswordInput
            label="Password"
            name="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleInputChange}
            onBlur={handleBlur}
            error={errors.password}
            required
          />
        </div>

        <div className="auth-options">
          <label className="remember-me">
            <input
              type="checkbox"
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleInputChange}
            />
            <span>Remember me</span>
          </label>
        </div>

        <AuthButton loading={isLoading} disabled={isLoading}>
          Log In
        </AuthButton>
      </form>

      <div className="social-divider">Or continue with</div>

      <div className="social-btn-container">
        <SocialLoginButton provider="google" onClick={() => handleSocialLogin('Google')} />
        <SocialLoginButton provider="linkedin" onClick={() => handleSocialLogin('LinkedIn')} />
      </div>

      <div className="auth-footer">
        Don't have an account?
        <Link to="/signup" className="auth-footer-link">
          Create one
        </Link>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="modal-overlay" onClick={() => setShowForgotModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Reset password</h3>
              <button 
                type="button" 
                className="modal-close" 
                onClick={() => setShowForgotModal(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleForgotSubmit}>
              <div className="modal-body">
                <p style={{ marginBottom: '16px' }}>
                  Enter the email address associated with your account, and we'll send you link instructions to reset your password.
                </p>
                <InputField
                  label="Email Address"
                  name="forgotEmail"
                  type="email"
                  placeholder="name@example.com"
                  value={forgotEmail}
                  onChange={(e) => {
                    setForgotEmail(e.target.value);
                    if (forgotError) setForgotError('');
                    dispatch(clearError());
                  }}
                  error={forgotError || forgotPasswordError}
                  icon={Mail}
                  required
                />
              </div>

              <AuthButton loading={forgotPasswordLoading} disabled={forgotPasswordLoading}>
                Send Reset Link
              </AuthButton>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default LoginPage;
