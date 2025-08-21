import React, { useState } from 'react';
import MapView from 'react-native-maps';
import { View, StyleSheet, Text, Dimensions } from 'react-native';

export default function MapScreen() {
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState(null);

  const initialRegion = {
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  return (
    <View style={styles.container}>
      <Text style={styles.debug}>Map Status: {mapReady ? 'Ready' : 'Loading...'}</Text>
      {error && <Text style={styles.error}>Error: {error}</Text>}
      
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        onMapReady={() => {
          console.log('Map is ready!');
          setMapReady(true);
        }}
        onError={(error) => {
          console.log('Map error:', error);
          setError(error.nativeEvent.message);
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
        mapType="standard"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  map: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  debug: {
    position: 'absolute',
    top: 50,
    left: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 10,
    zIndex: 1000,
  },
  error: {
    position: 'absolute',
    top: 100,
    left: 10,
    backgroundColor: 'rgba(255,0,0,0.9)',
    color: 'white',
    padding: 10,
    zIndex: 1000,
  },
});
