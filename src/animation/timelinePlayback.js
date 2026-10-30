import { validateGeneratedItemLimit, validateWorkLimit } from '../core/validation.js';
import { timelineMarkerCrossings } from '../grammar/animation/timeline.js';
import { animationTimelineSchedule } from './timelineTracks.js';

// The controller supplies committed clock snapshots after rendering. Marker
// ownership follows its exact sampler/run tokens, without a second clock.
export function createTimelineMarkerObserver(callback) {
  let profiles = new WeakMap(), states = new WeakMap(), disposed = false;
  return {
    register(sample, timeline) {
      if (timeline !== undefined) profiles.set(sample, animationTimelineSchedule(timeline));
      return sample;
    },
    notify(event) {
      if (callback === undefined) return;
      const { previous, current, cause, frame } = event, schedule = profiles.get(current.sample);
      if (schedule === undefined || schedule.markers.length === 0) return;
      const state = states.get(current.run) ?? { emitted: { iteration: current.iteration, ids: [] } };
      const forward = cause === 'seek' ? event.emit : event.emit && current.rate > 0;
      if (!forward) {
        const emitted = state.emitted.iteration === current.iteration ? state.emitted : { iteration: current.iteration, ids: [] };
        states.set(current.run, { ...state, emitted }); return;
      }
      const sameRun = previous.run === current.run;
      const firstIteration = sameRun ? previous.iteration : cause === 'seek' ? current.iteration : 0;
      let fromTimeMs = sameRun || cause === 'seek' ? previous.timeMs : 0;
      if ((cause === 'start' || cause === 'reduced-motion') && fromTimeMs === 0) fromTimeMs = -Number.MIN_VALUE;
      // Iteration ordering is owned by the controller's playback calculation.
      const middleIterations = Math.max(0, current.iteration - firstIteration - 1);
      validateGeneratedItemLimit(middleIterations * schedule.markers.length, 'Animation marker callbacks');
      const receipts = []; let work = 0, emitted = state.emitted;
      for (let iteration = firstIteration; iteration <= current.iteration; iteration++) {
        const crossings = timelineMarkerCrossings(schedule, { fromTimeMs: iteration === firstIteration ? fromTimeMs : -Number.MIN_VALUE,
          toTimeMs: iteration === current.iteration ? current.timeMs : current.durationMs, iteration, emit: true, state: emitted });
        emitted = crossings.state;
        for (const marker of crossings.markers) {
          validateGeneratedItemLimit(receipts.length + 1, 'Animation marker callbacks');
          validateWorkLimit(work += marker.id.length + 1, 'Animation marker callback work');
          receipts.push(Object.freeze({ ...marker, iteration, frame }));
        }
      }
      states.set(current.run, { emitted });
      for (const receipt of receipts) { if (disposed) return; callback(receipt); }
    },
    dispose() { disposed = true; callback = profiles = states = undefined; }
  };
}
