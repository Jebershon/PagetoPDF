import {
    MAX_CANVAS_AREA,
    MAX_CANVAS_DIMENSION,
    clampRenderScale,
    computePlacement,
    effectiveRenderScale,
    formatPageNumber,
    groupIntoChunks,
    headerFooterPositions,
    maxChunkHeightPx,
    normalizeMargins,
    pageDimensions,
    printableArea,
    safeCanvasScale,
    selectBreakPoints,
    toClassSelector
} from "../layout";

const margins10 = { top: 10, right: 10, bottom: 10, left: 10 };

describe("pageDimensions", () => {
    it("returns portrait sizes in mm", () => {
        expect(pageDimensions("A4", "Portrait")).toEqual({ width: 210, height: 297 });
        expect(pageDimensions("A3", "Portrait")).toEqual({ width: 297, height: 420 });
        expect(pageDimensions("A5", "Portrait")).toEqual({ width: 148, height: 210 });
        expect(pageDimensions("Letter", "Portrait")).toEqual({ width: 215.9, height: 279.4 });
        expect(pageDimensions("Legal", "Portrait")).toEqual({ width: 215.9, height: 355.6 });
    });

    it("swaps width and height for landscape", () => {
        expect(pageDimensions("A4", "Landscape")).toEqual({ width: 297, height: 210 });
        expect(pageDimensions("Letter", "Landscape")).toEqual({ width: 279.4, height: 215.9 });
    });

    it("falls back to A4 for an unknown size", () => {
        expect(pageDimensions("Tabloid", "Portrait")).toEqual({ width: 210, height: 297 });
    });
});

describe("margins and printable area", () => {
    it("normalizes missing and negative margins to 0", () => {
        expect(normalizeMargins({ marginTop: 12, marginRight: -3, marginBottom: undefined, marginLeft: 7 })).toEqual({
            top: 12,
            right: 0,
            bottom: 0,
            left: 7
        });
    });

    it("subtracts the margins from the page", () => {
        expect(printableArea({ width: 210, height: 297 }, { top: 20, right: 15, bottom: 25, left: 10 })).toEqual({
            x: 10,
            y: 20,
            width: 185,
            height: 252
        });
    });

    it("returns null when margins fill the page", () => {
        expect(printableArea({ width: 148, height: 210 }, { top: 0, right: 74, bottom: 0, left: 74 })).toBeNull();
        expect(printableArea({ width: 297, height: 210 }, { top: 150, right: 0, bottom: 60, left: 0 })).toBeNull();
    });

    it("places the header and footer in the middle of the margins", () => {
        expect(
            headerFooterPositions({ width: 210, height: 297 }, { top: 20, right: 10, bottom: 16, left: 30 })
        ).toEqual({
            headerY: 10,
            footerY: 289,
            left: 30,
            right: 200,
            center: 115
        });
    });
});

describe("clampRenderScale", () => {
    it("keeps values between 1 and 4", () => {
        expect(clampRenderScale(0)).toBe(1);
        expect(clampRenderScale(3)).toBe(3);
        expect(clampRenderScale(9)).toBe(4);
        expect(clampRenderScale(2.6)).toBe(3);
    });

    it("defaults to 2 when the value is missing", () => {
        expect(clampRenderScale(undefined)).toBe(2);
        expect(clampRenderScale(NaN)).toBe(2);
    });
});

describe("formatPageNumber", () => {
    it("replaces every {page} and {total}", () => {
        expect(formatPageNumber("Page {page} of {total}", 2, 5)).toBe("Page 2 of 5");
        expect(formatPageNumber("{page}/{total} ({page})", 3, 9)).toBe("3/9 (3)");
    });

    it("uses the default format when empty", () => {
        expect(formatPageNumber("", 1, 1)).toBe("Page 1 of 1");
        expect(formatPageNumber(undefined, 4, 7)).toBe("Page 4 of 7");
    });
});

describe("toClassSelector", () => {
    it("builds a class selector", () => {
        expect(toClassSelector("pdf-page")).toBe(".pdf-page");
        expect(toClassSelector(" .pdf-page ")).toBe(".pdf-page");
        expect(toClassSelector("card  pdf-page")).toBe(".card.pdf-page");
    });

    it("returns null for an empty class", () => {
        expect(toClassSelector("")).toBeNull();
        expect(toClassSelector("  ")).toBeNull();
        expect(toClassSelector(undefined)).toBeNull();
    });
});

describe("computePlacement", () => {
    const area = { x: 10, y: 10, width: 190, height: 277 };

    it("scales Flow content to the printable width", () => {
        const placement = computePlacement("Flow", 950, 5000, area);
        expect(placement.mmPerPx).toBeCloseTo(0.2);
        expect(placement.x).toBe(10);
        expect(placement.pageHeightPx).toBeCloseTo(1385);
    });

    it("scales FitToPage content to fit and centres it horizontally", () => {
        const placement = computePlacement("FitToPage", 950, 2770, area);
        expect(placement.mmPerPx).toBeCloseTo(0.1);
        expect(placement.x).toBeCloseTo(10 + (190 - 95) / 2);
        expect(placement.y).toBe(10);
    });

    it("uses the width when FitToPage content is wide", () => {
        const placement = computePlacement("FitToPage", 1900, 100, area);
        expect(placement.mmPerPx).toBeCloseTo(0.1);
        expect(placement.x).toBeCloseTo(10);
    });
});

describe("selectBreakPoints", () => {
    it("returns a single slice when the content fits", () => {
        expect(selectBreakPoints(500, 1000)).toEqual([{ start: 0, end: 500 }]);
    });

    it("returns nothing for empty content", () => {
        expect(selectBreakPoints(0, 1000)).toEqual([]);
    });

    it("cuts at the page height when nothing needs avoiding", () => {
        expect(selectBreakPoints(2500, 1000)).toEqual([
            { start: 0, end: 1000 },
            { start: 1000, end: 2000 },
            { start: 2000, end: 2500 }
        ]);
    });

    it("moves the cut above a row that crosses the page edge", () => {
        const rows = [];
        for (let top = 0; top < 2400; top += 30) {
            rows.push({ top, bottom: top + 30 });
        }
        const slices = selectBreakPoints(2400, 1000, { avoid: rows });
        // 990 is the last row boundary before 1000; 1980 the last before 1990.
        expect(slices).toEqual([
            { start: 0, end: 990 },
            { start: 990, end: 1980 },
            { start: 1980, end: 2400 }
        ]);
        slices.forEach(slice => {
            rows.forEach(row => {
                const cutThrough = row.top < slice.end && row.bottom > slice.end;
                expect(cutThrough).toBe(false);
            });
        });
    });

    it("handles nested blocks by moving the cut to the outermost one that fits", () => {
        const avoid = [
            { top: 800, bottom: 1200 }, // card
            { top: 950, bottom: 1050 } // image inside the card
        ];
        expect(selectBreakPoints(1500, 1000, { avoid })).toEqual([
            { start: 0, end: 800 },
            { start: 800, end: 1500 }
        ]);
    });

    it("ignores blocks taller than a page and breaks between their children instead", () => {
        const avoid = [
            { top: 100, bottom: 2100 }, // a long avoid-break table
            { top: 900, bottom: 960 },
            { top: 960, bottom: 1020 } // the row that crosses 1000
        ];
        expect(selectBreakPoints(2100, 1000, { avoid })[0]).toEqual({ start: 0, end: 960 });
    });

    it("hard-cuts a block that starts at the top of a page and is too tall to move", () => {
        const avoid = [{ top: 0, bottom: 1000 }];
        expect(selectBreakPoints(1500, 999, { avoid })).toEqual([
            { start: 0, end: 999 },
            { start: 999, end: 1500 }
        ]);
    });

    it("starts a new page at forced breaks", () => {
        expect(selectBreakPoints(1500, 1000, { forced: [300, 800] })).toEqual([
            { start: 0, end: 300 },
            { start: 300, end: 800 },
            { start: 800, end: 1500 }
        ]);
    });

    it("ignores forced breaks at the very start or end", () => {
        expect(selectBreakPoints(600, 1000, { forced: [0, 600] })).toEqual([{ start: 0, end: 600 }]);
    });

    it("rejects a page height of 0", () => {
        expect(() => selectBreakPoints(100, 0)).toThrow();
    });
});

describe("effectiveRenderScale", () => {
    const area = { x: 10, y: 10, width: 190, height: 277 };

    it("keeps the render scale for content at full printable width", () => {
        const placement = computePlacement("Flow", 900, 5000, area);
        expect(effectiveRenderScale(2, placement, 900, area)).toBeCloseTo(2);
    });

    it("lowers the scale for content shrunk by FitToPage", () => {
        // 3000px tall content fits at 277/3000 mm per px instead of 190/900: about 0.44 of full width.
        const placement = computePlacement("FitToPage", 900, 3000, area);
        expect(effectiveRenderScale(2, placement, 900, area)).toBeCloseTo((2 * (277 / 3000)) / (190 / 900));
    });

    it("never raises the scale above the configured one", () => {
        const placement = computePlacement("FitToPage", 1900, 100, area);
        expect(effectiveRenderScale(3, placement, 1900, area)).toBe(3);
    });
});

describe("canvas limits", () => {
    it("keeps the requested scale when the canvas is small", () => {
        expect(safeCanvasScale(1000, 1000, 2)).toBe(2);
    });

    it("lowers the scale for huge canvases", () => {
        const scale = safeCanvasScale(2000, 20000, 2);
        expect(scale).toBeLessThan(2);
        expect(2000 * scale * 20000 * scale).toBeLessThanOrEqual(MAX_CANVAS_AREA + 1);
        expect(20000 * scale).toBeLessThanOrEqual(MAX_CANVAS_DIMENSION);
    });

    it("limits chunk height by canvas area and dimension", () => {
        expect(maxChunkHeightPx(1000, 2)).toBe(Math.floor(MAX_CANVAS_AREA / (1000 * 4)));
        expect(maxChunkHeightPx(10, 2)).toBe(MAX_CANVAS_DIMENSION / 2);
    });
});

describe("groupIntoChunks", () => {
    const slices = [
        { start: 0, end: 1000 },
        { start: 1000, end: 2000 },
        { start: 2000, end: 2900 },
        { start: 2900, end: 3500 }
    ];

    it("groups consecutive slices up to the max height", () => {
        const chunks = groupIntoChunks(slices, 2000);
        expect(chunks.map(({ start, end }) => [start, end])).toEqual([
            [0, 2000],
            [2000, 3500]
        ]);
        expect(chunks[0].slices).toHaveLength(2);
    });

    it("gives an oversized slice its own chunk", () => {
        const chunks = groupIntoChunks(slices, 500);
        expect(chunks).toHaveLength(4);
    });
});

describe("margins helper", () => {
    it("is consistent with printableArea for the defaults", () => {
        expect(printableArea(pageDimensions("A4", "Portrait"), margins10)).toEqual({
            x: 10,
            y: 10,
            width: 190,
            height: 277
        });
    });
});
