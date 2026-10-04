package com.varynth.os;

import android.os.Bundle;
import android.content.Intent;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(EuterpeOverlayPlugin.class);
        super.onCreate(savedInstanceState);
        handleMusicOpenIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleMusicOpenIntent(intent);
    }

    private void handleMusicOpenIntent(Intent intent) {
        if (intent == null || !EuterpeOverlayService.ACTION_MEDIA_OPEN.equals(intent.getAction())) return;
        getSharedPreferences("euterpe-overlay", MODE_PRIVATE).edit().putBoolean("pendingMusicOpen", true).apply();
        Intent event = new Intent(EuterpeOverlayService.ACTION_MEDIA_CONTROL)
            .setPackage(getPackageName())
            .putExtra(EuterpeOverlayService.EXTRA_MEDIA_ACTION, "open");
        sendBroadcast(event);
    }
}
