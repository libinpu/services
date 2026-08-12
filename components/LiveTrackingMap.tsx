import React, { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { WebView } from 'react-native-webview';

import { TRACKING_CONFIG } from '@/lib/tracking-config';

type LiveTrackingMapProps = {
  userLat: number;
  userLng: number;
  providerLat?: number;
  providerLng?: number;
  providerHeading?: number | null;
  destinationLabel?: string;
  onEtaChange?: (info: { distanceMeters: number; durationSeconds: number | null; isRoadRoute: boolean }) => void;
};

const ROUTE_REFETCH_MS = TRACKING_CONFIG.ROUTE_REFRESH_INTERVAL_MS;
const ROUTE_REFETCH_DISTANCE_M = TRACKING_CONFIG.ROUTE_REFRESH_DISTANCE_M;
const MARKER_ANIMATION_MS = TRACKING_CONFIG.MARKER_ANIMATION_MS;

function buildMapHtml(userLat: number, userLng: number, providerLat?: number, providerLng?: number, providerHeading?: number | null, destinationLabel = 'Destination'): string {
  const hasProvider = Number.isFinite(providerLat) && Number.isFinite(providerLng);
  const initialLat = hasProvider ? providerLat : null;
  const initialLng = hasProvider ? providerLng : null;
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><style>html,body,#map{margin:0;width:100%;height:100%;background:#f3f4f6}.leaflet-control-attribution{display:none}</style></head><body><div id="map"></div><script>
var dLat=${userLat},dLng=${userLng},map=L.map('map',{zoomControl:false,attributionControl:false}).setView([dLat,dLng],16),routeLine=null,providerMarker=null,lastRouteAt=0,lastRouteFrom=null,hasFitted=false,animFrame=null;
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
var destIcon=L.divIcon({className:'',html:"<div style='width:28px;height:28px;border-radius:50%;background:#111827;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center'><span style='width:8px;height:8px;border-radius:50%;background:#fff'></span></div>",iconSize:[28,28],iconAnchor:[14,14]});
var providerIcon=function(h){return L.divIcon({className:'',html:"<div style='width:32px;height:32px;border-radius:50%;background:#ea580c;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center'><span style='color:#fff;font-size:17px;font-family:Arial;transform:rotate("+(Number.isFinite(h)?h:0)+"deg);display:block'>▲</span></div>",iconSize:[32,32],iconAnchor:[16,16]});};
L.marker([dLat,dLng],{icon:destIcon}).addTo(map).bindTooltip(${JSON.stringify(destinationLabel)},{permanent:true,direction:'top',offset:[0,-14]});
function distance(a,b,c,d){var R=6371000,r=function(x){return x*Math.PI/180},x=r(c-a),y=r(d-b),z=Math.sin(x/2)*Math.sin(x/2)+Math.cos(r(a))*Math.cos(r(c))*Math.sin(y/2)*Math.sin(y/2);return R*2*Math.atan2(Math.sqrt(z),Math.sqrt(1-z));}
function emit(data){var message=JSON.stringify(data);if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(message);else if(window.parent)window.parent.postMessage(message,'*');}
function fit(lat,lng){if(!hasFitted){map.fitBounds(L.latLngBounds([[dLat,dLng],[lat,lng]]),{padding:[32,32],maxZoom:16,animate:true});hasFitted=true;}}
function fallback(lat,lng){var points=[[lat,lng],[dLat,dLng]];if(routeLine&&!routeLine._road)routeLine.setLatLngs(points);else if(!routeLine){routeLine=L.polyline(points,{color:'#ea580c',weight:4,opacity:.9,dashArray:'8 8'}).addTo(map);routeLine._road=false;}emit({type:'eta',distanceMeters:distance(lat,lng,dLat,dLng),durationSeconds:null,isRoadRoute:false});}
function route(lat,lng){var now=Date.now(),moved=!lastRouteFrom||distance(lat,lng,lastRouteFrom[0],lastRouteFrom[1])>${ROUTE_REFETCH_DISTANCE_M};if(now-lastRouteAt<${ROUTE_REFETCH_MS}&&!moved)return;lastRouteAt=now;lastRouteFrom=[lat,lng];fetch('https://router.project-osrm.org/route/v1/driving/'+lng+','+lat+';'+dLng+','+dLat+'?overview=full&geometries=geojson').then(function(r){return r.json()}).then(function(result){var r=result&&result.routes&&result.routes[0],c=r&&r.geometry.coordinates;if(!c)return;if(routeLine)map.removeLayer(routeLine);routeLine=L.polyline(c.map(function(p){return[p[1],p[0]]}),{color:'#ea580c',weight:4,opacity:.9}).addTo(map);routeLine._road=true;emit({type:'eta',distanceMeters:r.distance,durationSeconds:r.duration,isRoadRoute:true});}).catch(function(){});}
function animate(marker,from,lat,lng,h){if(animFrame)cancelAnimationFrame(animFrame);var start=performance.now();function step(now){var t=Math.min(1,(now-start)/${MARKER_ANIMATION_MS}),e=t<.5?2*t*t:-1+(4-2*t)*t;marker.setLatLng([from.lat+(lat-from.lat)*e,from.lng+(lng-from.lng)*e]);if(t<1)animFrame=requestAnimationFrame(step);}marker.setIcon(providerIcon(h));animFrame=requestAnimationFrame(step);}
function setProvider(lat,lng,h){if(providerMarker)animate(providerMarker,providerMarker.getLatLng(),lat,lng,h);else providerMarker=L.marker([lat,lng],{icon:providerIcon(h)}).addTo(map).bindTooltip('Professional',{permanent:true,direction:'top',offset:[0,-15]});fallback(lat,lng);route(lat,lng);fit(lat,lng);}
if(${hasProvider ? 'true' : 'false'})setProvider(${initialLat},${initialLng},${Number.isFinite(providerHeading) ? providerHeading : 0});
window.addEventListener('message',function(e){try{var x=typeof e.data==='string'?JSON.parse(e.data):e.data;if(x.type==='updateLocation'&&Number.isFinite(x.providerLat)&&Number.isFinite(x.providerLng))setProvider(x.providerLat,x.providerLng,x.providerHeading)}catch(_){}});
setTimeout(function(){map.invalidateSize();if(${hasProvider ? 'true' : 'false'})fit(${initialLat},${initialLng});},150);
</script></body></html>`;
}

export function LiveTrackingMap({ userLat, userLng, providerLat, providerLng, providerHeading, destinationLabel, onEtaChange }: LiveTrackingMapProps) {
  const webViewRef = useRef<WebView>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [html] = useState(() => buildMapHtml(userLat, userLng, providerLat, providerLng, providerHeading, destinationLabel));
  useEffect(() => {
    if (!Number.isFinite(providerLat) || !Number.isFinite(providerLng)) return;
    const message = JSON.stringify({ type: 'updateLocation', providerLat, providerLng, providerHeading });
    if (Platform.OS === 'web') iframeRef.current?.contentWindow?.postMessage(message, '*');
    else webViewRef.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(message)}}));true;`);
  }, [providerLat, providerLng, providerHeading]);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (event: MessageEvent) => { try { const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; if (data?.type === 'eta') onEtaChange?.(data); } catch {} };
    window.addEventListener('message', handler); return () => window.removeEventListener('message', handler);
  }, [onEtaChange]);
  const onMessage = (event: { nativeEvent: { data: string } }) => { try { const data = JSON.parse(event.nativeEvent.data); if (data?.type === 'eta') onEtaChange?.(data); } catch {} };
  if (Platform.OS === 'web') return <iframe ref={iframeRef} srcDoc={html} style={{ width: '100%', height: '100%', border: 'none' }} />;
  return <WebView ref={webViewRef} source={{ html }} style={{ flex: 1 }} javaScriptEnabled scrollEnabled={false} onMessage={onMessage} />;
}
