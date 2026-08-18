import { create } from 'zustand';
import { getSystemConfig, getSystemMenus } from '@/services/system';

type Store = {
  menus: any[];
  theme: any;
  fetchMenus: () => void;
  fetchConfig: () => void;
  setTheme: (payload: any) => void;
};

const defaultTheme = {
  layout: 'light',
  colorPrimary: '#1677ff',
  colorInfo: '#1677ff',
};

const useSystemStore = create<Store>()((set) => ({
  menus: [],
  theme: { ...defaultTheme },

  fetchConfig: async () => {
    const res = await getSystemConfig();

    let theme = {};
    try {
      const obj = JSON.parse(res.data?.theme || '{}');
      theme = {
        ...defaultTheme,
        ...obj,
      };
    } catch {}

    set((state) => ({
      ...state,
      theme,
    }));

    return res;
  },

  fetchMenus: async () => {
    const res = await getSystemMenus();
    let menus: any[] = [];
    if (Array.isArray(res.data)) {
      menus = res.data;
    } else if (res.data && Array.isArray(res.data.list)) {
      menus = res.data.list;
    }
    set((state) => ({
      ...state,
      menus,
    }));

    return res;
  },

  setTheme: (payload: any) => {
    set((state) => ({
      ...state,
      theme: payload,
    }));
  },
}));

export default useSystemStore;
