import React from 'react';
import { Link } from 'react-router-dom';

export default function HRAnalytics() {
    return (
        <>
<main className="flex-1 bg-background dark:bg-surface p-margin-page overflow-x-hidden">
{/*  Header Section  */}
<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
<div>
<h1 className="font-headline-lg text-headline-lg text-on-surface dark:text-white">HR Analytics Portal
                    </h1>
<p className="font-body-lg text-body-lg text-slate-gray">Tracking organizational health and community
                        engagement metrics.</p>
</div>
<div className="flex gap-stack-sm">
<button className="flex items-center gap-2 px-4 py-2 border border-border-subtle bg-white dark:bg-charcoal-dark dark:text-white rounded-lg hover:bg-surface-container-low transition-all">
<span className="material-symbols-outlined text-[18px]">calendar_today</span>
<span className="font-label-md text-label-md">Last 30 Days</span>
</button>
<button className="flex items-center gap-2 px-4 py-2 bg-electric-blue text-white rounded-lg hover:brightness-110 transition-all">
<span className="material-symbols-outlined text-[18px]">file_download</span>
<span className="font-label-md text-label-md">Export Report</span>
</button>
</div>
</div>
{/*  Tabbed Navigation  */}
<div className="flex border-b border-border-subtle dark:border-outline-variant mb-stack-lg overflow-x-auto no-scrollbar">
<button className="px-6 py-3 border-b-2 border-electric-blue text-electric-blue font-bold whitespace-nowrap">User
                    Engagement</button>
<button className="px-6 py-3 border-b-2 border-transparent text-slate-gray font-body-md hover:text-electric-blue transition-all whitespace-nowrap">Community
                    Health</button>
<button className="px-6 py-3 border-b-2 border-transparent text-slate-gray font-body-md hover:text-electric-blue transition-all whitespace-nowrap">Content
                    Performance</button>
<button className="px-6 py-3 border-b-2 border-transparent text-slate-gray font-body-md hover:text-electric-blue transition-all whitespace-nowrap">Trending</button>
</div>
{/*  Key Metric Grid (Bento Style)  */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter mb-stack-lg">
<div className="glass-card p-stack-md rounded-xl card-shadow group hover:border-electric-blue transition-colors">
<div className="flex justify-between items-start mb-2">
<div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
<span className="material-symbols-outlined text-electric-blue">group</span>
</div>
<span className="text-teal-accent font-label-md text-label-md flex items-center">
                            +12% <span className="material-symbols-outlined text-[14px]">trending_up</span>
</span>
</div>
<p className="text-slate-gray font-label-md text-label-md mb-1">DAU</p>
<h2 className="font-headline-md text-headline-md text-on-surface dark:text-white">4,821</h2>
<p className="text-slate-gray text-[11px] mt-2 italic">Daily Active Users</p>
</div>
<div className="glass-card p-stack-md rounded-xl card-shadow group hover:border-electric-blue transition-colors">
<div className="flex justify-between items-start mb-2">
<div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
<span className="material-symbols-outlined text-purple-600">visibility</span>
</div>
<span className="text-teal-accent font-label-md text-label-md flex items-center">
                            +5% <span className="material-symbols-outlined text-[14px]">trending_up</span>
</span>
</div>
<p className="text-slate-gray font-label-md text-label-md mb-1">MAU</p>
<h2 className="font-headline-md text-headline-md text-on-surface dark:text-white">12,490</h2>
<p className="text-slate-gray text-[11px] mt-2 italic">Monthly Active Users</p>
</div>
<div className="glass-card p-stack-md rounded-xl card-shadow group hover:border-electric-blue transition-colors">
<div className="flex justify-between items-start mb-2">
<div className="p-2 bg-teal-50 dark:bg-teal-900/30 rounded-lg">
<span className="material-symbols-outlined text-teal-accent">bolt</span>
</div>
<span className="text-error font-label-md text-label-md flex items-center">
                            -2% <span className="material-symbols-outlined text-[14px]">trending_down</span>
</span>
</div>
<p className="text-slate-gray font-label-md text-label-md mb-1">Active %</p>
<h2 className="font-headline-md text-headline-md text-on-surface dark:text-white">84.2%</h2>
<p className="text-slate-gray text-[11px] mt-2 italic">Engagement rate per head</p>
</div>
<div className="glass-card p-stack-md rounded-xl card-shadow group hover:border-electric-blue transition-colors">
<div className="flex justify-between items-start mb-2">
<div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
<span className="material-symbols-outlined text-orange-600">post_add</span>
</div>
<span className="text-teal-accent font-label-md text-label-md flex items-center">
                            +28% <span className="material-symbols-outlined text-[14px]">trending_up</span>
</span>
</div>
<p className="text-slate-gray font-label-md text-label-md mb-1">Content Count</p>
<h2 className="font-headline-md text-headline-md text-on-surface dark:text-white">1,532</h2>
<p className="text-slate-gray text-[11px] mt-2 italic">Posts created this month</p>
</div>
</div>
{/*  Visualization Row  */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter mb-stack-lg">
{/*  Karma Distribution  */}
<div className="lg:col-span-1 glass-card p-stack-lg rounded-xl card-shadow">
<div className="flex justify-between items-center mb-6">
<h3 className="font-headline-sm text-headline-sm">Karma Distribution</h3>
<button className="material-symbols-outlined text-slate-gray">more_vert</button>
</div>
<div className="relative h-48 flex items-end justify-between gap-2">
{/*  Simulated Chart  */}
<div className="w-full bg-surface-container h-[20%] rounded-t-sm relative group">
<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-charcoal-dark text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                0-100 Karma</div>
</div>
<div className="w-full bg-electric-blue/40 h-[45%] rounded-t-sm relative group"></div>
<div className="w-full bg-electric-blue/60 h-[75%] rounded-t-sm relative group"></div>
<div className="w-full bg-electric-blue h-[95%] rounded-t-sm relative group"></div>
<div className="w-full bg-electric-blue/70 h-[60%] rounded-t-sm relative group"></div>
<div className="w-full bg-electric-blue/30 h-[30%] rounded-t-sm relative group"></div>
</div>
<div className="flex justify-between text-[10px] text-slate-gray mt-4 uppercase font-bold tracking-wider">
<span>Newbie</span>
<span>Expert</span>
<span>Legend</span>
</div>
</div>
{/*  New Joins Trend  */}
<div className="lg:col-span-2 glass-card p-stack-lg rounded-xl card-shadow relative overflow-hidden">
<div className="flex justify-between items-center mb-6 relative z-10">
<h3 className="font-headline-sm text-headline-sm">New Joins Trend</h3>
<div className="flex gap-2">
<div className="flex items-center gap-1 text-[12px] text-slate-gray">
<span className="w-2 h-2 rounded-full bg-electric-blue"></span> This Year
                            </div>
<div className="flex items-center gap-1 text-[12px] text-slate-gray">
<span className="w-2 h-2 rounded-full bg-slate-300"></span> Last Year
                            </div>
</div>
</div>
{/*  Fake Line Chart Background  */}
<div className="h-48 w-full relative">
<svg className="w-full h-full" preserveaspectratio="none" viewbox="0 0 400 100">
<path d="M0,80 Q50,70 100,50 T200,30 T300,45 T400,10" fill="none" stroke="#2563EB" stroke-width="2" vector-effect="non-scaling-stroke"></path>
<path d="M0,80 Q50,70 100,50 T200,30 T300,45 T400,10 L400,100 L0,100 Z" fill="url(#blueGradient)" opacity="0.1"></path>
<path d="M0,90 Q50,85 100,70 T200,60 T300,75 T400,40" fill="none" stroke="#CBD5E1" stroke-dasharray="4" stroke-width="2" vector-effect="non-scaling-stroke"></path>
<defs>
<lineargradient id="blueGradient" x1="0" x2="0" y1="0" y2="1">
<stop offset="0%" stop-color="#2563EB"></stop>
<stop offset="100%" stop-color="white" stop-opacity="0"></stop>
</lineargradient>
</defs>
</svg>
</div>
<div className="flex justify-between text-[11px] text-slate-gray mt-2">
<span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Nov</span>
</div>
</div>
</div>
{/*  Top Contributors Table  */}
<div className="glass-card rounded-xl card-shadow overflow-hidden">
<div className="p-stack-lg border-b border-border-subtle dark:border-outline-variant flex justify-between items-center">
<h3 className="font-headline-sm text-headline-sm">Top Contributors Leaderboard</h3>
<div className="relative group w-64">
<span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-gray text-[18px]">search</span>
<input className="w-full pl-10 pr-4 py-2 text-body-md border border-border-subtle rounded-lg focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue outline-none transition-all dark:bg-charcoal-dark" placeholder="Search employee..." type="text"/>
</div>
</div>
<div className="overflow-x-auto">
<table className="w-full text-left">
<thead className="bg-surface-container-low dark:bg-surface-container/10">
<tr>
<th className="px-stack-lg py-4 font-label-md text-label-md text-slate-gray">Rank</th>
<th className="px-stack-lg py-4 font-label-md text-label-md text-slate-gray">Employee</th>
<th className="px-stack-lg py-4 font-label-md text-label-md text-slate-gray">Department</th>
<th className="px-stack-lg py-4 font-label-md text-label-md text-slate-gray">Karma</th>
<th className="px-stack-lg py-4 font-label-md text-label-md text-slate-gray text-right">
                                    Action</th>
</tr>
</thead>
<tbody className="divide-y divide-border-subtle dark:divide-outline-variant">
<tr className="hover:bg-surface-container-lowest dark:hover:bg-charcoal-dark/20 transition-colors">
<td className="px-stack-lg py-4">
<div className="w-8 h-8 rounded-full bg-yellow-400/20 text-yellow-600 font-bold flex items-center justify-center text-[12px]">
                                        1</div>
</td>
<td className="px-stack-lg py-4">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-full border-2 border-yellow-400 overflow-hidden">
<img className="w-full h-full object-cover" data-alt="Corporate headshot of a smiling female software engineer with glasses, professional lighting, modern minimalist background, 8k resolution, cinematic quality, vibrant yet natural colors." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBmyCpjI_awQ7UMNdswWbLIDLwXI8m71lP17TijTKWBe6D0bT7BYH-KBYXlwLZdx88DKGItX6NObr-1MpXye0lrH10Vj5zZW7eKx4L48Dvxxyscy_jFwJ4tOfGXxB-_s2Ma2cqQGWWPhdivZeWiYzI8w7yNRjq47NRWPydwHIR662JTLMJToMZ3BWhbd4Sg5TOmOZhaK-3qDbKo24OmKbv1DIVaYnWadNzSAs8XzsaFj54dz0FlKHDl_Ux9_wkCN2aKzmIuFVSAcKzZ"/>
</div>
<div>
<p className="font-body-md font-semibold">Meghna Tiwari</p>
<p className="text-[11px] text-slate-gray">Senior Architect</p>
</div>
</div>
</td>
<td className="px-stack-lg py-4"><span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-electric-blue text-[11px] rounded-full font-bold">Engineering</span>
</td>
<td className="px-stack-lg py-4 font-bold text-on-surface">18,240</td>
<td className="px-stack-lg py-4 text-right">
<button className="text-electric-blue hover:underline text-[12px] font-bold">View
                                        Profile</button>
</td>
</tr>
<tr className="hover:bg-surface-container-lowest dark:hover:bg-charcoal-dark/20 transition-colors">
<td className="px-stack-lg py-4">
<div className="w-8 h-8 rounded-full bg-slate-200/50 text-slate-600 font-bold flex items-center justify-center text-[12px]">
                                        2</div>
</td>
<td className="px-stack-lg py-4">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-full border-2 border-slate-300 overflow-hidden">
<img className="w-full h-full object-cover" data-alt="Portrait of a male creative director with beard, wearing a beige linen shirt, bright studio lighting with soft shadows, minimalist aesthetic, warm tones, high-end professional photography." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBJ8LvRwdK9Ebz6mJ4sMIvJbb471EVROssA0x_6QvXyQ94S62-CrkODlyWA5qy6KRIE4FirFt709W_hP4qkBZXXhAzAoIUNqZk-8iIIyyJQO1u6ALMY3z9tP8d9tRUq3IHHHYxtTT59tZOp_SnCUZlgl50uxaEzzKUIk29WGbC7VdMTk1sSCFrluW9nIbJIeMEe_bmgK4LXyxw0xTkk02a-MtTjfrDnT_2hciy6IMd8z3vp2nvmMm6JVs0jSAiUuiUlVBap9lfs6XeC"/>
</div>
<div>
<p className="font-body-md font-semibold">Sourabh Sahu</p>
<p className="text-[11px] text-slate-gray">Creative Director</p>
</div>
</div>
</td>
<td className="px-stack-lg py-4"><span className="px-2 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-600 text-[11px] rounded-full font-bold">Design</span>
</td>
<td className="px-stack-lg py-4 font-bold text-on-surface">15,902</td>
<td className="px-stack-lg py-4 text-right">
<button className="text-electric-blue hover:underline text-[12px] font-bold">View
                                        Profile</button>
</td>
</tr>
<tr className="hover:bg-surface-container-lowest dark:hover:bg-charcoal-dark/20 transition-colors">
<td className="px-stack-lg py-4">
<div className="w-8 h-8 rounded-full bg-orange-400/20 text-orange-600 font-bold flex items-center justify-center text-[12px]">
                                        3</div>
</td>
<td className="px-stack-lg py-4">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-full border-2 border-orange-300 overflow-hidden">
<img className="w-full h-full object-cover" data-alt="Medium shot of a diverse professional woman in her 30s, dressed in business casual, holding a tablet, office environment with glass walls and plants in the background, sharp focus, vibrant morning light." src="https://lh3.googleusercontent.com/aida-public/AB6AXuA6otmBvLnC2sO0RwhRc5aFov_H5EzNsqsAk-jg2tUWsTKcnOufbsiyEn9GAI4D85fsKW_BkxlaqbRhpqe-M4qTCLCBQjqz0Y9ILJ0lLHHWPlVSPyHiKyw8vK49vIlIdZGIvg5jGbjReofndI8TZGLpgtbMwrICghpKkLGtFdWth6J190G2c12JlLAcbJOd9Y9CqDN8e5tv2yO-cl0ndokwSDDHA7ApQoXKkdcL8BaCsfVayzy_s-Q8i8EZZLV24JaMq9vpATJfC0Mc"/>
</div>
<div>
<p className="font-body-md font-semibold">Elena Rodriguez</p>
<p className="text-[11px] text-slate-gray">HR Manager</p>
</div>
</div>
</td>
<td className="px-stack-lg py-4"><span className="px-2 py-1 bg-orange-50 dark:bg-orange-900/30 text-orange-600 text-[11px] rounded-full font-bold">Human
                                        Resources</span></td>
<td className="px-stack-lg py-4 font-bold text-on-surface">14,210</td>
<td className="px-stack-lg py-4 text-right">
<button className="text-electric-blue hover:underline text-[12px] font-bold">View
                                        Profile</button>
</td>
</tr>
</tbody>
</table>
</div>
<div className="p-stack-md bg-surface-container-lowest dark:bg-charcoal-dark flex items-center justify-between">
<p className="text-meta-sm font-meta-sm text-slate-gray">Showing 3 of 1,240 employees</p>
<div className="flex gap-2">
<button className="p-1 rounded hover:bg-surface-container disabled:opacity-30" disabled="">
<span className="material-symbols-outlined">chevron_left</span>
</button>
<button className="p-1 rounded hover:bg-surface-container">
<span className="material-symbols-outlined">chevron_right</span>
</button>
</div>
</div>
</div>
</main>
        </>
    );
}
