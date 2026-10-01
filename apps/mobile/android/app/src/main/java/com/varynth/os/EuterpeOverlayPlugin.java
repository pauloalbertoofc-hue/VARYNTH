package com.varynth.os;

import android.Manifest;
import android.content.Context;
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
        startService(EuterpeOverlayService.ACTION_SHOW, call.getString("state", "IDLE"));
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
        startService(EuterpeOverlayService.ACTION_UPDATE, call.getString("state", "IDLE"));
        call.resolve();
    }

    @PluginMethod
    public void hide(PluginCall call) {
        Intent service = new Intent(getContext(), EuterpeOverlayService.class);
        service.setAction(EuterpeOverlayService.ACTION_HIDE);
        getContext().stopService(service);
        call.resolve();
    }

    private void startService(String action, String state) {
        Intent service = new Intent(getContext(), EuterpeOverlayService.class);
        service.setAction(action);
        service.putExtra(EuterpeOverlayService.EXTRA_STATE, state);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ContextCompat.startForegroundService(getContext(), service);
        else getContext().startService(service);
    }
}
