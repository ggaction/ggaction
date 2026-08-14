import { action } from "../../core/action.js";
import { isPlainObject } from "../../core/immutable.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import { planDerivedDataRevision } from "../../materialization/dataProvenance.js";
import { findDataset } from "../../selectors/datasets.js";
import { findLayer } from "../../selectors/layers.js";
import { removeOwnedMark } from "../marks/remove.js";
import { GRADIENT_PROFILE_FIELDS } from "../../grammar/gradientProfile.js";
import { removeGradientPlotLegend } from "./components.js";
import {
  resolveDistributionRoles,
  setCartesianPosition,
  updateDistributionPositions
} from "../distributions/revision.js";
import {
  resolveGradientAppearance,
  resolveGradientCenter,
  resolveGradientDensity,
  resolveGradientPosition,
  resolveGradientWidth
} from "./options.js";
import {
  normalizeGradientPositionTypes,
  resolveGradientOwner
} from "./resolve.js";

const OPTIONS = Object.freeze([
  "target", "data", "x", "y", "density", "width", "gradient", "center"
]);

function patch(value, label) {
  if (!isPlainObject(value)) {
    throw new TypeError(`editGradientPlot ${label} must be a plain object.`);
  }
  return value;
}

function removeCenter(program, id) {
  return removeOwnedMark(program, id, true);
}

function roleCandidate(program, owner, current, args) {
  return {
    source: Object.hasOwn(args, "data")
      ? validateUserId(args.data, "Gradient-plot data id")
      : current.source,
    ...resolveDistributionRoles(program, owner, current, args, {
      operation: "editGradientPlot",
      resolvePosition: resolveGradientPosition,
      normalize: normalizeGradientPositionTypes,
      quantitativeDefaults: {}
    })
  };
}

function sameRoleCandidate(current, candidate) {
  return candidate.source === current.source &&
    candidate.orientation === current.orientation &&
    candidate.category === current.category &&
    candidate.categoryType === current.categoryType &&
    candidate.measure === current.measure &&
    candidate.xScale.id === candidate.previous.x.scale &&
    candidate.yScale.id === candidate.previous.y.scale &&
    candidate.xScale.edit === undefined &&
    candidate.yScale.edit === undefined;
}

function updateGradientPositions(program, owner, current, candidate, hasCenter) {
  const owned = [owner.id, ...(hasCenter ? [current.centerId] : [])];
  return updateDistributionPositions(
    program,
    owner,
    current,
    candidate,
    {
      owned,
      lower: GRADIENT_PROFILE_FIELDS.lower,
      upper: GRADIENT_PROFILE_FIELDS.upper,
      update(next, { category, measure, categoryChannel, measureChannel }) {
        if (!hasCenter) return next;
        next = setCartesianPosition(next, current.centerId, categoryChannel, {
      field: candidate.category,
      fieldType: candidate.categoryType,
      scale: category.scale
    });
        return setCartesianPosition(next, current.centerId, measureChannel, {
      field: GRADIENT_PROFILE_FIELDS.center,
      fieldType: "quantitative",
      scale: measure.scale
        })._withMarkConfig(current.centerId, {
      ...next.markConfigs[current.centerId],
      fixedSpan: {
        ...next.markConfigs[current.centerId].fixedSpan,
        orientation: candidate.orientation === "vertical"
          ? "horizontal"
          : "vertical"
      }
        });
      }
    }
  );
}

export const editGradientPlot = action(
  {
    op: "editGradientPlot",
    description: "Edit one stable categorical gradient plot."
  },
  function (args = {}) {
    validateKeys(args, OPTIONS, "editGradientPlot");
    if (!OPTIONS.slice(1).some(key => Object.hasOwn(args, key))) {
      throw new Error("editGradientPlot requires at least one gradient-plot option.");
    }
    const owner = resolveGradientOwner(this, args.target, "editGradientPlot");
    const current = this.markConfigs[owner.id].gradientPlot;
    const density = Object.hasOwn(args, "density")
      ? resolveGradientDensity(patch(args.density, "density"), current.density, "editGradientPlot")
      : current.density;
    const width = Object.hasOwn(args, "width")
      ? resolveGradientWidth(patch(args.width, "width"), current.width, "editGradientPlot")
      : current.width;
    const gradient = Object.hasOwn(args, "gradient")
      ? resolveGradientAppearance(
          patch(args.gradient, "gradient"),
          current.gradient,
          "editGradientPlot"
        )
      : current.gradient;
    const center = Object.hasOwn(args, "center")
      ? resolveGradientCenter(
          args.center === false ? false : patch(args.center, "center"),
          current.center === false ? undefined : current.center,
          "editGradientPlot"
        )
      : current.center;
    const candidate = roleCandidate(this, owner, current, args);
    const sourceDataset = findDataset(this, candidate.source);
    if (sourceDataset === undefined) {
      throw new Error(`Unknown gradient-plot data "${candidate.source}".`);
    }
    const roleRequested = ["data", "x", "y"].some(
      key => Object.hasOwn(args, key)
    );
    const changesRoles = !sameRoleCandidate(current, candidate);
    const statistical = JSON.stringify(density) !== JSON.stringify(current.density) ||
      center !== false && current.center !== false &&
        center.type !== current.center.type;
    if (changesRoles || statistical) {
      const hadCenter = findLayer(this, current.centerId) !== undefined;
      const revision = planDerivedDataRevision(this, {
        owner: owner.id,
        role: "ProfileData",
        previous: current.profileId,
        consumers: [owner.id, ...(hadCenter ? [current.centerId] : [])]
      });
      const applyEdit = program => {
        let next = program.createGradientProfileData({
          id: revision.id,
          source: candidate.source,
          category: candidate.category,
          field: candidate.measure,
          ...density,
          center: center === false ? "median" : center.type
        });
        for (const rebind of revision.rebinds) {
          next = next.rebindLayerData(rebind);
        }
        const profile = findDataset(next, revision.id);
        next = next._withMarkConfig(owner.id, {
          ...next.markConfigs[owner.id],
          gradientPlot: {
            ...current,
            source: candidate.source,
            orientation: candidate.orientation,
            category: candidate.category,
            categoryType: candidate.categoryType,
            measure: candidate.measure,
            density,
            width,
            gradient,
            center,
            profileId: revision.id,
            intensityDomain: profile.transform[0].resolved.intensityDomain
          }
        });
        if (center === false && hadCenter) {
          next = removeCenter(next, current.centerId);
        }
        const retainedCenter = center !== false && hadCenter;
        next = updateGradientPositions(
          next,
          owner,
          current,
          candidate,
          retainedCenter
        ).rematerializeRectMark({ id: owner.id });
        const category = candidate.orientation === "vertical"
          ? candidate.x
          : candidate.y;
        const measure = candidate.orientation === "vertical"
          ? candidate.y
          : candidate.x;
        const categoryScale = next.resolvedScales[category.scale];
        const spanSize = Math.max(
          1,
          categoryScale.bandwidth * width.band - 16
        );
        if (center !== false && !hadCenter) {
          next = next.createGradientPlotCenter({
            id: current.centerId,
            owner: owner.id,
            data: revision.id,
            category: candidate.category,
            categoryType: candidate.categoryType,
            coordinate: owner.coordinate,
            categoryScale: category.scale,
            measureScale: measure.scale,
            orientation: candidate.orientation,
            size: spanSize,
            stroke: center.stroke,
            strokeWidth: center.strokeWidth
          });
        } else if (retainedCenter) {
          next = next
            .encodeStroke({ target: current.centerId, value: center.stroke })
            .encodeStrokeWidth({
              target: current.centerId,
              value: center.strokeWidth
            })
            .materializeRuleSpan({
              id: current.centerId,
              orientation: candidate.orientation === "vertical"
                ? "horizontal"
                : "vertical",
              size: spanSize
            });
        }
        if (current.guides?.legend !== false && current.guides?.legend !== undefined) {
          next = removeGradientPlotLegend(next, owner.id)
            .createGradientPlotLegend({
              owner: owner.id,
              ...current.guides.legend
            });
        }
        next = next.releaseDerivedData(revision.release);
        return next._withContext({
          currentMark: owner.id,
          currentData: candidate.source
        });
      };
      return applyEdit(this);
    }
    if (roleRequested && !OPTIONS.slice(4).some(
      key => Object.hasOwn(args, key)
    )) {
      return this._withContext({
        currentMark: owner.id,
        currentData: current.source
      });
    }
    let next = this;
    const profile = findDataset(next, current.profileId);
    next = next._withMarkConfig(owner.id, {
      ...next.markConfigs[owner.id],
      gradientPlot: {
        ...current,
        density,
        width,
        gradient,
        center,
        profileId: current.profileId,
        intensityDomain: profile.transform[0].resolved.intensityDomain
      }
    });
    const hadCenter = findLayer(next, current.centerId) !== undefined;
    if (center === false && hadCenter) {
      next = removeCenter(next, current.centerId);
    } else if (center !== false && !hadCenter) {
      const categoryEncoding = owner.encoding[current.orientation === "vertical" ? "x" : "y"];
      const measureEncoding = owner.encoding[current.orientation === "vertical" ? "y" : "x"];
      next = next.createGradientPlotCenter({
        id: current.centerId,
        owner: owner.id,
        data: current.profileId,
        category: current.category,
        categoryType: current.categoryType,
        coordinate: owner.coordinate,
        categoryScale: categoryEncoding.scale,
        measureScale: measureEncoding.scale,
        orientation: current.orientation,
        size: 1,
        stroke: center.stroke,
        strokeWidth: center.strokeWidth
      });
    } else if (center !== false) {
      next = next
        .encodeStroke({ target: current.centerId, value: center.stroke })
        .encodeStrokeWidth({ target: current.centerId, value: center.strokeWidth });
    }
    next = next.rematerializeRectMark({ id: owner.id });
    if (center !== false && findLayer(next, current.centerId) !== undefined) {
      const categoryChannel = current.orientation === "vertical" ? "x" : "y";
      const categoryScale = next.resolvedScales[owner.encoding[categoryChannel].scale];
      next = next.materializeRuleSpan({
        id: current.centerId,
        orientation: current.orientation === "vertical" ? "horizontal" : "vertical",
        size: Math.max(1, categoryScale.bandwidth * width.band - 16)
      });
    }
    if (current.guides?.legend !== false && current.guides?.legend !== undefined) {
      next = removeGradientPlotLegend(next, owner.id)
        .createGradientPlotLegend({
          owner: owner.id,
          ...current.guides.legend
        });
    }
    return next._withContext({ currentMark: owner.id, currentData: current.source });
  }
);
