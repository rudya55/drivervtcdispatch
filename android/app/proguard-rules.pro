# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# ==========================================
# Capacitor Core Rules
# ==========================================

# Keep Capacitor plugin classes
-keep class com.getcapacitor.** { *; }
-keep class com.capacitor.** { *; }

# Keep Capacitor Bridge
-keepclassmembers class com.getcapacitor.Bridge {
    *;
}

# Keep Capacitor Plugin annotations
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod public *;
}

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# ==========================================
# WebView and JavaScript Interface
# ==========================================

# Keep JavaScript interface for WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep WebView classes
-keepclassmembers class * extends android.webkit.WebViewClient {
    *;
}

-keepclassmembers class * extends android.webkit.WebChromeClient {
    *;
}

# ==========================================
# Supabase / Network Libraries
# ==========================================

# Keep OkHttp classes
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**

# Keep Retrofit if used
-keep class retrofit2.** { *; }
-keepattributes Signature
-keepattributes Exceptions

# Keep Gson if used
-keep class com.google.gson.** { *; }
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# ==========================================
# Firebase / Google Services
# ==========================================

# Keep Firebase classes
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Firebase Cloud Messaging
-keep class com.google.firebase.messaging.** { *; }
-keepclassmembers class com.google.firebase.messaging.FirebaseMessagingService {
    *;
}

# ==========================================
# Geolocation
# ==========================================

# Keep Location classes
-keep class android.location.** { *; }
-keep class com.google.android.gms.location.** { *; }
-dontwarn com.google.android.gms.location.**

# Background Geolocation plugin
-keep class com.transistorsoft.** { *; }
-dontwarn com.transistorsoft.**

# ==========================================
# Push Notifications
# ==========================================

# Keep notification related classes
-keep class androidx.core.app.NotificationCompat { *; }
-keep class androidx.core.app.NotificationCompat$Builder { *; }

# ==========================================
# General Android Rules
# ==========================================

# Keep Android support libraries
-keep class androidx.** { *; }
-keep interface androidx.** { *; }
-dontwarn androidx.**

# Keep Parcelable implementations
-keepclassmembers class * implements android.os.Parcelable {
    static ** CREATOR;
}

# Keep Serializable classes
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# Keep R classes
-keepclassmembers class **.R$* {
    public static <fields>;
}

# ==========================================
# Debugging / Stack Traces
# ==========================================

# Keep line number information for debugging stack traces
-keepattributes SourceFile,LineNumberTable

# Hide the original source file name in stack traces
-renamesourcefileattribute SourceFile

# Keep annotations
-keepattributes *Annotation*

# ==========================================
# Optimization Settings
# ==========================================

# Don't warn about missing classes that are not used
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**

# Optimize code
-optimizations !code/simplification/arithmetic,!field/*,!class/merging/*

# ==========================================
# App-Specific Rules
# ==========================================

# Keep the main activity
-keep class com.lovable.drivervtcdispatch.MainActivity { *; }

# Keep any custom Application class
-keep class * extends android.app.Application { *; }
