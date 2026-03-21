export interface ProjectFile {
  path: string;
  content: string;
  lastModified: number;
}

export interface VFSState {
  files: Map<string, ProjectFile>;
}

export interface ToolCallDisplay {
  toolName: 'writeFile' | 'readFile' | 'planProject' | string;
  args: Record<string, any>;
  result?: any;
  status: 'calling' | 'complete' | 'error';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCall?: ToolCallDisplay;
  timestamp: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  files: ProjectFile[];
  createdAt: number;
  updatedAt: number;
}
