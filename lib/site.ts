export const staticHosting = import.meta.env.VITE_STATIC_HOSTING === 'true';
export const sitePath = (path = '') =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
