import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import PageLoader from './PageLoader';

/**
 * AuthGuard wraps all protected routes.
 * Shows a loading spinner while session is being restored.
 * Redirects to /login if not authenticated.
 */
export default function AuthGuard({ children }) {
    const { isAuthenticated, isAuthLoading } = useUser();

    if (isAuthLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center"
                style={{ background: 'var(--bg-base)' }}>
                <div className="flex flex-col items-center gap-4">
                    {/* Animated logo mark */}
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg animate-pulse"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #ec4899)' }}>
                        <span className="material-symbols-outlined text-white text-[32px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <p className="text-[14px] font-bold" style={{ color: 'var(--text-secondary)' }}>
                            Loading Knome...
                        </p>
                        <div className="flex gap-1 mt-1">
                            {[0, 1, 2].map(i => (
                                <div key={i}
                                    className="w-1.5 h-1.5 rounded-full animate-bounce"
                                    style={{
                                        background: '#6366f1',
                                        animationDelay: `${i * 0.15}s`,
                                    }} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
}
