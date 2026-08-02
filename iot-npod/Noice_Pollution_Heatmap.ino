#include <TinyGPS++.h>
#include <TinyGPSPlus.h>
#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <driver/i2s.h>
#include <ArduinoJson.h>
#include <time.h>


// ---------------- WiFi ----------------
const char* WIFI_SSID = "vivo Y03";
const char* WIFI_PASSWORD = "11112222m";

// Timezone offset (Sri Lanka = GMT+5:30)
const long gmtOffset_sec = 5 * 3600 + 1800;
const int daylightOffset_sec = 0;

// ---------------- Firebase ----------------
String FIREBASE_URL = "https://live-noise-map-default-rtdb.asia-southeast1.firebasedatabase.app/noiseReports.json";  // .json required for REST API https://your-project-id.firebaseio.com/noise_samples.json
String FIREBASE_AUTH = "uqbUuhi9dElR6iSxdRo66cuqfghZKxHKxDbMN1nP";                                                   // Or use a token YOUR_FIREBASE_DATABASE_SECRET

// ---------------- GPS ----------------
#define GPS_RX 16  // ESP32 pin connected to GPS TX
#define GPS_TX 17  // ESP32 pin connected to GPS RX (optional)
HardwareSerial gpsSerial(1);
TinyGPSPlus gps;

// ---------------- Device Info ----------------
const char* DEVICE_ID = "esp32-01";
const float LATITUDE = 6.832368;
const float LONGITUDE = 79.864592;

// ---------------- I2S Mic ----------------
#define I2S_WS 25
#define I2S_SD 33
#define I2S_SCK 32
#define I2S_PORT I2S_NUM_0
#define SAMPLE_RATE 16000
#define BUFFER_LEN 1024

float CALIBRATION_OFFSET = 79.0f;

const unsigned long MEASURE_INTERVAL = 1000;  // 1 minute in ms
double sum_squares = 0.0;
uint32_t sample_count = 0;
unsigned long startMillis = 0;

// ---------------- I2S Setup ----------------
void i2s_install() {
  const i2s_config_t i2s_config = {
    .mode = i2s_mode_t(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = SAMPLE_RATE,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_RIGHT,
    .communication_format = I2S_COMM_FORMAT_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = BUFFER_LEN,
    .use_apll = false
  };
  i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);

  const i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_SCK,
    .ws_io_num = I2S_WS,
    .data_out_num = -1,
    .data_in_num = I2S_SD
  };
  i2s_set_pin(I2S_PORT, &pin_config);
  i2s_start(I2S_PORT);
}

// ---------------- Setup ----------------
void setup() {
  Serial.begin(115200);

  // GPS init
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);

  // Connect WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected!");

  // Configure time (NTP servers: pool.ntp.org)
  configTime(gmtOffset_sec, daylightOffset_sec, "pool.ntp.org", "time.nist.gov");

  // Wait until time is set
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("Failed to obtain time");
    return;
  }
  Serial.println("Time synchronized!");

  // I2S Mic
  i2s_install();
  startMillis = millis();
}

// ---------------- Loop ----------------
void loop() {
  // --- GPS update ---
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  int32_t buffer[BUFFER_LEN];
  size_t bytes_read;

  // Read I2S samples
  i2s_read(I2S_PORT, (void*)buffer, BUFFER_LEN * sizeof(int32_t), &bytes_read, portMAX_DELAY);
  int samples_read = bytes_read / sizeof(int32_t);



  for (int i = 0; i < samples_read; i++) {
    int32_t s = buffer[i] >> 8;            // 24-bit sample
    float sample = (float)s / 8388608.0f;  // normalize -1..1
    sum_squares += sample * sample;
    sample_count++;
  }

  if (millis() - startMillis >= MEASURE_INTERVAL) {
    // Compute RMS & approximate Leq (uncalibrated)
    double mean_square = (sample_count > 0) ? (sum_squares / sample_count) : 0.0;
    double rms = sqrt(mean_square);
    double dBFS = (rms > 1e-12) ? (20.0 * log10(rms)) : -120.0;
    double dBSPL = dBFS + CALIBRATION_OFFSET;

    Serial.printf("dBFS: %.2f, dB SPL (cal): %.2f\n", dBFS, dBSPL);

    // --- Get GPS location ---
    float latitude = 0.0, longitude = 0.0;
    if (gps.location.isValid() && gps.location.isUpdated()) {
      latitude = gps.location.lat();
      longitude = gps.location.lng();
      Serial.printf("GPS Fix: Lat: %.6f, Lon: %.6f\n", latitude, longitude);
    } else {
      Serial.println("Waiting for GPS fix...");
    }

    // Create JSON payload
    StaticJsonDocument<256> doc;
    doc["deviceId"] = DEVICE_ID;
    doc["lat"] = LATITUDE;
    doc["lon"] = LONGITUDE;
    doc["dB"] = dBSPL;

    // Add timestamp in ISO format
    time_t now = time(nullptr);
    struct tm* timeinfo = localtime(&now);  // <-- local time (instead of gmtime)

    char buf[25];
    strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%S", timeinfo);  // ISO-like format

    doc["timestamp"] = buf;

    char payload[256];
    serializeJson(doc, payload, sizeof(payload));

    // Send to Firebase with REST API
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      String url = String(FIREBASE_URL) + "?auth=" + FIREBASE_AUTH;
      http.begin(url);
      http.addHeader("Content-Type", "application/json");

      int httpCode = http.POST(payload);
      if (httpCode > 0) {
        Serial.printf("Data sent to Firebase, HTTP code: %d\n", httpCode);
      } else {
        Serial.printf("Error sending data: %s\n", http.errorToString(httpCode).c_str());
      }
      http.end();
    }

    // Reset counters for next interval
    sum_squares = 0.0;
    sample_count = 0;
    startMillis = millis();
  }
}
