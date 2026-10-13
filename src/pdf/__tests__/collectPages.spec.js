import { collectPages, isExcluded, resolvePageSettings } from "../collectPages";

const defaults = { pageSize: "A4", orientation: "Portrait", overflowMode: "Flow" };

describe("resolvePageSettings", () => {
    it("uses the defaults for Inherit and missing values", () => {
        expect(resolvePageSettings(defaults, { pageSize: "Inherit", orientation: "Inherit" })).toEqual(defaults);
        expect(resolvePageSettings(defaults)).toEqual(defaults);
    });

    it("lets a page override each setting", () => {
        expect(
            resolvePageSettings(defaults, { pageSize: "A3", orientation: "Landscape", overflowMode: "Inherit" })
        ).toEqual({ pageSize: "A3", orientation: "Landscape", overflowMode: "Flow" });
        expect(resolvePageSettings(defaults, { overflowMode: "FitToPage" }).overflowMode).toBe("FitToPage");
    });
});

describe("collectPages", () => {
    let root;

    beforeEach(() => {
        document.body.innerHTML = `
            <div class="export-root">
                <div class="pdf-page-details" id="details-1"></div>
                <div class="pdf-page-cover" id="cover"></div>
                <div class="pdf-page-details" id="details-2"></div>
                <div class="pdf-exclude"><div class="pdf-page-details" id="hidden"></div></div>
            </div>`;
        root = document.querySelector(".export-root");
    });

    it("returns the root as one document when there are no page items", () => {
        const pages = collectPages(root, [], defaults);
        expect(pages).toEqual([{ element: root, settings: defaults }]);
    });

    it("follows list order, then DOM order within a class", () => {
        const pages = collectPages(
            root,
            [
                { pageClass: "pdf-page-cover", orientation: "Landscape" },
                { pageClass: "pdf-page-details", pageSize: "Inherit" }
            ],
            defaults,
            ["pdf-exclude"]
        );
        expect(pages.map(page => page.element.id)).toEqual(["cover", "details-1", "details-2"]);
        expect(pages[0].settings.orientation).toBe("Landscape");
        expect(pages[1].settings).toEqual(defaults);
    });

    it("skips excluded elements and items without a class", () => {
        jest.spyOn(console, "warn").mockImplementation(() => undefined);
        const pages = collectPages(root, [{ pageClass: " " }, { pageClass: ".pdf-page-details" }], defaults, [
            "pdf-exclude"
        ]);
        expect(pages.map(page => page.element.id)).toEqual(["details-1", "details-2"]);
    });

    it("detects exclusion on ancestors up to the root only", () => {
        const hidden = document.getElementById("hidden");
        expect(isExcluded(hidden, root, ["pdf-exclude"])).toBe(true);
        expect(isExcluded(document.getElementById("cover"), root, ["pdf-exclude"])).toBe(false);
    });
});
