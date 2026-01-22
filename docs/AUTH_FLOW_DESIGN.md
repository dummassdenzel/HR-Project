# Auth & Organization Flow Design

## Overview
Production-ready sign up, sign in, and organization creation flows with proper error handling, security, and edge case management.

## Flow Diagrams

### Sign Up Flow
```
User submits signup form
  ↓
Server validates input (email format, password strength)
  ↓
Supabase Auth creates user account
  ↓
Database trigger creates user_profile (automatic)
  ↓
User receives email verification (Supabase handles)
  ↓
After email verification OR on first login:
  ↓
Check: Does user have organization membership?
  ├─ NO → Redirect to /onboarding (create org)
  └─ YES → Redirect to /dashboard
```

### Sign In Flow
```
User submits signin form
  ↓
Server validates credentials
  ↓
Supabase Auth authenticates user
  ↓
hooks.server.ts fetches user + memberships (automatic)
  ↓
Check: Does user have organization membership?
  ├─ NO → Redirect to /onboarding (create org)
  └─ YES → Redirect to /dashboard
```

### Organization Creation Flow
```
Authenticated user submits org creation form
  ↓
Server validates:
  - Org name (required, 2-100 chars)
  - Slug generation from name (URL-safe)
  ↓
Check slug uniqueness (handle conflicts)
  ↓
Database transaction:
  1. Create organization record
  2. Create membership (user_id, org_id, role='hr_admin')
  ↓
Success → Redirect to /dashboard
Error → Return validation errors
```

## Edge Cases & Error Handling

### Sign Up Edge Cases
- **Email already exists:** Return clear error message
- **Weak password:** Validate server-side (min 8 chars, complexity)
- **Email verification required:** Supabase handles, but we show message
- **Network errors:** Graceful error handling with retry option
- **Rate limiting:** Supabase handles, but we show user-friendly message

### Sign In Edge Cases
- **Invalid credentials:** Generic error (don't reveal if email exists)
- **Email not verified:** Show verification prompt (if Supabase requires it)
- **Account disabled:** Handle Supabase account status
- **No organization:** Redirect to onboarding

### Org Creation Edge Cases
- **Slug conflict:** Auto-append number (acme-corp-2, acme-corp-3)
- **Invalid name:** Clear validation errors
- **Database transaction failure:** Rollback, return error
- **User already has org:** Allow multiple orgs (Phase 2 ready)

## Security Considerations

### Input Validation
- **Email:** Server-side validation (regex + Supabase validation)
- **Password:** Min 8 chars, enforce complexity in Phase 2
- **Org name:** Sanitize, prevent XSS, length limits
- **Slug:** URL-safe only, prevent path traversal

### Rate Limiting
- Supabase handles auth rate limiting
- Add custom rate limiting for org creation (Phase 2)

### Transaction Safety
- Org creation uses database transaction
- If membership creation fails, org creation rolls back

### Error Messages
- Never expose sensitive info (don't reveal if email exists)
- Generic errors for security, specific for validation

## Production Considerations

### Email Verification
- Supabase handles email sending
- Can configure email templates in Supabase dashboard
- Handle unverified users gracefully

### Password Reset
- Supabase handles password reset flow
- Create `/auth/reset-password` route (Phase 2)

### Invite Flow (Phase 2)
- Design for future: invite users to existing orgs
- Store invite tokens, handle acceptance

### Multi-Org Support (Phase 2)
- Current design allows multiple orgs per user
- Add org switcher UI later
- `get_user_organization()` function ready for enhancement

## Implementation Structure

```
src/routes/
├── auth/
│   ├── signup/
│   │   ├── +page.server.ts    # Signup action
│   │   └── +page.svelte       # Signup form (Phase 2)
│   ├── signin/
│   │   ├── +page.server.ts    # Signin action
│   │   └── +page.svelte       # Signin form (Phase 2)
│   └── signout/
│       └── +page.server.ts    # Signout action
├── onboarding/
│   ├── +page.server.ts        # Org creation action
│   └── +page.svelte           # Org creation form (Phase 2)
└── dashboard/
    └── +layout.server.ts       # Protected route, requires org
```

## Server Actions Design

### Sign Up Action
- Input: `{ email, password, full_name? }`
- Output: `{ success: boolean, error?: string, requiresVerification?: boolean }`
- Side effects: Creates auth user, triggers profile creation

### Sign In Action
- Input: `{ email, password }`
- Output: `{ success: boolean, error?: string }`
- Side effects: Sets session cookie, redirects based on org membership

### Sign Out Action
- Input: None
- Output: Redirects to `/login`
- Side effects: Clears session cookie

### Create Organization Action
- Input: `{ name: string }`
- Output: `{ success: boolean, error?: string, slug?: string }`
- Side effects: Creates org + membership in transaction

## Validation Functions

### Email Validation
- Server-side regex validation
- Supabase also validates
- Return clear error messages

### Password Validation (Phase 1)
- Min 8 characters
- Phase 2: Add complexity requirements

### Slug Generation
- Convert name to URL-safe slug
- Handle conflicts with auto-increment
- Max length: 50 chars

## Redirect Logic

### After Sign Up
- If email verification required → Show verification message
- If verified → Check org membership → Redirect accordingly

### After Sign In
- Check `event.locals.user.current_organization_id`
- If null → `/onboarding`
- If exists → `/dashboard`

### After Org Creation
- Always redirect to `/dashboard`
- User now has org membership

## Database Considerations

### Transactions
- Org creation must be atomic
- Use Supabase transaction or ensure both succeed

### RLS Policies
- User can only create orgs for themselves
- Membership creation enforces user_id = auth.uid()

### Indexes
- Slug index ensures fast uniqueness check
- Membership indexes support fast lookups

## Future Enhancements (Not Phase 1)

- Email verification UI
- Password reset flow
- Invite system
- Org settings page
- Multi-org switcher
- Advanced password requirements
- 2FA / SSO
- Account deletion

