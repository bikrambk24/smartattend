import React from 'react';
import { View } from 'react-native';
import { COLORS } from '../theme';

interface PingMarkProps {
  size?: number;
  color?: string;
}

export default function PingMark({ size = 32, color = COLORS.teal }: PingMarkProps) {
  const outerBorder = hexToRgba(color, 0.3);
  const middleBorder = hexToRgba(color, 0.6);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: outerBorder,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: size * 0.62,
          height: size * 0.62,
          borderRadius: (size * 0.62) / 2,
          borderWidth: 1.5,
          borderColor: middleBorder,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: size * 0.27,
            height: size * 0.27,
            borderRadius: (size * 0.27) / 2,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}