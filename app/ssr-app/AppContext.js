'use client';

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const AppContext = createContext(null);

export const MOCK_USERS = {};
export const MOCK_POSTS = [];
export const MOCK_CHATS = [];
export const MOCK_MESSAGES = {};
export const MOCK_SERVERS = [];
export const MOCK_COURSES = [];
export const MOCK_MEETINGS = [];

const safeArray = (value) => Array.isArray(value) ? value : [];

const readStoredAppUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem('ssr_app_user') || sessionStorage.getItem('ssr_app_user') || 'null');
  } catch {
    return null;
  }
};

const persistAppUser = (user) => {
  if (typeof window === 'undefined') return;
  const { password, ...safeUser } = user || {};
  const value = JSON.stringify(safeUser);
  localStorage.setItem('ssr_app_user', value);
  sessionStorage.setItem('ssr_app_user', value);
};

const clearStoredAppUser = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('ssr_app_user');
  sessionStorage.removeItem('ssr_app_user');
};

const getInitials = (name = '') => {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return initials || 'U';
};

const getColor = (value = '') => {
  const palette = ['#0A6ED1', '#16A34A', '#D97706', '#7C3AED', '#DC2626', '#475569'];
  const sum = [...String(value || 'user')].reduce((total, char) => total + char.charCodeAt(0), 0);
  return palette[sum % palette.length];
};

const normalizeUser = (user = {}) => ({
  ...user,
  initials: user.initials || getInitials(user.name),
  color: user.color || getColor(user.email || user.name),
  avatar: user.avatar || user.profilePic || null,
  profession: safeArray(user.profession),
  permissions: safeArray(user.permissions),
  restricted: Boolean(user.restricted),
});

const normalizeUsersMap = (usersMap = {}) => Object.fromEntries(
  Object.entries(usersMap).map(([id, user]) => [id, normalizeUser(user)])
);

const normalizePost = (post = {}) => {
  const content = post.content || '';
  const titleMatch = content.match(/^\*\*(.+?)\*\*/);
  const title = post.title || titleMatch?.[1] || 'Update';

  return {
    ...post,
    title,
    tag: post.tag || (post.category ? post.category.replace(/s$/, '') : 'Update'),
    authorInitials: post.authorInitials || getInitials(post.authorName),
    authorColor: post.authorColor || getColor(post.authorId || post.authorName),
    content: titleMatch && !post.title ? content.replace(/^\*\*.+?\*\*\n?/, '').trim() : content,
    likes: post.likes || 0,
    comments: post.comments || safeArray(post.commentsList).length,
    commentsList: safeArray(post.commentsList),
    likedBy: safeArray(post.likedBy),
    savedBy: safeArray(post.savedBy),
  };
};

const normalizeChat = (chat = {}) => ({
  ...chat,
  participants: safeArray(chat.participants),
  admins: safeArray(chat.admins),
  mutedBy: safeArray(chat.mutedBy),
  pinnedBy: safeArray(chat.pinnedBy),
  deletedFor: safeArray(chat.deletedFor),
  unreadBy: chat.unreadBy && typeof chat.unreadBy === 'object' ? chat.unreadBy : {},
  privateChatEnabled: chat.privateChatEnabled !== false,
  initials: chat.initials || getInitials(chat.name || (chat.type === 'support' ? 'Support' : 'Chat')),
  color: chat.color || getColor(chat.id || chat.name),
  unread: chat.unread || 0,
  members: chat.members || safeArray(chat.participants).length,
  lastMessage: chat.lastMessage || chat.sub || 'No messages yet',
  time: chat.time || '',
});

const normalizeMessage = (message = {}, currentUserId = null) => ({
  ...message,
  text: message.text ?? message.content ?? '',
  content: message.content ?? message.text ?? '',
  senderInitials: message.senderInitials || getInitials(message.senderName),
  senderColor: message.senderColor || getColor(message.senderId || message.senderName),
  senderAvatar: message.senderAvatar || null,
  deletedFor: safeArray(message.deletedFor),
  isMe: message.senderId === currentUserId,
});

const isAdminUser = (user) => user?.role === 'Admin' || user?.role === 'Super Admin';
const hasPermission = (user, permission) => {
  if (isAdminUser(user)) return true;
  if (user?.role !== 'Employee') return false;
  return safeArray(user.permissions).includes('all_access') || safeArray(user.permissions).includes(permission);
};
const canUseStaffChatAccess = (user) => isAdminUser(user) || hasPermission(user, 'view_chats');
const canManageChatRequests = (user) => isAdminUser(user) || hasPermission(user, 'request_access');
const canViewPrivateUserDetails = (user) => isAdminUser(user) || hasPermission(user, 'view_users') || hasPermission(user, 'request_access');

const normalizeChatRequest = (request = {}) => ({
  ...request,
  status: request.status || 'pending',
});

const areSnapshotsEqual = (prev, next) => JSON.stringify(prev) === JSON.stringify(next);
const setIfChanged = (setter, next) => {
  setter(prev => areSnapshotsEqual(prev, next) ? prev : next);
};

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [posts, setPosts] = useState([]);
  const [courses, setCourses] = useState([]);
  const [trainerRatings, setTrainerRatings] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [chatMessages, setChatMessages] = useState({});
  const [users, setUsers] = useState({});
  const [mutableChats, setMutableChats] = useState([]);
  const [chatRequests, setChatRequests] = useState([]);
  const [userProfileToView, setUserProfileToView] = useState(null);
  const [profilePicToView, setProfilePicToView] = useState(null);
  const [showScheduleMeeting, setShowScheduleMeeting] = useState(false);
  const [activeChatForMeeting, setActiveChatForMeeting] = useState(null);
  const [autoDownloadMedia, setAutoDownloadMedia] = useState(false);
  const [targetChat, setTargetChat] = useState(null);
  const [mediaComposer, setMediaComposer] = useState(null);
  const backHandlersRef = useRef([]);

  const registerBackHandler = useCallback((handler) => {
    const entry = { handler };
    backHandlersRef.current.push(entry);
    return () => {
      backHandlersRef.current = backHandlersRef.current.filter(item => item !== entry);
    };
  }, []);

  const runBackHandler = useCallback(() => {
    const entry = backHandlersRef.current[backHandlersRef.current.length - 1];
    if (!entry) return false;
    entry.handler();
    return true;
  }, []);

  useEffect(() => {
    let intervalId;
    let isLoading = false;
    async function loadData() {
      if (isLoading) return;
      isLoading = true;
      try {
        const storedUser = readStoredAppUser();
        const currId = storedUser ? storedUser.id : null;
        const usersUrl = currId ? `/api/ssr/users?viewerId=${encodeURIComponent(currId)}` : '/api/ssr/users';
        const [usersRes, postsRes, coursesRes, chatsRes, messagesRes, meetingsRes, chatRequestsRes, ratingsRes] = await Promise.all([
          fetch(usersUrl).then(res => res.json()).catch(() => ({})),
          fetch('/api/ssr/posts').then(res => res.json()).catch(() => ({})),
          fetch('/api/ssr/courses').then(res => res.json()).catch(() => ({})),
          fetch('/api/ssr/chats').then(res => res.json()).catch(() => ({})),
          fetch('/api/ssr/messages').then(res => res.json()).catch(() => ({})),
          fetch('/api/ssr/meetings').then(res => res.json()).catch(() => ({})),
          fetch('/api/ssr/chat-requests').then(res => res.json()).catch(() => ({})),
          fetch('/api/ssr/ratings').then(res => res.json()).catch(() => ({}))
        ]);

        const normalizedUsers = usersRes && !usersRes.error ? normalizeUsersMap(usersRes) : null;
        if (normalizedUsers) setIfChanged(setUsers, normalizedUsers);
        if (postsRes && !postsRes.error && Array.isArray(postsRes)) setIfChanged(setPosts, postsRes.map(normalizePost));
        if (coursesRes && !coursesRes.error && Array.isArray(coursesRes)) {
          setIfChanged(setCourses, coursesRes.map(course => ({
            ...course,
            saved: Boolean(currId && course.savedBy?.includes(currId)),
            savedBy: safeArray(course.savedBy),
          })));
        }
        if (chatsRes && !chatsRes.error && Array.isArray(chatsRes)) setIfChanged(setMutableChats, chatsRes.map(normalizeChat));

        if (messagesRes && !messagesRes.error) {
           const grouped = {};
           if (Array.isArray(messagesRes)) {
             messagesRes.forEach(m => {
               if (currId && m.deletedFor && m.deletedFor.includes(currId)) return;
               if (!grouped[m.chatId]) grouped[m.chatId] = [];
               grouped[m.chatId].push(normalizeMessage(m, currId));
             });
           }
           Object.keys(grouped).forEach(k => {
             grouped[k].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
           });
           setChatMessages(prev => {
             const next = { ...grouped };
             Object.entries(prev).forEach(([chatId, messages]) => {
               const pending = messages.filter(message => message.status === 'sending');
               if (pending.length > 0) {
                 next[chatId] = [...(next[chatId] || []), ...pending].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
               }
             });
             return areSnapshotsEqual(prev, next) ? prev : next;
           });
        }

        if (meetingsRes && !meetingsRes.error && Array.isArray(meetingsRes)) setIfChanged(setMeetings, meetingsRes);
        if (chatRequestsRes && !chatRequestsRes.error && Array.isArray(chatRequestsRes)) setIfChanged(setChatRequests, chatRequestsRes.map(normalizeChatRequest));
        if (ratingsRes && !ratingsRes.error && Array.isArray(ratingsRes)) setIfChanged(setTrainerRatings, ratingsRes);

        if (storedUser) {
          const freshUser = normalizedUsers?.[currId];
          setCurrentUser(prev => {
            if (!freshUser) return prev || normalizeUser(storedUser);
            if (prev?.isImpersonating) return prev;
            const nextUser = { ...prev, ...normalizeUser(freshUser) };
            return prev && areSnapshotsEqual(prev, nextUser) ? prev : nextUser;
          });
          if (freshUser) persistAppUser(normalizeUser(freshUser));
          setSelectedRole(prev => prev || storedUser.role);
        }
      } catch (e) {
        console.error('Failed to load initial data:', e);
      } finally {
        isLoading = false;
      }
    }
    loadData();
    intervalId = setInterval(loadData, 3000); // 3-second polling simulates WebSockets!

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!currentUser || canUseStaffChatAccess(currentUser)) return;
    const hasSupportChat = mutableChats.some(chat => chat.type === 'support' && chat.participants?.includes(currentUser.id));
    if (hasSupportChat) return;

    let cancelled = false;
    async function createSupportChat() {
      try {
        const res = await fetch('/api/ssr/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'support', participants: [currentUser.id] })
        });
        const data = await res.json();
        if (!cancelled && data.id) setMutableChats(prev => [...prev, normalizeChat(data)]);
      } catch (e) {
        console.error(e);
      }
    }
    createSupportChat();
    return () => { cancelled = true; };
  }, [currentUser?.id, mutableChats.length]);

  const viewUserProfile = (userId) => {
    const user = Object.values(users).find(u => u.id === userId);
    if (user) setUserProfileToView(user);
  };
  const closeUserProfile = () => setUserProfileToView(null);

  const viewProfilePic = (userOrGroup) => {
    if (userOrGroup) setProfilePicToView(userOrGroup);
  };
  const closeProfilePic = () => setProfilePicToView(null);

  const openScheduleMeeting = (chat) => {
    setActiveChatForMeeting(chat);
    setShowScheduleMeeting(true);
  };
  const closeScheduleMeeting = () => {
    setShowScheduleMeeting(false);
    setActiveChatForMeeting(null);
  };

  const openMediaComposer = ({ file, chatId, replyTo = null } = {}) => {
    if (!file || !chatId) return;
    setMediaComposer({ file, chatId, replyTo });
  };
  const closeMediaComposer = () => setMediaComposer(null);

  const login = async (email, password, asImpersonateId = null) => {
    if (asImpersonateId) {
      const userToLogin = Object.values(users).find(u => u.id === asImpersonateId);
      if (userToLogin) {
        setCurrentUser({ ...userToLogin, isImpersonating: true, originalUser: currentUser });
        return true;
      }
      return false;
    }

    try {
      const res = await fetch('/api/ssr/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password })
      });
      const data = await res.json();
      if (data.user) {
        const user = normalizeUser(data.user);
        setCurrentUser(user);
        setSelectedRole(user.role);
        persistAppUser(user);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  };

  const signup = async (name, email, password, category, extraData = {}) => {
    try {
      const res = await fetch('/api/ssr/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signup', name, email, password, category, extraData })
      });
      const data = await res.json();
      if (data.user) {
        const newUser = normalizeUser(data.user);
        setUsers(prev => ({ ...prev, [newUser.id]: newUser }));
        setMutableChats(prev => prev.map(c => ({
          ...c,
          participants: [...(c.participants || []), newUser.id]
        })));
        setCurrentUser(newUser);
        setSelectedRole(newUser.role);
        persistAppUser(newUser);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  };

  const deleteAccount = async (email, password) => {
    try {
      const res = await fetch('/api/ssr/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteAccount', email, password })
      });
      const data = await res.json();
      if (data.success) {
        logout();
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  };

  const endImpersonation = () => {
    if (currentUser?.isImpersonating && currentUser.originalUser) {
      setCurrentUser(currentUser.originalUser);
    }
  };

  const updateUserProfile = async (userId, updates) => {
    const previousUser = users[userId];
    const previousCurrentUser = currentUser;
    setUsers(prev => ({
      ...prev,
      [userId]: { ...prev[userId], ...updates }
    }));
    if (currentUser?.id === userId) {
      const updatedUser = { ...currentUser, ...updates };
      setCurrentUser(updatedUser);
      persistAppUser(updatedUser);
    }
    try {
      const persistedUpdates = { ...updates };
      if (persistedUpdates.description !== undefined) {
        persistedUpdates.bio = persistedUpdates.description;
        persistedUpdates.shortDesc = persistedUpdates.description;
        delete persistedUpdates.description;
      }
      if (persistedUpdates.teachingMode !== undefined) {
        persistedUpdates.mode = persistedUpdates.teachingMode;
        delete persistedUpdates.teachingMode;
      }
      if (persistedUpdates.resumeName !== undefined) {
        persistedUpdates.resume = persistedUpdates.resumeName;
        delete persistedUpdates.resumeName;
      }
      const allowedFields = ['email', 'name', 'phone', 'password', 'role', 'initials', 'color', 'avatar', 'online', 'lastSeen', 'title', 'experience', 'profession', 'mode', 'location', 'shortDesc', 'bio', 'resume', 'rating', 'reviews', 'permissions', 'restricted'];
      const dbUpdates = Object.fromEntries(Object.entries(persistedUpdates).filter(([key]) => allowedFields.includes(key)));
      const res = await fetch('/api/ssr/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, ...dbUpdates })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        setUsers(prev => ({ ...prev, [userId]: previousUser }));
        if (currentUser?.id === userId && previousCurrentUser) {
          setCurrentUser(previousCurrentUser);
          persistAppUser(previousCurrentUser);
        }
        return { success: false, error: data.error || 'Could not save profile' };
      }
      return { success: true, user: normalizeUser(data) };
    } catch(e) {
      console.error(e);
      setUsers(prev => ({ ...prev, [userId]: previousUser }));
      if (currentUser?.id === userId && previousCurrentUser) {
        setCurrentUser(previousCurrentUser);
        persistAppUser(previousCurrentUser);
      }
      return { success: false, error: e.message || 'Could not save profile' };
    }
  };

  const logout = () => {
    if (currentUser?.id) {
      fetch('/api/ssr/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentUser.id, online: false, lastSeen: new Date().toISOString() })
      }).catch(() => {});
    }
    setCurrentUser(null);
    setSelectedRole(null);
    clearStoredAppUser();
  };

  const toggleLike = async (postId) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const likedBy = p.likedBy || [];
      const hasLiked = likedBy.includes(currentUser.id);
      return {
        ...p,
        likedBy: hasLiked ? likedBy.filter(id => id !== currentUser.id) : [...likedBy, currentUser.id],
        likes: hasLiked ? Math.max(0, p.likes - 1) : p.likes + 1
      };
    }));
    try {
      await fetch('/api/ssr/posts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggleLike', id: postId, userId: currentUser.id })
      });
    } catch(e) { console.error(e); }
  };

  const toggleSave = async (postId) => {
    if (!currentUser) return;
    const currentPost = posts.find(post => post.id === postId);
    const currentSavedBy = safeArray(currentPost?.savedBy);
    const nextSaved = !currentSavedBy.includes(currentUser.id);
    const nextSavedBy = nextSaved
      ? [...currentSavedBy, currentUser.id]
      : currentSavedBy.filter(id => id !== currentUser.id);
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      return { ...p, savedBy: nextSavedBy };
    }));
    try {
      const res = await fetch('/api/ssr/posts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggleSave', id: postId, userId: currentUser.id })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || 'Could not save post');
      setPosts(prev => prev.map(post => post.id === postId ? {
        ...post,
        ...data,
        savedBy: Array.isArray(data.savedBy) ? data.savedBy : nextSavedBy,
      } : post));
    } catch(e) {
      console.error(e);
      setPosts(prev => prev.map(post => post.id === postId ? { ...post, savedBy: currentSavedBy } : post));
    }
  };

  const deletePost = async (postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    try {
      await fetch('/api/ssr/posts?id=' + postId, { method: 'DELETE' });
    } catch(e) { console.error(e); }
  };

  const addPost = async (post) => {
    const newPost = {
      authorId: post.authorId,
      authorName: post.authorName,
      authorTitle: post.authorRole || 'User',
      authorInitials: post.authorInitials,
      authorColor: post.authorColor,
      category: post.category,
      title: post.title || 'Update',
      tag: post.tag || (post.category ? post.category.replace(/s$/, '') : 'Update'),
      time: 'Just now',
      content: post.content,
      image: post.mediaUrl || null,
      mediaType: post.mediaType || null,
    };
    try {
      const res = await fetch('/api/ssr/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPost)
      });
      const data = await res.json();
      if(data.id) setPosts(prev => [normalizePost(data), ...prev]);
    } catch(e) { console.error(e); }
    return true;
  };

  const addComment = async (postId, text) => {
    const newComment = {
      id: 'c' + Date.now(),
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorInitials: currentUser.initials,
      authorColor: currentUser.color,
      time: 'Just now',
      text
    };

    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      return {
        ...p,
        commentsList: [...(p.commentsList || []), newComment],
        comments: p.comments + 1
      };
    }));

    try {
      await fetch('/api/ssr/posts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addComment', id: postId, comment: newComment })
      });
    } catch(e) { console.error(e); }
  };

  const deleteComment = async (postId, commentId) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const newList = (p.commentsList || []).filter(c => c.id !== commentId);
      return {
        ...p,
        commentsList: newList,
        comments: newList.length
      };
    }));

    try {
      await fetch('/api/ssr/posts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteComment', id: postId, userId: currentUser.id, comment: { id: commentId } })
      });
    } catch(e) { console.error(e); }
  };

  const deleteMessages = async (chatId, msgIds, forEveryone) => {
    setChatMessages(prev => {
      const msgs = prev[chatId] || [];
      return {
        ...prev,
        [chatId]: msgs.map(m => {
          if (msgIds.includes(m.id)) {
            if (forEveryone) {
              return { ...m, isDeletedForEveryone: true, content: 'This message was deleted', text: 'This message was deleted', attachment: null };
            }
            return { ...m, isDeletedForMe: true };
          }
          return m;
        }).filter(m => !m.isDeletedForMe)
      };
    });
    try {
      await fetch('/api/ssr/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', msgIds, chatId, userId: currentUser.id, forEveryone })
      });
    } catch(e) { console.error(e); }
  };

  const editMessage = async (chatId, msgId, newText) => {
    setChatMessages(prev => {
      const msgs = prev[chatId] || [];
      return {
        ...prev,
        [chatId]: msgs.map(m => m.id === msgId ? { ...m, content: newText.trim(), text: newText.trim(), edited: true } : m)
      };
    });
    try {
      await fetch('/api/ssr/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit', msgIds: [msgId], chatId, content: newText.trim() })
      });
    } catch(e) { console.error(e); }
  };

  const forwardMessages = async (msgIds, sourceChatId, targetChatId) => {
    try {
      const msgsToForward = chatMessages[sourceChatId].filter(m => msgIds.includes(m.id));
      for (const m of msgsToForward) {
        await sendChatMessage(targetChatId, m.content, null, m.attachment);
      }
    } catch (e) { console.error(e); }
  };

  const deleteChatMedia = async (chatId, msgId, mediaId) => {
    if (!currentUser?.id) return;
    setChatMessages(prev => {
      const msgs = prev[chatId] || [];
      return {
        ...prev,
        [chatId]: msgs.map(m => {
          if (m.id !== msgId || !m.attachment) return m;
          const deletedFor = Array.isArray(m.attachment.deletedFor) ? m.attachment.deletedFor : [];
          return {
            ...m,
            attachment: {
              ...m.attachment,
              deletedFor: deletedFor.includes(currentUser.id) ? deletedFor : [...deletedFor, currentUser.id],
              isDownloaded: false,
            }
          };
        })
      };
    });
    try {
      await fetch('/api/ssr/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteMedia', msgIds: [msgId], chatId, mediaId, userId: currentUser.id })
      });
    } catch(e) { console.error(e); }
  };

  const uploadChatMedia = async (file, onProgress) => {
    if (!file) return null;
    const reportProgress = (value) => onProgress?.(Math.max(0, Math.min(100, Math.round(value))));
    const chunkSize = 256 * 1024;
    const readChunk = (blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    reportProgress(0);
    const initRes = await fetch('/api/ssr/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: file.name, mimeType: file.type || 'application/octet-stream', size: file.size, chunkCount: Math.ceil(file.size / chunkSize) })
    });
    const init = await initRes.json();
    if (!initRes.ok || !init.id) throw new Error(init.error || 'Could not prepare file upload');
    reportProgress(5);

    for (let index = 0; index < Math.ceil(file.size / chunkSize); index += 1) {
      const data = await readChunk(file.slice(index * chunkSize, Math.min(file.size, (index + 1) * chunkSize)));
      const chunkRes = await fetch('/api/ssr/media', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: init.id, chunkIndex: index, data })
      });
      const chunkResult = await chunkRes.json();
      if (!chunkRes.ok) throw new Error(chunkResult.error || 'Could not upload file');
      reportProgress(5 + ((index + 1) / Math.ceil(file.size / chunkSize)) * 95);
    }

    return {
      url: `/api/ssr/media/${init.id}`,
      mediaId: init.id,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      isImage: file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name),
      isVideo: file.type.startsWith('video/') || /\.(mp4|webm|ogg|mov)$/i.test(file.name),
      isAudio: file.type.startsWith('audio/') || /\.(mp3|wav|m4a)$/i.test(file.name),
      isDownloaded: true,
    };
  };

  const markChatRead = async (chatId) => {
    if (!currentUser || !chatId) return;
    setMutableChats(prev => prev.map(chat => {
      if (chat.id !== chatId) return chat;
      return { ...chat, unreadBy: { ...(chat.unreadBy || {}), [currentUser.id]: 0 }, unread: 0 };
    }));
    try {
      await fetch('/api/ssr/chats', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: chatId, action: 'markRead', userId: currentUser.id })
      });
    } catch (e) { console.error(e); }
  };

  const sendChatMessage = async (chatId, text, replyTo = null, attachment = null) => {
    if (!currentUser || (!text?.trim() && !attachment)) return;
    const tempId = `local-${currentUser.id}-${Date.now()}`;
    const msg = {
      id: tempId,
      chatId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderInitials: currentUser.initials,
      senderColor: currentUser.color || '#000',
      senderAvatar: currentUser.avatar || null,
      content: text?.trim() || '',
      attachment,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: false
    };

    const optimisticMessage = normalizeMessage({
      ...msg,
      createdAt: new Date().toISOString(),
      status: 'sending',
      attachment,
    }, currentUser.id);
    setChatMessages(prev => ({ ...prev, [chatId]: [...(prev[chatId] || []), optimisticMessage] }));

    try {
      const res = await fetch('/api/ssr/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg)
      });
      const data = await res.json();
      if (data.id) {
        setChatMessages(prev => ({
          ...prev,
          [chatId]: (prev[chatId] || []).map(message => message.id === tempId ? normalizeMessage({ ...data, status: 'delivered' }, currentUser.id) : message)
        }));
      } else {
        setChatMessages(prev => ({ ...prev, [chatId]: (prev[chatId] || []).filter(message => message.id !== tempId) }));
      }
    } catch(e) {
      console.error(e);
      setChatMessages(prev => ({ ...prev, [chatId]: (prev[chatId] || []).filter(message => message.id !== tempId) }));
    }
  };

  const toggleCourseSave = async (courseId) => {
    if (!currentUser) return;
    const currentCourse = courses.find(course => course.id === courseId);
    const currentSavedBy = safeArray(currentCourse?.savedBy);
    const nextSaved = !currentSavedBy.includes(currentUser.id);
    const nextSavedBy = nextSaved
      ? [...currentSavedBy, currentUser.id]
      : currentSavedBy.filter(id => id !== currentUser.id);

    setCourses(prev => prev.map(c => {
      if (c.id !== courseId) return c;
      return {
        ...c,
        saved: nextSaved,
        savedBy: nextSavedBy,
      };
    }));
    try {
      const res = await fetch('/api/ssr/courses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggleSave', id: courseId, userId: currentUser.id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Could not save service');
      setCourses(prev => prev.map(c => c.id === courseId ? {
        ...c,
        ...data,
        savedBy: Array.isArray(data.savedBy) ? data.savedBy : nextSavedBy,
        saved: Array.isArray(data.savedBy) ? data.savedBy.includes(currentUser.id) : nextSaved,
      } : c));
    } catch (e) {
      console.error(e);
      setCourses(prev => prev.map(c => c.id === courseId ? { ...c, saved: currentSavedBy.includes(currentUser.id), savedBy: currentSavedBy } : c));
    }
  };

  const addCourse = async (course) => {
    const newCourse = { ...course, id: undefined };
    try {
      const res = await fetch('/api/ssr/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCourse)
      });
      const data = await res.json();
      if (data.id) setCourses(prev => [data, ...prev]);
    } catch(e) { console.error(e); }
  };

  const getTrainerRatingSummary = (trainerId) => {
    const ratings = trainerRatings.filter(rating => rating.trainerId === trainerId);
    const average = ratings.length > 0
      ? ratings.reduce((total, rating) => total + Number(rating.rating || 0), 0) / ratings.length
      : 0;
    return {
      average: average ? Number(average.toFixed(1)) : 0,
      count: ratings.length,
      myRating: currentUser ? ratings.find(rating => rating.raterId === currentUser.id)?.rating || 0 : 0,
      myComment: currentUser ? ratings.find(rating => rating.raterId === currentUser.id)?.comment || '' : '',
      reviews: ratings.filter(rating => rating.comment).map(rating => ({
        id: rating.id,
        raterId: rating.raterId,
        rating: rating.rating,
        comment: rating.comment,
        updatedAt: rating.updatedAt,
      })),
    };
  };

  const rateTrainer = async (trainerId, rating, comment) => {
    if (!currentUser || !trainerId || currentUser.id === trainerId) {
      return { success: false, error: 'You cannot rate this profile.' };
    }
    const numericRating = Number(rating);
    const reviewComment = String(comment || '').trim().slice(0, 1000);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5 || !reviewComment) {
      return { success: false, error: 'Choose a rating and write a review comment.' };
    }

    const optimistic = {
      id: `local-${trainerId}-${currentUser.id}`,
      trainerId,
      raterId: currentUser.id,
      rating: numericRating,
      comment: reviewComment,
      updatedAt: new Date().toISOString(),
    };
    setTrainerRatings(prev => [optimistic, ...prev.filter(item => !(item.trainerId === trainerId && item.raterId === currentUser.id))]);

    try {
      const res = await fetch('/api/ssr/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainerId, raterId: currentUser.id, rating: numericRating, comment: reviewComment }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Could not save rating');
      setTrainerRatings(prev => [data, ...prev.filter(item => !(item.trainerId === trainerId && item.raterId === currentUser.id))]);
      return { success: true, rating: data };
    } catch (error) {
      setTrainerRatings(prev => prev.filter(item => !(item.trainerId === trainerId && item.raterId === currentUser.id)));
      return { success: false, error: error.message || 'Could not save rating' };
    }
  };

  const deleteCourse = async (courseId) => {
    setCourses(prev => prev.filter(c => c.id !== courseId));
    try {
      await fetch('/api/ssr/courses?id=' + courseId, { method: 'DELETE' });
    } catch(e) { console.error(e); }
  };

  const deleteUser = async (userId) => {
    setUsers(prev => {
      const next = { ...prev };
      const key = Object.keys(next).find(k => next[k].id === userId);
      if (key) delete next[key];
      return next;
    });
    try {
      await fetch('/api/ssr/users?id=' + userId, { method: 'DELETE' });
    } catch(e) { console.error(e); }
  };

  const restrictUser = async (userId) => {
    const isRestricted = users[userId]?.restricted;
    setUsers(prev => {
      const next = { ...prev };
      if (next[userId]) next[userId] = { ...next[userId], restricted: !isRestricted };
      return next;
    });
    try {
      await fetch('/api/ssr/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, restricted: !isRestricted })
      });
    } catch(e) { console.error(e); }
  };

  const addEmployee = async (employeeData) => {
    const newEmp = {
      name: employeeData.name,
      email: employeeData.email,
      password: employeeData.password || 'welcome123',
      role: 'Employee',
      initials: employeeData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      color: '#475569',
      permissions: employeeData.permissions || [],
      restricted: false,
    };
    try {
      const res = await fetch('/api/ssr/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmp)
      });
      const data = await res.json();
      if (!res.ok || !data.id) return { success: false, error: data.error || 'Could not create employee account' };
      setUsers(prev => ({ ...prev, [data.id]: normalizeUser(data) }));
      return { success: true, user: normalizeUser(data) };
    } catch(e) {
      console.error(e);
      return { success: false, error: e.message || 'Could not create employee account' };
    }
  };

  const updateEmployeeProfile = async (userId, updates) => {
    await updateUserProfile(userId, updates);
  };

  const updateUserPermissions = async (userId, permissions) => {
    await updateUserProfile(userId, { permissions });
  };

  const getDirectChatWith = (targetUserId) => {
    if (!currentUser || !targetUserId) return null;
    return mutableChats.find(chat =>
      chat.type === 'direct' &&
      chat.participants?.includes(currentUser.id) &&
      chat.participants?.includes(targetUserId)
    ) || null;
  };

  const canDirectChatWith = (targetUserId) => {
    if (!currentUser || !targetUserId || currentUser.id === targetUserId) return false;
    const targetUser = users[targetUserId];
    if (canUseStaffChatAccess(currentUser)) return true;
    if (isAdminUser(targetUser)) return true;
    const sharedGroups = mutableChats.filter(chat => chat.type === 'group' && chat.participants?.includes(currentUser.id) && chat.participants?.includes(targetUserId));
    const isGroupAdmin = sharedGroups.some(chat => chat.createdBy === currentUser.id || chat.admins?.includes(currentUser.id));
    if (isGroupAdmin) return true;
    if (sharedGroups.length > 0 && !sharedGroups.some(chat => chat.privateChatEnabled !== false)) return false;
    return Boolean(getDirectChatWith(targetUserId)) || sharedGroups.some(chat => chat.privateChatEnabled !== false);
  };

  const startDirectChat = async (targetUserId) => {
    if (!currentUser || !targetUserId || currentUser.id === targetUserId) return null;

    let existing = getDirectChatWith(targetUserId);
    if (existing) return existing;

    if (!canDirectChatWith(targetUserId)) {
      return null;
    }

    try {
      const res = await fetch('/api/ssr/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'direct', participants: [currentUser.id, targetUserId], createdBy: currentUser.id })
      });
      const data = await res.json();
      if (!data.id) return null;
      const newChat = normalizeChat(data);
      setMutableChats(prev => prev.some(c => c.id === newChat.id) ? prev : [newChat, ...prev]);
      return newChat;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const requestChatAccess = async (targetUserId) => {
    if (!currentUser || !targetUserId || currentUser.id === targetUserId) {
      return { success: false, error: 'Invalid chat request' };
    }

    const existingPending = chatRequests.find(request =>
      request.status === 'pending' &&
      request.requesterId === currentUser.id &&
      request.targetId === targetUserId
    );
    if (existingPending) return { success: true, request: existingPending, existing: true };

    try {
      const res = await fetch('/api/ssr/chat-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: currentUser.id, targetId: targetUserId })
      });
      const data = await res.json();
      if (!res.ok && data.chat) return { success: true, chat: normalizeChat(data.chat), existing: true };
      if (!res.ok || data.error) return { success: false, error: data.error || 'Could not send request' };
      const request = normalizeChatRequest(data);
      setChatRequests(prev => prev.some(r => r.id === request.id) ? prev : [request, ...prev]);
      return { success: true, request };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  };

  const decideChatRequest = async (requestId, action) => {
    if (!currentUser || !canManageChatRequests(currentUser)) {
      return { success: false, error: 'You do not have access to manage requests' };
    }

    try {
      const res = await fetch('/api/ssr/chat-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: requestId, action, decidedById: currentUser.id })
      });
      const data = await res.json();
      if (!res.ok || data.error) return { success: false, error: data.error || 'Could not update request' };

      const request = normalizeChatRequest(data.request);
      setChatRequests(prev => prev.map(r => r.id === request.id ? request : r));
      if (data.chat?.id) {
        const chat = normalizeChat(data.chat);
        setMutableChats(prev => prev.some(c => c.id === chat.id) ? prev : [chat, ...prev]);
      }
      return { success: true, request, chat: data.chat ? normalizeChat(data.chat) : null };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  };

  const updateChat = async (chatId, updates) => {
    setMutableChats(prev => prev.map(c => c.id === chatId ? { ...c, ...updates } : c));
    try {
      await fetch('/api/ssr/chats', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: chatId, userId: currentUser.id, ...updates })
      });
    } catch(e) { console.error(e); }
  };

  const performChatAction = async (chatId, action, targetUserId = null) => {
    if (!currentUser || !chatId || !action) return { success: false, error: 'Invalid chat action' };
    try {
      const res = await fetch('/api/ssr/chats', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: chatId, action, userId: currentUser.id, targetUserId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) return { success: false, error: data.error || 'Could not update chat' };
      const updated = normalizeChat(data.chat || data);
      setMutableChats(prev => prev.map(chat => chat.id === updated.id ? updated : chat));
      return { success: true, chat: updated };
    } catch (error) {
      console.error(error);
      return { success: false, error: error.message || 'Could not update chat' };
    }
  };

  const createGroup = async ({ name, description = '', participantIds = [] } = {}) => {
    if (!currentUser || !canUseStaffChatAccess(currentUser)) {
      return { success: false, error: 'Only admins and chat-access employees can create groups' };
    }

    const participants = [...new Set([currentUser.id, ...participantIds].filter(Boolean))];
    try {
      const res = await fetch('/api/ssr/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'group',
          name: name?.trim(),
          description: description?.trim() || null,
          participants,
          createdBy: currentUser.id,
          admins: [currentUser.id],
        })
      });
      const data = await res.json();
      if (!res.ok || !data.id) return { success: false, error: data.error || 'Could not create group' };
      const group = normalizeChat(data);
      setMutableChats(prev => prev.some(chat => chat.id === group.id) ? prev : [group, ...prev]);
      return { success: true, chat: group };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message || 'Could not create group' };
    }
  };

  const addMeeting = async (meeting) => {
    try {
      const res = await fetch('/api/ssr/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({...meeting, id: undefined})
      });
      const data = await res.json();
      if(data.id) setMeetings(prev => [data, ...prev]);
    } catch(e) { console.error(e); }
  };

  const scheduleMessage = async (msgData) => {
    try {
      await fetch('/api/ssr/scheduled-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msgData)
      });
    } catch(e) { console.error(e); }
  };

  return (
    <AppContext.Provider value={{
      currentUser, login, signup, deleteAccount, logout, endImpersonation, selectedRole, setSelectedRole,
      posts, toggleLike, toggleSave, addComment, deleteComment, deletePost, addPost,
      chats: mutableChats,
      setChats: setMutableChats,
      updateChat,
      performChatAction,
      createGroup,
      chatMessages,
      sendChatMessage,
      scheduleMessage,
      deleteMessages,
      editMessage,
      forwardMessages,
      deleteChatMedia,
      courses, toggleCourseSave, addCourse, deleteCourse,
      trainerRatings, getTrainerRatingSummary, rateTrainer,
      meetings, addMeeting,
      users,
      deleteUser, restrictUser, addEmployee, updateUserPermissions, updateEmployeeProfile,
      chatRequests, requestChatAccess, decideChatRequest, startDirectChat, canDirectChatWith,
      canManageChatRequests, canViewPrivateUserDetails, canUseStaffChatAccess,
      autoDownloadMedia, setAutoDownloadMedia,
      targetChat, setTargetChat,
      uploadChatMedia, markChatRead,
      mediaComposer, openMediaComposer, closeMediaComposer,
      registerBackHandler, runBackHandler,
      userProfileToView,
      viewUserProfile,
      closeUserProfile,
      updateUserProfile,
      profilePicToView,
      viewProfilePic,
      closeProfilePic,
      showScheduleMeeting, openScheduleMeeting, closeScheduleMeeting, activeChatForMeeting,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
