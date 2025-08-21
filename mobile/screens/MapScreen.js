import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Dimensions, TouchableOpacity, ActivityIndicator, Alert, Switch } from 'react-native';
import { WebView } from 'react-native-webview';
import { api } from '../services/api';

export default function MapScreen() {
  const [mapReady, setMapReady] = useState(false);
  const [noiseData, setNoiseData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [useMockData, setUseMockData] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const webViewRef = useRef(null);

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
    if (!useMockData) {
      const interval = setInterval(fetchRealTimeData, 30000);
      return () => clearInterval(interval);
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
        }
        #map { 
          width: 100%; 
          height: 100vh; 
        }
        .noise-marker {
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        .noise-popup {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          text-align: center;
        }
        .noise-popup h3 {
          margin: 0 0 8px 0;
          color: #333;
          font-size: 16px;
          font-weight: 600;
        }
        .noise-popup .db-value {
          font-size: 24px;
          font-weight: bold;
          color: #e74c3c;
          margin: 8px 0;
        }
        .noise-popup .timestamp {
          font-size: 12px;
          color: #666;
          margin-top: 8px;
        }
        .legend {
          position: absolute;
          bottom: 20px;
          right: 20px;
          background: white;
          padding: 15px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          z-index: 1000;
          min-width: 150px;
        }
        .legend h4 {
          margin: 0 0 10px 0;
          font-size: 14px;
          color: #333;
        }
        .legend-item {
          display: flex;
          align-items: center;
          margin: 5px 0;
          font-size: 12px;
        }
        .legend-color {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          margin-right: 8px;
          border: 1px solid #ccc;
        }
        .heatmap-toggle {
          position: absolute;
          top: 20px;
          left: 20px;
          background: white;
          padding: 10px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          z-index: 1000;
        }
        .heatmap-toggle button {
          background: #007AFF;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          margin: 2px;
          font-size: 12px;
          cursor: pointer;
        }
        .heatmap-toggle button.active {
          background: #0056b3;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      
      <div class="heatmap-toggle">
        <button id="markers-btn" class="active">Markers</button>
        <button id="heatmap-btn">Heatmap</button>
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
          if (dB <= 60) return 8;
          if (dB <= 80) return 12;
          return 16;
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
              weight: 2,
              opacity: 1,
              fillOpacity: 0.8,
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
          
          // Create heatmap layer
          heatmapLayer = L.heatLayer(heatmapData, {
            radius: 25,
            blur: 15,
            maxZoom: 10,
            gradient: {
              0.0: '#2ecc71',  // Green for low
              0.5: '#f39c12',  // Orange for medium
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
              weight: 2,
              opacity: 1,
              fillOpacity: 0.8,
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
              radius: 25,
              blur: 15,
              maxZoom: 10,
              gradient: {
                0.0: '#2ecc71',
                0.5: '#f39c12',
                1.0: '#e74c3c'
              }
            }).addTo(map);
          }
          
          // Animate the new point
          if (currentView === 'markers') {
            marker.setRadius(size + 5);
            setTimeout(function() {
              marker.setRadius(size);
            }, 200);
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

  return (
    <View style={styles.container}>
      {/* Header */}
      {!isFullScreen && (
        <View style={styles.header}>
          <Text style={styles.title}>Live Noise Map</Text>
          <Text style={styles.subtitle}>Sri Lanka</Text>
        </View>
      )}

      {/* Data Toggle */}
      {!isFullScreen && (
      <View style={styles.toggleContainer}>
        <Text style={styles.toggleLabel}>Data Source:</Text>
        <View style={styles.toggleRow}>
          <Text style={[styles.toggleText, useMockData && styles.toggleTextActive]}>Mock</Text>
          <Switch
            value={!useMockData}
            onValueChange={(value) => setUseMockData(!value)}
            trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
            thumbColor={!useMockData ? '#f4f3f4' : '#ffffff'}
          />
          <Text style={[styles.toggleText, !useMockData && styles.toggleTextActive]}>Real-time</Text>
        </View>
        {lastUpdate && (
          <Text style={styles.lastUpdate}>
            Last update: {lastUpdate.toLocaleTimeString()}
          </Text>
        )}
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
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading Map...</Text>
          </View>
        )}
      </View>

      {/* Controls */}
      {!isFullScreen && (
      <View style={styles.controls}>
        <TouchableOpacity style={styles.button} onPress={addRandomNoisePoint}>
          <Text style={styles.buttonText}>Add Point</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={refreshData}>
          <Text style={styles.buttonText}>Refresh</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={() => Alert.alert('Info', 'Toggle between Markers and Heatmap view using the buttons on the map. Tap markers to see details.')}>
          <Text style={styles.buttonText}>Help</Text>
        </TouchableOpacity>
      </View>
      )}

      {/* Selected Location Info */}
      {selectedLocation && !isFullScreen && (
        <View style={styles.infoPanel}>
          <Text style={styles.infoTitle}>{selectedLocation.location}</Text>
          <Text style={styles.infoDB}>{selectedLocation.dB} dB</Text>
          <Text style={styles.infoTime}>
            {new Date(selectedLocation.timestamp).toLocaleString()}
          </Text>
          {selectedLocation.deviceId && (
            <Text style={styles.infoDevice}>Device: {selectedLocation.deviceId}</Text>
          )}
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setSelectedLocation(null)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stats */}
      {!isFullScreen && (
      <View style={styles.stats}>
        <Text style={styles.statsText}>
          Total Points: {noiseData.length}
        </Text>
        <Text style={styles.statsText}>
          Avg Noise: {Math.round(noiseData.reduce((sum, p) => sum + p.dB, 0) / noiseData.length)} dB
        </Text>
        <Text style={styles.statsText}>
          Max Noise: {Math.max(...noiseData.map(p => p.dB))} dB
        </Text>
      </View>
      )}

      {/* Fullscreen toggle FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setIsFullScreen(prev => !prev)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>{isFullScreen ? '↙︎' : '⛶'}</Text>
      </TouchableOpacity>
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
  },
  toggleContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  toggleLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  controls: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoPanel: {
    position: 'absolute',
    top: 200,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoDB: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 5,
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
    position: 'absolute',
    top: 15,
    right: 15,
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
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statsText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
});
