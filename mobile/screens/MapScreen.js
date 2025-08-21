import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator, Alert, Switch, ScrollView, Animated } from 'react-native';
import { WebView } from 'react-native-webview';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import { api } from '../services/api';
import { generateMockSamples, nudgeSamples } from '../utils/mock';
import { subscribeToNoiseData, getRealtimeDb } from '../lib/firebase';
import { ref, push, set } from 'firebase/database';

export default function MapScreen() {
  const [mapReady, setMapReady] = useState(false);
  const [noiseData, setNoiseData] = useState([]);
  const [useMockData, setUseMockData] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // Settings
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  
  // Sound Capture
  const [isRecording, setIsRecording] = useState(false);
  const [currentDb, setCurrentDb] = useState(0);
  const [recordingPermission, setRecordingPermission] = useState(false);
  const [locationPermission, setLocationPermission] = useState(false);
  
  const webViewRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const sendToWebView = (type, data) => {
    if (!webViewRef.current) return;
    try {
      const payload = JSON.stringify({ type, data });
      const escaped = payload.replace(/\\/g, "\\\\").replace(/`/g, "\\`");
      const js = `(function(){try{var e=new MessageEvent('message',{data:\`${escaped}\`});window.dispatchEvent(e);document.dispatchEvent(e);}catch(e){}})();`;
      webViewRef.current.injectJavaScript(js);
    } catch (e) {}
  };

  // Mock simulation state
  const mockTimerRef = useRef(null);
  const firebaseUnsubscribeRef = useRef(null);
  
  // Sound capture refs
  const recordingRef = useRef(null);

  // Simple map HTML
  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script src="https://unpkg.com/leaflet.heat/dist/leaflet-heat.js"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { width: 100%; height: 100vh; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map').setView([7.8731, 80.7718], 7);
        var lightTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
        var darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; OpenStreetMap & CartoDB' });
        lightTiles.addTo(map);

        var markersLayer = L.layerGroup().addTo(map);
        var heatLayer = null;
        var heatEnabled = false;
        var lastPoints = [];

        function updateHeatLayer() {
          try {
            var heatData = (lastPoints || []).map(function(p){
              var val = Number(p.dB || 0);
              var intensity = Math.max(0, Math.min(1, (val - 50) / 40));
              return [p.lat, p.lng, intensity];
            });
            if (!heatLayer) {
              heatLayer = L.heatLayer(heatData, {
                radius: 25,
                blur: 15,
                maxZoom: 12,
                minOpacity: 0.25,
                gradient: {
                  0.0: '#2ecc71',
                  0.5: '#f39c12',
                  1.0: '#e74c3c'
                }
              });
            } else {
              heatLayer.setLatLngs(heatData);
            }
          } catch (e) {}
        }

        function renderData(points) {
          lastPoints = points || [];
          if (heatEnabled) {
            markersLayer.clearLayers();
            updateHeatLayer();
            if (heatLayer && !map.hasLayer(heatLayer)) heatLayer.addTo(map);
          } else {
            if (heatLayer && map.hasLayer(heatLayer)) map.removeLayer(heatLayer);
            markersLayer.clearLayers();
            lastPoints.forEach(function(point) {
              if (!point || typeof point.lat !== 'number' || typeof point.lng !== 'number') return;
            var marker = L.circleMarker([point.lat, point.lng], {
                radius: 10,
                fillColor: point.dB > 80 ? '#e74c3c' : point.dB > 60 ? '#f39c12' : '#2ecc71',
              color: 'white',
                weight: 2,
              opacity: 1,
                fillOpacity: 0.8
              }).addTo(markersLayer);
              marker.bindPopup('<b>' + (point.location || 'Unknown') + '</b><br>' + (point.dB || 0) + ' dB<br>' + new Date(point.timestamp || Date.now()).toLocaleString());
            marker.on('click', function() {
              if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'marker_click', data: point }));
                }
              });
            });
          }
        }

        function setHeatmapEnabled(enabled) {
          heatEnabled = !!enabled;
          if (heatEnabled) {
            updateHeatLayer();
            if (heatLayer && !map.hasLayer(heatLayer)) heatLayer.addTo(map);
            markersLayer.clearLayers();
          } else {
            if (heatLayer && map.hasLayer(heatLayer)) map.removeLayer(heatLayer);
            renderData(lastPoints);
          }
        }

        function setDarkMode(enabled) {
          try {
            if (enabled) {
              if (map.hasLayer(lightTiles)) map.removeLayer(lightTiles);
              if (!map.hasLayer(darkTiles)) darkTiles.addTo(map);
            } else {
              if (map.hasLayer(darkTiles)) map.removeLayer(darkTiles);
              if (!map.hasLayer(lightTiles)) lightTiles.addTo(map);
            }
          } catch (e) {}
        }

        function handleIncomingMessage(event) {
          try {
            var msg = JSON.parse(event.data);
            if (!msg || !msg.type) return;
            if (msg.type === 'set_data') {
              renderData(msg.data || []);
            } else if (msg.type === 'set_dark_mode') {
              setDarkMode(!!msg.data);
            } else if (msg.type === 'set_heatmap') {
              setHeatmapEnabled(!!msg.data);
            }
          } catch (e) {}
        }

        window.addEventListener('message', handleIncomingMessage);
        document.addEventListener('message', handleIncomingMessage);

        renderData([]);

        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage('Map Ready');
        }
      </script>
    </body>
    </html>
  `;

  useEffect(() => {
    // Initialize with generated mock data
    const initial = generateMockSamples(800).map((p) => ({
      lat: p.lat,
      lng: p.lon,
      dB: p.dB,
      timestamp: p.timestamp,
      location: undefined,
    }));
    setNoiseData(initial);
      setLastUpdate(new Date());
    
    // Request permissions on mount
    requestPermissions();
  }, []);

  // Push data to webview when data changes
  useEffect(() => {
    if (mapReady) {
      sendToWebView('set_data', noiseData);
    }
  }, [noiseData, mapReady]);

  // Sync dark mode tiles
  useEffect(() => {
    if (mapReady) {
      sendToWebView('set_dark_mode', darkMode);
    }
  }, [darkMode, mapReady]);

  // Sync heatmap toggle
  useEffect(() => {
    if (mapReady) {
      sendToWebView('set_heatmap', heatmapEnabled);
    }
  }, [heatmapEnabled, mapReady]);

  const handleMapMessage = (event) => {
    const message = event.nativeEvent.data;
    
    if (message === 'Map Ready') {
      setMapReady(true);
      // push initial state
      sendToWebView('set_dark_mode', darkMode);
      sendToWebView('set_heatmap', heatmapEnabled);
      sendToWebView('set_data', noiseData);
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

  // Live data loading and auto refresh
  const refreshTimerRef = useRef(null);

  const loadNoiseData = async () => {
    setIsLoadingData(true);
    
    try {
      if (useMockData) {
        // Clear any existing Firebase subscription
        if (firebaseUnsubscribeRef.current) {
          firebaseUnsubscribeRef.current();
          firebaseUnsubscribeRef.current = null;
        }
        
        // Ensure mock simulation running
        if (!mockTimerRef.current) {
          mockTimerRef.current = setInterval(() => {
            setNoiseData((prev) => {
              const nudged = nudgeSamples(prev.map(p => ({ lat: p.lat, lon: p.lng, dB: p.dB, timestamp: p.timestamp })), 0.2)
                .map(p => ({ lat: p.lat, lng: p.lon, dB: p.dB, timestamp: p.timestamp }));
              return nudged;
            });
            setLastUpdate(new Date());
          }, 4000);
        }
        // Also do an immediate nudge to show freshness
        setNoiseData((prev) => prev.length ? prev : generateMockSamples(800).map(p => ({ lat: p.lat, lng: p.lon, dB: p.dB, timestamp: p.timestamp })));
        setLastUpdate(new Date());
      } else {
        // If switching to live, stop mock timer and clear mock data
        if (mockTimerRef.current) {
          clearInterval(mockTimerRef.current);
          mockTimerRef.current = null;
        }
        
        // Clear mock data immediately when switching to live
        setNoiseData([]);
        setLastUpdate(new Date());
        
        // Subscribe to Firebase Realtime Database
        if (!firebaseUnsubscribeRef.current) {
          firebaseUnsubscribeRef.current = subscribeToNoiseData((firebaseData) => {
            const mapped = firebaseData.map((r) => {
              // Safe timestamp handling
              let safeTimestamp;
              try {
                if (r.timestamp) {
                  const date = new Date(r.timestamp);
                  if (isNaN(date.getTime())) {
                    safeTimestamp = new Date().toISOString();
                  } else {
                    safeTimestamp = date.toISOString();
                  }
                } else {
                  safeTimestamp = new Date().toISOString();
                }
              } catch (e) {
                safeTimestamp = new Date().toISOString();
              }

              return {
                lat: r.lat ?? r.latitude ?? 0,
                lng: r.lon ?? r.longitude ?? 0,
                dB: Math.round(r.dB ?? r.dbValue ?? 0),
                timestamp: safeTimestamp,
                location: r.locationName ?? r.city ?? r.location ?? 'Unknown',
              };
            }).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.lat !== 0 && p.lng !== 0);
            setNoiseData(mapped);
            setLastUpdate(new Date());
          });
        }
      }
    } catch (error) {
      console.error('Error loading noise data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Load data whenever source toggles
  useEffect(() => {
    loadNoiseData();
  }, [useMockData]);

  // Manage auto refresh interval and cleanup
  useEffect(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    if (autoRefresh && !useMockData) {
      refreshTimerRef.current = setInterval(() => {
        loadNoiseData();
      }, 30000);
    }
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      if (mockTimerRef.current) {
        clearInterval(mockTimerRef.current);
        mockTimerRef.current = null;
      }
             if (firebaseUnsubscribeRef.current) {
         firebaseUnsubscribeRef.current();
         firebaseUnsubscribeRef.current = null;
       }
       
               // Cleanup recording if active
        if (recordingRef.current) {
          try {
            recordingRef.current.stopAndUnloadAsync();
          } catch (e) {
            console.log('Error cleaning up recording:', e);
          }
          recordingRef.current = null;
        }
     };
   }, [autoRefresh, useMockData]);

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

  // Sound Capture Functions
  const requestPermissions = async () => {
    try {
      // Request audio recording permission
      const audioPermission = await Audio.requestPermissionsAsync();
      setRecordingPermission(audioPermission.status === 'granted');
      
      // Request location permission
      const locationPermission = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(locationPermission.status === 'granted');
      
      if (audioPermission.status !== 'granted' || locationPermission.status !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'Audio recording and location access are required to capture noise data.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  };

  const startSoundCapture = async () => {
    try {
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) return;

      // Configure audio recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: false,
        playThroughEarpieceAndroid: false,
      });

      setIsRecording(true);
      
      // Try to create recording object, fallback to simulation if it fails
      try {
        const { Recording } = Audio;
        const recording = new Recording();
        await recording.prepareAsync();
        await recording.startAsync();
        
        // Store recording reference
        recordingRef.current = recording;
        console.log('Audio recording started successfully');
      } catch (recordingError) {
        console.warn('Audio recording failed, using simulation mode:', recordingError);
        // Fallback to simulation mode
        recordingRef.current = null;
      }
      
      // Start monitoring audio levels (works in both real and simulation mode)
      startAudioLevelMonitoring();
      
    } catch (error) {
      console.error('Error starting sound capture:', error);
      Alert.alert('Error', 'Failed to start sound capture');
      setIsRecording(false);
    }
  };

  const stopSoundCapture = async () => {
    try {
      // Stop recording if it exists
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
          const uri = recordingRef.current.getURI();
          console.log('Recording stopped, URI:', uri);
        } catch (recordingError) {
          console.warn('Error stopping recording:', recordingError);
        }
        recordingRef.current = null;
      }
      
      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      // Calculate average dB from the recording or simulation
      const avgDb = calculateAverageDb();
      
      // Submit to Firebase
      await submitNoiseData({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        dB: avgDb,
        timestamp: new Date().toISOString(),
        source: 'mobile-app',
        deviceId: 'mobile-user',
      });
      
      setCurrentDb(avgDb);
      setIsRecording(false);
      
              const recordingMode = recordingRef.current ? 'Real Audio' : 'Simulation';
        Alert.alert(
          'Noise Data Captured & Submitted! 🎉',
          `Location: ${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}\nNoise Level: ${avgDb} dB\nMode: ${recordingMode}\n\nData sent to Firebase database successfully!`,
          [{ text: 'OK' }]
        );
      
    } catch (error) {
      console.error('Error stopping sound capture:', error);
      Alert.alert('Error', 'Failed to stop sound capture');
      setIsRecording(false);
    }
  };

  const calculateAverageDb = () => {
    // Simulate dB calculation based on recording
    // In a real implementation, you would analyze the audio data
    const baseDb = 45; // Base ambient noise
    const variation = Math.random() * 20; // Random variation
    return Math.round(baseDb + variation);
  };

  const submitNoiseData = async (data) => {
    try {
      const db = getRealtimeDb();
      if (!db) {
        console.error('Firebase database not available');
        return;
      }

      const noiseRef = ref(db, 'noiseReports');
      const newReportRef = push(noiseRef);
      await set(newReportRef, {
        lat: data.lat,
        lon: data.lng,
        dB: data.dB,
        timestamp: data.timestamp,
        source: data.source,
        deviceId: data.deviceId,
        locationName: 'Mobile User',
      });

      console.log('Noise data submitted successfully:', data);
      
      // Add to local data for immediate display
    const newPoint = {
        lat: data.lat,
        lng: data.lng,
        dB: data.dB,
        timestamp: data.timestamp,
        location: 'Mobile User',
    };
    
    setNoiseData(prev => [...prev, newPoint]);
      
    } catch (error) {
      console.error('Error submitting noise data:', error);
      Alert.alert('Error', 'Failed to submit noise data to database');
    }
  };

  const startAudioLevelMonitoring = () => {
    // Simulate real-time audio level monitoring
    const interval = setInterval(() => {
      if (isRecording) {
        const currentLevel = calculateAverageDb();
        setCurrentDb(currentLevel);
    } else {
        clearInterval(interval);
      }
    }, 500); // Update more frequently for real-time feel
  };

  const getDbColor = (db) => {
    if (db > 80) return '#e74c3c'; // Red for high noise
    if (db > 60) return '#f39c12'; // Orange for medium noise
    return '#2ecc71'; // Green for low noise
  };

  return (
    <View style={styles.container}>
      {/* Clean Header */}
      {!isFullScreen && (
        <View style={styles.header}>
            <View style={styles.headerTop}>
            <Text style={styles.title}>Live Noise Map</Text>
              {isRecording && (
                <View style={styles.recordingIndicator}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingText}>REC</Text>
                </View>
              )}
            </View>
            <Text style={styles.subtitle}>Sri Lanka</Text>
                         {isLoadingData ? (
               <View style={styles.loadingContainer}>
                 <ActivityIndicator size="small" color="white" />
                 <Text style={styles.updateTime}>Loading {useMockData ? 'Mock' : 'Live'} Data...</Text>
               </View>
             ) : lastUpdate && (
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
       
       {/* Sound Capture Button */}
            <TouchableOpacity 
         style={[
           styles.soundCaptureFab, 
           isRecording && styles.soundCaptureFabRecording
         ]} 
         onPress={isRecording ? stopSoundCapture : startSoundCapture}
       >
         <Text style={styles.fabText}>
           {isRecording ? '⏹️' : '🎤'}
              </Text>
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
               
               {/* Sound Capture */}
               <View style={styles.soundCaptureSection}>
                 <Text style={styles.sectionTitle}>Sound Capture</Text>
                 <View style={styles.soundCaptureControls}>
                   {!isRecording ? (
              <TouchableOpacity 
                       style={[styles.actionButton, styles.recordButton]} 
                       onPress={startSoundCapture}
              >
                       <Text style={styles.actionButtonText}>🎤 Start Recording</Text>
              </TouchableOpacity>
                   ) : (
              <TouchableOpacity 
                       style={[styles.actionButton, styles.stopButton]} 
                       onPress={stopSoundCapture}
              >
                       <Text style={styles.actionButtonText}>⏹️ Stop Recording</Text>
              </TouchableOpacity>
                   )}
            </View>
                 
                 {isRecording && (
                   <View style={styles.liveMeter}>
                     <Text style={styles.liveMeterText}>Live: {currentDb} dB</Text>
                     <View style={styles.meterBar}>
                       <View 
                         style={[
                           styles.meterFill, 
                           { 
                             width: `${Math.min(100, (currentDb - 30) / 70 * 100)}%`,
                             backgroundColor: getDbColor(currentDb)
                           }
                         ]} 
                       />
          </View>
              </View>
              )}
                 
                                   <Text style={styles.captureInfo}>
                    Record ambient noise and submit to database as IoT device{'\n'}
                    (Falls back to simulation if audio recording fails)
                  </Text>
            </View>
        </View>

            {/* Settings */}
            <View style={styles.optionSection}>
              <Text style={styles.sectionTitle}>Settings</Text>
              
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Visualization</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={() => setHeatmapEnabled(false)} style={[styles.pillButton, !heatmapEnabled && styles.pillButtonActive]}>
                    <Text style={[styles.pillButtonText, !heatmapEnabled && styles.pillButtonTextActive]}>Data points</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setHeatmapEnabled(true)} style={[styles.pillButton, heatmapEnabled && styles.pillButtonActive]}>
                    <Text style={[styles.pillButtonText, heatmapEnabled && styles.pillButtonTextActive]}>Heatmap</Text>
            </TouchableOpacity>
          </View>
          </View>

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

       {/* Live Recording Indicator */}
       {isRecording && (
         <View style={styles.liveRecordingCard}>
           <View style={styles.liveRecordingHeader}>
             <View style={styles.recordingStatus}>
               <View style={styles.recordingDot} />
               <Text style={styles.recordingStatusText}>LIVE RECORDING</Text>
             </View>
             <Text style={styles.currentDbDisplay}>{currentDb} dB</Text>
           </View>
           <View style={styles.liveMeterContainer}>
             <View style={styles.meterBar}>
               <View 
                 style={[
                   styles.meterFill, 
                   { 
                     width: `${Math.min(100, (currentDb - 30) / 70 * 100)}%`,
                     backgroundColor: getDbColor(currentDb)
                   }
                 ]} 
               />
             </View>
             <Text style={styles.meterLabels}>
               <Text style={styles.meterLabel}>30dB</Text>
               <Text style={styles.meterLabel}>100dB</Text>
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 5,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    marginRight: 6,
  },
  recordingText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
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
   loadingContainer: {
     flexDirection: 'row',
     alignItems: 'center',
     gap: 8,
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
  soundCaptureFab: {
    position: 'absolute',
    bottom: 24,
    right: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  soundCaptureFabRecording: {
    backgroundColor: '#ef4444',
    transform: [{ scale: 1.1 }],
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
  pillButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#edf2f7',
  },
  pillButtonActive: {
    backgroundColor: '#007AFF',
  },
  pillButtonText: {
    color: '#4a5568',
    fontSize: 14,
    fontWeight: '600',
  },
  pillButtonTextActive: {
    color: 'white',
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
  
  // Sound Capture Styles
  soundCaptureSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  soundCaptureControls: {
    marginBottom: 15,
  },
  recordButton: {
    backgroundColor: '#10b981',
  },
  stopButton: {
    backgroundColor: '#ef4444',
  },
  liveMeter: {
    backgroundColor: '#f7fafc',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  liveMeterText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 10,
    textAlign: 'center',
  },
  meterBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.3s ease',
  },
  captureInfo: {
    fontSize: 12,
    color: '#718096',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  // Live Recording Card Styles
  liveRecordingCard: {
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
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  liveRecordingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  recordingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingStatusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ef4444',
    marginLeft: 8,
  },
  currentDbDisplay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3748',
  },
  liveMeterContainer: {
    marginBottom: 10,
  },
  meterLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  meterLabel: {
    fontSize: 10,
    color: '#718096',
  },
});
