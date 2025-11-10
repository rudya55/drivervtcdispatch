# Guide rapide : Compilation APK Android

Ce fichier explique comment compiler une APK Android à partir de ce projet.

## Prérequis
- Un ordinateur (Windows, Mac, Linux)
- Android Studio installé (https://developer.android.com/studio)
- Le SDK Android installé automatiquement avec Android Studio

## Étapes
1. **Ouvre Android Studio**
2. **Importe le projet** : Sélectionne le dossier `/android` du projet
3. **Attends la synchronisation Gradle**
4. **Compile l’APK** :
   - Menu `Build > Build Bundle(s)/APK(s) > Build APK(s)`
   - L’APK sera générée dans `android/app/build/outputs/apk/debug/app-debug.apk`
5. **Transfère l’APK sur ton téléphone** et installe-la

## Note
- La compilation n’est pas possible directement sur un téléphone ou dans un environnement sans SDK Android.
- Pour tester sur mobile sans APK, utilise l’URL web du serveur dans le navigateur de ton téléphone.

---
Pour toute question, demande à GitHub Copilot !
