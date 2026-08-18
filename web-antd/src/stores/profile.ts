import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { loginForAccount, getUserInfo } from '@/services/auth';

type Store = {
  token: any;
  profile: any;
  roles: string[];
  permissions: string[];
  fetchProfile: () => any;
  loginAccount: (params: any) => any;
  setProfile: (data: any) => void;
  logoutAccount: () => void;
};

const useProfileStore = create<Store>()(
  persist(
    (set) => ({
      token: null,
      profile: null,
      roles: [],
      permissions: [],

      fetchProfile: async () => {
        const res: any = await getUserInfo();
        if (res.code === 200 && res.data) {
          const profile = res.data;
          set({
            profile,
            roles: profile.roles || [],
            permissions: profile.buttons || [],
          });
        }
        return res;
      },

      loginAccount: async (account: any) => {
        const res: any = await loginForAccount(account);
        const token = res?.data?.access_token || res?.data?.token || res?.token;
        set({ token });
        return { ...res, token };
      },

      setProfile: (data: any) => {
        set({
          profile: data,
          roles: data?.roles || [],
          permissions: data?.buttons || [],
        });
      },

      logoutAccount: () => {
        set({ token: null, profile: null, roles: [], permissions: [] });
      },
    }),
    {
      name: 'token',
      partialize: (state) => ({
        token: state.token,
      }),
    },
  ),
);

export default useProfileStore;
