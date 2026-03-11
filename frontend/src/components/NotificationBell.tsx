import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

interface Notification {
    id: string;
    type: string;
    title: string;
    body: string;
    isRead: boolean;
    createdAt: string;
}

function timeAgo(isoDate: string): string {
    const diff = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data.notifications);
            setUnreadCount(res.data.unreadCount);
        } catch { /* silent */ }
    };

    const markAllRead = async () => {
        try {
            await api.post('/notifications/read-all');
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch { /* silent */ }
    };

    // Fetch on mount and poll every 30s
    useEffect(() => {
        fetchNotifications();
        const id = setInterval(fetchNotifications, 30_000);
        return () => clearInterval(id);
    }, []);

    // Close panel when clicking outside
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        if (open) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const handleOpen = () => {
        setOpen(v => !v);
        if (!open && unreadCount > 0) markAllRead();
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell Button */}
            <button
                onClick={handleOpen}
                className="relative flex items-center justify-center w-9 h-9 rounded-full border border-neutral-700/60 bg-neutral-900/70 hover:border-emerald-400/40 transition-all duration-200"
                aria-label="Notifications"
            >
                <svg className="w-4.5 h-4.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[0.6rem] font-bold text-black shadow-lg shadow-emerald-500/50">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Panel */}
            {open && (
                <div className="absolute right-0 mt-2 w-80 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* glow */}
                    <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-emerald-500/5 to-emerald-500/20 opacity-70 blur-lg" />
                    <div className="relative rounded-2xl border border-neutral-700/70 bg-neutral-900/95 backdrop-blur-xl shadow-2xl overflow-hidden">

                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
                            <span className="text-sm font-semibold text-white">Notifications</span>
                            {notifications.some(n => !n.isRead) && (
                                <button
                                    onClick={markAllRead}
                                    className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>

                        {/* List */}
                        <div className="max-h-80 overflow-y-auto divide-y divide-neutral-800/60">
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-neutral-500">
                                    <svg className="w-8 h-8 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                    <p className="text-sm">No notifications yet</p>
                                </div>
                            ) : (
                                notifications.map(n => (
                                    <div
                                        key={n.id}
                                        className={`px-4 py-3 transition-colors ${n.isRead ? 'opacity-60' : 'bg-emerald-500/5'}`}
                                    >
                                        <div className="flex items-start gap-2">
                                            {!n.isRead && (
                                                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                                            )}
                                            <div className={!n.isRead ? '' : 'ml-3.5'}>
                                                <p className="text-xs font-medium text-neutral-200 leading-snug">{n.title}</p>
                                                <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{n.body}</p>
                                                <p className="text-[0.65rem] text-neutral-600 mt-1">{timeAgo(n.createdAt)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
