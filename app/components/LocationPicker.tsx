import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  TextInput,
  Keyboard,
  ScrollView,
  Easing,
  StatusBar,
  SafeAreaView,
  Platform,
  Modal
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

interface LocationPickerProps {
  onLocationSelect: (location: string) => void;
  isDark: boolean;
}

const LocationPicker: React.FC<LocationPickerProps> = ({ onLocationSelect, isDark }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('Current Location');
  const [searchQuery, setSearchQuery] = useState('');

  // Animation values
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const pickerTranslateY = useRef(new Animated.Value(height)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  // Organized locations by region with appropriate icons
  const locations = [
    // Current Location
    { name: 'Current Location', icon: 'crosshairs-gps', color: '#4CAF50' },
    
    // India
    { name: 'Delhi', icon: 'city-variant', color: '#FF5722' },
    { name: 'Pune', icon: 'city-variant', color: '#FF5722' },
    { name: 'Mumbai', icon: 'city-variant', color: '#FF5722' },
    { name: 'Bangalore', icon: 'city-variant', color: '#FF5722' },
    { name: 'Hyderabad', icon: 'city-variant', color: '#FF5722' },
    { name: 'Chennai', icon: 'city-variant', color: '#FF5722' },
    { name: 'Kolkata', icon: 'city-variant', color: '#FF5722' },
    
    // Asia
    { name: 'Tokyo', icon: 'tree', color: '#FF5722' },
    { name: 'Singapore', icon: 'leaf', color: '#009688' },
    { name: 'Hong Kong', icon: 'city-variant', color: '#2196F3' },
    { name: 'Shanghai', icon: 'city-variant', color: '#2196F3' },
    { name: 'Seoul', icon: 'city-variant', color: '#2196F3' },
    { name: 'Dubai', icon: 'weather-sunny', color: '#FFC107' },
    
    // Europe
    { name: 'London', icon: 'weather-pouring', color: '#673AB7' },
    { name: 'Paris', icon: 'cafe', color: '#E91E63' },
    { name: 'Berlin', icon: 'city-variant', color: '#9C27B0' },
    { name: 'Rome', icon: 'city-variant', color: '#F44336' },
    { name: 'Madrid', icon: 'city-variant', color: '#3F51B5' },
    
    // North America
    { name: 'New York', icon: 'city-variant', color: '#2196F3' },
    { name: 'Los Angeles', icon: 'city-variant', color: '#2196F3' },
    { name: 'Chicago', icon: 'city-variant', color: '#2196F3' },
    { name: 'Toronto', icon: 'city-variant', color: '#2196F3' },
    
    // Other regions
    { name: 'Sydney', icon: 'weather-sunny', color: '#FF9800' },
    { name: 'Rio de Janeiro', icon: 'beach', color: '#4CAF50' },
    { name: 'Cape Town', icon: 'mountain', color: '#795548' }
  ];

  const openPicker = () => {
    setShowPicker(true);
    setSearchQuery('');
    
    // Reset animations
    backdropOpacity.setValue(0);
    pickerTranslateY.setValue(height);
    contentOpacity.setValue(0);

    // Parallel animations
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(pickerTranslateY, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 300,
        delay: 200,
        useNativeDriver: true,
      })
    ]).start();
  };

  const closePicker = () => {
    Keyboard.dismiss();
    
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(pickerTranslateY, {
        toValue: height,
        duration: 350,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => setShowPicker(false));
  };

  const handleLocationSelect = (location: string) => {
    setSelectedLocation(location);
    onLocationSelect(location);
    
    // Animate selection feedback
    Animated.sequence([
      Animated.timing(contentOpacity, {
        toValue: 0.5,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start(closePicker);
  };

  const filteredLocations = locations.filter(location =>
    location.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const styles = StyleSheet.create({
    triggerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(234, 200, 164, 0.15)' : 'rgba(234, 200, 164, 0.25)',
      marginRight: 10,
    },
    triggerText: {
      fontSize: 14,
      fontWeight: '500',
      color: isDark ? '#EAC8A4' : '#EAC8A4',
      marginLeft: 6,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.7)',
    },
    pickerContainer: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: isDark ? '#121212' : '#FFFFFF',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 20,
      paddingHorizontal: 24,
      paddingBottom: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: isDark ? '#EAC8A4' : '#EAC8A4',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
      borderRadius: 12,
      paddingHorizontal: 16,
      marginHorizontal: 24,
      marginBottom: 16,
      height: 52,
    },
    searchInput: {
      flex: 1,
      color: isDark ? '#FFF' : '#000',
      fontSize: 16,
      paddingLeft: 12,
    },
    locationItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    locationName: {
      fontSize: 16,
      fontWeight: '500',
      color: isDark ? '#FFF' : '#000',
      flex: 1,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    emptyText: {
      fontSize: 16,
      color: isDark ? '#888' : '#999',
      textAlign: 'center',
    },
    sectionHeader: {
      paddingVertical: 8,
      paddingHorizontal: 24,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    },
    sectionHeaderText: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#EAC8A4' : '#EAC8A4',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
  });

  // Group locations by region for section headers
  const groupedLocations = filteredLocations.reduce((acc, location) => {
    let section = 'Other';
    if (['Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata'].includes(location.name)) {
      section = 'India';
    } else if (['Tokyo', 'Singapore', 'Hong Kong', 'Shanghai', 'Seoul', 'Dubai'].includes(location.name)) {
      section = 'Asia';
    } else if (['London', 'Paris', 'Berlin', 'Rome', 'Madrid'].includes(location.name)) {
      section = 'Europe';
    } else if (['New York', 'Los Angeles', 'Chicago', 'Toronto'].includes(location.name)) {
      section = 'North America';
    }
    
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(location);
    return acc;
  }, {} as Record<string, typeof locations>);

  return (
    <>
      <TouchableOpacity 
        onPress={openPicker} 
        style={styles.triggerButton}
        activeOpacity={0.7}
      >
        <Ionicons name="location-sharp" size={16} color={isDark ? '#EAC8A4' : '#EAC8A4'} />
        <Text style={styles.triggerText}>{selectedLocation}</Text>
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent={true}
        animationType="none"
        onRequestClose={closePicker}
        statusBarTranslucent={true}
      >
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        
        <Animated.View style={[
          styles.pickerContainer,
          {
            transform: [{ translateY: pickerTranslateY }]
          }
        ]}>
          <SafeAreaView style={{ flex: 1 }}>
            <Animated.View style={{ opacity: contentOpacity }}>
              <View style={styles.header}>
                <Text style={styles.title}>Select Location</Text>
                <TouchableOpacity onPress={closePicker}>
                  <Ionicons name="close" size={24} color={isDark ? '#EAC8A4' : '#EAC8A4'} />
                </TouchableOpacity>
              </View>

              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={isDark ? '#888' : '#999'} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search locations..."
                  placeholderTextColor={isDark ? '#888' : '#999'}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus={true}
                />
              </View>

              <ScrollView>
                {Object.keys(groupedLocations).length > 0 ? (
                  Object.entries(groupedLocations).map(([section, sectionLocations]) => (
                    <View key={section}>
                      <View style={styles.sectionHeader}>
                        <Text style={styles.sectionHeaderText}>{section}</Text>
                      </View>
                      {sectionLocations.map((location, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.locationItem}
                          onPress={() => handleLocationSelect(location.name)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.iconContainer, { backgroundColor: `${location.color}20` }]}>
                            <MaterialCommunityIcons 
                              name={location.icon} 
                              size={20} 
                              color={location.color} 
                            />
                          </View>
                          <Text style={styles.locationName}>{location.name}</Text>
                          <MaterialCommunityIcons 
                            name="chevron-right" 
                            size={24} 
                            color={isDark ? '#555' : '#999'} 
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No locations found</Text>
                  </View>
                )}
              </ScrollView>
            </Animated.View>
          </SafeAreaView>
        </Animated.View>
      </Modal>
    </>
  );
};

export default LocationPicker;