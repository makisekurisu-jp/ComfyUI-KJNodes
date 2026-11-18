const { app } = window.comfyAPI.app;

const NODE_ID = "MOSSSimplePresetNode";
const ADVANCED_WIDGETS = ["merge_strength", "composition_stability", "text_accuracy", "detail_strength"];
const PRESET_ORDER = ["Composition Preserve", "Balanced (Recommended)", "Detail & Typography Priority"];
const HINT_KEYS = {
    merge_strength: "strength",
    composition_stability: "comp",
    text_accuracy: "text",
    detail_strength: "detail",
};

// Exact preset layer weights (same arrays as backend / proven reference implementation)
const PRESETS = {
    "Composition Preserve": {
        global: [0.12, 0.12, 0.10, 0.10, 0.14, 0.12],
        layers: [0.08, 0.12, 0.18, 0.28, 0.42, 0.52],
        output: [0.12, 0.25, 0.12],
    },
    "Balanced (Recommended)": {
        global: [0.20, 0.20, 0.16, 0.16, 0.24, 0.20],
        layers: [0.15, 0.20, 0.30, 0.45, 0.60, 0.72],
        output: [0.20, 0.35, 0.20],
    },
    "Detail & Typography Priority": {
        global: [0.30, 0.30, 0.24, 0.24, 0.36, 0.30],
        layers: [0.25, 0.32, 0.50, 0.65, 0.80, 0.90],
        output: [0.30, 0.50, 0.30],
    },
};

const ZH = {
    presetLabels: {
        "Composition Preserve": "构图优先",
        "Balanced (Recommended)": "默认均衡",
        "Detail & Typography Priority": "文字优先",
    },
    slotLabels: { base_model: "基础模型", sft_model: "微调模型", merged_model: "合并后模型", merge_info: "合并信息" },
    widgetLabels: { merge_strength: "融合强度", composition_stability: "构图稳定度", text_accuracy: "文字准确度", detail_strength: "细节强度" },
    presetRowLabel: "融合预设",
    advOpen: "▶ 高级微调（点击展开）",
    advClose: "▼ 高级微调（点击收起）",
    infoTitle: "合并信息实时输出：",
    statusLabels: [
        {
            comp: ["无约束，构图偏移风险最高", "低锁定，允许构图调整", "标准锁定，固定人物位置", "高锁定，人脸完全不偏移", "最大锁定，完全固定整个画面"],
            text: ["无文字增强，文字易乱码", "弱文字增强，少量优化", "标准文字渲染效果", "强文字增强，降低文字错误", "最大文字增强，文字准确率最高"],
            detail: ["无纹理，画面最平滑", "弱纹理，自然磨皮效果", "标准皮肤质感，默认效果", "强纹理，保留毛孔发丝细节", "纹理拉满，可能出现轻微噪点"],
        },
        {
            comp: ["无约束，构图偏移风险最高", "低锁定，允许构图调整", "标准锁定，固定画面位置", "高锁定，画面几乎不偏移", "最大锁定，完全固定整个画面"],
            text: ["无文字增强，文字易乱码", "弱文字增强，少量优化", "标准文字渲染效果", "强文字增强，降低文字错误", "最大文字增强，文字准确率最高"],
            detail: ["无纹理，画面最平滑", "弱纹理，画面干净", "标准细节，默认效果", "强纹理，材质更清晰", "纹理拉满，可能出现轻微噪点"],
        },
        {
            comp: ["无约束，版面偏移风险最高", "低锁定，允许版面调整", "标准锁定，固定版面位置", "高锁定，排版完全不偏移", "最大锁定，完全固定整个版面"],
            text: ["无文字增强，文字易乱码", "弱文字增强，少量优化", "标准文字渲染效果", "强文字增强，大幅降低文字错误", "最大文字增强，文字准确率最高"],
            detail: ["无额外纹理，画面最平滑", "弱纹理，画面干净不杂乱", "标准材质细节，默认效果", "强纹理，产品材质更清晰", "纹理拉满，可能出现轻微噪点"],
        },
    ],
    hints: {
        strength: ["纯基础模型", "微调效果弱", "效果平衡", "微调效果强", "微调效果最大"],
        comp: ["偏移风险高", "构图易偏移", "构图稳定", "构图不会偏移", "构图完全固定"],
        text: ["文字错误风险高", "文字错误较多", "文字渲染正常", "文字错误降低", "文字错误最少"],
        detail: ["画面最平滑", "画面纹理少", "细节效果正常", "纹理更清晰", "纹理最丰富"],
    },
};

const EN = {
    presetLabels: {},
    slotLabels: { base_model: "Base Model", sft_model: "SFT Model", merged_model: "Merged Model", merge_info: "Merge Info" },
    widgetLabels: { merge_strength: "Strength", composition_stability: "Composition", text_accuracy: "Text Accuracy", detail_strength: "Detail" },
    presetRowLabel: "Preset",
    advOpen: "Advanced (click to expand)",
    advClose: "Advanced (click to collapse)",
    infoTitle: "Live merge info:",
    statusLabels: [
        {
            comp: ["No lock, high offset risk", "Low lock, composition may shift", "Standard lock, position fixed", "High lock, no face shift", "Max lock, whole frame fixed"],
            text: ["No text boost, easily garbled", "Weak boost", "Standard text rendering", "Strong boost, fewer errors", "Max boost, best accuracy"],
            detail: ["Smoothest", "Soft skin texture", "Standard detail", "Sharper pores and hair", "Max texture, slight noise"],
        },
        {
            comp: ["No lock, high offset risk", "Low lock, composition may shift", "Standard lock, position fixed", "High lock, almost no shift", "Max lock, whole frame fixed"],
            text: ["No text boost, easily garbled", "Weak boost", "Standard text rendering", "Strong boost, fewer errors", "Max boost, best accuracy"],
            detail: ["Smoothest", "Clean and low texture", "Standard detail", "Sharper material", "Max texture, slight noise"],
        },
        {
            comp: ["No lock, high layout offset risk", "Low lock, layout may shift", "Standard lock, layout fixed", "High lock, no layout shift", "Max lock, whole layout fixed"],
            text: ["No text boost, easily garbled", "Weak boost", "Standard text rendering", "Strong boost, far fewer errors", "Max boost, best accuracy"],
            detail: ["Smoothest", "Clean, not cluttered", "Standard material detail", "Sharper product material", "Max texture, slight noise"],
        },
    ],
    hints: {
        strength: ["Pure base", "Weak finetune", "Balanced", "Strong finetune", "Max effect"],
        comp: ["Offset risk", "May shift", "Stable", "Won't shift", "Fully locked"],
        text: ["High error risk", "Some errors", "Normal", "Fewer errors", "Fewest errors"],
        detail: ["Smoothest", "Low texture", "Normal detail", "Sharper", "Richest texture"],
    },
};

function chainCallback(object, property, callback) {
    if (object == undefined) return;
    if (property in object) {
        const orig = object[property];
        object[property] = function () {
            const r = orig.apply(this, arguments);
            callback.apply(this, arguments);
            return r;
        };
    } else {
        object[property] = callback;
    }
}

function isZh() {
    // Follow ComfyUI's own language setting only. Default is English:
    // never fall back to the browser language, so an English UI stays English.
    const asLocale = (v) => (typeof v === "string" && v.length ? v : null);

    const fromSettings = asLocale(app.ui?.settings?.getSettingValue?.("Comfy.Locale"));
    const fromApp = asLocale(app.locale);
    const fromStore = ["Comfy.Settings.Comfy.Locale", "Comfy.Settings.Locale"]
        .map((key) => {
            const raw = window.localStorage?.getItem(key);
            if (!raw) return null;
            try { return asLocale(JSON.parse(raw)); } catch (e) { return asLocale(raw); }
        })
        .find(Boolean);

    const loc = fromSettings || fromApp || fromStore;
    return loc ? /^zh/i.test(loc) : false;
}

function num(v, d = 1.0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
}

// 5-step mapping shared by slider hints and status descriptions
function stepIndex(val) {
    if (val <= 0.1) return 0;
    if (val <= 0.5) return 1;
    if (val <= 1.2) return 2;
    if (val <= 1.8) return 3;
    return 4;
}

// Exact same layer math as prototype
function computeRatios(presetKey, strength, comp, textAcc, detail) {
    const preset = PRESETS[presetKey] || PRESETS["Balanced (Recommended)"];
    const safeComp = Math.max(0.05, comp);   // guard against divide-by-zero at slider minimum
    const groupW = preset.layers.map((w, gi) => {
        let v = Math.max(0, Math.min(1, w * strength));
        if (gi <= 1) v = Math.max(0, Math.min(1, v / safeComp));
        else if (gi <= 3) v = Math.max(0, Math.min(1, v * textAcc));
        else v = Math.max(0, Math.min(1, v * detail));
        return v;
    });
    return {
        early: (8 * groupW[0] + 6 * groupW[1]) / 14,
        mid: (8 * groupW[2] + 8 * groupW[3]) / 16,
        late: (6 * groupW[4] + 6 * groupW[5]) / 12,
    };
}

function strengthStatus(zh, strength) {
    if (strength <= 0.001) {
        return zh
            ? { level: "纯基础", desc: "完全使用基础模型，无任何微调效果，构图100%稳定无变形。", warn: "" }
            : { level: "Pure base", desc: "Base model only, no finetune effect, composition 100% stable.", warn: "" };
    }
    if (strength <= 0.1) {
        return zh
            ? { level: "极弱微调", desc: "几乎全是基础模型效果，微调影响可忽略，构图几乎不变化。", warn: "" }
            : { level: "Very weak", desc: "Almost base only, negligible finetune impact.", warn: "" };
    }
    if (strength <= 0.5) {
        return zh
            ? { level: "轻微微调", desc: "仅添加少量微调效果，构图高度稳定，适合保守使用。", warn: "" }
            : { level: "Light", desc: "Small finetune effect, composition very stable.", warn: "" };
    }
    if (strength <= 1.2) {
        return zh
            ? { level: "标准效果", desc: "预设推荐的默认强度，安全稳定无额外风险。", warn: "" }
            : { level: "Standard", desc: "Recommended default strength, safe with no extra risk.", warn: "" };
    }
    if (strength <= 1.8) {
        return zh
            ? { level: "增强效果", desc: "微调效果明显，目标特性突出。", warn: "提示：继续拉高可能出现轻微构图变化，可配合更高构图稳定度。" }
            : { level: "Enhanced", desc: "Finetune effect clearly visible.", warn: "Tip: pushing higher may slightly shift composition; raise stability if needed." };
    }
    if (strength >= 1.999) {
        return zh
            ? { level: "最强效果", desc: "已经拉到最大值，目标效果拉满。", warn: "注意：当前构图跑偏、变形风险最高，出问题直接降低强度即可。" }
            : { level: "Maximum", desc: "Already maxed out, target effect fully applied.", warn: "Warning: highest distortion risk; lower strength if output breaks." };
    }
    return zh
        ? { level: "接近最强", desc: "微调效果非常强，接近最大值。", warn: "注意：当前构图跑偏、变形风险最高，出问题直接降低强度即可。" }
        : { level: "Near max", desc: "Very strong, close to max.", warn: "Warning: highest distortion risk; lower strength if output breaks." };
}

// Decide whether the native dropdown popup should render dark or light,
// based on the active ComfyUI palette brightness instead of hardcoding dark.
function themeScheme() {
    try {
        const probe = document.createElement("div");
        probe.style.color = "var(--comfy-menu-bg, #222)";
        document.body.appendChild(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        const m = color.match(/\d+/g);
        if (!m) return "dark";
        const [r, g, b] = m.map(Number);
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        return lum > 0.5 ? "light" : "dark";
    } catch (e) {
        return "dark";
    }
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Inject range-thumb styling once; inline styles cannot target pseudo elements
function injectSliderStyle() {
    if (document.getElementById("kjmoss-slider-style")) return;
    const st = document.createElement("style");
    st.id = "kjmoss-slider-style";
    st.textContent = `
.kjmoss-range { -webkit-appearance: none; appearance: none; flex: 1; height: 4px; background: var(--comfy-input-bg, #222); border-radius: 2px; cursor: pointer; margin: 0; padding: 0; outline: none; min-width: 0; pointer-events: auto; }
.kjmoss-range::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #7a67ad; border: none; cursor: pointer; }
.kjmoss-range::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: #7a67ad; border: none; cursor: pointer; }
.kjmoss-range::-moz-range-track { height: 4px; background: #222; border-radius: 2px; }
.kjmoss-content, .kjmoss-content * { pointer-events: none; }
.kjmoss-content button, .kjmoss-content select, .kjmoss-content input { pointer-events: auto; }
`;
    document.head.appendChild(st);
}

app.registerExtension({
    name: "MOSS.SimplePreset",

    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData?.name !== NODE_ID) return;

        chainCallback(nodeType.prototype, "onNodeCreated", function () {
            const node = this;
            const zh = isZh();
            const T = zh ? ZH : EN;
            const findW = (n) => node.widgets?.find((w) => w.name === n);

            // --- Localize slot labels (values stay English for serialization) ---
            for (const inp of node.inputs || []) {
                if (T.slotLabels[inp.name]) inp.label = T.slotLabels[inp.name];
            }
            for (const out of node.outputs || []) {
                if (T.slotLabels[out.name]) out.label = T.slotLabels[out.name];
            }

            // --- All native widgets are hidden: they exist only for serialization + execution ---
            const combo = findW("merge_preset");
            if (combo) combo.hidden = true;
            for (const name of ADVANCED_WIDGETS) {
                const w = findW(name);
                if (w) w.hidden = true;
            }

            // Hidden legacy buttons keep widgets_values indices stable for old workflows
            const presetBtn = node.addWidget("button", "preset_switch", null, () => cycle());
            const advBtn = node.addWidget("button", "advanced_toggle", null, () => toggleAdv());
            presetBtn.hidden = true;
            advBtn.hidden = true;
            node.resizable = true;

            node._advExpanded = false;

            const presetLabelOf = (key) => (zh ? (ZH.presetLabels[key] || key) : key);
            const currentPreset = () => (combo?.value && PRESETS[combo.value] ? combo.value : PRESET_ORDER[0]);

            // --- Unified DOM content: every row shares the same 110px label column ---
            injectSliderStyle();
            const container = document.createElement("div");
            container.className = "kjmoss-content";
            container.style.cssText = `
                padding: 2px 2px 2px 2px; box-sizing: border-box;
                font-size: 13px; color: var(--input-text, #ddd);
                pointer-events: none; overflow: hidden;
            `;

            const makeLabel = (text, extra) => {
                const d = document.createElement("div");
                d.style.cssText = "width:110px;flex:none;font-size:13px;color:var(--input-text, #ccc);" + (extra || "");
                d.textContent = text;
                return d;
            };

            // Row 1: preset = one rounded pill holding: left arrow, title, value, right arrow
            const presetRow = document.createElement("div");
            presetRow.style.cssText = "display:flex;align-items:center;min-width:0;height:28px;background:var(--comfy-input-bg, #222);border:1px solid var(--border-color, #4a4a4a);border-radius:14px;padding:0 4px;box-sizing:border-box;";

            const innerLabel = document.createElement("div");
            innerLabel.style.cssText = "flex:none;font-size:13px;color:var(--input-text, #ccc);margin:0 6px 0 2px;white-space:nowrap;";
            innerLabel.textContent = T.presetRowLabel;

            const arrowStyle = "width:24px;height:24px;flex:none;background:transparent;border:none;color:var(--input-text, #ddd);cursor:pointer;pointer-events:auto;font-size:11px;line-height:1;display:flex;align-items:center;justify-content:center;padding:0;";

            const prevBtn = document.createElement("button");
            prevBtn.type = "button";
            prevBtn.textContent = "\u25C0";
            prevBtn.style.cssText = arrowStyle;
            prevBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
            prevBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                shiftPreset(-1);
            });

            const presetSelect = document.createElement("select");
            presetSelect.style.cssText = "flex:1;min-width:0;background:transparent;border:none;color:var(--input-text, #ddd);font-size:13px;text-align:center;text-align-last:center;appearance:none;-webkit-appearance:none;-moz-appearance:none;cursor:pointer;pointer-events:auto;outline:none;padding:0;";
            for (const key of PRESET_ORDER) {
                const opt = document.createElement("option");
                opt.value = key;
                opt.textContent = presetLabelOf(key);
                // Force dark option rows so the native popup matches the ComfyUI theme
                opt.style.cssText = "background: var(--comfy-menu-bg, #2a2a2a); color: var(--input-text, #ddd);";
                presetSelect.append(opt);
            }
            presetSelect.value = currentPreset();
            presetSelect.addEventListener("pointerdown", (e) => e.stopPropagation());
            presetSelect.addEventListener("change", () => {
                if (combo) combo.value = presetSelect.value;
                resetSliders();
                refresh();
            });

            const nextBtn = document.createElement("button");
            nextBtn.type = "button";
            nextBtn.textContent = "\u25B6";
            nextBtn.style.cssText = arrowStyle;
            nextBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
            nextBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                shiftPreset(1);
            });

            presetRow.append(prevBtn, innerLabel, presetSelect, nextBtn);

            // Separator above the advanced section (prototype uses border-top here)
            const divider = document.createElement("div");
            divider.style.cssText = "border-top:1px solid var(--border-color, #555);margin:14px 0 12px 0;";

            // Row 2: collapsible advanced toggle (full width italic line, like the prototype)
            const toggleEl = document.createElement("div");
            toggleEl.style.cssText = "color:var(--desc-text-color, #999);font-size:12px;font-style:italic;cursor:pointer;pointer-events:auto;user-select:none;white-space:nowrap;margin-bottom:12px;";
            toggleEl.textContent = T.advOpen;
            toggleEl.addEventListener("click", (e) => {
                e.stopPropagation();
                toggleAdv();
            });

            // Slider block
            const sliderRows = {};
            const slidersBlock = document.createElement("div");
            slidersBlock.style.cssText = "display:none;";

            for (const name of ADVANCED_WIDGETS) {
                const w = findW(name);
                if (!w) continue;

                const row = document.createElement("div");
                row.style.cssText = "display:flex;align-items:center;position:relative;margin-bottom:14px;height:22px;gap:8px;";

                const label = makeLabel(T.widgetLabels[name]);

                const track = document.createElement("div");
                track.style.cssText = "flex:1;position:relative;display:flex;align-items:center;gap:8px;min-width:0;";

                const hint = document.createElement("div");
                hint.style.cssText = "position:absolute;right:44px;top:calc(100% + 2px);font-size:10px;color:var(--desc-text-color, #999);white-space:nowrap;";

                const input = document.createElement("input");
                input.type = "range";
                input.className = "kjmoss-range";
                // Hardcoded contract: every control is 0..2 with a 0.05 step
                input.min = "0";
                input.max = "2";
                input.step = "0.05";
                input.value = String(num(w.value, 1.0));

                const val = document.createElement("div");
                val.style.cssText = "min-width:42px;text-align:right;color:var(--input-text, #bbb);font-variant-numeric:tabular-nums;font-size:12px;";
                val.textContent = num(w.value, 1.0).toFixed(2);

                track.append(hint, input, val);
                row.append(label, track);
                slidersBlock.append(row);

                sliderRows[name] = { input, hint, val, widget: w };

                input.addEventListener("input", () => {
                    const v = Number(input.value);
                    w.value = v;   // write through so workflow serialization and execution see the value
                    syncRow(name);
                    refresh();
                });
            }

            // Info block
            const infoTitleEl = document.createElement("div");
            infoTitleEl.style.cssText = "color:var(--desc-text-color, #999);font-size:12px;margin:2px 0 6px 0;";
            infoTitleEl.textContent = T.infoTitle;

            // Info block is locked to 4 x 3 grid cells: 400 x 300, border always complete.
            // The node width floor below keeps it from ever being squeezed.
            const INFO_BOX_W = 400;
            const INFO_BOX_H = 300;
            const MIN_WIDTH = INFO_BOX_W + 20;

            const infoBox = document.createElement("div");
            // Fixed width, and at least 3 grid cells tall so the block keeps a stable
            // size. min-height instead of a hard height: the warning box at the bottom
            // must never be clipped away when the text runs long.
            infoBox.style.cssText = `width:${INFO_BOX_W}px;height:${INFO_BOX_H}px;padding:10px;background:var(--comfy-menu-bg, #2a2a2a);border:1px solid var(--border-color, #444);border-radius:4px;font-size:12px;line-height:1.7;color:var(--desc-text-color, #bbb);box-sizing:border-box;overflow:hidden;overflow-wrap:anywhere;word-break:break-word;`;

            const inner = document.createElement("div");
            inner.style.cssText = "display:block;";
            inner.append(presetRow, divider, toggleEl, slidersBlock, infoTitleEl, infoBox);
            container.append(inner);

            node._contentH = 290;

            // ComfyUI mounts each DOM widget inside an absolutely positioned wrapper div.
            // That wrapper keeps the default pointer-events:auto and swallows every pointermove
            // over the node, so the canvas never shows the corner resize cursor. Make the
            // wrapper (and one level above) transparent to hit-testing; interactive controls
            // re-enable themselves via inline pointer-events:auto.
            const neutralizeWrappers = () => {
                let el = container.parentElement;
                for (let i = 0; i < 2 && el; i++) {
                    el.style.pointerEvents = "none";
                    el = el.parentElement;
                }
            };

            const contentWidget = node.addDOMWidget("moss_content", "moss_content", container, {
                serialize: false,
                hideOnZoom: false,
                margin: 0,
                getMinHeight: () => node._contentH,
                getMaxHeight: () => node._contentH,
                getHeight: () => node._contentH,
            });

            // LiteGraph arrange() throws NullGraphError when the node is not yet attached to a graph
            function safeArrange() {
                if (!node.graph) return;
                try { node.arrange?.(); } catch (e) { /* best-effort layout */ }
            }

            function computeNodeHeight() {
                const TITLE_H = window.LiteGraph?.NODE_TITLE_HEIGHT ?? 30;
                // Must stay above ComfyUI's corner hit radius, otherwise the resize handle is unreachable
                return TITLE_H + node._contentH + 28;
            }

            // Measure real DOM height so collapse/expand and text growth are exact
            function contentHeight() {
                if (infoBox) infoBox.style.height = `${INFO_BOX_H}px`;
                // Layout pixels, NOT getBoundingClientRect(): the DOM layer is
                // scaled with the canvas zoom, and a rect-based measurement would
                // shrink at low zoom and clip the bottom of the info block.
                if (inner.offsetWidth < 80) return node._contentH;
                return Math.ceil(inner.offsetHeight) + 4;
            }

            function measureContent() {
                const h = contentHeight();
                // Ignore unmeasured DOM (0/2px before mount)
                if (h > 60 && Math.abs(h - node._contentH) > 4) {
                    node._contentH = h;
                    return true;
                }
                return false;
            }

            // The info box is pinned to exactly 4 x 3 cells in every state
            // (advanced expanded or collapsed); only the node height adapts.
            function fitInfoBox() {
                if (!infoBox) return;
                infoBox.style.height = `${INFO_BOX_H}px`;
            }

            // Give the DOM block an explicit pixel width. A percentage would keep using the
            // wrapper width ComfyUI cached before the node was shrunk, overflowing the node.
            function syncWidth() {
                const w = Math.max(200, (node.size?.[0] || 400) - 12);
                container.style.width = `${w}px`;
            }

            function layout(resize) {
                syncWidth();
                // arrange() recomputes the node height from the widget stack and would
                // overwrite the height we set, so it always runs first.
                safeArrange();
                if (resize) node.setSize([node.size?.[0] || 400, computeNodeHeight()]);
                node.graph?.setDirtyCanvas(true, true);
            }

            // Keep DOM width in lockstep with manual node resizing.
            // During an active drag we only update the CSS width (cheap, no forced
            // reflow, no setSize write-back) so the drag stays as smooth as native
            // nodes. The height is re-measured once after the drag settles.
            node._lastWidth = node.size?.[0] || 400;
            let resizeSettleTimer = null;
            chainCallback(node, "onResize", function (size) {
                let newW = size?.[0] ?? node.size?.[0] ?? 400;
                // The info block is a fixed 400px wide, so the node must never get
                // narrower than that plus its own padding: clamp instead of letting
                // the box squeeze and rewrap the text.
                if (newW < MIN_WIDTH) {
                    node.setSize([MIN_WIDTH, size?.[1] ?? node.size?.[1] ?? computeNodeHeight()]);
                    newW = MIN_WIDTH;
                }
                const widthChanged = Math.abs(newW - node._lastWidth) > 1;
                node._lastWidth = newW;

                syncWidth();
                fitInfoBox();
                node.graph?.setDirtyCanvas(true, true);

                // Debounce the expensive measurement + height write-back until the
                // drag actually stops; reading getBoundingClientRect every frame is
                // what made the drag feel laggy compared with native nodes.
                if (resizeSettleTimer) clearTimeout(resizeSettleTimer);
                resizeSettleTimer = setTimeout(() => {
                    resizeSettleTimer = null;
                    requestAnimationFrame(() => {
                        syncWidth();
                        measureContent();
                        node.setSize([node.size?.[0] || MIN_WIDTH, computeNodeHeight()]);
                        fitInfoBox();
                        node.graph?.setDirtyCanvas(true, true);
                    });
                }, 90);
            });

            function syncRow(name) {
                const ref = sliderRows[name];
                if (!ref) return;
                const v = num(ref.widget.value, 1.0);
                if (document.activeElement !== ref.input) ref.input.value = String(v);
                ref.val.textContent = v.toFixed(2);
                ref.hint.textContent = T.hints[HINT_KEYS[name]][stepIndex(v)];
            }

            // Switching preset resets the four fine-tune sliders to neutral 1.00
            function resetSliders() {
                for (const name of ADVANCED_WIDGETS) {
                    const w = findW(name);
                    if (w) w.value = 1.0;
                }
            }

            function shiftPreset(dir) {
                const idx = PRESET_ORDER.indexOf(currentPreset());
                const next = (idx + dir + PRESET_ORDER.length) % PRESET_ORDER.length;
                if (combo) combo.value = PRESET_ORDER[next];
                resetSliders();
                refresh();
            }

            function cycle() {
                shiftPreset(1);
            }

            function toggleAdv() {
                node._advExpanded = !node._advExpanded;
                toggleEl.textContent = node._advExpanded ? T.advClose : T.advOpen;
                slidersBlock.style.display = node._advExpanded ? "block" : "none";
                requestAnimationFrame(() => {
                    measureContent();
                    // arrange() first: it recomputes the height and would otherwise
                    // clobber the explicit height below (clipping the info block).
                    safeArrange();
                    node.setSize([node.size?.[0] || 400, computeNodeHeight()]);
                    fitInfoBox();
                    node.graph?.setDirtyCanvas(true, true);
                });
            }

            function refresh() {
                const presetKey = currentPreset();
                const strength = num(findW("merge_strength")?.value, 1.0);
                const comp = num(findW("composition_stability")?.value, 1.0);
                const textAcc = num(findW("text_accuracy")?.value, 1.0);
                const detail = num(findW("detail_strength")?.value, 1.0);

                syncWidth();
                presetSelect.style.colorScheme = themeScheme();
                for (const name of ADVANCED_WIDGETS) syncRow(name);

                presetSelect.value = presetKey;

                const ratios = computeRatios(presetKey, strength, comp, textAcc, detail);
                const presetIdx = Math.max(0, PRESET_ORDER.indexOf(presetKey));
                const labels = T.statusLabels[presetIdx];
                const compStatus = labels.comp[stepIndex(comp)];
                const textStatus = labels.text[stepIndex(textAcc)];
                const detailStatus = labels.detail[stepIndex(detail)];
                const st = strengthStatus(zh, strength);

                const pctEarly = (ratios.early * 100).toFixed(1);
                const pctMid = (ratios.mid * 100).toFixed(1);
                const pctLate = (ratios.late * 100).toFixed(1);

                const norm = zh
                    ? `【状态：${presetLabelOf(presetKey)} ${st.level}】\n${st.desc}\n` +
                      `融合强度：${strength.toFixed(2)}\n` +
                      `SFT占比：浅层${pctEarly}%，中层${pctMid}%，深层${pctLate}%\n` +
                      `构图稳定度：${comp.toFixed(2)}（${compStatus}）\n` +
                      `文字准确度：${textAcc.toFixed(2)}（${textStatus}）\n` +
                      `细节强度：${detail.toFixed(2)}（${detailStatus}）\n` +
                      `\n指引：变形拉稳定/降强度，文字乱拉文字准确度，质感差拉细节强度。`
                    : `[Status: ${presetLabelOf(presetKey)} ${st.level}]\n${st.desc}\n` +
                      `Strength: ${strength.toFixed(2)}\n` +
                      `SFT Ratio: Early ${pctEarly}%, Mid ${pctMid}%, Late ${pctLate}%\n` +
                      `Composition: ${comp.toFixed(2)} (${compStatus})\n` +
                      `Text Accuracy: ${textAcc.toFixed(2)} (${textStatus})\n` +
                      `Detail: ${detail.toFixed(2)} (${detailStatus})\n` +
                      `\nGuide: shaky structure - raise stability or lower strength; garbled text - raise text accuracy; flat texture - raise detail.`;

                infoBox.innerHTML = `<div style="white-space:pre-wrap;">${escapeHtml(norm)}</div>` +
                    (st.warn
                        ? `<div style="margin-top:8px;padding:8px;border:1px solid #d32f2f;border-radius:4px;color:#ff6b6b;white-space:pre-wrap;">${escapeHtml(st.warn)}</div>`
                        : "");

                // Always snap the height to the real content so no empty tail is left behind.
                // No arrange() here: it would force the height back to the generic content size.
                // The size is synced unconditionally (not only when the measurement
                // changed) so a warning box that just appeared can never be clipped.
                const snapHeight = () => {
                    measureContent();
                    const target = computeNodeHeight();
                    if (Math.abs((node.size?.[1] || 0) - target) > 2) {
                        node.setSize([node.size?.[0] || MIN_WIDTH, target]);
                    }
                    fitInfoBox();
                    node.graph?.setDirtyCanvas(true, true);
                };
                requestAnimationFrame(snapHeight);
                // Second pass: WebKit sometimes reports the old height right after an
                // innerHTML swap, so re-check once the frame has settled.
                setTimeout(snapHeight, 150);
            }

            // --- Initial state ---
            neutralizeWrappers();
            requestAnimationFrame(neutralizeWrappers);
            setTimeout(neutralizeWrappers, 300);
            setTimeout(neutralizeWrappers, 900);

            refresh();
            layout(true);
            requestAnimationFrame(() => {
                measureContent();
                layout(true);
            });

            // Re-arrange once the node actually joins the graph (arrange needs node.graph)
            chainCallback(node, "onAdded", function () {
                // A node narrower than the fixed info block would clip it, so widen it
                // (also covers workflows saved before the block size was fixed)
                if ((node.size?.[0] || 0) < MIN_WIDTH) {
                    node.setSize([MIN_WIDTH, node.size?.[1] || computeNodeHeight()]);
                }
                requestAnimationFrame(() => {
                    measureContent();
                    const savedH = node.size?.[1] || 0;
                    safeArrange();
                    const minH = computeNodeHeight();
                    if (savedH > minH) {
                        node.setSize([node.size?.[0] || 400, savedH]);
                    }
                    node.graph?.setDirtyCanvas(true, true);
                });
            });
        });
    },
});
