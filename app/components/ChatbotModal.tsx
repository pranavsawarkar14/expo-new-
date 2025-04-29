import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Keyboard,
  Animated,
  Dimensions,
  Linking,
  ImageBackground,
  ScrollView,
  Easing,
  StatusBar,
} from 'react-native';
import { Ionicons, FontAwesome5, Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { LinearGradient } from 'expo-linear-gradient';
import { generateGeminiResponse, isGeminiConfigured, validateGeminiApiKey } from '../api/gemini';
import { Message, Article, RelatedContent, ActionButton, GeminiResponse, ChatbotModalProps } from '../types/chat';

// API Configuration
const NEWS_API_KEY = process.env.EXPO_PUBLIC_NEWS_API_KEY;

// Enhanced Quick Action Options with more visual appeal
const QUICK_ACTIONS = [
  {
    id: 'weather',
    label: 'Weather',
    icon: 'cloud-sun',
    prompt: "What's the weather like today?",
    color: '#5E8BFF',
    gradient: ['#6B73FF', '#5E8BFF'] as const
  },
  {
    id: 'news',
    label: 'News',
    icon: 'newspaper',
    prompt: "Show me the latest news",
    color: '#FF6B6B',
    gradient: ['#FF6B6B', '#FF8E8E'] as const
  },
  {
    id: 'joke',
    label: 'Joke',
    icon: 'laugh-squint',
    prompt: "Tell me a funny joke",
    color: '#FFC107',
    gradient: ['#FFC107', '#FFD54F'] as const
  },
  {
    id: 'quote',
    label: 'Quote',
    icon: 'quote-left',
    prompt: "Give me an inspirational quote",
    color: '#9C27B0',
    gradient: ['#9C27B0', '#BA68C8'] as const
  },
  {
    id: 'tech',
    label: 'Tech',
    icon: 'microchip',
    prompt: "Show me tech news",
    color: '#4CAF50',
    gradient: ['#4CAF50', '#81C784'] as const
  },
  {
    id: 'business',
    label: 'Business',
    icon: 'chart-line',
    prompt: "Show me business news",
    color: '#2196F3',
    gradient: ['#2196F3', '#64B5F6'] as const
  },
  {
    id: 'health',
    label: 'Health',
    icon: 'heartbeat',
    prompt: "Give me health tips",
    color: '#FF5252',
    gradient: ['#FF5252', '#FF867F'] as const
  },
  {
    id: 'travel',
    label: 'Travel',
    icon: 'plane-departure',
    prompt: "Suggest travel destinations",
    color: '#00BCD4',
    gradient: ['#00BCD4', '#80DEEA'] as const
  },
  {
    id: 'sports',
    label: 'Sports',
    icon: 'running',
    prompt: "Show me sports news",
    color: '#FF9800',
    gradient: ['#FF9800', '#FFB74D'] as const
  },
  {
    id: 'recipes',
    label: 'Recipes',
    icon: 'utensils',
    prompt: "Suggest some recipes",
    color: '#795548',
    gradient: ['#795548', '#A1887F'] as const
  }
];

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

const ChatbotModal: React.FC<ChatbotModalProps> = ({ visible, onClose, isDark }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  
  const modalScale = useRef(new Animated.Value(0.95)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const modalTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT * 0.1)).current;
  const messageEnterAnimations = useRef<{[key: string]: Animated.Value}>({});
  const buttonScale = useRef(new Animated.Value(1)).current;
  const inputScale = useRef(new Animated.Value(1)).current;
  const inputBorderWidth = useRef(new Animated.Value(1)).current;
  const inputBorderColor = useRef(new Animated.Value(isDark ? 0 : 1)).current;

  // Color schemes for dark/light modes
  const colors = {
    dark: {
      background: '#121212',
      surface: '#1E1E1E',
      elevated: '#252525',
      text: '#FFFFFF',
      secondaryText: '#B0B0B0',
      accent: '#4D8AF0',
      accentLight: '#6BA1FF',
      divider: '#2D2D2D',
      error: '#FF5252',
      success: '#4CAF50',
      warning: '#FFC107',
    },
    light: {
      background: '#FFFFFF',
      surface: '#F8F9FA',
      elevated: '#FFFFFF',
      text: '#212529',
      secondaryText: '#6C757D',
      accent: '#4D8AF0',
      accentLight: '#6BA1FF',
      divider: '#E9ECEF',
      error: '#FF5252',
      success: '#4CAF50',
      warning: '#FFC107',
    }
  };

  const theme = isDark ? colors.dark : colors.light;

  // Predefined responses remain the same
  const predefinedResponses: Record<string, string> = {
    'hi': "Hello there! How can I assist you today?",
    'hello': "Hi! What would you like to know?",
    'hey': "Hey! How can I help you?",
    'hi there': "Hello! What can I do for you?",
    'good morning': "Good morning! How can I help you start your day?",
    'good afternoon': "Good afternoon! How may I assist you?",
    'good evening': "Good evening! What can I do for you?",
  };

  const initialMessage: Message = {
    id: '1',
    text: "Hello! I'm your AI assistant. How can I help you today?",
    isBot: true,
    timestamp: new Date(),
    quickActions: QUICK_ACTIONS
  };

  useEffect(() => {
    if (visible) {
      setMessages([initialMessage]);
      setInputText('');
      startModalAnimation();
    }
  }, [visible]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        Animated.parallel([
          Animated.spring(inputScale, {
            toValue: 1.03,
            useNativeDriver: true,
          }),
          Animated.spring(inputBorderWidth, {
            toValue: 2,
            useNativeDriver: false,
          }),
          Animated.timing(inputBorderColor, {
            toValue: isDark ? 1 : 0,
            duration: 200,
            useNativeDriver: false,
          }),
        ]).start();
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        Animated.parallel([
          Animated.spring(inputScale, {
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.spring(inputBorderWidth, {
            toValue: 1,
            useNativeDriver: false,
          }),
          Animated.timing(inputBorderColor, {
            toValue: isDark ? 0 : 1,
            duration: 200,
            useNativeDriver: false,
          }),
        ]).start();
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [isDark]);

  const startModalAnimation = () => {
    Animated.parallel([
      Animated.timing(modalScale, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(modalTranslateY, {
        toValue: 0,
        duration: 450,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getMessageAnimation = (id: string, isBot: boolean) => {
    if (!messageEnterAnimations.current[id]) {
      messageEnterAnimations.current[id] = new Animated.Value(0);
      
      Animated.spring(messageEnterAnimations.current[id], {
        toValue: 1,
        friction: 7,
        tension: 40,
        velocity: isBot ? 0.3 : 0.5,
        useNativeDriver: true,
      }).start();
    }
    return messageEnterAnimations.current[id];
  };

  const fetchNewsArticles = async (category: string = 'general', query?: string): Promise<Article[]> => {
    try {
      const url = query 
        ? `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&apiKey=${NEWS_API_KEY}`
        : `https://newsapi.org/v2/top-headlines?category=${category}&apiKey=${NEWS_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch news articles');
      }

      return data.articles.map((article: any) => ({
        title: article.title,
        description: article.description,
        url: article.url,
        urlToImage: article.urlToImage,
        publishedAt: article.publishedAt,
        source: { name: article.source.name }
      }));
    } catch (error) {
      console.error('Error fetching news articles:', error);
      return [];
    }
  };

  const handleSend = async () => {
    if (inputText.trim() === '') return;

    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    const textToProcess = inputText.trim().toLowerCase();
    setInputText('');
    Keyboard.dismiss();

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isBot: false,
      timestamp: new Date(),
      status: 'sending'
    };

    setMessages(prev => [...prev, userMessage]);
    animateSendButton();
    
    setTimeout(() => {
      setMessages(prev => prev.map(msg => 
        msg.id === userMessage.id ? { ...msg, status: 'sent' } : msg
      ));
      setIsTyping(true);
      
      if (predefinedResponses[textToProcess]) {
        setTimeout(() => {
          const botResponse: Message = {
            id: Date.now().toString(),
            text: predefinedResponses[textToProcess],
            isBot: true,
            timestamp: new Date(),
            quickActions: QUICK_ACTIONS
          };
          setMessages(prev => [...prev, botResponse]);
          speakMessage(botResponse.text);
          setIsTyping(false);
        }, 1000);
      } else {
        // Process the user input with Gemini
        processUserInput(textToProcess);
      }
    }, 500);
  };

  const animateSendButton = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const processUserInput = async (userInput: string) => {
    try {
      // Add a loading state
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: "Thinking...",
        isBot: true,
        timestamp: new Date(),
        thinking: true
      }]);

      // Check if it's a news-related query
      const newsKeywords = ['news', 'headlines', 'latest', 'current events'];
      const isNewsQuery = newsKeywords.some(keyword => userInput.toLowerCase().includes(keyword));

      if (isNewsQuery) {
        const category = userInput.toLowerCase().includes('tech') ? 'technology' :
                        userInput.toLowerCase().includes('business') ? 'business' :
                        userInput.toLowerCase().includes('sports') ? 'sports' :
                        'general';
        
        const articles = await fetchNewsArticles(category);
        
        // Remove the thinking message
        setMessages(prev => prev.filter(msg => !msg.thinking));
        
        // Add the response with news articles
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: `Here are the latest ${category} news headlines:`,
          isBot: true,
          timestamp: new Date(),
          newsArticles: articles,
          quickActions: QUICK_ACTIONS
        }]);
      } else {
        // Get response from Gemini using the new handler
        const response = await generateGeminiResponse(userInput);
        
        // Remove the thinking message
        setMessages(prev => prev.filter(msg => !msg.thinking));
        
        // Add the response
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: response.answer,
          isBot: true,
          timestamp: new Date(),
          relatedContent: response.relatedContent,
          quickActions: QUICK_ACTIONS
        }]);
      }

      // Speak the response if voice is enabled
      if (voiceEnabled) {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.isBot) {
          speakMessage(lastMessage.text);
        }
      }
    } catch (error) {
      console.error('Error processing user input:', error);
      
      // Remove the thinking message
      setMessages(prev => prev.filter(msg => !msg.thinking));
      
      // Add error message
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: "I apologize, but I'm having trouble processing your request. Please try again.",
        isBot: true,
        timestamp: new Date(),
        quickActions: QUICK_ACTIONS
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInputText(prompt);
    inputRef.current?.focus();
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
  };

  const toggleVoice = () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setVoiceEnabled(!voiceEnabled);
    animateVoiceButton();
  };

  const animateVoiceButton = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const speakMessage = (text: string) => {
    if (voiceEnabled && Platform.OS !== 'web') {
      Speech.speak(text, { language: 'en', pitch: 1.0, rate: 0.9 });
    }
  };

  const renderNewsArticle = (article: Article, index: number) => {
    const animation = getMessageAnimation(`article-${article.url}-${index}`, true);
    
    return (
      <Animated.View
        style={{
          transform: [{
            translateY: animation.interpolate({
              inputRange: [0, 1],
              outputRange: [30, 0],
            }),
          }],
          opacity: animation,
        }}
      >
        <TouchableOpacity 
          style={[styles.newsItem, { backgroundColor: theme.elevated }]}
          onPress={() => Linking.openURL(article.url)}
          activeOpacity={0.8}
        >
          {article.urlToImage && (
            <ImageBackground
              source={{ uri: article.urlToImage }}
              style={styles.newsImage}
              imageStyle={styles.newsImageStyle}
            >
              <LinearGradient
                colors={['rgba(0,0,0,0.8)', 'transparent']}
                style={styles.newsImageGradient}
              />
              <View style={styles.newsImageOverlay}>
                <View style={[styles.newsSourceBadge, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
                  <Text style={styles.newsSource}>{article.source.name}</Text>
                </View>
                <Text style={styles.newsDate}>
                  {new Date(article.publishedAt).toLocaleDateString()}
                </Text>
              </View>
            </ImageBackground>
          )}
          <View style={styles.newsContent}>
            <Text style={[styles.newsTitle, { color: theme.text }]}>
              {article.title}
            </Text>
            {article.description && (
              <Text style={[styles.newsDesc, { color: theme.secondaryText }]}>
                {article.description}
              </Text>
            )}
            <TouchableOpacity 
              style={[styles.readMoreButton, { backgroundColor: 'rgba(77,138,240,0.1)' }]}
              onPress={() => Linking.openURL(article.url)}
            >
              <Text style={[styles.readMoreText, { color: theme.accent }]}>Read Full Article</Text>
              <Feather name="arrow-up-right" size={16} color={theme.accent} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderRelatedContent = (content: RelatedContent[]) => {
    return (
      <View style={styles.relatedContentContainer}>
        <Text style={[styles.relatedHeader, { color: theme.text }]}>
          Related Information
        </Text>
        {content.map((item, index) => {
          const animation = getMessageAnimation(`related-${item.url}-${index}`, true);
          
          return (
            <Animated.View
              key={index}
              style={{
                transform: [{
                  translateX: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                }],
                opacity: animation,
              }}
            >
              <TouchableOpacity
                style={[styles.relatedItem, { backgroundColor: theme.elevated }]}
                onPress={() => Linking.openURL(item.url)}
                activeOpacity={0.8}
              >
                <View style={[styles.relatedIcon, { backgroundColor: 'rgba(77,138,240,0.1)' }]}>
                  <Feather name="link" size={18} color={theme.accent} />
                </View>
                <View style={styles.relatedTextContainer}>
                  <Text style={[styles.relatedTitle, { color: theme.accent }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.relatedSnippet, { color: theme.secondaryText }]}>
                    {item.snippet}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    );
  };

  const renderQuickActions = (actions: typeof QUICK_ACTIONS) => {
    return (
      <View style={styles.quickActionsContainer}>
        <Text style={[styles.quickActionsTitle, { color: theme.secondaryText }]}>
          Quick Actions
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionsScroll}
        >
          {actions.map((action) => (
            <TouchableOpacity
              key={action.id}
              onPress={() => handleQuickAction(action.prompt)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={action.gradient}
                start={[0, 0]}
                end={[1, 1]}
                style={styles.quickActionButton}
              >
                <FontAwesome5 
                  name={action.icon} 
                  size={20} 
                  color="#FFFFFF" 
                  style={styles.quickActionIcon}
                />
                <Text style={styles.quickActionText}>
                  {action.label}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderTypingIndicator = () => {
    if (!isTyping) return null;
    
    return (
      <View style={[
        styles.messageBubble,
        styles.botBubble, 
        { 
          backgroundColor: theme.elevated,
          alignSelf: 'flex-start',
          marginLeft: 44,
        }
      ]}>
        <View style={styles.typingContainer}>
          <Text style={[styles.typingText, { color: theme.text }]}>
            Typing
          </Text>
          <View style={styles.typingDots}>
            <Animated.View style={[
              styles.typingDot, 
              { 
                backgroundColor: theme.secondaryText,
                transform: [{
                  translateY: new Animated.Value(0).interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, -5, 0],
                  }),
                }]
              }
            ]} />
            <Animated.View style={[
              styles.typingDot, 
              { 
                backgroundColor: theme.secondaryText,
                transform: [{
                  translateY: new Animated.Value(0).interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, -5, 0],
                  }),
                }]
              }
            ]} />
            <Animated.View style={[
              styles.typingDot, 
              { 
                backgroundColor: theme.secondaryText,
                transform: [{
                  translateY: new Animated.Value(0).interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, -5, 0],
                  }),
                }]
              }
            ]} />
          </View>
        </View>
      </View>
    );
  };

  // Add memoization for expensive computations
  const memoizedRenderMessageItem = React.useCallback(({ item }: { item: Message }) => {
    const animation = getMessageAnimation(item.id, item.isBot);
    
    return (
      <Animated.View
        style={{
          transform: [
            {
              translateX: animation.interpolate({
                inputRange: [0, 1],
                outputRange: [item.isBot ? -SCREEN_WIDTH * 0.5 : SCREEN_WIDTH * 0.5, 0],
              }),
            },
            {
              scale: animation.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.7, 1.05, 1],
              }),
            }
          ],
          opacity: animation,
        }}
      >
        <View style={[
          styles.messageContainer,
          item.isBot ? styles.botContainer : styles.userContainer
        ]}>
          {item.isBot && (
            <View style={[styles.botAvatar, { backgroundColor: theme.surface }]}>
              <MaterialCommunityIcons name="robot" size={24} color={theme.accent} />
            </View>
          )}
          
          <LinearGradient
            colors={item.isBot 
              ? [theme.surface, theme.elevated]
              : [theme.accent, theme.accentLight]}
            start={[0, 0]}
            end={[1, 1]}
            style={[
              styles.messageBubble,
              item.isBot ? styles.botBubble : styles.userBubble,
              {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: item.isBot ? 0.1 : 0.2,
                shadowRadius: 6,
                elevation: 4,
              }
            ]}
          >
            {item.thinking ? (
              <ActivityIndicator color={theme.text} />
            ) : (
              <>
                <Text style={[
                  styles.messageText,
                  item.isBot ? { color: theme.text } : { color: '#FFFFFF' }
                ]}>
                  {item.text}
                </Text>
                <View style={styles.messageFooter}>
                  <Text style={[
                    styles.messageTime,
                    item.isBot ? { color: theme.secondaryText } : { color: 'rgba(255,255,255,0.7)' }
                  ]}>
                    {formatTime(item.timestamp)}
                  </Text>
                  {item.status === 'sending' && (
                    <ActivityIndicator size="small" color={item.isBot ? theme.secondaryText : 'rgba(255,255,255,0.7)'} />
                  )}
                  {item.status === 'sent' && (
                    <Ionicons 
                      name="checkmark-done" 
                      size={16} 
                      color={item.isBot ? theme.success : 'rgba(255,255,255,0.7)'} 
                    />
                  )}
                </View>
              </>
            )}
          </LinearGradient>
          
          {!item.isBot && (
            <View style={[styles.userAvatar, { backgroundColor: theme.accent }]}>
              <Ionicons name="person" size={20} color="#FFFFFF" />
            </View>
          )}
        </View>
        
        {item.isBot && item.newsArticles && (
          <View style={{ marginTop: 12, marginLeft: 44 }}>
            {item.newsArticles.map((article, index) => renderNewsArticle(article, index))}
          </View>
        )}
        
        {item.isBot && item.relatedContent && renderRelatedContent(item.relatedContent)}
        {item.isBot && item.quickActions && renderQuickActions(item.quickActions)}
        
        {item.sourceAttribution && (
          <Text style={[styles.messageTime, { 
            color: theme.secondaryText, 
            marginTop: 8, 
            marginLeft: 44,
            fontSize: 12,
          }]}>
            {item.sourceAttribution}
          </Text>
        )}
      </Animated.View>
    );
  }, [isDark, theme, SCREEN_WIDTH]);

  // Optimize FlatList rendering
  const getItemLayout = React.useCallback((data: ArrayLike<Message> | null | undefined, index: number) => ({
    length: 100, // Approximate height of each item
    offset: 100 * index,
    index,
  }), []);

  const keyExtractor = React.useCallback((item: Message) => item.id, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleInputFocus = () => {
    setIsInputFocused(true);
    Animated.parallel([
      Animated.spring(inputBorderWidth, {
        toValue: 2,
        useNativeDriver: false,
      }),
      Animated.timing(inputBorderColor, {
        toValue: isDark ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handleInputBlur = () => {
    setIsInputFocused(false);
    Animated.parallel([
      Animated.spring(inputBorderWidth, {
        toValue: 1,
        useNativeDriver: false,
      }),
      Animated.timing(inputBorderColor, {
        toValue: isDark ? 0 : 1,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const borderColor = inputBorderColor.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.divider, theme.accent]
  });

  // Add API validation on component mount
  useEffect(() => {
    const validateApi = async () => {
      if (!isGeminiConfigured()) {
        console.error('Gemini API is not configured');
        return;
      }

      const isValid = await validateGeminiApiKey();
      if (!isValid) {
        console.error('Invalid Gemini API key');
      }
    };

    validateApi();
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor={theme.background}
      />
      
      <Animated.View 
        style={[
          styles.container,
          {
            opacity: modalOpacity,
            transform: [
              { scale: modalScale },
              { translateY: modalTranslateY },
            ],
            backgroundColor: theme.background,
          }
        ]}
      >
        <SafeAreaView style={{ flex: 1 }}>
          {/* Modern Header with Floating Effect */}
          <View style={[
            styles.header,
            { 
              backgroundColor: theme.background,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }
          ]}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <LinearGradient
                  colors={[theme.accent, theme.accentLight]}
                  style={styles.avatarGradient}
                  start={[0, 0]}
                  end={[1, 1]}
                >
                  <MaterialCommunityIcons name="robot" size={28} color="#FFFFFF" />
                </LinearGradient>
                <View>
                  <Text style={[styles.headerTitle, { color: theme.text }]}>
                    AI Assistant
                  </Text>
                  <Text style={[styles.headerSubtitle, { color: theme.secondaryText }]}>
                    {isTyping ? 'Typing...' : 'Online'}
                  </Text>
                </View>
              </View>
              <View style={styles.headerControls}>
                <TouchableOpacity 
                  onPress={toggleVoice} 
                  style={[styles.voiceButton, { backgroundColor: theme.surface }]}
                  activeOpacity={0.8}
                >
                  <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                    <Ionicons 
                      name={voiceEnabled ? "volume-high" : "volume-mute"} 
                      size={24} 
                      color={voiceEnabled ? theme.accent : theme.secondaryText} 
                    />
                  </Animated.View>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={onClose} 
                  style={[styles.closeButton, { backgroundColor: theme.surface }]}
                  activeOpacity={0.8}
                >
                  <Ionicons 
                    name="close" 
                    size={24} 
                    color={theme.text} 
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Chat Messages Area */}
          <FlatList<Message>
            ref={flatListRef}
            data={messages}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            contentContainerStyle={[
              styles.messagesList,
              { paddingBottom: 120 + keyboardHeight }
            ]}
            ListFooterComponent={renderTypingIndicator}
            renderItem={memoizedRenderMessageItem}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={5}
          />

          {/* Modern Input Area with Floating Effect */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
            style={[
              styles.inputContainer,
              { 
                bottom: Platform.OS === 'android' ? keyboardHeight : 0,
                backgroundColor: theme.background,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -5 },
                shadowOpacity: 0.1,
                shadowRadius: 10,
                elevation: 10,
              }
            ]}
          >
            <Animated.View style={[
              styles.inputWrapper, 
              { 
                transform: [{ scale: inputScale }],
                backgroundColor: theme.surface,
                borderWidth: inputBorderWidth,
                borderColor: borderColor,
              }
            ]}>
              <TextInput
                ref={inputRef}
                style={[styles.input, { 
                  color: theme.text,
                  maxHeight: 120,
                }]}
                placeholder="Message AI Assistant..."
                placeholderTextColor={theme.secondaryText}
                value={inputText}
                onChangeText={setInputText}
                multiline
                returnKeyType="send"
                onSubmitEditing={handleSend}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
              <TouchableOpacity 
                onPress={handleSend}
                style={[
                  styles.sendButton,
                  { 
                    backgroundColor: inputText.trim() ? theme.accent : theme.surface,
                  }
                ]}
                disabled={!inputText.trim()}
                activeOpacity={0.8}
              >
                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <Ionicons 
                    name="send" 
                    size={20} 
                    color={inputText.trim() ? "#FFFFFF" : theme.secondaryText} 
                  />
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voiceButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 120,
  },
  messageContainer: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  botContainer: {
    justifyContent: 'flex-start',
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  botAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 16,
    borderRadius: 20,
  },
  botBubble: {
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  messageTime: {
    fontSize: 12,
    marginRight: 4,
  },
  inputContainer: {
    borderTopWidth: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
    position: 'absolute',
    left: 0,
    right: 0,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newsItem: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  newsImage: {
    height: 180,
    width: '100%',
  },
  newsImageStyle: {
    resizeMode: 'cover',
  },
  newsImageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '50%',
  },
  newsImageOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  newsSourceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  newsSource: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  newsDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  newsContent: {
    padding: 16,
  },
  newsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 24,
  },
  newsDesc: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  relatedContentContainer: {
    marginTop: 16,
  },
  relatedHeader: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  relatedItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  relatedIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  relatedTextContainer: {
    flex: 1,
  },
  relatedTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  relatedSnippet: {
    fontSize: 14,
    lineHeight: 20,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginLeft: 44,
  },
  typingText: {
    marginRight: 8,
    fontSize: 16,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 2,
  },
  quickActionsContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  quickActionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 44,
  },
  quickActionsScroll: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    marginRight: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ChatbotModal;