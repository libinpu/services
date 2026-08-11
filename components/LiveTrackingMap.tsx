import React, { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { WebView } from 'react-native-webview';

type LiveTrackingMapProps = {
  userLat: number;
  userLng: number;
  providerLat?: number;
  providerLng?: number;
};

function buildMapHtml(userLat: number, userLng: number, providerLat?: number, providerLng?: number): string {
  const hasProvider = Number.isFinite(providerLat) && Number.isFinite(providerLng);
  const initialProviderLat = hasProvider ? providerLat : null;
  const initialProviderLng = hasProvider ? providerLng : null;

  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><style>html,body,#map{margin:0;width:100%;height:100%;background:#f3f4f6}.leaflet-control-attribution{display:none}</style></head><body><div id="map"></div><script>
var userLat=${userLat}, userLng=${userLng};
var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([userLat,userLng],16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
var userIcon=L.divIcon({className:'',html:"<div style='width:28px;height:28px;border-radius:50%;background:#111827;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center'><span style='width:8px;height:8px;border-radius:50%;background:#fff'></span></div>",iconSize:[28,28],iconAnchor:[14,14]});
var providerIcon=L.divIcon({className:'',html:"<div style='width:30px;height:30px;border-radius:50%;background:#ea580c;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center'><span style='color:#fff;font-size:15px;font-family:Arial'>●</span></div>",iconSize:[30,30],iconAnchor:[15,15]});
L.marker([userLat,userLng],{icon:userIcon}).addTo(map).bindTooltip('Your location',{permanent:true,direction:'top',offset:[0,-14]});
var providerMarker=null, routeLine=null;
function focusRoute(lat,lng){
  if(lat==null||lng==null){map.setView([userLat,userLng],16);return;}
  var bounds=L.latLngBounds([[userLat,userLng],[lat,lng]]);
  if(Math.max(Math.abs(lat-userLat),Math.abs(lng-userLng))<0.002){map.setView(bounds.getCenter(),16);return;}
  map.fitBounds(bounds,{padding:[32,32],maxZoom:16,animate:true});
}
function setProvider(lat,lng){
  if(providerMarker){providerMarker.setLatLng([lat,lng]);}else{providerMarker=L.marker([lat,lng],{icon:providerIcon}).addTo(map).bindTooltip('Professional',{permanent:true,direction:'top',offset:[0,-15]});}
  if(routeLine){routeLine.setLatLngs([[userLat,userLng],[lat,lng]]);}else{routeLine=L.polyline([[userLat,userLng],[lat,lng]],{color:'#ea580c',weight:4,opacity:.9,dashArray:'8 8'}).addTo(map);}
  focusRoute(lat,lng);
}
if(${hasProvider ? 'true' : 'false'})setProvider(${initialProviderLat},${initialProviderLng});else focusRoute(null,null);
window.addEventListener('message',function(event){try{var data=typeof event.data==='string'?JSON.parse(event.data):event.data;if(data.type==='updateLocation'&&Number.isFinite(data.providerLat)&&Number.isFinite(data.providerLng)){setProvider(data.providerLat,data.providerLng);}}catch(e){}});
setTimeout(function(){map.invalidateSize();focusRoute(${initialProviderLat},${initialProviderLng});},150);
</script></body></html>`;
}

export function LiveTrackingMap({ userLat, userLng, providerLat, providerLng }: LiveTrackingMapProps) {
  const webViewRef = useRef<WebView>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [html] = useState(() => buildMapHtml(userLat, userLng, providerLat, providerLng));

  useEffect(() => {
    if (!Number.isFinite(providerLat) || !Number.isFinite(providerLng)) return;
    const message = JSON.stringify({ type: 'updateLocation', providerLat, providerLng });
    if (Platform.OS === 'web') {
      iframeRef.current?.contentWindow?.postMessage(message, '*');
    } else {
      webViewRef.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(message)}}));true;`);
    }
  }, [providerLat, providerLng]);

  if (Platform.OS === 'web') {
    return <iframe ref={iframeRef} srcDoc={html} style={{ width: '100%', height: '100%', border: 'none' }} />;
  }

  return <WebView ref={webViewRef} source={{ html }} style={{ flex: 1 }} javaScriptEnabled scrollEnabled={false} />;
}