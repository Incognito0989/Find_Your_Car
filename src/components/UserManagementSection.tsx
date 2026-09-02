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
  Clock,
  CheckCircle2,
  XCircle,
  UserX,
  Settings,
  ShieldAlert,
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
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'pending' | 'my_account'>('users');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create User Modal / Drawer State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form Fields for New User
  const [username, setUsername] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('shooter2026');
  const [role, setRole] = useState<'photographer' | 'admin'>('photographer');
  const [avatar, setAvatar] = useState<string>(
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
  );
  const [bio, setBio] = useState<string>('');
  const [instagram, setInstagram] = useState<string>('');
  const [venmoHandle, setVenmoHandle] = useState<string>('');
  const [payPalHandle, setPayPalHandle] = useState<string>('');
  const [cashAppHandle, setCashAppHandle] = useState<string>('');

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editPassword, setEditPassword] = useState<string>('');

  // Self-Service My Account State
  const [myUsername, setMyUsername] = useState<string>(currentUser?.username || '');
  const [myName, setMyName] = useState<string>(currentUser?.name || '');
  const [myEmail, setMyEmail] = useState<string>(currentUser?.email || '');
  const [myBio, setMyBio] = useState<string>(currentUser?.bio || '');
  const [myAvatar, setMyAvatar] = useState<string>(currentUser?.avatar || '');
  const [myInstagram, setMyInstagram] = useState<string>(currentUser?.instagram || '');
  const [myVenmo, setMyVenmo] = useState<string>(currentUser?.venmoHandle || '');
  const [myPayPal, setMyPayPal] = useState<string>(currentUser?.payPalHandle || '');
  const [myCashApp, setMyCashApp] = useState<string>(currentUser?.cashAppHandle || '');

  // Self Password Change State
  const [currentPassInput, setCurrentPassInput] = useState<string>('');
  const [newPassInput, setNewPassInput] = useState<string>('');
  const [confirmPassInput, setConfirmPassInput] = useState<string>('');
  const [isChangingPass, setIsChangingPass] = useState<boolean>(false);

  // Avatar Upload Refs
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const editAvatarFileInputRef = useRef<HTMLInputElement>(null);
  const myAvatarFileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (currentUser) {
      setMyUsername(currentUser.username || '');
      setMyName(currentUser.name || '');
      setMyEmail(currentUser.email || '');
      setMyBio(currentUser.bio || '');
      setMyAvatar(currentUser.avatar || '');
      setMyInstagram(currentUser.instagram || '');
      setMyVenmo(currentUser.venmoHandle || '');
      setMyPayPal(currentUser.payPalHandle || '');
      setMyCashApp(currentUser.cashAppHandle || '');
    }
  }, [currentUser]);

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

  const handleAvatarFile = (file: File, mode: 'create' | 'edit' | 'my') => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (mode === 'edit' && editingUser) {
        setEditingUser({ ...editingUser, avatar: dataUrl });
      } else if (mode === 'my') {
        setMyAvatar(dataUrl);
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
          cashAppHandle: cashAppHandle.trim(),
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
        setCashAppHandle('');
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
        cashAppHandle: editingUser.cashAppHandle,
        isActive: editingUser.isActive,
        status: editingUser.status,
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

  // Self-Service Profile Save
  const handleSaveMyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const base = getApiBaseUrl();
      const endpoint = base ? `${base}/api/user/profile` : `/api/user/profile`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          username: myUsername.trim(),
          name: myName.trim(),
          email: myEmail.trim(),
          bio: myBio.trim(),
          avatar: myAvatar,
          instagram: myInstagram.trim(),
          venmoHandle: myVenmo.trim(),
          payPalHandle: myPayPal.trim(),
          cashAppHandle: myCashApp.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.user) {
        setStatusMsg({ type: 'success', text: '✨ Your author profile settings have been updated!' });
        if (currentUser) {
          currentUser.name = data.user.name;
          currentUser.username = data.user.username;
          currentUser.avatar = data.user.avatar;
          currentUser.bio = data.user.bio;
          currentUser.venmoHandle = data.user.venmoHandle;
          currentUser.payPalHandle = data.user.payPalHandle;
          currentUser.cashAppHandle = data.user.cashAppHandle;
          currentUser.instagram = data.user.instagram;
        }
        if (onUserListChanged) onUserListChanged();
        fetchUsers();
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to update profile.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Network error updating profile.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Self-Service Password Change
  const handleChangeMyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassInput.trim() || !newPassInput.trim()) {
      setStatusMsg({ type: 'error', text: 'Please enter your current and new password.' });
      return;
    }
    if (newPassInput !== confirmPassInput) {
      setStatusMsg({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }
    if (newPassInput.length < 6) {
      setStatusMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }

    try {
      setIsChangingPass(true);
      const base = getApiBaseUrl();
      const endpoint = base ? `${base}/api/user/change-password` : `/api/user/change-password`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          currentPassword: currentPassInput.trim(),
          newPassword: newPassInput.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ type: 'success', text: '🔒 Password changed successfully!' });
        setCurrentPassInput('');
        setNewPassInput('');
        setConfirmPassInput('');
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to change password.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error updating password.' });
    } finally {
      setIsChangingPass(false);
    }
  };

  // Admin Approve / Reject Handlers
  const handleApproveUser = async (id: string, name: string) => {
    try {
      const base = getApiBaseUrl();
      const endpoint = base ? `${base}/api/users/${id}/approve` : `/api/users/${id}/approve`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;

      const res = await fetch(endpoint, { method: 'POST', headers });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ type: 'success', text: `✨ Approved photographer ${name}! They can now log in and upload.` });
        fetchUsers();
        if (onUserListChanged) onUserListChanged();
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to approve user.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleRejectUser = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to suspend or reject ${name}?`)) return;
    try {
      const base = getApiBaseUrl();
      const endpoint = base ? `${base}/api/users/${id}/reject` : `/api/users/${id}/reject`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;

      const res = await fetch(endpoint, { method: 'POST', headers });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ type: 'success', text: `Suspended user ${name}.` });
        fetchUsers();
        if (onUserListChanged) onUserListChanged();
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to reject user.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${name}"?`)) return;

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

  const pendingUsers = users.filter((u) => u.status === 'pending' || u.isActive === false);
  const activePhotographers = users.filter((u) => u.status === 'active' && u.isActive !== false);

  const filteredUsers = users.filter((u) => {
    if (activeSubTab === 'pending') {
      if (u.status !== 'pending' && u.isActive !== false) return false;
    }
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
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 border-b border-[var(--ps-card-border,#2C2C2E)] pb-4">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0">
          <button
            onClick={() => setActiveSubTab('users')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 shrink-0 ${
              activeSubTab === 'users'
                ? 'bg-[var(--ps-primary,#0A84FF)] text-white shadow-md'
                : 'bg-[var(--ps-badge-bg,#141416)] text-[var(--ps-text-muted,#9ca3af)] hover:text-[var(--ps-text-main,#ffffff)] border border-[var(--ps-card-border,#2C2C2E)]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>All Authors ({users.length})</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveSubTab('pending')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 relative shrink-0 ${
                activeSubTab === 'pending'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'bg-[var(--ps-badge-bg,#141416)] text-[var(--ps-text-muted,#9ca3af)] hover:text-[var(--ps-text-main,#ffffff)] border border-[var(--ps-card-border,#2C2C2E)]'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Pending</span>
              {pendingUsers.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black animate-pulse">
                  {pendingUsers.length}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setActiveSubTab('my_account')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 shrink-0 ${
              activeSubTab === 'my_account'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-[var(--ps-badge-bg,#141416)] text-[var(--ps-text-muted,#9ca3af)] hover:text-[var(--ps-text-main,#ffffff)] border border-[var(--ps-card-border,#2C2C2E)]'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>My Profile</span>
          </button>
        </div>

        {isAdmin && activeSubTab !== 'my_account' && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-[var(--ps-primary,#0A84FF)] hover:brightness-110 text-white font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Author</span>
          </button>
        )}
      </div>

      {/* Alert Status Feedback */}
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-semibold animate-in slide-in-from-top-2 duration-200 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-300'
              : 'bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="p-1 hover:opacity-70 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB: MY PROFILE & SETTINGS (Self-Service Profile + Password Change)   */}
      {/* ========================================================================= */}
      {activeSubTab === 'my_account' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 animate-in fade-in duration-200">
          {/* Left Column: Profile Card Preview */}
          <div className="space-y-6">
            <div className="bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-3xl p-5 sm:p-6 shadow-xl text-center space-y-4">
              <div className="relative inline-block mx-auto">
                <img
                  src={formatMediaUrl(myAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200')}
                  alt="My Profile"
                  className="w-24 h-24 rounded-3xl object-cover border-4 border-[var(--ps-card-border,#2C2C2E)] shadow-2xl mx-auto"
                />
                <button
                  type="button"
                  onClick={() => myAvatarFileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 rounded-xl bg-[var(--ps-primary,#0A84FF)] hover:brightness-110 text-white shadow-lg cursor-pointer"
                  title="Upload New Avatar"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input
                  type="file"
                  ref={myAvatarFileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleAvatarFile(e.target.files[0], 'my');
                  }}
                />
              </div>

              <div>
                <h3 className="text-xl font-black text-[var(--ps-text-main,#ffffff)]">{myName || 'Photographer'}</h3>
                <p className="text-xs font-mono text-[var(--ps-primary,#0A84FF)]">@{myUsername || 'handle'}</p>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold mt-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Active Contributor</span>
                </span>
              </div>

              <p className="text-xs text-[var(--ps-text-muted,#9ca3af)] leading-relaxed bg-[var(--ps-badge-bg,#141416)] p-3 rounded-2xl border border-[var(--ps-card-border,#2C2C2E)] text-left font-medium">
                {myBio || 'No bio entered yet. Describe your automotive photography style and gear.'}
              </p>

              <div className="pt-2 border-t border-[var(--ps-card-border,#2C2C2E)] text-xs text-left space-y-2 font-mono">
                {myVenmo && (
                  <div className="flex items-center gap-2 text-[var(--ps-text-muted,#9ca3af)]">
                    <Smartphone className="w-4 h-4 text-[#008CFF]" />
                    <span>Venmo: @{myVenmo.replace(/^@/, '')}</span>
                  </div>
                )}
                {myPayPal && (
                  <div className="flex items-center gap-2 text-[var(--ps-text-muted,#9ca3af)]">
                    <CreditCard className="w-4 h-4 text-[#0070BA]" />
                    <span>PayPal: {myPayPal.replace(/^@/, '')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Edit Forms */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            {/* General Profile Settings */}
            <div className="bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-3xl p-5 sm:p-8 shadow-xl space-y-6">
              <div className="flex items-center gap-2.5 pb-4 border-b border-[var(--ps-card-border,#2C2C2E)]">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--ps-text-main,#ffffff)]">Author Profile & Tipping Info</h3>
                  <p className="text-xs text-[var(--ps-text-muted,#9ca3af)]">Update your username, bio, and tip payment routes</p>
                </div>
              </div>

              <form onSubmit={handleSaveMyProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-[var(--ps-text-muted,#9ca3af)] uppercase tracking-wider block mb-1.5">
                      Username (@handle)
                    </label>
                    <input
                      type="text"
                      required
                      value={myUsername}
                      onChange={(e) => setMyUsername(e.target.value)}
                      className="w-full bg-[var(--ps-badge-bg,#141416)] border border-[var(--ps-card-border,#2C2C2E)] rounded-xl py-2.5 px-3 text-xs font-mono text-[var(--ps-text-main,#ffffff)] focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[var(--ps-text-muted,#9ca3af)] uppercase tracking-wider block mb-1.5">
                      Display Name
                    </label>
                    <input
                      type="text"
                      required
                      value={myName}
                      onChange={(e) => setMyName(e.target.value)}
                      className="w-full bg-[var(--ps-badge-bg,#141416)] border border-[var(--ps-card-border,#2C2C2E)] rounded-xl py-2.5 px-3 text-xs text-[var(--ps-text-main,#ffffff)] focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-[var(--ps-text-muted,#9ca3af)] uppercase tracking-wider block mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={myEmail}
                      onChange={(e) => setMyEmail(e.target.value)}
                      className="w-full bg-[var(--ps-badge-bg,#141416)] border border-[var(--ps-card-border,#2C2C2E)] rounded-xl py-2.5 px-3 text-xs text-[var(--ps-text-main,#ffffff)] focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[var(--ps-text-muted,#9ca3af)] uppercase tracking-wider block mb-1.5">
                      Instagram Handle
                    </label>
                    <input
                      type="text"
                      placeholder="@photographer.raw"
                      value={myInstagram}
                      onChange={(e) => setMyInstagram(e.target.value)}
                      className="w-full bg-[var(--ps-badge-bg,#141416)] border border-[var(--ps-card-border,#2C2C2E)] rounded-xl py-2.5 px-3 text-xs text-[var(--ps-text-main,#ffffff)] focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--ps-text-muted,#9ca3af)] uppercase tracking-wider block mb-1.5">
                    Photographer Bio
                  </label>
                  <textarea
                    rows={3}
                    value={myBio}
                    onChange={(e) => setMyBio(e.target.value)}
                    placeholder="Tell car enthusiasts about your automotive photography..."
                    className="w-full bg-[var(--ps-badge-bg,#141416)] border border-[var(--ps-card-border,#2C2C2E)] rounded-xl p-3 text-xs text-[var(--ps-text-main,#ffffff)] focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                  />
                </div>

                {/* Direct Payment Routing */}
                <div className="p-4 rounded-2xl bg-[var(--ps-badge-bg,#141416)] border border-[var(--ps-card-border,#2C2C2E)] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    <CreditCard className="w-4 h-4" />
                    <span>Direct Tip Button Payment Handles</span>
                  </div>
                  <p className="text-[11px] text-[var(--ps-text-muted,#9ca3af)]">
                    When car owners click the Tip button on your photos, they will be redirected to these payment usernames.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                    <div>
                      <label className="text-[11px] font-semibold text-[var(--ps-text-muted,#9ca3af)] block mb-1">
                        Venmo Username
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ps-text-muted,#9ca3af)] font-mono">@</span>
                        <input
                          type="text"
                          placeholder="your-venmo-id"
                          value={myVenmo}
                          onChange={(e) => setMyVenmo(e.target.value)}
                          className="w-full bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-xl py-2 pl-7 pr-3 text-xs font-mono text-[var(--ps-text-main,#ffffff)] focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[var(--ps-text-muted,#9ca3af)] block mb-1">
                        PayPal.me Handle
                      </label>
                      <input
                        type="text"
                        placeholder="yourpaypalusername"
                        value={myPayPal}
                        onChange={(e) => setMyPayPal(e.target.value)}
                        className="w-full bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-xl py-2 px-3 text-xs font-mono text-[var(--ps-text-main,#ffffff)] focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[var(--ps-text-muted,#9ca3af)] block mb-1">
                        Cash App $cashtag
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ps-text-muted,#9ca3af)] font-mono">$</span>
                        <input
                          type="text"
                          placeholder="yourcashtag"
                          value={myCashApp}
                          onChange={(e) => setMyCashApp(e.target.value)}
                          className="w-full bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-xl py-2 pl-7 pr-3 text-xs font-mono text-[var(--ps-text-main,#ffffff)] focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-[var(--ps-primary,#0A84FF)] hover:brightness-110 text-white font-bold text-xs shadow-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Profile Settings'}
                  </button>
                </div>
              </form>
            </div>

            {/* Change Password Card */}
            <div className="bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-3xl p-5 sm:p-8 shadow-xl space-y-6">
              <div className="flex items-center gap-2.5 pb-4 border-b border-[var(--ps-card-border,#2C2C2E)]">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--ps-text-main,#ffffff)]">Security & Password</h3>
                  <p className="text-xs text-[var(--ps-text-muted,#9ca3af)]">Change your login password securely</p>
                </div>
              </div>

              <form onSubmit={handleChangeMyPassword} className="space-y-4 max-w-lg">
                <div>
                  <label className="text-xs font-bold text-[var(--ps-text-muted,#9ca3af)] uppercase tracking-wider block mb-1.5">
                    Current Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassInput}
                    onChange={(e) => setCurrentPassInput(e.target.value)}
                    placeholder="Enter existing password..."
                    className="w-full bg-[var(--ps-badge-bg,#141416)] border border-[var(--ps-card-border,#2C2C2E)] rounded-xl py-2.5 px-3 text-xs font-mono text-[var(--ps-text-main,#ffffff)] focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-[var(--ps-text-muted,#9ca3af)] uppercase tracking-wider block mb-1.5">
                      New Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassInput}
                      onChange={(e) => setNewPassInput(e.target.value)}
                      placeholder="At least 6 chars..."
                      className="w-full bg-[var(--ps-badge-bg,#141416)] border border-[var(--ps-card-border,#2C2C2E)] rounded-xl py-2.5 px-3 text-xs font-mono text-[var(--ps-text-main,#ffffff)] focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[var(--ps-text-muted,#9ca3af)] uppercase tracking-wider block mb-1.5">
                      Confirm New Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassInput}
                      onChange={(e) => setConfirmPassInput(e.target.value)}
                      placeholder="Repeat new password..."
                      className="w-full bg-[var(--ps-badge-bg,#141416)] border border-[var(--ps-card-border,#2C2C2E)] rounded-xl py-2.5 px-3 text-xs font-mono text-[var(--ps-text-main,#ffffff)] focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isChangingPass}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:brightness-110 text-black font-bold text-xs shadow-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isChangingPass ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB: USERS LIST & PENDING APPROVAL QUEUE                                */}
      {/* ========================================================================= */}
      {activeSubTab !== 'my_account' && (
        <div className="space-y-6">
          {/* Top Banner & Control Bar */}
          <div className="bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-3xl p-5 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[var(--ps-primary,#0A84FF)]/20 text-[var(--ps-primary,#0A84FF)] border border-[var(--ps-primary,#0A84FF)]/30">
                  <Users className="w-5 h-5" />
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-[var(--ps-text-main,#ffffff)] tracking-tight">
                  {activeSubTab === 'pending' ? 'Photographer Application Queue' : 'Studio Photographers & Authors'}
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[var(--ps-text-muted,#9ca3af)] max-w-xl">
                {activeSubTab === 'pending'
                  ? 'Review new photographer registrations. Approved photographers gain immediate access to upload high-resolution car galleries.'
                  : 'Manage local photographer profiles, customize usernames and passwords, and review direct Venmo/PayPal routing.'}
              </p>
            </div>

            {isAdmin && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-[var(--ps-primary,#0A84FF)] hover:brightness-110 text-white font-bold text-xs sm:text-sm shadow-xl active:scale-95 transition-all cursor-pointer shrink-0 w-full sm:w-auto justify-center"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create New User</span>
              </button>
            )}
          </div>

          {/* Search & Stats Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ps-text-muted,#9ca3af)]" />
              <input
                type="text"
                placeholder="Search by name, @username, or handles..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-[var(--ps-badge-bg,#141416)] border border-[var(--ps-card-border,#2C2C2E)] rounded-xl py-2.5 pl-10 pr-4 text-xs text-[var(--ps-text-main,#ffffff)] placeholder:text-[var(--ps-text-muted,#9ca3af)] focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
              />
            </div>

            <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono text-[var(--ps-text-muted,#9ca3af)] overflow-x-auto pb-1 sm:pb-0">
              <span className="bg-[var(--ps-badge-bg,#141416)] px-3 py-1.5 rounded-xl border border-[var(--ps-card-border,#2C2C2E)] shrink-0">
                Total: <strong className="text-[var(--ps-text-main,#ffffff)]">{users.length}</strong>
              </span>
              <span className="bg-[var(--ps-badge-bg,#141416)] px-3 py-1.5 rounded-xl border border-[var(--ps-card-border,#2C2C2E)] shrink-0">
                Pending: <strong className="text-amber-500 dark:text-amber-400">{pendingUsers.length}</strong>
              </span>
              <span className="bg-[var(--ps-badge-bg,#141416)] px-3 py-1.5 rounded-xl border border-[var(--ps-card-border,#2C2C2E)] shrink-0">
                Active: <strong className="text-emerald-600 dark:text-emerald-400">{activePhotographers.length}</strong>
              </span>
            </div>
          </div>

          {/* Empty State */}
          {filteredUsers.length === 0 && (
            <div className="text-center py-16 bg-[var(--ps-card-bg,#111111)] rounded-3xl border border-[var(--ps-card-border,#2C2C2E)]">
              <UserCheck className="w-12 h-12 text-[var(--ps-text-muted,#9ca3af)] mx-auto mb-3 opacity-50" />
              <p className="text-sm font-bold text-[var(--ps-text-main,#ffffff)]">
                {activeSubTab === 'pending' ? 'No pending applications!' : 'No matching photographers found.'}
              </p>
              <p className="text-xs text-[var(--ps-text-muted,#9ca3af)] mt-1">
                {activeSubTab === 'pending'
                  ? 'All applicants have been reviewed and approved.'
                  : 'Try adjusting your search criteria.'}
              </p>
            </div>
          )}

          {/* Users Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((u) => {
              const isPending = u.status === 'pending' || u.isActive === false;
              return (
                <div
                  key={u.id}
                  className={`bg-[var(--ps-card-bg,#111111)] border rounded-3xl p-5 sm:p-6 shadow-lg transition-all duration-200 flex flex-col justify-between space-y-5 ${
                    isPending
                      ? 'border-amber-500/40 bg-amber-500/5'
                      : 'border-[var(--ps-card-border,#2C2C2E)] hover:border-[var(--ps-primary,#0A84FF)]/40'
                  }`}
                >
                  {/* User Header */}
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={formatMediaUrl(
                              u.avatar ||
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
                            )}
                            alt={u.name}
                            className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl object-cover border-2 border-[var(--ps-card-border,#2C2C2E)] shadow-md"
                          />
                          <span
                            className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[var(--ps-card-bg,#111111)] ${
                              isPending ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            title={isPending ? 'Pending Approval' : 'Active'}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-[var(--ps-text-main,#ffffff)] text-base truncate">{u.name}</h3>
                          </div>
                          <p className="text-xs font-mono text-[var(--ps-primary,#0A84FF)]">@{u.username}</p>
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                u.role === 'admin'
                                  ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30'
                                  : 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30'
                              }`}
                            >
                              {u.role === 'admin' ? <Shield className="w-2.5 h-2.5" /> : <Camera className="w-2.5 h-2.5" />}
                              {u.role === 'admin' ? 'Studio Admin' : 'Photographer'}
                            </span>

                            {isPending && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                                <Clock className="w-2.5 h-2.5" />
                                <span>Pending Approval</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingUser(u);
                            setEditPassword('');
                          }}
                          className="p-2 rounded-xl bg-[var(--ps-badge-bg,#141416)] hover:brightness-110 text-[var(--ps-text-muted,#9ca3af)] hover:text-[var(--ps-text-main,#ffffff)] border border-[var(--ps-card-border,#2C2C2E)] transition-colors cursor-pointer"
                          title="Edit User Profile"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {isAdmin && u.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-600 transition-colors cursor-pointer"
                            title="Delete User Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Bio */}
                    <p className="text-xs text-[var(--ps-text-muted,#9ca3af)] leading-relaxed line-clamp-3 bg-[var(--ps-badge-bg,#141416)] p-3 rounded-2xl border border-[var(--ps-card-border,#2C2C2E)]">
                      {u.bio || 'No bio provided for this photographer.'}
                    </p>

                    {/* Handles & Socials */}
                    <div className="space-y-1.5 pt-1 text-xs">
                      {u.email && (
                        <div className="flex items-center gap-2 text-[var(--ps-text-muted,#9ca3af)]">
                          <Mail className="w-3.5 h-3.5 text-[var(--ps-text-muted,#9ca3af)] shrink-0" />
                          <span className="truncate">{u.email}</span>
                        </div>
                      )}
                      {u.instagram && (
                        <div className="flex items-center gap-2 text-[var(--ps-text-muted,#9ca3af)]">
                          <Instagram className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                          <span className="truncate">{u.instagram}</span>
                        </div>
                      )}
                      {u.venmoHandle && (
                        <div className="flex items-center gap-2 text-[var(--ps-text-muted,#9ca3af)] font-mono">
                          <Smartphone className="w-3.5 h-3.5 text-[#008CFF] shrink-0" />
                          <span>Venmo: @{u.venmoHandle.replace(/^@/, '')}</span>
                        </div>
                      )}
                      {u.payPalHandle && (
                        <div className="flex items-center gap-2 text-[var(--ps-text-muted,#9ca3af)] font-mono">
                          <CreditCard className="w-3.5 h-3.5 text-[#0070BA] shrink-0" />
                          <span>PayPal: {u.payPalHandle.replace(/^@/, '')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action / Status Bar */}
                  <div className="pt-3 border-t border-[var(--ps-card-border,#2C2C2E)] flex items-center justify-between gap-2">
                    {isPending && isAdmin ? (
                      <div className="flex items-center gap-2 w-full">
                        <button
                          onClick={() => handleApproveUser(u.id, u.name)}
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve Access</span>
                        </button>
                        <button
                          onClick={() => handleRejectUser(u.id, u.name)}
                          className="py-2 px-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-500 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-[11px] text-[var(--ps-text-muted,#9ca3af)]">Joined {new Date(u.createdAt).toLocaleDateString()}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                          <Check className="w-3 h-3" /> Tip Ready
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-[24px] sm:rounded-[28px] p-5 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[var(--ps-card-border,#2C2C2E)]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[var(--ps-primary,#0A84FF)]/20 text-[var(--ps-primary,#0A84FF)] border border-[var(--ps-primary,#0A84FF)]/30 flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--ps-text-main,#ffffff)]">Create Photographer / User</h3>
                  <p className="text-xs text-[var(--ps-text-muted,#9ca3af)]">Admin restricted user creation</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 rounded-full hover:bg-[var(--ps-badge-bg,#141416)] text-[var(--ps-text-muted,#9ca3af)] hover:text-[var(--ps-text-main,#ffffff)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="py-5 space-y-4 sm:space-y-5">
              {/* Profile Avatar Upload */}
              <div>
                <label className="text-xs font-bold text-[var(--ps-text-muted,#9ca3af)] uppercase tracking-wider block mb-2">
                  Profile Picture / Avatar
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <img
                    src={avatar}
                    alt="Preview"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-[var(--ps-card-border,#2C2C2E)] shrink-0 self-start"
                  />
                  <div className="flex-1 space-y-2">
                    <button
                      type="button"
                      onClick={() => avatarFileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-[var(--ps-badge-bg,#141416)] hover:brightness-110 text-[var(--ps-text-main,#ffffff)] border border-[var(--ps-card-border,#2C2C2E)] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
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
                        if (e.target.files?.[0]) handleAvatarFile(e.target.files[0], 'create');
                      }}
                    />
                    <input
                      type="text"
                      value={avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                      placeholder="Or enter direct image URL..."
                      className="w-full bg-[var(--ps-badge-bg,#141416)] border border-[var(--ps-card-border,#2C2C2E)] rounded-xl py-2 px-3 text-xs text-[var(--ps-text-main,#ffffff)] focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                    />
                  </div>
                </div>
              </div>

              {/* Name & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[var(--ps-text-muted,#9ca3af)] uppercase tracking-wider block mb-1.5">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jordan Miller"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[var(--ps-badge-bg,#141416)] border border-[var(--ps-card-border,#2C2C2E)] rounded-xl py-2.5 px-3 text-xs text-[var(--ps-text-main,#ffffff)] focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--ps-text-muted,#9ca3af)] uppercase tracking-wider block mb-1.5">
                    Username (@handle) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. jordan_apex"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[var(--ps-badge-bg,#141416)] border border-[var(--ps-card-border,#2C2C2E)] rounded-xl py-2.5 px-3 text-xs font-mono text-[var(--ps-text-main,#ffffff)] focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                  />
                </div>
              </div>

              {/* Email & Initial Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[var(--ps-text-muted,#9ca3af)] uppercase tracking-wider block mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="jordan@platesnap.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[var(--ps-badge-bg,#141416)] border border-[var(--ps-card-border,#2C2C2E)] rounded-xl py-2.5 px-3 text-xs text-[var(--ps-text-main,#ffffff)] focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--ps-text-muted,#9ca3af)] uppercase tracking-wider block mb-1.5">
                    Initial Password *
                  </label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[var(--ps-badge-bg,#141416)] border border-[var(--ps-card-border,#2C2C2E)] rounded-xl py-2.5 px-3 text-xs font-mono text-[var(--ps-text-main,#ffffff)] focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                  />
                </div>
              </div>

              {/* Role Selector */}
              <div>
                <label className="text-xs font-bold text-[var(--ps-text-muted,#9ca3af)] uppercase tracking-wider block mb-1.5">
                  Account Role
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('photographer')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      role === 'photographer'
                        ? 'border-[var(--ps-primary,#0A84FF)] bg-[var(--ps-primary,#0A84FF)]/15 text-[var(--ps-text-main,#ffffff)] font-bold'
                        : 'border-[var(--ps-card-border,#2C2C2E)] bg-[var(--ps-badge-bg,#141416)] text-[var(--ps-text-muted,#9ca3af)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-blue-500" />
                      <span className="text-xs">Automotive Photographer</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      role === 'admin'
                        ? 'border-purple-500 bg-purple-500/15 text-purple-700 dark:text-purple-200 font-bold'
                        : 'border-[var(--ps-card-border,#2C2C2E)] bg-[var(--ps-badge-bg,#141416)] text-[var(--ps-text-muted,#9ca3af)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-purple-500" />
                      <span className="text-xs">Studio Admin</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="text-xs font-bold text-[var(--ps-text-muted,#9ca3af)] uppercase tracking-wider block mb-1.5">
                  Photographer Bio
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Rolling shot specialist & trackday automotive media creator based in SoCal."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-[var(--ps-badge-bg,#141416)] border border-[var(--ps-card-border,#2C2C2E)] rounded-xl p-3 text-xs text-[var(--ps-text-main,#ffffff)] focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                />
              </div>

              {/* Tipping & Payment Handles (Venmo, PayPal, Instagram) */}
              <div className="p-4 rounded-2xl bg-[var(--ps-badge-bg,#141416)] border border-[var(--ps-card-border,#2C2C2E)] space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  <CreditCard className="w-4 h-4" />
                  <span>Direct Tipping & Social Handles</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--ps-text-muted,#9ca3af)] block mb-1">
                      Venmo Username
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ps-text-muted,#9ca3af)] font-mono">@</span>
                      <input
                        type="text"
                        placeholder="jordan-miller-photo"
                        value={venmoHandle}
                        onChange={(e) => setVenmoHandle(e.target.value)}
                        className="w-full bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-xl py-2 pl-7 pr-2.5 text-xs font-mono text-[var(--ps-text-main,#ffffff)] focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[var(--ps-text-muted,#9ca3af)] block mb-1">
                      PayPal.me Handle
                    </label>
                    <input
                      type="text"
                      placeholder="jordanmillerphoto"
                      value={payPalHandle}
                      onChange={(e) => setPayPalHandle(e.target.value)}
                      className="w-full bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-xl py-2 px-3 text-xs font-mono text-[var(--ps-text-main,#ffffff)] focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[var(--ps-text-muted,#9ca3af)] block mb-1">
                      Cash App $cashtag
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ps-text-muted,#9ca3af)] font-mono">$</span>
                      <input
                        type="text"
                        placeholder="jordanphoto"
                        value={cashAppHandle}
                        onChange={(e) => setCashAppHandle(e.target.value)}
                        className="w-full bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-xl py-2 pl-7 pr-2.5 text-xs font-mono text-[var(--ps-text-main,#ffffff)] focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[var(--ps-text-muted,#9ca3af)] block mb-1">
                      Instagram Handle
                    </label>
                    <input
                      type="text"
                      placeholder="@jordan_shoots"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      className="w-full bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-xl py-2 px-3 text-xs text-[var(--ps-text-main,#ffffff)] focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[var(--ps-card-border,#2C2C2E)] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-[var(--ps-badge-bg,#141416)] hover:brightness-110 text-[var(--ps-text-muted,#9ca3af)] hover:text-[var(--ps-text-main,#ffffff)] border border-[var(--ps-card-border,#2C2C2E)] text-xs font-semibold cursor-pointer"
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
          className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setEditingUser(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-[24px] sm:rounded-[28px] p-5 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[var(--ps-card-border,#2C2C2E)]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--ps-text-main,#ffffff)]">Edit User Profile: @{editingUser.username}</h3>
                  <p className="text-xs text-[var(--ps-text-muted,#9ca3af)]">Update bio, avatar, and payment handles</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-2 rounded-full hover:bg-[var(--ps-badge-bg,#141416)] text-[var(--ps-text-muted,#9ca3af)] hover:text-[var(--ps-text-main,#ffffff)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="py-5 space-y-4 sm:space-y-5">
              {/* Profile Avatar Upload */}
              <div>
                <label className="text-xs font-bold text-[var(--ps-text-muted,#9ca3af)] uppercase tracking-wider block mb-2">
                  Profile Picture / Avatar
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <img
                    src={formatMediaUrl(editingUser.avatar || '')}
                    alt="Preview"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-[var(--ps-card-border,#2C2C2E)] shrink-0 self-start"
                  />
                  <div className="flex-1 space-y-2">
                    <button
                      type="button"
                      onClick={() => editAvatarFileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-[var(--ps-badge-bg,#141416)] hover:brightness-110 text-[var(--ps-text-main,#ffffff)] border border-[var(--ps-card-border,#2C2C2E)] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
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
                        if (e.target.files?.[0]) handleAvatarFile(e.target.files[0], 'edit');
                      }}
                    />
                    <input
                      type="text"
                      value={editingUser.avatar || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, avatar: e.target.value })}
                      placeholder="Or enter direct image URL..."
                      className="w-full bg-[var(--ps-badge-bg,#141416)] border border-[var(--ps-card-border,#2C2C2E)] rounded-xl py-2 px-3 text-xs text-[var(--ps-text-main,#ffffff)] focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                    />
                  </div>
                </div>
              </div>

              {/* Display Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[var(--ps-text-muted,#9ca3af)] uppercase tracking-wider block mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full bg-[var(--ps-badge-bg,#141416)] border border-[var(--ps-card-border,#2C2C2E)] rounded-xl py-2.5 px-3 text-xs text-[var(--ps-text-main,#ffffff)] focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--ps-text-muted,#9ca3af)] uppercase tracking-wider block mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editingUser.email || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full bg-[var(--ps-badge-bg,#141416)] border border-[var(--ps-card-border,#2C2C2E)] rounded-xl py-2.5 px-3 text-xs text-[var(--ps-text-main,#ffffff)] focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                  />
                </div>
              </div>

              {/* Password Change (Optional) */}
              <div>
                <label className="text-xs font-bold text-[var(--ps-text-muted,#9ca3af)] uppercase tracking-wider block mb-1.5">
                  Change Password (leave empty to keep unchanged)
                </label>
                <input
                  type="text"
                  placeholder="New password..."
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full bg-[var(--ps-badge-bg,#141416)] border border-[var(--ps-card-border,#2C2C2E)] rounded-xl py-2.5 px-3 text-xs font-mono text-[var(--ps-text-main,#ffffff)] focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                />
              </div>

              {/* Status / Active Toggle (Admin Only) */}
              {isAdmin && (
                <div>
                  <label className="text-xs font-bold text-[var(--ps-text-muted,#9ca3af)] uppercase tracking-wider block mb-1.5">
                    Account Status
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingUser({ ...editingUser, status: 'active', isActive: true })}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                        editingUser.status === 'active' || (editingUser.isActive && editingUser.status !== 'suspended')
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                          : 'border-[var(--ps-card-border,#2C2C2E)] bg-[var(--ps-badge-bg,#141416)] text-[var(--ps-text-muted,#9ca3af)]'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Active</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingUser({ ...editingUser, status: 'pending', isActive: false })}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                        editingUser.status === 'pending'
                          ? 'border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-300'
                          : 'border-[var(--ps-card-border,#2C2C2E)] bg-[var(--ps-badge-bg,#141416)] text-[var(--ps-text-muted,#9ca3af)]'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Pending</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingUser({ ...editingUser, status: 'suspended', isActive: false })}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                        editingUser.status === 'suspended'
                          ? 'border-red-500 bg-red-500/20 text-red-500'
                          : 'border-[var(--ps-card-border,#2C2C2E)] bg-[var(--ps-badge-bg,#141416)] text-[var(--ps-text-muted,#9ca3af)]'
                      }`}
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>Suspended</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Bio */}
              <div>
                <label className="text-xs font-bold text-[var(--ps-text-muted,#9ca3af)] uppercase tracking-wider block mb-1.5">
                  Photographer Bio
                </label>
                <textarea
                  rows={2}
                  value={editingUser.bio || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, bio: e.target.value })}
                  className="w-full bg-[var(--ps-badge-bg,#141416)] border border-[var(--ps-card-border,#2C2C2E)] rounded-xl p-3 text-xs text-[var(--ps-text-main,#ffffff)] focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                />
              </div>

              {/* Tipping Handles */}
              <div className="p-4 rounded-2xl bg-[var(--ps-badge-bg,#141416)] border border-[var(--ps-card-border,#2C2C2E)] space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  <CreditCard className="w-4 h-4" />
                  <span>Venmo & PayPal Tipping Handles</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--ps-text-muted,#9ca3af)] block mb-1">
                      Venmo Username
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ps-text-muted,#9ca3af)] font-mono">@</span>
                      <input
                        type="text"
                        placeholder="venmo-handle"
                        value={editingUser.venmoHandle || ''}
                        onChange={(e) => setEditingUser({ ...editingUser, venmoHandle: e.target.value })}
                        className="w-full bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-xl py-2 pl-7 pr-2.5 text-xs font-mono text-[var(--ps-text-main,#ffffff)] focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[var(--ps-text-muted,#9ca3af)] block mb-1">
                      PayPal.me Handle
                    </label>
                    <input
                      type="text"
                      placeholder="paypal-handle"
                      value={editingUser.payPalHandle || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, payPalHandle: e.target.value })}
                      className="w-full bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-xl py-2 px-3 text-xs font-mono text-[var(--ps-text-main,#ffffff)] focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[var(--ps-text-muted,#9ca3af)] block mb-1">
                      Cash App $cashtag
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ps-text-muted,#9ca3af)] font-mono">$</span>
                      <input
                        type="text"
                        placeholder="cashapp-handle"
                        value={editingUser.cashAppHandle || ''}
                        onChange={(e) => setEditingUser({ ...editingUser, cashAppHandle: e.target.value })}
                        className="w-full bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-xl py-2 pl-7 pr-2.5 text-xs font-mono text-[var(--ps-text-main,#ffffff)] focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[var(--ps-text-muted,#9ca3af)] block mb-1">
                      Instagram
                    </label>
                    <input
                      type="text"
                      placeholder="@instagram"
                      value={editingUser.instagram || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, instagram: e.target.value })}
                      className="w-full bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-xl py-2 px-3 text-xs text-[var(--ps-text-main,#ffffff)] focus:outline-none focus:border-[var(--ps-primary,#0A84FF)]"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[var(--ps-card-border,#2C2C2E)] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-5 py-2.5 rounded-xl bg-[var(--ps-badge-bg,#141416)] hover:brightness-110 text-[var(--ps-text-muted,#9ca3af)] hover:text-[var(--ps-text-main,#ffffff)] border border-[var(--ps-card-border,#2C2C2E)] text-xs font-semibold cursor-pointer"
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

