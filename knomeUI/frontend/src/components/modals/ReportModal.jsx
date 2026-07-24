import React, { useState } from 'react';
import { interactionsApi } from '../../utils/apiService';

const REASON_MAPPING = [
    { label: 'Spam or Marketing', code: 'Spam' },
    { label: 'Harassment or Bullying', code: 'Harassment' },
    { label: 'Inappropriate Content', code: 'Inappropriate' },
    { label: 'Copyright Violation', code: 'Copyright' },
    { label: 'Other Issues', code: 'Other' },
];

export default function ReportModal({ isOpen, onClose, targetType = 'Post', targetId, targetName }) {
    const [selectedCode, setSelectedCode] = useState('');
    const [details, setDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!selectedCode) return;
        setIsSubmitting(true);
        try {
            // Capitalize targetType (e.g. 'Post')
            const formattedType = targetType.charAt(0).toUpperCase() + targetType.slice(1);
            await interactionsApi.reportContent(formattedType, targetId, { reasonCode: selectedCode });
            setIsSuccess(true);
            setTimeout(() => {
                onClose();
                setIsSuccess(false);
                setSelectedCode('');
                setDetails('');
            }, 2000);
        } catch (error) {
            console.error('Failed to submit report', error);
            alert('Failed to submit report. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-red-500">report</span>
                        Report {targetType}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-5 flex flex-col gap-4">
                    {isSuccess ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center animate-in fade-in">
                            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-[32px]">check_circle</span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Report Submitted</h3>
                            <p className="text-[13px] text-slate-500 max-w-[250px]">Our moderation team will review this {targetType.toLowerCase()} shortly. Thank you for keeping Knome safe.</p>
                        </div>
                    ) : (
                        <>
                            <p className="text-[13px] text-slate-600 dark:text-slate-400">
                                You are reporting {targetType.toLowerCase()} by <span className="font-bold text-slate-900 dark:text-white">{targetName}</span>. Please select a reason below.
                            </p>

                            <div className="flex flex-col gap-2">
                                {REASON_MAPPING.map(r => (
                                    <label key={r.code} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedCode === r.code ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                        <input type="radio" name="reason" checked={selectedCode === r.code} onChange={() => setSelectedCode(r.code)} className="text-red-500 focus:ring-red-500 bg-white border-slate-300" />
                                        <span className={`text-[13px] font-bold ${selectedCode === r.code ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>{r.label}</span>
                                    </label>
                                ))}
                            </div>

                            <div className="mt-2">
                                <textarea
                                    value={details}
                                    onChange={e => setDetails(e.target.value)}
                                    placeholder="Additional details (optional)..."
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-red-500 resize-none h-24"
                                ></textarea>
                            </div>

                            <div className="flex gap-3 mt-2">
                                <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl text-[13px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors">
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSubmit} 
                                    disabled={!selectedCode || isSubmitting}
                                    className={`flex-1 px-4 py-2 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 transition-all
                                        ${!selectedCode || isSubmitting ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed' : 'bg-red-500 text-white hover:bg-red-600 hover:shadow-md'}`}
                                >
                                    {isSubmitting ? (
                                        <><span className="material-symbols-outlined text-[16px] animate-spin">refresh</span> Submitting...</>
                                    ) : 'Submit Report'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
