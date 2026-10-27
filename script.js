const API_KEY = "11980e852c534bfaae960328262710";
const BASE = "https://api.weatherapi.com/v1/forecast.json";
const SEARCH = "https://api.weatherapi.com/v1/search.json";

let currentData = null;
let isFahrenheit = false;
let debounceTimer;

const $ = id => document.getElementById(id);

const icons = {
  1000: "fa-sun", 1003: "fa-cloud-sun", 1006: "fa-cloud", 1009: "fa-cloud",
  1030: "fa-smog", 1063: "fa-cloud-rain", 1066: "fa-snowflake", 1069: "fa-sleet",
  1072: "fa-sleet", 1087: "fa-bolt", 1114: "fa-snowflake", 1117: "fa-snowflake",
  1135: "fa-smog", 1147: "fa-smog", 1150: "fa-cloud-rain", 1153: "fa-cloud-rain",
  1168: "fa-sleet", 1171: "fa-sleet", 1180: "fa-cloud-rain", 1183: "fa-cloud-rain",
  1186: "fa-cloud-showers-heavy", 1189: "fa-cloud-showers-heavy", 1192: "fa-cloud-showers-heavy",
  1195: "fa-cloud-showers-heavy", 1198: "fa-cloud-showers-heavy", 1201: "fa-cloud-showers-heavy",
  1207: "fa-sleet", 1210: "fa-snowflake", 1213: "fa-snowflake", 1216: "fa-snowflake",
  1219: "fa-snowflake", 1222: "fa-snowflake", 1225: "fa-snowflake", 1237: "fa-cloud-meatball",
  1240: "fa-cloud-rain", 1243: "fa-cloud-showers-heavy", 1246: "fa-cloud-showers-heavy",
  1249: "fa-sleet", 1252: "fa-sleet", 1255: "fa-snowflake", 1258: "fa-snowflake",
  1261: "fa-snowflake", 1264: "fa-snowflake", 1273: "fa-bolt", 1276: "fa-bolt",
  1279: "fa-bolt", 1282: "fa-bolt"
};

function icon(code) { return icons[code] || "fa-cloud-sun"; }
function temp(c, f) { return Math.round(isFahrenheit ? f : c); }
function tempText(c, f) { return `${temp(c, f)}°`; }

function timeText(value) {
  return new Date(value.replace(" ", "T")).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function dayText(value, today = false) {
  return today ? "Today" : new Date(value + "T12:00:00").toLocaleDateString([], { weekday: "short" });
}

function showLoading(on) { $("loading").style.display = on ? "flex" : "none"; }
function showError(message) {
  $("error").textContent = message;
  $("error").style.display = message ? "block" : "none";
}

async function loadWeather(query) {
  showLoading(true);
  showError("");
  try {
    const response = await fetch(`${BASE}?key=${API_KEY}&q=${encodeURIComponent(query)}&days=7&aqi=yes&alerts=yes`);
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error?.message || "Could not load weather.");
    currentData = data;
    render(data);
    $("searchInput").value = "";
    $("suggestions").style.display = "none";
    $("clearSearch").style.display = "none";
  } catch (e) {
    showError(`${e.message} Check your connection and try another city.`);
  } finally {
    showLoading(false);
  }
}

function render(data) {
  const { location, current, forecast } = data;
  const today = forecast.forecastday[0];
  const code = current.condition.code;

  $("cityName").textContent = location.name;
  $("locationLabel").textContent = [location.region, location.country].filter(Boolean).join(", ").toUpperCase();
  $("currentDate").textContent = new Date(location.localtime.replace(" ", "T")).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  $("temperature").textContent = temp(current.temp_c, current.temp_f);
  $("tempUnit").textContent = isFahrenheit ? "°F" : "°C";
  $("condition").textContent = current.condition.text;
  $("feels").textContent = tempText(current.feelslike_c, current.feelslike_f);
  $("dayRange").textContent = `H: ${tempText(today.day.maxtemp_c, today.day.maxtemp_f)} · L: ${tempText(today.day.mintemp_c, today.day.mintemp_f)}`;
  $("weatherIcon").innerHTML = `<i class="fa-solid ${icon(code)}"></i>`;
  $("weatherSummary").textContent = summary(current, today);

  document.body.classList.remove("weather-clear", "weather-cloudy", "weather-rain", "weather-storm", "weather-snow");
  let scene = "weather-clear";
  if ([1273, 1276, 1279, 1282, 1087].includes(code)) scene = "weather-storm";
  else if ([1066, 1069, 1072, 1114, 1117, 1210, 1213, 1216, 1219, 1222, 1225, 1255, 1258, 1261, 1264].includes(code)) scene = "weather-snow";
  else if ([1063, 1150, 1153, 1168, 1171, 1180, 1183, 1186, 1189, 1192, 1195, 1198, 1201, 1207, 1240, 1243, 1246, 1249, 1252].includes(code)) scene = "weather-rain";
  else if ([1006, 1009, 1030, 1135, 1147].includes(code)) scene = "weather-cloudy";
  document.body.classList.add(scene);

  $("feelsMetric").textContent = tempText(current.feelslike_c, current.feelslike_f);
  $("feelsHint").textContent = current.feelslike_c - current.temp_c > 3 ? "It may feel warmer than the air" : "Perceived temperature";

  $("humidity").textContent = current.humidity + "%";
  $("humidityMeter").style.width = current.humidity + "%";
  $("humidityStatus").textContent = current.humidity > 75 ? "Humid conditions" : current.humidity < 30 ? "Dry air" : "Comfortable moisture";

  $("windSpeed").innerHTML = `${Math.round(isFahrenheit ? current.wind_mph : current.wind_kph)} <small>${isFahrenheit ? "mph" : "km/h"}</small>`;
  $("windDir").textContent = `${current.wind_dir} · Gusts ${Math.round(isFahrenheit ? current.gust_mph : current.gust_kph)} ${isFahrenheit ? "mph" : "km/h"}`;

  const rain = today.day.daily_chance_of_rain ?? 0;
  $("rainChance").textContent = rain + "%";
  $("rainMeter").style.width = rain + "%";
  $("rainHint").textContent = rain >= 50 ? "Keep an umbrella handy" : rain > 20 ? "A shower is possible" : "Low chance of rain";

  $("uvIndex").textContent = current.uv ?? "—";
  $("uvStatus").textContent = uvStatus(current.uv);

  $("visibility").innerHTML = `${current.vis_km} <small>km</small>`;
  $("visibilityStatus").textContent = current.vis_km < 5 ? "Reduced visibility" : "Good visibility";

  const aqi = current.air_quality?.["us-epa-index"];
  $("airQuality").textContent = aqi ? ({1:"Good",2:"Fair",3:"Moderate",4:"Poor",5:"Very poor",6:"Hazardous"}[aqi] || aqi) : "N/A";
  $("airQualityStatus").textContent = aqi ? "US EPA air quality index" : "Air quality unavailable";

  $("pressure").innerHTML = `${Math.round(current.pressure_mb)} <small>hPa</small>`;
  $("cloudsStatus").textContent = `${current.cloud}% cloud cover`;

  $("sunrise").textContent = today.astro.sunrise;
  $("sunset").textContent = today.astro.sunset;

  const now = new Date(location.localtime.replace(" ", "T"));
  const rise = new Date(location.localtime.split(" ")[0] + "T" + to24(today.astro.sunrise));
  const set = new Date(location.localtime.split(" ")[0] + "T" + to24(today.astro.sunset));
  let progress = (now - rise) / (set - rise) * 100;
  $("sunProgress").style.width = `${Math.max(0, Math.min(100, progress))}%`;

  renderHourly(forecast.forecastday, location.localtime);
  renderDaily(forecast.forecastday);

  $("lastUpdated").textContent = `Updated ${timeText(location.localtime)}`;
  setAdvice(current, today);
}

function to24(t) {
  const d = new Date("2000-01-01 " + t);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:00`;
}

function summary(c, day) {
  const rain = day.day.daily_chance_of_rain || 0;
  if (c.condition.text.toLowerCase().includes("thunder")) return "Stormy weather nearby. Stay indoors if thunder or lightning develops.";
  if (rain > 55) return `Rain is likely today (${rain}% chance). Carry an umbrella if you're heading out.`;
  if (c.uv >= 6) return "UV levels are high. Consider shade and sun protection around midday.";
  if (c.wind_kph > 30) return "Breezy conditions today. Secure loose items and take care outdoors.";
  return `${c.condition.text} with a high of ${Math.round(day.day.maxtemp_c)}°C. Here's your local outlook for the day.`;
}

function renderHourly(days, localtime) {
  const now = new Date(localtime.replace(" ", "T"));
  const hours = days.flatMap(d => d.hour).filter(h => new Date(h.time.replace(" ", "T")) >= new Date(now.getTime() - 3600000)).slice(0, 24);
  $("hourlyForecast").innerHTML = hours.map((h, i) => `
    <div class="hour-card">
      <div class="hour-time">${i === 0 ? "Now" : timeText(h.time)}</div>
      <div class="hour-icon"><i class="fa-solid ${icon(h.condition.code)}"></i></div>
      <div class="hour-temp">${tempText(h.temp_c, h.temp_f)}</div>
      <div class="hour-rain"><i class="fa-solid fa-droplet"></i>${h.chance_of_rain || 0}%</div>
    </div>
  `).join("");
}

function renderDaily(days) {
  $("dailyForecast").innerHTML = days.map((d, i) => `
    <div class="day-row">
      <div>
        <div class="day-name">${dayText(d.date, i === 0)}</div>
        <div class="day-date">${new Date(d.date + "T12:00:00").toLocaleDateString([], { month: "short", day: "numeric" })}</div>
      </div>
      <div class="day-icon"><i class="fa-solid ${icon(d.day.condition.code)}"></i></div>
      <div class="day-condition">${d.day.condition.text}</div>
      <div class="day-temps"><span>${tempText(d.day.maxtemp_c, d.day.maxtemp_f)}</span><span class="day-low">${tempText(d.day.mintemp_c, d.day.mintemp_f)}</span></div>
    </div>
  `).join("");
}

function uvStatus(uv) {
  if (uv == null) return "Not available";
  if (uv < 3) return "Low · minimal protection";
  if (uv < 6) return "Moderate · use protection";
  if (uv < 8) return "High · seek shade";
  if (uv < 11) return "Very high · protect skin";
  return "Extreme · limit sun exposure";
}

function setAdvice(c, d) {
  let title = "A little heads‑up";
  let message = "Enjoy your day and check back for updates as conditions change.";
  if ((d.day.daily_chance_of_rain || 0) >= 50) {
    title = "Bring an umbrella";
    message = `There's a ${d.day.daily_chance_of_rain}% chance of rain today. A light waterproof layer could come in handy.`;
  } else if (c.uv >= 6) {
    title = "Take care in the sun";
    message = `The UV index is ${c.uv}. Seek shade around midday and consider sunscreen, sunglasses and a hat.`;
  } else if (c.wind_kph > 30) {
    title = "A breezy day ahead";
    message = `Winds are around ${Math.round(c.wind_kph)} km/h. Be mindful of gusts if cycling or spending time outdoors.`;
  } else if (c.humidity > 80) {
    title = "It's feeling humid";
    message = "Choose breathable clothing and keep water nearby if you will be active outdoors.";
  } else if (c.condition.text.toLowerCase().includes("snow")) {
    title = "Watch for slippery spots";
    message = "If you head out, allow extra time and take care on cold or icy surfaces.";
  }
  $("adviceTitle").textContent = title;
  $("weatherAdvice").textContent = message;
}

async function suggestions(query) {
  try {
    const r = await fetch(`${SEARCH}?key=${API_KEY}&q=${encodeURIComponent(query)}`);
    const data = await r.json();
    const box = $("suggestions");
    if (!Array.isArray(data) || !data.length) { box.style.display = "none"; return; }
    box.innerHTML = data.slice(0, 6).map((x, i) => `
      <div class="suggestion-item" data-index="${i}">
        ${escapeHtml(x.name)}<small>${escapeHtml([x.region, x.country].filter(Boolean).join(", "))}</small>
      </div>
    `).join("");
    box.style.display = "block";
    box.querySelectorAll(".suggestion-item").forEach((el, i) => {
      el.addEventListener("click", () => { loadWeather(data[i].name); });
    });
  } catch { $("suggestions").style.display = "none"; }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function locate() {
  if (!navigator.geolocation) { loadWeather("Bhubaneswar"); return; }
  showLoading(true);
  navigator.geolocation.getCurrentPosition(
    p => { loadWeather(`${p.coords.latitude},${p.coords.longitude}`); },
    () => { showLoading(false); showError("Location access was unavailable. Showing Bhubaneswar instead."); loadWeather("Bhubaneswar"); },
    { timeout: 9000, maximumAge: 300000 }
  );
}

document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("weatherly-theme");
  if (saved) document.documentElement.setAttribute("data-theme", saved);
  $("themeToggle").innerHTML = document.documentElement.getAttribute("data-theme") === "light" ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';

  $("themeToggle").addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("weatherly-theme", next);
    $("themeToggle").innerHTML = next === "light" ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
  });

  $("unitToggle").addEventListener("click", () => {
    isFahrenheit = !isFahrenheit;
    $("unitToggle").innerHTML = isFahrenheit ? '°F <span class="unit-divider">/</span> °C' : '°C <span class="unit-divider">/</span> °F';
    if (currentData) render(currentData);
  });

  $("locateBtn").addEventListener("click", locate);

  $("searchInput").addEventListener("input", e => {
    const q = e.target.value.trim();
    $("clearSearch").style.display = q ? "block" : "none";
    clearTimeout(debounceTimer);
    if (q.length >= 2) debounceTimer = setTimeout(() => suggestions(q), 300);
    else $("suggestions").style.display = "none";
  });

  $("searchInput").addEventListener("keydown", e => {
    if (e.key === "Enter" && e.target.value.trim()) loadWeather(e.target.value.trim());
    if (e.key === "Escape") $("suggestions").style.display = "none";
  });

  $("clearSearch").addEventListener("click", () => {
    $("searchInput").value = "";
    $("clearSearch").style.display = "none";
    $("suggestions").style.display = "none";
    $("searchInput").focus();
  });

  document.addEventListener("click", e => {
    if (!e.target.closest(".search-wrap")) $("suggestions").style.display = "none";
  });

  loadWeather("Bhubaneswar");
});