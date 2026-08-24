
const AuthButton = ({
  type = 'submit',
  loading = false,
  disabled = false,
  onClick,
  children,
  icon: Icon,
  ...props
}) => {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className="primary-btn"
      {...props}
    >
      {loading ? (
        <div className="spinner" aria-hidden="true" />
      ) : (
        <>
          {Icon && <Icon size={18} />}
          <span>{children}</span>
        </>
      )}
    </button>
  );
};

export default AuthButton;
