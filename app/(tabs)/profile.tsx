import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Switch,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import Animated, {
  FadeInDown,
  SlideInRight,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  SlideInUp,
  Layout,
  FadeIn,
  interpolateColor,
  runOnJS,
  useSharedValue,
  withRepeat,
  withDelay,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EditProfileModal, { ProfileData } from '../components/EditProfileModal';
import ContactSupportModal from '../components/ContactSupportModal';
import PrivacySettingsModal from '../components/PrivacySettingsModal';
import EmailPreferencesModal from '../components/EmailPreferencesModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import HelpCenterModal from '../components/HelpCenterModal';
import DataUsageModal from '../components/DataUsageModal';
import ChatbotModal from '../components/ChatbotModal';
import PremiumModal from '../components/PremiumModal';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';


interface Article {
  id: string;
  title: string;
  image: string;
  category: string;
  date: string;
  readTime: string;
  content: string;
  author: string;
  source: {
    name: string;
  };
  url: string;
}

const sections = [
  {
    title: 'App Settings',
    items: [
      { icon: 'notifications-outline', label: 'Push Notifications', type: 'toggle' },
      { icon: 'moon-outline', label: 'Dark Mode', type: 'toggle' },
      { icon: 'wifi-outline', label: 'Offline Reading', type: 'toggle' },
    ],
  },
  {
    title: 'Content Preferences',
    items: [
      { icon: 'text-outline', label: 'Text Size', options: ['Small', 'Medium', 'Large'] },
      { icon: 'globe-outline', label: 'Language', options: ['English', 'Spanish', 'French'] },
      { icon: 'newspaper-outline', label: 'News Categories', value: '6 selected' },
      { icon: 'time-outline', label: 'Reading Time Format', options: ['Minutes', 'Time to Read'] },
    ],
  },
  {
    title: 'Privacy & Data',
    items: [
      { icon: 'shield-checkmark-outline', label: 'Privacy Settings' },
      { icon: 'cloud-download-outline', label: 'Data Usage', value: '1.2 GB' },
      { icon: 'trash-outline', label: 'Clear Cache', action: 'clear' },
      { icon: 'time-outline', label: 'Clear Read History', action: 'clearHistory' },
    ],
  },
  {
    title: 'Account',
    items: [
      { icon: 'person-outline', label: 'Edit Profile' },
      { icon: 'key-outline', label: 'Change Password' },
      { icon: 'mail-outline', label: 'Email Preferences' },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: 'help-circle-outline', label: 'Help Center' },
      { icon: 'chatbubble-outline', label: 'Contact Support' },
      { icon: 'information-circle-outline', label: 'About Expo X ', version: '1.0.0' },
    ],
  },
  {
    title: 'AI Assistant',
    items: [
      { 
        icon: 'chatbubbles-outline', 
        label: 'Chat with AI', 
        description: 'Get help and recommendations'
      },
    ],
  },
];

const achievements = [
  { id: 'early_bird', icon: 'sunrise', label: 'Early Bird', description: 'Read 5 articles before 9 AM' },
  { id: 'night_owl', icon: 'moon', label: 'Night Owl', description: 'Read 5 articles after 10 PM' },
  { id: 'speed_reader', icon: 'lightning-bolt', label: 'Speed Reader', description: 'Read 10 articles in one day' },
  { id: 'diverse_reader', icon: 'book-open-variant', label: 'Diverse Reader', description: 'Read articles from 5 different categories' },
];

const readingPreferences = [
  { 
    id: 'morning', 
    label: 'Morning', 
    icon: 'weather-sunny',
    description: '6 AM - 12 PM',
    color: '#FFD700'
  },
  { 
    id: 'afternoon', 
    label: 'Afternoon', 
    icon: 'weather-partly-cloudy',
    description: '12 PM - 5 PM',
    color: '#87CEEB'
  },
  { 
    id: 'evening', 
    label: 'Evening', 
    icon: 'weather-night',
    description: '5 PM - 9 PM',
    color: '#FFA500'
  },
  { 
    id: 'night', 
    label: 'Night', 
    icon: 'weather-night',
    description: '9 PM - 6 AM',
    color: '#4B0082'
  },
];

interface ReadingInsights {
  totalReadTime: number;
  averageReadTime: number;
  favoriteCategory: string;
  readingStreak: number;
  totalArticles: number;
  weeklyProgress: number;
  monthlyProgress: number;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { theme, toggleTheme, isDark, textSize, setTextSize, getFontSize } = useTheme();
  const { notificationsEnabled, toggleNotifications } = useNotifications();
  
  const [stats, setStats] = useState([
    { value: '0', label: 'Articles Read' },
    { value: '0', label: 'Saved' },
    { value: '0', label: 'Following' },
  ]);
  const [refreshing, setRefreshing] = useState(false);
  
  const [selectedOptions, setSelectedOptions] = useState({
    textSize: 'Medium',
    language: 'English',
    readingTimeFormat: 'Minutes',
    notifications: true,
    offlineReading: false,
  });

  const [profileImage, setProfileImage] = useState(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showContactSupport, setShowContactSupport] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [showEmailPreferences, setShowEmailPreferences] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showDataUsage, setShowDataUsage] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [showThemeAnimation, setShowThemeAnimation] = useState(false);
  
  const [profileData, setProfileData] = useState({
    name: 'USER',
    email: 'USER@example.com',
    bio: '',
    phone: '',
    location: '',
  });

  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const rippleProgress = useSharedValue(0);
  const rippleScale = useSharedValue(0);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotateZ: `${rotation.value}deg` },
    ],
  }));
  
  const rippleAnimatedStyle = useAnimatedStyle(() => {
    const fromColor = isDark ? '#000000' : '#FFFFFF';
    const toColor = isDark ? '#FFFFFF' : '#000000';
    
    return {
      backgroundColor: interpolateColor(
        rippleProgress.value,
        [0, 1],
        [fromColor, toColor]
      ),
      transform: [{ scale: rippleScale.value }],
    };
  });

  const [profileCompletion, setProfileCompletion] = useState(0);
  const [achievements, setAchievements] = useState([]);
  const [readingInsights, setReadingInsights] = useState<ReadingInsights>({
    totalReadTime: 0,
    averageReadTime: 0,
    favoriteCategory: '',
    readingStreak: 0,
    totalArticles: 0,
    weeklyProgress: 0,
    monthlyProgress: 0,
  });
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [showPreferences, setShowPreferences] = useState(true);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  const progressAnimation = useSharedValue(0);
  const pulseAnimation = useSharedValue(1);

  const progressWidth = useAnimatedStyle(() => {
    return {
      width: `${progressAnimation.value * 100}%`,
    };
  });

  const loadStats = async () => {
    try {
      // Load saved articles count
      const saved = await AsyncStorage.getItem('savedArticles');
      const savedCount = saved ? JSON.parse(saved).length : 0;
      
      // Load followed sources count
      const followed = await AsyncStorage.getItem('followedSources');
      const followedCount = followed ? JSON.parse(followed).length : 0;
      
      // Load read articles count
      const read = await AsyncStorage.getItem('readArticles');
      const readCount = read ? JSON.parse(read).length : 0;
      
      // Update stats
      setStats([
        { value: readCount.toString(), label: 'Articles Read' },
        { value: savedCount.toString(), label: 'Saved' },
        { value: followedCount.toString(), label: 'Following' },
      ]);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  useEffect(() => {
    // Initialize read articles if not exists
    const initReadArticles = async () => {
      try {
        const read = await AsyncStorage.getItem('readArticles');
        if (!read) {
          await AsyncStorage.setItem('readArticles', JSON.stringify([]));
        }
      } catch (error) {
        console.error('Error initializing read articles:', error);
      }
    };
    
    initReadArticles();
    loadStats();
  }, []);

  const clearReadHistory = async () => {
    try {
      await AsyncStorage.removeItem('readArticles');
      await loadStats(); // Refresh the stats
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert('Success', 'Read history cleared');
    } catch (error) {
      console.error('Error clearing read history:', error);
    }
  };

  const handleOptionChange = async (setting, value) => {
    if (Platform.OS !== 'web') {
      await Haptics.selectionAsync();
    }
    
    if (setting === 'Text Size') {
      setTextSize(value.toLowerCase());
    }
    
    setSelectedOptions(prev => ({
      ...prev,
      [setting.toLowerCase().replace(/ /g, '')]: value,
    }));
  };

  const handleToggle = async (setting) => {
    if (Platform.OS !== 'web') {
      await Haptics.selectionAsync();
    }
    
    if (setting === 'Dark Mode') {
      handleThemeToggle();
      return;
    }

    if (setting === 'Push Notifications') {
      await toggleNotifications();
      return;
    }
    
    const settingKey = setting.toLowerCase().replace(/ /g, '');
    setSelectedOptions(prev => ({
      ...prev,
      [settingKey]: !prev[settingKey],
    }));
  };

  const handleThemeToggle = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    setShowThemeAnimation(true);
    rippleScale.value = 0;
    rippleProgress.value = 0;
    
    rippleScale.value = withTiming(1.5, { duration: 800 });
    rippleProgress.value = withTiming(1, { duration: 800 }, () => {
      runOnJS(toggleTheme)();
      setTimeout(() => {
        runOnJS(setShowThemeAnimation)(false);
      }, 200);
    });
  };

  const handleAction = async (action, label) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    switch (action) {
      case 'clear':
        Alert.alert(
          'Clear Cache',
          'Are you sure you want to clear the cache?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Clear',
              style: 'destructive',
              onPress: async () => {
                if (Platform.OS !== 'web') {
                  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                Alert.alert('Success', 'Cache has been cleared');
              },
            },
          ]
        );
        break;
      case 'clearHistory':
        Alert.alert(
          'Clear Read History',
          'Are you sure you want to clear your read history?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Clear',
              style: 'destructive',
              onPress: clearReadHistory,
            },
          ]
        );
        break;
      default:
        if (label === 'Contact Support') {
          setShowContactSupport(true);
        } else {
          Alert.alert('Action', `${label} action triggered`);
        }
    }
  };

  const handleAvatarEdit = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Please grant permission to access your photos to change your profile picture.'
          );
          return;
        }
      }
  
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
  
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        
        if (selectedAsset.uri) {
          let imageUri = selectedAsset.uri;
          if (Platform.OS === 'android' && !imageUri.startsWith('file://')) {
            if (!imageUri.startsWith('content://') && !imageUri.startsWith('http')) {
              imageUri = 'file://' + imageUri;
            }
          }
          
          setProfileImage(imageUri);
          
          scale.value = withSequence(
            withSpring(1.2),
            withSpring(1)
          );
          
          rotation.value = withSequence(
            withTiming(-10),
            withTiming(10),
            withTiming(0)
          );
          
          if (Platform.OS !== 'web') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          
          Alert.alert('Success', 'Profile picture updated successfully');
        }
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'There was an error selecting your profile picture. Please try again.'
      );
    }
  };

  const handleLogout = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => router.replace('/auth/login'),
        },
      ]
    );
  };

  const handleMenuItemPress = async (item) => {
    if (Platform.OS !== 'web') {
      await Haptics.selectionAsync();
    }

    if (item.action) {
      handleAction(item.action, item.label);
    } else if (item.options) {
      Alert.alert(
        item.label,
        'Select an option:',
        item.options.map(option => ({
          text: option,
          onPress: () => handleOptionChange(item.label, option),
        }))
      );
    } else if (item.label === 'Edit Profile') {
      setShowEditProfile(true);
    } else if (item.label === 'Privacy Settings') {
      setShowPrivacySettings(true);
    } else if (item.label === 'Email Preferences') {
      setShowEmailPreferences(true);
    } else if (item.label === 'Change Password') {
      setShowChangePassword(true);
    } else if (item.label === 'Help Center') {
      setShowHelpCenter(true);
    } else if (item.label === 'Data Usage') {
      setShowDataUsage(true);
    } else if (item.label === 'Contact Support') {
      setShowContactSupport(true);
    } else if (item.label === 'Chat with AI') {
      setShowChatbot(true);
    } else if (item.type !== 'toggle') {
      Alert.alert(item.label, `${item.label} settings will be implemented here`);
    }
  };

  const handleSaveProfile = (data) => {
    setProfileData(data);
    setShowEditProfile(false);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleStatPress = (label: string) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    
    if (label === 'Saved') {
      router.push('/saved');
    } else if (label === 'Following') {
      // Premium animation sequence
      scale.value = withSequence(
        withSpring(0.92, { damping: 12, stiffness: 300 }),
        withSpring(1.03, { damping: 12, stiffness: 300 }),
        withSpring(1, { damping: 12, stiffness: 300 }, () => {
          runOnJS(router.push)('/following');
        })
      );
    }
  };

  useEffect(() => {
    calculateProfileCompletion();
    loadAchievements();
    loadReadingInsights();
    loadReadingPreferences();
    checkPremiumStatus();
  }, [profileData]);

  const calculateProfileCompletion = () => {
    const fields = ['name', 'email', 'bio', 'phone', 'location', 'profileImage'];
    const completedFields = fields.filter(field => {
      if (field === 'profileImage') return profileImage !== null;
      return profileData[field] && profileData[field].length > 0;
    });
    const completion = (completedFields.length / fields.length) * 100;
    setProfileCompletion(completion);
    
    progressAnimation.value = withTiming(completion / 100, { duration: 1000 });
  };

  const loadAchievements = async () => {
    try {
      const savedAchievements = await AsyncStorage.getItem('achievements');
      if (savedAchievements) {
        setAchievements(JSON.parse(savedAchievements));
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  };

  const loadReadingInsights = async () => {
    try {
      const readArticles = await AsyncStorage.getItem('readArticles');
      if (readArticles) {
        const articles = JSON.parse(readArticles);
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Calculate total read time and average
        const totalReadTime = articles.reduce((acc: number, article: any) => {
          const readTime = article.readTime || 0;
          return acc + readTime;
        }, 0);

        // Calculate weekly and monthly progress
        const weeklyArticles = articles.filter((article: any) => 
          new Date(article.date) >= weekAgo
        );
        const monthlyArticles = articles.filter((article: any) => 
          new Date(article.date) >= monthAgo
        );

        // Calculate favorite category
        const categories = articles.map((article: any) => article.category);
        const categoryCount = categories.reduce((acc: { [key: string]: number }, category: string) => {
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {});
        const favoriteCategory = Object.entries(categoryCount)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || '';

        setReadingInsights({
          totalReadTime,
          averageReadTime: articles.length > 0 ? totalReadTime / articles.length : 0,
          favoriteCategory,
          readingStreak: calculateReadingStreak(articles),
          totalArticles: articles.length,
          weeklyProgress: weeklyArticles.length,
          monthlyProgress: monthlyArticles.length,
        });
      }
    } catch (error) {
      console.error('Error loading reading insights:', error);
    }
  };

  const calculateReadingStreak = (articles) => {
    if (!articles.length) return 0;
    
    const dates = articles.map(article => new Date(article.date).toDateString());
    const uniqueDates = [...new Set(dates)].sort();
    
    let streak = 1;
    let currentStreak = 1;
    
    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i - 1]);
      const currDate = new Date(uniqueDates[i]);
      const diffDays = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        currentStreak++;
        streak = Math.max(streak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }
    
    return streak;
  };

  const loadReadingPreferences = async () => {
    try {
      const savedPreferences = await AsyncStorage.getItem('readingPreferences');
      if (savedPreferences) {
        setSelectedPreferences(JSON.parse(savedPreferences));
      }
    } catch (error) {
      console.error('Error loading reading preferences:', error);
    }
  };

  const checkPremiumStatus = async () => {
    try {
      const premiumStatus = await AsyncStorage.getItem('premiumStatus');
      setIsPremium(premiumStatus === 'true');
    } catch (error) {
      console.error('Error checking premium status:', error);
    }
  };

  const toggleReadingPreference = async (preferenceId: string) => {
    if (Platform.OS !== 'web') {
      await Haptics.selectionAsync();
    }
    
    setSelectedPreferences(prev => {
      const newPreferences = prev.includes(preferenceId)
        ? prev.filter(id => id !== preferenceId)
        : [...prev, preferenceId];
      
      AsyncStorage.setItem('readingPreferences', JSON.stringify(newPreferences));
      return newPreferences;
    });
  };

  const getSelectedPreferencesSummary = () => {
    if (selectedPreferences.length === 0) return 'No preferences selected';
    if (selectedPreferences.length === readingPreferences.length) return 'All times selected';
    
    const selectedLabels = selectedPreferences
      .map(id => readingPreferences.find(p => p.id === id)?.label)
      .filter(Boolean)
      .join(', ');
    
    return selectedLabels;
  };

  const handlePremiumUpgrade = () => {
    setShowPremiumModal(true);
  };

  const styles = createStyles(isDark, getFontSize);

  return (
    <>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[isDark ? '#EAC8A4' : '#EAC8A4']}
            tintColor={isDark ? '#EAC8A4' : '#EAC8A4'}
          />
        }
      >
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity onPress={handleThemeToggle} style={styles.themeToggle}>
            <Ionicons
              name={isDark ? 'sunny-outline' : 'moon-outline'}
              size={24}
              color={isDark ? '#FFFFFF' : '#000000'}
            />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)} style={styles.profileCompletion}>
          <View style={styles.profileCompletionHeader}>
            <Text style={styles.profileCompletionTitle}>Profile Completion</Text>
            <Text style={styles.profileCompletionPercentage}>{Math.round(profileCompletion)}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <Animated.View
              style={[
                styles.progressBar,
                progressWidth,
              ]}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300)} style={styles.userInfo}>
          <Animated.View style={[styles.avatarContainer, animatedStyle]}>
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.avatar}
                contentFit="cover"
                transition={300}
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{profileData.name[0]}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.editAvatarButton}
              onPress={handleAvatarEdit}>
              <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.name}>{profileData.name}</Text>
          <Text style={styles.email}>{profileData.email}</Text>
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => setShowEditProfile(true)}>
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400)} style={styles.insightsContainer}>
          <Text style={styles.insightsTitle}>Reading Insights</Text>
          <View style={styles.insightsGrid}>
            <View style={styles.insightCard}>
              <MaterialCommunityIcons name="clock-outline" size={24} color="#EAC8A4" />
              <Text style={styles.insightValue}>{Math.round(readingInsights.totalReadTime)} min</Text>
              <Text style={styles.insightLabel}>Total Read Time</Text>
            </View>
            <View style={styles.insightCard}>
              <MaterialCommunityIcons name="fire" size={24} color="#EAC8A4" />
              <Text style={styles.insightValue}>{readingInsights.readingStreak}</Text>
              <Text style={styles.insightLabel}>Day Streak</Text>
            </View>
            <View style={styles.insightCard}>
              <MaterialCommunityIcons name="bookmark-outline" size={24} color="#EAC8A4" />
              <Text style={styles.insightValue}>{readingInsights.totalArticles}</Text>
              <Text style={styles.insightLabel}>Total Articles</Text>
            </View>
          </View>

          <View style={styles.insightsProgressContainer}>
            <View style={styles.insightsProgressItem}>
              <View style={styles.insightsProgressHeader}>
                <Text style={styles.insightsProgressLabel}>Weekly Progress</Text>
                <Text style={styles.insightsProgressValue}>{readingInsights.weeklyProgress} articles</Text>
              </View>
              <View style={styles.insightsProgressBar}>
                <Animated.View
                  style={[
                    styles.insightsProgressFill,
                    {
                      width: `${(readingInsights.weeklyProgress / 20) * 100}%`,
                      backgroundColor: '#EAC8A4',
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.insightsProgressItem}>
              <View style={styles.insightsProgressHeader}>
                <Text style={styles.insightsProgressLabel}>Monthly Progress</Text>
                <Text style={styles.insightsProgressValue}>{readingInsights.monthlyProgress} articles</Text>
              </View>
              <View style={styles.insightsProgressBar}>
                <Animated.View
                  style={[
                    styles.insightsProgressFill,
                    {
                      width: `${(readingInsights.monthlyProgress / 50) * 100}%`,
                      backgroundColor: '#EAC8A4',
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          <View style={styles.favoriteCategoryContainer}>
            <MaterialCommunityIcons name="star" size={24} color="#EAC8A4" />
            <Text style={styles.favoriteCategoryLabel}>Favorite Category:</Text>
            <Text style={styles.favoriteCategoryValue}>{readingInsights.favoriteCategory || 'None'}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(500)} style={styles.preferencesContainer}>
          <View style={styles.preferencesHeader}>
            <Text style={styles.preferencesTitle}>Reading Preferences</Text>
            <TouchableOpacity 
              style={styles.preferencesToggle}
              onPress={() => setShowPreferences(!showPreferences)}
            >
              <Ionicons 
                name={showPreferences ? 'chevron-up' : 'chevron-down'} 
                size={24} 
                color={isDark ? '#FFFFFF' : '#000000'} 
              />
            </TouchableOpacity>
          </View>

          {showPreferences ? (
            <View style={styles.preferencesGrid}>
              {readingPreferences.map((preference) => {
                const isSelected = selectedPreferences.includes(preference.id);
                return (
                  <TouchableOpacity
                    key={preference.id}
                    style={[
                      styles.preferenceCard,
                      isSelected && styles.preferenceCardSelected,
                      { borderColor: preference.color }
                    ]}
                    onPress={() => toggleReadingPreference(preference.id)}
                  >
                    <View style={[
                      styles.preferenceIconContainer,
                      { backgroundColor: isSelected ? preference.color : 'transparent' }
                    ]}>
                      <MaterialCommunityIcons
                        name={preference.icon}
                        size={24}
                        color={isSelected ? '#FFFFFF' : preference.color}
                      />
                    </View>
                    <Text style={[
                      styles.preferenceLabel,
                      { color: isSelected ? '#FFFFFF' : isDark ? '#FFFFFF' : '#000000' }
                    ]}>
                      {preference.label}
                    </Text>
                    <Text style={[
                      styles.preferenceDescription,
                      { color: isSelected ? 'rgba(255,255,255,0.8)' : '#8E8E93' }
                    ]}>
                      {preference.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.preferencesSummary}
              onPress={() => setShowPreferences(true)}
            >
              <MaterialCommunityIcons name="clock-outline" size={24} color="#EAC8A4" />
              <Text style={styles.preferencesSummaryText}>
                {getSelectedPreferencesSummary()}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(600)} style={styles.achievementsContainer}>
          <Text style={styles.achievementsTitle}>Achievements</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.achievementsScroll}>
            {achievements.map((achievement) => (
              <View key={achievement.id} style={styles.achievementCard}>
                <MaterialCommunityIcons name={achievement.icon} size={32} color="#EAC8A4" />
                <Text style={styles.achievementLabel}>{achievement.label}</Text>
                <Text style={styles.achievementDescription}>{achievement.description}</Text>
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        {!isPremium && (
          <Animated.View entering={FadeInDown.delay(700)} style={styles.premiumContainer}>
            <LinearGradient
              colors={['#EAC8A4', '#D4A373']}
              style={styles.premiumCard}>
              <View style={styles.premiumContent}>
                <MaterialCommunityIcons name="crown" size={32} color="#FFFFFF" />
                <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
                <Text style={styles.premiumDescription}>
                  Get access to exclusive features and content
                </Text>
                <TouchableOpacity
                  style={styles.premiumButton}
                  onPress={handlePremiumUpgrade}>
                  <Text style={styles.premiumButtonText}>Upgrade Now</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {sections.map((section, sectionIndex) => (
          <Animated.View
            key={section.title}
            entering={FadeInDown.delay(800 + sectionIndex * 100)}
            style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menu}>
              {section.items.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.menuItem,
                    index === section.items.length - 1 && styles.menuItemLast,
                  ]}
                  onPress={() => handleMenuItemPress(item)}>
                  <View style={styles.menuItemLeft}>
                    <Ionicons
                      name={item.icon}
                      size={24}
                      color={isDark ? '#007AFF' : '#007AFF'}
                    />
                    <Text style={styles.menuItemLabel}>{item.label}</Text>
                  </View>
                  <View style={styles.menuItemRight}>
                    {item.type === 'toggle' ? (
                      <Switch
                        value={
                          item.label === 'Dark Mode'
                            ? isDark
                            : item.label === 'Push Notifications'
                            ? notificationsEnabled
                            : selectedOptions[
                                item.label.toLowerCase().replace(/ /g, '')
                              ]
                        }
                        onValueChange={() => handleToggle(item.label)}
                        trackColor={{ false: '#767577', true: '#81b0ff' }}
                        thumbColor={isDark ? '#007AFF' : '#f4f3f4'}
                      />
                    ) : item.options ? (
                      <TouchableOpacity
                        style={styles.optionButton}
                        onPress={() => handleMenuItemPress(item)}>
                        <Text style={styles.optionText}>
                          {item.label === 'Text Size'
                            ? textSize.charAt(0).toUpperCase() + textSize.slice(1)
                            : selectedOptions[
                                item.label.toLowerCase().replace(/ /g, '')
                              ] || item.options[0]}
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={isDark ? '#8E8E93' : '#8E8E93'}
                        />
                      </TouchableOpacity>
                    ) : item.version ? (
                      <Text style={styles.versionText}>{item.version}</Text>
                    ) : item.value ? (
                      <Text style={styles.menuItemValue}>{item.value}</Text>
                    ) : item.description ? (
                      <View style={styles.optionButton}>
                        <Text style={styles.optionText}>{item.description}</Text>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={isDark ? '#8E8E93' : '#8E8E93'}
                        />
                      </View>
                    ) : (
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={isDark ? '#8E8E93' : '#8E8E93'}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        ))}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {showThemeAnimation && (
        <View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        >
          <Animated.View 
            style={[
              {
                position: 'absolute',
                width: 1000,
                height: 1000,
                borderRadius: 500,
                top: Platform.OS === 'ios' ? 68 : 48,
                right: 24,
              },
              rippleAnimatedStyle
            ]}
          />
        </View>
      )}

      <EditProfileModal
        visible={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        onSave={handleSaveProfile}
        initialData={profileData}
        isDark={isDark}
      />

      <ContactSupportModal
        visible={showContactSupport}
        onClose={() => setShowContactSupport(false)}
        isDark={isDark}
      />

      <PrivacySettingsModal
        visible={showPrivacySettings}
        onClose={() => setShowPrivacySettings(false)}
        isDark={isDark}
      />

      <EmailPreferencesModal
        visible={showEmailPreferences}
        onClose={() => setShowEmailPreferences(false)}
        isDark={isDark}
        initialEmail={profileData.email}
      />

      <ChangePasswordModal
        visible={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        isDark={isDark}
      />

      <HelpCenterModal
        visible={showHelpCenter}
        onClose={() => setShowHelpCenter(false)}
        isDark={isDark}
      />

      <DataUsageModal
        visible={showDataUsage}
        onClose={() => setShowDataUsage(false)}
        isDark={isDark}
      />

      <ChatbotModal
        visible={showChatbot}
        onClose={() => setShowChatbot(false)}
        isDark={isDark}
      />

      <PremiumModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        isDark={isDark}
      />
    </>
  );
}

const createStyles = (isDark, getFontSize) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#000000' : '#F2F2F7',
    },
    content: {
      padding: 16,
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
      paddingBottom: 100,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    title: {
      fontSize: getFontSize(34),
      fontWeight: Platform.select({ ios: '800', default: 'bold' }),
      color: isDark ? '#EAC8A4' : '#EAC8A4',
    },
    themeToggle: {
      padding: 8,
    },
    userInfo: {
      alignItems: 'center',
      marginBottom: 24,
    },
    avatarContainer: {
      position: 'relative',
      marginBottom: 12,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#4C7FA8',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarText: {
      color: '#FFFFFF',
      fontSize: getFontSize(32),
      fontWeight: 'bold',
    },
    editAvatarButton: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: '#6A94B6',
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: isDark ? '#000000' : '#FFFFFF',
      zIndex: 10,
    },
    name: {
      fontSize: getFontSize(20),
      fontWeight: 'bold',
      color: isDark ? '#FFFFFF' : '#000000',
      marginBottom: 4,
    },
    email: {
      fontSize: getFontSize(16),
      color: isDark ? '#8E8E93' : '#8E8E93',
      marginBottom: 12,
    },
    editProfileButton: {
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#007AFF',
    },
    editProfileText: {
      color: '#007AFF',
      fontSize: getFontSize(14),
      fontWeight: '600',
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: 2,
    },
    stat: {
      alignItems: 'center',
      minWidth: 80,
    },
    statValue: {
      fontSize: getFontSize(24),
      fontWeight: 'bold',
      color: isDark ? '#FFFFFF' : '#000000',
      marginBottom: 4,
    },
    statLabel: {
      fontSize: getFontSize(12),
      color: isDark ? '#8E8E93' : '#8E8E93',
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: getFontSize(20),
      fontWeight: '600',
      color: isDark ? '#FFFFFF' : '#000000',
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    menu: {
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderRadius: 16,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: 2,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#2C2C2E' : '#E5E5EA',
    },
    menuItemLast: {
      borderBottomWidth: 0,
    },
    menuItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    menuItemLabel: {
      fontSize: getFontSize(16),
      color: isDark ? '#FFFFFF' : '#000000',
      marginLeft: 12,
      flexShrink: 1,
    },
    menuItemRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    menuItemValue: {
      fontSize: getFontSize(14),
      color: '#8E8E93',
      marginRight: 8,
    },
    optionButton: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    optionText: {
      fontSize: getFontSize(14),
      color: '#8E8E93',
      marginRight: 8,
    },
    versionText: {
      fontSize: getFontSize(14),
      color: '#8E8E93',
    },
    logoutButton: {
      backgroundColor: '#FF3B30',
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      marginTop: 24,
    },
    logoutButtonText: {
      color: '#FFFFFF',
      fontSize: getFontSize(16),
      fontWeight: '600',
    },
    profileCompletion: {
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: 2,
    },
    profileCompletionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    profileCompletionTitle: {
      fontSize: getFontSize(16),
      fontWeight: '600',
      color: isDark ? '#FFFFFF' : '#000000',
    },
    profileCompletionPercentage: {
      fontSize: getFontSize(16),
      fontWeight: '600',
      color: '#EAC8A4',
    },
    progressBarContainer: {
      height: 8,
      backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA',
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      backgroundColor: '#EAC8A4',
      borderRadius: 4,
    },
    insightsContainer: {
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: 2,
    },
    insightsTitle: {
      fontSize: getFontSize(20),
      fontWeight: '600',
      color: isDark ? '#FFFFFF' : '#000000',
      marginBottom: 16,
    },
    insightsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    insightCard: {
      flex: 1,
      alignItems: 'center',
      padding: 12,
    },
    insightValue: {
      fontSize: getFontSize(18),
      fontWeight: 'bold',
      color: isDark ? '#FFFFFF' : '#000000',
      marginTop: 8,
    },
    insightLabel: {
      fontSize: getFontSize(12),
      color: isDark ? '#8E8E93' : '#8E8E93',
      marginTop: 4,
    },
    insightsProgressContainer: {
      marginTop: 16,
    },
    insightsProgressItem: {
      marginBottom: 16,
    },
    insightsProgressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    insightsProgressLabel: {
      fontSize: getFontSize(14),
      color: isDark ? '#FFFFFF' : '#000000',
    },
    insightsProgressValue: {
      fontSize: getFontSize(14),
      color: '#EAC8A4',
      fontWeight: '600',
    },
    insightsProgressBar: {
      height: 8,
      backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA',
      borderRadius: 4,
      overflow: 'hidden',
    },
    insightsProgressFill: {
      height: '100%',
      borderRadius: 4,
    },
    favoriteCategoryContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 16,
      padding: 12,
      backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
      borderRadius: 12,
    },
    favoriteCategoryLabel: {
      fontSize: getFontSize(14),
      color: isDark ? '#FFFFFF' : '#000000',
      marginLeft: 8,
    },
    favoriteCategoryValue: {
      fontSize: getFontSize(14),
      color: '#EAC8A4',
      fontWeight: '600',
      marginLeft: 8,
    },
    preferencesContainer: {
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: 2,
    },
    preferencesHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    preferencesTitle: {
      fontSize: getFontSize(20),
      fontWeight: '600',
      color: isDark ? '#FFFFFF' : '#000000',
    },
    preferencesToggle: {
      padding: 8,
    },
    preferencesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    preferenceCard: {
      width: '48%',
      backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    preferenceCardSelected: {
      backgroundColor: '#EAC8A4',
    },
    preferenceIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    preferenceLabel: {
      fontSize: getFontSize(16),
      fontWeight: '600',
      marginBottom: 4,
    },
    preferenceDescription: {
      fontSize: getFontSize(12),
    },
    preferencesSummary: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
      borderRadius: 12,
    },
    preferencesSummaryText: {
      flex: 1,
      fontSize: getFontSize(14),
      color: isDark ? '#FFFFFF' : '#000000',
      marginLeft: 12,
    },
    achievementsContainer: {
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: 2,
    },
    achievementsTitle: {
      fontSize: getFontSize(20),
      fontWeight: '600',
      color: isDark ? '#FFFFFF' : '#000000',
      marginBottom: 16,
    },
    achievementsScroll: {
      paddingRight: 16,
    },
    achievementCard: {
      width: 160,
      backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
      borderRadius: 12,
      padding: 16,
      marginRight: 16,
      alignItems: 'center',
    },
    achievementLabel: {
      fontSize: getFontSize(16),
      fontWeight: '600',
      color: isDark ? '#FFFFFF' : '#000000',
      marginTop: 8,
    },
    achievementDescription: {
      fontSize: getFontSize(12),
      color: isDark ? '#8E8E93' : '#8E8E93',
      marginTop: 4,
      textAlign: 'center',
    },
    premiumContainer: {
      marginBottom: 24,
    },
    premiumCard: {
      borderRadius: 16,
      overflow: 'hidden',
    },
    premiumContent: {
      padding: 24,
      alignItems: 'center',
    },
    premiumTitle: {
      fontSize: getFontSize(24),
      fontWeight: 'bold',
      color: '#FFFFFF',
      marginTop: 16,
    },
    premiumDescription: {
      fontSize: getFontSize(16),
      color: '#FFFFFF',
      marginTop: 8,
      textAlign: 'center',
    },
    premiumButton: {
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 24,
      marginTop: 16,
    },
    premiumButtonText: {
      fontSize: getFontSize(16),
      fontWeight: '600',
      color: '#EAC8A4',
    },
  });