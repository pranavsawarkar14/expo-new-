export interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  actions?: ActionButton[];
  relatedContent?: RelatedContent[];
  newsArticles?: Article[];
  sourceAttribution?: string;
  thinking?: boolean;
  status?: 'sending' | 'sent' | 'error';
  quickActions?: typeof QUICK_ACTIONS;
}

export interface Article {
  title: string;
  description: string;
  url: string;
  urlToImage?: string;
  publishedAt: string;
  source: { name: string };
}

export interface RelatedContent {
  title: string;
  url: string;
  snippet: string;
}

export interface ActionButton {
  id: string;
  label: string;
  action: string;
  icon?: string;
}

export interface GeminiResponse {
  answer: string;
  relatedContent?: RelatedContent[];
}

export interface ChatbotModalProps {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
} 