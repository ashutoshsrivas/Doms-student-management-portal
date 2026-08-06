import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from '@/app/lib/apiClient';

// Global "which academic session am I working in" preference. Persisted per
// browser so a staff user's dashboard stays on the cohort they picked last
// time, regardless of which session the org has marked active.
const useSessionStore = create(
  persist(
    (set, get) => ({
      activeSessionId: null,   // user's chosen filter, or null = "all sessions"
      sessions: [],
      loaded: false,
      loading: false,

      setActiveSessionId: (id) => set({ activeSessionId: id || null }),

      loadSessions: async () => {
        if (get().loading) return;
        try {
          set({ loading: true });
          const res = await apiClient.get('/sessions?limit=100');
          const list = res.data?.sessions || [];
          set({ sessions: list, loaded: true });
          // First-time visitors get the currently-active session pre-selected.
          if (get().activeSessionId == null && list.length > 0) {
            const active = list.find((s) => s.isActive) || list[0];
            set({ activeSessionId: active.id });
          }
        } catch (err) {
          console.error('Failed to load sessions:', err);
        } finally {
          set({ loading: false });
        }
      },
    }),
    {
      name: 'doms-active-session',
      partialize: (state) => ({ activeSessionId: state.activeSessionId }),
    },
  ),
);

export default useSessionStore;
