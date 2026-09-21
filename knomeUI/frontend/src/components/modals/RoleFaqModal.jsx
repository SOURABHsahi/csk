import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useUser } from '../contexts/UserContext';
import { ROLE_USER_MANUALS, printRoleManualPdf } from '../../utils/roleManualsData';

const STORAGE_KEY_FAQS = 'knome_role_faqs_v2';
const STORAGE_KEY_RULES = 'knome_role_rules_v2';

// Default Role Metas & Rules
const DEFAULT_ROLES_META = {
    employee: {
        id: 'employee',
        label: 'Employee',
        title: 'Standard Employee',
        badge: 'Standard Access',
        icon: 'person',
        color: 'blue',
        accentBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        activeTabClass: 'bg-blue-600 text-white shadow-md shadow-blue-500/20',
        scopeDescription: 'Knowledge sharing, feed interaction, blogging, media streaming, community collaboration, and personal karma advancement.',
        keyAreas: ['Home Feed & Posts', 'Articles', 'Video & Podcast Channels', 'Communities', 'Karma Points & Levels']
    },
    communityAdmin: {
        id: 'communityAdmin',
        label: 'Community Admin',
        title: 'Community Admin',
        badge: 'Channel Governance',
        icon: 'groups',
        color: 'purple',
        accentBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
        activeTabClass: 'bg-purple-600 text-white shadow-md shadow-purple-500/20',
        scopeDescription: 'Managing community membership approvals, curating pinned posts (max 3), community guidelines & FAQs, and enforcing channel safety.',
        keyAreas: ['Membership Requests', 'Pinned Announcements', 'Rules & FAQ Manager', 'Member Disciplinary Actions', 'Channel Parameters']
    },
    hrAdmin: {
        id: 'hrAdmin',
        label: 'HR Admin',
        title: 'HR Admin',
        badge: 'People & Opportunities',
        icon: 'badge',
        color: 'emerald',
        accentBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        activeTabClass: 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20',
        scopeDescription: 'Managing internal job postings, approving community proposals, publishing org-wide notification broadcasts, and reviewing HR analytics.',
        keyAreas: ['Openings & Job CRUD', 'Org-wide Broadcasts', 'Community Review Queue', 'HR Analytics Dashboard', 'Org Communities']
    },
    systemAdmin: {
        id: 'systemAdmin',
        label: 'System Admin',
        title: 'System Admin',
        badge: 'Full Platform Security',
        icon: 'shield_person',
        color: 'amber',
        accentBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        activeTabClass: 'bg-amber-600 text-white shadow-md shadow-amber-500/20',
        scopeDescription: 'Global administrative authority: User role assignments, account suspensions, global moderation reports queue, and full system audit logs.',
        keyAreas: ['User Roles & Governance', 'Account Suspensions', 'Content Moderation Queue', 'Audit Logs Trail', 'Platform Safety Policies']
    }
};

// Default Comprehensive FAQ Dataset for Each Role
const DEFAULT_FAQ_DATA = {
    employee: [
        {
            id: 1,
            category: 'Feed & Content Sharing',
            question: 'How do I create and share posts on Knome?',
            answer: `To publish a quick post:
1. Navigate to the **Home** feed or **Posts** page.
2. Click the **"Create Post"** button or use the quick composer box.
3. Write your message (up to 400 characters). You can include:
   • **Mentions:** Type \`@\` followed by a colleague's name to tag them.
   • **Hashtags:** Include hashtags like \`#DotNet\` or \`#MPOnline\` for indexing.
   • **Attachments:** Upload photos, videos (MP4), audio tracks (MP3), or documents (PDF/DOCX).
4. Choose your **Audience**:
   • **Everyone:** Broadcasts to all MPOnline colleagues.
   • **Specific Community:** Shares exclusively inside an approved community space.
   • **Specific Person / Connections:** Restricts visibility strictly to targeted colleagues.
5. Click **"Post Now"** to publish instantly, or use the clock icon to schedule it.`
        },
        {
            id: 2,
            category: 'Scheduling Engine',
            question: 'How does post and article scheduling work?',
            answer: `Knome provides a native scheduling pipeline:
• When composing a post or writing an article, click the **Schedule (Clock)** icon.
• Select your target release date and time (minimum 1 minute in the future) or choose a preset like **"+1 Min"**, **"Tonight 8 PM"**, or **"Tomorrow 9 AM"**.
• Once scheduled, the item is stored securely with **"Scheduled"** status.
• **Privacy Guarantee:** Scheduled content is strictly private to you and will not appear in public feeds or community timelines until released.
• View and manage all your scheduled items under the **"⏰ Scheduled"** filter tab on the **Posts** or **Articles** page.
• You can click **"Publish Now"** at any time to release immediately, or **"Cancel to Drafts"**.`
        },
        {
            id: 3,
            category: 'Gamification & Karma',
            question: 'How do I earn Karma Points and unlock higher badge levels?',
            answer: `Karma measures your constructive contribution to MPOnline's shared knowledge base:
• **How to earn points:**
  - Create a Post: **+2 Points**
  - Publish an Article: **+5 Points**
  - Upload a Video or Podcast Episode: **+3 Points**
  - Receive a Like / Reaction on your content: **+1 Point**
  - Receive a constructive Comment: **+1 Point**
• **Tier Thresholds:**
  - 🔰 **Starter:** 0 – 99 pts (Welcome tier)
  - 🥉 **Bronze:** 100 – 249 pts
  - 🥈 **Silver:** 250 – 499 pts
  - 🥇 **Gold:** 500 – 999 pts
  - 💎 **Platinum:** 1,000+ pts (Master Contributor)
• Click the **Karma Badge** in the top navigation bar at any time to open the **Karma History & Leaderboard** page.`
        },
        {
            id: 4,
            category: 'Communities',
            question: 'How do I join, explore, or create Communities?',
            answer: `Communities are specialized collaborative hubs for departments, projects, and special interest groups:
• **Org Communities:** Every employee is automatically enrolled into mandatory company-wide spaces like *MPOnline Official* and *General Knowledge*.
• **Public Communities:** Browse via the **Communities** tab and click **"Join Community"** to participate instantly.
• **Private Communities:** Click **"Request Access"** to submit a membership request to the Community Administrator.
• **Creating a New Community:** Click the **"Create Community"** button, select a banner, provide a name, description, tags, and choose Public or Private. Your submission enters the HR review queue and is activated upon HR Admin approval.`
        },
        {
            id: 5,
            category: 'Long-Form Articles',
            question: 'How do I write and format rich text Articles?',
            answer: `For deep technical documentation, project post-mortems, or thought leadership:
1. Navigate to **Articles** and click **"Write Article"**.
2. Upload an attractive cover banner and select a relevant category (e.g. Engineering, Governance, Cloud).
3. Use the **Rich Text Editor** with full formatting tools:
   • **Bold (\`Ctrl+B\`)**, **Italic (\`Ctrl+I\`)**, **Underline (\`Ctrl+U\`)**
   • Bulleted lists and numbered step-by-step lists
   • Code snippets and blockquotes
4. Articles automatically compute estimated read times and generate version snapshots for version control.
5. Publish immediately or schedule for future release.`
        },
        {
            id: 6,
            category: 'Media Streaming',
            question: 'What types of media can I watch or upload in Videos & Podcasts?',
            answer: `Knome features a multimedia hub:
• **Videos:** Watch and stream technical walkthroughs, department town halls, and demos. Upload MP4/MOV files up to 500MB, or paste external YouTube links.
• **Podcasts:** Stream episodic audio discussions and audio learning tracks (MP3/WAV up to 100MB).
• You can react, leave timestamped feedback, and bookmark media into your personal **Saved Content** folders.`
        },
        {
            id: 7,
            category: 'Privacy & Safety',
            question: 'How do I report inappropriate content or manage my profile privacy?',
            answer: `Knome upholds high standards of workplace safety and data governance:
• **Reporting Content:** If you observe harassment, inappropriate remarks, unverified spam, or policy violations, click the three-dots (\`...\`) menu on the post/media item and select **"Report Content"**. The item is immediately flagged for administrative review.
• **DPDP Act 2023 Compliance:** Under **Profile ➔ Edit Profile**, you can configure privacy toggles for **Bio Visibility** and **Photo Visibility** to restrict or share information across organization boundaries.`
        }
    ],

    communityAdmin: [
        {
            id: 101,
            category: 'Role Overview',
            question: 'What are the key duties of a Community Administrator?',
            answer: `As a Community Administrator, you are the official custodian of your community channel:
• Manage membership requests for private spaces.
• Curate high-value discussions by pinning up to 3 announcements.
• Enforce communication standards and community guidelines.
• Configure channel metadata, avatars, banners, and rules/FAQs.
• Supervise member posting activity and temporarily suspend disruptive members if necessary.`
        },
        {
            id: 102,
            category: 'Membership Management',
            question: 'How do I approve, reject, or invite community members?',
            answer: `To manage community membership:
1. Open your assigned community from **Communities ➔ My Communities**.
2. Click the **"Admin Tools"** tab or **"Pending Requests"** sub-tab.
3. Review candidate employees who have requested access.
4. Click **"Approve"** to admit them or **"Decline"** with an optional constructive note.
5. To invite team members, use the **"Invite Employees"** button in the member header to search the directory and send instant invitations.`
        },
        {
            id: 103,
            category: 'Pinned Content (FR-CM-06)',
            question: 'How do I pin announcements and what is the pinned post limit?',
            answer: `To keep essential knowledge easily accessible:
• Click the three-dots (\`...\`) menu on any post in your community timeline and select **"Pin to Community"**.
• **3-Pinned Limit (FR-CM-06):** Each community can have a maximum of **3 active pinned posts** at any time.
• Pinned posts are anchored at the very top of the community feed with an official pin badge.
• If you need to pin a 4th item, you must first unpin one of the existing pinned posts.`
        },
        {
            id: 104,
            category: 'Moderation & Suspension',
            question: 'How do I moderate posts and discipline disruptive members?',
            answer: `Community safety procedures:
• **Post Removal:** As Community Admin, you can immediately delete toxic, unverified, or irrelevant posts inside your channel.
• **Member Suspension:** If a member repeatedly posts spam or violates safety policies:
  1. Open the **"Members"** tab in your community.
  2. Locate the member and click **"Suspend Member"**.
  3. Select a suspension duration (**1 Day, 3 Days, 7 Days, 14 Days, 30 Days**, or Custom Date) and specify a compliance reason.
  4. Suspended members are barred from posting or commenting in the community during the penalty window.
• **Sole Admin Safeguard (FR-CM-05):** The system strictly prevents removing or suspending the sole Community Administrator. Another administrator must be appointed first.`
        },
        {
            id: 105,
            category: 'Rules & FAQ Customization',
            question: 'How do I customize the Community Rules and FAQ section?',
            answer: `Every community has a dedicated Rules & FAQ widget displayed in the right sidebar:
1. Open your community and navigate to **Admin Tools ➔ Rules & FAQ Manager**.
2. **Add / Edit Rules:** Define bulleted ground rules (e.g. "1. Keep code snippets verified. 2. Respect colleague opinions.").
3. **Add / Edit FAQs:** Add question-and-answer pairs specific to your project or group.
4. Click **"Save Rules & FAQ"**. The updates immediately persist to SQL Server and refresh across all members' sidebars in real time.`
        }
    ],

    hrAdmin: [
        {
            id: 201,
            category: 'Job Openings Board',
            question: 'How do HR Administrators post and manage internal Job Openings (/jobs)?',
            answer: `Knome features an integrated Internal Job Posting Board to foster internal career mobility:
1. Navigate to the **Openings** page (\`/jobs\`) from the top navigation.
2. Click the **"Post New Opening"** button to open the job composer.
3. Fill in:
   • **Title & Designation:** e.g. "Senior Cloud Solutions Architect"
   • **Department:** e.g. "IT Operations", "Engineering", "Digital Governance"
   • **Location:** e.g. "MPOnline HQ Bhopal", "Indore Tech Center", "Hybrid"
   • **Required Skills & Tags:** e.g. \`Azure\`, \`Kubernetes\`, \`C#\`, \`React\`
   • **Closing / Expiry Date:** Target application deadline.
4. Click **"Publish Opportunity"**.
5. **Automated Lifecycle:** Knome's \`JobExpiryHostedService\` background daemon runs continuously to monitor deadlines and automatically archive expired postings without manual database updates.`
        },
        {
            id: 202,
            category: 'Broadcast Notifications',
            question: 'How do I send organization-wide push notifications & announcements?',
            answer: `HR Administrators have the authority to dispatch high-priority broadcasts:
• **Standard HR Feed Post:** Publish a post with Audience set to **"Everyone"**. This places the announcement on all employees' home dashboards.
• **Org-Wide Notification Broadcast:** Using the Broadcast trigger in HR governance, HR Admins can dispatch an in-app bell notification directly to all active registered employees simultaneously.
• Broadcast notifications appear with a distinct **HR Announcement** badge and play an alert tone on active devices.`
        },
        {
            id: 203,
            category: 'Community Proposals',
            question: 'How do I review and approve new Community Creation Requests?',
            answer: `When standard employees propose new communities:
1. The submission enters the **"Pending HR Review"** queue.
2. Open the **Communities** governance section in the **Admin Console** or Communities hub.
3. Review the proposed community's title, scope, description, and assigned lead.
4. **Approve:** The community is provisioned immediately in SQL Server, and the creator is automatically assigned as Community Administrator.
5. **Reject:** Returns the request to the creator with feedback for revision.`
        },
        {
            id: 204,
            category: 'HR Analytics Dashboard',
            question: 'What insights does the HR Analytics Portal (/hr-analytics) provide?',
            answer: `The **HR Analytics** dashboard provides leadership-level metrics on organization health:
• **Employee Status Breakdown:** Live counts of **Active Users**, **Suspended Users**, and **Total Registered Workforce**.
• **Department Participation:** Heatmaps showing which departments (Engineering, Operations, Customer Care) are most engaged.
• **Karma Distribution:** Total organizational karma generated, average points per employee, and leaderboard velocity.
• **Community Health Ratios:** Active discussion rates, pinned content freshness, and cross-department knowledge exchange.`
        }
    ],

    systemAdmin: [
        {
            id: 301,
            category: 'Governance & Scope',
            question: 'What is the administrative scope of a System Administrator?',
            answer: `System Administrators hold supreme governance authority across Knome:
• Full access to the centralized **Admin Console** (\`/admin-console\`).
• Management of all employee user accounts, department reassignments, and multi-role assignments.
• Authority to execute organization-level suspensions and account reinstatements.
• Complete control over the **Content Moderation Queue** to resolve flagged posts, videos, and articles.
• Comprehensive access to the immutable **System Audit Trail** for security audits.`
        },
        {
            id: 302,
            category: 'Content Moderation',
            question: 'How does the Moderation Queue and Report Resolution workflow operate?',
            answer: `When content is flagged by colleagues:
1. Open **Admin Console ➔ Content Moderation** tab.
2. Each report displays the **Report ID**, **Reported User**, **Reporter Identity**, **Content Type**, **Flag Reason**, and **Status**.
3. Click any report row to open the **Report Preview Modal**:
   • Inspect the original reported text, video, audio, or document attachments.
   • Verify author details and timestamp.
4. **Take Action:**
   • **Dismiss:** Mark as false report and keep content live.
   • **Delete / Remove Content:** Permanently remove the offensive post or media across all feeds.
   • **Suspend User:** Immediately invoke disciplinary suspension on the author directly from the modal footer.`
        },
        {
            id: 303,
            category: 'User Role Governance',
            question: 'How do I assign or update employee roles and permissions?',
            answer: `To manage roles:
1. In the **Admin Console**, open the **User Governance** tab.
2. Locate the target employee using the search bar or department filters.
3. Click **"Edit Roles"** to open the Role Assignment modal.
4. Toggle roles:
   • **Employee** (Base self-service)
   • **Community Admin** (Channel moderation)
   • **HR Admin** (Jobs, analytics, broadcasts)
   • **System Admin** (Security, audits, full governance)
5. Saving changes immediately updates \`[dbo].[UserRoles]\`, sends an official confirmation email via SMTP, and records an immutable entry in \`[dbo].[AuditLog]\`.`
        },
        {
            id: 304,
            category: 'Disciplinary Suspensions',
            question: 'How does account suspension work and what are its system effects?',
            answer: `When a user account is suspended:
1. Click **"Suspend User"** from the User Governance table or Moderation Preview modal.
2. Select suspension period (**1d, 3d, 7d, 14d, 30d, Indefinite**, or Custom Date) and record a mandatory compliance reason.
3. **Enforcement:**
   • Backend \`AuthService\` immediately marks the user account as suspended.
   • Active JWT sessions are rejected with **HTTP 403 Forbidden**.
   • Frontend \`AuthGuard\` displays a full-screen **Access Denied / Account Suspended** page.
   • The user is prevented from logging in or making API requests until the penalty expires or an administrator clicks **"Reactivate User"**.`
        },
        {
            id: 305,
            category: 'Audit Trail & Compliance',
            question: 'How do I inspect the System Audit Logs (/api/audit/logs)?',
            answer: `The Audit Trail satisfies strict regulatory and governance compliance:
1. In the **Admin Console**, open the **Audit Logs** tab.
2. Review time-stamped chronological records of every administrative action:
   • Role grants and revokals
   • User suspensions and reactivations
   • Moderation report dismissals and content removals
   • Community creations and administrator changes
3. Filter by **Action Type**, **Admin User ID**, **Target Entity**, or **Date Range** to conduct compliance reviews.`
        }
    ]
};

/**
 * Role-Based Knome FAQ & Usage Handbook Modal
 * Rules & Access Control:
 * 1. Each standard role (Employee, Community Admin, HR Admin) can see ONLY their own FAQ & rules.
 * 2. System Administrator can see ALL role FAQs.
 * 3. System Administrator can edit, add, delete, and customize rules and FAQs across all roles.
 */
export default function RoleFaqModal({ isOpen, onClose }) {
    const { currentUser } = useUser();

    // Determine current user role category
    const userRoleCategory = useMemo(() => {
        if (!currentUser) return 'employee';
        const role = String(currentUser?.roleName || currentUser?.role || currentUser?.designation || '').toLowerCase();
        const roles = Array.isArray(currentUser?.roles) ? currentUser.roles.map(r => String(r).toLowerCase()) : [];

        if (role.includes('system') || role.includes('sysadm') || roles.some(r => r.includes('sysadm') || r.includes('system'))) {
            return 'systemAdmin';
        }
        if (role.includes('hr') || roles.some(r => r.includes('hr'))) {
            return 'hrAdmin';
        }
        if (role.includes('community') || role.includes('cadm') || roles.some(r => r.includes('community') || r.includes('cadm'))) {
            return 'communityAdmin';
        }
        return 'employee';
    }, [currentUser]);

    const isSysAdmin = userRoleCategory === 'systemAdmin';

    // State for FAQs and Roles (loaded from persistent storage or defaults)
    const [allFaqs, setAllFaqs] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_FAQS);
            if (saved) return JSON.parse(saved);
        } catch (_) {}
        return DEFAULT_FAQ_DATA;
    });

    const [allRolesMeta, setAllRolesMeta] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_RULES);
            if (saved) return JSON.parse(saved);
        } catch (_) {}
        return DEFAULT_ROLES_META;
    });

    // Active role selection: if not sysAdmin, strictly lock to userRoleCategory
    const [selectedRole, setSelectedRole] = useState(userRoleCategory);
    
    // View mode: 'manual' (User Manual) or 'faqs' (Role FAQs)
    const [activeTab, setActiveTab] = useState('manual');
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [expandedChapters, setExpandedChapters] = useState(new Set([1, 2]));

    const [searchQuery, setSearchQuery] = useState('');
    const [expandedIds, setExpandedIds] = useState(new Set([1, 101, 201, 301]));
    const [toastMessage, setToastMessage] = useState('');

    // System Admin Edit State
    const [isEditingMode, setIsEditingMode] = useState(false);
    const [editingFaqId, setEditingFaqId] = useState(null);
    const [faqEditForm, setFaqEditForm] = useState({ category: '', question: '', answer: '' });
    
    // Add New FAQ state
    const [isAddingNewFaq, setIsAddingNewFaq] = useState(false);
    const [newFaqForm, setNewFaqForm] = useState({ category: 'General Guidance', question: '', answer: '' });

    // Role Rules Editing State
    const [isEditingRules, setIsEditingRules] = useState(false);
    const [rulesScopeText, setRulesScopeText] = useState('');

    // Re-synchronize when modal opens
    useEffect(() => {
        if (isOpen) {
            if (!isSysAdmin) {
                setSelectedRole(userRoleCategory);
                setIsEditingMode(false);
            }
            setSearchQuery('');
            setEditingFaqId(null);
            setIsAddingNewFaq(false);
            setIsEditingRules(false);
            setExpandedChapters(new Set([1, 2]));
        }
    }, [isOpen, userRoleCategory, isSysAdmin]);

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 3500);
    };

    // Save FAQs helper
    const saveFaqsState = (updatedFaqs) => {
        setAllFaqs(updatedFaqs);
        try {
            localStorage.setItem(STORAGE_KEY_FAQS, JSON.stringify(updatedFaqs));
            window.dispatchEvent(new CustomEvent('knome-role-faqs-updated', { detail: updatedFaqs }));
        } catch (e) {
            console.error('Failed to persist role faqs', e);
        }
    };

    // Save Role Rules helper
    const saveRulesState = (updatedRoles) => {
        setAllRolesMeta(updatedRoles);
        try {
            localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(updatedRoles));
            window.dispatchEvent(new CustomEvent('knome-role-rules-updated', { detail: updatedRoles }));
        } catch (e) {
            console.error('Failed to persist role rules', e);
        }
    };

    const toggleAccordion = (id) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const expandAll = (items) => {
        setExpandedIds(new Set(items.map(item => item.id)));
    };

    const collapseAll = () => {
        setExpandedIds(new Set());
    };

    // Start inline editing of an existing FAQ
    const handleStartEditFaq = (faq) => {
        setEditingFaqId(faq.id);
        setFaqEditForm({
            category: faq.category || 'General Guidance',
            question: faq.question || '',
            answer: faq.answer || ''
        });
        if (!expandedIds.has(faq.id)) {
            toggleAccordion(faq.id);
        }
    };

    // Save edited FAQ
    const handleSaveFaqEdit = (faqId) => {
        if (!faqEditForm.question.trim() || !faqEditForm.answer.trim()) {
            showToast('Question and Answer cannot be empty.');
            return;
        }

        const roleList = allFaqs[selectedRole] || [];
        const updatedList = roleList.map(item => {
            if (item.id === faqId) {
                return {
                    ...item,
                    category: faqEditForm.category.trim() || 'General Guidance',
                    question: faqEditForm.question.trim(),
                    answer: faqEditForm.answer.trim()
                };
            }
            return item;
        });

        const updatedAll = { ...allFaqs, [selectedRole]: updatedList };
        saveFaqsState(updatedAll);
        setEditingFaqId(null);
        showToast('FAQ updated successfully!');
    };

    // Delete an FAQ item
    const handleDeleteFaq = (faqId) => {
        const roleList = allFaqs[selectedRole] || [];
        const updatedList = roleList.filter(item => item.id !== faqId);
        const updatedAll = { ...allFaqs, [selectedRole]: updatedList };
        saveFaqsState(updatedAll);
        showToast('FAQ item deleted.');
    };

    // Add New FAQ
    const handleCreateNewFaq = () => {
        if (!newFaqForm.question.trim() || !newFaqForm.answer.trim()) {
            showToast('Please enter both question and answer.');
            return;
        }

        const newId = Date.now();
        const roleList = allFaqs[selectedRole] || [];
        const newItem = {
            id: newId,
            category: newFaqForm.category.trim() || 'General Guidance',
            question: newFaqForm.question.trim(),
            answer: newFaqForm.answer.trim()
        };

        const updatedList = [newItem, ...roleList];
        const updatedAll = { ...allFaqs, [selectedRole]: updatedList };
        saveFaqsState(updatedAll);
        setIsAddingNewFaq(false);
        setNewFaqForm({ category: 'General Guidance', question: '', answer: '' });
        setExpandedIds(prev => new Set([newId, ...prev]));
        showToast('New FAQ item added successfully!');
    };

    // Start editing role rules / scope description
    const handleStartEditRules = () => {
        const currMeta = allRolesMeta[selectedRole] || DEFAULT_ROLES_META[selectedRole];
        setRulesScopeText(currMeta.scopeDescription || '');
        setIsEditingRules(true);
    };

    // Save edited role rules / scope description
    const handleSaveRules = () => {
        if (!rulesScopeText.trim()) {
            showToast('Scope and rules description cannot be empty.');
            return;
        }

        const currMeta = allRolesMeta[selectedRole] || DEFAULT_ROLES_META[selectedRole];
        const updatedRoles = {
            ...allRolesMeta,
            [selectedRole]: {
                ...currMeta,
                scopeDescription: rulesScopeText.trim()
            }
        };

        saveRulesState(updatedRoles);
        setIsEditingRules(false);
        showToast(`Rules & scope for ${currMeta.title} updated successfully!`);
    };

    // Reset current role to factory defaults
    const handleResetRoleDefaults = () => {
        const defaultRoleFaqs = DEFAULT_FAQ_DATA[selectedRole] || [];
        const updatedAll = { ...allFaqs, [selectedRole]: defaultRoleFaqs };
        saveFaqsState(updatedAll);

        const defaultRoleMeta = DEFAULT_ROLES_META[selectedRole];
        const updatedRoles = { ...allRolesMeta, [selectedRole]: defaultRoleMeta };
        saveRulesState(updatedRoles);

        setEditingFaqId(null);
        setIsAddingNewFaq(false);
        setIsEditingRules(false);
        showToast(`Reset ${defaultRoleMeta.title} to default rules and FAQs.`);
    };

    if (!isOpen) return null;

    // Roles array based on access permission:
    // Non-admins see ONLY their own role. System Admins see all 4 roles.
    const ALL_ROLES_ARRAY = [
        allRolesMeta.employee || DEFAULT_ROLES_META.employee,
        allRolesMeta.communityAdmin || DEFAULT_ROLES_META.communityAdmin,
        allRolesMeta.hrAdmin || DEFAULT_ROLES_META.hrAdmin,
        allRolesMeta.systemAdmin || DEFAULT_ROLES_META.systemAdmin,
    ];

    const accessibleRoles = isSysAdmin
        ? ALL_ROLES_ARRAY
        : ALL_ROLES_ARRAY.filter(r => r.id === userRoleCategory);

    // Active role metadata, active role FAQs, and role user manual
    const currentActiveRoleId = isSysAdmin ? selectedRole : userRoleCategory;
    const currentRoleMeta = allRolesMeta[currentActiveRoleId] || DEFAULT_ROLES_META[currentActiveRoleId];
    const roleFaqs = allFaqs[currentActiveRoleId] || [];
    const currentManualData = ROLE_USER_MANUALS[currentActiveRoleId] || ROLE_USER_MANUALS.employee;

    // Filter FAQs by search query
    const filteredFaqs = searchQuery.trim()
        ? roleFaqs.filter(faq => 
            faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.category.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : roleFaqs;

    // Filter Manual chapters by search query
    const filteredChapters = useMemo(() => {
        if (!searchQuery.trim()) return currentManualData.chapters;
        const q = searchQuery.toLowerCase();
        return currentManualData.chapters.filter(ch => {
            if (ch.title.toLowerCase().includes(q) || ch.summary.toLowerCase().includes(q)) return true;
            return ch.sections.some(s => 
                s.heading.toLowerCase().includes(q) ||
                (s.content && s.content.toLowerCase().includes(q)) ||
                (s.points && s.points.some(p => p.toLowerCase().includes(q))) ||
                (s.steps && s.steps.some(st => st.toLowerCase().includes(q)))
            );
        });
    }, [currentManualData, searchQuery]);

    // Expand filtered chapters on search
    useEffect(() => {
        if (searchQuery.trim() && activeTab === 'manual') {
            setExpandedChapters(new Set(filteredChapters.map(c => c.chapterNumber)));
        }
    }, [searchQuery, activeTab, filteredChapters]);

    // PDF Download Action Handler
    const handleDownloadPdf = () => {
        setIsGeneratingPdf(true);
        showToast(`Preparing ${currentRoleMeta.title} PDF Manual...`);
        try {
            printRoleManualPdf(currentActiveRoleId, currentManualData, roleFaqs, currentRoleMeta);
            setTimeout(() => {
                setIsGeneratingPdf(false);
                showToast('PDF print preview ready! Choose "Save as PDF" to download.');
            }, 700);
        } catch (e) {
            console.error('Failed to export PDF manual', e);
            setIsGeneratingPdf(false);
            showToast('Failed to export PDF manual.');
        }
    };

    const toggleChapter = (chapterNum) => {
        setExpandedChapters(prev => {
            const next = new Set(prev);
            if (next.has(chapterNum)) next.delete(chapterNum);
            else next.add(chapterNum);
            return next;
        });
    };

    const expandAllChapters = (chapters) => {
        setExpandedChapters(new Set(chapters.map(c => c.chapterNumber)));
    };

    const collapseAllChapters = () => {
        setExpandedChapters(new Set());
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
            <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-200">
                
                {/* ─── TOAST NOTIFICATION ─── */}
                {toastMessage && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold rounded-2xl shadow-xl border border-slate-700/50 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <span className="material-symbols-outlined text-[16px] text-emerald-400">check_circle</span>
                        <span>{toastMessage}</span>
                    </div>
                )}

                {/* ─── MODAL HEADER (PINNED) ─── */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm shrink-0 sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black shrink-0 shadow-xs">
                            <span className="material-symbols-outlined text-2xl">
                                {activeTab === 'manual' ? 'menu_book' : 'help'}
                            </span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                                    {isSysAdmin 
                                        ? 'Knome Role Manuals & Governance FAQs' 
                                        : `${currentRoleMeta.title} User Manual & FAQs`}
                                </h3>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                    {isSysAdmin ? 'Master Admin View' : 'Role Guide'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {isSysAdmin 
                                    ? 'Inspect and edit operational manuals, rules, and FAQs across all organization roles' 
                                    : `Official standard operating procedures and verified guidelines for ${currentRoleMeta.title}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Download PDF Manual Button in Header */}
                        <button
                            onClick={handleDownloadPdf}
                            disabled={isGeneratingPdf}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xs shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                            title={`Download official PDF manual for ${currentRoleMeta.title}`}
                        >
                            <span className="material-symbols-outlined text-[16px]">
                                {isGeneratingPdf ? 'hourglass_top' : 'picture_as_pdf'}
                            </span>
                            <span className="hidden sm:inline">
                                {isGeneratingPdf ? 'Generating...' : 'Download PDF Manual'}
                            </span>
                            <span className="sm:hidden">PDF</span>
                        </button>

                        {/* System Admin: Edit Rules & FAQs Toggle */}
                        {isSysAdmin && (
                            <button
                                onClick={() => {
                                    setIsEditingMode(!isEditingMode);
                                    setEditingFaqId(null);
                                    setIsAddingNewFaq(false);
                                    setIsEditingRules(false);
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                                    isEditingMode 
                                        ? 'bg-rose-500 hover:bg-rose-600 text-white' 
                                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/50 border border-indigo-500/20'
                                }`}
                                title={isEditingMode ? 'Exit Admin Edit Mode' : 'Edit Rules & FAQs for this role'}
                            >
                                <span className="material-symbols-outlined text-[16px]">
                                    {isEditingMode ? 'check_circle' : 'edit_note'}
                                </span>
                                <span>{isEditingMode ? 'Finish Editing' : 'Edit Rules & FAQs'}</span>
                            </button>
                        )}

                        <button 
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
                            title="Close FAQ Guide"
                        >
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>
                </div>

                {/* ─── ROLE SELECTOR & MODE NAVIGATION BAR ─── */}
                <div className="px-6 py-3 bg-slate-100/70 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 shrink-0 space-y-2.5">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        
                        {/* If System Admin: Show interactive tabs across all 4 roles.
                            If Employee / CommAdmin / HRAdmin: Strictly show ONLY their dedicated role manual badge. */}
                        {isSysAdmin ? (
                            <div className="flex items-center gap-2 flex-wrap">
                                {accessibleRoles.map(role => {
                                    const isSelected = selectedRole === role.id;
                                    const isUserActiveRole = userRoleCategory === role.id;

                                    return (
                                        <button
                                            key={role.id}
                                            onClick={() => {
                                                setSelectedRole(role.id);
                                                setEditingFaqId(null);
                                                setIsAddingNewFaq(false);
                                                setIsEditingRules(false);
                                                const firstId = (allFaqs[role.id] || [])[0]?.id;
                                                if (firstId) setExpandedIds(new Set([firstId]));
                                                setExpandedChapters(new Set([1, 2]));
                                            }}
                                            className={`relative px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                                isSelected 
                                                    ? role.activeTabClass 
                                                    : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined text-[17px]">
                                                {role.icon}
                                            </span>
                                            <span>{role.label}</span>

                                            {isUserActiveRole && (
                                                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                                                    isSelected 
                                                        ? 'bg-white/25 text-white' 
                                                        : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                                                }`}>
                                                    Your Role
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2.5">
                                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs">
                                    <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-[18px]">
                                        {currentRoleMeta.icon}
                                    </span>
                                    <span>Assigned Role: <strong>{currentRoleMeta.title} Manual</strong></span>
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                </div>
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium hidden sm:inline">
                                    (Restricted exclusively to your role&apos;s verified operating manual & rules)
                                </span>
                            </div>
                        )}

                        {/* Search Input */}
                        <div className="relative min-w-[200px] sm:min-w-[250px]">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                                search
                            </span>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={activeTab === 'manual' ? "Search manual chapters & rules..." : "Search questions & categories..."}
                                className="w-full pl-9 pr-8 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ─── VIEW MODE TABS: Official User Manual vs Role FAQs ─── */}
                    <div className="flex items-center justify-between gap-3 flex-wrap pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60">
                        <div className="flex items-center gap-1.5 bg-slate-200/80 dark:bg-slate-800/90 p-1 rounded-xl">
                            <button
                                onClick={() => setActiveTab('manual')}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                    activeTab === 'manual'
                                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[16px]">menu_book</span>
                                <span>Official User Manual</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                                    activeTab === 'manual'
                                        ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                                        : 'bg-slate-300/60 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                }`}>
                                    {currentManualData.chapters.length} Chapters
                                </span>
                            </button>

                            <button
                                onClick={() => setActiveTab('faqs')}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                    activeTab === 'faqs'
                                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[16px]">help</span>
                                <span>Role FAQs & Rules</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                                    activeTab === 'faqs'
                                        ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                                        : 'bg-slate-300/60 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                }`}>
                                    {roleFaqs.length} Q&As
                                </span>
                            </button>
                        </div>

                        {/* Quick Manual Export Helper Pill */}
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden md:inline">
                                Format: <strong>A4 Vector PDF</strong>
                            </span>
                            <button
                                onClick={handleDownloadPdf}
                                disabled={isGeneratingPdf}
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-2xs"
                                title={`Download official PDF manual for ${currentRoleMeta.title}`}
                            >
                                <span className="material-symbols-outlined text-[16px] text-emerald-600 dark:text-emerald-400">
                                    {isGeneratingPdf ? 'hourglass_top' : 'download'}
                                </span>
                                <span>{isGeneratingPdf ? 'Exporting...' : 'Download PDF Manual'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ─── MODAL BODY (SCROLLABLE) ─── */}
                <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1 min-h-0">
                    
                    {/* ═══════════════════════════════════════════════════ */}
                    {/* ─── TAB 1: OFFICIAL ROLE USER MANUAL ─── */}
                    {/* ═══════════════════════════════════════════════════ */}
                    {activeTab === 'manual' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            
                            {/* Manual Hero Banner / Overview Card */}
                            <div className={`p-5 rounded-2xl border ${currentRoleMeta.accentBg} shadow-xs space-y-4`}>
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/90 dark:bg-slate-900/80 border border-current shadow-2xs">
                                                {currentManualData.docId}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
                                                {currentManualData.version}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                {currentManualData.classification}
                                            </span>
                                        </div>

                                        <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 mt-1">
                                            <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400">
                                                {currentRoleMeta.icon}
                                            </span>
                                            <span>{currentManualData.title}</span>
                                        </h4>

                                        <p className="text-xs text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
                                            {currentManualData.executiveSummary}
                                        </p>
                                    </div>

                                    <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 shrink-0">
                                        <button
                                            onClick={handleDownloadPdf}
                                            disabled={isGeneratingPdf}
                                            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                                            title="Export formatted PDF manual"
                                        >
                                            <span className="material-symbols-outlined text-[17px]">
                                                {isGeneratingPdf ? 'hourglass_top' : 'picture_as_pdf'}
                                            </span>
                                            <span>{isGeneratingPdf ? 'Generating...' : 'Download PDF Manual'}</span>
                                        </button>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => expandAllChapters(currentManualData.chapters)}
                                                className="px-2.5 py-1 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                                            >
                                                Expand All
                                            </button>
                                            <button
                                                onClick={collapseAllChapters}
                                                className="px-2.5 py-1 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                                            >
                                                Collapse All
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Chapter Navigation Pills */}
                                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[14px]">format_list_bulleted</span>
                                        <span>Table of Contents / Quick Chapter Navigation:</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {currentManualData.chapters.map(ch => {
                                            const isExpanded = expandedChapters.has(ch.chapterNumber);
                                            return (
                                                <button
                                                    key={ch.chapterNumber}
                                                    onClick={() => {
                                                        toggleChapter(ch.chapterNumber);
                                                        const el = document.getElementById(`chapter-card-${ch.chapterNumber}`);
                                                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                                    }}
                                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 border ${
                                                        isExpanded
                                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                                            : 'bg-white/80 dark:bg-slate-900/70 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800'
                                                    }`}
                                                >
                                                    <span className="font-bold">Ch {ch.chapterNumber}:</span>
                                                    <span>{ch.title.split(' ')[0]}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Chapters Accordion Cards */}
                            {filteredChapters.length > 0 ? (
                                <div className="space-y-4">
                                    {filteredChapters.map((chapter) => {
                                        const isExpanded = expandedChapters.has(chapter.chapterNumber);
                                        return (
                                            <div
                                                id={`chapter-card-${chapter.chapterNumber}`}
                                                key={chapter.chapterNumber}
                                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden transition-all duration-200"
                                            >
                                                <button
                                                    onClick={() => toggleChapter(chapter.chapterNumber)}
                                                    className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer gap-3"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                                                            Chapter {chapter.chapterNumber}
                                                        </span>
                                                        <div>
                                                            <h5 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                                <span className="material-symbols-outlined text-[18px] text-indigo-600 dark:text-indigo-400">
                                                                    {chapter.icon || 'menu_book'}
                                                                </span>
                                                                <span>{chapter.title}</span>
                                                            </h5>
                                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                                {chapter.summary}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <span className={`material-symbols-outlined text-slate-400 text-lg transition-transform duration-200 ${
                                                        isExpanded ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''
                                                    }`}>
                                                        expand_more
                                                    </span>
                                                </button>

                                                {isExpanded && (
                                                    <div className="px-6 pb-6 pt-3 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-950/20 space-y-5">
                                                        {chapter.sections.map((section, sIdx) => (
                                                            <div key={sIdx} className="space-y-2">
                                                                <h6 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                                                    <span>{section.heading}</span>
                                                                </h6>

                                                                {section.content && (
                                                                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                                                                        {section.content}
                                                                    </p>
                                                                )}

                                                                {/* Bullet Points */}
                                                                {section.points && (
                                                                    <ul className="space-y-1.5 pl-2">
                                                                        {section.points.map((pt, pIdx) => (
                                                                            <li key={pIdx} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                                                                                <span className="material-symbols-outlined text-indigo-500 text-[15px] shrink-0 mt-0.5">
                                                                                    check_circle
                                                                                </span>
                                                                                <span>{pt}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                )}

                                                                {/* Numbered Steps */}
                                                                {section.steps && (
                                                                    <div className="space-y-2 pl-2">
                                                                        {section.steps.map((st, stepIdx) => (
                                                                            <div key={stepIdx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                                                                                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                                                                                    {stepIdx + 1}
                                                                                </span>
                                                                                <span className="leading-relaxed">{st}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {/* Data Table (Karma points matrix, etc.) */}
                                                                {section.table && (
                                                                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mt-3 shadow-2xs">
                                                                        <table className="w-full text-left text-xs border-collapse">
                                                                            <thead>
                                                                                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold">
                                                                                    <th className="p-2.5">Action / Contribution</th>
                                                                                    <th className="p-2.5 text-center">Karma Award</th>
                                                                                    <th className="p-2.5">Award Condition</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900/60">
                                                                                {section.table.map((row, rIdx) => (
                                                                                    <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                                                        <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">{row.action}</td>
                                                                                        <td className="p-2.5 text-center font-black text-indigo-600 dark:text-indigo-400">{row.points}</td>
                                                                                        <td className="p-2.5 text-slate-600 dark:text-slate-400">{row.condition}</td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-2xl">search_off</span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                        No manual chapters found
                                    </p>
                                    <p className="text-xs text-slate-400 max-w-sm">
                                        No chapters in {currentRoleMeta.title} Manual matched &quot;{searchQuery}&quot;.
                                    </p>
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="mt-2 px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer"
                                    >
                                        Clear Search Filter
                                    </button>
                                </div>
                            )}

                            {/* Bottom PDF Download Banner */}
                            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-emerald-500/10 border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                        <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                                    </div>
                                    <div>
                                        <h6 className="text-xs font-bold text-slate-900 dark:text-white">
                                            Need an offline copy of {currentRoleMeta.title} Manual?
                                        </h6>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            Export formatted vector PDF with all chapters, guidelines, and reference FAQs.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={handleDownloadPdf}
                                    disabled={isGeneratingPdf}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined text-[16px]">download</span>
                                    <span>Download PDF Manual</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════ */}
                    {/* ─── TAB 2: ROLE FAQS & GUIDELINES ─── */}
                    {/* ═══════════════════════════════════════════════════ */}
                    {activeTab === 'faqs' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                    
                    {/* System Admin Notice Banner when in Edit Mode */}
                    {isSysAdmin && isEditingMode && (
                        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
                            <div className="flex items-center gap-2.5">
                                <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-xl shrink-0">
                                    admin_panel_settings
                                </span>
                                <div>
                                    <p className="font-bold">System Administrator Rule Editor</p>
                                    <p className="text-[11px] text-amber-700 dark:text-amber-300/90 mt-0.5">
                                        You are customizing rules and FAQs for <strong>{currentRoleMeta.title}</strong>. Changes take effect immediately for all users in this role.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                                <button
                                    onClick={() => setIsAddingNewFaq(true)}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[16px]">add</span>
                                    <span>Add FAQ Item</span>
                                </button>
                                <button
                                    onClick={handleResetRoleDefaults}
                                    className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-amber-100 text-amber-800 dark:text-amber-300 font-bold text-xs rounded-xl border border-amber-400/40 cursor-pointer"
                                    title="Reset this role to default questions and rules"
                                >
                                    Reset to Defaults
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Role Banner / Scope Card */}
                    <div className={`p-4 sm:p-5 rounded-2xl border ${currentRoleMeta.accentBg} flex flex-col gap-3 shadow-xs`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-base font-black text-slate-900 dark:text-white">
                                        {currentRoleMeta.title} Scope & Core Rules
                                    </h4>
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-white/70 dark:bg-slate-900/60 border border-current">
                                        {currentRoleMeta.badge}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                                {isSysAdmin && isEditingMode && !isEditingRules && (
                                    <button
                                        onClick={handleStartEditRules}
                                        className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">edit</span>
                                        <span>Edit Rules</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => expandAll(filteredFaqs)}
                                    className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                                >
                                    Expand All
                                </button>
                                <button
                                    onClick={collapseAll}
                                    className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                                >
                                    Collapse All
                                </button>
                            </div>
                        </div>

                        {/* Rules Body / Editor */}
                        {isEditingRules ? (
                            <div className="space-y-3 pt-2">
                                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                                    Edit Role Scope & Rules Description:
                                </label>
                                <textarea
                                    rows={3}
                                    value={rulesScopeText}
                                    onChange={(e) => setRulesScopeText(e.target.value)}
                                    className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-medium"
                                />
                                <div className="flex items-center gap-2 justify-end">
                                    <button
                                        onClick={() => setIsEditingRules(false)}
                                        className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveRules}
                                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
                                    >
                                        Save Rules
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed max-w-3xl">
                                    {currentRoleMeta.scopeDescription}
                                </p>
                                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Key Focus:</span>
                                    {currentRoleMeta.keyAreas.map((area, idx) => (
                                        <span key={idx} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/60 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 border border-slate-200/50 dark:border-slate-800">
                                            {area}
                                        </span>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Form to Add a New FAQ Item (System Admin only) */}
                    {isSysAdmin && isEditingMode && isAddingNewFaq && (
                        <div className="p-5 rounded-2xl border-2 border-dashed border-indigo-400/50 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3 animate-in fade-in">
                            <div className="flex items-center justify-between">
                                <h5 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px]">add_circle</span>
                                    Add New FAQ Question for {currentRoleMeta.title}
                                </h5>
                                <button
                                    onClick={() => setIsAddingNewFaq(false)}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                                        Category Tag:
                                    </label>
                                    <input
                                        type="text"
                                        value={newFaqForm.category}
                                        onChange={(e) => setNewFaqForm(prev => ({ ...prev, category: e.target.value }))}
                                        placeholder="e.g. Content Sharing, Safety, Approvals"
                                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                                        Question Title:
                                    </label>
                                    <input
                                        type="text"
                                        value={newFaqForm.question}
                                        onChange={(e) => setNewFaqForm(prev => ({ ...prev, question: e.target.value }))}
                                        placeholder="e.g. How do I request approval for a community?"
                                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-medium"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                                    Answer Content (Supports Markdown & Numbered Steps):
                                </label>
                                <textarea
                                    rows={4}
                                    value={newFaqForm.answer}
                                    onChange={(e) => setNewFaqForm(prev => ({ ...prev, answer: e.target.value }))}
                                    placeholder="Explain the workflow, buttons to click, and requirements step-by-step..."
                                    className="w-full p-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-medium"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                    onClick={() => setIsAddingNewFaq(false)}
                                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateNewFaq}
                                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs"
                                >
                                    Save New Question
                                </button>
                            </div>
                        </div>
                    )}

                    {/* FAQ Items List */}
                    {filteredFaqs.length > 0 ? (
                        <div className="space-y-3">
                            {filteredFaqs.map((faq) => {
                                const isExpanded = expandedIds.has(faq.id);
                                const isBeingEdited = isSysAdmin && editingFaqId === faq.id;

                                return (
                                    <div 
                                        key={faq.id}
                                        className={`rounded-2xl border bg-white dark:bg-slate-900/90 overflow-hidden shadow-xs transition-all ${
                                            isBeingEdited 
                                                ? 'border-indigo-500 ring-2 ring-indigo-500/20' 
                                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                        }`}
                                    >
                                        {/* Question Bar */}
                                        <div className="w-full px-5 py-4 text-left flex items-center justify-between gap-4">
                                            <div 
                                                onClick={() => toggleAccordion(faq.id)}
                                                className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                                            >
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                                                    isExpanded 
                                                        ? 'bg-indigo-600 text-white shadow-xs' 
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                                }`}>
                                                    <span className="material-symbols-outlined text-[17px]">
                                                        {isExpanded ? 'help_outline' : 'quiz'}
                                                    </span>
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block truncate">
                                                        {faq.category}
                                                    </span>
                                                    <span className="text-sm font-bold text-slate-900 dark:text-white leading-tight block">
                                                        {faq.question}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Action Buttons: System Admin Edit / Delete + Accordion Arrow */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                {isSysAdmin && isEditingMode && (
                                                    <div className="flex items-center gap-1 mr-1">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleStartEditFaq(faq);
                                                            }}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                                                            title="Edit this FAQ item"
                                                        >
                                                            <span className="material-symbols-outlined text-[17px]">edit</span>
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteFaq(faq.id);
                                                            }}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                                            title="Delete this FAQ item"
                                                        >
                                                            <span className="material-symbols-outlined text-[17px]">delete</span>
                                                        </button>
                                                    </div>
                                                )}

                                                <button
                                                    onClick={() => toggleAccordion(faq.id)}
                                                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform shrink-0 cursor-pointer ${
                                                        isExpanded 
                                                            ? 'rotate-180 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600' 
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                                    }`}
                                                >
                                                    <span className="material-symbols-outlined text-base">expand_more</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Inline Editing Form if System Admin clicked Edit */}
                                        {isBeingEdited ? (
                                            <div className="px-5 pb-5 pt-2 border-t border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/20 space-y-3">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Category</label>
                                                        <input
                                                            type="text"
                                                            value={faqEditForm.category}
                                                            onChange={(e) => setFaqEditForm(prev => ({ ...prev, category: e.target.value }))}
                                                            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-medium"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Question</label>
                                                        <input
                                                            type="text"
                                                            value={faqEditForm.question}
                                                            onChange={(e) => setFaqEditForm(prev => ({ ...prev, question: e.target.value }))}
                                                            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-medium"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Answer Content</label>
                                                    <textarea
                                                        rows={5}
                                                        value={faqEditForm.answer}
                                                        onChange={(e) => setFaqEditForm(prev => ({ ...prev, answer: e.target.value }))}
                                                        className="w-full p-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-medium"
                                                    />
                                                </div>
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setEditingFaqId(null)}
                                                        className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={() => handleSaveFaqEdit(faq.id)}
                                                        className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer shadow-xs"
                                                    >
                                                        Save Changes
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Regular Answer View */
                                            isExpanded && (
                                                <div className="px-5 pb-5 pt-1 text-xs text-slate-700 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800/60 leading-relaxed font-normal bg-slate-50/50 dark:bg-slate-950/30">
                                                    <div className="prose dark:prose-invert max-w-none text-xs whitespace-pre-line">
                                                        {faq.answer}
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
                            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                                <span className="material-symbols-outlined text-2xl">search_off</span>
                            </div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                No questions found
                            </p>
                            <p className="text-xs text-slate-400 max-w-sm">
                                No FAQ items in {currentRoleMeta.title} matched &quot;{searchQuery}&quot;. Try another search term or clear the filter.
                            </p>
                            <button
                                onClick={() => setSearchQuery('')}
                                className="mt-2 px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer"
                            >
                                Clear Search Filter
                            </button>
                        </div>
                    )}

                        </div>
                    )}

                </div>

                {/* ─── MODAL FOOTER (PINNED) ─── */}
                <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm flex items-center justify-between gap-3 shrink-0 sticky bottom-0 z-20">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="material-symbols-outlined text-[18px] text-emerald-500">verified</span>
                        <span>
                            {isSysAdmin 
                                ? 'System Governance Mode • Rules & FAQ Editor Active' 
                                : `MPOnline Knome Knowledge System • ${currentRoleMeta.title} Manual`}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDownloadPdf}
                            disabled={isGeneratingPdf}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                            title={`Download ${currentRoleMeta.title} PDF Manual`}
                        >
                            <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                            <span className="hidden sm:inline">Download PDF Manual</span>
                            <span className="sm:hidden">PDF</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                        >
                            <span>Done Reading</span>
                            <span className="material-symbols-outlined text-[16px]">check</span>
                        </button>
                    </div>
                </div>

            </div>
        </div>,
        document.body
    );
}
