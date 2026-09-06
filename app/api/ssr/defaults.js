const palette = ['#0A6ED1', '#16A34A', '#D97706', '#7C3AED', '#DC2626', '#475569'];

export function initialsFor(name = '') {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return initials || 'U';
}

export function colorFor(value = '') {
  const source = String(value || 'user');
  const sum = [...source].reduce((total, char) => total + char.charCodeAt(0), 0);
  return palette[sum % palette.length];
}

export function normalizeRole(categoryOrRole) {
  if (categoryOrRole === 'User') return 'Participant';
  if (categoryOrRole === 'superadmin') return 'Super Admin';
  if (categoryOrRole === 'admin') return 'Admin';
  if (categoryOrRole === 'employee') return 'Employee';
  if (categoryOrRole === 'trainer') return 'Trainer';
  if (categoryOrRole === 'participant') return 'Participant';
  return categoryOrRole || 'Participant';
}

export function buildUserData(data = {}) {
  const name = data.name?.trim() || 'New User';
  const email = data.email?.trim().toLowerCase();

  const role = normalizeRole(data.role || data.category);

  return {
    email,
    name,
    phone: data.phone || data.mobile || null,
    password: data.password,
    role,
    initials: data.initials || initialsFor(name),
    color: data.color || colorFor(email || name),
    avatar: data.avatar || data.profilePic || null,
    online: Boolean(data.online),
    lastSeen: data.lastSeen ? new Date(data.lastSeen) : null,
    title: data.title || ((role === 'Admin' || role === 'Super Admin') ? 'CEO' : null),
    experience: data.experience || null,
    profession: Array.isArray(data.profession) ? data.profession : [],
    mode: data.mode || data.teachingMode || null,
    location: data.location || null,
    shortDesc: data.shortDesc || data.description || null,
    bio: data.bio || data.description || null,
    resume: data.resume || data.resumeName || null,
    rating: typeof data.rating === 'number' ? data.rating : null,
    reviews: typeof data.reviews === 'number' ? data.reviews : null,
    permissions: Array.isArray(data.permissions) ? data.permissions : [],
    restricted: Boolean(data.restricted),
  };
}

export function buildPostData(data = {}) {
  const title = data.title || extractTitle(data.content);
  const content = stripMarkdownTitle(data.content || '');

  return {
    authorId: data.authorId,
    authorName: data.authorName || 'SSR Team',
    authorTitle: data.authorTitle || data.authorRole || 'User',
    authorInitials: data.authorInitials || initialsFor(data.authorName || 'SSR Team'),
    authorColor: data.authorColor || colorFor(data.authorId || data.authorName || 'post'),
    category: data.category || 'Announcements',
    title,
    tag: data.tag || (data.category ? data.category.replace(/s$/, '') : 'Update'),
    time: data.time || 'Just now',
    content,
    image: data.image || data.mediaUrl || null,
    mediaType: data.mediaType || null,
    banner: data.banner || null,
    likes: Number.isFinite(data.likes) ? data.likes : 0,
    comments: Number.isFinite(data.comments) ? data.comments : 0,
    commentsList: Array.isArray(data.commentsList) ? data.commentsList : [],
    likedBy: Array.isArray(data.likedBy) ? data.likedBy : [],
    savedBy: Array.isArray(data.savedBy) ? data.savedBy : [],
  };
}

export function buildCourseData(data = {}) {
  return {
    title: data.title || 'Untitled Service',
    module: data.module || 'General',
    icon: data.icon || null,
    image: data.image || data.imageUrl || null,
    shortDesc: data.shortDesc || '',
    fullDesc: data.fullDesc || data.shortDesc || '',
    duration: data.duration || 'Contact for details',
    level: data.level || 'All Levels',
    languages: Array.isArray(data.languages) ? data.languages : ['English'],
    prerequisites: Array.isArray(data.prerequisites) ? data.prerequisites : [],
    whatYouWillLearn: Array.isArray(data.whatYouWillLearn) ? data.whatYouWillLearn : [],
    benefits: Array.isArray(data.benefits) ? data.benefits : [],
    syllabus: data.syllabus || {},
    jobs: Array.isArray(data.jobs) ? data.jobs : [],
    servers: Array.isArray(data.servers) ? data.servers : [],
    trainers: Array.isArray(data.trainers) ? data.trainers : [],
    attachedSkills: Array.isArray(data.attachedSkills) ? data.attachedSkills : [],
    savedBy: Array.isArray(data.savedBy) ? data.savedBy : [],
    moduleType: data.moduleType || 'Functional',
    publishToWebsite: data.publishToWebsite !== false,
    serviceType: data.serviceType === 'server' ? 'server' : 'module',
    serverModules: Array.isArray(data.serverModules) ? data.serverModules : [],
    pricePlans: Array.isArray(data.pricePlans) ? data.pricePlans : [],
    orderEnabled: data.serviceType === 'server' && data.orderEnabled === true,
    credentialCount: Number.isInteger(data.credentialCount) && data.credentialCount >= 0 ? data.credentialCount : 0,
  };
}

export function buildChatData(data = {}) {
  return {
    type: data.type || 'direct',
    name: data.name || null,
    groupImage: data.groupImage || null,
    description: data.description || null,
    createdBy: data.createdBy || null,
    admins: Array.isArray(data.admins) ? data.admins : [],
    participants: Array.isArray(data.participants) ? data.participants : [],
    mutedBy: Array.isArray(data.mutedBy) ? data.mutedBy : [],
    pinnedBy: Array.isArray(data.pinnedBy) ? data.pinnedBy : [],
    deletedFor: Array.isArray(data.deletedFor) ? data.deletedFor : [],
    unreadBy: data.unreadBy && typeof data.unreadBy === 'object' ? data.unreadBy : {},
    privateChatEnabled: data.privateChatEnabled !== false,
  };
}

export function hasEmployeePermission(user, permission) {
  if (!user) return false;
  if (user.role === 'Admin' || user.role === 'Super Admin') return true;
  if (user.role !== 'Employee') return false;
  const permissions = Array.isArray(user.permissions) ? user.permissions : [];
  return permissions.includes('all_access') || permissions.includes(permission);
}

export function buildMessageData(data = {}) {
  return {
    chatId: data.chatId,
    senderId: data.senderId,
    senderName: data.senderName || 'Unknown',
    senderInitials: data.senderInitials || initialsFor(data.senderName || 'Unknown'),
    senderColor: data.senderColor || colorFor(data.senderId || data.senderName || 'message'),
    senderAvatar: data.senderAvatar || null,
    content: data.content || data.text || '',
    timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isSystem: Boolean(data.isSystem),
    edited: Boolean(data.edited),
    isDeletedForEveryone: Boolean(data.isDeletedForEveryone),
    deletedFor: Array.isArray(data.deletedFor) ? data.deletedFor : [],
    reactions: data.reactions && typeof data.reactions === 'object' && !Array.isArray(data.reactions) ? data.reactions : {},
    attachment: data.attachment || null,
  };
}

export function buildMeetingData(data = {}) {
  return {
    title: data.title || 'Meeting',
    module: data.module || 'General',
    hostId: data.hostId,
    date: data.date || data.startDate || '',
    endDate: data.endDate || null,
    time: data.time || '',
    duration: data.duration || '1 hour',
    link: data.link || '',
    status: data.status || 'upcoming',
    recurrence: data.recurrence || 'none',
    weekdays: Array.isArray(data.weekdays) ? data.weekdays : [],
    monthlyDates: data.monthlyDates || null,
    chatId: data.chatId || null,
    participants: Array.isArray(data.participants) ? data.participants : [],
    timezone: data.timezone || 'Asia/Kolkata',
  };
}

export function buildScheduledMessageData(data = {}) {
  return {
    chatId: data.chatId,
    senderId: data.senderId,
    content: data.content || data.text || '',
    attachment: data.attachment || null,
    recurrence: data.recurrence || 'none',
    startDate: data.startDate || '',
    endDate: data.endDate || null,
    time: data.time || '',
    weekdays: Array.isArray(data.weekdays) ? data.weekdays : [],
    monthlyDates: data.monthlyDates || null,
    timezone: data.timezone || 'Asia/Kolkata',
    status: data.status || 'scheduled',
  };
}

function extractTitle(content = '') {
  const match = content.match(/^\*\*(.+?)\*\*/);
  return match?.[1] || 'Update';
}

function stripMarkdownTitle(content = '') {
  return content.replace(/^\*\*.+?\*\*\n?/, '').trim();
}
