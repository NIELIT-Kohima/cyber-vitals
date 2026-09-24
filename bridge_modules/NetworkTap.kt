package com.anonymous.icsas2

import android.app.Activity
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.net.ConnectivityManager
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import android.util.Base64
import com.facebook.react.ReactApplication
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.uimanager.ViewManager
import java.io.ByteArrayOutputStream
import java.io.FileInputStream
import java.net.InetSocketAddress
import kotlin.concurrent.thread

class NetworkTapPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(NetworkTapModule(reactContext))
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}

class NetworkTapModule(private val rc: ReactApplicationContext) :
    ReactContextBaseJavaModule(rc), ActivityEventListener {

    companion object { private const val REQ_VPN = 7777 }

    init { rc.addActivityEventListener(this) }

    override fun getName(): String = "NetworkTapModule"

    private fun emit(name: String, data: WritableMap?) {
        reactApplicationContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit(name, data)
    }

    private fun startService(ctx: Context) {
        val i = Intent(ctx, TapVpnService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ctx.startForegroundService(i)
        else ctx.startService(i)
    }

    @ReactMethod
    fun startTap(promise: Promise) {
        val ctx = reactApplicationContext ?: return promise.reject("E_NO_CTX", "no context")
        val confirm = VpnService.prepare(ctx)
        if (confirm != null) {
            val act = reactApplicationContext.currentActivity
            if (act == null) { promise.reject("E_NO_ACTIVITY", "no activity for VPN dialog"); return }
            act.startActivityForResult(confirm, REQ_VPN)
            promise.resolve("permission")
        } else {
            startService(ctx)
            promise.resolve("active")
        }
    }

    @ReactMethod
    fun stopTap(promise: Promise) {
        reactApplicationContext?.stopService(Intent(reactApplicationContext, TapVpnService::class.java))
        promise.resolve(true)
    }

    @ReactMethod
    fun getStatus(promise: Promise) { promise.resolve(TapVpnService.state) }

    @ReactMethod
    fun drainEvents(promise: Promise) { promise.resolve(TapVpnService.drain()) }

    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        val ctx = reactApplicationContext ?: return promise.reject("E_NO_CTX", "no context")
        thread {
            val pm = ctx.packageManager
            val arr = Arguments.createArray()
            runCatching {
                for (ai in pm.getInstalledApplications(0)) {
                    val m = Arguments.createMap()
                    m.putInt("uid", ai.uid)
                    m.putString("pkg", ai.packageName)
                    m.putString("label", runCatching { ai.loadLabel(pm).toString() }.getOrDefault(ai.packageName))
                    runCatching {
                        val icon = ai.loadIcon(pm)
                        val bmp = Bitmap.createBitmap(96, 96, Bitmap.Config.ARGB_8888)
                        val canvas = Canvas(bmp)
                        icon.setBounds(0, 0, 96, 96)
                        icon.draw(canvas)
                        val os = ByteArrayOutputStream()
                        bmp.compress(Bitmap.CompressFormat.PNG, 80, os)
                        m.putString("icon", Base64.encodeToString(os.toByteArray(), Base64.NO_WRAP))
                    }
                    arr.pushMap(m)
                }
            }
            promise.resolve(arr)
        }
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != REQ_VPN) return
        val ctx = reactApplicationContext ?: return
        if (resultCode == Activity.RESULT_OK) startService(ctx)
        else {
            val m = Arguments.createMap()
            m.putString("state", "error")
            m.putString("msg", "VPN permission denied by user")
            emit("NetworkTapStatus", m)
        }
    }

    override fun onNewIntent(intent: Intent) = Unit
}

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != Intent.ACTION_BOOT_COMPLETED) return
        if (VpnService.prepare(context) != null) return
        val i = Intent(context, TapVpnService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(i)
        else context.startService(i)
    }
}

class TapVpnService : VpnService() {

    companion object {
        @Volatile var state: String = "stopped"
        private const val BUFFER_CAP = 20000
        private val buffer = ArrayDeque<WritableMap>()

        @Synchronized
        fun push(ev: WritableMap) {
            buffer.addLast(ev)
            while (buffer.size > BUFFER_CAP) buffer.removeFirst()
        }

        @Synchronized
        fun drain(): WritableArray {
            val out = Arguments.createArray()
            for (ev in buffer) out.pushMap(ev.copy())
            buffer.clear()
            return out
        }

        @Synchronized
        fun publish(rc: ReactContext?, name: String, ev: WritableMap) {
            push(ev.copy())
            rc?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)?.emit(name, ev)
        }
    }

    private var pfd: ParcelFileDescriptor? = null
    @Volatile private var running = false
    private val conns = HashMap<String, Conn>()
    private val dnsMap = HashMap<String, String>()
    private val batch = ArrayList<WritableMap>(64)
    private var lastFlush = 0L

    private class Conn(
        val uid: Int, val ip: String, val port: Int, val proto: String,
        val domain: String?, val src: String?, val ts: Long
    ) { var bytes: Long = 0; var last: Long = ts }

    private fun getReactContext(): ReactContext? {
        val app = applicationContext as? ReactApplication ?: return null
        return try {
            app.reactHost?.currentReactContext
        } catch (e: Throwable) {
            try {
                @Suppress("DEPRECATION")
                app.reactNativeHost?.reactInstanceManager?.currentReactContext
            } catch (e2: Throwable) {
                null
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (running) return START_STICKY
        startForegroundNotify()
        pfd = Builder()
            .setSession("NetTap")
            .setMtu(1400)
            .addAddress("10.8.0.2", 32)
            .addRoute("0.0.0.0", 0)
            .addDnsServer("8.8.8.8")
            .establish()
        if (pfd == null) { stopSelf(); return START_NOT_STICKY }
        state = "active"
        status("active")
        running = true
        thread(name = "tap-read") { readLoop() }
        thread(name = "tap-sweep") { sweepLoop() }
        return START_STICKY
    }

    override fun onDestroy() {
        running = false
        runCatching { pfd?.close() }
        pfd = null
        state = "stopped"
        status("stopped")
        super.onDestroy()
    }

    private fun startForegroundNotify() {
        val small = android.R.drawable.ic_menu_info_details
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
            if (nm.getNotificationChannel("tap") == null)
                nm.createNotificationChannel(NotificationChannel("tap", "Network tap", NotificationManager.IMPORTANCE_LOW))
            startForeground(1, Notification.Builder(this, "tap").setContentTitle("Network tap active").setSmallIcon(small).build())
        } else {
            @Suppress("DEPRECATION")
            startForeground(1, Notification.Builder(this).setContentTitle("Network tap active").setSmallIcon(small).build())
        }
    }

    private fun status(state: String, msg: String? = null) {
        val m = Arguments.createMap()
        m.putString("state", state)
        m.putDouble("ts", System.currentTimeMillis().toDouble())
        if (msg != null) m.putString("msg", msg)
        publish(getReactContext(), "NetworkTapStatus", m)
    }

    private fun flush(now: Long) {
        if (batch.isEmpty() || now - lastFlush < 500) return
        val arr = Arguments.createArray()
        for (ev in batch) { push(ev.copy()); arr.pushMap(ev) }
        batch.clear()
        lastFlush = now
        
        val payload = Arguments.createMap()
        payload.putArray("events", arr)
        
        getReactContext()
            ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit("NetworkTapEvents", payload)
    }

    private fun readLoop() {
        val fd = pfd?.fileDescriptor ?: return
        val ins = FileInputStream(fd)
        val buf = ByteArray(32767)
        while (running) {
            val n = runCatching { ins.read(buf) }.getOrDefault(-1)
            if (n < 0) break
            if (n > 0) runCatching { handlePacket(buf, n) }
        }
        runCatching { ins.close() }
    }

    private fun sweepLoop() {
        while (running) {
            Thread.sleep(15000)
            val now = System.currentTimeMillis()
            synchronized(conns) {
                val it = conns.entries.iterator()
                while (it.hasNext()) {
                    val e = it.next()
                    val timeout = if (e.value.proto == "quic" || e.value.proto == "dns") 60000L else 300000L
                    if (now - e.value.last > timeout) { it.remove(); closeEvent(e.value, now) }
                }
                flush(now)
            }
        }
    }

    private fun closeEvent(c: Conn, now: Long) {
        val m = Arguments.createMap()
        m.putString("t", "close")
        m.putInt("uid", c.uid)
        m.putString("ip", c.ip)
        m.putInt("port", c.port)
        m.putString("proto", c.proto)
        m.putDouble("bytes", c.bytes.toDouble())
        m.putDouble("dur", (now - c.ts) / 1000.0)
        m.putDouble("ts", now.toDouble())
        batch.add(m)
    }

    private fun handlePacket(b: ByteArray, n: Int) {
        if ((b[0].toInt() and 0xF0) ushr 4 != 4) return           
        val ihl = (b[0].toInt() and 0x0F) * 4
        if (ihl < 20 || n < ihl + 8) return
        val l4 = b[9].toInt() and 0xFF
        if (l4 != 6 && l4 != 17) return
        val sip = ipStr(b, 12)
        val dip = ipStr(b, 16)
        val sp = u16(b, ihl)
        val dp = u16(b, ihl + 2)
        val hdr = if (l4 == 6) ihl + ((b[ihl + 12].toInt() and 0xF0) ushr 2) else ihl + 8
        if (hdr >= n) return
        val payload = n - hdr
        val now = System.currentTimeMillis()

        var proto: String
        var domain: String? = null
        var src: String? = null
        when {
            dp == 53 || sp == 53 -> {
                proto = "dns"
                val q = parseDns(b, hdr, payload)
                if (q != null) { domain = q; src = "dns" }
            }
            l4 == 6 && dp == 443 && (b[hdr].toInt() and 0xFF) == 0x16 -> {
                proto = "tls"
                val sni = parseSni(b, hdr, payload)
                if (sni != null) { domain = sni; src = "sni" }
            }
            l4 == 6 && (dp == 80 || dp == 8080) -> proto = "clear"
            l4 == 17 && dp == 443 -> proto = "quic"
            else -> proto = "other"
        }
        if (domain == null) {
            domain = dnsMap[dip]
            if (domain != null) src = "dns"
        }

        val finRst = l4 == 6 && ((b[ihl + 13].toInt() and 0x09) != 0)
        val key = "$sip:$sp->$dip:$dp/$l4"

        synchronized(conns) {
            val existing = conns[key]
            if (existing != null) {
                existing.bytes += payload
                existing.last = now
                if (finRst) { conns.remove(key); closeEvent(existing, now) }
                flush(now)
                return
            }
            val uid = uidFor(l4 == 6, sip, sp, dip, dp)
            val conn = Conn(uid, dip, dp, proto, domain, src, now)
            conn.bytes = payload.toLong()
            conns[key] = conn

            val m = Arguments.createMap()
            m.putString("t", "open")
            m.putInt("uid", uid)
            m.putString("ip", dip)
            m.putInt("port", dp)
            m.putString("proto", proto)
            if (domain != null) m.putString("domain", domain)
            if (src != null) m.putString("src", src)
            m.putDouble("ts", now.toDouble())
            batch.add(m)
            flush(now)
        }
    }

    private fun uidFor(tcp: Boolean, sip: String, sp: Int, dip: String, dp: Int): Int {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return -1
        return runCatching {
            val cm = getSystemService(CONNECTIVITY_SERVICE) as ConnectivityManager
            val proto = if (tcp) 6 else 17 
            cm.getConnectionOwnerUid(proto, InetSocketAddress(sip, sp), InetSocketAddress(dip, dp))
        }.getOrDefault(-1)
    }

    private fun u16(b: ByteArray, o: Int) = ((b[o].toInt() and 0xFF) shl 8) or (b[o + 1].toInt() and 0xFF)
    private fun ipStr(b: ByteArray, o: Int) =
        "${b[o].toInt() and 0xFF}.${b[o + 1].toInt() and 0xFF}.${b[o + 2].toInt() and 0xFF}.${b[o + 3].toInt() and 0xFF}"

    private fun parseSni(b: ByteArray, off: Int, len: Int): String? {
        if (len < 43 || (b[off].toInt() and 0xFF) != 0x16) return null
        var i = off + 5                                   
        if ((b[i].toInt() and 0xFF) != 1) return null     
        i += 4                                           
        i += 2 + 32                                       
        if (i >= off + len) return null
        val sidLen = b[i].toInt() and 0xFF; i += 1 + sidLen
        if (i + 2 > off + len) return null
        val csLen = u16(b, i); i += 2 + csLen
        if (i >= off + len) return null
        val compLen = b[i].toInt() and 0xFF; i += 1 + compLen
        if (i + 2 > off + len) return null
        val extEnd = i + 2 + u16(b, i); i += 2
        while (i + 4 <= extEnd && extEnd <= off + len) {
            val type = u16(b, i)
            val l = u16(b, i + 2)
            i += 4
            if (type == 0 && i + 5 <= off + len) {       
                val nameLen = u16(b, i + 3)
                val nameStart = i + 5
                if (nameStart + nameLen <= off + len)
                    return String(b, nameStart, nameLen, Charsets.US_ASCII)
            }
            i += l
        }
        return null
    }

    private fun parseDns(b: ByteArray, off: Int, len: Int): String? {
        if (len < 17) return null
        val flags = u16(b, off + 2)
        val anCount = u16(b, off + 6)
        var i = off + 12
        val name = StringBuilder()
        while (i < off + len) {
            val l = b[i].toInt() and 0xFF
            if (l == 0) { i++; break }
            if (l and 0xC0 == 0xC0) { i += 2; break }
            if (i + 1 + l > off + len) return null
            if (name.isNotEmpty()) name.append('.')
            name.append(String(b, i + 1, l, Charsets.US_ASCII))
            i += 1 + l
        }
        if (name.isEmpty()) return null
        if (flags and 0x8000 == 0) return name.toString()   
        i += 4                                              
        repeat(anCount) {
            if (i >= off + len) return@repeat
            if (b[i].toInt() and 0xC0 == 0xC0) i += 2
            else while (i < off + len) {
                val l = b[i].toInt() and 0xFF
                if (l == 0) { i++; break }
                if (l and 0xC0 == 0xC0) { i += 2; break }
                i += 1 + l
            }
            if (i + 10 > off + len) return@repeat
            val type = u16(b, i)
            val rdLen = u16(b, i + 8)
            i += 10
            if (type == 1 && rdLen == 4 && i + 4 <= off + len) {
                dnsMap[ipStr(b, i)] = name.toString()
                if (dnsMap.size > 1024) dnsMap.clear()
            }
            i += rdLen
        }
        return name.toString()
    }
}