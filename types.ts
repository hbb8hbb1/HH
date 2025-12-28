export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isPro?: boolean; // Subscription status
}

export interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  authorIsPro?: boolean; // Visual badge for comment author
  replies?: Comment[]; // Nested replies
}

export interface InterviewPost {
  id: string;
  title: string;
  originalContent: string; // The raw input
  processedContent: string; // The AI standardized content
  company: string;
  role: string;
  difficulty: number; // 1 to 5
  tags: string[];
  comments: Comment[];
  createdAt: string;
  isExpanded?: boolean;
  // Voting fields
  usefulVotes: number;
  uselessVotes: number;
  userVote?: 'useful' | 'useless';
  // User specific fields
  isFavorited?: boolean;
  favoritedAt?: string; // Timestamp when the user favorited the post
  authorId?: string;
  authorName?: string;
  authorIsPro?: boolean; // Visual badge for post author
}

export interface ProcessedResponse {
  title: string;
  processedContent: string;
  company: string;
  role: string;
  difficulty: number;
  tags: string[];
}

export enum ViewState {
  FEED = 'FEED',
  CREATE = 'CREATE'
}

// --- New Job Related Types ---

export type JobType = 'social' | 'campus' | 'intern';

export interface JobPost {
  id: string;
  title: string;
  company: string;
  role: string;
  location: string;
  salaryRange?: string; // e.g. "20k-40k"
  type: JobType;
  description: string; // Markdown supported
  tags: string[];
  applyLink?: string; // External link or email
  createdAt: string;
  authorId?: string;
  authorName?: string;
  authorIsPro?: boolean;
}