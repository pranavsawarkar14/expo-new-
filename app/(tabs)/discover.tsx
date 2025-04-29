import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  Animated,
  ImageBackground,
  Linking,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { fetchNewsByCategory, searchNews, Article } from '../api/newsApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

const categories = [
  'All',
  'Technology',
  'Business',
  'Science',
  'Health',
  'Sports',
  'Entertainment',
];

export default function DiscoverScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [savedArticles, setSavedArticles] = useState<string[]>([]);
  const [sameSourceArticles, setSameSourceArticles] = useState<Article[]>([]);
  const [trendingArticles, setTrendingArticles] = useState<Article[]>([]);
  const [recommendedArticles, setRecommendedArticles] = useState<Article[]>([]);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;
  const saveAnim = useRef(new Animated.Value(1)).current;
  const shareAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadArticles();
    loadSavedArticles();
  }, [selectedCategory]);

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

  const loadArticles = async () => {
    setLoading(true);
    try {
      const fetchedArticles = await fetchNewsByCategory(
        selectedCategory === 'All' ? 'all' : selectedCategory
      );
      setArticles(fetchedArticles || []);
      fadeIn();
    } catch (error) {
      console.error('Error fetching news:', error);
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const results = await searchNews(searchQuery);
      setArticles(results || []);
      fadeIn();
    } catch (error) {
      console.error('Error searching news:', error);
    }
    setLoading(false);
  };

  const findRelatedContent = (article: Article) => {
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
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const animateShare = () => {
    shareAnim.setValue(1.5);
    Animated.spring(shareAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const isArticleSaved = (article: Article): boolean => {
    return savedArticles.includes(article.url);
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
          readTime: `${Math.ceil((article.content?.length || 0) / 1000) || 5} min read`,
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

  const handleArticleSelect = (article: Article) => {
    setSelectedArticle(article);
    findRelatedContent(article);
    slideIn();
  };

  const openSourceUrl = (article: Article) => {
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

  const SectionHeader = ({ title, icon }: { title: string, icon: string }) => (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={20} color={isDark ? '#EAC8A4' : '#EAC8A4'} />
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

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
          <Text style={styles.relatedArticleSource}>{article.source.name}</Text>
          <Text style={styles.relatedArticleTitle} numberOfLines={2}>
            {article.title}
          </Text>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );

  const renderHorizontalArticleList = (articles: Article[]) => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.horizontalListContent}
    >
      {articles.map((article, index) => (
        <TouchableOpacity 
          key={index}
          style={styles.horizontalArticleCard}
          onPress={() => handleArticleSelect(article)}
        >
          <ImageBackground 
            source={{ uri: article.urlToImage }} 
            style={styles.horizontalArticleImage}
            imageStyle={{ borderRadius: 8 }}
          >
            <View style={styles.horizontalArticleOverlay}>
              <Text style={styles.horizontalArticleSource}>{article.source.name}</Text>
              <Text style={styles.horizontalArticleTitle} numberOfLines={2}>
                {article.title}
              </Text>
            </View>
          </ImageBackground>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#121212' : '#F8F8F8',
    },
    content: {
      padding: 16,
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
      paddingBottom: 100,
    },
    header: {
      marginBottom: 24,
    },
    appName: {
      fontSize: 34,
      fontWeight: 'bold',
      color: '#EAC8A4',
      marginBottom: 16,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#333' : '#FFFFFF',
      borderRadius: 12,
      paddingHorizontal: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: 2,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: isDark ? '#FFF' : '#000',
      padding: 12,
    },
    searchButton: {
      padding: 8,
    },
    categoriesContainer: {
      marginBottom: 24,
    },
    categoriesContent: {
      paddingRight: 16,
    },
    categoryButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: isDark ? '#333' : '#FFFFFF',
      marginRight: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    categoryButtonActive: {
      backgroundColor: '#EAC8A4',
    },
    categoryText: {
      fontSize: 14,
      color: isDark ? '#FFFFFF' : '#000000',
    },
    categoryTextActive: {
      color: isDark ? '#000' : '#000',
      fontWeight: '600',
    },
    sectionTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: isDark ? '#FFF' : '#000',
      marginBottom: 16,
    },
    articlesContainer: {
      gap: 16,
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
    articleHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    articleSource: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#FFD700',
    },
    articleActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    articleAction: {
      padding: 5,
      marginLeft: 10,
    },
    articleTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    noArticlesText: {
      textAlign: 'center',
      fontSize: 16,
      color: '#8E8E93',
      marginTop: 20,
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
      alignItems: 'center',
      position: 'absolute',
      top: 10,
      left: 10,
      right: 10,
    },
    actionButtons: {
      flexDirection: 'row',
      alignItems: 'center',
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
    backButton: {
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: 5,
      borderRadius: 20,
    },
    actionButton: {
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: 5,
      borderRadius: 20,
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
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {selectedArticle ? (
        <Animated.View style={[styles.fullNewsContainer, { transform: [{ translateY: slideAnim }] }]}>
          <ImageBackground source={{ uri: selectedArticle.urlToImage }} style={styles.fullNewsImage}>
            <View style={styles.fullNewsControls}>
              <TouchableOpacity onPress={() => setSelectedArticle(null)} style={styles.backButton}>
                <Ionicons name="arrow-back-outline" size={24} color="white" />
              </TouchableOpacity>
              <View style={styles.actionButtons}>
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
          <Text style={styles.fullNewsTitle}>{selectedArticle.title}</Text>
          <Text style={styles.fullNewsAuthor}>{selectedArticle.author || 'Unknown author'}</Text>
          <Text style={styles.fullNewsContent}>{selectedArticle.content || selectedArticle.description}</Text>
          <TouchableOpacity onPress={() => openSourceUrl(selectedArticle)}>
            <Text style={styles.fullNewsSource}>Source: {selectedArticle.source.name}</Text>
          </TouchableOpacity>

          <View style={styles.relatedContentContainer}>
            {sameSourceArticles.length > 0 && (
              <>
                <SectionHeader 
                  title={`More from ${selectedArticle.source.name}`}
                  icon="newspaper-outline"
                />
                {renderHorizontalArticleList(sameSourceArticles)}
              </>
            )}
            
            {trendingArticles.length > 0 && (
              <>
                <SectionHeader 
                  title="Trending Now"
                  icon="trending-up-outline"
                />
                {renderHorizontalArticleList(trendingArticles)}
              </>
            )}
            
            {recommendedArticles.length > 0 && (
              <>
                <SectionHeader 
                  title="Recommended For You"
                  icon="star-outline"
                />
                <View style={styles.recommendedContainer}>
                  {recommendedArticles.map(renderArticleCard)}
                </View>
              </>
            )}
            
            <View style={styles.relatedNewsCTA}>
              <TouchableOpacity 
                style={styles.exploreMoreButton}
                onPress={() => setSelectedArticle(null)}
              >
                <Text style={styles.exploreMoreText}>Explore More News</Text>
                <Ionicons name="chevron-forward" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.appName}>Discover</Text>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search news..."
                placeholderTextColor={isDark ? '#BBB' : '#8E8E93'}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
              />
              <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
                <Ionicons name="search-outline" size={24} color={isDark ? '#FFF' : '#000'} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.categoriesContainer}
            contentContainerStyle={styles.categoriesContent}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[styles.categoryButton, selectedCategory === category && styles.categoryButtonActive]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[styles.categoryText, selectedCategory === category && styles.categoryTextActive]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.sectionTitle}>
            {selectedCategory === 'All' ? 'All News' : `${selectedCategory} News`}
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color="#EAC8A4" style={{ marginTop: 20 }} />
          ) : (
            <View style={styles.articlesContainer}>
              {articles.length > 0 ? (
                articles.map((article, index) => (
                  <Animated.View key={index} style={[styles.articleCard, { opacity: fadeAnim }]}>
                    <TouchableOpacity onPress={() => handleArticleSelect(article)}>
                      <ImageBackground source={{ uri: article.urlToImage }} style={styles.articleBackground}>
                        <View style={styles.overlay}>
                          <View style={styles.articleHeader}>
                            <Text style={styles.articleSource}>{article.source.name}</Text>
                            <View style={styles.articleActions}>
                              <TouchableOpacity 
                                onPress={(e) => {
                                  e.stopPropagation();
                                  shareArticle(article);
                                }}
                                style={styles.articleAction}
                              >
                                <Ionicons name="share-social-outline" size={20} color="#FFD700" />
                              </TouchableOpacity>
                              <TouchableOpacity 
                                onPress={(e) => {
                                  e.stopPropagation();
                                  toggleSaveArticle(article);
                                }}
                                style={styles.articleAction}
                              >
                                <Animated.View style={{ transform: [{ scale: isArticleSaved(article) ? 1 : 1 }] }}>
                                  <Ionicons 
                                    name={isArticleSaved(article) ? "bookmark" : "bookmark-outline"} 
                                    size={20} 
                                    color="#FFD700" 
                                  />
                                </Animated.View>
                              </TouchableOpacity>
                            </View>
                          </View>
                          <Text style={styles.articleTitle}>{article.title}</Text>
                        </View>
                      </ImageBackground>
                    </TouchableOpacity>
                  </Animated.View>
                ))
              ) : (
                <Text style={styles.noArticlesText}>No articles available.</Text>
              )}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}