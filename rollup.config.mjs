// Extends the default pluggable-widgets-tools build (see "configDefaultConfig").
//
// jsPDF's ES build loads its optional helpers with dynamic import(). The widget bundle must be a
// single file, so dynamic imports are inlined. canvg (only used by addSvgAsImage) and dompurify
// (only used by doc.html()) are never called by this widget, so they are replaced by empty modules
// instead of being bundled.
const UNUSED_JSPDF_OPTIONALS = ["canvg", "dompurify"];
const STUB_PREFIX = "\0pagetopdf-stub:";

function stubUnusedJsPdfOptionals() {
    return {
        name: "pagetopdf-stub-unused-jspdf-optionals",
        resolveId(source) {
            return UNUSED_JSPDF_OPTIONALS.includes(source) ? STUB_PREFIX + source : null;
        },
        load(id) {
            return id.startsWith(STUB_PREFIX) ? "export default undefined;" : null;
        }
    };
}

export default args =>
    args.configDefaultConfig.map(config => ({
        ...config,
        plugins: [stubUnusedJsPdfOptionals(), ...(config.plugins || [])],
        output: Array.isArray(config.output)
            ? config.output.map(output => ({ ...output, inlineDynamicImports: true }))
            : { ...config.output, inlineDynamicImports: true }
    }));
