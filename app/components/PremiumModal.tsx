import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
}

const premiumFeatures = [
  {
    icon: 'infinite',
    title: 'Unlimited Articles',
    description: 'Access to all premium articles and content',
  },
  {
    icon: 'download',
    title: 'Offline Reading',
    description: 'Download articles for offline reading',
  },
  {
    icon: 'analytics',
    title: 'Advanced Analytics',
    description: 'Detailed reading insights and statistics',
  },
  {
    icon: 'notifications',
    title: 'Priority Notifications',
    description: 'Get notified about important news first',
  },
  {
    icon: 'bookmark',
    title: 'Unlimited Bookmarks',
    description: 'Save as many articles as you want',
  },
  {
    icon: 'color-palette',
    title: 'Custom Themes',
    description: 'Personalize your reading experience',
  },
];

const pricingPlans = {
  monthly: {
    price: 499,
    period: 'per month',
    savings: null,
  },
  yearly: {
    price: 3999,
    period: 'per year',
    savings: 'Save 33%',
  },
};

const PremiumModal: React.FC<PremiumModalProps> = ({ visible, onClose, isDark }) => {
  const handleUpgrade = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    // Implement premium upgrade logic here
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={isDark ? '#FFFFFF' : '#000000'} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            <LinearGradient
              colors={['#EAC8A4', '#D4A373']}
              style={styles.header}>
              <Ionicons name="diamond" size={48} color="#FFFFFF" />
              <Text style={styles.headerTitle}>Upgrade to Premium</Text>
              <Text style={styles.headerSubtitle}>Get the best reading experience</Text>
            </LinearGradient>

            <View style={styles.featuresContainer}>
              {premiumFeatures.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Ionicons name={feature.icon} size={24} color="#EAC8A4" />
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={[styles.featureTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                      {feature.title}
                    </Text>
                    <Text style={styles.featureDescription}>{feature.description}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.pricingContainer}>
              <Text style={[styles.pricingTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                Choose Your Plan
              </Text>
              <View style={styles.pricingOptions}>
                <TouchableOpacity
                  style={[styles.pricingOption, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                  <Text style={[styles.pricingOptionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    Monthly
                  </Text>
                  <Text style={styles.pricingOptionPrice}>₹{pricingPlans.monthly.price}</Text>
                  <Text style={styles.pricingOptionPeriod}>{pricingPlans.monthly.period}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pricingOption, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                  <Text style={[styles.pricingOptionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    Yearly
                  </Text>
                  <Text style={styles.pricingOptionPrice}>₹{pricingPlans.yearly.price}</Text>
                  <Text style={styles.pricingOptionPeriod}>{pricingPlans.yearly.period}</Text>
                  {pricingPlans.yearly.savings && (
                    <View style={styles.savingsBadge}>
                      <Text style={styles.savingsText}>{pricingPlans.yearly.savings}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
              <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
            </TouchableOpacity>

            <Text style={styles.termsText}>
              By upgrading, you agree to our Terms of Service and Privacy Policy
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 8,
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 8,
  },
  featuresContainer: {
    padding: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(234, 200, 164, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
  pricingContainer: {
    padding: 24,
  },
  pricingTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  pricingOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pricingOption: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  pricingOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  pricingOptionPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EAC8A4',
  },
  pricingOptionPeriod: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  savingsBadge: {
    backgroundColor: '#EAC8A4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  upgradeButton: {
    backgroundColor: '#EAC8A4',
    padding: 16,
    borderRadius: 12,
    margin: 24,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  termsText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 24,
  },
});

export default PremiumModal; 