import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.heat';

export default function MapView({ heatData }) {
  const mapRef = useRef(null);
  const heatLayerRef = useRef(null);

  const defaultCenter = useMemo(() => ({ lat: 7.8731, lng: 80.7718 }), []); // Sri Lanka center

  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map('map', {
      center: [defaultCenter.lat, defaultCenter.lng],
      zoom: 7,
      zoomControl: true,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    heatLayerRef.current = L.heatLayer([], {
      radius: 25,
      blur: 15,
      maxZoom: 17,
    }).addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      heatLayerRef.current = null;
    };
  }, [defaultCenter]);

  useEffect(() => {
    if (!heatLayerRef.current) return;
    const points = (heatData ?? []).map((p) => [p.lat, p.lon, p.intensity]);
    heatLayerRef.current.setLatLngs(points);
  }, [heatData]);

  return (
    <div id="map" className="w-full h-full" />
  );
}
