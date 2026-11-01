export type RewardCardData =
  | {
      id: string;
      type: 'scratch';
      status: 'available' | 'expired';
      title: string;
      expiry: string;
      rewardAmount: number;
      rewardLabel: string;
    }
  | {
      id: string;
      type: 'product';
      status: 'earned';
      name: string;
      description: string;
      date: string;
      imageAssetKey: string;
    }
  | {
      id: string;
      type: 'coins';
      status: 'earned' | 'expired';
      amount: number;
      date: string;
    };
