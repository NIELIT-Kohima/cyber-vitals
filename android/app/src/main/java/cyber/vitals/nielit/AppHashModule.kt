package cyber.vitals.nielit

import android.content.pm.PackageManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.FileInputStream
import java.security.MessageDigest

class AppHashModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "AppHashModule"

    @ReactMethod
    fun scanInstalledApps(promise: Promise) {
        Thread {
            try {
                val pm = reactContext.packageManager
                @Suppress("DEPRECATION")
                val apps = pm.getInstalledApplications(PackageManager.GET_META_DATA)
                    .filter { !it.sourceDir.isNullOrEmpty() }
                    .distinctBy { it.packageName }

                val total = apps.size
                val digest = MessageDigest.getInstance("MD5")
                val out = Arguments.createArray()
                var done = 0

                for (app in apps) {
                    done++
                    val md5 = runCatching { md5Of(app.sourceDir, digest) }.getOrNull()
                    emitProgress(done, total)
                    if (md5 == null) continue
                    out.pushMap(Arguments.createMap().apply {
                        putString("package_name", app.packageName)
                        putString("md5", md5)
                    })
                }
                promise.resolve(out)
            } catch (e: Exception) {
                promise.reject("SCAN_FAILED", e.message, e) 
            }
        }.start()
    }

    private fun md5Of(path: String, digest: MessageDigest): String {
        digest.reset()
        FileInputStream(path).use { stream ->
            val buf = ByteArray(64 * 1024)
            while (true) {
                val n = stream.read(buf)
                if (n <= 0) break
                digest.update(buf, 0, n)
            }
        }
        return digest.digest().joinToString("") { "%02x".format(it) }
    }

    private fun emitProgress(done: Int, total: Int) {
        val payload = Arguments.createMap().apply {
            putString("phase", "hash")
            putInt("done", done)
            putInt("total", total)
        }
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(PROGRESS_EVENT, payload)
    }
    @ReactMethod fun addListener(eventName: String?) {}
    @ReactMethod fun removeListeners(count: Int?) {}

    companion object {
        private const val PROGRESS_EVENT = "AppHashProgress" 
    }
}