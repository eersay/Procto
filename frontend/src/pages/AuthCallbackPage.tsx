import { useEffect, useState } from 'react';

/**
 * Google OAuth callback landing page.
 * Backend redirects here with ?token=JWT&refresh=JWT&user=JSON&next=/student|/faculty
 * Stores credentials then does a hard redirect to the dashboard.
 */
export default function AuthCallbackPage() {
    const [err, setErr] = useState('');

    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const oauthErr = params.get('error');
            if (oauthErr) { window.location.replace('/login?error=oauth'); return; }

            const token = params.get('token');
            const refresh = params.get('refresh');
            const userRaw = params.get('user');  // URLSearchParams already decodes %XX
            const next = params.get('next') || '/student';

            if (!token || !userRaw) {
                setErr(`Missing params — token:${!!token} user:${!!userRaw}`);
                setTimeout(() => { window.location.replace('/login?error=oauth'); }, 3000);
                return;
            }

            const user = JSON.parse(userRaw);
            localStorage.setItem('accessToken', token);
            localStorage.setItem('user', JSON.stringify(user));
            if (refresh) localStorage.setItem('refreshToken', refresh);

            // Hard redirect — bypasses React Router and avoids navigate() quirks
            window.location.replace(next);
        } catch (e) {
            setErr(`Error: ${e}`);
            setTimeout(() => { window.location.replace('/login?error=oauth'); }, 3000);
        }
    }, []);

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
            <div className="text-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900/70 ring-1 ring-emerald-400/40 shadow-lg shadow-emerald-500/30 mb-6">
                    <span className="text-2xl font-bold text-emerald-400">P</span>
                </div>
                {!err ? (
                    <div className="flex items-center justify-center gap-3">
                        <div className="animate-spin h-5 w-5 border-2 border-emerald-400 border-t-transparent rounded-full" />
                        <p className="text-slate-300 text-sm">Signing you in...</p>
                    </div>
                ) : (
                    <div className="bg-red-900/30 border border-red-500/40 rounded-xl p-5 max-w-md mx-auto">
                        <p className="text-red-400 text-xs font-mono break-all">{err}</p>
                    </div>
                )}
            </div>
        </main>
    );
}
