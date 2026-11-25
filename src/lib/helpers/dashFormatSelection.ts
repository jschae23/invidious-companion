type SelectableFormat = {
    mime_type: string;
    has_audio: boolean;
    has_video: boolean;
    is_original?: boolean;
    is_drc?: boolean;
    is_sr?: boolean;
    drm_families?: string[];
    url?: string | null;
};

type SelectableAudioFormat = {
    is_original?: boolean;
    is_drc?: boolean;
    is_sr?: boolean;
};

function originalFormatsFirst<T extends SelectableAudioFormat>(
    formats: T[],
): T[] {
    const original = formats.filter((format) => format.is_original);
    const plainOriginal = original.filter((format) =>
        !format.is_drc && !format.is_sr
    );

    if (plainOriginal.length) {
        return plainOriginal;
    }
    if (original.length) {
        return original;
    }
    return formats;
}

/**
 * Keep only formats suitable for an MP4 DASH manifest.
 *
 * Dubbed audio tracks share itags with the original track, and dash.js may
 * pick one of them (e.g. Arabic) if they are all present. Prefer the plain
 * original track, and only fall back to DRC/SR or dubbed tracks when that is
 * all YouTube returned.
 */
export function selectDashFormats<T extends SelectableFormat>(
    formats: T[],
): T[] {
    const usable = formats.filter((format) =>
        format.mime_type.includes("mp4") &&
        !format.drm_families?.length &&
        Boolean(format.url)
    );

    const videoFormats = usable.filter((format) =>
        format.has_video && !format.has_audio
    );
    const audioFormats = usable.filter((format) =>
        format.has_audio && !format.has_video
    );
    const selected = [
        ...videoFormats,
        ...originalFormatsFirst(audioFormats),
    ];

    // Live or unusual videos may not expose clean video-only/audio-only
    // formats. Keep the previous behavior rather than emitting an empty MPD.
    return selected.length ? selected : usable;
}

/**
 * Pick the original version of a format when several audio tracks share an
 * itag, preferring the plain track over Stable Volume / Voice Boost variants.
 */
export function selectOriginalFormat<T extends SelectableAudioFormat>(
    formats: T[],
): T | undefined {
    return originalFormatsFirst(formats)[0];
}
