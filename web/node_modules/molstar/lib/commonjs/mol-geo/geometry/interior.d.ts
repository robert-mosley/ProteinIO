/**
 * Copyright (c) 2025 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */
import { Vec4 } from '../../mol-math/linear-algebra/3d/vec4.js';
import { Color } from '../../mol-util/color/color.js';
import { ParamDefinition as PD } from '../../mol-util/param-definition.js';
export declare function getInteriorParam(): PD.Group<PD.Normalize<{
    color: Color;
    colorStrength: number;
    substance: PD.Normalize<{
        metalness: number;
        roughness: number;
        bumpiness: number;
    }>;
    substanceStrength: number;
}>>;
export type InteriorProp = ReturnType<typeof getInteriorParam>['defaultValue'];
export declare function areInteriorPropsEquals(a: InteriorProp, b: InteriorProp): boolean;
export declare function getInteriorColor(props: InteriorProp, out: Vec4): Vec4;
export declare function getInteriorSubstance(props: InteriorProp, out: Vec4): Vec4;
