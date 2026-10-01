package com.varynth.os;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.animation.ValueAnimator;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.os.Handler;
import android.os.Looper;
import android.util.DisplayMetrics;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.widget.ImageView;
import androidx.core.app.NotificationCompat;

public class EuterpeOverlayService extends Service {
    static final String ACTION_SHOW = "com.varynth.os.EUTERPE_OVERLAY_SHOW";
    static final String ACTION_UPDATE = "com.varynth.os.EUTERPE_OVERLAY_UPDATE";
    static final String ACTION_HIDE = "com.varynth.os.EUTERPE_OVERLAY_HIDE";
    static final String EXTRA_STATE = "euterpeState";
    private static final String CHANNEL_ID = "euterpe-overlay";
    private static final int NOTIFICATION_ID = 8042;
    private static final int NOTIFICATION_PERMISSION_REQUEST = 8043;

    private WindowManager windowManager;
    private ImageView avatar;
    private AnimatorSet motionAnimator;
    private WindowManager.LayoutParams layout;
    private String currentState = "IDLE";
    private int startX;
    private int startY;
    private float touchX;
    private float touchY;
    private boolean moved;
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override
    public void onCreate() {
        super.onCreate();
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? ACTION_SHOW : intent.getAction();
        if (ACTION_HIDE.equals(action)) {
            handler.post(this::stopOverlay);
            return START_NOT_STICKY;
        }
        currentState = intent == null ? currentState : intent.getStringExtra(EXTRA_STATE);
        if (currentState == null) currentState = "IDLE";
        getSharedPreferences("euterpe-overlay", MODE_PRIVATE).edit().putBoolean("enabled", true).apply();
        if (Build.VERSION.SDK_INT >= 33 && androidx.core.content.ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            Intent openApp = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent permissionIntent = PendingIntent.getActivity(this, NOTIFICATION_PERMISSION_REQUEST, openApp, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            Notification notice = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("Euterpe precisa da permissão de notificações")
                .setContentText("Abra o VARYNTH para permitir os controles persistentes da personagem.")
                .setContentIntent(permissionIntent).setAutoCancel(true).build();
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.notify(NOTIFICATION_ID, notice);
            stopSelf();
            return START_NOT_STICKY;
        }
        startOverlayForeground();
        handler.post(() -> { if (avatar == null) addOverlay(); else updateAvatar(); });
        return START_STICKY;
    }

    private void startOverlayForeground() {
        Intent openApp = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent content = PendingIntent.getActivity(this, 0, openApp, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Intent stop = new Intent(this, EuterpeOverlayService.class).setAction(ACTION_HIDE);
        PendingIntent stopIntent = PendingIntent.getService(this, 1, stop, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Euterpe está com você")
            .setContentText("A personagem flutuante está ativa. Toque para voltar ao Music.")
            .setContentIntent(content)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Desativar", stopIntent)
            .build();
        if (Build.VERSION.SDK_INT >= 34) startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        else startForeground(NOTIFICATION_ID, notification);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Euterpe flutuante", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("Controles para a presença flutuante opcional da Euterpe.");
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) manager.createNotificationChannel(channel);
    }

    private void addOverlay() {
        if (windowManager == null || (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !android.provider.Settings.canDrawOverlays(this))) {
            stopSelf();
            return;
        }
        avatar = new ImageView(this);
        avatar.setScaleType(ImageView.ScaleType.FIT_CENTER);
        avatar.setContentDescription("Euterpe. Arraste para mover; toque para voltar ao Music.");
        avatar.setPadding(dp(3), dp(3), dp(3), dp(3));
        updateAvatar();
        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY : WindowManager.LayoutParams.TYPE_PHONE;
        int flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL;
        layout = new WindowManager.LayoutParams(dp(104), dp(142), type, flags, PixelFormat.TRANSLUCENT);
        layout.gravity = Gravity.TOP | Gravity.START;
        restorePosition();
        avatar.setOnTouchListener(this::handleTouch);
        try { windowManager.addView(avatar, layout); }
        catch (WindowManager.BadTokenException | SecurityException error) { avatar = null; stopSelf(); }
    }

    private void updateAvatar() {
        if (avatar == null) return;
        int resource = "SLEEP".equals(currentState) ? R.drawable.euterpe_sleep
            : ("MUSIC_REACTIVE".equals(currentState) || "TRACK_CHANGED".equals(currentState)) ? R.drawable.euterpe_lyre
            : R.drawable.euterpe_idle;
        avatar.setImageResource(resource);
        avatar.setAlpha(0.98f);
        avatar.invalidate();
        startGentleMotion();
    }

    private void startGentleMotion() {
        if (avatar == null) return;
        if (motionAnimator != null) motionAnimator.cancel();
        ObjectAnimator floatMotion = ObjectAnimator.ofFloat(avatar, View.TRANSLATION_Y, 0f, -dp("SLEEP".equals(currentState) ? 2 : 6));
        floatMotion.setDuration("SLEEP".equals(currentState) ? 3600 : 2200);
        floatMotion.setRepeatCount(ValueAnimator.INFINITE);
        floatMotion.setRepeatMode(ValueAnimator.REVERSE);
        floatMotion.setInterpolator(new AccelerateDecelerateInterpolator());
        ObjectAnimator sway = ObjectAnimator.ofFloat(avatar, View.ROTATION, -1.2f, 1.2f);
        sway.setDuration("SLEEP".equals(currentState) ? 5000 : 3300);
        sway.setRepeatCount(ValueAnimator.INFINITE);
        sway.setRepeatMode(ValueAnimator.REVERSE);
        sway.setInterpolator(new AccelerateDecelerateInterpolator());
        motionAnimator = new AnimatorSet();
        motionAnimator.playTogether(floatMotion, sway);
        motionAnimator.start();
    }

    private boolean handleTouch(View view, MotionEvent event) {
        switch (event.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                startX = layout.x; startY = layout.y; touchX = event.getRawX(); touchY = event.getRawY(); moved = false;
                return true;
            case MotionEvent.ACTION_MOVE:
                int dx = Math.round(event.getRawX() - touchX); int dy = Math.round(event.getRawY() - touchY);
                if (Math.abs(dx) + Math.abs(dy) > dp(4)) moved = true;
                layout.x = Math.max(0, startX + dx); layout.y = Math.max(0, startY + dy);
                try { windowManager.updateViewLayout(avatar, layout); } catch (RuntimeException ignored) { }
                return true;
            case MotionEvent.ACTION_UP:
                if (moved) savePosition(); else openMusic();
                return true;
            case MotionEvent.ACTION_CANCEL:
                if (moved) savePosition();
                return true;
            default: return true;
        }
    }

    private void openMusic() {
        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (open != null) { open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP); startActivity(open); }
    }

    private void stopOverlay() {
        getSharedPreferences("euterpe-overlay", MODE_PRIVATE).edit().putBoolean("enabled", false).apply();
        if (windowManager != null && avatar != null) {
            try { windowManager.removeViewImmediate(avatar); } catch (RuntimeException ignored) { }
            avatar = null;
        }
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    private void restorePosition() {
        SharedPreferences preferences = getSharedPreferences("euterpe-overlay", MODE_PRIVATE);
        DisplayMetrics metrics = getResources().getDisplayMetrics();
        layout.x = Math.max(0, Math.min(preferences.getInt("x", metrics.widthPixels - dp(112)), metrics.widthPixels - layout.width));
        layout.y = Math.max(dp(32), Math.min(preferences.getInt("y", metrics.heightPixels / 3), metrics.heightPixels - layout.height - dp(32)));
    }

    private void savePosition() { getSharedPreferences("euterpe-overlay", MODE_PRIVATE).edit().putInt("x", layout.x).putInt("y", layout.y).apply(); }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        getSharedPreferences("euterpe-overlay", MODE_PRIVATE).edit().putBoolean("enabled", false).apply();
        if (motionAnimator != null) { motionAnimator.cancel(); motionAnimator = null; }
        if (avatar != null && windowManager != null) {
            try { windowManager.removeViewImmediate(avatar); } catch (RuntimeException ignored) { }
            avatar = null;
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
