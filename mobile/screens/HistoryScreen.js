import React, { useEffect, useState } from 'react';
import { View, Text, Dimensions, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { api } from '../services/api';

function groupByDay(readings) {
  const dayMap = new Map();
  for (const r of readings) {
    const d = new Date(r.timestamp);
    const key = d.toISOString().slice(0, 10);
    if (!dayMap.has(key)) dayMap.set(key, []);
    dayMap.get(key).push(r.dB);
  }
  const labels = Array.from(dayMap.keys()).sort();
  const data = labels.map((k) => {
    const arr = dayMap.get(k);
    return arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length);
  });
  return { labels, data };
}

export default function HistoryScreen() {
  const [series, setSeries] = useState({ labels: [], data: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const readings = await api.getUserNoiseHistory();
        if (!mounted) return;
        setSeries(groupByDay(readings));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Failed to load history', e);
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const chartWidth = Dimensions.get('window').width - 24;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Your Noise History</Text>
      {loading ? (
        <ActivityIndicator />
      ) : series.labels.length === 0 ? (
        <Text style={styles.hint}>No history available yet.</Text>
      ) : (
        <LineChart
          width={chartWidth}
          height={220}
          data={{ labels: series.labels, datasets: [{ data: series.data }] }}
          chartConfig={{
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
            labelColor: () => '#64748b',
            propsForDots: { r: '3' },
          }}
          bezier
          style={{ borderRadius: 12 }}
        />
      )}
      <Text style={styles.hint}>Daily average dB per day based on your submissions.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, gap: 12 },
  title: { fontSize: 18, fontWeight: '600' },
  hint: { color: '#64748b', marginTop: 8 },
});
