export function requirementScope(actor) {
  if (!actor || actor.restricted) return null;
  if (actor.companyId) return { companyId: actor.companyId };
  if (['Super Admin', 'Admin', 'Employee'].includes(actor.role)) return {};
  if (actor.role === 'Participant') return { senderId: actor.id };
  return null;
}

export function canSubmitRequirement(actor) {
  if (!actor || actor.restricted) return false;
  if (!actor.companyId) return actor.role === 'Participant';
  return actor.role === 'Admin' || (actor.role === 'Employee' &&
    actor.permissions?.some(permission => ['post_feeds', 'all_access'].includes(permission)));
}
