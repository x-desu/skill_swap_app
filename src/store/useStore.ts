import { create } from 'zustand';
import { User, Match, Message, Transaction } from '../types';

interface AppState {
    currentUser: User;
    users: User[]; // Potential matches
    matches: Match[];
    messages: Message[];
    transactions: Transaction[];
    followingIds: string[]; // user ids current user is following

    // App lifecycle
    isInitialized: boolean;
    setInitialized: (value: boolean) => void;

    // Actions
    swipeRight: (userId: string) => void;
    swipeLeft: (userId: string) => void;
    sendMessage: (matchId: string, text: string) => void;
    followUser: (userId: string) => void;
    unfollowUser: (userId: string) => void;
    addCredits: (amount: number, description?: string) => void;
    spendCredits: (amount: number, description?: string) => void;
    completeSession: (skillTitle: string, credits: number) => void;
}

const MOCK_USERS: User[] = [
    {
        id: '2',
        name: 'Sarah Chen',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
        bio: 'Graphic designer looking for guitar lessons. I love jazz!',
        location: 'Downtown',
        credits: 5,
        profileColor: '#FF5A5F',
        skillsOffered: [
            { id: 's1', title: 'Logo Design', category: 'Design', description: 'Professional logo design', cost: 1 },
            { id: 's2', title: 'Photoshop Editing', category: 'Design', description: 'Photo retouching', cost: 1 }
        ],
        skillsNeeded: ['Guitar', 'Cooking']
    },
    {
        id: '3',
        name: 'Marcus Johnson',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
        bio: 'Certified plumber and handyman. Need help with my taxes.',
        location: 'Westside',
        credits: 12,
        profileColor: '#736EFE',
        skillsOffered: [
            { id: 's3', title: 'Plumbing Repair', category: 'Handyman', description: 'Fixing leaks and pipes', cost: 2 },
        ],
        skillsNeeded: ['Accounting', 'Web Dev']
    },
    {
        id: '4',
        name: 'Emily Davis',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
        bio: 'French tutor. Love gardening but bad at it.',
        location: 'North Hills',
        credits: 3,
        profileColor: '#F6D365',
        skillsOffered: [
            { id: 's4', title: 'French Lessons', category: 'Education', description: 'Conversational French', cost: 1 },
        ],
        skillsNeeded: ['Gardening', 'Dog Walking']
    },
    {
        id: '5',
        name: 'David Kim',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
        bio: 'IT Specialist. Can fix your wifi. Need someone to walk my husky.',
        location: 'Uptown',
        credits: 8,
        profileColor: '#4CD964',
        skillsOffered: [
            { id: 's5', title: 'Tech Support', category: 'Tech', description: 'Wifi and computer fix', cost: 1 },
        ],
        skillsNeeded: ['Dog Walking', 'Meal Prep']
    }
];

const INITIAL_USER: User = {
    id: '1',
    name: 'Alex Morgan',
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=400',
    bio: 'Software engineer by day, aspiring chef by night.',
    location: 'Midtown',
    credits: 10,
    profileColor: '#7B2FFF',
    skillsOffered: [
        { id: 's10', title: 'Coding Help', category: 'Tech', description: 'React & Python tutoring', cost: 2 }
    ],
    skillsNeeded: ['Photography', 'Interior Design']
};

export const useStore = create<AppState>((set, get) => ({
    currentUser: INITIAL_USER,
    users: MOCK_USERS,
    matches: [],
    messages: [],
    transactions: [],
    followingIds: [],

    // App lifecycle
    isInitialized: false,
    setInitialized: (value) => set({ isInitialized: value }),

    swipeRight: (userId) => {
        // For demo: Always match if swipe right
        set((state) => {
            const newMatch: Match = {
                id: Math.random().toString(36).substr(2, 9),
                users: [state.currentUser.id, userId],
                createdAt: new Date().toISOString(),
            };

            // Remove user from stack
            const remainingUsers = state.users.filter(u => u.id !== userId);

            return {
                users: remainingUsers,
                matches: [...state.matches, newMatch]
            };
        });
    },

    swipeLeft: (userId) => {
        set((state) => ({
            users: state.users.filter(u => u.id !== userId)
        }));
    },

    followUser: (userId) => {
        set((state) => {
            if (state.followingIds.includes(userId)) {
                return state;
            }

            const updatedUsers = state.users.map((u) =>
                u.id === userId
                    ? {
                        ...u,
                        followersCount: (u.followersCount ?? 0) + 1,
                    }
                    : u
            );

            return {
                users: updatedUsers,
                followingIds: [...state.followingIds, userId],
                currentUser: {
                    ...state.currentUser,
                    followingCount: (state.currentUser.followingCount ?? 0) + 1,
                },
            };
        });
    },

    unfollowUser: (userId) => {
        set((state) => {
            if (!state.followingIds.includes(userId)) {
                return state;
            }

            const updatedUsers = state.users.map((u) =>
                u.id === userId
                    ? {
                        ...u,
                        followersCount: Math.max(0, (u.followersCount ?? 0) - 1),
                    }
                    : u
            );

            return {
                users: updatedUsers,
                followingIds: state.followingIds.filter((id) => id !== userId),
                currentUser: {
                    ...state.currentUser,
                    followingCount: Math.max(0, (state.currentUser.followingCount ?? 0) - 1),
                },
            };
        });
    },

    sendMessage: (matchId, text) => {
        set((state) => ({
            messages: [...state.messages, {
                id: Math.random().toString(36).substr(2, 9),
                matchId,
                senderId: state.currentUser.id,
                text,
                createdAt: new Date().toISOString()
            }]
        }));
    },

    addCredits: (amount, description = 'Credits added') => {
        if (amount <= 0) return;

        set((state) => {
            const now = new Date().toISOString();
            const tx: Transaction = {
                id: Math.random().toString(36).substr(2, 9),
                amount,
                type: 'earn',
                description,
                date: now,
            };

            return {
                currentUser: {
                    ...state.currentUser,
                    credits: state.currentUser.credits + amount,
                    creditsEarned: (state.currentUser.creditsEarned ?? 0) + amount,
                },
                transactions: [tx, ...state.transactions],
            };
        });
    },

    spendCredits: (amount, description = 'Credits spent') => {
        if (amount <= 0) return;

        set((state) => {
            const spendAmount = Math.min(amount, state.currentUser.credits);
            if (spendAmount <= 0) {
                return state;
            }

            const now = new Date().toISOString();
            const tx: Transaction = {
                id: Math.random().toString(36).substr(2, 9),
                amount: spendAmount,
                type: 'spend',
                description,
                date: now,
            };

            return {
                currentUser: {
                    ...state.currentUser,
                    credits: state.currentUser.credits - spendAmount,
                    creditsSpent: (state.currentUser.creditsSpent ?? 0) + spendAmount,
                },
                transactions: [tx, ...state.transactions],
            };
        });
    },

    completeSession: (skillTitle, credits) => {
        if (credits <= 0) return;

        set((state) => {
            const cost = Math.min(credits, state.currentUser.credits);
            if (cost <= 0) {
                return state;
            }

            const now = new Date().toISOString();
            const description = `Session: ${skillTitle}`;
            const tx: Transaction = {
                id: Math.random().toString(36).substr(2, 9),
                amount: cost,
                type: 'spend',
                description,
                date: now,
            };

            return {
                currentUser: {
                    ...state.currentUser,
                    credits: state.currentUser.credits - cost,
                    creditsSpent: (state.currentUser.creditsSpent ?? 0) + cost,
                    completedSessions: (state.currentUser.completedSessions ?? 0) + 1,
                },
                transactions: [tx, ...state.transactions],
            };
        });
    },
}));
