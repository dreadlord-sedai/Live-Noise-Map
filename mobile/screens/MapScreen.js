import React, { useEffect, useRef, useState } from 'react';
import MapView, { UrlTile } from 'react-native-maps';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { api } from '../services/api';

export default function MapScreen() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef(null);
  const [layoutReady, setLayoutReady] = useState(false);

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

  const initialRegion = { latitude: 7.8731, longitude: 80.7718, latitudeDelta: 3.5, longitudeDelta: 3.5 };

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width > 0 && height > 0) setLayoutReady(true);
      }}
    >
      {layoutReady && (
      <MapView
        ref={mapRef}
        style={styles.map}
        mapType="none"
        onMapReady={() => {
          setReady(true);
          // Nudge layout on some devices where the map renders blank until a camera change
          requestAnimationFrame(() => {
            if (mapRef.current) {
              mapRef.current.animateToRegion(initialRegion, 1);
            }
          });
        }}
        onLayout={() => {
          if (mapRef.current) {
            mapRef.current.animateToRegion(initialRegion, 1);
          }
        }}
        initialRegion={initialRegion}
      >
        {/* Fallback tiles to ensure something renders even if Google base map has issues */}
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          shouldReplaceMapContent={false}
          zIndex={0}
        />
      </MapView>
      )}
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
  container: { flex: 1, width: '100%', height: '100%', backgroundColor: '#fff' },
  map: { ...StyleSheet.absoluteFillObject },
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
