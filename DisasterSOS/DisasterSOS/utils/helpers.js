export const formatDate = (isoString) => {
  return new Date(isoString).toLocaleString();
};

export const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
