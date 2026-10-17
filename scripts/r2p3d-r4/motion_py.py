"""motion_py — Python port of the PLI 12-pose motion library (motion.ts).

FAITHFUL PORT: the evaluators below mirror `packages/pet-3d/src/motion.ts`
POSE_FN definitions (same sin/cos expressions, same joint names, same
truth table) so the baked GLB animation clips match the live runtime pose
driver one-to-one. Health state never selects a pose.

Only the keyframe-relevant math is ported; the runtime re-evaluates poses
live from the TS library, so tiny float64/float32 differences are cosmetic.
"""
from __future__ import annotations

import math
from typing import Callable

PoseFrame = dict[str, dict[str, object]]


def _lerp_rot(euler_xyz: tuple[float, float, float]) -> tuple[float, float, float, float]:
    """three.js Quaternion.setFromEuler with XYZ order (intrinsic R=Rx*Ry*Rz)."""
    cx, cy, cz = (math.cos(x / 2.0) for x in euler_xyz)
    sx, sy, sz = (math.sin(x / 2.0) for x in euler_xyz)
    x = sx * cy * cz + cx * sy * sz
    y = cx * sy * cz - sx * cy * sz
    z = cx * cy * sz + sx * sy * cz
    w = cx * cy * cz - sx * sy * sz
    return (x, y, z, w)


def _leg(t: float, speed: float, phase: float, amp: float, knee_bend: float) -> tuple[float, float]:
    a = t * speed * 2.0 * math.pi + phase
    swing = math.sin(a) * amp
    knee = max(0.0, math.cos(a)) * knee_bend
    return swing, knee


POSE_FN: dict[str, Callable[[float], PoseFrame]] = {
    "Idle": lambda t: {
        "neck": {"rot": (0.02, 0, 0)},
        "head": {"rot": (0.04, 0, 0)},
        "tail0": {"rot": (0.06 * math.sin(t * 1.6), 0, 0)},
        "tail1": {"rot": (-0.15 - 0.05 * math.sin(t * 1.6), 0, 0)},
    },
    "Stand": lambda _t: {"neck": {"rot": (0, 0, 0)}},
    "Sit": lambda _t: {
        "shoulderFL": {"rot": (-0.25, 0, 0)},
        "shoulderFR": {"rot": (-0.25, 0, 0)},
        "kneeFL": {"rot": (0.45, 0, 0)},
        "kneeFR": {"rot": (0.45, 0, 0)},
        "hipBL": {"rot": (-1.35, 0, 0)},
        "hipBR": {"rot": (-1.35, 0, 0)},
        "kneeBL": {"rot": (-1.25, 0, 0)},
        "kneeBR": {"rot": (-1.25, 0, 0)},
        "torso": {"pos": (0, -0.28, 0)},
        "neck": {"rot": (0.18, 0, 0)},
        "head": {"rot": (-0.08, 0, 0)},
    },
    "Lie": lambda _t: {
        "torso": {"pos": (0, -0.3, 0)},
        "shoulderFL": {"rot": (-1.2, 0, 0)},
        "shoulderFR": {"rot": (-1.2, 0, 0)},
        "kneeFL": {"rot": (0.5, 0, 0)},
        "kneeFR": {"rot": (0.5, 0, 0)},
        "hipBL": {"rot": (-1.2, 0, 0)},
        "hipBR": {"rot": (-1.2, 0, 0)},
        "kneeBL": {"rot": (0.4, 0, 0)},
        "kneeBR": {"rot": (0.4, 0, 0)},
        "neck": {"rot": (0.1, 0, 0)},
    },
    "Sleep": lambda t: {
        "torso": {"pos": (0, -0.32, 0), "scale": (1.02, 0.98 + math.sin(t * 1.2) * 0.012, 1.02)},
        "shoulderFL": {"rot": (-1.25, 0, 0)},
        "shoulderFR": {"rot": (-1.25, 0, 0)},
        "kneeFL": {"rot": (0.55, 0, 0)},
        "kneeFR": {"rot": (0.55, 0, 0)},
        "hipBL": {"rot": (-1.25, 0, 0)},
        "hipBR": {"rot": (-1.25, 0, 0)},
        "kneeBL": {"rot": (0.45, 0, 0)},
        "kneeBR": {"rot": (0.45, 0, 0)},
        "neck": {"rot": (0.25, 0, 0)},
        "head": {"rot": (0.15, 0, 0)},
        "tail0": {"rot": (0.1, 0, 0)},
    },
    "Walk": lambda t: {
        **{"root": {"pos": (0, abs(math.sin(t * 2.2 * math.pi)) * 0.03, 0)}},
        **{"torso": {"rot": (math.sin(t * 2.2 * math.pi) * 0.04, 0, 0)}},
        **_walk_run(t, 1.1, 0.55, 0.35, 0.05, 0.05, 0.02, -0.2),
    },
    "Run": lambda t: {
        **{"root": {"pos": (0, abs(math.sin(t * 3.8 * math.pi)) * 0.07, 0)}},
        **{"torso": {"rot": (math.sin(t * 3.8 * math.pi) * 0.09, 0, 0)}},
        **_walk_run(t, 1.9, 0.95, 0.8, 0.08, 0.08, 0.05, -0.3),
    },
    "Eat": lambda t: {
        "neck": {"rot": (0.55 + math.sin(t * 1.4) * 0.12, 0, 0)},
        "head": {"rot": (-0.15 + math.sin(t * 2.8) * 0.08, 0, 0)},
        "torso": {"pos": (0, -0.12, 0)},
        "tail1": {"rot": (-0.1, 0, 0.1 + math.sin(t * 3) * 0.05)},
    },
    "Drink": lambda t: {
        "neck": {"rot": (0.7 - math.sin(t * 1.2) * 0.05, 0, 0)},
        "head": {"rot": (-0.35 - math.sin(t * 2.4) * 0.06, 0, 0)},
        "torso": {"pos": (0, -0.14, 0)},
    },
    "Play": lambda t: {
        "root": {"pos": (0, abs(math.sin(t * 2.2)) * 0.06, math.sin(t * 3) * 0.08)},
        "torso": {"rot": (0.1, 0, math.sin(t * 3) * 0.18)},
        "shoulderFL": {"rot": (-0.4 + math.sin(t * 2.2) * 0.2, 0, 0)},
        "shoulderFR": {"rot": (-0.4 - math.sin(t * 2.2) * 0.2, 0, 0)},
        "hipBL": {"rot": (-0.5, 0, 0)},
        "hipBR": {"rot": (-0.5, 0, 0)},
        "neck": {"rot": (0.2, math.sin(t * 2) * 0.25, 0)},
        "tail1": {"rot": (-0.3, 0, math.sin(t * 8) * 0.3)},
    },
    "Sniff": lambda t: {
        "neck": {"rot": (0.35, math.sin(t * 0.8) * 0.3, 0)},
        "head": {"rot": (-0.1, 0, 0)},
        "torso": {"pos": (0, -0.1, 0)},
    },
    "Stretch": lambda t: {
        **{"torso": {"pos": (0, -0.1 * max(0.0, math.sin(t * 1.1)), 0),
                     "scale": (1 + 0.08 * max(0.0, math.sin(t * 1.1)),
                               1 + 0.05 * max(0.0, math.sin(t * 1.1)),
                               1.2 + 0.3 * max(0.0, math.sin(t * 1.1)))}},
        **{"shoulderFL": {"rot": (-0.9 * max(0.0, math.sin(t * 1.1)), 0, 0)}},
        **{"shoulderFR": {"rot": (-0.9 * max(0.0, math.sin(t * 1.1)), 0, 0)}},
        **{"kneeFL": {"rot": (0.35 * max(0.0, math.sin(t * 1.1)), 0, 0)}},
        **{"kneeFR": {"rot": (0.35 * max(0.0, math.sin(t * 1.1)), 0, 0)}},
        **{"hipBL": {"rot": (0.7 * max(0.0, math.sin(t * 1.1)), 0, 0)}},
        **{"hipBR": {"rot": (0.7 * max(0.0, math.sin(t * 1.1)), 0, 0)}},
        **{"neck": {"rot": (-0.35 * max(0.0, math.sin(t * 1.1)), 0, 0)}},
    },
}

POSE_TRUTH = {
    "Idle": "AMBIENT", "Stand": "AMBIENT", "Sit": "REPRESENTATIVE", "Lie": "REPRESENTATIVE",
    "Sleep": "REPRESENTATIVE", "Walk": "REPRESENTATIVE", "Run": "REPRESENTATIVE",
    "Eat": "REPRESENTATIVE", "Drink": "REPRESENTATIVE", "Play": "REPRESENTATIVE",
    "Sniff": "OBSERVED", "Stretch": "OBSERVED",
}
POSE_DURATION = {
    "Idle": 8, "Stand": 4, "Sit": 6, "Lie": 8, "Sleep": 12, "Walk": 3,
    "Run": 2, "Eat": 6, "Drink": 5, "Play": 4, "Sniff": 7, "Stretch": 5,
}


def _walk_run(
    t: float, speed: float, amp: float, knee_bend: float, spread: float,
    spread_b: float, bob: float, tail_rot: float,
) -> PoseFrame:
    """Shared leg-gait frame for Walk/Run (mirrors motion.ts legSwing)."""
    f = _leg(t, speed, 0.0, amp, knee_bend)
    r = _leg(t, speed, math.pi, amp, knee_bend)
    b = _leg(t, speed, math.pi * 0.5, amp, knee_bend)
    lft = _leg(t, speed, math.pi * 1.5, amp, knee_bend)
    return {
        "shoulderFL": {"rot": (f[0], spread_b, 0)},
        "kneeFL": {"rot": (f[1], 0, 0)},
        "shoulderFR": {"rot": (r[0], -spread_b, 0)},
        "kneeFR": {"rot": (r[1], 0, 0)},
        "hipBL": {"rot": (b[0], spread, 0)},
        "kneeBL": {"rot": (b[1], 0, 0)},
        "hipBR": {"rot": (lft[0], -spread, 0)},
        "kneeBR": {"rot": (lft[1], 0, 0)},
        "neck": {"rot": (math.sin(t * speed * 4.0 * math.pi) * bob, 0, 0)},
        "tail1": {"rot": (tail_rot + math.sin(t * (6 if speed < 1.5 else 10)) * (0.1 if speed < 1.5 else 0.15), 0, 0)},
    }


JOINT_NAMES = [
    "root", "torso", "neck", "head", "earL", "earR", "tail0", "tail1",
    "shoulderFL", "kneeFL", "shoulderFR", "kneeFR",
    "hipBL", "kneeBL", "hipBR", "kneeBR",
]


def keyframes(pose: str, fps: int = 8) -> tuple[list[float], dict[str, list[tuple[float, float, float, float]]], dict[str, list[tuple[float, float, float]]]]:
    """Sample a pose into (times, quats per joint, offsets per joint).

    Three.js clips write QuaternionKeyframeTrack `joint_<name>.quaternion`;
    position offsets (torso/root) are baked as VectorKeyframeTrack too so the
    GLB animation matches the live pose driver.
    """
    fn = POSE_FN[pose]
    duration = POSE_DURATION[pose]
    frames = max(2, round(duration * fps))
    times: list[float] = []
    quats: dict[str, list[tuple[float, float, float, float]]] = {}
    pos: dict[str, list[tuple[float, float, float]]] = {}
    for i in range(frames):
        t = (i / (frames - 1)) * duration if frames > 1 else 0.0
        times.append(t)
        frame = fn(t)
        for name in JOINT_NAMES:
            x = frame.get(name)
            rot = tuple(x["rot"]) if x and "rot" in x else (0.0, 0.0, 0.0)
            p = tuple(x["pos"]) if x and "pos" in x else (0.0, 0.0, 0.0)
            quats.setdefault(name, []).append(_lerp_rot((rot[0], rot[1], rot[2])))
            pos.setdefault(name, []).append(p)
    return times, quats, pos
