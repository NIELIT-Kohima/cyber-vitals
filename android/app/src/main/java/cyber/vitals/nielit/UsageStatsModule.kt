package cyber.vitals.nielit

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import android.os.Process
import android.provider.Settings
import android.util.Base64
import android.app.usage.UsageStatsManager
import android.app.usage.UsageStats
import android.app.usage.UsageEvents
import android.graphics.drawable.Drawable
import java.io.ByteArrayOutputStream
import com.facebook.react.bridge.*
import com.facebook.react.ReactPackage
import com.facebook.react.uimanager.ViewManager
import com.facebook.react.bridge.NativeModule

class UsageStatsModule(ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {
    override fun getName() = "UsageStatsModule"
    private val usm: UsageStatsManager get() = reactApplicationContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    private val pm: PackageManager get() = reactApplicationContext.packageManager

    private fun hasPerm(): Boolean {
        val am = reactApplicationContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= 29) {
            am.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), reactApplicationContext.packageName)
        } else {
            @Suppress("DEPRECATION") am.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), reactApplicationContext.packageName)
        }
        return mode == AppOpsManager.MODE_ALLOWED
    }

    @ReactMethod
    fun hasPermission(p: Promise) {
        p.resolve(hasPerm())
    }

    @ReactMethod
    fun openUsageAccessSettings() {
        val i = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactApplicationContext.startActivity(i)
    }

    private fun icon(pkg: String): String? {
        return try {
            val d: Drawable = pm.getApplicationIcon(pkg)
            val b = Bitmap.createBitmap(96, 96, Bitmap.Config.ARGB_8888)
            d.setBounds(0, 0, 96, 96)
            d.draw(Canvas(b))
            val out = ByteArrayOutputStream()
            b.compress(Bitmap.CompressFormat.PNG, 90, out)
            Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
        } catch (_: Exception) {
            null
        }
    }

    private fun metaMap(pkg: String, total: Long, last: Long): ReadableMap {
        val ai = pm.getApplicationInfo(pkg, 0)
        val pi = pm.getPackageInfo(pkg, 0)
        val src = try {
            if (Build.VERSION.SDK_INT >= 30) {
                pm.getInstallSourceInfo(pkg).installingPackageName
            } else {
                @Suppress("DEPRECATION") pm.getInstallerPackageName(pkg)
            }
        } catch (_: Exception) {
            null
        }

        val map = Arguments.createMap()
        map.putString("pkg", pkg)
        map.putString("label", pm.getApplicationLabel(ai).toString())
        map.putDouble("totalMs", total.toDouble())
        map.putDouble("lastUsed", last.toDouble())
        map.putInt("bucket", 0) 
        map.putString("icon", icon(pkg))
        map.putString("installer", src ?: "")
        map.putBoolean("system", ai.flags and ApplicationInfo.FLAG_SYSTEM != 0)
        map.putInt("targetSdk", ai.targetSdkVersion)
        map.putDouble("updated", pi.lastUpdateTime.toDouble())
        map.putDouble("firstInstall", pi.firstInstallTime.toDouble())
        map.putBoolean("debuggable", ai.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0)
        return map
    }

    @ReactMethod
    fun getAppUsage(start: Double, end: Double, p: Promise) {
        if (!hasPerm()) {
            p.reject(Error("Usage access not granted"))
            return
        }
        try {
            val arr = Arguments.createArray()
            val statsList = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, start.toLong(), end.toLong())
            val grouped = statsList.groupBy { it.packageName }
            
            for ((pkg, list) in grouped) {
                var total: Long = 0L
                var lastUsed: Long = 0L
                for (stat in list) {
                    total += stat.getTotalTimeInForeground()
                    val last = stat.getLastTimeUsed()
                    if (last > lastUsed) {
                        lastUsed = last
                    }
                }
                if (total > 0) {
                    arr.pushMap(metaMap(pkg, total, lastUsed))
                }
            }
            p.resolve(arr)
        } catch (e: Exception) {
            p.reject(e)
        }
    }

    @ReactMethod
    fun getAppInfo(pkg: String, start: Double, end: Double, p: Promise) {
        if (!hasPerm()) {
            p.reject(Error("Usage access not granted"))
            return
        }
        try {
            val list = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, start.toLong(), end.toLong())
                .filter { it.packageName == pkg }
            var total: Long = 0L
            var lastUsed: Long = 0L
            for (stat in list) {
                total += stat.getTotalTimeInForeground()
                val last = stat.getLastTimeUsed()
                if (last > lastUsed) {
                    lastUsed = last
                }
            }
            p.resolve(metaMap(pkg, total, lastUsed))
        } catch (e: Exception) {
            p.reject(e)
        }
    }

    @ReactMethod
    fun getEvents(pkg: String, start: Double, end: Double, p: Promise) {
        if (!hasPerm()) {
            p.reject(Error("Usage access not granted"))
            return
        }
        try {
            val ev = usm.queryEvents(start.toLong(), end.toLong())
            val arr = Arguments.createArray()
            val e = UsageEvents.Event()
            while (ev.hasNextEvent()) {
                ev.getNextEvent(e)
                if (e.packageName != pkg) continue
                
                val t = when (e.eventType) {
                    UsageEvents.Event.ACTIVITY_RESUMED -> "resume"
                    UsageEvents.Event.ACTIVITY_PAUSED -> "pause"
                    else -> null
                }
                
                if (t != null) {
                    val map = Arguments.createMap()
                    map.putString("type", t)
                    map.putDouble("ts", e.timeStamp.toDouble())
                    arr.pushMap(map)
                }
            }
            p.resolve(arr)
        } catch (ex: Exception) {
            p.reject(ex)
        }
    }
}

class UsageStatsPackage : ReactPackage {
    override fun createNativeModules(ctx: ReactApplicationContext): List<NativeModule> {
        return listOf(UsageStatsModule(ctx))
    }

    override fun createViewManagers(ctx: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}