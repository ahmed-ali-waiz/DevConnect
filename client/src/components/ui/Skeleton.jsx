const Skeleton = ({ className = '', type = 'text', ...props }) => {
  const baseClasses = "animate-pulse bg-(--border-glass)";
  
  const types = {
    text: "h-4 rounded w-3/4",
    avatar: "rounded-full w-10 h-10",
    card: "rounded-(--radius-card) h-32 w-full",
    image: "rounded-lg w-full h-48",
    button: "rounded-full h-10 w-24"
  };

  return (
    <div 
      className={`${baseClasses} ${types[type]} ${className}`} 
      {...props} 
    />
  );
};

export default Skeleton;
