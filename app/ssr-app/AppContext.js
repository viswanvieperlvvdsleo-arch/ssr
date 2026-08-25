'use client';

import { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

export const MOCK_USERS = {
  superadmin: { 
    id: 'u0', 
    name: process.env.NEXT_PUBLIC_SUPER_ADMIN_NAME || 'Santosh', 
    email: process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || 'admin.ssrbs@gmail.com', 
    password: process.env.NEXT_PUBLIC_SUPER_ADMIN_PASSWORD || 'Ssrbs@2020',
    role: 'Super Admin', 
    initials: (process.env.NEXT_PUBLIC_SUPER_ADMIN_NAME || 'Santosh').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2), 
    color: '#063D8A', 
    experience: '15+ Years', 
    title: 'Lead SAP Architect', 
    online: false 
  },
  admin:      { id: 'u1', name: 'Rahul Sharma',  email: 'admin2@ssr.com', role: 'Admin',       initials: 'RS', color: '#0A6ED1', experience: '10 Years', title: 'Senior SAP Consultant & Trainer', online: true, rating: '4.9', description: 'Expert in SAP S/4HANA implementations with 10+ years of corporate training experience.' },
  employee:   { id: 'u2', name: 'Priya Singh',   email: 'employee@ssr.com', password: 'password123', role: 'Employee',    initials: 'PS', color: '#0058AA', experience: '3 Years', title: 'SAP Support Specialist', online: true },
  trainer:    { id: 'u3', name: 'Arun Kumar',    email: 'trainer@ssr.com',       role: 'Trainer',     initials: 'AK', color: '#1B8EF2', experience: '8 Years', title: 'SAP FICO Expert Trainer', online: false, rating: '4.8', description: 'Specializes in SAP FICO module training with real-time project scenarios.' },
  participant:{ id: 'u4', name: 'Neha Patel',    email: 'participant@ssr.com',   role: 'Participant', initials: 'NP', color: '#00B8F1', online: true },
};

export const MOCK_POSTS = [
  {
    id: 'p1', authorId: 'u1', authorName: 'Rahul Sharma', authorRole: 'Admin',
    authorInitials: 'RS', authorColor: '#0A6ED1',
    tag: 'Announcement', tagColor: '#0A6ED1', category: 'Announcements',
    title: 'SAP S/4HANA 2023 New Batch Starting',
    content: 'We are excited to announce the launch of our new SAP S/4HANA 2023 batch starting from September 1st. This comprehensive program covers Finance, MM, SD, and PP modules with real-time project exposure.',
    banner: { title: 'SAP S/4HANA 2023', subtitle: 'New Batch Starting', date: '1st September 2024' },
    likes: 24, saved: false, liked: false, createdAt: '2 hours ago',
    comments: [
      { id: 'c1', authorId: 'u4', authorName: 'Neha Patel', authorInitials: 'NP', authorColor: '#00B8F1', text: 'Excited to join this batch!', time: '1h ago' },
      { id: 'c2', authorId: 'u3', authorName: 'Arun Kumar', authorInitials: 'AK', authorColor: '#1B8EF2', text: 'Great initiative! What are the prerequisites?', time: '45m ago' },
    ]
  },
  {
    id: 'p2', authorId: 'u3', authorName: 'Arun Kumar', authorRole: 'Trainer',
    authorInitials: 'AK', authorColor: '#1B8EF2',
    tag: 'Training Update', tagColor: '#0A6ED1', category: 'Training Updates',
    title: 'SAP FICO Module — Week 3 Recording Available',
    content: 'Dear participants, the recording for Week 3 is now available. Please watch the session and complete the assigned tasks before the next class.',
    banner: { title: 'SAP FICO', subtitle: 'Week 3', duration: '45:20' },
    likes: 18, saved: false, liked: false, createdAt: '5 hours ago',
    comments: [
      { id: 'c3', authorId: 'u4', authorName: 'Neha Patel', authorInitials: 'NP', authorColor: '#00B8F1', text: 'Thank you sir!', time: '4h ago' },
      { id: 'c4', authorId: 'u4', authorName: 'Priya Nair', authorInitials: 'PN', authorColor: '#0058AA', text: 'Very helpful session, appreciated!', time: '3h ago' },
    ]
  },
  {
    id: 'p3', authorId: 'u4', authorName: 'Priya Nair', authorRole: 'Participant',
    authorInitials: 'PN', authorColor: '#0058AA',
    tag: 'Discussion', tagColor: '#0A6ED1', category: 'Discussions',
    title: 'Best resources to practice SAP MM configuration?',
    content: 'Hi everyone! I am looking for good practice resources for SAP MM configuration — specifically for Purchasing and Inventory Management. Any recommendations from the trainers or seniors?',
    banner: null,
    likes: 9, saved: false, liked: false, createdAt: '1 day ago',
    comments: []
  },
  {
    id: 'p4', authorId: 'u1', authorName: 'Rahul Sharma', authorRole: 'Admin',
    authorInitials: 'RS', authorColor: '#0A6ED1',
    tag: 'Announcement', tagColor: '#0A6ED1', category: 'Announcements',
    title: 'Live Q&A Session — SAP MM Interview Prep',
    content: 'Join us this Saturday for a live Q&A covering real SAP MM interview questions, procurement cycle, inventory management, and vendor evaluation. Register now to confirm your seat.',
    banner: { title: 'Live Q&A', subtitle: 'SAP MM Interview Prep', date: 'Saturday 3:00 PM' },
    likes: 41, saved: false, liked: false, createdAt: '1 day ago',
    comments: []
  },
];

export const MOCK_CHATS = [
  { id: 'g1', type: 'group', name: 'Announcements',       sub: 'Rahul Sharma: New batch details are out...', time: '10:30 AM', unread: 3, initials: 'AN', color: '#0A6ED1', pinned: true,  participants: ['u1', 'u2', 'u3', 'u4'], createdBy: 'u1', admins: ['u1', 'u2'], groupImage: null },
  { id: 'g2', type: 'group', name: 'Trainer Support',     sub: 'Arun Kumar: Please check the Week 3 recording.', time: '9:15 AM', unread: 2, initials: 'TS', color: '#1B8EF2', pinned: false, participants: ['u1', 'u3', 'u4'], createdBy: 'u1', admins: ['u1'], groupImage: null },
  { id: 'g3', type: 'group', name: 'General Discussion',  sub: 'Priya Nair: Thanks everyone!', time: 'Yesterday', unread: 0, initials: 'GD', color: '#0058AA', pinned: false, participants: ['u1', 'u2', 'u3', 'u4'], createdBy: 'u1', admins: ['u1'], groupImage: null },
  { id: 'g4', type: 'group', name: 'SAP S/4HANA Batch',  sub: 'Vikram Singh: When is the next live session?', time: 'Yesterday', unread: 6, initials: 'S4', color: '#063D8A', pinned: false, participants: ['u1', 'u4'], createdBy: 'u1', admins: ['u1'], groupImage: null },
  { id: 'd1', type: 'direct', name: 'Neha Patel',   sub: 'Sure, will do that.', time: 'Tue', unread: 0, initials: 'NP', color: '#00B8F1', pinned: false, participants: ['u1', 'u4'] },
];

export const MOCK_MESSAGES = {
  g2: [
    { id: 'm1', senderId: 'u3', senderName: 'Arun Kumar', senderInitials: 'AK', senderColor: '#1B8EF2', text: 'Hi everyone! Please check the Week 3 recording and let me know if you have any questions.', time: '9:15 AM', isMe: false, timestamp: Date.now(), status: 'seen' },
    { id: 'm2', senderId: 'u4', senderName: 'Neha Patel', senderInitials: 'NP', senderColor: '#00B8F1', text: 'Sure, thanks!', time: '9:16 AM', isMe: true, timestamp: Date.now(), status: 'seen' },
  ],
  g1: [
    { id: 'm3', senderId: 'u1', senderName: 'Rahul Sharma', senderInitials: 'RS', senderColor: '#0A6ED1', text: 'New batch details are out! Please check the Home Feed for more information.', time: '10:30 AM', isMe: false, timestamp: Date.now(), status: 'seen' },
  ],
  d1: [
    { id: 'm4', senderId: 'u4', senderName: 'Neha Patel', senderInitials: 'NP', senderColor: '#00B8F1', text: 'Sure, will do that.', time: 'Tue', isMe: false, timestamp: Date.now() - 86400000, status: 'seen' },
  ],
};

export const MOCK_SERVERS = [
  { id: 's1', name: 'SAP S/4HANA 2023', version: 'S/4HANA 2023', status: 'online', capacity: 30, used: 18, description: 'Latest SAP S/4HANA with Fiori integration.' },
  { id: 's2', name: 'SAP HANA Database', version: 'HANA 2.0 SPS07', status: 'online', capacity: 20, used: 12, description: 'In-memory SAP HANA database for analytics.' },
  { id: 's3', name: 'SAP ECC 6.0 EHP8', version: 'ECC 6.0', status: 'busy', capacity: 25, used: 25, description: 'Classic SAP ERP environment.' },
  { id: 's4', name: 'SAP Fiori Launchpad', version: 'Fiori 3.0', status: 'online', capacity: 40, used: 11, description: 'SAP Fiori UX environment.' },
];

export const MOCK_COURSES = [
  {
    id: 'c1',
    title: 'SAP FICO (Financial Accounting and Controlling)',
    module: 'Finance',
    image: '/services/functional modules/FICO.png',
    shortDesc: 'Master SAP FICO with real-time projects and industry scenarios.',
    fullDesc: 'The SAP FICO course is designed to build a strong foundation in financial accounting and management accounting. You will learn G/L, AP, AR, Asset Accounting, and Cost Center accounting from basics to advanced configuration.',
    benefits: ['Real-time project exposure', 'Certification assistance', 'Mock interviews', 'Resume Preparation'],
    jobs: ['SAP FICO Consultant', 'Financial Analyst', 'SAP Support Engineer', 'Business Process Lead'],
    servers: ['SAP S/4HANA 2023', 'SAP ECC 6.0 EHP8'],
    trainers: ['admin', 'trainer'] // Keys from MOCK_USERS
  },
  {
    id: 'c2',
    title: 'SAP MM (Material Management)',
    module: 'Supply Chain',
    image: '/services/functional modules/MM.png',
    shortDesc: 'Complete guide to procurement and inventory management in SAP.',
    fullDesc: 'Learn the end-to-end procurement process, from requisition to invoice verification. Includes inventory management, physical inventory processes, and vendor evaluation in the latest S/4HANA environment.',
    benefits: ['Hands-on system access', 'Resume building', 'Placement support', 'Live Q&A Sessions'],
    jobs: ['SAP MM Consultant', 'Procurement Specialist', 'Supply Chain Analyst'],
    servers: ['SAP S/4HANA 2023'],
    trainers: ['admin']
  },
  {
    id: 'c3',
    title: 'SAP SD (Sales and Distribution)',
    module: 'Sales',
    image: '/services/functional modules/sd.png',
    shortDesc: 'Order-to-cash process configuration and execution.',
    fullDesc: 'Understand the sales cycle in SAP, including master data setup, sales documents, pricing procedures, billing processes, and credit management.',
    benefits: ['Live doubt clearing', 'Study materials', 'Project work', 'Configuration Guides'],
    jobs: ['SAP SD Consultant', 'Order Management Specialist', 'Business Analyst'],
    servers: ['SAP S/4HANA 2023'],
    trainers: ['trainer']
  },
  {
    id: 'c4',
    title: 'SAP HCM (Human Capital Management)',
    module: 'HR',
    image: '/services/functional modules/HCM.png',
    shortDesc: 'End-to-end employee lifecycle and organizational management.',
    fullDesc: 'Master SAP HCM processes including Personnel Administration, Organizational Management, Time Management, and Payroll. Learn how to manage the complete hire-to-retire cycle.',
    benefits: ['Real-time project exposure', 'Resume Preparation', 'Interview prep'],
    jobs: ['SAP HCM Consultant', 'HR IT Specialist', 'SAP Payroll Consultant'],
    servers: ['SAP ECC 6.0 EHP8', 'SAP S/4HANA'],
    trainers: ['admin']
  },
  {
    id: 'c5',
    title: 'SAP PP (Production Planning)',
    module: 'Manufacturing',
    image: '/services/functional modules/pp.png',
    shortDesc: 'Master SAP PP for manufacturing and production control.',
    fullDesc: 'Learn how to align demand with manufacturing capacity. Covers Master Data, Material Requirements Planning (MRP), Shop Floor Execution, and Capacity Planning.',
    benefits: ['Hands-on system access', 'Placement support', 'Live Q&A Sessions'],
    jobs: ['SAP PP Consultant', 'Production Planner', 'Supply Chain Lead'],
    servers: ['SAP S/4HANA 2023'],
    trainers: ['trainer']
  },
  {
    id: 'c6',
    title: 'SAP QM (Quality Management)',
    module: 'Quality',
    image: '/services/functional modules/QM.png',
    shortDesc: 'Ensure quality control and compliance across operations.',
    fullDesc: 'Learn the integration of Quality Management with materials management, production, sales, and accounting. Covers quality planning, inspection, and control.',
    benefits: ['Live doubt clearing', 'Study materials', 'Project work'],
    jobs: ['SAP QM Consultant', 'Quality Analyst', 'Process Expert'],
    servers: ['SAP S/4HANA 2023'],
    trainers: ['admin', 'trainer']
  },
  {
    id: 'c7',
    title: 'SAP PM (Plant Maintenance)',
    module: 'Maintenance',
    image: '/services/functional modules/pm.png',
    shortDesc: 'Equipment maintenance and operations management.',
    fullDesc: 'Manage and maintain enterprise assets efficiently. Learn preventive maintenance, breakdown maintenance, and clearance management in SAP.',
    benefits: ['Real-time project exposure', 'Configuration Guides'],
    jobs: ['SAP PM Consultant', 'Maintenance Planner', 'EAM Consultant'],
    servers: ['SAP S/4HANA 2023'],
    trainers: ['trainer']
  },
  {
    id: 'c8',
    title: 'SAP TRM (Treasury and Risk Management)',
    module: 'Finance',
    image: '/services/functional modules/trm.png',
    shortDesc: 'Advanced financial supply chain and risk management.',
    fullDesc: 'Specialize in SAP Treasury. Learn cash and liquidity management, in-house cash, and risk analyzers to manage financial assets and mitigate risks.',
    benefits: ['Advanced certification assistance', 'Mock interviews', 'Resume building'],
    jobs: ['SAP TRM Consultant', 'Treasury Analyst', 'Financial Risk Manager'],
    servers: ['SAP S/4HANA 2023'],
    trainers: ['admin']
  }
];

export const MOCK_MEETINGS = [
  { id: 'm1', title: 'SAP FICO Week 3 Live', module: 'SAP FICO', hostId: 'trainer', date: '25 Aug 2024', time: '10:00 AM', duration: '2 hours', link: 'https://zoom.us/j/123456789', status: 'upcoming' },
  { id: 'm2', title: 'SAP MM Interview Prep', module: 'SAP MM', hostId: 'admin', date: '26 Aug 2024', time: '3:00 PM', duration: '1.5 hours', link: 'https://meet.google.com/abc-defg-hij', status: 'upcoming' },
];

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [posts, setPosts] = useState(MOCK_POSTS);
  const [courses, setCourses] = useState(MOCK_COURSES);
  const [meetings, setMeetings] = useState(MOCK_MEETINGS);
  const [chatMessages, setChatMessages] = useState(MOCK_MESSAGES);
  const [users, setUsers] = useState(MOCK_USERS);
  const [userProfileToView, setUserProfileToView] = useState(null);
  const [profilePicToView, setProfilePicToView] = useState(null);

  const viewUserProfile = (userId) => {
    const user = Object.values(users).find(u => u.id === userId);
    if (user) setUserProfileToView(user);
  };
  const closeUserProfile = () => setUserProfileToView(null);

  const viewProfilePic = (userOrGroup) => {
    if (userOrGroup) setProfilePicToView(userOrGroup);
  };
  const closeProfilePic = () => setProfilePicToView(null);

  const login = (email, password, asImpersonateId = null) => {
    let userToLogin = null;
    
    if (asImpersonateId) {
      userToLogin = Object.values(users).find(u => u.id === asImpersonateId);
      if (userToLogin) {
        setCurrentUser({ ...userToLogin, isImpersonating: true, originalUser: currentUser });
        return true;
      }
      return false;
    }

    if (email === users.superadmin.email && password === users.superadmin.password) userToLogin = users.superadmin;
    else if (email === 'admin2@ssr.com' && password === 'Ssrbs@2020') userToLogin = users.admin;
    else if (email === 'employee@ssr.com' && password === 'emp123') userToLogin = users.employee;
    else if (email === 'trainer@ssr.com' && password === 'trainer123') userToLogin = users.trainer;
    else if (email === 'participant@ssr.com' && password === 'part123') userToLogin = users.participant;
    else {
      // Find dynamically created user
      userToLogin = Object.values(users).find(u => u.email === email && (u.password === password || password.length >= 6));
    }
    
    if (userToLogin) {
      // Check login rate limit
      const today = new Date().toLocaleDateString();
      const loginStats = JSON.parse(localStorage.getItem('ssr_login_stats') || '{}');
      if (loginStats.date !== today) {
        loginStats.date = today;
        loginStats.count = 0;
      }
      if (loginStats.count >= 15) {
        alert('Login limit exceeded for today (15 logins max).');
        return false;
      }
      loginStats.count += 1;
      localStorage.setItem('ssr_login_stats', JSON.stringify(loginStats));

      setCurrentUser(userToLogin);
      setSelectedRole(userToLogin.role);
      sessionStorage.setItem('ssr_app_user', JSON.stringify(userToLogin));
      return true;
    }
    return false;
  };

  const signup = (name, email, password, category) => {
    // Generate a mock user dynamically
    const roleMap = {
      'User': 'Participant',
      'Trainer': 'Trainer',
      'Employee': 'Employee'
    };
    
    const newUser = {
      id: `new_${Date.now()}`,
      name: name || 'New User',
      email: email,
      role: roleMap[category] || 'Participant',
      initials: (name || 'N').charAt(0).toUpperCase(),
      color: '#0A6ED1'
    };
    
    // In a real app we'd save this to a DB, but here we just log them in
    setUsers(prev => ({ ...prev, [newUser.id]: newUser }));
    setMutableChats(prev => prev.map(c => ({
      ...c,
      participants: [...(c.participants || []), newUser.id]
    })));
    setCurrentUser(newUser);
    setSelectedRole(newUser.role);
    sessionStorage.setItem('ssr_app_user', JSON.stringify(newUser));
    return true;
  };

  const endImpersonation = () => {
    if (currentUser?.isImpersonating && currentUser.originalUser) {
      setCurrentUser(currentUser.originalUser);
    }
  };

  const logout = () => { setCurrentUser(null); setSelectedRole(null); };

  const toggleLike = (postId) => {
    setPosts(prev => prev.map(p => p.id !== postId ? p : { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }));
  };

  const toggleSave = (postId) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, saved: !p.saved } : p));
  };

  const deletePost = (postId) => { setPosts(prev => prev.filter(p => p.id !== postId)); };

  const addPost = (post) => {
    // Check post rate limit
    const today = new Date().toLocaleDateString();
    const postStats = JSON.parse(localStorage.getItem('ssr_post_stats') || '{}');
    if (postStats.date !== today) {
      postStats.date = today;
      postStats.count = 0;
    }
    if (postStats.count >= 10) {
      alert('Post limit exceeded for today (10 posts max).');
      return false;
    }
    postStats.count += 1;
    localStorage.setItem('ssr_post_stats', JSON.stringify(postStats));

    setPosts(prev => [post, ...prev]); 
    return true;
  };

  const addComment = (postId, text) => {
    if (!currentUser || !text.trim()) return;
    const comment = { id: `c${Date.now()}`, authorId: currentUser.id, authorName: currentUser.name, authorInitials: currentUser.initials, authorColor: currentUser.color, text: text.trim(), time: 'Just now' };
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: [...p.comments, comment] } : p));
  };

  const deleteComment = (postId, commentId) => {
    setPosts(prev => prev.map(p => p.id !== postId ? p : { ...p, comments: p.comments.filter(c => c.id !== commentId) }));
  };

  const deleteMessages = (chatId, msgIds, forEveryone) => {
    setChatMessages(prev => {
      const msgs = prev[chatId] || [];
      return {
        ...prev,
        [chatId]: msgs.map(m => {
          if (msgIds.includes(m.id)) {
            if (forEveryone) {
              return { ...m, isDeletedForEveryone: true, text: '🚫 This message was deleted', attachment: null };
            }
            return { ...m, isDeletedForMe: true };
          }
          return m;
        }).filter(m => !m.isDeletedForMe)
      };
    });
  };

  const editMessage = (chatId, msgId, newText) => {
    setChatMessages(prev => {
      const msgs = prev[chatId] || [];
      return {
        ...prev,
        [chatId]: msgs.map(m => m.id === msgId ? { ...m, text: newText.trim(), edited: true } : m)
      };
    });
  };

  const forwardMessages = (msgIds, sourceChatId, targetChatId) => {
    // Basic mock logic: just copy the messages to the target chat
    setChatMessages(prev => {
      const sourceMsgs = prev[sourceChatId] || [];
      const msgsToForward = sourceMsgs.filter(m => msgIds.includes(m.id)).map(m => ({
        ...m,
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isMe: true, // I am forwarding it
        senderName: currentUser.name,
        senderInitials: currentUser.initials,
        senderColor: currentUser.color
      }));
      
      const targetMsgs = prev[targetChatId] || [];
      return {
        ...prev,
        [targetChatId]: [...targetMsgs, ...msgsToForward]
      };
    });
  };

  const sendChatMessage = (chatId, text, replyTo = null, attachment = null) => {
    if (!currentUser || (!text?.trim() && !attachment)) return;
    const msg = { 
      id: `m${Date.now()}`, 
      senderId: currentUser.id, 
      senderName: currentUser.name, 
      senderInitials: currentUser.initials, 
      senderColor: currentUser.color, 
      text: text?.trim() || '', 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
      timestamp: Date.now(),
      isMe: true, 
      replyTo: replyTo ? { id: replyTo.id, text: replyTo.text, senderName: replyTo.isMe ? 'You' : replyTo.senderName } : null,
      attachment,
      status: 'sent'
    };
    setChatMessages(prev => ({ ...prev, [chatId]: [...(prev[chatId] || []), msg] }));
  };

  const toggleCourseSave = (courseId) => {
    setCourses(prev => prev.map(c => c.id === courseId ? { ...c, saved: !c.saved } : c));
  };

  const addCourse = (course) => {
    const newCourse = { 
      ...course, 
      id: `c${Date.now()}`, 
      saved: false,
      trainers: ['admin'],
      benefits: course.benefits || [],
      jobs: course.jobs || [],
      servers: course.servers || []
    };
    setCourses(prev => [newCourse, ...prev]);
    // Also auto-post to feed
    const feedPost = {
      id: `p${Date.now()}`,
      authorId: currentUser?.id || 'u1',
      authorName: currentUser?.name || 'Rahul Sharma',
      authorRole: currentUser?.role || 'Admin',
      authorInitials: currentUser?.initials || 'RS',
      authorColor: currentUser?.color || '#0A6ED1',
      tag: 'Announcement',
      category: 'Announcements',
      title: `New Service: ${course.title}`,
      content: course.shortDesc || course.fullDesc || '',
      banner: null,
      likes: 0, saved: false, liked: false,
      createdAt: 'Just now',
      comments: []
    };
    setPosts(prev => [feedPost, ...prev]);
  };

  const deleteCourse = (courseId) => {
    setCourses(prev => prev.filter(c => c.id !== courseId));
  };

  const deleteUser = (userId) => {
    setUsers(prev => {
      const next = { ...prev };
      const key = Object.keys(next).find(k => next[k].id === userId);
      if (key) delete next[key];
      return next;
    });
  };

  const restrictUser = (userId) => {
    setUsers(prev => {
      const next = { ...prev };
      const key = Object.keys(next).find(k => next[k].id === userId);
      if (key) next[key] = { ...next[key], restricted: !next[key].restricted };
      return next;
    });
  };

  const addEmployee = (employeeData) => {
    const id = `emp_${Date.now()}`;
    const key = `emp_${id}`;
    const newEmp = {
      id,
      name: employeeData.name,
      email: employeeData.email,
      password: employeeData.password || 'welcome123',
      role: 'Employee',
      initials: employeeData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      color: '#475569',
      permissions: employeeData.permissions || [],
      createdAt: new Date().toLocaleDateString(),
      online: false,
      restricted: false,
    };
    setUsers(prev => ({ ...prev, [key]: newEmp }));
  };

  const updateEmployeeProfile = (userId, updates) => {
    setUsers(prev => {
      const userKey = Object.keys(prev).find(k => prev[k].id === userId);
      if (!userKey) return prev;
      
      const newInitials = updates.name 
        ? updates.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) 
        : prev[userKey].initials;

      return { 
        ...prev, 
        [userKey]: { 
          ...prev[userKey], 
          ...updates, 
          initials: newInitials 
        } 
      };
    });
  };

  const updateUserPermissions = (userId, permissions) => {
    setUsers(prev => {
      const next = { ...prev };
      const key = Object.keys(next).find(k => next[k].id === userId);
      if (key) next[key] = { ...next[key], permissions };
      return next;
    });
  };

  const deleteChatMedia = (chatId, messageId) => {
    setChatMessages(prev => {
      const msgs = prev[chatId] || [];
      return {
        ...prev,
        [chatId]: msgs.map(m => m.id === messageId ? { ...m, attachment: null } : m).filter(m => m.text || m.attachment)
      };
    });
  };

  const [autoDownloadMedia, setAutoDownloadMedia] = useState(false);
  const [targetChat, setTargetChat] = useState(null); // { chatId, msgId }
  const [mutableChats, setMutableChats] = useState(MOCK_CHATS);

  const updateChat = (chatId, updates) => {
    setMutableChats(prev => prev.map(c => c.id === chatId ? { ...c, ...updates } : c));
  };

  const addMeeting = (meeting) => { setMeetings(prev => [meeting, ...prev]); };

  return (
    <AppContext.Provider value={{ 
      currentUser, login, signup, logout, endImpersonation, selectedRole, setSelectedRole, 
      posts, toggleLike, toggleSave, addComment, deleteComment, deletePost, addPost,
      chats: mutableChats,
      setChats: setMutableChats,
      updateChat,
      chatMessages,
      sendChatMessage,
      deleteMessages,
      editMessage,
      forwardMessages,
      deleteChatMedia,
      courses, toggleCourseSave, addCourse, deleteCourse,
      meetings, addMeeting,
      users,
      deleteUser, restrictUser, addEmployee, updateUserPermissions, updateEmployeeProfile,
      autoDownloadMedia, setAutoDownloadMedia,
      targetChat, setTargetChat,
      userProfileToView,
      viewUserProfile,
      closeUserProfile,
      profilePicToView,
      viewProfilePic,
      closeProfilePic
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
