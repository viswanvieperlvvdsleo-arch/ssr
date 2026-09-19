export function usesAdminPortal(user) {
  // Super Admin uses the main /ssr-app/home (full control)
  // Admin and company Employees use /ssr-app/admin/home
  if (!user) return false;
  if (user.role === 'Super Admin') return false;
  return user.role === 'Admin' || user.role === 'Employee';
}

export function portalHome(user) {
  if (!user) return '/ssr-app';
  if (user.role === 'Super Admin') return '/ssr-app/home';
  return usesAdminPortal(user) ? '/ssr-app/admin/home' : '/ssr-app/home';
}

