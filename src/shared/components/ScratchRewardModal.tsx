import React, { useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, G, Mask, Path, Rect } from 'react-native-svg';
import Lucide from '@react-native-vector-icons/lucide';
import { RewardCardData } from '../../features/rewards/model/rewardCards';

const scratchWidth = 300;
const scratchHeight = 360;
const brushRadius = 27;
const gridColumns = 30;
const gridRows = 36;
const scratchThreshold = 70;
const maxCardWidth = 300;
const cardWidth = Math.min(Dimensions.get('window').width - 56, maxCardWidth);
const cardHeight = (cardWidth / scratchWidth) * scratchHeight;

type ScratchRewardModalProps = {
  reward: RewardCardData | null;
  revealed: boolean;
  onClose: () => void;
  onConfirm: () => Promise<boolean>;
};

function ScratchRewardModal({
  reward,
  revealed,
  onClose,
  onConfirm,
}: ScratchRewardModalProps) {
  const [scratchPath, setScratchPath] = useState('');
  const [scratchProgress, setScratchProgress] = useState(0);
  const scratchedCells = useRef(new Set<number>());
  const pathRef = useRef('');
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const isScratchable =
    reward?.type === 'scratch' && reward.status === 'available' && !revealed;
  const isExpired = reward?.status === 'expired';
  const showReward =
    revealed || (isScratchable && scratchProgress >= scratchThreshold);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => isScratchable,
        onMoveShouldSetPanResponder: () => isScratchable,
        onPanResponderGrant: event => {
          if (!isScratchable) {
            return;
          }

          const x = (event.nativeEvent.locationX / cardWidth) * scratchWidth;
          const y = (event.nativeEvent.locationY / cardHeight) * scratchHeight;
          lastPoint.current = { x, y };
          pathRef.current = `${pathRef.current} M${x} ${y}`;
          setScratchPath(pathRef.current);
          updateScratchCells(x, y);
        },
        onPanResponderMove: event => {
          if (!isScratchable) {
            return;
          }

          const x = (event.nativeEvent.locationX / cardWidth) * scratchWidth;
          const y = (event.nativeEvent.locationY / cardHeight) * scratchHeight;
          const previous = lastPoint.current;
          if (previous) {
            const distance = Math.hypot(x - previous.x, y - previous.y);
            const samples = Math.max(1, Math.ceil(distance / 8));
            for (let sample = 1; sample < samples; sample += 1) {
              const ratio = sample / samples;
              updateScratchCells(
                previous.x + (x - previous.x) * ratio,
                previous.y + (y - previous.y) * ratio,
                false,
              );
            }
          }
          lastPoint.current = { x, y };
          pathRef.current = `${pathRef.current} L${x} ${y}`;
          setScratchPath(pathRef.current);
          updateScratchCells(x, y);
        },
      }),
    [isScratchable],
  );

  function updateScratchCells(x: number, y: number, updateProgress = true) {
    const cellWidth = scratchWidth / gridColumns;
    const cellHeight = scratchHeight / gridRows;
    const rangeX = Math.ceil(brushRadius / cellWidth);
    const rangeY = Math.ceil(brushRadius / cellHeight);
    const centerColumn = Math.floor(x / cellWidth);
    const centerRow = Math.floor(y / cellHeight);

    for (
      let row = Math.max(0, centerRow - rangeY);
      row <= Math.min(gridRows - 1, centerRow + rangeY);
      row += 1
    ) {
      for (
        let column = Math.max(0, centerColumn - rangeX);
        column <= Math.min(gridColumns - 1, centerColumn + rangeX);
        column += 1
      ) {
        const cellCenterX = (column + 0.5) * cellWidth;
        const cellCenterY = (row + 0.5) * cellHeight;
        if (
          (cellCenterX - x) ** 2 + (cellCenterY - y) ** 2 <=
          brushRadius ** 2
        ) {
          scratchedCells.current.add(row * gridColumns + column);
        }
      }
    }

    if (updateProgress) {
      setScratchProgress(
        (scratchedCells.current.size / (gridColumns * gridRows)) * 100,
      );
    }
  }

  function closeModal() {
    pathRef.current = '';
    lastPoint.current = null;
    scratchedCells.current.clear();
    setScratchPath('');
    setScratchProgress(0);
    onClose();
  }

  async function confirmReward() {
    if (await onConfirm()) {
      closeModal();
    }
  }

  if (!reward) {
    return null;
  }

  const heading =
    reward.type === 'scratch' && !isExpired
      ? reward.title
      : isExpired
      ? 'This reward has expired'
      : 'Your reward';
  const scratchRewardAmount =
    reward.type === 'scratch' ? reward.rewardAmount : 200;

  return (
    <Modal
      animationType="fade"
      onRequestClose={closeModal}
      statusBarTranslucent
      transparent={false}
      visible={Boolean(reward)}
    >
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.modal}>
        <Pressable
          accessibilityLabel="Close reward"
          accessibilityRole="button"
          hitSlop={12}
          onPress={closeModal}
          style={styles.closeButton}
        >
          <Lucide color="#303030" name="x" size={25} />
        </Pressable>

        <View style={styles.content}>
          <Text style={styles.heading}>{heading}</Text>

          {isScratchable && !showReward ? (
            <View style={styles.scratchCard}>
              <View style={styles.scratchUnderlay}>
                <View style={styles.underlayCoin}>
                  <Lucide color="#FFFFFF" name="sparkles" size={45} />
                </View>
                <Text style={styles.underlayValue}>+{scratchRewardAmount}</Text>
                <Text style={styles.underlaySubtitle}>
                  {reward.type === 'scratch'
                    ? reward.rewardLabel
                    : 'Bonus Coins Earned!'}
                </Text>
              </View>
              <Svg
                height={cardHeight}
                pointerEvents="none"
                style={StyleSheet.absoluteFill}
                viewBox={`0 0 ${scratchWidth} ${scratchHeight}`}
                width={cardWidth}
              >
                <Defs>
                  <Mask id="scratchMask">
                    <Rect
                      fill="white"
                      height={scratchHeight}
                      width={scratchWidth}
                    />
                    {scratchPath ? (
                      <Path
                        d={scratchPath}
                        fill="none"
                        stroke="black"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={brushRadius * 2}
                      />
                    ) : null}
                  </Mask>
                </Defs>
                <G mask="url(#scratchMask)">
                  <Rect
                    fill="#56A9C4"
                    height={scratchHeight}
                    width={scratchWidth}
                  />
                  <Path
                    d="M8 28c7-9 14-9 20 0-6 8-13 8-20 0Zm102-13c8-9 15-8 19 2-7 7-14 7-19-2ZM24 85c8-9 15-8 19 2-7 7-14 7-19-2Zm95 21c7-10 14-10 20-1-6 9-13 9-20 1ZM36 155c8-9 15-8 19 2-7 7-14 7-19-2Zm87 18c6-9 12-10 19-2-5 9-12 10-19 2Z"
                    fill="none"
                    opacity="0.16"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                  <Path
                    d="m72 28 8 6-7 8-8-6 7-8Zm62 40 9 5-5 10-9-5 5-10ZM19 119l9 5-5 10-9-5 5-10Zm84 25 8 6-7 8-8-6 7-8Z"
                    fill="none"
                    opacity="0.14"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                  <Circle
                    cx="48"
                    cy="57"
                    fill="none"
                    opacity="0.12"
                    r="7"
                    stroke="#FFFFFF"
                  />
                  <Circle
                    cx="139"
                    cy="137"
                    fill="none"
                    opacity="0.12"
                    r="9"
                    stroke="#FFFFFF"
                  />
                </G>
              </Svg>
              <View pointerEvents="none" style={styles.scratchVisual}>
                <Text style={styles.gift}>🎁</Text>
                <Text style={styles.scratchInstruction}>
                  Scratch to reveal{'\n'}your reward
                </Text>
              </View>
              <View
                {...panResponder.panHandlers}
                style={styles.scratchTouchLayer}
              />
              <Text style={styles.expiry}>
                {reward.type === 'scratch' ? reward.expiry : ''}
              </Text>
            </View>
          ) : (
            <RewardReveal reward={reward} expired={Boolean(isExpired)} />
          )}

          {showReward || isExpired || !isScratchable ? (
            <Pressable
              accessibilityRole="button"
              onPress={confirmReward}
              style={styles.okButton}
            >
              <Text style={styles.okText}>Ok</Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function RewardReveal({
  reward,
  expired,
}: {
  reward: RewardCardData;
  expired: boolean;
}) {
  const productReward = reward.type === 'product';
  const coins =
    reward.type === 'coins'
      ? reward.amount
      : reward.type === 'scratch'
      ? reward.rewardAmount
      : 200;
  const title = productReward ? reward.name : `+${coins}`;
  const subtitle = productReward
    ? reward.description
    : expired
    ? 'Coins Expired'
    : reward.type === 'scratch'
    ? reward.rewardLabel
    : 'Bonus Coins Earned!';

  return (
    <View
      style={[
        styles.rewardPanel,
        productReward && styles.productPanel,
        expired && styles.expiredPanel,
      ]}
    >
      {productReward ? (
        <View style={styles.productIcon}>
          <Text style={styles.productGlyph}>▤</Text>
        </View>
      ) : (
        <View style={styles.coinIcon}>
          <Lucide color="#FFFFFF" name="sparkles" size={58} />
        </View>
      )}
      <Text style={[styles.rewardValue, expired && styles.expiredText]}>
        {title}
      </Text>
      <Text style={[styles.rewardSubtitle, expired && styles.expiredText]}>
        {subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: '#FFFFFF',
    flex: 1,
    paddingHorizontal: 28,
  },
  closeButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    right: 22,
    top: 50,
    width: 44,
    zIndex: 2,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingTop: 12,
  },
  heading: {
    color: '#424242',
    fontSize: 25,
    fontWeight: '500',
    lineHeight: 32,
    marginBottom: 26,
    textAlign: 'center',
  },
  scratchCard: {
    backgroundColor: '#56A9C4',
    borderRadius: 34,
    overflow: 'hidden',
    height: cardHeight,
    width: cardWidth,
  },
  scratchUnderlay: {
    alignItems: 'center',
    backgroundColor: '#FFF4E1',
    flex: 1,
    justifyContent: 'center',
  },
  underlayCoin: {
    alignItems: 'center',
    backgroundColor: '#FFB534',
    borderRadius: 25,
    height: 125,
    justifyContent: 'center',
    width: 125,
  },
  underlayValue: {
    color: '#424242',
    fontSize: 31,
    marginTop: 14,
  },
  underlaySubtitle: {
    color: '#747474',
    fontSize: 14,
    marginTop: 4,
  },
  gift: {
    fontSize: 76,
  },
  scratchInstruction: {
    backgroundColor: '#338CAC88',
    color: '#FFFFFF',
    fontSize: 19,
    lineHeight: 28,
    marginTop: 16,
    paddingVertical: 12,
    textAlign: 'center',
    width: '100%',
  },
  scratchTouchLayer: {
    ...StyleSheet.absoluteFill,
  },
  scratchVisual: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiry: {
    backgroundColor: '#B7DCE6',
    borderRadius: 12,
    color: '#59686B',
    fontSize: 10,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
    position: 'absolute',
    top: 22,
  },
  rewardPanel: {
    alignItems: 'center',
    backgroundColor: '#FFF4E1',
    borderRadius: 40,
    height: cardHeight,
    justifyContent: 'center',
    padding: 24,
    width: cardWidth,
  },
  productPanel: {
    backgroundColor: '#F3F7DE',
  },
  expiredPanel: {
    backgroundColor: '#F4F4F4',
  },
  coinIcon: {
    alignItems: 'center',
    backgroundColor: '#FFB534',
    borderRadius: 28,
    height: 148,
    justifyContent: 'center',
    width: 138,
  },
  productIcon: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    height: 120,
    justifyContent: 'center',
    width: 120,
  },
  productGlyph: {
    color: '#7CAFA8',
    fontSize: 62,
  },
  rewardValue: {
    color: '#424242',
    fontSize: 34,
    marginTop: 18,
  },
  rewardSubtitle: {
    color: '#747474',
    fontSize: 17,
    marginTop: 4,
    textAlign: 'center',
  },
  expiredText: {
    color: '#999999',
  },
  okButton: {
    alignItems: 'center',
    backgroundColor: '#414141',
    borderRadius: 15,
    height: 62,
    justifyContent: 'center',
    marginTop: 26,
    width: 276,
  },
  okText: {
    color: '#FFFFFF',
    fontSize: 20,
  },
});

export default ScratchRewardModal;
