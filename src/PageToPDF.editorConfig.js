import { MAX_RENDER_SCALE, MIN_RENDER_SCALE, normalizeMargins, pageDimensions, printableArea } from "./pdf/layout";

/**
 * @typedef Property
 * @type {object}
 * @property {string} key
 * @property {string} caption
 * @property {string} description
 * @property {string[]} objectHeaders
 * @property {ObjectProperties[]} objects
 * @property {Properties[]} properties
 */

/**
 * @typedef ObjectProperties
 * @type {object}
 * @property {PropertyGroup[]} properties
 * @property {string[]} captions
 */

/**
 * @typedef PropertyGroup
 * @type {object}
 * @property {string} caption
 * @property {PropertyGroup[]} propertyGroups
 * @property {Property[]} properties
 */

/**
 * @typedef Properties
 * @type {PropertyGroup}
 */

/**
 * @typedef Problem
 * @type {object}
 * @property {string} property
 * @property {("error" | "warning" | "deprecation")} severity
 * @property {string} message
 * @property {string} studioMessage
 * @property {string} url
 * @property {string} studioUrl
 */

// Header and footer text is drawn inside the margins; below this it overlaps the page content.
const MIN_TEXT_MARGIN_MM = 6;

function hideProperty(groups, key) {
    (Array.isArray(groups) ? groups : [groups]).forEach(group => {
        if (group.properties) {
            group.properties = group.properties.filter(property => property.key !== key);
        }
        if (group.propertyGroups) {
            hideProperty(group.propertyGroups, key);
        }
    });
}

/**
 * @param {object} values
 * @param {Properties} defaultProperties
 * @param {("web"|"desktop")} target
 * @returns {Properties}
 */
export function getProperties(values, defaultProperties) {
    if (!values.showPageNumbers) {
        hideProperty(defaultProperties, "pageNumberFormat");
    }
    return defaultProperties;
}

function inherit(value, fallback) {
    return value && value !== "Inherit" ? value : fallback;
}

/**
 * @param {Object} values
 * @returns {Problem[]} returns a list of problems.
 */
export function check(values) {
    /** @type {Problem[]} */
    const errors = [];

    ["marginTop", "marginRight", "marginBottom", "marginLeft"].forEach(key => {
        if (typeof values[key] === "number" && values[key] < 0) {
            errors.push({ property: key, message: "Margins can't be negative." });
        }
    });

    if (
        typeof values.renderScale !== "number" ||
        values.renderScale < MIN_RENDER_SCALE ||
        values.renderScale > MAX_RENDER_SCALE
    ) {
        errors.push({
            property: "renderScale",
            message: `Render scale must be between ${MIN_RENDER_SCALE} and ${MAX_RENDER_SCALE}.`
        });
    }

    // Margins must leave room on the default page and on every page that overrides size or orientation.
    const margins = normalizeMargins(values);
    const formats = [{ pageSize: values.pageSize, orientation: values.orientation }];
    (values.pages || []).forEach(page => {
        formats.push({
            pageSize: inherit(page.pageSize, values.pageSize),
            orientation: inherit(page.orientation, values.orientation)
        });
    });
    const reported = new Set();
    formats.forEach(({ pageSize, orientation }) => {
        const dimensions = pageDimensions(pageSize, orientation);
        if (printableArea(dimensions, margins)) {
            return;
        }
        const tooWide = margins.left + margins.right >= dimensions.width;
        const property = tooWide ? "marginLeft" : "marginTop";
        const label = `${pageSize} ${orientation}`;
        if (reported.has(property + label)) {
            return;
        }
        reported.add(property + label);
        errors.push({
            property,
            message: tooWide
                ? `Left and right margins leave no room on the page (${label}, ${dimensions.width} mm wide).`
                : `Top and bottom margins leave no room on the page (${label}, ${dimensions.height} mm high).`
        });
    });

    (values.pages || []).forEach((page, index) => {
        if (!page.pageClass || !page.pageClass.trim()) {
            errors.push({
                property: `pages/${index + 1}/pageClass`,
                message: `Page ${index + 1} needs a page class.`
            });
        }
    });

    if (values.headerText && margins.top < MIN_TEXT_MARGIN_MM) {
        errors.push({
            property: "marginTop",
            severity: "warning",
            message: `The header is drawn in the top margin; use at least ${MIN_TEXT_MARGIN_MM} mm so it doesn't overlap the content.`
        });
    }
    if ((values.footerText || values.showPageNumbers) && margins.bottom < MIN_TEXT_MARGIN_MM) {
        errors.push({
            property: "marginBottom",
            severity: "warning",
            message: `The footer and page numbers are drawn in the bottom margin; use at least ${MIN_TEXT_MARGIN_MM} mm so they don't overlap the content.`
        });
    }

    return errors;
}

// /**
//  * @param {object} values
//  * @param {boolean} isDarkMode
//  * @param {number[]} version
//  * @returns {object}
//  */
// export function getPreview(values, isDarkMode, version) {
//     // Customize your pluggable widget appearance for Studio Pro.
//     return {
//         type: "Container",
//         children: []
//     };
// }

// /**
//  * @param {Object} values
//  * @param {("web"|"desktop")} platform
//  * @returns {string}
//  */
// export function getCustomCaption(values, platform) {
//     return "PageToPDF";
// }
