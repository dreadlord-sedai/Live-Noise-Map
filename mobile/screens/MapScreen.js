import React, { useState } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

export default function MapScreen() {
  const [mapReady, setMapReady] = useState(false);

  // Simple OpenStreetMap HTML with Leaflet
  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { width: 100%; height: 100vh; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map').setView([37.78825, -122.4324], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        // Add a marker
        L.marker([37.78825, -122.4324]).addTo(map)
          .bindPopup('San Francisco')
          .openPopup();
          
        // Notify React Native that map is ready
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage('Map Ready');
        }
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <Text style={styles.debug}>Map Status: {mapReady ? 'Ready' : 'Loading...'}</Text>
      
      <View style={styles.mapContainer}>
        <WebView
          source={{ html: mapHtml }}
          style={styles.map}
          onMessage={(event) => {
            if (event.nativeEvent.data === 'Map Ready') {
              setMapReady(true);
            }
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          scrollEnabled={false}
          bounces={false}
        />
      </View>
      
      <View style={styles.info}>
        <Text>Screen Width: {Dimensions.get('window').width}</Text>
        <Text>Screen Height: {Dimensions.get('window').height}</Text>
        <Text>Map Ready: {mapReady ? 'Yes' : 'No'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  mapContainer: {
    flex: 1,
    borderWidth: 2,
    borderColor: 'red',
    backgroundColor: 'yellow',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  debug: {
    position: 'absolute',
    top: 50,
    left: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 10,
    zIndex: 1000,
  },
  info: {
    position: 'absolute',
    bottom: 50,
    left: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 10,
    zIndex: 1000,
  },
});
