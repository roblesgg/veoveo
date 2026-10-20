# Compila el AAB de Play (com.roblesgg.veoveo, Firebase de PRODUCCIÓN) firmado con la upload key.
# La clave vive fuera del repo: DripDev\_copias\veoveo\ (upload-key.txt + veoveo-upload.jks).
#
#   powershell -File scripts/play/compilar-aab.ps1
$ErrorActionPreference = 'Stop'
$raiz = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$copias = Join-Path (Split-Path (Split-Path $raiz -Parent) -Parent) '_copias\veoveo'
$ks = Join-Path $copias 'veoveo-upload.jks'
$datos = Join-Path $copias 'upload-key.txt'
if (-not (Test-Path $ks) -or -not (Test-Path $datos)) { throw "Falta la upload key en $copias." }
$clave = @{}
Get-Content $datos | Where-Object { $_ -match '^(\w+)=(.*)$' } | ForEach-Object { $clave[$Matches[1]] = $Matches[2] }

# Nada de pruebas en el proceso: la app de Play usa producción
Remove-Item Env:APP_ENV -ErrorAction SilentlyContinue
if ($env:EXPO_PUBLIC_FIREBASE_PROJECT_ID -eq 'veoveo-pruebas') { throw 'Entorno de pruebas en el proceso. Abre una consola nueva.' }
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
$env:VEOVEO_KS = $ks
$env:VEOVEO_KS_ALIAS = $clave['alias']
$env:VEOVEO_KS_PASS = $clave['storepass']
$env:VEOVEO_KEY_PASS = $clave['keypass']

# Rutas cortas (gradle en Windows): W: = carpeta proyectos
if (-not (Test-Path 'W:\')) { subst W: (Split-Path $raiz -Parent) }
$nombre = Split-Path $raiz -Leaf
$android = Join-Path 'W:\' (Join-Path $nombre 'android')
Push-Location (Join-Path 'W:\' $nombre)
try { npx expo prebuild --platform android --clean --no-install | Out-Null; if ($LASTEXITCODE) { throw 'Falló expo prebuild.' } }
finally { Pop-Location }

# Firma de release por init script (fuera de android/, que se regenera en cada prebuild)
$init = Join-Path $PSScriptRoot 'firma-release.gradle'
Push-Location $android
# Solo arm64-v8a: con armeabi-v7a la ruta de CMake de reanimated pasa de 260 caracteres en Windows.
# Play exige 64 bits; los móviles solo de 32 bits son rarísimos.
try {
  .\gradlew.bat bundleRelease --no-daemon '-PreactNativeArchitectures=arm64-v8a' -I $init -q
  if ($LASTEXITCODE) { throw 'Falló gradle bundleRelease.' }
}
finally { Pop-Location }

$aab = Join-Path $android 'app\build\outputs\bundle\release\app-release.aab'
if (-not (Test-Path $aab)) { throw 'No se generó el AAB.' }
$bundle = Join-Path $android 'app\build\generated\assets\createBundleReleaseJsAndAssets\index.android.bundle'
# «@veoveo-pruebas.test» es el alias de login del APK de pruebas (LoginScreen, solo con la app «VeoVeo Test»)
if (Select-String -Path $bundle -Pattern '(?<!@)veoveo-pruebas(?!\.test)' -Quiet) { throw 'El bundle lleva el proyecto de PRUEBAS. No se sube.' }
if (-not (Select-String -Path $bundle -Pattern 'veoveo-48667' -SimpleMatch -Quiet)) { throw 'El bundle no lleva veoveo-48667.' }

$app = (Get-Content (Join-Path $raiz 'app.json') -Raw | ConvertFrom-Json).expo
$salida = Join-Path $copias "veoveo-$($app.version)-$($app.android.versionCode).aab"
Copy-Item $aab $salida -Force
Write-Host "AAB listo (producción, $($app.version) / $($app.android.versionCode)): $salida"
