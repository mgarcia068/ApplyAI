/**
 * Servicio reusable para conectarse a la API de Georef (Argentina)
 * Documentación oficial: https://datosgobar.github.io/georef-ar-api/
 */
class GeoAPI {
  constructor() {
    this.baseUrl = 'https://apis.datos.gob.ar/georef/api';
    this.timeout = null;
  }

  /**
   * Busca localidades (ciudades) que coincidan con el texto ingresado
   */
  async searchLocalidades(query) {
    if (!query || query.length < 3) return [];
    try {
      const response = await fetch(`${this.baseUrl}/localidades?nombre=${encodeURIComponent(query)}&max=10`);
      if (!response.ok) throw new Error('Error al conectar con Georef API');
      
      const data = await response.json();
      return data.localidades || [];
    } catch (error) {
      console.error('GeoAPI Error:', error);
      return [];
    }
  }

  /**
   * Configura el comportamiento de autocompletado en un input
   */
  setupAutocomplete(inputId) {
    const input = document.querySelector(inputId);
    if (!input) return;

    // Crear contenedor para la lista desplegable
    const wrapper = document.createElement('div');
    wrapper.className = 'autocomplete-wrapper';
    wrapper.style.position = 'relative';
    
    // Envolver el input
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    // Crear lista de resultados
    const list = document.createElement('ul');
    list.className = 'autocomplete-list';
    wrapper.appendChild(list);

    // Evento de escritura
    input.addEventListener('input', (e) => {
      clearTimeout(this.timeout);
      const query = e.target.value.trim();

      if (query.length < 3) {
        list.innerHTML = '';
        list.classList.remove('show');
        return;
      }

      // Mostrar cargando
      list.innerHTML = '<li class="autocomplete-item text-muted">Buscando...</li>';
      list.classList.add('show');

      this.timeout = setTimeout(async () => {
        const resultados = await this.searchLocalidades(query);
        
        list.innerHTML = '';
        
        if (resultados.length === 0) {
          list.innerHTML = '<li class="autocomplete-item text-muted">No se encontraron resultados</li>';
        } else {
          // Agregar opción estándar
          const liRemoto = document.createElement('li');
          liRemoto.className = 'autocomplete-item';
          liRemoto.innerHTML = `<strong>Remoto (Toda Argentina)</strong>`;
          liRemoto.addEventListener('mousedown', () => {
            input.value = 'Remoto (Toda Argentina)';
            list.classList.remove('show');
          });
          list.appendChild(liRemoto);

          // Resultados de la API
          resultados.forEach(loc => {
            const li = document.createElement('li');
            li.className = 'autocomplete-item';
            const locationText = `${loc.nombre}, ${loc.provincia.nombre}`;
            li.innerHTML = `<strong>${loc.nombre}</strong> <span class="text-muted text-xs">, ${loc.provincia.nombre}</span>`;
            
            li.addEventListener('mousedown', () => {
              input.value = locationText;
              list.classList.remove('show');
            });
            list.appendChild(li);
          });
        }
      }, 400); // 400ms debounce
    });

    // Ocultar si se hace click afuera (usamos mousedown arriba para evitar conflictos con blur)
    input.addEventListener('blur', () => {
      list.classList.remove('show');
    });

    // Mostrar de nuevo si tiene foco y hay texto (opcional, pero útil)
    input.addEventListener('focus', () => {
      if (list.children.length > 0) {
        list.classList.add('show');
      }
    });
  }
}

// Instancia global para usar en cualquier archivo
const geoService = new GeoAPI();
