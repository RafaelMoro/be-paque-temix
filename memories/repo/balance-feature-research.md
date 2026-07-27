# Balance feature — non-obvious repo constraints (research)

Captured while researching the balance feature. Reusable for any user-scoped feature.

- **JWT payload has no `userId`/`sub`.** `request.user` is `PayloadToken { email, name, lastName, role: Role[] }` (`src/auth/auth.interface.ts`, JwtStrategy returns payload unchanged). Identity is keyed by **email**. The established pattern is `getUserId()` = `req.user.email → UsersService.findByEmail → dbUser._id` (see `guides-db.service.ts:599-613`). Never trust a client-supplied user id.
- **`User.role` is an array** (`role: Role[]`, `Role = 'admin' | 'user'`), property name singular `role`. Query admins with `userModel.find({ role: 'admin' })` (array-contains). In-code admin check: `req.user?.role?.includes('admin')`.
- **`UsersService` has no `findById` and no `findAdmins`** today — only `findByEmail`. New user-scoped features that email admins or resolve owner names must add these.
- **Full name = `name` + `lastName`** (no `firstName`).
- **`MailService.to` accepts string or array** — pass an array of admin emails to notify all admins. Only `sendUserForgotPasswordEmail` exists today; templates live in `emails/` (React Email, see `ResetPassword.tsx`).
- **No `userId→name` populate exists** — the analog is `.populate('deletedBy', 'name lastName')` + `resolveDeletedByName()` in guides-db. Replicate for owner-name display.
- **guides-db is the canonical template** for user/admin views, month/year `buildBaseQuery`, pagination, `KraftError`, and `{ version, data, message, error }` envelope.

Research doc: `ai-research/balance-feature-research.md`.
