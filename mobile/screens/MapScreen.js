import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Dimensions, TouchableOpacity, ActivityIndicator, Alert, Switch, ScrollView, Animated } from 'react-native';
import { WebView } from 'react-native-webview';
import { initializeApp } from 'firebase/app';
import { getDatabase, onValue, ref as rtdbRef, off } from 'firebase/database';
import { api } from '../services/api';

export default function MapScreen() {
  const [mapReady, setMapReady] = useState(false);
  const [noiseData, setNoiseData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [useMockData, setUseMockData] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Settings states
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [dataQuality, setDataQuality] = useState(true);
  const [locationSharing, setLocationSharing] = useState(true);
  
  const webViewRef = useRef(null);
  const firebaseAppRef = useRef(null);
  const rtdbRefInstance = useRef(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Sri Lanka coordinates
  const sriLankaRegion = {
    latitude: 7.8731,
    longitude: 80.7718,
    zoom: 7
  };

  // Sample noise data for demonstration
  const sampleNoiseData = [
    { lat: 6.9271, lng: 79.8612, dB: 75, timestamp: '2025-08-21T10:00:00Z', location: 'Colombo' },
    { lat: 7.2906, lng: 80.6337, dB: 68, timestamp: '2025-08-21T10:05:00Z', location: 'Kandy' },
    { lat: 6.0535, lng: 80.2210, dB: 72, timestamp: '2025-08-21T10:10:00Z', location: 'Galle' },
    { lat: 7.8731, lng: 80.7718, dB: 65, timestamp: '2025-08-21T10:15:00Z', location: 'Anuradhapura' },
    { lat: 8.5384, lng: 81.1330, dB: 70, timestamp: '2025-08-21T10:20:00Z', location: 'Trincomalee' },
    { lat: 6.5244, lng: 79.9572, dB: 78, timestamp: '2025-08-21T10:25:00Z', location: 'Negombo' },
    { lat: 7.2084, lng: 79.8386, dB: 71, timestamp: '2025-08-21T10:30:00Z', location: 'Kurunegala' },
    { lat: 6.7052, lng: 80.3844, dB: 69, timestamp: '2025-08-21T10:35:00Z', location: 'Ratnapura' },
    { lat: 7.1164, lng: 79.8846, dB: 73, timestamp: '2025-08-21T10:40:00Z', location: 'Gampaha' },
    { lat: 6.8210, lng: 80.0415, dB: 67, timestamp: '2025-08-21T10:45:00Z', location: 'Kalutara' }
  ];

  // Firebase configuration - matching web app
  const firebaseConfig = {
    apiKey: 'AIzaSyCOCcQdAzkYxhfiEiQGCdoZA975PfsOu6A',
    authDomain: 'live-noise-map.firebaseapp.com',
    projectId: 'live-noise-map',
    storageBucket: 'live-noise-map.firebasestorage.app',
    messagingSenderId: '451956665233',
    appId: '1:451956665233:web:3e638a0e860f8c84c34830',
    databaseURL: 'https://live-noise-map-default-rtdb.asia-southeast1.firebasedatabase.app',
  };

  // Firebase singleton pattern - matching web app structure
  const ensureFirebaseApp = () => {
    if (!firebaseAppRef.current) {
      try {
        firebaseAppRef.current = initializeApp(firebaseConfig);
        console.log('[Firebase] Configured RTDB URL:', firebaseConfig.databaseURL);
      } catch (error) {
        console.error('[Firebase] Initialization error:', error);
        return null;
      }
    }
    return firebaseAppRef.current;
  };

  const getRealtimeDb = () => {
    const app = ensureFirebaseApp();
    if (!app) return null;
    try {
      return getDatabase(app);
    } catch (error) {
      console.error('[Firebase] RTDB error:', error);
      return null;
    }
  };

  // Fetch real-time noise data
  const fetchRealTimeData = async () => {
    try {
      setIsLoading(true);
      const response = await api.getNoise({ timeRange: '24h' });
      
      if (response && response.data) {
        // Transform API data to match our format
        const transformedData = response.data.map(item => ({
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          dB: parseFloat(item.dB),
          timestamp: item.timestamp,
          location: item.location || 'Unknown',
          deviceId: item.deviceId
        }));
        
        setNoiseData(transformedData);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error fetching real-time data:', error);
      Alert.alert('Error', 'Failed to fetch real-time data. Using mock data instead.');
      setUseMockData(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data based on toggle state
  useEffect(() => {
    if (useMockData) {
      setNoiseData(sampleNoiseData);
      setLastUpdate(new Date());
    } else {
      fetchRealTimeData();
    }
  }, [useMockData]);

  // Auto-refresh real-time data every 30 seconds
  useEffect(() => {
    if (!useMockData && autoRefresh) {
      const interval = setInterval(fetchRealTimeData, 30000);
      return () => clearInterval(interval);
    }
  }, [useMockData, autoRefresh]);

  // Firebase RTDB live listener - Proper integration with error handling
  useEffect(() => {
    if (!useMockData) {
      const db = getRealtimeDb();
      if (!db) {
        console.error('[Firebase] Failed to get RTDB instance');
        Alert.alert('Firebase Error', 'Failed to connect to Firebase. Using mock data.');
        setUseMockData(true);
        return;
      }

      try {
        const pointsRef = rtdbRef(db, 'noiseReports');
        rtdbRefInstance.current = onValue(pointsRef, (snap) => {
          const val = snap.val() || {};
          const list = Object.values(val).map((p) => ({
            lat: parseFloat(p.latitude || p.lat),
            lng: parseFloat(p.longitude || p.lng),
            dB: parseFloat(p.dbValue || p.dB),
            timestamp: p.timestamp,
            location: p.location || 'Unknown',
            deviceId: p.deviceId || 'device',
          }));
          if (list.length) {
            setNoiseData(list);
            setLastUpdate(new Date());
          }
        }, (error) => {
          console.error('[Firebase] RTDB listener error:', error);
          Alert.alert('Firebase Error', 'Failed to listen to real-time updates. Using mock data.');
          setUseMockData(true);
        });

        return () => {
          if (rtdbRefInstance.current) {
            try {
              off(pointsRef, 'value', rtdbRefInstance.current);
            } catch (error) {
              console.error('[Firebase] Cleanup error:', error);
            }
          }
        };
      } catch (error) {
        console.error('[Firebase] RTDB setup error:', error);
        Alert.alert('Firebase Error', 'Failed to setup real-time listener. Using mock data.');
        setUseMockData(true);
      }
    }
  }, [useMockData]);

  // Enhanced map HTML with heatmap functionality
  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
      <style>
        body { 
          margin: 0; 
          padding: 0; 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f8f9fa;
        }
        #map { 
          width: 100%; 
          height: 100vh; 
        }
        .noise-marker {
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          transition: all 0.3s ease;
        }
        .noise-marker:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 16px rgba(0,0,0,0.4);
        }
        .noise-popup {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          text-align: center;
          min-width: 200px;
        }
        .noise-popup h3 {
          margin: 0 0 12px 0;
          color: #333;
          font-size: 18px;
          font-weight: 600;
        }
        .noise-popup .db-value {
          font-size: 28px;
          font-weight: bold;
          color: #e74c3c;
          margin: 12px 0;
          text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
        .noise-popup .timestamp {
          font-size: 13px;
          color: #666;
          margin-top: 10px;
          font-style: italic;
        }
        .legend {
          position: absolute;
          bottom: 20px;
          right: 20px;
          background: white;
          padding: 20px;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
          z-index: 1000;
          min-width: 180px;
          border: 1px solid rgba(255,255,255,0.2);
          backdrop-filter: blur(10px);
        }
        .legend h4 {
          margin: 0 0 15px 0;
          font-size: 16px;
          color: #333;
          font-weight: 600;
          text-align: center;
        }
        .legend-item {
          display: flex;
          align-items: center;
          margin: 8px 0;
          font-size: 13px;
          color: #555;
        }
        .legend-color {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          margin-right: 12px;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .heatmap-toggle {
          position: absolute;
          top: 20px;
          left: 20px;
          background: white;
          padding: 12px;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
          z-index: 1000;
          border: 1px solid rgba(255,255,255,0.2);
          backdrop-filter: blur(10px);
        }
        .heatmap-toggle button {
          background: #007AFF;
          color: white;
          border: none;
          padding: 10px 18px;
          border-radius: 12px;
          margin: 2px;
          font-size: 13px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0,123,255,0.3);
        }
        .heatmap-toggle button:hover {
          background: #0056b3;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,123,255,0.4);
        }
        .heatmap-toggle button.active {
          background: #10b981;
          box-shadow: 0 4px 12px rgba(16,185,129,0.4);
        }
        .heatmap-toggle button.active:hover {
          background: #059669;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      
      <div class="heatmap-toggle">
        <button id="markers-btn" class="active">📍 Markers</button>
        <button id="heatmap-btn">🔥 Heatmap</button>
      </div>
      
      <div class="legend">
        <h4>Noise Levels (dB)</h4>
        <div class="legend-item">
          <div class="legend-color" style="background: #2ecc71;"></div>
          <span>Low (0-60)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #f39c12;"></div>
          <span>Medium (61-80)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #e74c3c;"></div>
          <span>High (81+)</span>
        </div>
      </div>
      
      <script>
        var map = L.map('map').setView([${sriLankaRegion.latitude}, ${sriLankaRegion.longitude}], ${sriLankaRegion.zoom});
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        var markers = [];
        var heatmapLayer = null;
        var currentView = 'markers';
        
        // Function to get color based on noise level
        function getNoiseColor(dB) {
          if (dB <= 60) return '#2ecc71'; // Green for low
          if (dB <= 80) return '#f39c12'; // Orange for medium
          return '#e74c3c'; // Red for high
        }
        
        // Function to get size based on noise level
        function getNoiseSize(dB) {
          if (dB <= 60) return 10;
          if (dB <= 80) return 14;
          return 18;
        }
        
        // Function to clear current view
        function clearCurrentView() {
          if (currentView === 'markers') {
            markers.forEach(marker => map.removeLayer(marker));
            markers = [];
          } else if (currentView === 'heatmap' && heatmapLayer) {
            map.removeLayer(heatmapLayer);
            heatmapLayer = null;
          }
        }
        
        // Function to show markers view
        function showMarkers(data) {
          clearCurrentView();
          currentView = 'markers';
          
          data.forEach(function(point) {
            var color = getNoiseColor(point.dB);
            var size = getNoiseSize(point.dB);
            
            var marker = L.circleMarker([point.lat, point.lng], {
              radius: size,
              fillColor: color,
              color: 'white',
              weight: 3,
              opacity: 1,
              fillOpacity: 0.9,
              className: 'noise-marker'
            }).addTo(map);
            
            var popupContent = \`
              <div class="noise-popup">
                <h3>\${point.location}</h3>
                <div class="db-value">\${point.dB} dB</div>
                <div class="timestamp">\${new Date(point.timestamp).toLocaleString()}</div>
                \${point.deviceId ? '<div style="font-size: 12px; color: #666;">Device: ' + point.deviceId + '</div>' : ''}
              </div>
            \`;
            
            marker.bindPopup(popupContent);
            
            // Add click event to notify React Native
            marker.on('click', function() {
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'marker_click',
                  data: point
                }));
              }
            });
            
            markers.push(marker);
          });
          
          document.getElementById('markers-btn').classList.add('active');
          document.getElementById('heatmap-btn').classList.remove('active');
        }
        
        // Function to show heatmap view
        function showHeatmap(data) {
          clearCurrentView();
          currentView = 'heatmap';
          
          // Prepare heatmap data
          var heatmapData = data.map(function(point) {
            return [point.lat, point.lng, point.dB];
          });
          
          // Create heatmap layer with enhanced settings
          heatmapLayer = L.heatLayer(heatmapData, {
            radius: 30,
            blur: 20,
            maxZoom: 12,
            minOpacity: 0.3,
            gradient: {
              0.0: '#2ecc71',  // Green for low
              0.4: '#f39c12',  // Orange for medium
              0.7: '#e67e22',  // Dark orange
              1.0: '#e74c3c'   // Red for high
            }
          }).addTo(map);
          
          document.getElementById('heatmap-btn').classList.add('active');
          document.getElementById('markers-btn').classList.remove('active');
        }
        
        // Function to add new noise point
        function addNoisePoint(lat, lng, dB, location, deviceId) {
          var newPoint = {
            lat: lat,
            lng: lng,
            dB: dB,
            location: location,
            timestamp: new Date().toISOString(),
            deviceId: deviceId
          };
          
          // Add to current view
          if (currentView === 'markers') {
            var color = getNoiseColor(dB);
            var size = getNoiseSize(dB);
            
            var marker = L.circleMarker([lat, lng], {
              radius: size,
              fillColor: color,
              color: 'white',
              weight: 3,
              opacity: 1,
              fillOpacity: 0.9,
              className: 'noise-marker'
            }).addTo(map);
            
            var popupContent = \`
              <div class="noise-popup">
                <h3>\${location}</h3>
                <div class="db-value">\${dB} dB</div>
                <div class="timestamp">\${new Date().toLocaleString()}</div>
                \${deviceId ? '<div style="font-size: 12px; color: #666;">Device: ' + deviceId + '</div>' : ''}
              </div>
            \`;
            
            marker.bindPopup(popupContent);
            
            marker.on('click', function() {
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'marker_click',
                  data: newPoint
                }));
              }
            });
            
            markers.push(marker);
          } else if (currentView === 'heatmap' && heatmapLayer) {
            // Update heatmap
            var heatmapData = heatmapLayer.getLatLngs().map(function(point) {
              return [point.lat, point.lng, point.value];
            });
            heatmapData.push([lat, lng, dB]);
            
            map.removeLayer(heatmapLayer);
            heatmapLayer = L.heatLayer(heatmapData, {
              radius: 30,
              blur: 20,
              maxZoom: 12,
              minOpacity: 0.3,
              gradient: {
                0.0: '#2ecc71',
                0.4: '#f39c12',
                0.7: '#e67e22',
                1.0: '#e74c3c'
              }
            }).addTo(map);
          }
          
          // Animate the new point
          if (currentView === 'markers') {
            marker.setRadius(size + 8);
            setTimeout(function() {
              marker.setRadius(size);
            }, 300);
          }
        }
        
        // Event listeners for view toggle
        document.getElementById('markers-btn').addEventListener('click', function() {
          showMarkers(window.currentData || []);
        });
        
        document.getElementById('heatmap-btn').addEventListener('click', function() {
          showHeatmap(window.currentData || []);
        });
        
        // Listen for messages from React Native
        window.addEventListener('message', function(event) {
          try {
            var data = JSON.parse(event.data);
            if (data.type === 'add_noise_point') {
              addNoisePoint(data.lat, data.lng, data.dB, data.location, data.deviceId);
            } else if (data.type === 'update_data') {
              window.currentData = data.data;
              if (currentView === 'markers') {
                showMarkers(data.data);
              } else {
                showHeatmap(data.data);
              }
            }
          } catch (e) {
            console.log('Error parsing message:', e);
          }
        });
        
        // Notify React Native that map is ready
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage('Map Ready');
        }
        
        // Initialize with sample data
        var sampleData = ${JSON.stringify(sampleNoiseData)};
        window.currentData = sampleData;
        showMarkers(sampleData);
      </script>
    </body>
    </html>
  `;

  const handleMapMessage = (event) => {
    const message = event.nativeEvent.data;
    
    if (message === 'Map Ready') {
      setMapReady(true);
      // Send initial data to map
      updateMapData();
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

  const updateMapData = () => {
    if (webViewRef.current && mapReady) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'update_data',
        data: noiseData
      }));
    }
  };

  // Update map when data changes
  useEffect(() => {
    if (mapReady) {
      updateMapData();
    }
  }, [noiseData, mapReady]);

  const addNoisePoint = (lat, lng, dB, location, deviceId = 'mobile-device') => {
    const newPoint = {
      lat,
      lng,
      dB,
      location,
      timestamp: new Date().toISOString(),
      deviceId
    };
    
    setNoiseData(prev => [...prev, newPoint]);
  };

  const addRandomNoisePoint = () => {
    // Generate random point in Sri Lanka
    const lat = 6.0 + Math.random() * 4.0; // 6°N to 10°N
    const lng = 79.0 + Math.random() * 3.0; // 79°E to 82°E
    const dB = 60 + Math.random() * 30; // 60-90 dB
    const locations = ['Colombo', 'Kandy', 'Galle', 'Jaffna', 'Trincomalee', 'Anuradhapura', 'Negombo', 'Kurunegala'];
    const location = locations[Math.floor(Math.random() * locations.length)];
    
    addNoisePoint(lat, lng, Math.round(dB), location);
  };

  const refreshData = () => {
    if (useMockData) {
      setNoiseData([...sampleNoiseData]);
    } else {
      fetchRealTimeData();
    }
  };

  const toggleSettings = () => {
    setShowSettings(!showSettings);
    Animated.timing(slideAnim, {
      toValue: showSettings ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  return (
    <View style={styles.container}>
      {/* Header - Clean and modern */}
      {!isFullScreen && (
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>🌐</Text>
            </View>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Live Noise Map</Text>
              <Text style={styles.subtitle}>Sri Lanka</Text>
              {lastUpdate && (
                <Text style={styles.updateTime}>Updated {lastUpdate.toLocaleTimeString()}</Text>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Data Source Toggle - Clean floating card */}
      {!isFullScreen && (
        <View style={styles.toggleCard}>
          <View style={styles.toggleContent}>
            <Text style={styles.toggleLabel}>{useMockData ? 'Mock Data' : 'Live Data'}</Text>
            <Switch
              value={!useMockData}
              onValueChange={(value) => setUseMockData(!value)}
              trackColor={{ false: '#e2e8f0', true: '#10b981' }}
              thumbColor={!useMockData ? '#ffffff' : '#ffffff'}
              ios_backgroundColor="#e2e8f0"
            />
          </View>
        </View>
      )}

      {/* Map Container */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: mapHtml }}
          style={styles.map}
          onMessage={handleMapMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          scrollEnabled={false}
          bounces={false}
        />
        
        {!mapReady && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading Map...</Text>
            </View>
          </View>
        )}
      </View>

      {/* Quick Actions - Floating action buttons */}
      {!isFullScreen && (
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton} onPress={addRandomNoisePoint}>
            <Text style={styles.actionButtonText}>📍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={refreshData}>
            <Text style={styles.actionButtonText}>🔄</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={toggleSettings}>
            <Text style={styles.actionButtonText}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => setIsFullScreen(prev => !prev)}>
            <Text style={styles.actionButtonText}>⛶</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Settings Panel - Slide up from bottom */}
      <Animated.View 
        style={[
          styles.settingsPanel,
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
        {showSettings && (
          <ScrollView style={styles.settingsScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>Settings</Text>
              <TouchableOpacity onPress={toggleSettings} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Data Settings */}
            <View style={styles.settingsSection}>
              <Text style={styles.sectionTitle}>Data & Connectivity</Text>
              
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Auto-refresh</Text>
                  <Text style={styles.settingDescription}>Automatically update data every 30 seconds</Text>
                </View>
                <Switch
                  value={autoRefresh}
                  onValueChange={setAutoRefresh}
                  trackColor={{ false: '#e2e8f0', true: '#007AFF' }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Data Quality</Text>
                  <Text style={styles.settingDescription}>Enable data validation and filtering</Text>
                </View>
                <Switch
                  value={dataQuality}
                  onValueChange={setDataQuality}
                  trackColor={{ false: '#e2e8f0', true: '#007AFF' }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* App Settings */}
            <View style={styles.settingsSection}>
              <Text style={styles.sectionTitle}>App Preferences</Text>
              
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Notifications</Text>
                  <Text style={styles.settingDescription}>Receive alerts for high noise levels</Text>
                </View>
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ false: '#e2e8f0', true: '#007AFF' }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Dark Mode</Text>
                  <Text style={styles.settingDescription}>Switch to dark theme</Text>
                </View>
                <Switch
                  value={darkMode}
                  onValueChange={setDarkMode}
                  trackColor={{ false: '#e2e8f0', true: '#007AFF' }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Location Sharing</Text>
                  <Text style={styles.settingDescription}>Share your location for noise mapping</Text>
                </View>
                <Switch
                  value={locationSharing}
                  onValueChange={setLocationSharing}
                  trackColor={{ false: '#e2e8f0', true: '#007AFF' }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* Statistics */}
            <View style={styles.settingsSection}>
              <Text style={styles.sectionTitle}>Statistics</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{noiseData.length}</Text>
                  <Text style={styles.statLabel}>Data Points</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {noiseData.length > 0 ? Math.round(noiseData.reduce((sum, p) => sum + p.dB, 0) / noiseData.length) : 0}
                  </Text>
                  <Text style={styles.statLabel}>Avg dB</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {noiseData.length > 0 ? Math.max(...noiseData.map(p => p.dB)) : 0}
                  </Text>
                  <Text style={styles.statLabel}>Max dB</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {noiseData.length > 0 ? Math.min(...noiseData.map(p => p.dB)) : 0}
                  </Text>
                  <Text style={styles.statLabel}>Min dB</Text>
                </View>
              </View>
            </View>

            {/* About */}
            <View style={styles.settingsSection}>
              <Text style={styles.sectionTitle}>About</Text>
              <View style={styles.aboutCard}>
                <Text style={styles.aboutText}>Live Noise Map v1.0.0</Text>
                <Text style={styles.aboutText}>Real-time noise monitoring for Sri Lanka</Text>
                <Text style={styles.aboutText}>Built with React Native & Firebase</Text>
              </View>
            </View>
          </ScrollView>
        )}
      </Animated.View>

      {/* Selected Location Info - Clean floating card */}
      {selectedLocation && !isFullScreen && (
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Text style={styles.infoTitle}>Location Details</Text>
            <TouchableOpacity onPress={() => setSelectedLocation(null)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoContent}>
            <View style={styles.dbContainer}>
              <Text style={styles.dbLabel}>Noise Level</Text>
              <Text style={styles.dbValue}>{selectedLocation.dB} dB</Text>
            </View>
            <Text style={styles.infoTime}>
              {new Date(selectedLocation.timestamp).toLocaleString()}
            </Text>
            {selectedLocation.deviceId && (
              <Text style={styles.infoDevice}>Device: {selectedLocation.deviceId}</Text>
            )}
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
    position: 'relative',
    overflow: 'hidden',
  },
  headerContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  logoContainer: {
    width: 50,
    height: 50,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoTextMain: {
    fontSize: 24,
    marginBottom: 2,
  },
  logoTextSub: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#007AFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  titleContainer: {
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
    marginTop: 5,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'transparent',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: -1,
  },
  toggleCard: {
    position: 'absolute',
    top: 100,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 100,
    maxWidth: 200,
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  toggleText: {
    fontSize: 14,
    color: '#999',
    marginHorizontal: 10,
  },
  toggleTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  lastUpdate: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  fabText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
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
  loadingCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 90,
  },
  controlButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  controlButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    position: 'absolute',
    top: 180,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 80,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  infoContent: {
    flexDirection: 'column',
  },
  dbContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 5,
  },
  dbLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 5,
  },
  dbValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  infoTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  infoDevice: {
    fontSize: 12,
    color: '#999',
    marginBottom: 15,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  statsCard: {
    position: 'absolute',
    bottom: 180,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 70,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#e0e0e0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  minimizeButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
    padding: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  minimizeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  controlsContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statsContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  cardHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendContent: {
    flexDirection: 'column',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  legendText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  quickActionsCard: {
    position: 'absolute',
    top: 280,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 85,
    maxWidth: 150,
  },
  quickActionsContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
  },
  quickActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  quickActionButtonText: {
    fontSize: 18,
    color: 'white',
  },
  notificationCard: {
    position: 'absolute',
    top: 280,
    left: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 75,
    maxWidth: 200,
  },
  notificationContent: {
    flexDirection: 'column',
    gap: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationLabel: {
    fontSize: 12,
    color: '#666',
  },
  notificationValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  helpCard: {
    position: 'absolute',
    bottom: 280,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 65,
    maxWidth: 200,
  },
  helpContent: {
    flexDirection: 'column',
    gap: 6,
  },
  helpText: {
    fontSize: 11,
    color: '#666',
    lineHeight: 16,
  },
  searchCard: {
    position: 'absolute',
    bottom: 280,
    left: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 60,
    maxWidth: 180,
  },
  searchContent: {
    flexDirection: 'column',
    gap: 8,
  },
  filterItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 11,
    color: '#666',
  },
  filterValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  settingsCard: {
    position: 'absolute',
    bottom: 380,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 55,
    maxWidth: 180,
  },
  settingsContent: {
    flexDirection: 'column',
    gap: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 11,
    color: '#666',
  },
  settingValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  exportCard: {
    position: 'absolute',
    bottom: 380,
    left: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 50,
    maxWidth: 180,
  },
  exportContent: {
    flexDirection: 'column',
    gap: 8,
  },
  exportButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  exportButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  navigationCard: {
    position: 'absolute',
    bottom: 480,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 45,
    maxWidth: 180,
  },
  navigationContent: {
    flexDirection: 'column',
    gap: 8,
  },
  navButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  navButtonText: {
    color: '#333',
    fontSize: 11,
    fontWeight: '600',
  },
  weatherCard: {
    position: 'absolute',
    bottom: 480,
    left: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 40,
    maxWidth: 180,
  },
  weatherContent: {
    flexDirection: 'column',
    gap: 8,
  },
  weatherItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weatherLabel: {
    fontSize: 11,
    color: '#666',
  },
  weatherValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  timeCard: {
    position: 'absolute',
    bottom: 580,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 35,
    maxWidth: 180,
  },
  timeContent: {
    flexDirection: 'column',
    gap: 8,
  },
  timeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 11,
    color: '#666',
  },
  timeValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  deviceCard: {
    position: 'absolute',
    bottom: 580,
    left: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 30,
    maxWidth: 180,
  },
  deviceContent: {
    flexDirection: 'column',
    gap: 8,
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceLabel: {
    fontSize: 11,
    color: '#666',
  },
  deviceValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  networkCard: {
    position: 'absolute',
    bottom: 680,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 25,
    maxWidth: 180,
  },
  networkContent: {
    flexDirection: 'column',
    gap: 8,
  },
  networkItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  networkLabel: {
    fontSize: 11,
    color: '#666',
  },
  networkValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  locationCard: {
    position: 'absolute',
    bottom: 680,
    left: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 20,
    maxWidth: 180,
  },
  locationContent: {
    flexDirection: 'column',
    gap: 8,
  },
  locationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationLabel: {
    fontSize: 11,
    color: '#666',
  },
  locationValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  sensorCard: {
    position: 'absolute',
    bottom: 780,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 15,
    maxWidth: 180,
  },
  sensorContent: {
    flexDirection: 'column',
    gap: 8,
  },
  sensorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sensorLabel: {
    fontSize: 11,
    color: '#666',
  },
  sensorValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  qualityCard: {
    position: 'absolute',
    bottom: 780,
    left: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10,
    maxWidth: 180,
  },
  qualityContent: {
    flexDirection: 'column',
    gap: 8,
  },
  qualityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qualityLabel: {
    fontSize: 11,
    color: '#666',
  },
  qualityValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  alertsCard: {
    position: 'absolute',
    bottom: 880,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 5,
    maxWidth: 180,
  },
  alertsContent: {
    flexDirection: 'column',
    gap: 8,
  },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertLabel: {
    fontSize: 11,
    color: '#666',
  },
  alertValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  aboutCard: {
    position: 'absolute',
    bottom: 880,
    left: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1,
    maxWidth: 180,
  },
  aboutContent: {
    flexDirection: 'column',
    gap: 8,
  },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aboutLabel: {
    fontSize: 11,
    color: '#666',
  },
  aboutValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  feedbackCard: {
    position: 'absolute',
    bottom: 980,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 0,
    maxWidth: 180,
  },
  feedbackContent: {
    flexDirection: 'column',
    gap: 8,
  },
  feedbackButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  feedbackButtonText: {
    color: '#333',
    fontSize: 11,
    fontWeight: '600',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 999,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  settingsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  settingInfo: {
    flex: 1,
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statCard: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  aboutCard: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
    marginBottom: 20,
  },
  aboutText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
});
