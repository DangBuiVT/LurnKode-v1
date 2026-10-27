// TODO: UserRole: union/enum `Admin` | `Instructor` | `Learner`, thống nhất casing với JWT/M2.
// TODO: AuthPrincipal: userId UUID, role, issuer/audience và claims đã verify cần thiết.
// TODO: AccessTokenClaims: sub, role, iss, aud, iat, exp, jti; không coi type assertion là bước verify.
// TODO: PublicUser: profile fields được phép trả; tuyệt đối không gồm password hash/session/token.
// TODO: RefreshSessionRecord: internal DB record chứa hash/state, không chứa raw token.
