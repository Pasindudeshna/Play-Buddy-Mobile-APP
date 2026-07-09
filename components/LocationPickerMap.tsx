import * as React from "react";
import { StyleSheet } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

type Coords = { latitude: number; longitude: number };

type LocationPickerMapProps = {
  initialRegion: Coords;
  onPinChange: (coords: Coords) => void;
};

function buildHtml({ latitude, longitude }: Coords) {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>html, body, #map { height: 100%; margin: 0; padding: 0; }</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map').setView([${latitude}, ${longitude}], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  var marker = L.marker([${latitude}, ${longitude}], { draggable: true }).addTo(map);

  function post(latlng) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ latitude: latlng.lat, longitude: latlng.lng }));
  }

  marker.on('dragend', function (e) { post(e.target.getLatLng()); });
  map.on('click', function (e) {
    marker.setLatLng(e.latlng);
    post(e.latlng);
  });
</script>
</body>
</html>`;
}

export default function LocationPickerMap({ initialRegion, onPinChange }: LocationPickerMapProps) {
  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      onPinChange({ latitude: data.latitude, longitude: data.longitude });
    } catch {
      // ignore malformed messages
    }
  };

  return (
    <WebView
      style={StyleSheet.absoluteFillObject}
      originWhitelist={["*"]}
      source={{ html: buildHtml(initialRegion) }}
      onMessage={handleMessage}
    />
  );
}
