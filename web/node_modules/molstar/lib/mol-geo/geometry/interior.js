/**
 * Copyright (c) 2025 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */
import { Color } from '../../mol-util/color/color.js';
import { Material } from '../../mol-util/material.js';
import { ParamDefinition as PD } from '../../mol-util/param-definition.js';
export function getInteriorParam() {
    return PD.Group({
        color: PD.Color(Color.fromRgb(76, 76, 76)),
        colorStrength: PD.Numeric(1, { min: 0, max: 1, step: 0.01 }),
        substance: Material.getParam(),
        substanceStrength: PD.Numeric(1, { min: 0, max: 1, step: 0.01 }),
    });
}
export function areInteriorPropsEquals(a, b) {
    return a.color === b.color
        && a.colorStrength === b.colorStrength
        && Material.areEqual(a.substance, b.substance)
        && a.substanceStrength === b.substanceStrength;
}
export function getInteriorColor(props, out) {
    Color.toArrayNormalized(props.color, out, 0);
    out[3] = props.colorStrength;
    return out;
}
export function getInteriorSubstance(props, out) {
    Material.toArrayNormalized(props.substance, out, 0);
    out[3] = props.substanceStrength;
    return out;
}
