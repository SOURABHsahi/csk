/**
 * Karma Engine (FR-KP-03)
 * Calculates badge tiers based on points.
 * Platinum: 5000+
 * Gold: 1000+
 * Silver: 500+
 * Bronze: 100+
 */

export function getKarmaBadge(points) {
    if (points >= 5000) {
        return { name: 'Platinum', color: 'text-slate-200', bg: 'bg-slate-200/10', border: 'border-slate-300/30' };
    } else if (points >= 1000) {
        return { name: 'Gold', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' };
    } else if (points >= 500) {
        return { name: 'Silver', color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/30' };
    } else if (points >= 100) {
        return { name: 'Bronze', color: 'text-amber-700', bg: 'bg-amber-700/10', border: 'border-amber-700/30' };
    } else {
        return { name: 'Contributor', color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/30' };
    }
}
