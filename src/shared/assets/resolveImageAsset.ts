import { ImageSourcePropType } from 'react-native';

export function resolveImageAsset(assetKey: string): ImageSourcePropType {
  switch (assetKey) {
    case 'product':
      return require('./product.png');
    default:
      throw new Error(`Unsupported local image asset key "${assetKey}".`);
  }
}
