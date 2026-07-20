import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { calculateEngagementScore } from '../../utils/engagementEngine';

export default function HotPostsWidget() {
    const navigate = useNavigate();
    const [timeWindow, setTimeWindow] = useState('Daily');

    // Mock data for hot posts pool
    const rawPosts = [
        {
            id: 1,
            title: 'Annual Tech Symposium 2026 Registration',
            author: 'Corporate Comms',
            views: 1200,
            reactions: 145,
            comments: 42,
            shares: 18,
            category: 'Announcement'
        },
        {
            id: 2,
            title: 'Quarterly Planning Session Outcomes',
            author: 'Rishikesh Ugle',
            views: 850,
            reactions: 89,
            comments: 15,
            shares: 4,
            category: 'Product'
        },
        {
            id: 3,
            title: 'Scheduled Maintenance: Core DB Cluster',
            author: 'Loveneesh Sharma',
            views: 920,
            reactions: 42,
            comments: 8,
            shares: 12,
            category: 'DevOps'
        },
        {
            id: 4,
            title: 'Welcome the new Q3 Cohort!',
            author: 'Sourabh Sahu',
            views: 600,
            reactions: 210,
            comments: 55,
            shares: 2,
            category: 'HR'
        },
        {
            id: 5,
            title: 'How to build scalable microservices (Video)',
            author: 'Mayur Verma',
            views: 450,
            reactions: 67,
            comments: 12,
            shares: 22,
            category: 'Engineering'
        },
        {
            id: 6,
            title: 'UI Design System v2.0 Released',
            author: 'Meghna Tiwari',
            views: 730,
            reactions: 112,
            comments: 34,
            shares: 15,
            category: 'Design'
        }
    ];

    // Calculate scores and sort (FR-HP-01, FR-HP-03)
    // To simulate different time windows, we might apply a multiplier or just use the same list for the prototype.
    const timeMultiplier = timeWindow === 'Daily' ? 1 : timeWindow === 'Weekly' ? 1.5 : 2;

    const rankedPosts = rawPosts
        .map(post => {
            const score = calculateEngagementScore(
                post.views * timeMultiplier, 
                post.reactions * timeMultiplier, 
                post.comments * timeMultiplier, 
                post.shares * timeMultiplier
            );
            return { ...post, score: Math.round(score) };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 5); // Top 5 only

    return (
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden"
            style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
            }}>
            {/* Accent Orb */}
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10 pointer-events-none"
                style={{background: 'radial-gradient(circle, #f97316, transparent 70%)'}}></div>
            
            <div className="flex items-center justify-between mb-5 relative">
                <h3 className="text-base font-black flex items-center gap-2" style={{color: 'var(--text-primary)'}}>
                    <span className="material-symbols-outlined text-orange-400 text-[20px]" style={{fontVariationSettings: "'FILL' 1"}}>local_fire_department</span>
                    Hot Posts
                </h3>
                {/* Mocking the 15m recalculation requirement (FR-HP-04) */}
                <div className="flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full"
                    style={{background: 'rgba(2,132,199,0.1)', border: '1px solid rgba(2,132,199,0.2)', color: '#0284C7'}}>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7] animate-pulse"></span>
                    Live
                </div>
            </div>

            {/* Time Window Toggle (FR-HP-02) */}
            <div className="flex p-1 rounded-xl mb-5 gap-1"
                style={{background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)'}}>
                {['Daily', 'Weekly', 'Monthly'].map(window => (
                    <button
                        key={window}
                        onClick={() => setTimeWindow(window)}
                        className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-all`}
                        style={timeWindow === window ? {
                            background: 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(14,165,233,0.1))',
                            border: '1px solid var(--border-mid)',
                            color: '#2563EB',
                            boxShadow: '0 2px 8px rgba(37,99,235,0.1)'
                        } : { color: 'var(--text-secondary)', border: '1px solid transparent' }}
                    >
                        {window}
                    </button>
                ))}
            </div>

            <div className="flex flex-col gap-4">
                {rankedPosts.map((post, index) => (
                    <div 
                        key={post.id} 
                        onClick={() => {
                            let artId = '1';
                            if (post.id === 2) artId = '2';
                            if (post.id === 6) artId = '3';
                            navigate(`/article-view?id=${artId}`);
                        }}
                        className="flex gap-3 group cursor-pointer p-2 rounded-xl transition-all hover:bg-blue-500/5"
                    >
                        <div className="text-xl font-extrabold w-5 shrink-0 leading-none mt-0.5 text-[#0284C7]">
                            {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-[13px] font-bold leading-relaxed mb-1 group-hover:text-[#2563EB] transition-colors" style={{color: 'var(--text-primary)'}}>
                                {post.title}
                            </h4>
                            <div className="flex items-center justify-between">
                                <p className="text-[11px] font-bold text-slate-500 truncate pr-2">
                                    {post.author}
                                </p>
                                <div className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md shrink-0"
                                    style={{background: 'rgba(2,132,199,0.1)', color: '#0284C7', border: '1px solid rgba(2,132,199,0.2)'}}>
                                    <span className="material-symbols-outlined text-[12px]">trending_up</span>
                                    {post.score.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <button className="w-full mt-5 py-2.5 rounded-xl font-bold text-[12px] transition-all hover:-translate-y-0.5"
                style={{background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', color: '#2563EB'}}>
                View Full Leaderboard
            </button>
        </div>
    );
}

