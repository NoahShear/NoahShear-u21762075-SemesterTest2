const map = L.map('map', { preferCanvas: true }).setView([-25.754, 28.231], 16);

const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

function showPopup(feature, layer) {
  let html = '<table class="popup-table">';
  for (const key in feature.properties) {
    const v = feature.properties[key];
    html += `<tr><th>${key}</th><td>${v === null || v === '' ? 'N/A' : v}</td></tr>`;
  }
  layer.bindPopup(html + '</table>');
}

function loadLayer(url, options, afterLoad) {
  const layer = L.geoJSON(null, Object.assign({
    onEachFeature: showPopup,
    filter: f => f.geometry && f.geometry.coordinates.length > 0 
  }, options));
  fetch(url)
    .then(r => r.json())
    .then(data => { layer.addData(data); if (afterLoad) afterLoad(layer); })
    .catch(err => console.error('Could not load ' + url, err));
  return layer;
}

const campusLayer = loadLayer('data/campus.geojson',
  { style: { color: '#000000', weight: 3, fill: false } },
  layer => map.fitBounds(layer.getBounds()));

function floorColour(f) {
  return f >= 20 ? '#6e1f1a' : f === 4 ? '#b4531f'
       : f === 3 ? '#e08a2c' : f === 2 ? '#f6c453' : '#fde7a8';
}

const buildingsLayer = loadLayer('data/footprints.geojson', {
  style: f => ({ color: '#1f3a2e', weight: 1.5, fillColor: floorColour(f.properties.Floors), fillOpacity: 0.8 }),
  onEachFeature: showPopup        
});

const pathwayLayer = loadLayer('data/pathway.geojson', { style: { color: '#8a6d3b', weight: 2.5 } });

const trafficPoint = colour => (f, latlng) =>
  L.circleMarker(latlng, { radius: 3.5, color: colour, weight: 0.5, fillColor: colour, fillOpacity: 0.7 });
const trafficAM  = loadLayer('data/traffic_am.geojson',  { pointToLayer: trafficPoint('#2e7d32') });
const trafficMid = loadLayer('data/traffic_mid.geojson', { pointToLayer: trafficPoint('#f9a825') });
const trafficPM  = loadLayer('data/traffic_pm.geojson',  { pointToLayer: trafficPoint('#c62828') });

const bathroomLayer = loadLayer('data/bathroom.geojson', {
  pointToLayer: (f, latlng) => L.circleMarker(latlng,
    { radius: 8, color: '#fff', weight: 2, fillColor: '#1e78c8', fillOpacity: 1 })
});

const eateryLayer = loadLayer('data/eatery.geojson', {
  pointToLayer: (f, latlng) => L.circleMarker(latlng,
    { radius: 8, color: '#fff', weight: 2, fillColor: '#d9472b', fillOpacity: 1 })
});

[campusLayer, buildingsLayer, pathwayLayer, bathroomLayer, eateryLayer, trafficAM, trafficMid, trafficPM].forEach(l => l.addTo(map));

L.control.layers(
  null,
  { 'Campus boundary': campusLayer,
    'Building footprints': buildingsLayer,
    'Pathways': pathwayLayer,
    'Traffic - morning': trafficAM,
    'Traffic - midday': trafficMid,
    'Traffic - afternoon': trafficPM,
    'Bathrooms': bathroomLayer,
    'Eateries': eateryLayer },
  { collapsed: false }
).addTo(map);

const legend = L.control({ position: 'bottomright' });
legend.onAdd = () => {
  const div = L.DomUtil.create('div', 'legend');
  div.innerHTML = '<strong>Floors</strong>' +
    [[1, '1'], [2, '2'], [3, '3'], [4, '4'], [20, '20'], [null, 'Unknown']]
      .map(([v, t]) => `<div><i style="background:${floorColour(v)}"></i>${t}</div>`).join('');
  return div;
};
legend.addTo(map);

document.getElementById('searchForm').addEventListener('submit', e => {
  e.preventDefault();
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  let found = null;
  [buildingsLayer, eateryLayer].forEach(group => group.eachLayer(l => {
    const name = (l.feature.properties.Name || '').toLowerCase();
    if (!found && name.includes(q)) found = l;
  }));
  if (!found) return alert('No building or eatery found for "' + q + '"');
  if (found.getBounds) map.fitBounds(found.getBounds(), { maxZoom: 19 });
  else map.setView(found.getLatLng(), 19);
  found.openPopup();
});
