'use client';

// Admin: manage per-role default permissions and per-user overrides.
// Two tabs:
//   1. Role Defaults — big grid (rows = areas/permissions, cols = base
//      roles). Click a cell to grant/revoke that role's default.
//   2. User Overrides — pick a user, see their effective perms + sparse
//      overrides, click to grant / revoke / reset (back to role default).

import { useEffect, useState, useCallback, useMemo, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiLock, FiArrowLeft, FiLoader, FiSearch, FiCheck, FiX,
  FiAlertCircle, FiUserCheck, FiUser, FiRefreshCw,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import useAuthStore from '@/app/store/authStore';
import apiClient from '@/app/lib/apiClient';
import DashboardLayout from '@/app/components/DashboardLayout';

interface PermRow {
  id: string;
  key: string;
  label: string;
  description: string | null;
  defaultRoles: string[];
}
interface Area { name: string; permissions: PermRow[] }
interface Catalog { roles: string[]; areas: Area[] }

interface UserLite {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  approvedRole: string;
  department?: string;
}
interface UserPermDetail {
  user: { id: string; firstName: string; lastName: string | null; email: string; role: string; department?: string; status: string };
  baseRolePermissions: string[];
  overrides: { key: string; label: string; area: string; granted: boolean }[];
  effective: string[];
}

const ROLE_SHORT_LABEL: Record<string, string> = {
  ADMIN: 'Admin',
  HOD: 'HOD',
  FACULTY: 'Faculty',
  COORDINATOR: 'Coord',
  PLACEMENT_COORDINATOR: 'PC',
  TRAINER: 'Trainer',
  STUDENT: 'Student',
  MENTOR: 'Mentor',
};

export default function RolesPermissionsPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [tab, setTab] = useState<'roles' | 'users'>('roles');
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [areaFilter, setAreaFilter] = useState<string>('ALL');
  const [savingCell, setSavingCell] = useState<string | null>(null);

  // Users tab state
  const [users, setUsers] = useState<UserLite[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userDetail, setUserDetail] = useState<UserPermDetail | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [savingOverrideKey, setSavingOverrideKey] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== 'ADMIN') router.push('/dashboard');
  }, [user, router]);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/permissions');
      setCatalog(res.data);
    } catch {
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  const loadUsers = useCallback(async () => {
    try {
      const res = await apiClient.get('/permissions/users');
      setUsers(res.data.users || []);
    } catch { toast.error('Failed to load users'); }
  }, []);

  const loadUserDetail = useCallback(async (uid: string) => {
    if (!uid) { setUserDetail(null); return; }
    setUserDetailLoading(true);
    try {
      const res = await apiClient.get(`/permissions/user/${uid}`);
      setUserDetail(res.data);
    } catch { toast.error('Failed to load user details'); }
    finally { setUserDetailLoading(false); }
  }, []);

  useEffect(() => { if (tab === 'users' && users.length === 0) loadUsers(); }, [tab, users.length, loadUsers]);
  useEffect(() => { loadUserDetail(selectedUserId); }, [selectedUserId, loadUserDetail]);

  // === Toggle a role default ===
  const toggleRoleDefault = async (roleName: string, perm: PermRow, currentlyHas: boolean) => {
    const cellKey = `${roleName}:${perm.key}`;
    setSavingCell(cellKey);
    // Optimistic update
    setCatalog((c) => c && ({
      ...c,
      areas: c.areas.map((a) => ({
        ...a,
        permissions: a.permissions.map((p) => p.key !== perm.key ? p : ({
          ...p,
          defaultRoles: currentlyHas
            ? p.defaultRoles.filter((r) => r !== roleName)
            : Array.from(new Set([...p.defaultRoles, roleName])).sort(),
        })),
      })),
    }));
    try {
      await apiClient.patch(`/permissions/role/${roleName}/${perm.key}`, { granted: !currentlyHas });
      // No toast on every cell — that'd be noisy
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to save');
      // Roll back
      loadCatalog();
    } finally {
      setSavingCell(null);
    }
  };

  // === Toggle a user override ===
  const setOverride = async (permKey: string, state: 'grant' | 'revoke' | 'reset') => {
    if (!selectedUserId) return;
    setSavingOverrideKey(permKey);
    try {
      await apiClient.patch(`/permissions/user/${selectedUserId}/${permKey}`, { state });
      toast.success(state === 'reset' ? 'Override removed (back to role default)' : state === 'grant' ? 'Granted' : 'Revoked');
      loadUserDetail(selectedUserId);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSavingOverrideKey(null);
    }
  };

  const visibleAreas = useMemo(() => {
    if (!catalog) return [];
    if (areaFilter === 'ALL') return catalog.areas;
    return catalog.areas.filter((a) => a.name === areaFilter);
  }, [catalog, areaFilter]);

  const visibleUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      `${u.firstName} ${u.lastName || ''}`.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.department || '').toLowerCase().includes(q),
    );
  }, [users, userSearch]);

  if (loading) {
    return (
      <DashboardLayout title="Roles & Permissions">
        <div className="min-h-[60vh] flex items-center justify-center">
          <FiLoader className="animate-spin text-blue-600" size={32} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Roles & Permissions">
      <div className="py-6 px-2 md:px-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2"><FiLock /> Roles &amp; Permissions</h1>
            <p className="text-gray-600 mt-1 text-sm">
              Edit what each base role can do, or override permissions for individual users.
              Changes take effect on the user&apos;s next request.
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg"
          >
            <FiArrowLeft /> Back
          </button>
        </div>

        {/* Safety note */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4 text-xs text-yellow-900">
          <p className="font-bold uppercase tracking-wide">⚠ Heads up</p>
          <p className="mt-1">
            Some routes still use the older role-only gate and will not yet reflect your edits here —
            we&apos;re migrating them feature-by-feature. The most-touched areas (Events, Faculty Groups,
            Announcements) are migrated; others follow soon. Revoking <code>admin.manage_roles</code>
            from yourself will lock you out of this page — don&apos;t do that.
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-4 flex">
          <button
            onClick={() => setTab('roles')}
            className={`px-4 py-2 -mb-px border-b-2 text-sm font-semibold flex items-center gap-2 ${tab === 'roles' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
          >
            <FiUserCheck /> Role Defaults
          </button>
          <button
            onClick={() => setTab('users')}
            className={`px-4 py-2 -mb-px border-b-2 text-sm font-semibold flex items-center gap-2 ${tab === 'users' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
          >
            <FiUser /> User Overrides
          </button>
        </div>

        {tab === 'roles' && catalog && (
          <>
            {/* Area filter */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-xs font-semibold uppercase text-gray-500">Area:</span>
              <button
                onClick={() => setAreaFilter('ALL')}
                className={`px-2.5 py-1 text-xs font-semibold rounded ${areaFilter === 'ALL' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                All
              </button>
              {catalog.areas.map((a) => (
                <button
                  key={a.name}
                  onClick={() => setAreaFilter(a.name)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded ${areaFilter === a.name ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  {a.name}
                </button>
              ))}
            </div>

            {/* Grid */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-3 py-2.5 font-bold text-gray-900 sticky left-0 bg-gray-50 z-20" style={{ minWidth: 260 }}>Permission</th>
                    {catalog.roles.map((r) => (
                      <th key={r} className="px-2 py-2.5 text-center font-bold text-gray-700 text-xs uppercase">
                        {ROLE_SHORT_LABEL[r] || r}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleAreas.map((area) => (
                    <Fragment key={area.name}>
                      <tr>
                        <td colSpan={1 + catalog.roles.length} className="px-3 py-1.5 bg-blue-50 font-bold text-blue-800 text-xs uppercase tracking-wide sticky left-0">
                          {area.name}
                        </td>
                      </tr>
                      {area.permissions.map((perm) => (
                        <tr key={perm.key} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-3 py-2 sticky left-0 bg-white" style={{ minWidth: 260 }}>
                            <div>
                              <p className="font-medium text-gray-900">{perm.label}</p>
                              <p className="text-[11px] text-gray-500 font-mono">{perm.key}</p>
                              {perm.description && <p className="text-[11px] text-gray-600 mt-0.5">{perm.description}</p>}
                            </div>
                          </td>
                          {catalog.roles.map((r) => {
                            const has = perm.defaultRoles.includes(r);
                            const cellKey = `${r}:${perm.key}`;
                            const saving = savingCell === cellKey;
                            return (
                              <td key={r} className="px-2 py-2 text-center">
                                <button
                                  onClick={() => toggleRoleDefault(r, perm, has)}
                                  disabled={saving}
                                  title={has ? `Revoke from ${r}` : `Grant to ${r}`}
                                  className={`w-7 h-7 inline-flex items-center justify-center rounded transition disabled:opacity-50
                                    ${has
                                      ? 'bg-green-600 hover:bg-red-600 text-white'
                                      : 'bg-gray-100 hover:bg-green-500 hover:text-white text-gray-400 border border-gray-200'}`}
                                >
                                  {saving ? <FiLoader className="animate-spin" size={12} /> : has ? <FiCheck size={14} /> : <FiX size={14} />}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* User list */}
            <aside className="lg:col-span-1 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="p-3 border-b border-gray-200">
                <div className="relative">
                  <FiSearch className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search users…"
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded text-sm text-gray-900"
                  />
                </div>
              </div>
              <ul className="max-h-[70vh] overflow-y-auto divide-y divide-gray-100">
                {visibleUsers.length === 0 ? (
                  <li className="p-4 text-sm text-gray-500 italic">No users match.</li>
                ) : (
                  visibleUsers.map((u) => {
                    const active = u.id === selectedUserId;
                    return (
                      <li key={u.id}>
                        <button
                          onClick={() => setSelectedUserId(u.id)}
                          className={`w-full text-left px-3 py-2.5 transition ${active ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50 border-l-4 border-transparent'}`}
                        >
                          <p className="text-sm font-semibold text-gray-900 truncate">{u.firstName} {u.lastName || ''}</p>
                          <p className="text-xs text-gray-600 truncate">
                            {u.approvedRole}{u.department ? ` · ${u.department}` : ''}
                          </p>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </aside>

            {/* Detail */}
            <main className="lg:col-span-2 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              {!selectedUserId ? (
                <div className="p-8 text-center text-gray-600">
                  <FiAlertCircle className="mx-auto text-gray-400 mb-2" size={28} />
                  Pick a user from the list.
                </div>
              ) : userDetailLoading || !userDetail ? (
                <div className="p-8 text-center text-gray-500">
                  <FiLoader className="animate-spin inline-block" size={20} />
                </div>
              ) : (
                <UserOverrideEditor
                  detail={userDetail}
                  catalog={catalog}
                  savingKey={savingOverrideKey}
                  onChange={setOverride}
                />
              )}
            </main>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------------
function UserOverrideEditor({ detail, catalog, savingKey, onChange }: {
  detail: UserPermDetail;
  catalog: Catalog | null;
  savingKey: string | null;
  onChange: (key: string, state: 'grant' | 'revoke' | 'reset') => void;
}) {
  const base = useMemo(() => new Set(detail.baseRolePermissions), [detail]);
  const overrideMap = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const o of detail.overrides) m.set(o.key, o.granted);
    return m;
  }, [detail]);

  if (!catalog) return null;
  return (
    <div>
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h2 className="text-xl font-bold text-gray-900">{detail.user.firstName} {detail.user.lastName || ''}</h2>
        <p className="text-sm text-gray-600">{detail.user.email}</p>
        <p className="text-xs text-gray-500 mt-1">
          Base role: <span className="font-semibold">{detail.user.role}</span> · {detail.user.status}
          {detail.user.department ? ` · ${detail.user.department}` : ''} ·{' '}
          {detail.effective.length} effective permissions
        </p>
      </div>

      <div className="max-h-[70vh] overflow-y-auto p-4 space-y-4">
        {catalog.areas.map((area) => (
          <section key={area.name}>
            <h3 className="text-xs font-bold uppercase text-blue-800 mb-2 tracking-wide">{area.name}</h3>
            <ul className="border border-gray-200 rounded divide-y divide-gray-100">
              {area.permissions.map((perm) => {
                const fromBase = base.has(perm.key);
                const override = overrideMap.get(perm.key);
                let state: 'effective_via_role' | 'effective_via_override' | 'denied_via_override' | 'inactive';
                if (override === true) state = 'effective_via_override';
                else if (override === false) state = 'denied_via_override';
                else if (fromBase) state = 'effective_via_role';
                else state = 'inactive';

                const saving = savingKey === perm.key;
                return (
                  <li key={perm.key} className="px-3 py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{perm.label}</p>
                      <p className="text-[11px] text-gray-500 font-mono">{perm.key}</p>
                      <p className="text-[11px] mt-0.5">
                        {state === 'effective_via_role' && <span className="text-green-700">✓ via role default</span>}
                        {state === 'effective_via_override' && <span className="text-emerald-700 font-semibold">✓ granted (override)</span>}
                        {state === 'denied_via_override' && <span className="text-red-700 font-semibold">✗ revoked (override)</span>}
                        {state === 'inactive' && <span className="text-gray-500">– not granted</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        disabled={saving}
                        onClick={() => onChange(perm.key, 'grant')}
                        className={`text-xs px-2 py-1 rounded font-semibold border ${
                          override === true ? 'bg-emerald-600 text-white border-emerald-700'
                            : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50'
                        } disabled:opacity-50`}
                        title="Force grant — overrides the role default"
                      >Grant</button>
                      <button
                        disabled={saving}
                        onClick={() => onChange(perm.key, 'revoke')}
                        className={`text-xs px-2 py-1 rounded font-semibold border ${
                          override === false ? 'bg-red-600 text-white border-red-700'
                            : 'bg-white text-red-700 border-red-300 hover:bg-red-50'
                        } disabled:opacity-50`}
                        title="Force revoke — overrides the role default"
                      >Revoke</button>
                      <button
                        disabled={saving || override === undefined}
                        onClick={() => onChange(perm.key, 'reset')}
                        className="text-xs px-2 py-1 rounded font-semibold border bg-white text-gray-600 border-gray-300 hover:bg-gray-50 disabled:opacity-30 inline-flex items-center gap-1"
                        title="Remove any override (falls back to role default)"
                      ><FiRefreshCw size={10} /> Reset</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
