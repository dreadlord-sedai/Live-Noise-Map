import React, { useEffect, useState } from 'react';
import MapView, { PROVIDER_GOOGLE, Heatmap } from 'react-native-maps';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../services/api';

export default function MapScreen() {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await api.getNoise({ timeRange: '24h' });
        if (!mounted) return;
        const heatPoints = data.map((d) => ({
          latitude: d.lat,
          longitude: d.lon,
          weight: Math.max(0.1, Math.min(1, d.dB / 100)),
        }));
        setPoints(heatPoints);
      } catch (e) {
        console.warn('Failed to load heatmap data', e);
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={{ latitude: 7.8731, longitude: 80.7718, latitudeDelta: 3.5, longitudeDelta: 3.5 }}
      >
        {points.length > 0 && (
          <Heatmap points={points} radius={40} opacity={0.8} gradient={{
            colors: ['#00ff7f', '#ffd700', '#ff0000'],
            startPoints: [0.01, 0.5, 1.0],
            colorMapSize: 256,
          }} />
        )}
      </MapView>
      {loading && (
        <View style={styles.loading}> 
          <ActivityIndicator />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
