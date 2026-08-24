import { useState, useEffect } from 'react';
import { User, Mail, Phone, ShieldAlert, CheckCircle2, CheckSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  registerUser, 
  socialLogin, 
  clearError, 
  clearToast 
} from '../../redux/authSlice';
import InputField from '../common/InputField';
import PasswordInput from '../common/PasswordInput';
import SocialLoginButton from '../common/SocialLoginButton';
import AuthButton from '../common/AuthButton';

const SignupPage = () => {
  const dispatch = useDispatch();
  const { isLoading, toast } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});

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

  const validateField = (name, value) => {
    let errorMsg = '';
    
    if (!value.trim()) {
      errorMsg = `${name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1')} is required`;
    } else {
      if (name === 'fullName' && value.trim().length < 2) {
        errorMsg = 'Full Name must be at least 2 characters';
      }
      
      if (name === 'username') {
        const usernameRegex = /^[a-zA-Z0-9_]{3,15}$/;
        if (!usernameRegex.test(value)) {
          errorMsg = 'Username must be 3-15 characters (letters, numbers, underscores)';
        }
      }

      if (name === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errorMsg = 'Please enter a valid email address';
        }
      }

      if (name === 'phoneNumber') {
        const phoneRegex = /^[+]?[0-9\s\-()]{10,14}$/;
        if (!phoneRegex.test(value.replace(/\s+/g, ''))) {
          errorMsg = 'Please enter a valid 10-14 digit phone number';
        }
      }

      if (name === 'password') {
        if (value.length < 8) {
          errorMsg = 'Password must be at least 8 characters';
        }
      }

      if (name === 'confirmPassword') {
        if (value !== formData.password) {
          errorMsg = 'Passwords do not match';
        }
      }
    }

    setErrors((prev) => ({ ...prev, [name]: errorMsg }));
    return !errorMsg;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error as user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }

    // If confirm password has an error and password is changing, revalidate matching on next cycle
    if (name === 'password' && formData.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: '' }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    validateField(name, value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate all fields
    let isValid = true;
    Object.keys(formData).forEach((key) => {
      const isFieldValid = validateField(key, formData[key]);
      if (!isFieldValid) isValid = false;
    });

    if (!isValid) {
      return;
    }

    dispatch(registerUser(formData));
  };

  const handleSocialSignup = (provider) => {
    dispatch(socialLogin({ provider, mode: 'signup' }));
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

      {/* Header */}
      <div className="auth-header">
        <h2 className="auth-title">Create account</h2>
        <p className="auth-subtitle">Join us to kickstart your professional journey</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        {/* Full Name & Username in 2 columns on Desktop */}
        <div className="form-group-row">
          <InputField
            label="Full Name"
            name="fullName"
            type="text"
            placeholder="John Doe"
            value={formData.fullName}
            onChange={handleInputChange}
            onBlur={handleBlur}
            error={errors.fullName}
            icon={User}
            required
          />

          <InputField
            label="Username"
            name="username"
            type="text"
            placeholder="johndoe_99"
            value={formData.username}
            onChange={handleInputChange}
            onBlur={handleBlur}
            error={errors.username}
            icon={User}
            required
          />
        </div>

        {/* Email & Phone Number */}
        <InputField
          label="Email Address"
          name="email"
          type="email"
          placeholder="john.doe@example.com"
          value={formData.email}
          onChange={handleInputChange}
          onBlur={handleBlur}
          error={errors.email}
          icon={Mail}
          required
        />

        <InputField
          label="Phone Number"
          name="phoneNumber"
          type="tel"
          placeholder="+1 (555) 019-2834"
          value={formData.phoneNumber}
          onChange={handleInputChange}
          onBlur={handleBlur}
          error={errors.phoneNumber}
          icon={Phone}
          required
        />

        {/* Passwords - Two separate inputs */}
        <PasswordInput
          label="Password"
          name="password"
          placeholder="Create strong password"
          value={formData.password}
          onChange={handleInputChange}
          onBlur={handleBlur}
          error={errors.password}
          showStrengthMeter
          required
        />

        <PasswordInput
          label="Confirm Password"
          name="confirmPassword"
          placeholder="Verify your password"
          value={formData.confirmPassword}
          onChange={handleInputChange}
          onBlur={handleBlur}
          error={errors.confirmPassword}
          required
        />

        <AuthButton loading={isLoading} disabled={isLoading} icon={CheckSquare}>
          Create Account
        </AuthButton>
      </form>

      <div className="social-divider">Or sign up with</div>

      <div className="social-btn-container">
        <SocialLoginButton provider="google" onClick={() => handleSocialSignup('Google')} />
        <SocialLoginButton provider="linkedin" onClick={() => handleSocialSignup('LinkedIn')} />
      </div>

      <div className="auth-footer">
        Already have an account?
        <Link to="/login" className="auth-footer-link">
          Log in
        </Link>
      </div>
    </>
  );
};

export default SignupPage;
