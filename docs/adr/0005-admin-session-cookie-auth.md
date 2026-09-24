# Admin HTTP uses a session cookie, not `ADMIN_API_SECRET`

Browser admin routes under `/api/v1/admin/*` authenticate with an httpOnly `Secure` `SameSite=Strict` cookie (~12h) after email-allowlist + shared password login. The previous Bearer `ADMIN_API_SECRET` door is removed so the long-lived machine secret never ends up in the SPA. Prefer hashing `ADMIN_PASSWORD` in env once more than one operator shares access (documented; plain env is v1).
