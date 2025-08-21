import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator, Alert, Switch, ScrollView, Animated } from 'react-native';
import { WebView } from 'react-native-webview';
import { api } from '../services/api';

export default function MapScreen() {
  const [mapReady, setMapReady] = useState(false);
  const [noiseData, setNoiseData] = useState([]);
  const [useMockData, setUseMockData] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // Settings
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  
  const webViewRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Sample data
  const sampleNoiseData = [
    { lat: 6.9271, lng: 79.8612, dB: 75, timestamp: '2025-08-21T10:00:00Z', location: 'Colombo' },
    { lat: 7.2906, lng: 80.6337, dB: 68, timestamp: '2025-08-21T10:05:00Z', location: 'Kandy' },
    { lat: 6.0535, lng: 80.2210, dB: 72, timestamp: '2025-08-21T10:10:00Z', location: 'Galle' }
  ];

  // Simple map HTML
  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
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
        var map = L.map('map').setView([7.8731, 80.7718], 7);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        
        var sampleData = ${JSON.stringify(sampleNoiseData)};
        sampleData.forEach(function(point) {
          var marker = L.circleMarker([point.lat, point.lng], {
            radius: 10,
            fillColor: point.dB > 80 ? '#e74c3c' : point.dB > 60 ? '#f39c12' : '#2ecc71',
            color: 'white',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
          }).addTo(map);
          
          marker.bindPopup(\`
            <b>\${point.location}</b><br>
            \${point.dB} dB<br>
            \${new Date(point.timestamp).toLocaleString()}
          \`);
          
          marker.on('click', function() {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'marker_click',
                data: point
              }));
            }
          });
        });
        
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage('Map Ready');
        }
      </script>
    </body>
    </html>
  `;

  useEffect(() => {
    setNoiseData(sampleNoiseData);
    setLastUpdate(new Date());
  }, []);

  const handleMapMessage = (event) => {
    const message = event.nativeEvent.data;
    
    if (message === 'Map Ready') {
      setMapReady(true);
    } else {
      try {
        const data = JSON.parse(message);
        if (data.type === 'marker_click') {
          setSelectedLocation(data.data);
        }
      } catch (e) {
        console.log('Error parsing message:', e);
      }
    }
  };

  const toggleOptions = () => {
    setShowOptions(!showOptions);
    Animated.timing(slideAnim, {
      toValue: showOptions ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const addRandomPoint = () => {
    const lat = 6.0 + Math.random() * 4.0;
    const lng = 79.0 + Math.random() * 3.0;
    const dB = 60 + Math.random() * 30;
    const locations = ['Colombo', 'Kandy', 'Galle'];
    const location = locations[Math.floor(Math.random() * locations.length)];
    
    const newPoint = {
      lat,
      lng,
      dB: Math.round(dB),
      timestamp: new Date().toISOString(),
      location
    };
    
    setNoiseData(prev => [...prev, newPoint]);
  };

  return (
    <View style={styles.container}>
      {/* Clean Header */}
      {!isFullScreen && (
        <View style={styles.header}>
          <Text style={styles.title}>Live Noise Map</Text>
          <Text style={styles.subtitle}>Sri Lanka</Text>
          {lastUpdate && (
            <Text style={styles.updateTime}>Updated {lastUpdate.toLocaleTimeString()}</Text>
          )}
        </View>
      )}

      {/* Map */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: mapHtml }}
          style={styles.map}
          onMessage={handleMapMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
        
        {!mapReady && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading Map...</Text>
          </View>
        )}
      </View>

      {/* Fullscreen Button */}
      <TouchableOpacity style={styles.fullscreenFab} onPress={toggleFullScreen}>
        <Text style={styles.fabText}>{isFullScreen ? '⤓' : '⤢'}</Text>
      </TouchableOpacity>

      {/* Options Button */}
      <TouchableOpacity style={styles.fab} onPress={toggleOptions}>
        <Text style={styles.fabText}>⚙️</Text>
      </TouchableOpacity>

      {/* Options Panel */}
      <Animated.View 
        style={[
          styles.optionsPanel,
          {
            transform: [{
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [400, 0],
              })
            }]
          }
        ]}
      >
        {showOptions && (
          <ScrollView style={styles.optionsScroll}>
            <View style={styles.optionsHeader}>
              <Text style={styles.optionsTitle}>Options</Text>
              <TouchableOpacity onPress={toggleOptions} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Data Source */}
            <View style={styles.optionSection}>
              <Text style={styles.sectionTitle}>Data Source</Text>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>{useMockData ? 'Mock Data' : 'Live Data'}</Text>
                <Switch
                  value={!useMockData}
                  onValueChange={(value) => setUseMockData(!value)}
                  trackColor={{ false: '#e2e8f0', true: '#10b981' }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* Actions */}
            <View style={styles.optionSection}>
              <Text style={styles.sectionTitle}>Actions</Text>
              <TouchableOpacity style={styles.actionButton} onPress={addRandomPoint}>
                <Text style={styles.actionButtonText}>📍 Add Random Point</Text>
              </TouchableOpacity>
            </View>

            {/* Settings */}
            <View style={styles.optionSection}>
              <Text style={styles.sectionTitle}>Settings</Text>
              
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Auto-refresh</Text>
                <Switch
                  value={autoRefresh}
                  onValueChange={setAutoRefresh}
                  trackColor={{ false: '#e2e8f0', true: '#007AFF' }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Notifications</Text>
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ false: '#e2e8f0', true: '#007AFF' }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Dark Mode</Text>
                <Switch
                  value={darkMode}
                  onValueChange={setDarkMode}
                  trackColor={{ false: '#e2e8f0', true: '#007AFF' }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* Stats */}
            <View style={styles.optionSection}>
              <Text style={styles.sectionTitle}>Statistics</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{noiseData.length}</Text>
                  <Text style={styles.statLabel}>Points</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {noiseData.length > 0 ? Math.round(noiseData.reduce((sum, p) => sum + p.dB, 0) / noiseData.length) : 0}
                  </Text>
                  <Text style={styles.statLabel}>Avg dB</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        )}
      </Animated.View>

      {/* Location Info */}
      {selectedLocation && (
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Text style={styles.infoTitle}>Location Details</Text>
            <TouchableOpacity onPress={() => setSelectedLocation(null)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.dbValue}>{selectedLocation.dB} dB</Text>
            <Text style={styles.infoTime}>{selectedLocation.location}</Text>
            <Text style={styles.infoTime}>
              {new Date(selectedLocation.timestamp).toLocaleString()}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 5,
  },
  updateTime: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  fullscreenFab: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    color: 'white',
    fontSize: 24,
  },
  optionsPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    maxHeight: '80%',
  },
  optionsScroll: {
    padding: 20,
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  optionsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a202c',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f7fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#4a5568',
  },
  optionSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 15,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f7fafc',
    borderRadius: 12,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#4a5568',
    fontWeight: '500',
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f7fafc',
    borderRadius: 12,
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 16,
    color: '#4a5568',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f7fafc',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  infoCard: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3748',
  },
  infoContent: {
    alignItems: 'center',
  },
  dbValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 8,
  },
  infoTime: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 4,
  },
}); 