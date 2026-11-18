# GSD Debug Session: White Screen Issue

**Status:** investigating  
**Created:** {date}

## Symptoms
- App shows white screen on Android device
- Backend API accessible via curl but not from app
- CORS and API_URL misconfiguration suspected

## Hypotheses
1. CORS policy blocking cross-origin requests in Android WebView
2. API_BASE_URL pointing to localhost (doesn't work in Android WebView)  
3. CapacitorHttp not properly configured
4. Network Security Configuration blocking requests in Android 10+

## Configuration (Current - BEFORE Fix)
- **api/.env CORS_ORIGINS**: `http://localhost:3000,http://127.0.0.1:3000,https://localhost`
- **web/.env VITE_API_BASE_URL**: `http://localhost:3001/api`
- **capacitor.config.json**: `CapacitorHttp: { enabled: true }`

## Hypotheses Prioritization
1. **High**: CORS policy blocking requests - Android WebView has strict CORS enforcement
2. **High**: API_BASE_URL = localhost - Android WebView can't reach localhost
3. **Medium**: CapacitorHttp configuration - may not be properly routing requests
4. **Medium**: Android Network Security Config - Android 10+ blocks cleartext by default

## Tests Performed
- [ ] curl http://10.155.31.110:3001/api/services (backend accessible)
- [ ] App reinstalled with new config (adb pm clear + install)
- [ ] Navegador celular: http://10.155.31.110:3001/api/services
- [ ] App no celular: tela branca persiste/ some serviços carregam
- [ ] adb logcat -s ReactNative:V (erros JavaScript)

## Root Cause (TBD)
- [ ] CORS policy
- [ ] API_URL incorreta
- [ ] CapacitorHttp config
- [ ] Android Network Security

## Fix Applied (TBD)
- [ ] Atualizar CORS_ORIGINS no api/.env
- [ ] Atualizar VITE_API_BASE_URL no web/.env  
- [ ] Reinstalar app: adb uninstall && adb install -r
- [ ] Limpar cache: adb shell pm clear mz.salaolinda.app

## Verification Status (TBD)
- [ ] Serviços carregam no app
- [ ] Login/registro funcionam
- [ ] Dashboard carrega
- [ ] Logs sem erros de rede

## Next Steps
- Test on physical device with new configuration
- If still white screen: investigate Android Network Security Configuration
- Document final resolution in .planning/debug/resolved/