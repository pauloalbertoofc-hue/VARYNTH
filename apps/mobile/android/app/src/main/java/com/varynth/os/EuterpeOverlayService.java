package com.varynth.os;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.app.Notification.MediaStyle;
import android.app.Notification.Action;
import android.app.Notification.Builder;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.animation.ValueAnimator;
import android.graphics.PixelFormat;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
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
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.media.MediaMetadata;
import android.util.Base64;
import androidx.core.app.NotificationCompat;

public class EuterpeOverlayService extends Service {
    static final String ACTION_SHOW = "com.varynth.os.EUTERPE_OVERLAY_SHOW";
    static final String ACTION_UPDATE = "com.varynth.os.EUTERPE_OVERLAY_UPDATE";
    static final String ACTION_HIDE = "com.varynth.os.EUTERPE_OVERLAY_HIDE";
    static final String ACTION_MEDIA_PLAY = "com.varynth.os.EUTERPE_MEDIA_PLAY";
    static final String ACTION_MEDIA_PAUSE = "com.varynth.os.EUTERPE_MEDIA_PAUSE";
    static final String ACTION_MEDIA_PREVIOUS = "com.varynth.os.EUTERPE_MEDIA_PREVIOUS";
    static final String ACTION_MEDIA_NEXT = "com.varynth.os.EUTERPE_MEDIA_NEXT";
    static final String ACTION_MEDIA_CONTROL = "com.varynth.os.EUTERPE_MEDIA_CONTROL";
    static final String EXTRA_STATE = "euterpeState";
    static final String EXTRA_TITLE = "trackTitle";
    static final String EXTRA_ARTIST = "trackArtist";
    static final String EXTRA_PLAYING = "trackPlaying";
    static final String EXTRA_COVER = "trackCoverPng";
    static final String EXTRA_MEDIA_ACTION = "mediaAction";
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
    private MediaSession mediaSession;
    private String trackTitle = "VARYNTH Music";
    private String trackArtist = "Euterpe está com você";
    private boolean trackPlaying;
    private Bitmap trackCover;

    @Override
    public void onCreate() {
        super.onCreate();
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        createNotificationChannel();
        mediaSession = new MediaSession(this, "VARYNTH Music · Euterpe");
        mediaSession.setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS | MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS);
        mediaSession.setCallback(new MediaSession.Callback() {
            @Override public void onPlay() { dispatchMediaAction("play"); }
            @Override public void onPause() { dispatchMediaAction("pause"); }
            @Override public void onSkipToPrevious() { dispatchMediaAction("previous"); }
            @Override public void onSkipToNext() { dispatchMediaAction("next"); }
        }, handler);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? ACTION_SHOW : intent.getAction();
        if (ACTION_HIDE.equals(action)) {
            handler.post(this::stopOverlay);
            return START_NOT_STICKY;
        }
        if (ACTION_MEDIA_PLAY.equals(action)) { dispatchMediaAction("play"); return START_STICKY; }
        if (ACTION_MEDIA_PAUSE.equals(action)) { dispatchMediaAction("pause"); return START_STICKY; }
        if (ACTION_MEDIA_PREVIOUS.equals(action)) { dispatchMediaAction("previous"); return START_STICKY; }
        if (ACTION_MEDIA_NEXT.equals(action)) { dispatchMediaAction("next"); return START_STICKY; }
        currentState = intent == null ? currentState : intent.getStringExtra(EXTRA_STATE);
        if (currentState == null) currentState = "IDLE";
        if (intent != null) {
            trackTitle = bounded(intent.getStringExtra(EXTRA_TITLE), 120, "VARYNTH Music");
            trackArtist = bounded(intent.getStringExtra(EXTRA_ARTIST), 120, "Euterpe está com você");
            trackPlaying = intent.getBooleanExtra(EXTRA_PLAYING, false);
            String image = intent.getStringExtra(EXTRA_COVER);
            if (trackCover != null) { trackCover.recycle(); trackCover = null; }
            if (image != null && image.length() <= 1_500_000) {
                try {
                    byte[] bytes = Base64.decode(image.replaceFirst("^data:image/png;base64,", ""), Base64.DEFAULT);
                    Bitmap decoded = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
                    if (decoded != null) {
                        Bitmap scaled = Bitmap.createScaledBitmap(decoded, 256, 256, true);
                        if (scaled != decoded) decoded.recycle();
                        trackCover = scaled;
                    }
                } catch (IllegalArgumentException ignored) { }
            }
        }
        updateMediaSession();
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
        Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O ? new Builder(this, CHANNEL_ID) : new Builder(this);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) builder.setSubText("VARYNTH MUSIC · EUTERPE PRESENTE");
        Notification notification = builder
            .setSmallIcon(R.mipmap.ic_launcher)
            .setLargeIcon(trackCover != null ? trackCover : BitmapFactory.decodeResource(getResources(), R.drawable.euterpe_idle))
            .setContentTitle(trackTitle)
            .setContentText(trackArtist + (trackPlaying ? " · Em reprodução" : " · Em pausa"))
            .setContentIntent(content)
            .setCategory(Notification.CATEGORY_TRANSPORT)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .addAction(new Action.Builder(android.R.drawable.ic_media_previous, "Faixa anterior", mediaActionIntent(ACTION_MEDIA_PREVIOUS, 1)).build())
            .addAction(new Action.Builder(trackPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play, trackPlaying ? "Pausar" : "Reproduzir", mediaActionIntent(trackPlaying ? ACTION_MEDIA_PAUSE : ACTION_MEDIA_PLAY, 2)).build())
            .addAction(new Action.Builder(android.R.drawable.ic_media_next, "Próxima faixa", mediaActionIntent(ACTION_MEDIA_NEXT, 3)).build())
            .addAction(new Action.Builder(android.R.drawable.ic_menu_close_clear_cancel, "Desativar Euterpe", mediaActionIntent(ACTION_HIDE, 4)).build())
            .setStyle(new MediaStyle().setMediaSession(mediaSession.getSessionToken()).setShowActionsInCompactView(0, 1, 2))
            .build();
        mediaSession.setActive(true);
        if (Build.VERSION.SDK_INT >= 34) startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        else startForeground(NOTIFICATION_ID, notification);
    }

    private String bounded(String value, int limit, String fallback) {
        if (value == null || value.trim().isEmpty()) return fallback;
        return value.trim().substring(0, Math.min(value.trim().length(), limit));
    }

    private PendingIntent mediaActionIntent(String action, int requestCode) {
        Intent intent = new Intent(this, EuterpeOverlayService.class).setAction(action);
        return PendingIntent.getService(this, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private void updateMediaSession() {
        if (mediaSession == null) return;
        MediaMetadata.Builder metadata = new MediaMetadata.Builder()
            .putString(MediaMetadata.METADATA_KEY_TITLE, trackTitle)
            .putString(MediaMetadata.METADATA_KEY_ARTIST, trackArtist)
            .putString(MediaMetadata.METADATA_KEY_ALBUM, "VARYNTH Music · Euterpe");
        if (trackCover != null) metadata.putBitmap(MediaMetadata.METADATA_KEY_ART, trackCover);
        mediaSession.setMetadata(metadata.build());
        long actions = PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE | PlaybackState.ACTION_PLAY_PAUSE
            | PlaybackState.ACTION_SKIP_TO_PREVIOUS | PlaybackState.ACTION_SKIP_TO_NEXT;
        mediaSession.setPlaybackState(new PlaybackState.Builder()
            .setActions(actions)
            .setState(trackPlaying ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED, PlaybackState.PLAYBACK_POSITION_UNKNOWN, trackPlaying ? 1f : 0f)
            .build());
    }

    private void dispatchMediaAction(String action) {
        Intent event = new Intent(ACTION_MEDIA_CONTROL).setPackage(getPackageName()).putExtra(EXTRA_MEDIA_ACTION, action);
        sendBroadcast(event);
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
        if (mediaSession != null) { mediaSession.setActive(false); mediaSession.release(); mediaSession = null; }
        if (trackCover != null) { trackCover.recycle(); trackCover = null; }
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
        if (mediaSession != null) { mediaSession.setActive(false); mediaSession.release(); mediaSession = null; }
        if (trackCover != null) { trackCover.recycle(); trackCover = null; }
        if (avatar != null && windowManager != null) {
            try { windowManager.removeViewImmediate(avatar); } catch (RuntimeException ignored) { }
            avatar = null;
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
