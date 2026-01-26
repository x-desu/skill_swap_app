export interface Skill {
    id: string;
    title: string;
    category: string;
    description: string;
    cost: number; // in time credits
}

export interface User {
    id: string;
    name: string;
    avatar: string;
    bio: string;
    location: string;
    credits: number;
    skillsOffered: Skill[];
    skillsNeeded: string[]; // Just titles for now
    isVerified?: boolean;
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
