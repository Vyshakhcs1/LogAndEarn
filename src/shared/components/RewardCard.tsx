import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Lucide from '@react-native-vector-icons/lucide';
import { RewardCardData } from '../../features/rewards/model/rewardCards';
import { resolveImageAsset } from '../assets/resolveImageAsset';

type RewardCardProps = {
  reward: RewardCardData;
  revealed?: boolean;
  onPress?: () => void;
};

export function CardPattern({ muted = false }: { muted?: boolean }) {
  const stroke = muted ? '#B7B7B7' : '#FFFFFF';

  return (
    <Svg
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      viewBox="0 0 160 190"
    >
      <Path
        d="M8 28c7-9 14-9 20 0-6 8-13 8-20 0Zm102-13c8-9 15-8 19 2-7 7-14 7-19-2ZM24 85c8-9 15-8 19 2-7 7-14 7-19-2Zm95 21c7-10 14-10 20-1-6 9-13 9-20 1ZM36 155c8-9 15-8 19 2-7 7-14 7-19-2Zm87 18c6-9 12-10 19-2-5 9-12 10-19 2Z"
        fill="none"
        opacity={muted ? 0.22 : 0.16}
        stroke={stroke}
        strokeWidth="1.2"
      />
      <Path
        d="m72 28 8 6-7 8-8-6 7-8Zm62 40 9 5-5 10-9-5 5-10ZM19 119l9 5-5 10-9-5 5-10Zm84 25 8 6-7 8-8-6 7-8Z"
        fill="none"
        opacity={muted ? 0.2 : 0.14}
        stroke={stroke}
        strokeWidth="1.2"
      />
      <Circle
        cx="48"
        cy="57"
        fill="none"
        opacity={muted ? 0.18 : 0.12}
        r="5"
        stroke={stroke}
      />
      <Circle
        cx="139"
        cy="137"
        fill="none"
        opacity={muted ? 0.18 : 0.12}
        r="7"
        stroke={stroke}
      />
    </Svg>
  );
}

function RewardCard({ reward, revealed = false, onPress }: RewardCardProps) {
  if (reward.type === 'scratch') {
    const expired = reward.status === 'expired';
    const content = (
      <View style={[styles.scratchCard, expired && styles.expiredScratch]}>
        <CardPattern muted={expired} />
        <Text style={[styles.expiry, expired && styles.expiryExpired]}>
          {reward.expiry}
        </Text>
        {revealed ? (
          <View style={styles.scratchReveal}>
            <Lucide color="#FFB534" name="sparkles" size={42} />
            <Text style={styles.revealTitle}>{reward.rewardAmount} Coins</Text>
          </View>
        ) : expired ? (
          <Lucide color="#777777" name="gift" size={48} />
        ) : (
          <Text style={styles.gift}>🎁</Text>
        )}
        <View style={styles.scratchFooter}>
          <Text style={styles.scratchFooterText}>
            {expired
              ? 'Expired'
              : revealed
              ? 'Reward unlocked'
              : 'Scratch to win'}
          </Text>
        </View>
      </View>
    );

    return (
      <Pressable
        accessibilityLabel={
          expired
            ? 'Expired scratch card'
            : revealed
            ? 'Reward unlocked'
            : 'Scratch to win'
        }
        accessibilityRole="button"
        onPress={onPress}
        style={styles.card}
      >
        {content}
      </Pressable>
    );
  }

  if (reward.type === 'product') {
    return (
      <Pressable
        accessibilityLabel={`${reward.name}, ${reward.description}`}
        accessibilityRole="button"
        onPress={onPress}
        style={[styles.card, styles.earnedProductCard]}
      >
        <View style={styles.productImageHolder}>
          <Image
            resizeMode="contain"
            source={resolveImageAsset(reward.imageAssetKey)}
            style={styles.productImage}
          />
        </View>
        <Text style={styles.rewardTitle}>{reward.name}</Text>
        <Text style={styles.rewardDescription}>{reward.description}</Text>
        <Text style={styles.rewardDate}>{reward.date}</Text>
      </Pressable>
    );
  }

  const expired = reward.status === 'expired';

  return (
    <Pressable
      accessibilityLabel={`${reward.amount} coins ${
        expired ? 'expired' : 'earned'
      }`}
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.card,
        styles.coinCard,
        expired ? styles.expiredCoinCard : styles.earnedCoinCard,
      ]}
    >
      {expired ? (
        <Text style={styles.expiredDate}>Expired on {reward.date}</Text>
      ) : null}
      <View style={styles.coinBadge}>
        <Lucide color="#FFFFFF" name="sparkles" size={35} />
      </View>
      <Text style={[styles.coinAmount, expired && styles.expiredCoinAmount]}>
        {reward.amount}
      </Text>
      <Text
        style={[styles.coinDescription, expired && styles.expiredCoinAmount]}
      >
        {expired ? 'Coins Expired' : 'Coins Earned'}
      </Text>
      {!expired ? <Text style={styles.rewardDate}>{reward.date}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    aspectRatio: 0.84,
    borderRadius: 20,
    flexBasis: '47.5%',
    overflow: 'hidden',
  },
  scratchCard: {
    alignItems: 'center',
    backgroundColor: '#56A9C4',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  expiredScratch: {
    backgroundColor: '#F5F5F5',
  },
  expiry: {
    backgroundColor: '#B7DCE6',
    borderRadius: 12,
    color: '#59686B',
    fontSize: 9,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 3,
    position: 'absolute',
    top: 21,
  },
  expiryExpired: {
    backgroundColor: '#A2A2A2',
    color: '#FFFFFF',
  },
  gift: {
    fontSize: 48,
  },
  scratchFooter: {
    alignItems: 'center',
    backgroundColor: '#338CAC88',
    bottom: 20,
    height: 25,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  scratchFooterText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  scratchReveal: {
    alignItems: 'center',
    gap: 6,
  },
  revealTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  earnedProductCard: {
    alignItems: 'center',
    backgroundColor: '#F3F7DE',
    justifyContent: 'center',
    padding: 12,
  },
  productImageHolder: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 9,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  productImage: {
    height: 66,
    width: 66,
  },
  rewardTitle: {
    color: '#414141',
    fontSize: 16,
    marginTop: 5,
  },
  rewardDescription: {
    color: '#767676',
    fontSize: 9,
    marginTop: 3,
  },
  rewardDate: {
    backgroundColor: '#C7DC61',
    borderRadius: 12,
    color: '#5B6832',
    fontSize: 9,
    marginTop: 12,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  coinCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  earnedCoinCard: {
    backgroundColor: '#FFF4E1',
  },
  expiredCoinCard: {
    backgroundColor: '#F6F6F6',
  },
  expiredDate: {
    backgroundColor: '#A3A3A3',
    borderRadius: 12,
    color: '#FFFFFF',
    fontSize: 9,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 3,
    position: 'absolute',
    top: 20,
  },
  coinBadge: {
    alignItems: 'center',
    backgroundColor: '#FFB534',
    borderRadius: 20,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  coinAmount: {
    color: '#444444',
    fontSize: 17,
    marginTop: 8,
  },
  coinDescription: {
    color: '#777777',
    fontSize: 9,
    marginTop: 2,
  },
  expiredCoinAmount: {
    color: '#AAAAAA',
  },
});

export default RewardCard;
