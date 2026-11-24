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
                val md5Digest = MessageDigest.getInstance("MD5")
                val sha256Digest = MessageDigest.getInstance("SHA-256")
                val out = Arguments.createArray()
                var done = 0

                for (app in apps) {
                    done++
                    val hashes = runCatching { hashesOf(app.sourceDir, md5Digest, sha256Digest) }.getOrNull()
                    emitProgress(done, total)
                    if (hashes == null) continue
                    out.pushMap(Arguments.createMap().apply {
                        putString("package_name", app.packageName)
                        putString("md5", hashes.first)
                        putString("sha256", hashes.second)
                    })
                }
                promise.resolve(out)
            } catch (e: Exception) {
                promise.reject("SCAN_FAILED", e.message, e) 
            }
        }.start()
    }

    private fun hashesOf(path: String, md5Digest: MessageDigest, sha256Digest: MessageDigest): Pair<String, String> {
        md5Digest.reset()
        sha256Digest.reset()
        FileInputStream(path).use { stream ->
            val buf = ByteArray(64 * 1024)
            while (true) {
                val n = stream.read(buf)
                if (n <= 0) break
                md5Digest.update(buf, 0, n)
                sha256Digest.update(buf, 0, n)
            }
        }
        val md5 = md5Digest.digest().joinToString("") { "%02x".format(it) }
        val sha256 = sha256Digest.digest().joinToString("") { "%02X".format(it) }
        return Pair(md5, sha256)
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
