import React, { useEffect, useState } from 'react';
import MapView from 'react-native-maps';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { api } from '../services/api';

export default function MapScreen() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  // Optional: prefetch data in the background (not used for rendering yet)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        await api.getNoise({ timeRange: '24h' });
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        onMapReady={() => setReady(true)}
        initialRegion={{ latitude: 7.8731, longitude: 80.7718, latitudeDelta: 3.5, longitudeDelta: 3.5 }}
      />
      {!ready && (
        <View style={styles.banner}>
          <Text>Loading map…</Text>
        </View>
      )}
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
  map: { flex: 1 },
  loading: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  banner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
});
