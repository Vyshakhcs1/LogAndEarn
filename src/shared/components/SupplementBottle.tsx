import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { resolveImageAsset } from '../assets/resolveImageAsset';

function SupplementBottle({ imageAssetKey }: { imageAssetKey: string }) {
  return (
    <View style={styles.tile}>
      <Image
        resizeMode="contain"
        source={resolveImageAsset(imageAssetKey)}
        style={styles.productImage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    backgroundColor: '#F5F6F5',
    borderRadius: 9,
    height: 80,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    width: 66,
  },
  productImage: {
    height: 80,
    width: 66,
  },
});

export default SupplementBottle;
