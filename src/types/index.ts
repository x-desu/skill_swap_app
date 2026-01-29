export interface Skill {
    id: string;
    title: string;
    category: string;
    description: string;
    cost: number; // in time credits
    color?: string; // Optional color for the skill category
}

export interface User {
    id: string;
    name: string;
    avatar: string;
    bio: string;
    location: string;
    credits: number;
    profileColor?: string;
    skillsOffered: Skill[];
    skillsNeeded: string[]; // Just titles for now
    isVerified?: boolean;
    followersCount?: number;
    followingCount?: number;
    completedSessions?: number;
    creditsEarned?: number;
    creditsSpent?: number;
}

export interface Match {
    id: string;
    users: [string, string]; // User IDs
    createdAt: string;
}

export interface Message {
    id: string;
    matchId: string;
    senderId: string;
    text: string;
    createdAt: string;
}

export interface Transaction {
    id: string;
    amount: number;
    type: 'earn' | 'spend';
    description: string;
    date: string;
}
