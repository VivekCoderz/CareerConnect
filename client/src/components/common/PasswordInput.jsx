import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

const PasswordInput = ({
  label,
  name,
  placeholder = '••••••••',
  value,
  onChange,
  onBlur,
  error,
  required = false,
  showStrengthMeter = false,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const calculateStrength = (password) => {
    if (!password) {
      return { score: 0, label: '', color: 'transparent', width: '0%' };
    }
    
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    switch (score) {
      case 0:
      case 1:
        return { score: 1, label: 'Weak', color: 'var(--error)', width: '25%' };
      case 2:
        return { score: 2, label: 'Fair', color: '#eab308', width: '50%' }; // yellow-500
      case 3:
        return { score: 3, label: 'Good', color: '#3b82f6', width: '75%' }; // blue-500
      case 4:
        return { score: 4, label: 'Strong', color: 'var(--success)', width: '100%' };
      default:
        return { score: 0, label: '', color: 'transparent', width: '0%' };
    }
  };

  const strength = calculateStrength(value);

  const togglePasswordVisibility = (e) => {
    e.preventDefault();
    setShowPassword(!showPassword);
  };

  return (
    <div className="input-field-container">
      <div className="input-label-row">
        <label 
          htmlFor={name} 
          className={`input-label ${isFocused ? 'active-focus' : ''} ${error ? 'has-error' : ''}`}
        >
          {label} {required && <span style={{ color: 'var(--error)' }}>*</span>}
        </label>
      </div>
      <div className="input-wrapper">
        <Lock 
          size={18} 
          className="input-icon-left" 
          style={{ 
            color: isFocused ? 'var(--primary)' : (error ? 'var(--error)' : 'var(--text-light)'),
            transition: 'color 0.2s ease'
          }} 
        />
        <input
          type={showPassword ? 'text' : 'password'}
          id={name}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            setIsFocused(false);
            if (onBlur) onBlur(e);
          }}
          className={`input-control ${error ? 'has-error' : ''} ${value && !error ? 'has-success' : ''}`}
          style={{ paddingLeft: '42px', paddingRight: '42px' }}
          required={required}
          {...props}
        />
        <button
          type="button"
          onClick={togglePasswordVisibility}
          className="input-icon-right"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {showStrengthMeter && value && (
        <div className="strength-meter-container">
          <div className="strength-meter-track">
            <div 
              className="strength-meter-bar" 
              style={{ 
                width: strength.width, 
                backgroundColor: strength.color 
              }}
            />
          </div>
          <div className="strength-label" style={{ color: strength.color }}>
            <span>Password Strength</span>
            <span>{strength.label}</span>
          </div>
        </div>
      )}

      {error && (
        <span className="input-error-msg">
          <span style={{ fontSize: '14px', lineHeight: '1' }}>•</span> {error}
        </span>
      )}
    </div>
  );
};

export default PasswordInput;
