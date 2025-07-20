import axios from 'axios';

const API_KEY = process.env.EXPO_PUBLIC_NEWS_API_KEY || 'b3ab9dd1c97a41468861911e192b01ba';

const BASE_URL = 'https://newsapi.org/v2';

export interface Article {
  title: string;
  description: string;
  content?: string;
  url: string;
  urlToImage: string;
  publishedAt: string;
  author?: string;
  source: {
    name: string;
  };
  category?: string;
}

// List of valid categories for the News API
const categories = ['business', 'entertainment', 'general', 'health', 'science', 'sports', 'technology'];

export const fetchTopHeadlines = async (category?: string) => {
  try {
    console.log('API_KEY available:', !!API_KEY);
    console.log('Environment check:', typeof process !== 'undefined' && process.env);
    
    if (!API_KEY) {
      console.error('News API key is not configured');
      console.error('Available env vars:', Object.keys(process.env || {}));
      return [];
    }

    const response = await axios.get(`${BASE_URL}/top-headlines`, {
      params: {
        country: 'us',
        category,
        apiKey: API_KEY,
        pageSize: 20,
      },
    });

    // Filter out articles without images
    const articles = response.data.articles.filter(
      (article: Article) => article.urlToImage
    );

    return articles.map((article: Article) => ({
      ...article,
      category: category || article.source.name,
    }));
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
};

export const fetchNewsByCategory = async (category: string) => {
  try {
    if (!API_KEY) {
      console.error('News API key is not configured');
      return [];
    }

    if (category === 'all') {
      // For 'all' category, we'll just use top headlines without a specific category
      return await fetchTopHeadlines();
    } else {
      // Convert category to lowercase for the API
      const lowerCaseCategory = category.toLowerCase();
      
      console.log(`Fetching news for category: ${lowerCaseCategory}`);
      const response = await axios.get(`${BASE_URL}/top-headlines`, {
        params: {
          country: 'us',
          category: lowerCaseCategory,
          apiKey: API_KEY,
          pageSize: 20,
        },
      });

      if (response.data.status !== 'ok') {
        console.error('API Error:', response.data);
        return [];
      }

      // Filter out articles without images
      const articles = response.data.articles.filter(
        (article: Article) => article.urlToImage
      );

      console.log(`Fetched ${articles.length} articles for category: ${category}`);
      
      // Add category to each article
      return articles.map((article: Article) => ({
        ...article,
        category: category,
      }));
    }
  } catch (error) {
    console.error('Error fetching news by category:', error);
    return [];
  }
};

export const searchNews = async (query: string) => {
  try {
    if (!API_KEY) {
      console.error('News API key is not configured');
      return [];
    }

    const response = await axios.get(`${BASE_URL}/everything`, {
      params: {
        q: query,
        apiKey: API_KEY,
        language: 'en',
        pageSize: 20,
        sortBy: 'relevancy',
      },
    });

    // Filter out articles without images
    return response.data.articles.filter(
      (article: Article) => article.urlToImage
    );
  } catch (error) {
    console.error('Error searching news:', error);
    return [];
  }
};