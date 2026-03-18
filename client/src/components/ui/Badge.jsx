const Badge = ({ children, variant = 'primary', className = '' }) => {
  const variants = {
    primary: "bg-(--accent-primary)/10 text-(--accent-primary) border border-(--accent-primary)/20",
    secondary: "bg-(--accent-secondary)/10 text-(--accent-secondary) border border-(--accent-secondary)/20",
    success: "bg-(--accent-green)/10 text-(--accent-green) border border-(--accent-green)/20",
    warning: "bg-(--accent-orange)/10 text-(--accent-orange) border border-(--accent-orange)/20",
    danger: "bg-red-500/10 text-red-500 border border-red-500/20",
    neutral: "bg-(--bg-glass) text-(--text-muted) border border-(--border-glass)",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
