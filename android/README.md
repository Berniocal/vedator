# Vedátor pro Android – 0.1.0

První samostatná APK pro Android 8 a novější. Identifikátor: `cz.bernio.vedator`.

Telefon používá aktuální rozhraní z https://bernio.cz/vedator/. Pouze uvnitř APK
se do jeho hlavní uzávěry přidá `native-adapter.js`. Produkční HTML ani JavaScript
se kvůli APK nemění. AndroidX WebKit povoluje komunikaci jen hlavnímu dokumentu
na HTTPS originu `bernio.cz`; formuláře a jiné rámce nemají nativní přístup.

Zvuk přehrává Media3 ExoPlayer v `MediaLibraryService`: fronta, další/předchozí díl,
posouvání, rychlost, audio focus, odpojení sluchátek, systémová notifikace a ovládání
na zamčené obrazovce. Fronta a průběh poslechu přetrvávají i bez WebView.
Při opětovném spuštění se obnoví pozice, zvuk zůstane pozastavený.
Pro MP3 se známou chybnou Xing tabulkou se používají ověřené kotvy z
`audio-seek-index.json`; změněná velikost souboru způsobí návrat k běžnému extraktoru.

Android Auto má vlastní seznam nových/rozposlouchaných epizod, sérií, playlistů
a offline dílů. Zahrnuje speciály i časové značky otázek. Soukromá instalace mimo
Google Play může vyžadovat vývojářský režim Android Auto → Neznámé zdroje.
Emulátor testuje službu a klienta MediaBrowser; konkrétní infotainment je nutné
ověřit v autě. Aplikace zatím není distribuovaná přes Google Play.

## Data a offline

Android má vlastní úložiště. Z webu se průběh poslechu a playlisty přenesou
přes Moje data → Stáhnout zálohu / Načíst zálohu. Nevzniká automatická synchronizace
s prohlížečem. APK uchovává data při běžné aktualizaci.

Katalog a rozhraní mají uloženou kopii i kopii zabalenou v APK. Offline MP3 ukládá
Android DownloadManager do soukromého adresáře aplikace. Tlačítko MP3 stahuje
samostatný soubor do systémové složky Stažené soubory.

## Aktualizace

Webové rozhraní a katalog se obnovují z bernio.cz. Nativní kód vyžaduje novou APK.
Kontrola `main/android/latest.json` proběhne jednou denně při otevření a ručně
v nabídce. Pro vyšší versionCode je povinný HTTPS odkaz na release tohoto repa
a SHA-256. Před instalací se ověřuje také identifikátor, verze a shoda podpisu
s nainstalovanou aplikací. Instalaci potvrzuje uživatel v Androidu.

Pro verzi 0.1 je manifest bez novějšího balíčku. Nové podepsané verze je třeba
publikovat do GitHub Releases a aktualizovat `latest.json`. Samotné sestavení
v Actions je automatické. Podpisový klíč a heslo nejsou součástí repozitáře;
záloha je uložena samostatně. Bez stejného klíče nelze vydat běžnou aktualizaci.

## Sestavení a ověření

JDK 17, Gradle 8.13, Android SDK 36 / build-tools 36.0.0.

```
node android/tools/prepare-assets.mjs
cd android
gradle :app:assembleRelease :app:testDebugUnitTest :app:lintRelease
gradle :app:connectedDebugAndroidTest
```

`android/tools/test-bridge.mjs` testuje současné webové rozhraní s nativním
protokolem (Puppeteer). Android instrumentované testy používají skutečný MP3,
Media3 a emulátor: posun, pauza, přechody na pozadí, průběh poslechu a knihovna.
Testovací přesměrování na lokální MP3 a vypnutí sítě jsou povolena jen v debug
sestavení. V release je `BuildConfig.DEBUG=false`.

Výstup Actions je nepodepsaná release APK, která se podepisuje uchovaným klíčem:

```
java -jar apksigner.jar sign --ks /soukroma/cesta/vedator-signing.p12 \
  --ks-key-alias vedator --ks-pass file:/soukroma/cesta/signing-password.txt \
  --out Vedator-0.1.0.apk Vedator-0.1.0-unsigned.apk
java -jar apksigner.jar verify --verbose --print-certs Vedator-0.1.0.apk
```

Klíč ani heslo nevkládat do veřejného repozitáře. Změna APK musí zvýšit versionCode.
