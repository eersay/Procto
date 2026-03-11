import { useEffect, useRef, useCallback } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────
export type FaceViolationType = 'FACE_NOT_DETECTED' | 'MULTIPLE_FACES' | 'LOOKING_AWAY';

export interface FaceDetectionStatus {
    faceCount: number;
    modelLoaded: boolean;
    lastViolation: FaceViolationType | null;
}

interface UseFaceDetectionOptions {
    videoRef: React.RefObject<HTMLVideoElement>;
    enabled: boolean;
    onViolation: (type: FaceViolationType, description: string) => void;
    onStatusChange?: (status: FaceDetectionStatus) => void;
    intervalMs?: number;
    cooldownMs?: number;
}

function snapshotCanvas(video: HTMLVideoElement, canvas: HTMLCanvasElement): boolean {
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return false;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;
    ctx.drawImage(video, 0, 0, w, h);
    return true;
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useFaceDetection({
    videoRef,
    enabled,
    onViolation,
    onStatusChange,
    intervalMs = 3000,
    cooldownMs = 10_000,
}: UseFaceDetectionOptions) {
    // Keep latest callbacks in refs so the interval never needs to re-register
    // when TakeExamPage re-renders (e.g. every second for the timer).
    const onViolationRef = useRef(onViolation);
    const onStatusChangeRef = useRef(onStatusChange);
    useEffect(() => { onViolationRef.current = onViolation; }, [onViolation]);
    useEffect(() => { onStatusChangeRef.current = onStatusChange; }, [onStatusChange]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modelRef = useRef<any>(null);
    const modelLoadedRef = useRef(false);
    const lastViolationRef = useRef<Partial<Record<FaceViolationType, number>>>({});
    const warmupRef = useRef(0);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const statusRef = useRef<FaceDetectionStatus>({ faceCount: 0, modelLoaded: false, lastViolation: null });
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const emitStatus = useCallback((patch: Partial<FaceDetectionStatus>) => {
        statusRef.current = { ...statusRef.current, ...patch };
        onStatusChangeRef.current?.(statusRef.current);
    }, []); // stable — uses ref

    const fireViolation = useCallback((type: FaceViolationType, description: string) => {
        const now = Date.now();
        if ((lastViolationRef.current[type] ?? 0) + cooldownMs > now) return;
        lastViolationRef.current[type] = now;
        statusRef.current = { ...statusRef.current, lastViolation: type };
        onStatusChangeRef.current?.(statusRef.current);
        onViolationRef.current(type, description);
    }, [cooldownMs]); // cooldownMs is stable (constant 10_000)

    // ── Load model ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;

        // Create offscreen canvas once here
        if (!canvasRef.current) {
            canvasRef.current = document.createElement('canvas');
        }

        (async () => {
            try {
                await import('@tensorflow/tfjs');
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const bf = await import('@tensorflow-models/blazeface' as any);
                if (cancelled) return;
                const model = await bf.load({ maxFaces: 5, scoreThreshold: 0.3 });
                if (cancelled) return;
                modelRef.current = model;
                modelLoadedRef.current = true;
                warmupRef.current = 0;
                emitStatus({ modelLoaded: true });
                console.log('[FaceDetection] BlazeFace loaded ✓');
            } catch (err) {
                console.error('[FaceDetection] Load error:', err);
            }
        })();

        return () => {
            cancelled = true;
            modelRef.current = null;
            modelLoadedRef.current = false;
        };
    }, [enabled, emitStatus]);

    // ── Inference interval ────────────────────────────────────────────────────
    // CRITICAL: deps array only contains `enabled` and `intervalMs` (both stable).
    // All callbacks come from refs so this effect NEVER re-runs due to parent
    // re-renders (e.g. the timer countdown). Without this, the interval would
    // be cleared and restarted every second, preventing any inference from firing.
    useEffect(() => {
        if (!enabled) return;

        intervalRef.current = setInterval(async () => {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            if (!modelLoadedRef.current || !modelRef.current || !canvas) {
                console.log('[FaceDetection] Guard1: model not ready yet');
                return;
            }

            if (!video || video.readyState < 2 || video.paused || video.ended) {
                console.log('[FaceDetection] Guard2: video not ready, readyState=', video?.readyState, 'paused=', video?.paused);
                return;
            }

            if (!snapshotCanvas(video, canvas)) {
                console.log('[FaceDetection] Guard3: snapshot failed (0×0)');
                return;
            }

            // 2-cycle warmup before violations can fire
            if (warmupRef.current < 2) {
                warmupRef.current += 1;
                console.log(`[FaceDetection] Warmup ${warmupRef.current}/2`);
                try {
                    const preds = await modelRef.current.estimateFaces(canvas, false);
                    emitStatus({ faceCount: preds.length });
                } catch (_) { /* ignore */ }
                return;
            }

            try {
                const preds = await modelRef.current.estimateFaces(canvas, false);
                const count: number = preds.length;
                emitStatus({ faceCount: count });
                console.log(`[FaceDetection] Faces: ${count}`);

                if (count === 0) {
                    fireViolation('FACE_NOT_DETECTED', 'No face detected in webcam frame');
                } else if (count > 1) {
                    fireViolation('MULTIPLE_FACES', `${count} faces detected`);
                } else {
                    const p = preds[0];
                    const x1: number = Array.isArray(p.topLeft) ? p.topLeft[0] : p.topLeft.arraySync()[0];
                    const x2: number = Array.isArray(p.bottomRight) ? p.bottomRight[0] : p.bottomRight.arraySync()[0];
                    const cx = (x1 + x2) / 2 / canvas.width;
                    if (cx < 0.15 || cx > 0.85) {
                        fireViolation('LOOKING_AWAY', 'Student appears to be looking away');
                    }
                }
            } catch (err) {
                console.warn('[FaceDetection] Inference error:', err);
            }
        }, intervalMs);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
        // Only `enabled` and `intervalMs` here — everything else is accessed via
        // refs so the interval is never torn down due to prop/callback changes.
    }, [enabled, intervalMs, emitStatus, fireViolation]); // emitStatus & fireViolation are stable (no parent deps)
}
