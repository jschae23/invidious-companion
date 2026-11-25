import { assertEquals } from "./deps.ts";
import {
    selectDashFormats,
    selectOriginalFormat,
} from "../lib/helpers/dashFormatSelection.ts";

function format(
    overrides: Partial<{
        itag: number;
        mime_type: string;
        has_audio: boolean;
        has_video: boolean;
        is_original: boolean;
        is_drc: boolean;
        is_sr: boolean;
        drm_families: string[];
        url: string;
    }> = {},
) {
    return {
        itag: 140,
        mime_type: "audio/mp4",
        has_audio: true,
        has_video: false,
        url: "https://example.com/media",
        ...overrides,
    };
}

Deno.test("DASH format selection", async (t) => {
    await t.step("keeps only MP4 video and plain original audio", () => {
        const formats = [
            format({
                itag: 136,
                mime_type: "video/mp4",
                has_audio: false,
                has_video: true,
            }),
            format({
                itag: 247,
                mime_type: "video/webm",
                has_audio: false,
                has_video: true,
            }),
            format({ itag: 140, is_original: true, is_drc: true }),
            format({ itag: 140, is_original: true }),
            format({ itag: 140 }),
            format({
                itag: 140,
                drm_families: [" Widevine "],
                is_original: true,
            }),
            format({ itag: 140, url: "" }),
        ];

        const selected = selectDashFormats(formats);

        assertEquals(selected.map((item) => item.itag), [136, 140]);
        assertEquals(selected[1].is_original, true);
        assertEquals(selected[1].is_drc, undefined);
    });

    await t.step("falls back when no plain original track exists", () => {
        const drc = format({ itag: 140, is_original: true, is_drc: true });
        const selected = selectDashFormats([drc, format({ itag: 140 })]);

        assertEquals(selected.length, 1);
        assertEquals(selected[0], drc);
    });

    await t.step(
        "falls back to all formats when no original track exists",
        () => {
            const dubbed = format({ itag: 140 });
            const selected = selectDashFormats([dubbed]);

            assertEquals(selected, [dubbed]);
        },
    );
});

Deno.test("original format selection", async (t) => {
    await t.step("prefers the plain original track for a shared itag", () => {
        const plainOriginal = format({ is_original: true });
        const formats = [
            format(),
            format({ is_original: true, is_sr: true }),
            plainOriginal,
        ];

        assertEquals(selectOriginalFormat(formats), plainOriginal);
    });

    await t.step("returns undefined for an empty list", () => {
        assertEquals(selectOriginalFormat([]), undefined);
    });
});
