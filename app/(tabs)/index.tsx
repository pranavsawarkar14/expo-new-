import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  TextInput,
  ImageBackground,
  Linking,
  Share,
  Easing,
  FlatList,
  ToastAndroid,
  Platform,
  Alert,
  Dimensions,
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTheme } from '../context/ThemeContext';
import LocationPicker from '../components/LocationPicker';
import { fetchTopHeadlines, searchNews, Article } from '../api/newsApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { BlurView } from 'expo-blur';

export default function HomeScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [savedArticles, setSavedArticles] = useState<string[]>([]);
  const [offlineArticles, setOfflineArticles] = useState<string[]>([]);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('Your Location');
  const [followedSources, setFollowedSources] = useState<string[]>([]);
  const [sameSourceArticles, setSameSourceArticles] = useState<Article[]>([]);
  const [trendingArticles, setTrendingArticles] = useState<Article[]>([]);
  const [recommendedArticles, setRecommendedArticles] = useState<Article[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [originalArticles, setOriginalArticles] = useState<Article[]>([]);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;
  const saveAnim = useRef(new Animated.Value(1)).current;
  const shareAnim = useRef(new Animated.Value(1)).current;
  const offlineAnim = useRef(new Animated.Value(1)).current;
  const titlePositionX = useRef(new Animated.Value(0)).current;
  const titlePositionY = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(1.5)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const dateOpacity = useRef(new Animated.Value(0)).current;
  const searchOpacity = useRef(new Animated.Value(0)).current;
  const followAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const refreshOpacityAnim = useRef(new Animated.Value(0)).current;
  const relatedSourceAnim = useRef(new Animated.Value(0)).current;
  const trendingAnim = useRef(new Animated.Value(0)).current;
  const recommendedAnim = useRef(new Animated.Value(0)).current;
  const filterBackdropAnim = useRef(new Animated.Value(0)).current;

  const filterOptions = [
    { id: 'latest', label: 'Latest', icon: 'time-outline' },
    { id: 'popular', label: 'Popular', icon: 'flame-outline' },
    { id: 'followed', label: 'Followed', icon: 'heart-outline' },
    { id: 'saved', label: 'Saved', icon: 'bookmark-outline' },
  ];

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const spinAnimation = useRef<Animated.CompositeAnimation | null>(null);

  const { width, height } = Dimensions.get('window');

  // Refresh functionality
  const onRefresh = async () => {
    setRefreshing(true);
    startRefreshAnimation();
    
    try {
      await loadNews();
    } catch (error) {
      console.error('Error refreshing news:', error);
      showToast('Failed to refresh news');
    } finally {
      stopRefreshAnimation();
      setRefreshing(false);
    }
  };

  const startRefreshAnimation = () => {
    rotateAnim.setValue(0);
    scaleAnim.setValue(0);
    refreshOpacityAnim.setValue(0);
    
    spinAnimation.current = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    
    spinAnimation.current.start();
    
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(refreshOpacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  };

  const stopRefreshAnimation = () => {
    if (spinAnimation.current) {
      spinAnimation.current.stop();
    }
    
    Animated.timing(refreshOpacityAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Filter animations
  const animateFiltersIn = () => {
    setShowFilters(true);
    filterBackdropAnim.setValue(0);
    
    Animated.spring(filterBackdropAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const animateFiltersOut = () => {
    Animated.spring(filterBackdropAnim, {
      toValue: 0,
      useNativeDriver: true,
    }).start(() => setShowFilters(false));
  };

  const toggleFilter = (filterId: string) => {
    const newFilters = activeFilters.includes(filterId) 
      ? activeFilters.filter(id => id !== filterId) 
      : [...activeFilters, filterId];
    
    setActiveFilters(newFilters);
    applyFilters(newFilters);
  };

  const applyFilters = (filters: string[]) => {
    if (filters.length === 0) {
      setArticles(originalArticles);
      return;
    }

    let filtered = [...originalArticles];
    
    if (filters.includes('latest')) {
      filtered = filtered.sort((a, b) => 
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    }
    
    if (filters.includes('popular')) {
      filtered = filtered.sort(() => 0.5 - Math.random());
    }
    
    if (filters.includes('followed')) {
      filtered = filtered.filter(article => 
        followedSources.includes(article.source.name)
      );
    }
    
    if (filters.includes('saved')) {
      filtered = filtered.filter(article => 
        savedArticles.includes(article.url)
      );
    }

    setArticles(filtered);
    showToast(`Applied ${filters.length} filter(s)`);
  };

  const clearFilters = () => {
    setActiveFilters([]);
    setArticles(originalArticles);
    showToast('Filters cleared');
    animateFiltersOut();
  };

  const loadNews = async () => {
    try {
      if (isOfflineMode) {
        loadOfflineContent();
        return;
      }
      
      const headlines = await fetchTopHeadlines();
      const sortedHeadlines = sortArticlesByFollowedSources(headlines);
      setArticles(sortedHeadlines);
      setOriginalArticles(sortedHeadlines);
      
      await AsyncStorage.setItem('offlineArticlesData', JSON.stringify(headlines));
      
      fadeIn();
    } catch (error) {
      console.error('Error loading news:', error);
      loadOfflineContent();
    }
  };

  const loadOfflineContent = async () => {
    try {
      const offlineArticlesData = await AsyncStorage.getItem('offlineArticlesData');
      if (offlineArticlesData) {
        const parsedData = JSON.parse(offlineArticlesData);
        setArticles(parsedData);
        setOriginalArticles(parsedData);
        fadeIn();
      }
    } catch (error) {
      console.error('Error loading offline content:', error);
    }
  };

  const sortArticlesByFollowedSources = (articles: Article[]) => {
    return [...articles].sort((a, b) => {
      const aFollowed = followedSources.includes(a.source.name);
      const bFollowed = followedSources.includes(b.source.name);
      
      if (aFollowed && !bFollowed) return -1;
      if (!aFollowed && bFollowed) return 1;
      return 0;
    });
  };

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('', message);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      try {
        if (isOfflineMode) {
          showToast('Search is unavailable in offline mode');
          return;
        }
        
        const results = await searchNews(searchQuery);
        const sortedResults = sortArticlesByFollowedSources(results);
        setArticles(sortedResults);
        setOriginalArticles(sortedResults);
        fadeIn();
      } catch (error) {
        console.error('Error searching news:', error);
      }
    }
  };

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (!showSearch) setSearchQuery('');
  };

  const handleArticleSelect = (article: Article) => {
    setSelectedArticle(article);
    slideIn();
  };

  const isArticleSaved = (article: Article): boolean => {
    return savedArticles.includes(article.url);
  };

  const isArticleOffline = (article: Article): boolean => {
    return offlineArticles.includes(article.url);
  };
  
  const isSourceFollowed = (sourceName: string): boolean => {
    return followedSources.includes(sourceName);
  };
  
  const toggleFollowSource = async (sourceName: string) => {
    let updatedFollowedSources = [...followedSources];
    
    if (isSourceFollowed(sourceName)) {
      updatedFollowedSources = updatedFollowedSources.filter(name => name !== sourceName);
      showToast(`Unfollowed ${sourceName}`);
    } else {
      updatedFollowedSources.push(sourceName);
      animateFollow();
      showToast(`Following ${sourceName}`);
    }
    
    setFollowedSources(updatedFollowedSources);
    
    try {
      await AsyncStorage.setItem('followedSources', JSON.stringify(updatedFollowedSources));
      setArticles(sortArticlesByFollowedSources(articles));
      setOriginalArticles(sortArticlesByFollowedSources(originalArticles));
    } catch (error) {
      console.error('Error saving followed sources:', error);
    }
  };

  const toggleSaveArticle = async (article: Article) => {
    let updatedSavedArticles = [...savedArticles];
    
    if (isArticleSaved(article)) {
      updatedSavedArticles = updatedSavedArticles.filter(url => url !== article.url);
    } else {
      updatedSavedArticles.push(article.url);
      animateSave();
      
      try {
        const savedArticlesData = await AsyncStorage.getItem('savedArticlesData');
        let articlesData = savedArticlesData ? JSON.parse(savedArticlesData) : [];
        
        articlesData.push({
          id: article.url,
          title: article.title,
          image: article.urlToImage,
          category: article.source.name,
          date: new Date(),
          readTime: `${Math.ceil(article.content?.length / 1000)} min read`,
          content: article.content,
          author: article.author,
          source: {
            name: article.source.name
          },
          url: article.url
        });
        
        await AsyncStorage.setItem('savedArticlesData', JSON.stringify(articlesData));
      } catch (error) {
        console.error('Error saving article data:', error);
      }
    }
    
    setSavedArticles(updatedSavedArticles);
    try {
      await AsyncStorage.setItem('savedArticles', JSON.stringify(updatedSavedArticles));
    } catch (error) {
      console.error('Error saving articles:', error);
    }
  };

  const toggleOfflineArticle = async (article: Article) => {
    let updatedOfflineArticles = [...offlineArticles];
    
    if (isArticleOffline(article)) {
      updatedOfflineArticles = updatedOfflineArticles.filter(url => url !== article.url);
      showToast('Article removed from offline reading');
    } else {
      updatedOfflineArticles.push(article.url);
      animateOffline();
      
      try {
        const offlineArticlesData = await AsyncStorage.getItem('offlineArticlesData');
        let articlesData = offlineArticlesData ? JSON.parse(offlineArticlesData) : [];
        
        const exists = articlesData.some((a: Article) => a.url === article.url);
        
        if (!exists) {
          articlesData.push({
            ...article,
            savedForOffline: true,
            offlineSavedDate: new Date()
          });
          
          await AsyncStorage.setItem('offlineArticlesData', JSON.stringify(articlesData));
        }
        
        showToast('Article saved for offline reading');
      } catch (error) {
        console.error('Error saving offline article data:', error);
      }
    }
    
    setOfflineArticles(updatedOfflineArticles);
    try {
      await AsyncStorage.setItem('offlineArticles', JSON.stringify(updatedOfflineArticles));
    } catch (error) {
      console.error('Error saving offline articles:', error);
    }
  };

  const openSourceUrl = (article: Article) => {
    if (isOfflineMode) {
      showToast('Cannot open source URL in offline mode');
      return;
    }
    
    if (article.url) {
      Linking.openURL(article.url).catch(err => 
        console.error('Error opening URL:', err)
      );
    }
  };

  const shareArticle = async (article: Article) => {
    animateShare();
    try {
      const result = await Share.share({
        message: `Check out this article: ${article.title}\n\n${article.url}`,
        url: article.url,
        title: article.title,
      });
      
      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log(`Shared with ${result.activityType}`);
        } else {
          console.log('Shared successfully');
        }
      } else if (result.action === Share.dismissedAction) {
        console.log('Share dismissed');
      }
    } catch (error) {
      console.error('Error sharing article:', error);
    }
  };

  const fadeIn = () => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  };

  const slideIn = () => {
    slideAnim.setValue(100);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const animateSave = () => {
    saveAnim.setValue(1.5);
    Animated.spring(saveAnim, {
      friction: 3,
      tension: 40,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const animateShare = () => {
    shareAnim.setValue(1.5);
    Animated.spring(shareAnim, {
      friction: 3,
      tension: 40,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const animateOffline = () => {
    offlineAnim.setValue(1.5);
    Animated.spring(offlineAnim, {
      friction: 3,
      tension: 40,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };
  
  const animateFollow = () => {
    followAnim.setValue(1.5);
    Animated.spring(followAnim, {
      friction: 3,
      tension: 40,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const animateTitleOnLoad = () => {
    titlePositionX.setValue((width / 2) - 100);
    titlePositionY.setValue(height / 2 - 100);
    titleScale.setValue(1.5);
    titleOpacity.setValue(1);
    dateOpacity.setValue(0);
    searchOpacity.setValue(0);
    
    Animated.sequence([
      Animated.delay(500),
      Animated.parallel([
        Animated.spring(titlePositionX, {
          toValue: 0,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(titlePositionY, {
          toValue: 20,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(titleScale, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(dateOpacity, {
          toValue: 1,
          duration: 600,
          delay: 300,
          useNativeDriver: true,
        }),
        Animated.timing(searchOpacity, {
          toValue: 1,
          duration: 600,
          delay: 400,
          useNativeDriver: true,
        }),
      ])
    ]).start();
  };

  const findRelatedContent = (article: Article) => {
    relatedSourceAnim.setValue(0);
    trendingAnim.setValue(0);
    recommendedAnim.setValue(0);
    
    const sameSource = articles.filter(
      a => a.source.name === article.source.name && a.url !== article.url
    );
    setSameSourceArticles(sameSource);
    
    const trending = [...articles]
      .filter(a => a.url !== article.url)
      .sort(() => 0.5 - Math.random())
      .slice(0, 4);
    setTrendingArticles(trending);
    
    const keywords = article.title.toLowerCase().split(' ');
    const recommended = articles
      .filter(a => a.url !== article.url)
      .filter(a => {
        const title = a.title.toLowerCase();
        return keywords.some(word => 
          word.length > 4 && title.includes(word)
        );
      })
      .slice(0, 3);
      
    if (recommended.length < 3) {
      const additional = articles
        .filter(a => a.url !== article.url && !recommended.includes(a))
        .sort(() => 0.5 - Math.random())
        .slice(0, 3 - recommended.length);
      
      setRecommendedArticles([...recommended, ...additional]);
    } else {
      setRecommendedArticles(recommended);
    }
    
    Animated.sequence([
      Animated.timing(relatedSourceAnim, {
        toValue: 1,
        duration: 600,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(trendingAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(recommendedAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  };

  useEffect(() => {
    checkConnectivity();
    loadNews();
    loadSavedArticles();
    loadOfflineArticles();
    loadFollowedSources();
    animateTitleOnLoad();
    
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOfflineMode(!state.isConnected);
      if (!state.isConnected) {
        loadOfflineContent();
        showToast('You are offline. Showing available offline content.');
      }
    });
    
    return () => {
      if (spinAnimation.current) {
        spinAnimation.current.stop();
      }
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (selectedArticle) {
      findRelatedContent(selectedArticle);
    }
  }, [selectedArticle]);

  const checkConnectivity = async () => {
    const networkState = await NetInfo.fetch();
    setIsOfflineMode(!networkState.isConnected);
    if (!networkState.isConnected) {
      loadOfflineContent();
    }
  };

  const loadSavedArticles = async () => {
    try {
      const saved = await AsyncStorage.getItem('savedArticles');
      if (saved) {
        setSavedArticles(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading saved articles:', error);
    }
  };

  const loadOfflineArticles = async () => {
    try {
      const offline = await AsyncStorage.getItem('offlineArticles');
      if (offline) {
        setOfflineArticles(JSON.parse(offline));
      }
    } catch (error) {
      console.error('Error loading offline articles:', error);
    }
  };

  const loadFollowedSources = async () => {
    try {
      const followed = await AsyncStorage.getItem('followedSources');
      if (followed) {
        setFollowedSources(JSON.parse(followed));
      }
    } catch (error) {
      console.error('Error loading followed sources:', error);
    }
  };

  const renderCustomRefresh = () => {
    if (!refreshing) return null;
    
    return (
      <View style={styles.refreshContainer}>
        <Animated.View 
          style={[
            styles.refreshCircle,
            {
              opacity: refreshOpacityAnim,
              transform: [
                { rotate: spin },
                { scale: scaleAnim }
              ]
            }
          ]}
        >
          <Ionicons 
            name="refresh-outline" 
            size={24} 
            color="#EAC8A4" 
          />
        </Animated.View>
        
        <Animated.Text 
          style={[
            styles.refreshText,
            { opacity: refreshOpacityAnim }
          ]}
        >
          Finding the latest news...
        </Animated.Text>
      </View>
    );
  };

  const renderArticleCard = (article: Article, index: number) => (
    <TouchableOpacity 
      key={index} 
      style={styles.relatedArticleCard}
      onPress={() => handleArticleSelect(article)}
    >
      <ImageBackground 
        source={{ uri: article.urlToImage }} 
        style={styles.relatedArticleImage}
        imageStyle={{ borderRadius: 8 }}
      >
        <View style={styles.relatedArticleOverlay}>
          <View style={styles.sourceRow}>
            <Text style={styles.relatedArticleSource}>{article.source.name}</Text>
            <TouchableOpacity 
              onPress={() => toggleFollowSource(article.source.name)}
              style={styles.followButton}
            >
              <Ionicons 
                name={isSourceFollowed(article.source.name) ? "heart" : "heart-outline"} 
                size={16} 
                color="#FFD700" 
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.relatedArticleTitle} numberOfLines={2}>
            {article.title}
          </Text>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );

  const renderHorizontalArticleList = (articles: Article[]) => (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={articles}
      keyExtractor={(item, index) => `${item.url}-${index}`}
      renderItem={({ item }) => (
        <TouchableOpacity 
          style={styles.horizontalArticleCard}
          onPress={() => handleArticleSelect(item)}
        >
          <ImageBackground 
            source={{ uri: item.urlToImage }} 
            style={styles.horizontalArticleImage}
            imageStyle={{ borderRadius: 8 }}
          >
            <View style={styles.horizontalArticleOverlay}>
              <View style={styles.sourceRow}>
                <Text style={styles.horizontalArticleSource}>{item.source.name}</Text>
                <TouchableOpacity 
                  onPress={() => toggleFollowSource(item.source.name)}
                  style={styles.followButton}
                >
                  <Ionicons 
                    name={isSourceFollowed(item.source.name) ? "heart" : "heart-outline"} 
                    size={16} 
                    color="#FFD700" 
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.horizontalArticleTitle} numberOfLines={2}>
                {item.title}
              </Text>
            </View>
          </ImageBackground>
        </TouchableOpacity>
      )}
      contentContainerStyle={styles.horizontalListContent}
    />
  );

  const SectionHeader = ({ title, icon, animValue }: { title: string, icon: string, animValue: Animated.Value }) => (
    <Animated.View 
      style={[
        styles.sectionHeader,
        { opacity: animValue }
      ]}
    >
      <Ionicons name={icon} size={20} color={isDark ? '#EAC8A4' : '#EAC8A4'} />
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </Animated.View>
  );

  const OfflineIndicator = () => {
    if (!isOfflineMode) return null;
    
    return (
      <View style={styles.offlineIndicator}>
        <Ionicons name="cloud-offline-outline" size={16} color="#FFF" />
        <Text style={styles.offlineText}>Offline Mode</Text>
      </View>
    );
  };
  
  const FollowedSourcesSection = () => {
    if (followedSources.length === 0 || !activeFilters.includes('followed')) return null;
    
    const followedArticles = articles.filter(article => 
      followedSources.includes(article.source.name)
    );
    
    if (followedArticles.length === 0) return null;
    
    return (
      <View style={styles.followedSourcesSection}>
        <View style={styles.followedSourcesHeader}>
          <Ionicons name="heart" size={24} color="#EAC8A4" />
          <Text style={styles.followedSourcesTitle}>Following</Text>
        </View>
        
        {followedArticles.slice(0, 3).map((article, index) => (
          <Animated.View key={index} style={[styles.articleCard, { opacity: fadeAnim }]}>
            <TouchableOpacity onPress={() => handleArticleSelect(article)}>
              <ImageBackground source={{ uri: article.urlToImage }} style={styles.articleBackground}>
                <View style={styles.overlay}>
                  <View style={styles.sourceRow}>
                    <Text style={styles.articleSource}>{article.source.name}</Text>
                    <Animated.View style={{ transform: [{ scale: followAnim }] }}>
                      <TouchableOpacity 
                        onPress={() => toggleFollowSource(article.source.name)}
                        style={styles.followButton}
                      >
                        <Ionicons 
                          name="heart" 
                          size={18} 
                          color="#FFD700" 
                        />
                      </TouchableOpacity>
                    </Animated.View>
                  </View>
                  <Text style={styles.articleTitle}>{article.title}</Text>
                  
                  {isArticleOffline(article) && (
                    <View style={styles.miniOfflineBadge}>
                      <Ionicons name="download" size={12} color="#FFF" />
                    </View>
                  )}
                </View>
              </ImageBackground>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    );
  };

  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <>
        <TouchableWithoutFeedback onPress={animateFiltersOut}>
          <Animated.View 
            style={[
              styles.filterBackdrop,
              { opacity: filterBackdropAnim }
            ]}
          />
        </TouchableWithoutFeedback>
        
        <Animated.View 
          style={[
            styles.filterContainer,
            {
              transform: [{
                translateY: filterBackdropAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [300, 0],
                }),
              }],
            },
          ]}
        >
          <BlurView intensity={30} style={styles.filterContent} tint={isDark ? "dark" : "light"}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filter News</Text>
              <TouchableOpacity onPress={animateFiltersOut}>
                <Ionicons name="close" size={24} color={isDark ? "#EAC8A4" : "#EAC8A4"} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.filterOptionsContainer}>
              {filterOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.filterOption,
                    activeFilters.includes(option.id) && styles.activeFilterOption,
                  ]}
                  onPress={() => toggleFilter(option.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.filterOptionContent}>
                    <View style={[
                      styles.filterIconContainer,
                      activeFilters.includes(option.id) && styles.activeFilterIconContainer
                    ]}>
                      <Ionicons 
                        name={option.icon} 
                        size={20} 
                        color={activeFilters.includes(option.id) ? '#EAC8A4' : (isDark ? '#BBB' : '#555')} 
                      />
                    </View>
                    <Text style={[
                      styles.filterText,
                      activeFilters.includes(option.id) && styles.activeFilterText,
                    ]}>
                      {option.label}
                    </Text>
                  </View>
                  {activeFilters.includes(option.id) && (
                    <Ionicons name="checkmark" size={18} color="#EAC8A4" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.filterFooter}>
              <TouchableOpacity
                style={[
                  styles.clearButton,
                  activeFilters.length === 0 && styles.disabledClearButton
                ]}
                onPress={clearFilters}
                disabled={activeFilters.length === 0}
              >
                <Text style={styles.clearButtonText}>
                  Clear All Filters
                </Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </Animated.View>
      </>
    );
  };

  const styles = StyleSheet.create({
    mainContainer: {
      flex: 1,
      backgroundColor: isDark ? '#121212' : '#F8F8F8',
    },
    container: {
      flex: 1,
    },
    content: {
      padding: 16,
      paddingTop: 40,
      paddingBottom: 100,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 24,
      position: 'relative',
      zIndex: 1,
      paddingTop: 10,
    },
    appName: {
      fontSize: 34,
      fontWeight: 'bold',
      color: '#EAC8A4',
    },
    date: {
      fontSize: 14,
      color: isDark ? '#BBB' : '#8E8E93',
    },
    searchButton: {
      paddingTop: 4,
    },
    searchInput: {
      backgroundColor: isDark ? '#333' : '#FFFFFF',
      borderRadius: 12,
      padding: 12,
      fontSize: 16,
      marginBottom: 16,
      color: isDark ? '#FFF' : '#000',
    },
    sectionTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: isDark ? '#FFF' : '#000',
      marginBottom: 16,
    },
    articleCard: {
      marginBottom: 16,
      borderRadius: 16,
      overflow: 'hidden',
      height: 200,
    },
    articleBackground: {
      width: '100%',
      height: '100%',
      justifyContent: 'flex-end',
    },
    overlay: {
      padding: 16,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    articleSource: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#FFD700',
    },
    articleTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    fullNewsContainer: {
      padding: 16,
    },
    fullNewsImage: {
      width: '100%',
      height: 250,
      borderRadius: 12,
      overflow: 'hidden',
      justifyContent: 'center',
    },
    fullNewsControls: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      position: 'absolute',
      top: 10,
      left: 10,
      right: 10,
    },
    fullNewsTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      marginTop: 12,
      color: isDark ? '#FFF' : '#000',
    },
    fullNewsAuthor: {
      fontSize: 16,
      color: isDark ? '#BBB' : '#555',
      marginTop: 4,
    },
    fullNewsContent: {
      fontSize: 16,
      marginTop: 8,
      color: isDark ? '#DDD' : '#333',
    },
    fullNewsSource: {
      marginTop: 20,
      fontStyle: 'italic',
      color: isDark ? '#BBB' : '#555',
      textDecorationLine: 'underline',
    },
    sourceContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
    },
    fullNewsFollowButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(234, 200, 164, 0.2)' : 'rgba(234, 200, 164, 0.3)',
      paddingVertical: 5,
      paddingHorizontal: 12,
      borderRadius: 16,
    },
    followText: {
      marginLeft: 5,
      fontSize: 14,
      color: isDark ? '#EAC8A4' : '#EAC8A4',
      fontWeight: '500',
    },
    backButton: {
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: 5,
      borderRadius: 20,
    },
    saveButton: {
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: 5,
      borderRadius: 20,
    },
    actionButtonsContainer: {
      position: 'absolute',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      top: 2,
      right: -10,
      gap: 28,
    },
    actionButton: {
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: 8,
      borderRadius: 20,
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    refreshContainer: {
      position: 'absolute',
      top: 60,
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 10,
    },
    refreshCircle: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: isDark ? '#333' : '#FFF',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 3,
    },
    refreshText: {
      marginTop: 8,
      fontSize: 14,
      color: isDark ? '#EAC8A4' : '#EAC8A4',
      backgroundColor: isDark ? '#333' : '#FFF',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    relatedContentContainer: {
      marginTop: 20,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: isDark ? '#333' : '#E5E5E5',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 16,
    },
    sectionHeaderText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isDark ? '#FFF' : '#000',
      marginLeft: 8,
    },
    horizontalListContent: {
      paddingRight: 16,
    },
    horizontalArticleCard: {
      width: 220,
      height: 150,
      marginRight: 12,
      borderRadius: 8,
      overflow: 'hidden',
    },
    horizontalArticleImage: {
      width: '100%',
      height: '100%',
      justifyContent: 'flex-end',
    },
    horizontalArticleOverlay: {
      padding: 12,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    horizontalArticleSource: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#FFD700',
    },
    horizontalArticleTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    recommendedContainer: {
      marginBottom: 16,
    },
    relatedArticleCard: {
      marginBottom: 12,
      borderRadius: 8,
      overflow: 'hidden',
      height: 130,
    },
    relatedArticleImage: {
      width: '100%',
      height: '100%',
      justifyContent: 'flex-end',
    },
    relatedArticleOverlay: {
      padding: 12,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    relatedArticleSource: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#FFD700',
    },
    relatedArticleTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    relatedNewsCTA: {
      marginTop: 10,
      marginBottom: 30,
      alignItems: 'center',
    },
    exploreMoreButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#EAC8A4',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 25,
      justifyContent: 'center',
    },
    exploreMoreText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: isDark ? '#121212' : '#121212',
      marginRight: 5,
    },
    headerIcons: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 40,
      gap: 15,
      zIndex: 1,
    },
    locationPickerWrapper: {
      position: 'relative',
      zIndex: 100,
    },
    selectedLocationText: {
      fontSize: 50,
      color: isDark ? '#EAC8A4' : '#EAC8A4',
      marginLeft: 50,
    },
    offlineIndicator: {
      position: 'absolute',
      top: 10,
      right: 10,
      backgroundColor: 'rgba(0,0,0,0.7)',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      zIndex: 100,
    },
    offlineText: {
      color: '#FFF',
      fontSize: 12,
      marginLeft: 4,
    },
    offlineBadge: {
      backgroundColor: 'rgba(0,0,0,0.7)',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      marginTop: 8,
    },
    offlineBadgeText: {
      color: '#FFF',
      fontSize: 12,
      marginLeft: 4,
    },
    miniOfflineBadge: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: 4,
      borderRadius: 10,
    },
    sourceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    followButton: {
      padding: 4,
    },
    followedSourcesSection: {
      marginBottom: 16,
    },
    followedSourcesHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    followedSourcesTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: isDark ? '#FFF' : '#000',
      marginLeft: 8,
    },
    filterBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 10,
    },
    filterContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 20,
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    filterContent: {
      borderRadius: 20,
      overflow: 'hidden',
    },
    filterHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    },
    filterTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isDark ? '#FFF' : '#000',
    },
    filterOptionsContainer: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 16,
    },
    filterOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginBottom: 8,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    },
    activeFilterOption: {
      backgroundColor: isDark ? 'rgba(234, 200, 164, 0.15)' : 'rgba(234, 200, 164, 0.2)',
    },
    filterOptionContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    filterIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    activeFilterIconContainer: {
      backgroundColor: isDark ? 'rgba(234, 200, 164, 0.3)' : 'rgba(234, 200, 164, 0.4)',
    },
    filterText: {
      fontSize: 16,
      color: isDark ? '#BBB' : '#555',
    },
    activeFilterText: {
      color: isDark ? '#EAC8A4' : '#EAC8A4',
      fontWeight: '600',
    },
    filterFooter: {
      padding: 16,
      paddingTop: 0,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    },
    clearButton: {
      padding: 14,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    },
    disabledClearButton: {
      opacity: 0.5,
    },
    clearButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#EAC8A4' : '#EAC8A4',
    },
    filterHeaderButton: {
      position: 'relative',
      padding: 4,
    },
    filterBadge: {
      position: 'absolute',
      top: -2,
      right: -2,
      backgroundColor: '#EAC8A4',
      width: 16,
      height: 16,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    filterBadgeText: {
      color: isDark ? '#121212' : '#121212',
      fontSize: 10,
      fontWeight: 'bold',
    },
    activeFiltersBadge: {
      fontSize: 14,
      color: '#EAC8A4',
      fontWeight: 'normal',
    },
  });

  return (
    <View style={styles.mainContainer}>
      <OfflineIndicator />
      {renderCustomRefresh()}
      
      <TouchableWithoutFeedback onPress={() => showFilters && animateFiltersOut()}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          refreshControl={
            !selectedArticle ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                progressViewOffset={50}
                tintColor={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
                colors={[isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"]}
              />
            ) : undefined
          }
        >
          {selectedArticle ? (
            <Animated.View style={[styles.fullNewsContainer, { transform: [{ translateY: slideAnim }] }]}>
              <ImageBackground source={{ uri: selectedArticle.urlToImage }} style={styles.fullNewsImage}>
                <View style={styles.fullNewsControls}>
                  <TouchableOpacity onPress={() => setSelectedArticle(null)} style={styles.backButton}>
                    <Ionicons name="arrow-back-outline" size={24} color="white" />
                  </TouchableOpacity>
                  <View style={styles.actionButtonsContainer}>
                    
                    <Animated.View style={{ transform: [{ scale: offlineAnim }], marginRight: 10 }}>
                      <TouchableOpacity onPress={() => toggleOfflineArticle(selectedArticle)} style={styles.actionButton}>
                        <Ionicons 
                          name={isArticleOffline(selectedArticle) ? "download" : "download-outline"} 
                          size={24} 
                          color="white" 
                        />
                      </TouchableOpacity>
                    </Animated.View>
                    <Animated.View style={{ transform: [{ scale: shareAnim }], marginRight: 10 }}>
                      <TouchableOpacity onPress={() => shareArticle(selectedArticle)} style={styles.actionButton}>
                        <Ionicons name="share-social-outline" size={24} color="white" />
                      </TouchableOpacity>
                    </Animated.View>
                    <Animated.View style={{ transform: [{ scale: saveAnim }] }}>
                      <TouchableOpacity onPress={() => toggleSaveArticle(selectedArticle)} style={styles.actionButton}>
                        <Ionicons 
                          name={isArticleSaved(selectedArticle) ? "bookmark" : "bookmark-outline"} 
                          size={24} 
                          color="white" 
                        />
                      </TouchableOpacity>
                    </Animated.View>
                  </View>
                </View>
              </ImageBackground>
              <View style={styles.sourceContainer}>
                <Text style={styles.fullNewsSource} onPress={() => openSourceUrl(selectedArticle)}>
                  {selectedArticle.source.name}
                </Text>
                <TouchableOpacity 
                  onPress={() => toggleFollowSource(selectedArticle.source.name)}
                  style={styles.fullNewsFollowButton}
                >
                  <Ionicons 
                    name={isSourceFollowed(selectedArticle.source.name) ? "heart" : "heart-outline"} 
                    size={18} 
                    color={isDark ? "#EAC8A4" : "#EAC8A4"} 
                  />
                  <Text style={styles.followText}>
                    {isSourceFollowed(selectedArticle.source.name) ? "Following" : "Follow"}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.fullNewsTitle}>{selectedArticle.title}</Text>
              <Text style={styles.fullNewsAuthor}>{selectedArticle.content}</Text>
              <TouchableOpacity onPress={() => openSourceUrl(selectedArticle)}>
                <Text style={styles.fullNewsSource}>Source: {selectedArticle.source.name}</Text>
              </TouchableOpacity>
              
              {isArticleOffline(selectedArticle) && (
                <View style={styles.offlineBadge}>
                  <Ionicons name="download" size={14} color="#FFF" />
                  <Text style={styles.offlineBadgeText}>Available Offline</Text>
                </View>
              )}
              
              <View style={styles.relatedContentContainer}>
                {sameSourceArticles.length > 0 && (
                  <>
                    <SectionHeader 
                      title={`More from ${selectedArticle.source.name}`}
                      icon="newspaper-outline"
                      animValue={relatedSourceAnim}
                    />
                    <Animated.View style={{ opacity: relatedSourceAnim }}>
                      {renderHorizontalArticleList(sameSourceArticles)}
                    </Animated.View>
                  </>
                )}
                
                {trendingArticles.length > 0 && (
                  <>
                    <SectionHeader 
                      title="Trending Now"
                      icon="trending-up-outline"
                      animValue={trendingAnim}
                    />
                    <Animated.View style={{ opacity: trendingAnim }}>
                      {renderHorizontalArticleList(trendingArticles)}
                    </Animated.View>
                  </>
                )}
                
                {recommendedArticles.length > 0 && (
                  <>
                    <SectionHeader 
                      title="Recommended For You"
                      icon="star-outline"
                      animValue={recommendedAnim}
                    />
                    <Animated.View style={[styles.recommendedContainer, { opacity: recommendedAnim }]}>
                      {recommendedArticles.map(renderArticleCard)}
                    </Animated.View>
                  </>
                )}
                
                <Animated.View 
                  style={[
                    styles.relatedNewsCTA,
                    { opacity: recommendedAnim }
                  ]}
                >
                  <TouchableOpacity 
                    style={styles.exploreMoreButton}
                    onPress={() => setSelectedArticle(null)}
                  >
                    <Text style={styles.exploreMoreText}>Explore More News</Text>
                    <Ionicons name="chevron-forward" size={18} color="#FFF" />
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </Animated.View>
          ) : (
            <>
              <View style={styles.header}>
                <Animated.View style={{
                  transform: [
                    { translateX: titlePositionX },
                    { translateY: titlePositionY },
                    { scale: titleScale }
                  ],
                  opacity: titleOpacity,
                }}>
                  <Text style={styles.appName}>Expo X</Text>
                  <Animated.Text style={[styles.date, { opacity: dateOpacity }]}>
                    {format(new Date(), 'EEEE, MMMM d')}
                  </Animated.Text>
                </Animated.View>
                
                <View style={styles.headerIcons}>
                  <View style={styles.locationPickerWrapper}>
                    <LocationPicker 
                      onLocationSelect={setSelectedLocation} 
                      isDark={isDark} 
                    />
                  </View>
                  <TouchableOpacity onPress={animateFiltersIn} style={styles.filterHeaderButton}>
                    <Ionicons name="filter" size={22} color={isDark ? '#FFF' : '#000'} />
                    {activeFilters.length > 0 && (
                      <View style={styles.filterBadge}>
                        <Text style={styles.filterBadgeText}>{activeFilters.length}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <Animated.View style={{ opacity: searchOpacity }}>
                    <TouchableOpacity onPress={toggleSearch} style={styles.searchButton}>
                      <Ionicons name={showSearch ? 'close-outline' : 'search-outline'} size={24} color={isDark ? '#FFF' : '#000'} />
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              </View>

              {showSearch && (
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search news..."
                  placeholderTextColor={isDark ? '#BBB' : '#8E8E93'}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearch}
                  autoFocus
                />
              )}

              <View>
                <Text style={styles.sectionTitle}>
                  {isOfflineMode ? 'Available Offline' : 'Today\'s Headlines'}
                  {activeFilters.length > 0 && (
                    <Text style={styles.activeFiltersBadge}> • {activeFilters.length} active</Text>
                  )}
                </Text>
              </View>

              <FollowedSourcesSection />

              {articles.map((article, index) => (
                <Animated.View key={index} style={[styles.articleCard, { opacity: fadeAnim }]}>
                  <TouchableOpacity onPress={() => handleArticleSelect(article)}>
                    <ImageBackground source={{ uri: article.urlToImage }} style={styles.articleBackground}>
                      <View style={styles.overlay}>
                        <View style={styles.sourceRow}>
                          <Text style={styles.articleSource}>{article.source.name}</Text>
                          <TouchableOpacity 
                            onPress={() => toggleFollowSource(article.source.name)}
                            style={styles.followButton}
                          >
                            <Ionicons 
                              name={isSourceFollowed(article.source.name) ? "heart" : "heart-outline"} 
                              size={16} 
                              color="#FFD700" 
                            />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.articleTitle}>{article.title}</Text>
                        
                        {isArticleOffline(article) && (
                          <View style={styles.miniOfflineBadge}>
                            <Ionicons name="download" size={12} color="#FFF" />
                          </View>
                        )}
                      </View>
                    </ImageBackground>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </>
          )}
        </ScrollView>
      </TouchableWithoutFeedback>
      
      {/* Render filters modal */}
      {renderFilters()}
    </View>
  );
}