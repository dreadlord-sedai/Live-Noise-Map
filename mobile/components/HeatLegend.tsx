import React from 'react';
import { View, Text } from 'react-native';

export default function HeatLegend() {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: '#64748b', fontSize: 12 }}>Quiet</Text>
        <Text style={{ color: '#64748b', fontSize: 12 }}>Loud</Text>
      </View>
      <View
        style={{
          height: 10,
          borderRadius: 999,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: '#e2e8f0',
          backgroundColor: '#fff',
        }}
      >
        <View
          style={{
            height: '100%',
            width: '100%',
            backgroundColor: 'transparent',
          }}
        />
      </View>
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: 10,
          marginTop: 18,
          borderRadius: 999,
          backgroundColor: 'transparent',
        }}
      />
    </View>
  );
}
