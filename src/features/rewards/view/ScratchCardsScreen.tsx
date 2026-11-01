import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Lucide from '@react-native-vector-icons/lucide';
import RewardCard from '../../../shared/components/RewardCard';
import ScratchRewardModal from '../../../shared/components/ScratchRewardModal';
import {
  claimScratchReward,
  selectRewardCards,
} from '../../../app/store/slices/logAndEarnSlice';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks';
import { RewardCardData } from '../model/rewardCards';
import { RootStackParamList } from '../../../app/navigator/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ScratchCards'>;

function ScratchCardsScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const rewardCards = useAppSelector(selectRewardCards);
  const fetchStatus = useAppSelector(state => state.logAndEarn.fetchStatus);
  const revealedRewardIds = useAppSelector(
    state => state.logAndEarn.revealedRewardIds,
  );
  const [selectedReward, setSelectedReward] = useState<RewardCardData | null>(
    null,
  );

  const confirmReward = async () => {
    if (
      selectedReward?.type === 'scratch' &&
      selectedReward.status === 'available'
    ) {
      try {
        await dispatch(claimScratchReward(selectedReward.id)).unwrap();
        return true;
      } catch (error) {
        Alert.alert(
          'Unable to claim reward',
          typeof error === 'string'
            ? error
            : 'Please check your connection and try again.',
        );
        return false;
      }
    }
    return false;
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Scratch Cards</Text>
        <Pressable
          accessibilityLabel="Close scratch cards"
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => navigation.goBack()}
          style={styles.closeButton}
        >
          <Lucide color="#303030" name="x" size={23} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.grid,
          rewardCards.length === 0 && styles.emptyGrid,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {rewardCards.length > 0 ? (
          rewardCards.map(reward => (
            <RewardCard
              key={reward.id}
              onPress={() => setSelectedReward(reward)}
              revealed={revealedRewardIds.includes(reward.id)}
              reward={reward}
            />
          ))
        ) : fetchStatus === 'succeeded' ? (
          <Text style={styles.emptyText}>No scratch cards available yet.</Text>
        ) : null}
      </ScrollView>
      <ScratchRewardModal
        onClose={() => setSelectedReward(null)}
        onConfirm={confirmReward}
        revealed={
          selectedReward ? revealedRewardIds.includes(selectedReward.id) : false
        }
        reward={selectedReward}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    height: 64,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  title: {
    color: '#333333',
    fontSize: 21,
    fontWeight: '600',
  },
  closeButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    position: 'absolute',
    right: 17,
    width: 36,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
    paddingBottom: 24,
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  emptyGrid: {
    flex: 1,
  },
  emptyText: {
    color: '#666666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
    width: '100%',
  },
});

export default ScratchCardsScreen;
