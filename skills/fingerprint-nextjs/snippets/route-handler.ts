// app/api/login/route.ts — the first protected Route Handler. Once it works, offer the same file for
// the other sensitive endpoints the app has, each wrapped with withVerifiedEvent:
//   app/api/signup/route.ts          refuse or flag when an account already exists for visitorId
//   app/api/password-reset/route.ts  cap reset / OTP sends per visitorId (e.g. 5 per 24 h)
//   app/api/checkout/route.ts        cap orders per visitorId per day; store visitorId on the order
//   app/api/coupons/redeem/route.ts  refuse when visitorId already redeemed the code
// Route names differ per codebase — a login can be POST /api/sessions — so match on what the
// handler does, not on the path.
import { withVerifiedEvent } from '@/lib/protected-route'

export const POST = withVerifiedEvent<{ username: string; password: string; eventId?: string }>(
  async ({ body, visitorId }) => {
    // ...check credentials. Bind visitorId to the account on its first trusted login; when the
    // account has never been seen from this visitorId, step up (email / OTP) instead of letting it in.
    return Response.json({ ok: true })
  },
)
