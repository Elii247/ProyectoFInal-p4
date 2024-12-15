document.addEventListener('DOMContentLoaded', function() {
    // Asegurarse de que la librería Leaflet está cargada antes de inicializar el mapa
    if (typeof L !== 'undefined') {
        initMap(); // Inicializar el mapa
    } else {
        console.error('Leaflet library not loaded'); // Error si Leaflet no está disponible
    }

    function initMap() {
        // Crear contenedor del mapa si no existe
        if (!document.getElementById('map')) {
            const mapContainer = document.createElement('div'); // Crear elemento div para el mapa
            mapContainer.id = 'map'; // Asignar ID al contenedor
            mapContainer.style.height = '100vh'; // Asignar altura
            mapContainer.style.width = '100%'; // Asignar ancho
            document.body.appendChild(mapContainer); // Agregar contenedor al cuerpo del documento
        }

        // Inicializar el mapa centrado en coordenadas específicas (Ciudad de Panamá)
        const map = L.map('map').setView([8.983333, -79.516667], 12);

        // Añadir capa de mosaicos (tiles) al mapa usando OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Cargar pings existentes desde el servidor
        loadPings(map);

        // Evento para añadir un nuevo ping al hacer clic en el mapa
        map.on('click', function(e) {
            const info = prompt("Ingrese información para este ping:"); // Solicitar información al usuario
            if (info !== null && info.trim() !== "") {
                addNewPing(map, e.latlng.lat, e.latlng.lng, info); // Agregar el ping al mapa
            }
        });

        // Almacenar el mapa en la ventana global para acceso global si es necesario
        window.map = map;
    }

    function loadPings(map) {
        // Solicitar pings existentes al servidor
        fetch('/get_pings')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error en la carga de pings'); // Error si la respuesta no es exitosa
                }
                return response.json();
            })
            .then(data => {
                // Añadir cada ping al mapa
                data.forEach(ping => {
                    addPingToMap(map, ping._id, ping.lat, ping.lng, ping.info);
                });
            })
            .catch(error => {
                console.error('Error cargando pings:', error); // Error en caso de fallo
                window.location.href = '/login'; // Redirigir al login si falla la autenticación
            });
    }

    function addPingToMap(map, id, lat, lng, info) {
        // Crear marcador en el mapa con las coordenadas y la información proporcionada
        const marker = L.marker([lat, lng])
            .addTo(map)
            .bindPopup(`
                <div>
                    <p>${info}</p>
                    <button onclick="deletePingFromMap('${id}')">Eliminar</button>
                    <button onclick="editPing('${id}', '${info}')">Editar</button>
                </div>
            `);

        // Almacenar el marcador en una estructura global para referencia futura
        if (!window.markers) window.markers = new Map();
        window.markers.set(id, marker);
    }

    function addNewPing(map, lat, lng, info) {
        // Enviar datos del nuevo ping al servidor
        fetch('/add_ping', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ lat, lng, info }) // Convertir los datos a JSON
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    addPingToMap(map, data.id, lat, lng, info); // Añadir el ping al mapa si la respuesta es exitosa
                }
            })
            .catch(error => {
                console.error('Error agregando ping:', error); // Error en caso de fallo
            });
    }

    // Función global para eliminar un ping del mapa
    window.deletePingFromMap = function(id) {
        fetch(`/delete_ping/${id}`, {
            method: 'DELETE'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const markers = window.markers;
                    const marker = markers.get(id);
                    if (marker) {
                        window.map.removeLayer(marker); // Eliminar marcador del mapa
                        markers.delete(id); // Eliminar marcador de la referencia global
                    }
                }
            })
            .catch(error => {
                console.error('Error eliminando ping:', error); // Error en caso de fallo
            });
    }

    // Función global para editar la información de un ping
    window.editPing = function(id, currentInfo) {
        const newInfo = prompt("Edite la información del ping:", currentInfo); // Solicitar nueva información al usuario
        if (newInfo !== null && newInfo.trim() !== "") {
            const marker = window.markers.get(id); // Obtener el marcador actual
            const [lat, lng] = marker.getLatLng(); // Obtener coordenadas del marcador

            // Enviar datos actualizados al servidor
            fetch(`/update_ping/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ lat, lng, info: newInfo }) // Convertir los datos a JSON
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Actualizar el popup del marcador con la nueva información
                        marker.bindPopup(`
                        <div>
                            <p>${newInfo}</p>
                            <button onclick="deletePingFromMap('${id}')">Eliminar</button>
                            <button onclick="editPing('${id}', '${newInfo}')">Editar</button>
                        </div>
                    `).openPopup();
                    }
                })
                .catch(error => {
                    console.error('Error editando ping:', error); // Error en caso de fallo
                });
        }
    }
});
