import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookie from 'js-cookie';

// Permission aliases keep the raw approved_role but grant a different
// role's access. Backend already aliases on new logins; this handles
// persisted sessions (from before the alias was added) and preserves
// the raw approvedRole so DashboardLayout can pick the right sidebar.
const ROLE_ALIASES = {
  TRAINER: 'PLACEMENT_COORDINATOR',
  COORDINATOR: 'ADMIN',
};
const aliasUser = (u) => {
  if (!u) return u;
  const rawRole = u.approvedRole ?? u.role;
  const aliased = ROLE_ALIASES[u.role] || u.role;
  if (aliased === u.role && u.approvedRole !== undefined) return u;
  return { ...u, role: aliased, approvedRole: rawRole };
};

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user) => set({ user: aliasUser(user) }),
      setToken: (token) => set({ token }),
      setRefreshToken: (refreshToken) => set({ refreshToken }),
      setIsLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      setIsAuthenticated: (authenticated) =>
        set({ isAuthenticated: authenticated }),

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ email, password }),
            }
          );

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Login failed');
          }

          const data = await response.json();
          set({
            user: aliasUser(data.user),
            token: data.token,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            error: null,
          });

          Cookie.set('token', data.token, { expires: 1 });
          Cookie.set('refreshToken', data.refreshToken, { expires: 7 });

          return data;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Login failed';
          set({ error: errorMessage, isAuthenticated: false });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      signup: async (formData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/signup`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(formData),
            }
          );

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Signup failed');
          }

          const data = await response.json();
          set({ error: null });
          return data;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Signup failed';
          set({ error: errorMessage });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
        Cookie.remove('token');
        Cookie.remove('refreshToken');
      },

      refreshAccessToken: async () => {
        try {
          const { refreshToken } = get();
          if (!refreshToken) throw new Error('No refresh token available');

          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh-token`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ refreshToken }),
            }
          );

          if (!response.ok) throw new Error('Token refresh failed');

          const data = await response.json();
          set({ token: data.token });
          Cookie.set('token', data.token, { expires: 1 });
          return data.token;
        } catch (error) {
          get().logout();
          throw error;
        }
      },

      initializeAuth: async () => {
        set({ isLoading: true });
        const token = Cookie.get('token');
        const refreshToken = Cookie.get('refreshToken');

        if (token && refreshToken) {
          set({
            token,
            refreshToken,
            isAuthenticated: true,
          });

          // Fetch user profile to restore user data
          try {
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/auth/profile`,
              {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
              }
            );

            if (response.ok) {
              const data = await response.json();
              set({ user: aliasUser(data.user || data), isLoading: false });
            } else {
              // Token might be invalid, clear auth
              set({
                user: null,
                token: null,
                refreshToken: null,
                isAuthenticated: false,
                isLoading: false,
              });
              Cookie.remove('token');
              Cookie.remove('refreshToken');
            }
          } catch (error) {
            console.error('Failed to fetch user profile:', error);
            // Clear auth on error
            set({
              user: null,
              token: null,
              refreshToken: null,
              isAuthenticated: false,
              isLoading: false,
            });
            Cookie.remove('token');
            Cookie.remove('refreshToken');
          }
        } else {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      // Existing sessions may have been persisted while TRAINER was
      // still a raw role — alias on rehydrate.
      onRehydrateStorage: () => (state) => {
        if (state?.user) state.user = aliasUser(state.user);
      },
    }
  )
);

export default useAuthStore;
