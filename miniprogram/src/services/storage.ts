const ACCESS = 'qingxier_access_token';
const REFRESH = 'qingxier_refresh_token';
export const tokenStorage = {
  access: () => String(uni.getStorageSync(ACCESS) || ''),
  refresh: () => String(uni.getStorageSync(REFRESH) || ''),
  save(accessToken: string, refreshToken: string) { uni.setStorageSync(ACCESS, accessToken); uni.setStorageSync(REFRESH, refreshToken); },
  clear() { uni.removeStorageSync(ACCESS); uni.removeStorageSync(REFRESH); }
};
