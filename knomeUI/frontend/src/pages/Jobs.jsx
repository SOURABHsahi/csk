import React, { useState } from 'react';
import { useUser } from '../components/contexts/UserContext';
import CreateJobModal from '../components/modals/CreateJobModal';

export default function Jobs() {
    const { currentUser } = useUser();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState('All Roles');

    // HR Admins and System Admins can post jobs
    const canPostJobs = currentUser.role === 'HRADM' || currentUser.role === 'SYSADM';

    const filters = ['All Roles', 'Engineering', 'Design', 'Marketing', 'Product'];

    const mockJobs = [
        {
            id: 1,
            title: 'Senior Principal Product Designer',
            department: 'Design',
            team: 'Product Experience',
            location: 'Remote / NYC',
            posted: '2 days ago',
            closes: 'Oct 30, 2024',
            skills: ['Design Systems', 'Strategy', 'Figma'],
            isFeatured: true,
            isExpired: false,
            link: 'https://workday.example.com/apply/1'
        },
        {
            id: 2,
            title: 'Full Stack Engineer (L5)',
            department: 'Engineering',
            team: 'Infrastructure & DevTools',
            location: 'London, UK (Hybrid)',
            posted: '4 days ago',
            closes: 'Nov 15, 2024',
            skills: ['React', 'Node.js', 'Go', 'Docker'],
            isFeatured: false,
            isExpired: false,
            link: 'https://workday.example.com/apply/2'
        },
        {
            id: 3,
            title: 'Product Marketing Manager',
            department: 'Marketing',
            team: 'Growth & Acquisition',
            location: 'San Francisco, CA',
            posted: '1 week ago',
            closes: 'Nov 05, 2024',
            skills: ['Go-to-Market', 'Analytics', 'Copywriting'],
            isFeatured: false,
            isExpired: false,
            link: 'https://workday.example.com/apply/3'
        },
        {
            id: 4,
            title: 'Staff Machine Learning Engineer',
            department: 'Engineering',
            team: 'Core AI',
            location: 'Remote',
            posted: '2 weeks ago',
            closes: 'Oct 01, 2023',
            skills: ['Python', 'TensorFlow', 'LLMs'],
            isFeatured: false,
            isExpired: true, // FR-JB-03
            link: 'https://workday.example.com/apply/4'
        }
    ];

    const displayedJobs = mockJobs.filter(job => activeFilter === 'All Roles' || job.department === activeFilter);

    // FR-JB-04 (Simulating a recommendation match based on user's department)
    const recommendedJobs = mockJobs.filter(job => job.department === currentUser.department && !job.isExpired);

    return (
        <>
            <main className="flex-1 flex flex-col gap-8 pb-32">
                
                {/* Hero Header */}
                <div className="relative rounded-2xl overflow-hidden mb-8 shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between text-left px-6 py-8 md:px-10 md:py-8 gap-6">
                    {/* Background effects */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,_var(--tw-gradient-stops))] from-teal-100/50 dark:from-teal-900/20 via-transparent to-transparent pointer-events-none"></div>
                    <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-32 bg-teal-400/10 dark:bg-teal-500/10 blur-[80px] pointer-events-none"></div>
                    
                    {/* Light Streaks behind text */}
                    <div className="absolute top-[35%] left-0 w-[60%] h-[1px] bg-gradient-to-r from-teal-300/40 dark:from-teal-400/20 to-transparent"></div>
                    <div className="absolute top-[50%] left-0 w-[40%] h-[2px] bg-gradient-to-r from-emerald-300/40 dark:from-emerald-400/20 to-transparent blur-[1px]"></div>
                    <div className="absolute top-[65%] left-0 w-[50%] h-[1px] bg-gradient-to-r from-green-300/40 dark:from-green-400/20 to-transparent"></div>

                    {/* Content Left */}
                    <div className="relative z-10 flex flex-col items-start max-w-3xl">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-teal-500/30 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-[11px] font-bold mb-3 backdrop-blur-md uppercase tracking-wider">
                            ✨ Empowering MPOnline Teams
                        </div>
                        
                        <h1 className="text-3xl md:text-4xl lg:text-[40px] font-black tracking-tight mb-3 text-slate-900 dark:text-white" style={{ lineHeight: '1.2' }}>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 dark:from-teal-400 dark:via-emerald-400 dark:to-green-400">
                                Discover Your Next Career Move
                            </span>
                        </h1>

                        <p className="text-slate-600 dark:text-slate-400 text-sm md:text-[15px] font-medium leading-relaxed max-w-2xl">
                            Explore internal opportunities, grow your skills, and take the next step in your career journey within Knome.
                        </p>
                    </div>

                    {/* Action Right */}
                    <div className="relative z-10 shrink-0 flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                        <button className="w-full sm:w-auto px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">filter_list</span>
                            Advanced Filters
                        </button>
                        {canPostJobs && (
                            <button 
                                onClick={() => setIsCreateOpen(true)}
                                className="w-full sm:w-auto px-6 py-3 bg-teal-500 text-white font-bold rounded-xl hover:bg-teal-600 transition-colors shadow-lg shadow-teal-500/30 flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[20px]">add</span>
                                Post New Job
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters (FR-JB-02) */}
                <div className="flex overflow-x-auto custom-scrollbar pb-2 gap-3 border-b border-slate-200 dark:border-slate-800">
                    {filters.map(filter => (
                        <button 
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`px-5 py-2.5 rounded-full font-bold text-[13px] whitespace-nowrap transition-all border ${activeFilter === filter ? 'bg-teal-500 border-teal-500 text-white shadow-md shadow-teal-500/20' : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-teal-300 dark:hover:border-teal-700 hover:text-teal-500'}`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>

                {/* Recommendations (FR-JB-04) */}
                {activeFilter === 'All Roles' && recommendedJobs.length > 0 && (
                    <section className="mb-4">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-amber-500">hotel_class</span>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white">Recommended for You</h2>
                        </div>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {recommendedJobs.map(job => (
                                <JobCard key={job.id} job={job} />
                            ))}
                        </div>
                    </section>
                )}

                {/* All Jobs */}
                <section>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white mb-6">
                        {activeFilter === 'All Roles' ? 'Recently Posted' : `${activeFilter} Roles`}
                    </h2>
                    
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {displayedJobs.map(job => (
                            <JobCard key={job.id} job={job} />
                        ))}
                    </div>
                </section>

            </main>

            <CreateJobModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
        </>
    );
}

// Sub-component for rendering the individual job card
function JobCard({ job }) {
    return (
        <div className={`group glass card-lift bg-white dark:bg-slate-900 rounded-3xl border p-6 flex flex-col md:flex-row gap-6 relative overflow-hidden transition-all duration-300 ${job.isExpired ? 'opacity-60 grayscale-[50%] pointer-events-none border-slate-200 dark:border-slate-800' : 'border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg'}`}>
            
            {/* Badges */}
            <div className="absolute top-4 right-4 flex gap-2">
                {job.isExpired ? (
                    <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                        Closed
                    </span>
                ) : job.isFeatured ? (
                    <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-amber-200 dark:border-amber-800/50">
                        <span className="material-symbols-outlined text-[12px]">star</span> Featured
                    </span>
                ) : null}
            </div>

            {/* Icon */}
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${job.isExpired ? 'bg-slate-100 dark:bg-slate-800' : 'bg-teal-50 dark:bg-teal-900/20'}`}>
                <span className={`material-symbols-outlined text-[32px] ${job.isExpired ? 'text-slate-400' : 'text-teal-500'}`}>
                    {job.department === 'Design' ? 'palette' : job.department === 'Engineering' ? 'terminal' : job.department === 'Marketing' ? 'campaign' : 'work'}
                </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <h3 className={`font-black text-[18px] mb-2 leading-tight pr-24 ${job.isExpired ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-white group-hover:text-teal-500 transition-colors'}`}>
                    {job.title}
                </h3>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-[12px] font-bold text-slate-500">
                    <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">apartment</span> {job.team}</span>
                    <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">location_on</span> {job.location}</span>
                    <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">calendar_today</span> Closes: {job.closes}</span>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                    {job.skills.map((skill, idx) => (
                        <span key={idx} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-lg text-[11px] font-bold">
                            {skill}
                        </span>
                    ))}
                </div>

                {/* Actions (FR-JB-05) */}
                <div className="flex items-center gap-3 mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                    <a 
                        href={job.link}
                        target="_blank"
                        rel="noreferrer"
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[13px] transition-colors ${job.isExpired ? 'bg-slate-200 dark:bg-slate-800 text-slate-400' : 'bg-teal-500 text-white hover:bg-teal-600 shadow-md shadow-teal-500/20'}`}
                    >
                        {job.isExpired ? 'Application Closed' : 'Apply via HRMS'}
                        {!job.isExpired && <span className="material-symbols-outlined text-[16px]">open_in_new</span>}
                    </a>
                    {!job.isExpired && (
                        <button className="w-11 h-11 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title="Save Role">
                            <span className="material-symbols-outlined text-[20px]">bookmark_border</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
