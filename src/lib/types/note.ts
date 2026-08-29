export interface Note {
  id: string;
  projectId?: string; // Optional linkage to a Project
  title: string;
  content: string;
  category?: string;
  tags: string[];
  pinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

