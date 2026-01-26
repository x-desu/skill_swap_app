import { create } from 'zustand';
import { User, Match, Message } from '../types';

interface AppState {
    currentUser: User;
    users: User[]; // Potential matches
    matches: Match[];
    messages: Message[];

    // Actions
    swipeRight: (userId: string) => void;
    swipeLeft: (userId: string) => void;
    sendMessage: (matchId: string, text: string) => void;
    addCredits: (amount: number) => void;
    spendCredits: (amount: number) => void;
}

const MOCK_USERS: User[] = [
    {
        id: '2',
        name: 'Sarah Chen',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
        bio: 'Graphic designer looking for guitar lessons. I love jazz!',
        location: 'Downtown',
        credits: 5,
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

    addCredits: (amount) => {
        set((state) => ({
            currentUser: { ...state.currentUser, credits: state.currentUser.credits + amount }
        }));
    },

    spendCredits: (amount) => {
        set((state) => ({
            currentUser: { ...state.currentUser, credits: state.currentUser.credits - amount }
        }));
    }
}));
