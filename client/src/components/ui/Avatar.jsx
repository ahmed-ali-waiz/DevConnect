import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';

const Avatar = ({ 
  src, 
  alt = "User Avatar", 
  size = "md", 
  isOnline = false, 
  hasStory = false,
  className = "" 
}) => {
  const sizes = {
    xs: "w-6 h-6",
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-14 h-14",
    xl: "w-24 h-24",
    xxl: "w-32 h-32"
  };

  const ringStyles = hasStory ? "p-0.5 border-2 border-transparent bg-linear-to-tr from-(--accent-primary) to-(--accent-secondary) bg-clip-border" : "";
  const defaultAvatar = `https://ui-avatars.com/api/?name=${alt.replace(' ', '+')}&background=0D1117&color=6EE7F7`;

  return (
    <div className={`relative inline-block ${className}`}>
      <div className={`rounded-full overflow-hidden ${sizes[size]} ${ringStyles}`}>
        <LazyLoadImage
          src={src || defaultAvatar}
          alt={alt}
          effect="blur"
          className="w-full h-full object-cover rounded-full"
          wrapperClassName="w-full h-full"
        />
      </div>
      {isOnline && (
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-(--accent-green) border-2 border-(--bg-primary) rounded-full z-10"></div>
      )}
    </div>
  );
};

export default Avatar;
