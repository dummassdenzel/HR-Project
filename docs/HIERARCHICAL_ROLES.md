# Hierarchical Role System

## Problem Fixed

**Before:** Role checks used strict equality
- `requireUserWithRole(event, 'manager')` only allowed managers
- HR admins couldn't access manager pages
- Managers couldn't access employee pages

**After:** Role checks use hierarchy
- `requireUserWithRole(event, 'manager')` allows managers AND hr_admin
- HR admins can access all pages
- Managers can access employee pages
- Matches real-world HR SaaS behavior

## Role Hierarchy

```typescript
const ROLE_LEVEL: Record<MembershipRole, number> = {
  employee: 1,    // Lowest level
  manager: 2,     // Middle level
  hr_admin: 3     // Highest level
};
```

## Access Matrix

| User Role | Can Access |
|-----------|------------|
| `hr_admin` | `/app/admin`, `/app/manager`, `/app/member` |
| `manager` | `/app/manager`, `/app/member` |
| `employee` | `/app/member` only |

## How It Works

### `requireUserWithRole(event, requiredRole)`

Checks if user's role level >= required role level:

```typescript
const userLevel = ROLE_LEVEL[user.current_role];      // e.g., 3 for hr_admin
const requiredLevel = ROLE_LEVEL[requiredRole];       // e.g., 2 for manager

if (userLevel < requiredLevel) {
  throw error(403, 'Forbidden');
}
```

### Examples

**Example 1: Manager accessing `/app/manager`**
- User role: `manager` (level 2)
- Required: `manager` (level 2)
- Check: `2 >= 2` ✅ Allowed

**Example 2: HR Admin accessing `/app/manager`**
- User role: `hr_admin` (level 3)
- Required: `manager` (level 2)
- Check: `3 >= 2` ✅ Allowed

**Example 3: Employee accessing `/app/manager`**
- User role: `employee` (level 1)
- Required: `manager` (level 2)
- Check: `1 >= 2` ❌ Forbidden (403)

## Route Protection

### `/app/admin/+layout.server.ts`
```typescript
requireUserWithRole(event, 'hr_admin')
```
- Allows: `hr_admin` only (level 3 >= 3)
- Blocks: `manager`, `employee`

### `/app/manager/+layout.server.ts`
```typescript
requireUserWithRole(event, 'manager')
```
- Allows: `hr_admin` (level 3 >= 2), `manager` (level 2 >= 2)
- Blocks: `employee` (level 1 < 2)

### `/app/member/+layout.server.ts`
```typescript
requireUserWithRole(event, 'employee')
```
- Allows: All roles (all levels >= 1)
- Blocks: None (if authenticated with org)

## Dashboard Redirect

`/app/dashboard` now acts as a resolver:

```typescript
if (user.current_role === 'hr_admin') {
  throw redirect(303, '/app/admin');
}
if (user.current_role === 'manager') {
  throw redirect(303, '/app/manager');
}
// Default to member
throw redirect(303, '/app/member');
```

**Flow:**
1. User signs in → `/app/dashboard`
2. Dashboard checks role → Redirects to appropriate area
3. Role-based layout enforces access

## Benefits

### ✅ Realistic Behavior
- HR admins can access all areas (as they should)
- Managers can access employee areas (for oversight)
- Matches real HR SaaS expectations

### ✅ No Duplicate Routes
- Don't need `/app/admin/manager` routes
- HR admins just use `/app/manager` directly
- Cleaner route structure

### ✅ Flexible
- Easy to add new roles (just add to `ROLE_LEVEL`)
- Easy to adjust hierarchy (change level numbers)
- Works with existing route structure

### ✅ Secure
- Still enforces minimum role level
- Lower roles can't access higher areas
- Database RLS + Server guards + Route structure

## When to Use Strict vs Hierarchical

### Use Hierarchical (Default)
- Most route protection: `/app/admin`, `/app/manager`, `/app/member`
- General feature access
- Most common use case

### Use Strict Equality (If Needed)
- Specific admin-only actions
- Role-specific settings pages
- Use `requireRole(user, 'hr_admin')` directly

## Future Enhancements

If you need more complex permissions later:
- Add `requireRoleOrHigher()` function (already implemented)
- Add permission matrix table
- Add role inheritance rules

But for now, the hierarchy covers 99% of use cases.

