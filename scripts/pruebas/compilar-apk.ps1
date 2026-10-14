# Compila el APK de pruebas («VeoVeo Test», com.roblesgg.veoveo.test) contra el Firebase de
# PRUEBAS (veoveo-pruebas). Comprueba al final que el bundle no lleva el proyecto de producción.
# Ver docs/entornos.md.
#
#   powershell -File scripts/pruebas/compilar-apk.ps1
$ErrorActionPreference = 'Stop'
$raiz = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$envPruebas = Join-Path $raiz '.env.pruebas.local'
if (-not (Test-Path $envPruebas)) { throw 'Falta .env.pruebas.local (configuración web de veoveo-pruebas).' }

# Variables de pruebas en el proceso: mandan sobre las de .env (Expo no sobrescribe las que ya hay)
Get-Content $envPruebas | Where-Object { $_ -match '^\s*([A-Z0-9_]+)=(.*)$' } | ForEach-Object {
  [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2].Trim(), 'Process')
}
if ($env:EXPO_PUBLIC_FIREBASE_PROJECT_ID -ne 'veoveo-pruebas') { throw 'El entorno de pruebas no apunta a veoveo-pruebas.' }
$env:APP_ENV = 'test'
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

# Rutas cortas (gradle en Windows): W: = carpeta proyectos
if (-not (Test-Path 'W:\')) { subst W: (Split-Path $raiz -Parent) }
$android = Join-Path 'W:\' (Join-Path (Split-Path $raiz -Leaf) 'android')
# Proyecto nativo regenerado desde app.json/app.config.js (versión, permisos, paquete .test).
# Sin esto, android/ se queda con la versión y los permisos de la última vez que se generó.
Push-Location (Join-Path 'W:\' (Split-Path $raiz -Leaf))
try { npx expo prebuild --platform android --clean --no-install | Out-Null; if ($LASTEXITCODE) { throw 'Falló expo prebuild.' } }
finally { Pop-Location }

Push-Location $android
try { .\gradlew.bat assembleRelease --no-daemon -PreactNativeArchitectures=arm64-v8a -q }
finally { Pop-Location }

$bundle = Join-Path $android 'app\build\generated\assets\createBundleReleaseJsAndAssets\index.android.bundle'
if (-not (Select-String -Path $bundle -Pattern 'veoveo-pruebas' -SimpleMatch -Quiet)) { throw 'El bundle no lleva veoveo-pruebas.' }
if (Select-String -Path $bundle -Pattern 'veoveo-48667' -SimpleMatch -Quiet) { throw 'El bundle lleva el proyecto de PRODUCCIÓN. No se usa.' }
$apk = Join-Path $android 'app\build\outputs\apk\release\app-release.apk'

# La versión del APK tiene que ser la de app.json (si no, el proyecto nativo está desfasado)
$app = (Get-Content (Join-Path $raiz 'app.json') -Raw | ConvertFrom-Json).expo
$buildTools = Get-ChildItem "$env:LOCALAPPDATA\Android\Sdk\build-tools" | Sort-Object Name | Select-Object -Last 1
$badging = & (Join-Path $buildTools.FullName 'aapt.exe') dump badging $apk | Select-String '^package:' | Select-Object -First 1
if ($badging -notmatch "name='com\.roblesgg\.veoveo\.test'") { throw "El paquete no es com.roblesgg.veoveo.test: $badging" }
if ($badging -notmatch "versionCode='$($app.android.versionCode)'" -or $badging -notmatch "versionName='$([regex]::Escape($app.version))'") {
  throw "Versión del APK distinta de app.json ($($app.version) / $($app.android.versionCode)): $badging"
}
Write-Host "APK de pruebas listo (veoveo-pruebas, $($app.version) / $($app.android.versionCode)): $apk"
