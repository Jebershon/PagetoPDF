import { toClassSelector } from "./layout";

const INHERIT = "Inherit";

/** Per-page settings with "Inherit" (or missing) values taken from the widget-wide defaults. */
export function resolvePageSettings(defaults, item = {}) {
    const pick = key => (item[key] && item[key] !== INHERIT ? item[key] : defaults[key]);
    return {
        pageSize: pick("pageSize"),
        orientation: pick("orientation"),
        overflowMode: pick("overflowMode")
    };
}

/** True when the element, or an ancestor up to and including root, carries one of the excluded classes. */
export function isExcluded(element, root, excludedClasses) {
    for (let node = element; node; node = node.parentElement) {
        if (excludedClasses.some(name => node.classList.contains(name))) {
            return true;
        }
        if (node === root) {
            break;
        }
    }
    return false;
}

/**
 * The elements to render, in order, each with its resolved settings: [{ element, settings }].
 *
 * Without page items the root is one flowing document (legacy behaviour). Otherwise the page items
 * are followed in list order; when a class matches several elements inside the root, each match
 * becomes its own page in DOM order.
 */
export function collectPages(root, pageItems, defaults, excludedClasses = []) {
    if (!pageItems || pageItems.length === 0) {
        return [{ element: root, settings: resolvePageSettings(defaults) }];
    }

    const pages = [];
    pageItems.forEach((item, index) => {
        const selector = toClassSelector(item.pageClass);
        if (!selector) {
            console.warn(`[PageToPDF] Page ${index + 1} has no page class and is skipped.`);
            return;
        }
        const matches = Array.from(root.querySelectorAll(selector));
        if (root.matches(selector)) {
            matches.unshift(root);
        }
        const elements = matches.filter(element => !isExcluded(element, root, excludedClasses));
        if (elements.length === 0) {
            console.warn(`[PageToPDF] No element with class "${item.pageClass}" found inside the export root.`);
        }
        const settings = resolvePageSettings(defaults, item);
        elements.forEach(element => pages.push({ element, settings }));
    });
    return pages;
}
