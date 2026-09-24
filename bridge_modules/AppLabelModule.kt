package com.anonymous.icsas2

import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.Drawable
import android.net.Uri
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import java.io.File
import java.io.FileOutputStream

class AppLabelModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "AppLabel"

    @ReactMethod
    fun getLabels(packageNames: ReadableArray, promise: Promise) {
        val pm: PackageManager? = reactApplicationContext.packageManager
        val out = Arguments.createMap()
        if (pm != null) {
            for (i in 0 until packageNames.size()) {
                val pkg = packageNames.getString(i) ?: continue
                try {
                    out.putString(pkg, pm.getApplicationInfo(pkg, 0).loadLabel(pm).toString())
                } catch (e: Exception) {  }
            }
        }
        promise.resolve(out)
    }

    @ReactMethod
    fun getIcons(packageNames: ReadableArray, promise: Promise) {
        val pm: PackageManager? = reactApplicationContext.packageManager
        val out = Arguments.createMap()
        if (pm != null) {
            val dir = File(reactApplicationContext.cacheDir, "ns_icons").apply { mkdirs() }
            for (i in 0 until packageNames.size()) {
                val pkg = packageNames.getString(i) ?: continue
                try {
                    val file = File(dir, pkg.replace(Regex("[^A-Za-z0-9_]"), "_") + ".png")
                    if (!file.exists() || file.length() == 0L) {
                        val bmp = drawableToBitmap(pm.getApplicationIcon(pkg), 144)
                        FileOutputStream(file).use { bmp.compress(Bitmap.CompressFormat.PNG, 90, it) }
                        bmp.recycle()
                    }
                    out.putString(pkg, Uri.fromFile(file).toString())
                } catch (e: Exception) {  }
            }
        }
        promise.resolve(out)
    }

    private fun drawableToBitmap(drawable: Drawable, size: Int): Bitmap {
        val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        drawable.setBounds(0, 0, size, size)
        drawable.draw(canvas)
        return bmp
    }
}