import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Shield,
  Camera,
  Check,
  X,
  AlertCircle,
  Smartphone,
  CreditCard,
  Instagram,
  Mail,
  Key,
  Upload,
  UserCheck,
  Search,
  Sparkles,
  Lock,
} from 'lucide-react';
import { UserAccount } from '../types';
import { getApiBaseUrl, formatMediaUrl } from '../utils/apiConfig';

interface UserManagementSectionProps {
  currentUser: UserAccount | null;
  adminToken: string | null;
  onUserListChanged?: () => void;
}

export const UserManagementSection: React.FC<UserManagementSectionProps> = ({
  currentUser,
  adminToken,
  onUserListChanged,
}) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create User Modal / Drawer State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form Fields
  const [username, setUsername] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('shooter2026');
  const [role, setRole] = useState<'photographer' | 'admin'>('photographer');
  const [avatar, setAvatar] = useState<string>('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200');
  const [bio, setBio] = useState<string>('');
  const [instagram, setInstagram] = useState<string>('');
  const [venmoHandle, setVenmoHandle] = useState<string>('');
  const [payPalHandle, setPayPalHandle] = useState<string>('');

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editPassword, setEditPassword] = useState<string>('');

  // Avatar Upload Ref
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const editAvatarFileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = currentUser?.role === 'admin';

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const base = getApiBaseUrl();
      const endpoint = base ? `${base}/api/users` : `/api/users`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;

      const res = await fetch(endpoint, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.users && Array.isArray(data.users)) {
          setUsers(data.users);
        }
      }
    } catch (e: any) {
      console.warn('Error fetching users list:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [adminToken]);

  const handleAvatarFile = (file: File, isEdit: boolean = false) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (isEdit && editingUser) {
        setEditingUser({ ...editingUser, avatar: dataUrl });
      } else {
        setAvatar(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !name.trim()) {
      setStatusMsg({ type: 'error', text: 'Username and display name are required.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const base = getApiBaseUrl();
      const endpoint = base ? `${base}/api/users` : `/api/users`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          username: username.toLowerCase().trim(),
          name: name.trim(),
          email: email.trim(),
          password: password.trim() || 'shooter2026',
          role,
          avatar,
          bio: bio.trim(),
          instagram: instagram.trim(),
          venmoHandle: venmoHandle.trim(),
          payPalHandle: payPalHandle.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.user) {
        setUsers((prev) => [...prev, data.user]);
        setIsCreateModalOpen(false);
        setStatusMsg({ type: 'success', text: `Created user account for @${data.user.username} successfully!` });
        // Reset form
        setUsername('');
        setName('');
        setEmail('');
        setPassword('shooter2026');
        setBio('');
        setInstagram('');
        setVenmoHandle('');
        setPayPalHandle('');
        if (onUserListChanged) onUserListChanged();
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to create user.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Server error creating user.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setIsSubmitting(true);
      const base = getApiBaseUrl();
      const endpoint = base ? `${base}/api/users/${editingUser.id}` : `/api/users/${editingUser.id}`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;

      const bodyData: any = {
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role,
        avatar: editingUser.avatar,
        bio: editingUser.bio,
        instagram: editingUser.instagram,
        venmoHandle: editingUser.venmoHandle,
        payPalHandle: editingUser.payPalHandle,
        isActive: editingUser.isActive,
      };
      if (editPassword.trim()) {
        bodyData.password = editPassword.trim();
      }

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers,
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();
      if (res.ok && data.success && data.user) {
        setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? data.user : u)));
        setEditingUser(null);
        setEditPassword('');
        setStatusMsg({ type: 'success', text: `Updated @${data.user.username} successfully!` });
        if (onUserListChanged) onUserListChanged();
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to update user.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Server error updating user.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove user "${name}"?`)) return;

    try {
      const base = getApiBaseUrl();
      const endpoint = base ? `${base}/api/users/${id}` : `/api/users/${id}`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;

      const res = await fetch(endpoint, { method: 'DELETE', headers });
      const data = await res.json();

      if (res.ok && data.success) {
        setUsers((prev) => prev.filter((u) => u.id !== id));
        setStatusMsg({ type: 'success', text: `Removed user ${name}.` });
        if (onUserListChanged) onUserListChanged();
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to delete user.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.bio && u.bio.toLowerCase().includes(q)) ||
      (u.venmoHandle && u.venmoHandle.toLowerCase().includes(q)) ||
      (u.payPalHandle && u.payPalHandle.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner & Control Bar */}
      <div className="bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[var(--ps-primary,#0A84FF)]/20 text-[var(--ps-primary,#0A84FF)] border border-[var(--ps-primary,#0A84FF)]/30">
              <Users className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Photographer & User Management
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 max-w-xl">
            Only the Studio Admin can create users to control server load and storage limits. Manage
            profiles, custom bios, avatars, and direct Venmo / PayPal payment handles for tip routing.
          </p>
        </div>

        {isAdmin ? (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[var(--ps-primary,#0A84FF)] hover:brightness-110 text-white font-bold text-xs sm:text-sm shadow-xl active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New User</span>
          </button>
        ) : (
          <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span>Admin authorization required to provision new accounts</span>
          </div>
        )}
      </div>

      {/* Alert Status Feedback */}
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-semibold animate-in slide-in-from-top-2 duration-200 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/40 border-red-500/40 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="p-1 hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search photographers by name, @username, or handles..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
          />
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-gray-400">
          <span className="bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
            Total Users: <strong className="text-white">{users.length}</strong>
          </span>
          <span className="bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
            Photographers: <strong className="text-[var(--ps-primary,#0A84FF)]">{users.filter((u) => u.role === 'photographer').length}</strong>
          </span>
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((u) => (
          <div
            key={u.id}
            className="bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-3xl p-6 shadow-lg hover:border-white/20 transition-all duration-200 flex flex-col justify-between space-y-5"
          >
            {/* User Header */}
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={formatMediaUrl(u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200')}
                      alt={u.name}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-white/20 shadow-md"
                    />
                    <span
                      className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black ${
                        u.isActive ? 'bg-emerald-500' : 'bg-gray-500'
                      }`}
                      title={u.isActive ? 'Active Shooter' : 'Inactive'}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-white text-base truncate">{u.name}</h3>
                    </div>
                    <p className="text-xs font-mono text-[var(--ps-primary,#0A84FF)]">@{u.username}</p>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 ${
                        u.role === 'admin'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}
                    >
                      {u.role === 'admin' ? <Shield className="w-2.5 h-2.5" /> : <Camera className="w-2.5 h-2.5" />}
                      {u.role === 'admin' ? 'Studio Admin' : 'Photographer'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingUser(u);
                      setEditPassword('');
                    }}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
                    title="Edit User Profile"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {isAdmin && u.id !== currentUser?.id && (
                    <button
                      onClick={() => handleDeleteUser(u.id, u.name)}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                      title="Delete User Account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Bio */}
              <p className="text-xs text-gray-300 leading-relaxed line-clamp-3 bg-white/3 p-3 rounded-2xl border border-white/5">
                {u.bio || 'No bio provided for this photographer.'}
              </p>

              {/* Handles & Socials */}
              <div className="space-y-1.5 pt-1 text-xs">
                {u.email && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <span className="truncate">{u.email}</span>
                  </div>
                )}
                {u.instagram && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Instagram className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                    <span className="truncate">{u.instagram}</span>
                  </div>
                )}
                {u.venmoHandle && (
                  <div className="flex items-center gap-2 text-gray-300 font-mono">
                    <Smartphone className="w-3.5 h-3.5 text-[#008CFF] shrink-0" />
                    <span>Venmo: @{u.venmoHandle.replace(/^@/, '')}</span>
                  </div>
                )}
                {u.payPalHandle && (
                  <div className="flex items-center gap-2 text-gray-300 font-mono">
                    <CreditCard className="w-3.5 h-3.5 text-[#0070BA] shrink-0" />
                    <span>PayPal: {u.payPalHandle.replace(/^@/, '')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Status Tag */}
            <div className="pt-3 border-t border-[var(--ps-card-border,#2C2C2E)] flex items-center justify-between text-[11px] text-gray-500">
              <span>Member since {new Date(u.createdAt).toLocaleDateString()}</span>
              <span className="text-emerald-400 font-mono">Tip Ready</span>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE USER MODAL */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-[28px] p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[var(--ps-primary,#0A84FF)]/20 text-[var(--ps-primary,#0A84FF)] border border-[var(--ps-primary,#0A84FF)]/30 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Create Photographer / User</h3>
                  <p className="text-xs text-gray-400">Admin restricted user creation</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="py-6 space-y-5">
              {/* Profile Avatar Upload */}
              <div>
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-2">
                  Profile Picture / Avatar
                </label>
                <div className="flex items-center gap-4">
                  <img
                    src={avatar}
                    alt="Preview"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20 shrink-0"
                  />
                  <div className="flex-1 space-y-2">
                    <button
                      type="button"
                      onClick={() => avatarFileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Profile Photo</span>
                    </button>
                    <input
                      type="file"
                      ref={avatarFileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleAvatarFile(e.target.files[0], false);
                      }}
                    />
                    <input
                      type="text"
                      value={avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                      placeholder="Or enter direct image URL..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-gray-300 focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                    />
                  </div>
                </div>
              </div>

              {/* Name & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jordan Miller"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                    Username (@handle) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. jordan_apex"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-xs font-mono text-white focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                  />
                </div>
              </div>

              {/* Email & Initial Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="jordan@platesnap.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                    Initial Password *
                  </label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-xs font-mono text-white focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                  />
                </div>
              </div>

              {/* Role Selector */}
              <div>
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                  Account Role
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('photographer')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      role === 'photographer'
                        ? 'border-[var(--ps-primary,#0A84FF)] bg-[var(--ps-primary,#0A84FF)]/15 text-white font-bold'
                        : 'border-white/10 bg-white/5 text-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-blue-400" />
                      <span className="text-xs">Automotive Photographer</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      role === 'admin'
                        ? 'border-purple-500 bg-purple-500/15 text-purple-200 font-bold'
                        : 'border-white/10 bg-white/5 text-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-purple-400" />
                      <span className="text-xs">Studio Admin</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                  Photographer Bio
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Rolling shot specialist & trackday automotive media creator based in SoCal."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                />
              </div>

              {/* Tipping & Payment Handles (Venmo, PayPal, Instagram) */}
              <div className="p-4 rounded-2xl bg-white/3 border border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  <CreditCard className="w-4 h-4" />
                  <span>Direct Tipping & Social Handles</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                      Venmo Username
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 font-mono">@</span>
                      <input
                        type="text"
                        placeholder="jordan-miller-photo"
                        value={venmoHandle}
                        onChange={(e) => setVenmoHandle(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-7 pr-2.5 text-xs font-mono text-white focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                      PayPal.me Handle
                    </label>
                    <input
                      type="text"
                      placeholder="jordanmillerphoto"
                      value={payPalHandle}
                      onChange={(e) => setPayPalHandle(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs font-mono text-white focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                      Instagram Handle
                    </label>
                    <input
                      type="text"
                      placeholder="@jordan_shoots"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[var(--ps-primary,#0A84FF)] hover:brightness-110 text-white font-bold text-xs shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create User Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setEditingUser(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-[28px] p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Edit User Profile: @{editingUser.username}</h3>
                  <p className="text-xs text-gray-400">Update bio, avatar, and payment handles</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="py-6 space-y-5">
              {/* Profile Avatar Upload */}
              <div>
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-2">
                  Profile Picture / Avatar
                </label>
                <div className="flex items-center gap-4">
                  <img
                    src={formatMediaUrl(editingUser.avatar || '')}
                    alt="Preview"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20 shrink-0"
                  />
                  <div className="flex-1 space-y-2">
                    <button
                      type="button"
                      onClick={() => editAvatarFileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Change Avatar Image</span>
                    </button>
                    <input
                      type="file"
                      ref={editAvatarFileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleAvatarFile(e.target.files[0], true);
                      }}
                    />
                    <input
                      type="text"
                      value={editingUser.avatar || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, avatar: e.target.value })}
                      placeholder="Or enter direct image URL..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-gray-300 focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                    />
                  </div>
                </div>
              </div>

              {/* Display Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editingUser.email || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                  />
                </div>
              </div>

              {/* Password Change (Optional) */}
              <div>
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                  Change Password (leave empty to keep unchanged)
                </label>
                <input
                  type="text"
                  placeholder="New password..."
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-xs font-mono text-white focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
                  Photographer Bio
                </label>
                <textarea
                  rows={2}
                  value={editingUser.bio || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, bio: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                />
              </div>

              {/* Tipping Handles */}
              <div className="p-4 rounded-2xl bg-white/3 border border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  <CreditCard className="w-4 h-4" />
                  <span>Venmo & PayPal Tipping Handles</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                      Venmo Username
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 font-mono">@</span>
                      <input
                        type="text"
                        placeholder="venmo-handle"
                        value={editingUser.venmoHandle || ''}
                        onChange={(e) => setEditingUser({ ...editingUser, venmoHandle: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-7 pr-2.5 text-xs font-mono text-white focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                      PayPal.me Handle
                    </label>
                    <input
                      type="text"
                      placeholder="paypal-handle"
                      value={editingUser.payPalHandle || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, payPalHandle: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs font-mono text-white focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                      Instagram
                    </label>
                    <input
                      type="text"
                      placeholder="@instagram"
                      value={editingUser.instagram || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, instagram: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[var(--ps-primary,#0A84FF)] hover:brightness-110 text-white font-bold text-xs shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
