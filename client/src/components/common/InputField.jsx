import { useState } from 'react';

const InputField = ({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  icon: Icon,
  required = false,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  return (
    <div className="input-field-container">
      {label && (
        <div className="input-label-row">
          <label 
            htmlFor={name} 
            className={`input-label ${isFocused ? 'active-focus' : ''} ${error ? 'has-error' : ''}`}
          >
            {label} {required && <span style={{ color: 'var(--error)' }}>*</span>}
          </label>
        </div>
      )}
      <div className="input-wrapper">
        {Icon && (
          <Icon 
            size={18} 
            className="input-icon-left" 
            style={{ 
              color: isFocused ? 'var(--primary)' : (error ? 'var(--error)' : 'var(--text-light)'),
              transition: 'color 0.2s ease'
            }} 
          />
        )}
        <input
          type={type}
          id={name}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={`input-control ${error ? 'has-error' : ''} ${value && !error ? 'has-success' : ''}`}
          style={{ paddingLeft: Icon ? '42px' : '14px' }}
          required={required}
          {...props}
        />
      </div>
      {error && (
        <span className="input-error-msg">
          <span style={{ fontSize: '14px', lineHeight: '1' }}>•</span> {error}
        </span>
      )}
    </div>
  );
};

export default InputField;
