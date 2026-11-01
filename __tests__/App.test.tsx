/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import LogAndEarnScreen from '../src/features/logAndEarn/view/LogAndEarnScreen';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});

test('removes only selected products from their lists', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<LogAndEarnScreen />);
  });
  const countHairRasProducts = () =>
    renderer.root.findAll(node => node.props.children === 'Hair Ras').length;
  const initialProductCount = countHairRasProducts();

  const dailyProductSelection = renderer.root.findAllByProps({
    accessibilityLabel: 'Select daily Hair Ras for removal',
  })[0];
  await ReactTestRenderer.act(() => {
    dailyProductSelection.props.onPress();
  });

  const removeButton = renderer.root.findByProps({
    accessibilityLabel: 'Remove selected products',
  });
  expect(removeButton.props.accessibilityState.disabled).toBe(false);

  await ReactTestRenderer.act(() => {
    removeButton.props.onPress();
  });

  expect(countHairRasProducts()).toBe(initialProductCount - 2);
});
