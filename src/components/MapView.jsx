import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.heat';

export default function MapView({ heatData }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const heatLayerRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const rafRef = useRef(0);
  const timeoutsRef = useRef([]);
  const mountedRef = useRef(false);

  const defaultCenter = useMemo(() => ({ lat: 7.8731, lng: 80.7718 }), []); // Sri Lanka center

  useEffect(() => {
    mountedRef.current = true;
    if (mapRef.current) return () => { mountedRef.current = false; };

    const container = containerRef.current;
    if (!container) return () => { mountedRef.current = false; };

    // Fallback inline size in case CSS hasn't applied yet
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.minHeight = '400px';
    container.style.background = '#e5e7eb';

    const refreshSize = () => {
      const map = mapRef.current;
      const el = containerRef.current;
      if (!mountedRef.current || !map || !el || !el.isConnected) return;
      if (!map._loaded || !map._mapPane) return;
      map.invalidateSize();
    };

    const scheduleRefreshes = () => {
      rafRef.current = requestAnimationFrame(refreshSize);
      timeoutsRef.current.push(setTimeout(refreshSize, 80));
      timeoutsRef.current.push(setTimeout(refreshSize, 200));
    };

    const init = () => {
      if (!mountedRef.current || mapRef.current || !container) return;
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

      map.whenReady(() => {
        if (!mountedRef.current || !mapRef.current) return;
        scheduleRefreshes();
        requestAnimationFrame(() => {
          if (!mountedRef.current) return;
          const m = mapRef.current;
          const panes = m && m.getPanes ? m.getPanes() : null;
          const hasOverlayPane = panes && panes.overlayPane;
          if (!m || !hasOverlayPane || heatLayerRef.current) return;
          heatLayerRef.current = L.heatLayer([], {
            radius: 26,
            blur: 22,
            maxZoom: 17,
            max: 0.8,
            minOpacity: 0.25,
            gradient: {
              0.0: '#00ff7f', // green
              0.4: '#ffd700', // yellow
              0.7: '#ff8c00', // orange
              0.9: '#ff4500', // orange-red
              1.0: '#ff0000', // red
            },
          }).addTo(m);
        });
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
      mountedRef.current = false;
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      cancelAnimationFrame(rafRef.current);
      timeoutsRef.current.forEach((id) => clearTimeout(id));
      timeoutsRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      heatLayerRef.current = null;
    };
  }, [defaultCenter]);

  useEffect(() => {
    const layer = heatLayerRef.current;
    const map = mapRef.current;
    if (!mountedRef.current || !layer || !map) return;
    if (!layer._map) return; // not added yet
    const points = (heatData ?? []).map((p) => [p.lat, p.lon, p.intensity]);
    layer.setLatLngs(points);
    layer.redraw();
  }, [heatData]);

  useEffect(() => {
    const map = mapRef.current;
    const container = containerRef.current;
    if (!map || !container || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      if (!mountedRef.current || !mapRef.current) return;
      map.invalidateSize();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} />
  );
}
