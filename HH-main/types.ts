
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

export interface TagDimensions {
  technologies?: string[];  // 技术栈数组
  recruitType?: string;     // 招聘类型：校招、社招、暑期实习、日常实习、其他
  location?: string;         // 地点
  category?: string;        // 部门类别：研发、算法、产品等
  subRole?: string;         // 子角色：前端、后端、机器学习等
  custom?: string[];        // 自定义标签数组
}

export interface InterviewPost {
  id: string;
  title: string;
  originalContent: string; // The raw input
  processedContent: string; // The AI standardized content
  company: string;
  role: string;
  difficulty: number; // 1 to 5
  tags: string[];  // 保留向后兼容
  tagDimensions?: TagDimensions;  // 结构化标签维度
  comments: Comment[];
  createdAt: string;
  isExpanded?: boolean;
  // Voting fields
  usefulVotes: number;
  uselessVotes: number;
  userVote?: 'useful' | 'useless';
  // Share fields
  shareCount: number;
  // User specific fields
  isFavorited?: boolean;
  favoritedAt?: string;
  authorId?: string;
  authorName?: string;
  authorIsPro?: boolean;
  isAnonymous?: boolean; // New: privacy control
}

export interface ProcessedResponse {
  title: string;
  processedContent: string;
  company: string;
  role: string;
  difficulty: number;
  tags: string[];  // 保留向后兼容
  tagDimensions?: TagDimensions;  // 结构化标签维度
  isAnonymous?: boolean;
}

export enum ViewState {
  FEED = 'FEED',
  CREATE = 'CREATE'
}

export type JobType = 'social' | 'campus' | 'intern';

export interface JobPost {
  id: string;
  title: string;
  company: string;
  role: string;
  location: string;
  salaryRange?: string;
  type: JobType;
  description: string;
  tags: string[];
  applyLink?: string;
  createdAt: string;
  authorId?: string;
  authorName?: string;
  authorIsPro?: boolean;
  isFavorited?: boolean;
  favoritedAt?: string;
}
