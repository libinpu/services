import { Platform } from 'react-native';
import { WebView } from 'react-native-webview';

type MapWebViewProps = {
  lat: number;
  lng: number;
  onPinDrag: (lat: number, lng: number) => void;
};

function buildMapHtml(lat: number, lng: number): string {
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><style>html,body,#map{margin:0;padding:0;width:100%;height:100%;}</style></head><body><div id="map"></div><script>
var map=L.map('map',{zoomControl:true,attributionControl:false}).setView([${lat},${lng}],16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
var marker=L.marker([${lat},${lng}],{draggable:true}).addTo(map);
marker.on('dragend',function(e){var p=e.target.getLatLng();
var msg=JSON.stringify({lat:p.lat,lng:p.lng});
if(window.ReactNativeWebView&&window.ReactNativeWebView.postMessage){window.ReactNativeWebView.postMessage(msg);}
else{window.parent.postMessage(msg,'*');}});
</script></body></html>`;
}

export function MapWebView({ lat, lng, onPinDrag }: MapWebViewProps) {
  const html = buildMapHtml(lat, lng);

  if (Platform.OS === 'web') {
    return (
      <iframe
        srcDoc={html}
        style={{ width: '100%', height: '100%', border: 'none' }}
        onLoad={(e: any) => {
          const iframe = e.target as HTMLIFrameElement;
          window.addEventListener('message', (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data.lat && data.lng) onPinDrag(data.lat, data.lng);
            } catch {}
          });
        }}
      />
    );
  }

  return (
    <WebView
      source={{ html }}
      style={{ flex: 1 }}
      javaScriptEnabled={true}
      onMessage={(event: any) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          if (data.lat && data.lng) onPinDrag(data.lat, data.lng);
        } catch {}
      }}
    />
  );
}
