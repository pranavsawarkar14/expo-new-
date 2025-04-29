import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeInRight,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  Layout,
  ZoomIn,
  ZoomOut,
  LightSpeedInLeft,
  useSharedValue,
  withTiming,
  withSpring,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;
const CARD_HEIGHT = 160;
const SPACING = 20;

interface Source {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  category?: string;
  followers?: number;
  articles?: number;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

export default function FollowingList() {
  const router = useRouter();
  const { theme, isDark, getFontSize } = useTheme();
  const [followedSources, setFollowedSources] = useState<Source[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useSharedValue(0);

  const loadFollowedSources = async () => {
    try {
      const followed = await AsyncStorage.getItem('followedSources');
      const sources = followed ? JSON.parse(followed) : [];
      setFollowedSources(sources);
    } catch (error) {
      console.error('Error loading followed sources:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFollowedSources();
    setRefreshing(false);
  };

  useEffect(() => {
    loadFollowedSources();
  }, []);

  const handleUnfollow = async (sourceId: string) => {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      const updatedSources = followedSources.filter(source => source.id !== sourceId);
      await AsyncStorage.setItem('followedSources', JSON.stringify(updatedSources));
      setFollowedSources(updatedSources);
      
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error unfollowing source:', error);
    }
  };

  const renderItem = ({ item, index }: { item: Source; index: number }) => {
    const inputRange = [
      -1,
      0,
      CARD_HEIGHT * index,
      CARD_HEIGHT * (index + 2)
    ];

    const opacityInputRange = [
      -1,
      0,
      CARD_HEIGHT * index,
      CARD_HEIGHT * (index + 1)
    ];

    const cardScale = scrollY.interpolate({
      inputRange,
      outputRange: [1, 1, 1, 0.9],
      extrapolate: Extrapolate.CLAMP
    });

    const cardOpacity = scrollY.interpolate({
      inputRange: opacityInputRange,
      outputRange: [1, 1, 1, 0.5],
      extrapolate: Extrapolate.CLAMP
    });

    const cardStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: cardScale.value }],
        opacity: cardOpacity.value
      };
    });

    return (
      <Animated.View 
        entering={FadeInRight.delay(index * 100).springify().damping(10)}
        exiting={FadeOut.duration(200)}
        layout={Layout.springify()}
        style={[styles.cardContainer, cardStyle]}
      >
        <LinearGradient
          colors={isDark ? ['#1C1C1E', '#2C2C2E'] : ['#FFFFFF', '#F2F2F7']}
          style={styles.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.cardHeader}>
            {item.logo ? (
              <Image 
                source={{ uri: item.logo }} 
                style={styles.logo} 
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.logo, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                <MaterialCommunityIcons 
                  name="newspaper-variant-outline" 
                  size={32} 
                  color={isDark ? '#8E8E93' : '#8E8E93'} 
                />
              </View>
            )}
            <View style={styles.sourceInfo}>
              <Text style={[styles.sourceName, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                {item.name}
              </Text>
              {item.category && (
                <Text style={[styles.sourceCategory, { color: '#007AFF' }]}>
                  {item.category}
                </Text>
              )}
            </View>
            <AnimatedTouchable
              entering={ZoomIn.delay(300 + index * 50)}
              exiting={ZoomOut}
              style={styles.unfollowButton}
              onPress={() => handleUnfollow(item.id)}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={20} color="#FF3B30" />
            </AnimatedTouchable>
          </View>

          {item.description && (
            <Text style={[styles.sourceDescription, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
              {item.description}
            </Text>
          )}

          <View style={styles.cardFooter}>
            <View style={styles.statItem}>
              <Ionicons 
                name="people-outline" 
                size={16} 
                color={isDark ? '#8E8E93' : '#8E8E93'} 
              />
              <Text style={[styles.statText, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
                {item.followers ? item.followers.toLocaleString() : '0'} followers
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons 
                name="document-text-outline" 
                size={16} 
                color={isDark ? '#8E8E93' : '#8E8E93'} 
              />
              <Text style={[styles.statText, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
                {item.articles ? item.articles.toLocaleString() : '0'} articles
              </Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#000000' : '#F2F2F7',
    },
    header: {
      paddingTop: Platform.OS === 'ios' ? 50 : 30,
      paddingBottom: 20,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#2C2C2E' : '#E5E5EA',
    },
    headerTitle: {
      fontSize: getFontSize(24),
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#000000',
      letterSpacing: -0.5,
    },
    closeButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA',
    },
    listContainer: {
      paddingTop: 20,
      paddingBottom: 40,
    },
    cardContainer: {
      marginHorizontal: SPACING,
      marginBottom: SPACING,
      borderRadius: 20,
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: isDark ? 0.2 : 0.1,
      shadowRadius: 10,
      elevation: 5,
    },
    card: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      padding: 20,
      borderRadius: 20,
      justifyContent: 'space-between',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15,
    },
    logo: {
      width: 50,
      height: 50,
      borderRadius: 12,
      marginRight: 15,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sourceInfo: {
      flex: 1,
    },
    sourceName: {
      fontSize: getFontSize(18),
      fontWeight: '700',
      marginBottom: 4,
    },
    sourceCategory: {
      fontSize: getFontSize(12),
      fontWeight: '600',
    },
    unfollowButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255, 59, 48, 0.2)' : 'rgba(255, 59, 48, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    sourceDescription: {
      fontSize: getFontSize(14),
      lineHeight: 20,
      marginBottom: 15,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statText: {
      fontSize: getFontSize(12),
      marginLeft: 6,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
    },
    emptyIllustration: {
      width: 200,
      height: 200,
      opacity: 0.7,
      marginBottom: 30,
    },
    emptyTitle: {
      fontSize: getFontSize(20),
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#000000',
      marginBottom: 10,
      textAlign: 'center',
    },
    emptyText: {
      fontSize: getFontSize(14),
      color: isDark ? '#8E8E93' : '#8E8E93',
      textAlign: 'center',
      lineHeight: 22,
    },
  });

  return (
    <View style={styles.container}>
      <Animated.View 
        style={styles.header}
        entering={SlideInDown.springify().damping(15)}
      >
        <Text style={styles.headerTitle}>Following</Text>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="close" 
            size={24} 
            color={isDark ? '#FFFFFF' : '#000000'} 
          />
        </TouchableOpacity>
      </Animated.View>

      {followedSources.length > 0 ? (
        <AnimatedFlatList
          data={followedSources}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          refreshing={refreshing}
          onRefresh={onRefresh}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <Animated.View 
          style={styles.emptyContainer}
          entering={LightSpeedInLeft.duration(600)}
        >
          <MaterialCommunityIcons 
            name="newspaper-variant-outline" 
            size={200} 
            color={isDark ? '#2C2C2E' : '#E5E5EA'} 
            style={styles.emptyIllustration}
          />
          <Text style={styles.emptyTitle}>No Sources Followed</Text>
          <Text style={styles.emptyText}>
            You haven't followed any news sources yet. Discover and follow sources to see their latest articles in your feed.
          </Text>
        </Animated.View>
      )}
    </View>
  );
}