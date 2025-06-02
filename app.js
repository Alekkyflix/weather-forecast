// DOM Elements
const elements = {
    // Search elements
    locationInput: document.getElementById('location-input'),
    searchBtn: document.getElementById('search-btn'),
    locationBtn: document.getElementById('location-btn'),
    unitBtns: document.querySelectorAll('.unit-btn'),
    
    // Current weather elements
    lastUpdated: document.getElementById('last-updated'),
    currentLocation: document.getElementById('current-location'),
    currentDate: document.getElementById('current-date'),
    currentIcon: document.getElementById('current-icon'),
    currentCondition: document.getElementById('current-condition'),
    currentTemp: document.getElementById('current-temp'),
    feelsLike: document.getElementById('feels-like'),
    windSpeed: document.getElementById('wind-speed'),
    humidity: document.getElementById('humidity'),
    pressure: document.getElementById('pressure'),
    uvIndex: document.getElementById('uv-index'),
    uvDescription: document.getElementById('uv-description'),
    visibility: document.getElementById('visibility'),
    precipitation: document.getElementById('precipitation'),
    windGust: document.getElementById('wind-gust'),
    dewpoint: document.getElementById('dewpoint'),
    cloudCover: document.getElementById('cloud-cover'),
    
    // Forecast elements
    forecastContainer: document.getElementById('forecast-container'),
    hourlyContainer: document.getElementById('hourly-container'),
    
    // Marine elements
    tideContainer: document.getElementById('tide-container'),
    waveContainer: document.getElementById('wave-container'),
    waterTemp: document.getElementById('water-temp'),
    
    // Alerts elements
    alertsContainer: document.getElementById('alerts-container'),
    
    // Unit elements
    unitSymbols: document.querySelectorAll('.unit-symbol'),
    windUnit: document.querySelector('.wind-unit'),
    pressureUnit: document.querySelector('.pressure-unit'),
    visibilityUnit: document.querySelector('.visibility-unit'),
    precipUnit: document.querySelector('.precip-unit'),
    
    // Footer
    currentYear: document.getElementById('current-year')
};

// App State
const state = {
    currentUnit: 'metric',
    currentWeather: null,
    forecastData: null,
    hourlyData: null,
    marineData: null,
    alertsData: null,
    isLoading: false
};

// API Configuration
const API = {
    key: 'YOUR-API-KEY', // Replace with your WeatherAPI.com key
    baseUrl: 'https://api.weatherapi.com/v1/',
    endpoints: {
        current: 'current.json',
        forecast: 'forecast.json',
        marine: 'marine.json',
        future: 'future.json',
        history: 'history.json',
        timezone: 'timezone.json',
        sports: 'sports.json',
        astronomy: 'astronomy.json',
        ip: 'ip.json'
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    // Set current year in footer
    elements.currentYear.textContent = new Date().getFullYear();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load default weather (London as example)
    getWeatherData('London');
}

function setBackground(conditionCode, isDay) {
  const body = document.body;
  body.className = ''; // Reset classes

  const conditionMap = {
    // Clear
    1000: isDay ? 'body-day-clear' : 'body-night-clear',
    
    // Partly Cloudy
    1003: isDay ? 'body-day-partly-cloudy' : 'body-night-partly-cloudy',
    
    // Cloudy/Overcast
    1006: 'body-day-cloudy',
    1009: 'body-day-cloudy',
    
    // Rain
    1063: isDay ? 'body-day-rain' : 'body-night-rain',
    1189: isDay ? 'body-day-rain' : 'body-night-rain',
    
    // Thunderstorm
    1087: 'body-day-storm',
    1276: 'body-night-storm',
    
    // Snow
    1066: isDay ? 'body-day-snow' : 'body-night-snow',
    
    // Extreme
    1282: 'body-extreme'
  };

  body.classList.add(conditionMap[conditionCode] || 'body-day-clear');
}

// Usage when weather data loads:
setBackground(1000, true); // Clear daytime
function setupEventListeners() {
    // Search functionality
    elements.searchBtn.addEventListener('click', searchWeather);
    elements.locationInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchWeather();
    });
    
    // Location button
    elements.locationBtn.addEventListener('click', getLocationWeather);
    
    // Unit toggle buttons
    elements.unitBtns.forEach(btn => {
        btn.addEventListener('click', () => toggleUnits(btn.dataset.unit));
    });
    
    // Hamburger menu for mobile
    document.querySelector('.hamburger').addEventListener('click', toggleMobileMenu);
}

function toggleMobileMenu() {
    document.querySelector('.hamburger').classList.toggle('active');
    document.querySelector('.nav-list').classList.toggle('active');
}

function searchWeather() {
    const location = elements.locationInput.value.trim();
    if (location) {
        getWeatherData(location);
    }
}

function getLocationWeather() {
    if (navigator.geolocation) {
        setLoadingState(true);
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                getWeatherByCoords(latitude, longitude);
            },
            error => {
                setLoadingState(false);
                showError('Geolocation error: ' + error.message);
            }
        );
    } else {
        showError('Geolocation is not supported by your browser');
    }
}

function toggleUnits(unit) {
    if (unit === state.currentUnit) return;
    
    state.currentUnit = unit;
    
    // Update active button
    elements.unitBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.unit === unit);
    });
    
    // Update unit symbols
    const tempUnit = unit === 'metric' ? '°C' : '°F';
    const speedUnit = unit === 'metric' ? ' km/h' : ' mph';
    const pressureUnit = unit === 'metric' ? ' mb' : ' in';
    const visibilityUnit = unit === 'metric' ? ' km' : ' miles';
    const precipUnit = unit === 'metric' ? ' mm' : ' in';
    
    elements.unitSymbols.forEach(el => {
        el.textContent = tempUnit;
    });
    
    elements.windUnit.textContent = speedUnit;
    elements.pressureUnit.textContent = pressureUnit;
    elements.visibilityUnit.textContent = visibilityUnit;
    elements.precipUnit.textContent = precipUnit;
    
    // Convert and update displayed data if we have weather data
    if (state.currentWeather) {
        updateCurrentWeather(state.currentWeather);
    }
    
    if (state.forecastData) {
        updateForecast(state.forecastData);
    }
    
    if (state.hourlyData) {
        updateHourlyForecast(state.hourlyData);
    }
}

async function getWeatherData(location) {
    setLoadingState(true);
    elements.currentLocation.textContent = `Loading data for ${location}...`;
    
    try {
        // Fetch current weather and forecast in parallel
        const [currentRes, forecastRes] = await Promise.all([
            fetch(`${API.baseUrl}${API.endpoints.forecast}?key=${API.key}&q=${location}&days=5&aqi=no&alerts=yes`),
            fetch(`${API.baseUrl}${API.endpoints.forecast}?key=${API.key}&q=${location}&days=5&aqi=no&alerts=yes`)
        ]);
        
        if (!currentRes.ok) throw new Error('Location not found');
        if (!forecastRes.ok) throw new Error('Forecast data unavailable');
        
        const data = await currentRes.json();
        
        // Process and display data
        processWeatherData(data);
        
    } catch (error) {
        showError(error.message);
    } finally {
        setLoadingState(false);
    }
}

async function getWeatherByCoords(lat, lon) {
    try {
        const response = await fetch(`${API.baseUrl}${API.endpoints.forecast}?key=${API.key}&q=${lat},${lon}&days=5&aqi=no&alerts=yes`);
        
        if (!response.ok) throw new Error('Location data unavailable');
        
        const data = await response.json();
        
        // Update location input with detected location
        elements.locationInput.value = data.location.name;
        
        // Process and display data
        processWeatherData(data);
        
    } catch (error) {
        showError(error.message);
    }
}

function processWeatherData(data) {
    // Save data to state
    state.currentWeather = data.current;
    state.forecastData = data.forecast;
    state.locationData = data.location;
    state.alertsData = data.alerts;
    
    // Extract hourly data (next 24 hours)
    state.hourlyData = [];
    for (let i = 0; i < 24; i++) {
        const hour = new Date();
        hour.setHours(hour.getHours() + i);
        const hourString = hour.toISOString().split('T')[0] + ' ' + hour.getHours() + ':00';
        
        // Find matching forecast hour (simplified - in real app would match exact time)
        const forecastHour = data.forecast.forecastday[0].hour.find(h => 
            h.time.includes(hour.getHours() + ':00')
        );
        if (forecastHour) {
            state.hourlyData.push(forecastHour);
        }
    }
    
    // Update UI
    updateCurrentWeather(data.current, data.location);
    updateForecast(data.forecast);
    updateHourlyForecast(state.hourlyData);
    updateAlerts(data.alerts);
    
    // Update last updated time
    const lastUpdated = new Date(data.current.last_updated_epoch * 1000);
    elements.lastUpdated.textContent = `Last updated: ${lastUpdated.toLocaleTimeString()}`;
}

function updateCurrentWeather(currentData, locationData) {
    // Update location
    elements.currentLocation.textContent = `${locationData.name}, ${locationData.country}`;
    
    // Update current date
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    elements.currentDate.textContent = now.toLocaleDateString('en-US', options);
    
    // Update temperature and feels like
    const temp = state.currentUnit === 'metric' ? currentData.temp_c : currentData.temp_f;
    const feelsLike = state.currentUnit === 'metric' ? currentData.feelslike_c : currentData.feelslike_f;
    elements.currentTemp.textContent = Math.round(temp);
    elements.feelsLike.textContent = Math.round(feelsLike);
    
    // Update wind speed
    const windSpeed = state.currentUnit === 'metric' ? currentData.wind_kph : currentData.wind_mph;
    elements.windSpeed.textContent = Math.round(windSpeed);
    
    // Update wind gust
    const windGust = state.currentUnit === 'metric' ? currentData.gust_kph : currentData.gust_mph;
    elements.windGust.textContent = Math.round(windGust);
    
    // Update other metrics
    elements.humidity.textContent = currentData.humidity;
    elements.pressure.textContent = currentData.pressure_mb;
    elements.uvIndex.textContent = currentData.uv;
    elements.visibility.textContent = state.currentUnit === 'metric' ? 
        currentData.vis_km : currentData.vis_miles;
    elements.precipitation.textContent = state.currentUnit === 'metric' ?
        currentData.precip_mm : currentData.precip_in;
    elements.dewpoint.textContent = state.currentUnit === 'metric' ?
        currentData.dewpoint_c : currentData.dewpoint_f;
    elements.cloudCover.textContent = currentData.cloud;
    
    // Update UV description
    setUvDescription(currentData.uv);
    
    // Update weather icon and condition
    elements.currentCondition.textContent = currentData.condition.text;
    setWeatherIcon(elements.currentIcon, currentData.condition.code, currentData.is_day);
}

function setUvDescription(uvValue) {
    let uvDesc = '';
    let uvColor = '';
    
    if (uvValue <= 2) {
        uvDesc = 'Low';
        uvColor = '#a3d063';
    } else if (uvValue <= 5) {
        uvDesc = 'Moderate';
        uvColor = '#f7d038';
    } else if (uvValue <= 7) {
        uvDesc = 'High';
        uvColor = '#f29b34';
    } else if (uvValue <= 10) {
        uvDesc = 'Very High';
        uvColor = '#e44d2e';
    } else {
        uvDesc = 'Extreme';
        uvColor = '#c73254';
    }
    
    elements.uvDescription.textContent = uvDesc;
    elements.uvIndex.style.backgroundColor = uvColor;
}

function updateForecast(forecastData) {
    // Clear previous forecast
    elements.forecastContainer.innerHTML = '';
    
    // Process each forecast day
    forecastData.forecastday.forEach(day => {
        const date = new Date(day.date_epoch * 1000);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        const forecastCard = document.createElement('div');
        forecastCard.className = 'forecast-card';
        forecastCard.innerHTML = `
            <div class="forecast-day">${dayName}</div>
            <div class="forecast-date">${dateStr}</div>
            <div class="forecast-icon">
                <i class="${getWeatherIconClass(day.day.condition.code, 1)}"></i>
            </div>
            <div class="forecast-temp">
                <span class="forecast-high">${state.currentUnit === 'metric' ? 
                    Math.round(day.day.maxtemp_c) : Math.round(day.day.maxtemp_f)}°</span>
                <span class="forecast-low">${state.currentUnit === 'metric' ? 
                    Math.round(day.day.mintemp_c) : Math.round(day.day.mintemp_f)}°</span>
            </div>
            <div class="forecast-details">
                <p><span>Wind:</span> <span>${state.currentUnit === 'metric' ? 
                    Math.round(day.day.maxwind_kph) : Math.round(day.day.maxwind_mph)}${state.currentUnit === 'metric' ? 'km/h' : 'mph'}</span></p>
                <p><span>Rain:</span> <span>${state.currentUnit === 'metric' ? 
                    day.day.totalprecip_mm : day.day.totalprecip_in}${state.currentUnit === 'metric' ? 'mm' : 'in'}</span></p>
                <p><span>Humidity:</span> <span>${day.day.avghumidity}%</span></p>
            </div>
        `;
        
        elements.forecastContainer.appendChild(forecastCard);
    });
}

function updateHourlyForecast(hourlyData) {
    // Clear previous hourly forecast
    elements.hourlyContainer.innerHTML = '';
    
    // Process each hour
    hourlyData.forEach(hour => {
        const time = new Date(hour.time_epoch * 1000);
        const timeStr = time.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        
        const hourlyItem = document.createElement('div');
        hourlyItem.className = 'hourly-item';
        hourlyItem.innerHTML = `
            <div class="hourly-time">${timeStr}</div>
            <div class="hourly-icon">
                <i class="${getWeatherIconClass(hour.condition.code, hour.is_day)}"></i>
            </div>
            <div class="hourly-temp">${state.currentUnit === 'metric' ? 
                Math.round(hour.temp_c) : Math.round(hour.temp_f)}°</div>
        `;
        
        elements.hourlyContainer.appendChild(hourlyItem);
    });
}

function updateAlerts(alertsData) {
    // Clear previous alerts
    elements.alertsContainer.innerHTML = '';
    
    if (!alertsData || alertsData.alert.length === 0) {
        elements.alertsContainer.innerHTML = '<p>No active weather alerts for your location.</p>';
        return;
    }
    
    // Process each alert
    alertsData.alert.forEach(alert => {
        const alertItem = document.createElement('div');
        alertItem.className = 'alert-item';
        alertItem.innerHTML = `
            <h3><i class="fas fa-exclamation-triangle"></i> ${alert.headline} <span class="alert-severity">${alert.severity}</span></h3>
            <p><strong>Areas:</strong> ${alert.areas}</p>
            <p><strong>Effective:</strong> ${new Date(alert.effective).toLocaleString()}</p>
            <p><strong>Expires:</strong> ${new Date(alert.expires).toLocaleString()}</p>
            <p>${alert.desc}</p>
            <p><strong>Instruction:</strong> ${alert.instruction}</p>
        `;
        
        elements.alertsContainer.appendChild(alertItem);
    });
}

function setWeatherIcon(element, conditionCode, isDay = 1) {
    const iconClass = getWeatherIconClass(conditionCode, isDay);
    element.innerHTML = `<i class="fas ${iconClass}"></i>`;
    
    // Add animation for certain weather conditions
    if (conditionCode >= 2000 && conditionCode < 3000) {
        // Thunderstorm - add lightning animation
        element.classList.add('lightning');
    } else if (conditionCode >= 3000 && conditionCode < 6000) {
        // Rain - add rain animation
        element.classList.add('rain');
    } else if (conditionCode >= 6000 && conditionCode < 7000) {
        // Snow - add snow animation
        element.classList.add('snow');
    } else {
        // Clear any weather animations
        element.classList.remove('lightning', 'rain', 'snow');
    }
}

function getWeatherIconClass(conditionCode, isDay = 1) {
    // WeatherAPI.com condition codes mapping to Font Awesome icons
    // This is a simplified mapping - you would expand this based on all possible codes
    const isDayIcon = isDay === 1;
    
    // Clear
    if (conditionCode === 1000) {
        return isDayIcon ? 'fa-sun' : 'fa-moon';
    }
    // Partly cloudy
    else if (conditionCode === 1003) {
        return isDayIcon ? 'fa-cloud-sun' : 'fa-cloud-moon';
    }
    // Cloudy
    else if (conditionCode === 1006 || conditionCode === 1009) {
        return 'fa-cloud';
    }
    // Overcast
    else if (conditionCode === 1030 || conditionCode === 1135 || conditionCode === 1147) {
        return 'fa-smog';
    }
    // Fog
    else if (conditionCode === 1063 || conditionCode === 1180 || conditionCode === 1183 || 
             conditionCode === 1186 || conditionCode === 1189 || conditionCode === 1192 || 
             conditionCode === 1195 || conditionCode === 1240 || conditionCode === 1243 || 
             conditionCode === 1246) {
        return 'fa-cloud-rain';
    }
    // Rain
    else if (conditionCode === 1066 || conditionCode === 1069 || conditionCode === 1072 || 
             conditionCode === 1114 || conditionCode === 1117 || conditionCode === 1150 || 
             conditionCode === 1153 || conditionCode === 1168 || conditionCode === 1171 || 
             conditionCode === 1201 || conditionCode === 1204 || conditionCode === 1207 || 
             conditionCode === 1210 || conditionCode === 1213 || conditionCode === 1216 || 
             conditionCode === 1219 || conditionCode === 1222 || conditionCode === 1225 || 
             conditionCode === 1237 || conditionCode === 1249 || conditionCode === 1252 || 
             conditionCode === 1255 || conditionCode === 1258 || conditionCode === 1261 || 
             conditionCode === 1264) {
        return 'fa-cloud-showers-heavy';
    }
    // Snow
    else if (conditionCode === 1087 || conditionCode === 1273 || conditionCode === 1276 || 
             conditionCode === 1279 || conditionCode === 1282) {
        return 'fa-snowflake';
    }
    // Thunderstorm
    else if (conditionCode === 1087) {
        return 'fa-bolt';
    }
    // Default
    else {
        return 'fa-question';
    }
}

function setLoadingState(isLoading) {
    state.isLoading = isLoading;
    
    const mainCard = document.querySelector('.main-card');
    if (isLoading) {
        mainCard.classList.add('loading');
    } else {
        mainCard.classList.remove('loading');
    }
    
    // Disable buttons during loading
    elements.searchBtn.disabled = isLoading;
    elements.locationBtn.disabled = isLoading;
}

function showError(message) {
    alert(message);
    elements.currentLocation.textContent = 'WeatherSphere';
    setLoadingState(false);
}

// Add marine weather data (mock - would come from API in real implementation)
function updateMarineData() {
    // Mock tide data
    const tideData = [
        { time: '06:15 AM', height: '2.1m', type: 'High' },
        { time: '12:30 PM', height: '0.8m', type: 'Low' },
        { time: '06:45 PM', height: '2.3m', type: 'High' },
        { time: '01:00 AM', height: '0.7m', type: 'Low' }
    ];
    
    // Mock wave data
    const waveData = [
        { parameter: 'Wave Height', value: '1.2m' },
        { parameter: 'Swell Height', value: '0.8m' },
        { parameter: 'Swell Direction', value: 'SW' },
        { parameter: 'Swell Period', value: '8s' }
    ];
    
    // Clear previous data
    elements.tideContainer.innerHTML = '';
    elements.waveContainer.innerHTML = '';
    
    // Add tide data
    tideData.forEach(tide => {
        const tideItem = document.createElement('div');
        tideItem.className = 'tide-item';
        tideItem.innerHTML = `
            <span class="tide-time">${tide.time}</span>
            <span class="tide-value">${tide.height} (${tide.type})</span>
        `;
        elements.tideContainer.appendChild(tideItem);
    });
    
    // Add wave data
    waveData.forEach(wave => {
        const waveItem = document.createElement('div');
        waveItem.className = 'wave-item';
        waveItem.innerHTML = `
            <span class="wave-parameter">${wave.parameter}</span>
            <span class="wave-value">${wave.value}</span>
        `;
        elements.waveContainer.appendChild(waveItem);
    });
    
    // Set water temp
    elements.waterTemp.textContent = '18';
}

// Initialize marine data
updateMarineData();