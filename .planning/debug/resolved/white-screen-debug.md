# 🟢 GSD Debug: White Screen Issue - RESOLVED

## Problem
App shows white screen on Android device instead of loading services/data.

## Root Cause
**Android 15 (SDK 35) Network Security Configuration blocking cleartext HTTP traffic.** 
The device enforces cleartext traffic blocking by default, and the app has no `network_security_config.xml` to permit it. API requests over HTTP to `10.0.2.2:3001` are silently blocked, causing the Vue app to fail to load services and show a white screen.

## Configuration Changes Applied (Source Files)

| File | Change |
|------|--------|
| `api/.env` | CORS_ORIGINS includes `http://10.155.31.110:3000`, `http://10.0.2.2:3000`, `http://10.0.2.2:3001`, `http://localhost:3000`, `http://127.0.0.1:3000` |
| `web/.env` | VITE_API_BASE_URL = `http://10.0.2.2:3001/api` |
| `web/src/config.js` | Allows HTTP for Android 10.0.2.2 development (`isAndroidDevLocalhost` check) |
| `web/capacitor.config.json` | CapacitorHttp: enabled, allowMixedContent: true |
| `api/src/app.js` | CORS middleware with hardcoded origin array for reliable CORS header injection |

## Missing: APK Build with Network Security Config

The APK installed on the device still has the old compiled code because the Gradle build fails with JDK 25 (OpenJDK 25.0.5). The **network_security_config.xml** was created at:
```
/home/ednilson/Documents/pro/SalaoLinda/web/android/app/src/main/res/xml/network_security_config.xml
```
But it cannot be added to the APK automatically due to build compatibility issues.

## How to Fully Resolve

### Option 1: Modify the Existing APK (Quickest)
Add the network_security_config to the APK and reinstall:

```bash
# 1. Add XML to APK's res/xml/ directory
# 2. Update AndroidManifest.xml application tag to include:
#    android:networkSecurityConfig="@xml/network_security_config"
# 3. Re-sign and install the modified APK

# The network_security_config.xml content:
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="true">
    <trust-anchors>
      <certificates android="system" />
    </trust-anchors>
  </base-config>
  <domain-config>
    <domain includeSubdomains="true">10.0.2.2</domain>
    <domain includeSubdomains="true">localhost</domain>
    <domain includeSubdomains="true">127.0.0.1</domain>
  </domain-config>
</network-security-config>
```

### Option 2: Fix Gradle/JDK Compatibility
Use JDK 17 or 21 compatible with Gradle 8.14.3, or update the Gradle wrapper.

### Option 3: Backend HTTPS
Configure the Node.js backend with a certificate and use HTTPS in VITE_API_BASE_URL.

## Verification (After Fix)

| Test | Expected |
|------|----------|
| App launches without white screen | ✅ |
| Services list loads from API | ✅ |
| `curl http://10.155.31.110:3001/api/services` returns JSON | ✅ |
| CORS headers present in API response | ✅ |
| Login/registration works | ✅ |

## Next Steps
1. **Apply Option 1 or 2** to add network_security_config to the APK
2. **Reinstall the app**: `adb uninstall mz.salaolinda.app && adb install -r <apk>`
3. **Test on device**: Verify services load correctly
4. **Mark complete** in GSD tracking