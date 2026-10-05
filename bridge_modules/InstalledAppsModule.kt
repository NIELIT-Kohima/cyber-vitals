package cyber.vitals.nielit

import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Base64
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager
import java.io.ByteArrayOutputStream

class InstalledAppsModule(private val ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {
    override fun getName() = "InstalledApps"

    private val pm get() = ctx.packageManager

    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        try {
            val out = Arguments.createArray()
            for (app in pm.getInstalledApplications(0)) {
                val pi = pm.getPackageInfo(app.packageName, PackageManager.GET_PERMISSIONS)
                out.pushMap(Arguments.createMap().apply {
                    putString("packageName", app.packageName)
                    putString("label", pm.getApplicationLabel(app).toString())
                    putString("versionName", pi.versionName ?: "")
                    putDouble("targetSdk", app.targetSdkVersion.toDouble())
                    putDouble("lastUpdate", pi.lastUpdateTime.toDouble())
                    putBoolean("debuggable", app.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0)
                    putBoolean("system", app.flags and ApplicationInfo.FLAG_SYSTEM != 0)
                    putString("installer", installerOf(app.packageName))
                    putString("icon", iconOf(app.packageName))
                    putBoolean("launchable", pm.getLaunchIntentForPackage(app.packageName) != null)
                    putArray("permissions", Arguments.createArray().apply {
                        pi.requestedPermissions?.forEach { pushString(it) }
                    })
                })
            }
            promise.resolve(out)
        } catch (e: Exception) { promise.reject("E_SCAN", e) }
    }

    private fun installerOf(pkg: String): String? = try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) pm.getInstallSourceInfo(pkg).installingPackageName
        else @Suppress("DEPRECATION") pm.getInstallerPackageName(pkg)
    } catch (_: Exception) { null }

    private fun iconOf(pkg: String): String = try {
        val d = pm.getApplicationIcon(pkg)
        val b = Bitmap.createBitmap(d.intrinsicWidth.coerceAtLeast(1), d.intrinsicHeight.coerceAtLeast(1), Bitmap.Config.ARGB_8888)
        d.setBounds(0, 0, b.width, b.height); d.draw(Canvas(b))
        val s = ByteArrayOutputStream()
        Bitmap.createScaledBitmap(b, 96, 96, true).compress(Bitmap.CompressFormat.PNG, 90, s)
        Base64.encodeToString(s.toByteArray(), Base64.NO_WRAP)
    } catch (_: Exception) { "" }

    @ReactMethod
    fun openApp(pkg: String, promise: Promise) {
        val i = pm.getLaunchIntentForPackage(pkg)
        if (i == null) promise.resolve(false)
        else { ctx.startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); promise.resolve(true) }
    }

    @ReactMethod
    fun uninstallApp(pkg: String) {
        ctx.startActivity(Intent(Intent.ACTION_DELETE, Uri.parse("package:$pkg")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    @ReactMethod
    fun openSettings(pkg: String) {
        ctx.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$pkg")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
}

class InstalledAppsPackage : ReactPackage {
    override fun createNativeModules(ctx: ReactApplicationContext): List<NativeModule> {
        return listOf(InstalledAppsModule(ctx))
    }

    override fun createViewManagers(ctx: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}