package com.varynth.os;

import org.junit.Test;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

public class EuterpeMotionProfileTest {
    @Test
    public void conversationStatesHaveDistinctMotion() {
        EuterpeMotionProfile listening = EuterpeMotionProfile.forState("LISTENING");
        EuterpeMotionProfile thinking = EuterpeMotionProfile.forState("THINKING");
        EuterpeMotionProfile speaking = EuterpeMotionProfile.forState("SPEAKING");
        EuterpeMotionProfile happy = EuterpeMotionProfile.forState("HAPPY");
        EuterpeMotionProfile curious = EuterpeMotionProfile.forState("CURIOUS");
        EuterpeMotionProfile alert = EuterpeMotionProfile.forState("ALERT");

        assertTrue(listening.tiltDegrees > thinking.tiltDegrees);
        assertTrue(speaking.pulseScale > 1f);
        assertTrue(happy.bobDp > speaking.bobDp);
        assertTrue(curious.sideDp > listening.sideDp);
        assertTrue(alert.bobDurationMs < listening.bobDurationMs);
        assertTrue(alert.tiltDurationMs < curious.tiltDurationMs);
    }

    @Test
    public void restAndMusicKeepGentleProfilesAndUnknownStateFallsBackSafely() {
        EuterpeMotionProfile sleep = EuterpeMotionProfile.forState("SLEEP");
        EuterpeMotionProfile music = EuterpeMotionProfile.forState("MUSIC_REACTIVE");
        EuterpeMotionProfile unknown = EuterpeMotionProfile.forState("FUTURE_STATE");

        assertTrue(sleep.bobDp < music.bobDp);
        assertTrue(sleep.bobDurationMs > music.bobDurationMs);
        assertTrue(sleep.pulseScale <= 1.03f);
        assertEquals(6f, unknown.bobDp, 0f);
        assertEquals(1.2f, unknown.tiltDegrees, 0f);
    }
}
