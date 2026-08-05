import React, { useRef, useEffect, useState } from 'react';
import { Platform, View, Text } from 'react-native';
import { WebView } from 'react-native-webview';

type LiveTrackingMapProps = {
  userLat: number;
  userLng: number;
  providerLat?: number;
  providerLng?: number;
};

function buildInitialHtml(userLat: number, userLng: number, providerLat?: number, providerLng?: number): string {
  const hasProvider = providerLat !== undefined && providerLng !== undefined;
  
  // Calculate center. If both present, use midpoint. Otherwise use user.
  let centerLat = userLat;
  let centerLng = userLng;
  if (hasProvider) {
    centerLat = (userLat + providerLat!) / 2;
    centerLng = (userLng + providerLng!) / 2;
  }

  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><style>html,body,#map{margin:0;padding:0;width:100%;height:100%;}</style></head><body><div id="map"></div><script>
var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([${centerLat},${centerLng}],14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);

// User icon
var userIcon = L.divIcon({
  className: 'custom-div-icon',
  html: "<div style='background-color:#111827; width:24px; height:24px; border-radius:50%; border:3px solid #ea580c; display:flex; align-items:center; justify-content:center;'><svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='#ea580c' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><path d='M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z'/><circle cx='12' cy='10' r='3'/></svg></div>",
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});
var userMarker = L.marker([${userLat},${userLng}], {icon: userIcon}).addTo(map);

var providerIcon = L.divIcon({
  className: 'custom-div-icon',
  html: "<div style='background-color:#ea580c; width:24px; height:24px; border-radius:50%; border:3px solid #fff; box-shadow:0 2px 4px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center;'><svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='#fff' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><path d='M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'/><circle cx='12' cy='7' r='4'/></svg></div>",
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});
var providerMarker = null;
var polyline = null;

${hasProvider ? `
providerMarker = L.marker([${providerLat},${providerLng}], {icon: providerIcon}).addTo(map);
polyline = L.polyline([[${userLat}, ${userLng}], [${providerLat}, ${providerLng}]], {color: '#ea580c', weight: 4, dashArray: '8, 8'}).addTo(map);
map.fitBounds(polyline.getBounds(), {padding: [40, 40], maxZoom: 16});
` : ''}

function updateProviderLocation(lat, lng, uLat, uLng) {
  if (providerMarker) {
    const startPos = providerMarker.getLatLng();
    const endPos = L.latLng(lat, lng);
    let startTime = null;
    const duration = 1000;
    
    function animate(timestamp) {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const currentLat = startPos.lat + (endPos.lat - startPos.lat) * progress;
      const currentLng = startPos.lng + (endPos.lng - startPos.lng) * progress;
      
      providerMarker.setLatLng([currentLat, currentLng]);
      if (polyline) {
        polyline.setLatLngs([[uLat, uLng], [currentLat, currentLng]]);
      }
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }
    requestAnimationFrame(animate);
  } else {
    providerMarker = L.marker([lat, lng], {icon: providerIcon}).addTo(map);
    polyline = L.polyline([[uLat, uLng], [lat, lng]], {color: '#ea580c', weight: 4, dashArray: '8, 8'}).addTo(map);
    map.fitBounds(polyline.getBounds(), {padding: [40, 40], maxZoom: 16});
  }
}

window.addEventListener('message', function(event) {
  try {
    var data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    if (data.type === 'updateLocation') {
      updateProviderLocation(data.providerLat, data.providerLng, data.userLat, data.userLng);
    }
  } catch (e) {}
});
</script></body></html>`;
}

export function LiveTrackingMap({ userLat, userLng, providerLat, providerLng }: LiveTrackingMapProps) {
  const webViewRef = useRef<WebView>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const [initialHtml] = useState(() => buildInitialHtml(userLat, userLng, providerLat, providerLng));

  useEffect(() => {
    if (providerLat !== undefined && providerLng !== undefined) {
      const msgData = JSON.stringify({
        type: 'updateLocation',
        providerLat,
        providerLng,
        userLat,
        userLng
      });

      if (Platform.OS === 'web' && iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(msgData, '*');
      } else if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          try {
            window.dispatchEvent(new MessageEvent('message', {
              data: ${JSON.stringify(msgData)}
            }));
          } catch(e) {}
          true;
        `);
      }
    }
  }, [providerLat, providerLng, userLat, userLng]);

  if (Platform.OS === 'web') {
    return (
      <iframe
        ref={iframeRef}
        srcDoc={initialHtml}
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    );
  }

  return (
    <WebView
      ref={webViewRef}
      source={{ html: initialHtml }}
      style={{ flex: 1 }}
      javaScriptEnabled={true}
      scrollEnabled={false}
    />
  );
}
