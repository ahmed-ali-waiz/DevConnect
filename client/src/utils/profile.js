export const isProfileComplete = (user) => {
  if (!user) return false;
  const hasName = !!user.name && user.name.trim().length >= 2;
  const hasUsername = !!user.username && user.username.trim().length >= 3;
  const hasBio = !!user.bio && user.bio.trim().length >= 10;
  const hasAvatar = !!user.profilePic;
  return hasName && hasUsername && hasBio && hasAvatar;
};

