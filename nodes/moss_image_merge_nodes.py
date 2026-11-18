import torch
import comfy.model_patcher as model_patcher

# int8c/convrot checkpoints expose extra quantization metadata next to each
# weight. These keys are not model parameters and must not be merged as weights.
_QUANT_METADATA_SUFFIXES = (
    ".weight_scale", ".weight_scale_2", ".input_scale",
    ".pre_quant_scale", ".comfy_quant",
)

# Real MOSS-Image diffusion-model key structure:
#   global: video_embedder / text_embedder (proj + 2 blocks) / time_embedding / shared_block_modulation
#   layers: 42 transformer layers grouped 0-7, 8-13, 14-21, 22-29, 30-35, 36-41
#   output: final_norm_video / final_linear_video / video_head_modulation
GLOBAL_KEYS = (
    "video_embedder.",
    "text_embedder.proj.",
    "text_embedder.blocks.0.",
    "text_embedder.blocks.1.",
    "time_embedding.",
    "shared_block_modulation.",
)
OUTPUT_KEYS = (
    "final_norm_video.",
    "final_linear_video.",
    "video_head_modulation.",
)

# Component groups used by the advanced sliders (same grouping as the UI prototype)
STABILITY_KEYS = ("video_embedder.", "time_embedding.", "shared_block_modulation.")
TEXT_KEYS = ("text_embedder.proj.", "text_embedder.blocks.0.", "text_embedder.blocks.1.")
EARLY_LAYERS = range(0, 14)
MID_LAYERS = range(14, 30)
LATE_LAYERS = range(30, 42)

def _build_preset(*, early, early_late, mid_early, mid_late, late_early, late_late, global_scale, final_linear):
    """Build the exact 51-component weight map for one preset (0 = Base, 1 = SFT)."""
    weights = {
        "video_embedder.": global_scale,
        "text_embedder.proj.": global_scale,
        "text_embedder.blocks.0.": round(global_scale * 0.8, 2),
        "text_embedder.blocks.1.": round(global_scale * 0.8, 2),
        "time_embedding.": round(global_scale * 1.2, 2),
        "shared_block_modulation.": global_scale,
    }
    for i in range(42):
        if i <= 7:
            value = early
        elif i <= 13:
            value = early_late
        elif i <= 21:
            value = mid_early
        elif i <= 29:
            value = mid_late
        elif i <= 35:
            value = late_early
        else:
            value = late_late
        weights[f"layers.{i}."] = value
    weights.update({
        "final_norm_video.": global_scale,
        "final_linear_video.": final_linear,
        "video_head_modulation.": global_scale,
    })
    return weights

PRESETS = {
    "Composition Preserve": _build_preset(
        early=0.08, early_late=0.12, mid_early=0.18, mid_late=0.28,
        late_early=0.42, late_late=0.52, global_scale=0.12, final_linear=0.25,
    ),
    "Balanced (Recommended)": _build_preset(
        early=0.15, early_late=0.20, mid_early=0.30, mid_late=0.45,
        late_early=0.60, late_late=0.72, global_scale=0.20, final_linear=0.35,
    ),
    "Detail & Typography Priority": _build_preset(
        early=0.25, early_late=0.32, mid_early=0.50, mid_late=0.65,
        late_early=0.80, late_late=0.90, global_scale=0.30, final_linear=0.50,
    ),
}

def _apply_advanced(weights, composition_stability, text_accuracy, detail_strength):
    """Map the three user-facing sliders onto their component groups, same as the UI prototype."""
    comp = max(0.05, composition_stability)
    text = text_accuracy
    detail = detail_strength

    adjusted = dict(weights)
    for key in STABILITY_KEYS:
        adjusted[key] = adjusted[key] / comp
    for i in EARLY_LAYERS:
        key = f"layers.{i}."
        adjusted[key] = adjusted[key] / comp
    for key in TEXT_KEYS:
        adjusted[key] = adjusted[key] * text
    for i in MID_LAYERS:
        key = f"layers.{i}."
        adjusted[key] = adjusted[key] * text
    for key in OUTPUT_KEYS:
        adjusted[key] = adjusted[key] * detail
    for i in LATE_LAYERS:
        key = f"layers.{i}."
        adjusted[key] = adjusted[key] * detail
    return adjusted

def _is_quant_metadata_key(key: str) -> bool:
    return key.endswith(_QUANT_METADATA_SUFFIXES)

def _get_filtered_key_patches(model, filter_prefix: str):
    """Return key patches for quantized models without quant metadata keys.

    ComfyUI's ModelPatcher.get_key_patches() walks every state-dict key. For
    int8c models that includes fields such as ``weight_scale`` and
    ``comfy_quant``, which are not module attributes and cause an
    AttributeError before the actual QuantizedTensor weights can be patched.
    """
    patches = {}
    for key in model.model_state_dict():
        if filter_prefix is not None and not key.startswith(filter_prefix):
            continue
        if _is_quant_metadata_key(key):
            continue
        try:
            weight, _, convert_func = model_patcher.get_key_weight(model.model, key)
        except AttributeError:
            continue
        if not isinstance(weight, torch.Tensor):
            continue

        backup = model.backup.get(key)
        hook_backup = model.hook_backup.get(key)
        if backup is not None:
            weight = backup.weight
        if hook_backup is not None:
            weight = hook_backup[0]
        if convert_func is None:
            convert_func = lambda value, **_: value

        patches[key] = [(weight, convert_func)] + model.patches.get(key, [])
    return patches

def _get_compatible_key_patches(model, filter_prefix: str):
    """Native patch extraction with automatic int8c/convrot fallback."""
    try:
        return model.get_key_patches(filter_prefix)
    except AttributeError:
        return _get_filtered_key_patches(model, filter_prefix)

class MOSSSimplePresetNode:
    """One-click MOSS-Image Base + SFT merge with plain-language presets."""
    CATEGORY = "model/merging/moss"
    FUNCTION = "merge"
    RETURN_TYPES = ("MODEL", "STRING")
    RETURN_NAMES = ("merged_model", "merge_info")

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "base_model": ("MODEL",),
                "sft_model": ("MODEL",),
                "merge_preset": (list(PRESETS.keys()),),
                "merge_strength": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 2.0, "step": 0.05, "display": "slider"}),
                "composition_stability": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 2.0, "step": 0.05, "display": "slider"}),
                "text_accuracy": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 2.0, "step": 0.05, "display": "slider"}),
                "detail_strength": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 2.0, "step": 0.05, "display": "slider"}),
            }
        }

    def merge(self, base_model, sft_model, merge_preset,
              merge_strength, composition_stability, text_accuracy, detail_strength):
        # Safety fallback for invalid / NaN values coming from stale workflows
        def safe(val):
            if not isinstance(val, (int, float)):
                return 1.0
            if torch.isnan(torch.tensor(float(val))):
                return 1.0
            return float(val)

        merge_strength = safe(merge_strength)
        composition_stability = max(0.05, safe(composition_stability))
        text_accuracy = safe(text_accuracy)
        detail_strength = safe(detail_strength)

        weights = PRESETS.get(merge_preset) or PRESETS["Balanced (Recommended)"]
        weights = _apply_advanced(weights, composition_stability, text_accuracy, detail_strength)

        merged = base_model.clone()
        key_patches = _get_compatible_key_patches(sft_model, "diffusion_model.")
        ordered_weights = sorted(weights.items(), key=lambda item: len(item[0]), reverse=True)

        layer_ratios = {}
        for key, patches in key_patches.items():
            unet_key = key[len("diffusion_model."):] if key.startswith("diffusion_model.") else key
            ratio = 0.0
            for prefix, value in ordered_weights:
                if unet_key.startswith(prefix):
                    ratio = value
                    break
            ratio = min(1.0, max(0.0, ratio * merge_strength))
            # Values are SFT weights: 0 = Base, 1 = SFT.
            # add_patches takes (strength_patch, strength_model).
            merged.add_patches({key: patches}, ratio, 1.0 - ratio)

            if unet_key.startswith("layers."):
                parts = unet_key.split(".")
                if len(parts) > 1 and parts[1].isdigit():
                    layer_ratios[int(parts[1])] = ratio

        def avg(idx_range):
            vals = [layer_ratios[i] for i in idx_range if i in layer_ratios]
            return sum(vals) / len(vals) if vals else 0.0

        early, mid, late = avg(EARLY_LAYERS), avg(MID_LAYERS), avg(LATE_LAYERS)
        info = (
            f"Preset: {merge_preset}\n"
            f"Strength: {merge_strength:.2f}\n"
            f"SFT Ratio: Early {early * 100:.1f}%, Mid {mid * 100:.1f}%, Late {late * 100:.1f}%\n"
            f"Composition: {composition_stability:.2f}\n"
            f"Text Accuracy: {text_accuracy:.2f}\n"
            f"Detail: {detail_strength:.2f}"
        )
        return merged, info

