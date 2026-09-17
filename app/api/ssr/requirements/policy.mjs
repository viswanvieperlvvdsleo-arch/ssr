export function requirementScope(actor) {
  if (!actor || actor.restricted) return null;
  if (['Super Admin', 'Admin', 'Employee'].includes(actor.role)) return {};
  if (actor.companyId) return { companyId: actor.companyId };
  return { senderId: actor.id };
}

export function canSubmitRequirement(actor) {
  if (!actor || actor.restricted) return false;
  if (['Super Admin', 'Admin', 'Participant', 'Trainer'].includes(actor.role)) return true;
  if (actor.role === 'Employee') {
    return !actor.companyId || actor.permissions?.some(permission => ['post_feeds', 'all_access'].includes(permission));
  }
  return true;
}

