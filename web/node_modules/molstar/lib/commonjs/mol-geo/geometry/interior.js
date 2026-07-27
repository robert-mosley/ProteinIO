"use strict";
/**
 * Copyright (c) 2025 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInteriorParam = getInteriorParam;
exports.areInteriorPropsEquals = areInteriorPropsEquals;
exports.getInteriorColor = getInteriorColor;
exports.getInteriorSubstance = getInteriorSubstance;
const color_1 = require("../../mol-util/color/color.js");
const material_1 = require("../../mol-util/material.js");
const param_definition_1 = require("../../mol-util/param-definition.js");
function getInteriorParam() {
    return param_definition_1.ParamDefinition.Group({
        color: param_definition_1.ParamDefinition.Color(color_1.Color.fromRgb(76, 76, 76)),
        colorStrength: param_definition_1.ParamDefinition.Numeric(1, { min: 0, max: 1, step: 0.01 }),
        substance: material_1.Material.getParam(),
        substanceStrength: param_definition_1.ParamDefinition.Numeric(1, { min: 0, max: 1, step: 0.01 }),
    });
}
function areInteriorPropsEquals(a, b) {
    return a.color === b.color
        && a.colorStrength === b.colorStrength
        && material_1.Material.areEqual(a.substance, b.substance)
        && a.substanceStrength === b.substanceStrength;
}
function getInteriorColor(props, out) {
    color_1.Color.toArrayNormalized(props.color, out, 0);
    out[3] = props.colorStrength;
    return out;
}
function getInteriorSubstance(props, out) {
    material_1.Material.toArrayNormalized(props.substance, out, 0);
    out[3] = props.substanceStrength;
    return out;
}
