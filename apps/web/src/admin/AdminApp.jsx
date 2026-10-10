import { useCallback, useEffect, useState } from 'react';
import { adminApi } from './api';
import AdminSidebar from './components/AdminSidebar';
import AdminTopbar from './components/AdminTopbar';
import AdminConfigsPage from './pages/AdminConfigsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminInvitesPage from './pages/AdminInvitesPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminQuotesPage from './pages/AdminQuotesPage';
import AdminReviewsPage from './pages/AdminReviewsPage';

export default function AdminApp() {
  const [session, setSession] = useState(null);
  const [booting, setBooting] = useState(true);
  const [page, setPage] = useState('summary');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quotes, setQuotes] = useState([]);
  const [invites, setInvites] = useState([]);
  const [reviews, setReviews] = useState([]);

  const refresh = useCallback(async () => {
    const [quoteData, inviteData, reviewData] = await Promise.all([
      adminApi.listQuotes(),
      adminApi.listInvites(),
      adminApi.listReviews()
    ]);
    setQuotes(quoteData.items || []);
    setInvites(inviteData.items || []);
    setReviews(reviewData.items || []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .me()
      .then(async (me) => {
        if (cancelled) return;
        setSession(me);
        await refresh();
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setBooting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const login = async (credentials) => {
    const response = await adminApi.login(credentials);
    setSession(response);
    await refresh();
  };

  const logout = async () => {
    try {
      await adminApi.logout();
    } finally {
      setSession(null);
      setQuotes([]);
      setInvites([]);
      setReviews([]);
    }
  };

  const sendInvite = async (bsaleDocumentId) => {
    await adminApi.sendInvite(bsaleDocumentId);
    await refresh();
  };

  const resendInvite = async (bsaleDocumentId) => {
    await adminApi.resendInvite(bsaleDocumentId);
    await refresh();
  };

  const toggleVisibility = async (reviewId, currentlyVisible) => {
    await adminApi.setReviewHidden(reviewId, currentlyVisible);
    await refresh();
  };

  const syncProducts = async () => {
    const result = await adminApi.syncProducts();
    await refresh();
    return result;
  };

  if (booting) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f7f5ef] text-sm text-forest-500">
        Cargando admin…
      </div>
    );
  }

  if (!session) {
    return <AdminLoginPage onLogin={login} />;
  }

  return (
    <div className="min-h-screen bg-[#f7f5ef]">
      <AdminSidebar
        page={page}
        setPage={setPage}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={logout}
        email={session.email}
      />
      <main className="min-h-screen lg:ml-[282px]">
        <div className="mx-auto max-w-[1540px] p-4 sm:p-6 lg:p-8 xl:p-10">
          <AdminTopbar page={page} onMenu={() => setSidebarOpen(true)} email={session.email} />
          {page === 'summary' && (
            <AdminDashboardPage
              quotes={quotes}
              invites={invites}
              reviews={reviews}
              setPage={setPage}
            />
          )}
          {page === 'quotes' && (
            <AdminQuotesPage quotes={quotes} onSend={sendInvite} onResend={resendInvite} />
          )}
          {page === 'invites' && <AdminInvitesPage invites={invites} />}
          {page === 'reviews' && (
            <AdminReviewsPage reviews={reviews} onToggleVisibility={toggleVisibility} />
          )}
          {page === 'configs' && <AdminConfigsPage onSyncProducts={syncProducts} />}
        </div>
      </main>
    </div>
  );
}
