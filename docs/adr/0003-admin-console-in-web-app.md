# Admin console lives in `apps/web` at `/admin`

The ops UI for Review Invites and Visible Reviews is built inside the public Vite app and served at `onaexperiences.com/admin` on the existing Vercel project (root `apps/web`), copying look-and-feel from the sibling `ona-admin-panel` prototype rather than deploying that repo. A separate Vercel project or `admin.` subdomain can wait; path-based shipping keeps one deploy and one API while we present the work.
