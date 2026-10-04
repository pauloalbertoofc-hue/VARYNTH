package com.varynth.os;

import android.Manifest;
import android.content.Context;
import android.content.BroadcastReceiver;
import android.content.IntentFilter;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import androidx.core.content.ContextCompat;

@CapacitorPlugin(
    name = "EuterpeOverlay",
    permissions = @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "overlayNotifications")
)
public class EuterpeOverlayPlugin extends Plugin {
    private BroadcastReceiver mediaActionReceiver;

    @Override
    public void load() {
        mediaActionReceiver = new BroadcastReceiver() {
            @Override public void onReceive(Context context, Intent intent) {
                String action = intent.getStringExtra(EuterpeOverlayService.EXTRA_MEDIA_ACTION);
                if ("open".equals(action)) {
                    getContext().getSharedPreferences("euterpe-overlay", Context.MODE_PRIVATE)
                        .edit().remove("pendingMusicOpen").apply();
                }
                JSObject data = new JSObject();
                data.put("action", action);
                notifyListeners("mediaAction", data, true);
            }
        };
        ContextCompat.registerReceiver(getContext(), mediaActionReceiver,
            new IntentFilter(EuterpeOverlayService.ACTION_MEDIA_CONTROL), ContextCompat.RECEIVER_NOT_EXPORTED);
    }

    @PluginMethod
    public void consumePendingMusicOpen(PluginCall call) {
        android.content.SharedPreferences preferences = getContext().getSharedPreferences("euterpe-overlay", Context.MODE_PRIVATE);
        boolean pending = preferences.getBoolean("pendingMusicOpen", false);
        if (pending) preferences.edit().remove("pendingMusicOpen").commit();
        JSObject result = new JSObject();
        result.put("pending", pending);
        call.resolve(result);
    }

    @PluginMethod
    public void checkPermission(PluginCall call) {
        JSObject result = new JSObject();
        result.put("supported", Build.VERSION.SDK_INT >= Build.VERSION_CODES.M);
        result.put("granted", Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(getContext()));
        result.put("notificationsGranted", Build.VERSION.SDK_INT < 33 || getPermissionState("overlayNotifications") == PermissionState.GRANTED);
        result.put("enabled", getContext().getSharedPreferences("euterpe-overlay", Context.MODE_PRIVATE).getBoolean("enabled", false));
        call.resolve(result);
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < 33 || getPermissionState("overlayNotifications") == PermissionState.GRANTED) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
            return;
        }
        requestPermissionForAlias("overlayNotifications", call, "notificationPermissionCallback");
    }

    @PermissionCallback
    private void notificationPermissionCallback(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", getPermissionState("overlayNotifications") == PermissionState.GRANTED);
        call.resolve(result);
    }

    @PluginMethod
    public void show(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(getContext())) {
            Intent settings = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getContext().getPackageName()));
            settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(settings);
            JSObject result = new JSObject();
            result.put("enabled", false);
            result.put("permissionRequired", true);
            call.resolve(result);
            return;
        }
        startService(EuterpeOverlayService.ACTION_SHOW, call);
        JSObject result = new JSObject();
        result.put("enabled", true);
        result.put("permissionRequired", false);
        call.resolve(result);
    }

    @PluginMethod
    public void update(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(getContext())) {
            call.reject("A permissão de sobreposição foi removida nas configurações do Android.");
            return;
        }
        startService(EuterpeOverlayService.ACTION_UPDATE, call);
        call.resolve();
    }

    @PluginMethod
    public void hide(PluginCall call) {
        Intent service = new Intent(getContext(), EuterpeOverlayService.class);
        service.setAction(EuterpeOverlayService.ACTION_HIDE);
        getContext().stopService(service);
        call.resolve();
    }

    private void startService(String action, PluginCall call) {
        Intent service = new Intent(getContext(), EuterpeOverlayService.class);
        service.setAction(action);
        service.putExtra(EuterpeOverlayService.EXTRA_STATE, call.getString("state", "IDLE"));
        service.putExtra(EuterpeOverlayService.EXTRA_TITLE, call.getString("title", "VARYNTH Music"));
        service.putExtra(EuterpeOverlayService.EXTRA_ARTIST, call.getString("artist", "Euterpe está com você"));
        service.putExtra(EuterpeOverlayService.EXTRA_PLAYING, call.getBoolean("playing", false));
        service.putExtra(EuterpeOverlayService.EXTRA_COVER, call.getString("coverDataUrl", ""));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ContextCompat.startForegroundService(getContext(), service);
        else getContext().startService(service);
    }

    @Override
    protected void handleOnDestroy() {
        if (mediaActionReceiver != null) {
            try { getContext().unregisterReceiver(mediaActionReceiver); } catch (IllegalArgumentException ignored) { }
            mediaActionReceiver = null;
        }
    }
}
