package com.varynth.os;

/** Distinct, gentle movement parameters for Euterpe's persistent Android overlay. */
final class EuterpeMotionProfile {
    final float bobDp;
    final long bobDurationMs;
    final float tiltDegrees;
    final long tiltDurationMs;
    final float sideDp;
    final long sideDurationMs;
    final float pulseScale;
    final long pulseDurationMs;

    private EuterpeMotionProfile(float bobDp, long bobDurationMs, float tiltDegrees, long tiltDurationMs,
            float sideDp, long sideDurationMs, float pulseScale, long pulseDurationMs) {
        this.bobDp = bobDp;
        this.bobDurationMs = bobDurationMs;
        this.tiltDegrees = tiltDegrees;
        this.tiltDurationMs = tiltDurationMs;
        this.sideDp = sideDp;
        this.sideDurationMs = sideDurationMs;
        this.pulseScale = pulseScale;
        this.pulseDurationMs = pulseDurationMs;
    }

    static EuterpeMotionProfile forState(String state) {
        if ("SLEEP".equals(state)) return new EuterpeMotionProfile(2, 3600, 1, 5000, 0, 0, 1, 0);
        if ("LISTENING".equals(state)) return new EuterpeMotionProfile(3, 1700, 3, 1300, 1, 1500, 1, 0);
        if ("THINKING".equals(state) || "ATHENA_DELEGATION".equals(state)) return new EuterpeMotionProfile(4, 2800, 2, 2400, 0, 0, 1, 0);
        if ("SPEAKING".equals(state)) return new EuterpeMotionProfile(6, 720, 1.5f, 720, 0, 0, 1.025f, 720);
        if ("HAPPY".equals(state)) return new EuterpeMotionProfile(10, 900, 2.5f, 900, 0, 0, 1.03f, 900);
        if ("CURIOUS".equals(state)) return new EuterpeMotionProfile(3, 1500, 8, 1800, 4, 1800, 1, 0);
        if ("ALERT".equals(state)) return new EuterpeMotionProfile(2, 420, 3, 420, 2, 420, 1, 0);
        if ("MUSIC_PAUSED".equals(state)) return new EuterpeMotionProfile(2, 3500, 1, 4800, 0, 0, 1, 0);
        if ("TRACK_CHANGED".equals(state)) return new EuterpeMotionProfile(9, 950, 2, 1000, 0, 0, 1, 0);
        if ("MUSIC_REACTIVE".equals(state)) return new EuterpeMotionProfile(6, 2200, 1.2f, 3300, 0, 0, 1, 0);
        return new EuterpeMotionProfile(6, 2200, 1.2f, 3300, 0, 0, 1, 0);
    }
}
