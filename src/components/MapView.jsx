import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.heat';

export default function MapView({ heatData }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const heatLayerRef = useRef(null);
  const resizeObserverRef = useRef(null);

  const defaultCenter = useMemo(() => ({ lat: 7.8731, lng: 80.7718 }), []); // Sri Lanka center

  useEffect(() => {
    if (mapRef.current) return;
    const container = containerRef.current;
    if (!container) return;

    // Fallback inline size in case CSS hasn't applied yet
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.minHeight = '400px';
    container.style.background = '#e5e7eb';

    const init = () => {
      if (mapRef.current || !container) return;
      const map = L.map(container, {
        center: [defaultCenter.lat, defaultCenter.lng],
        zoom: 7,
        zoomControl: true,
      });
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const refreshSize = () => {
        map.invalidateSize();
        map.setView([defaultCenter.lat, defaultCenter.lng], 7, { animate: false });
      };

      map.whenReady(() => {
        refreshSize();
        setTimeout(refreshSize, 0);
        setTimeout(refreshSize, 100);
        setTimeout(refreshSize, 300);
        heatLayerRef.current = L.heatLayer([], {
          radius: 25,
          blur: 20,
          maxZoom: 17,
          gradient: {
            0.0: '#00ff7f',
            0.5: '#ffd700',
            0.7: '#ff8c00',
            0.85: '#ff4500',
            1.0: '#ff0000',
          },
        }).addTo(map);
      });
    };

    const hasSize = container.clientWidth > 0 && container.clientHeight > 0;
    if (hasSize) {
      init();
    } else if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver((entries) => {
        for (const e of entries) {
          if (e.contentRect.width > 0 && e.contentRect.height > 0) {
            ro.disconnect();
            resizeObserverRef.current = null;
            init();
          }
        }
      });
      resizeObserverRef.current = ro;
      ro.observe(container);
    } else {
      requestAnimationFrame(() => {
        if (container.clientWidth > 0 && container.clientHeight > 0) init();
      });
    }

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      heatLayerRef.current = null;
    };
  }, [defaultCenter]);

  useEffect(() => {
    if (!heatLayerRef.current || !mapRef.current) return;
    const points = (heatData ?? []).map((p) => [p.lat, p.lon, p.intensity]);
    heatLayerRef.current.setLatLngs(points);
  }, [heatData]);

  useEffect(() => {
    const map = mapRef.current;
    const container = containerRef.current;
    if (!map || !container || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} />
  );
}
