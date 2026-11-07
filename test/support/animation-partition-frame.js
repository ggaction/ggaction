import { planTransition, sampleTransition } from '../../src/animation.js';
import { partitionFrameEndpoints } from './partition-frames.js';
import { samplePoints } from '../charts/partition-layouts/reference.js';

export function animationPartitionFrame(rebased = false) {
  const endpoints = partitionFrameEndpoints({ labels: false, padding: [2, 4] });
  const options = { durationMs: 100, easing: 'linear' };
  const first = planTransition({ from: endpoints.before, to: endpoints.after, options });
  const from = rebased ? sampleTransition(first, 50) : endpoints.before;
  const to = endpoints.after;
  const plan = rebased ? planTransition({ from, to, options }) : first;
  const bend = rebased ? .75 : .5;
  const checks = samplePoints({ kind: 'bend', bend }).map(sample => ({
    point: [sample.x, sample.y + (sample.label === 'background' ? 0 : 50 * bend)],
    rgba: sample.rgba
  }));
  return { from, to, plan, frame: sampleTransition(plan, 50), checks };
}
