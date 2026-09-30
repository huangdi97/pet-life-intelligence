/**
 * PetTwoPointFiveD — identity-specific 2.5D pet layer for the corgi look.
 *
 * R2-P (§46.5 Pet Media hierarchy): REAL_3D_PROVIDER = EXTERNAL_BLOCKED, so the
 * midground pet visual is a code-native 2.5D illustration (allowed fallback per
 * canonical §10 "2.5D pet layer"). It encodes a specific corgi identity — warm
 * tan/cream coat, white blaze, upright rounded ears — so the owner sees an
 * individual corgi, not a generic species glyph. Presentation only: never
 * becomes a fact source.
 */
import React from "react";
import { StyleSheet, View } from "react-native";

interface Props {
  /** Target illustration width in dp; height follows a fixed 220:250 aspect. */
  width?: number;
  /** Coat variation: "corgi" is the only certified identity this round. */
  variant?: "corgi";
}

const CANVAS_W = 220;
const CANVAS_H = 250;

/** Scale a canvas-space value to the rendered width. */
const sc = (v: number, width: number) => (v / CANVAS_W) * width;

function Ellipse({
  x,
  y,
  w,
  h,
  color,
  radius,
  opacity,
  rotate,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  radius?: number;
  opacity?: number;
  rotate?: number;
}) {
  const width = sc(w, CANVAS_W);
  const height = sc(h, CANVAS_W);
  return (
    <View
      style={{
        position: "absolute",
        left: sc(x, CANVAS_W),
        top: sc(y, CANVAS_W),
        width,
        height,
        borderRadius: radius === undefined ? undefined : (radius / CANVAS_W) * CANVAS_W,
        backgroundColor: color,
        opacity,
        transform: rotate ? [{ rotate: `${rotate}deg` }] : undefined,
      }}
    />
  );
}

export function PetTwoPointFiveD({ width = 200, variant = "corgi" }: Props) {
  void variant; // reserved for future coat variants; only corgi is certified
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="柯基 2.5D 形象：奶油色，额头白色花纹，竖立圆耳"
      style={{ width, height: sc(CANVAS_H, width) }}
    >
      {/* ground shadow — anchors the pet in the stage */}
      <View style={[styles.groundShadow, { left: sc(35, width), top: sc(222, width), width: sc(150, width), height: sc(20, width) }]} />
      {/* legs */}
      <Ellipse x={88} y={182} w={24} h={50} color="#E0BC8C" radius={12} />
      <Ellipse x={122} y={182} w={24} h={50} color="#E8C79A" radius={12} />
      {/* body */}
      <Ellipse x={46} y={138} w={136} h={80} color="#F1D5A6" radius={40} />
      <Ellipse x={74} y={172} w={80} h={42} color="#FBF6EB" radius={21} />
      {/* ears behind head */}
      <Ellipse x={66} y={44} w={30} h={46} color="#D9A968" radius={15} rotate={-10} />
      <Ellipse x={140} y={44} w={30} h={46} color="#D9A968" radius={15} rotate={10} />
      <Ellipse x={71} y={52} w={18} h={28} color="#C08A4E" radius={9} rotate={-10} />
      <Ellipse x={145} y={52} w={18} h={28} color="#C08A4E" radius={9} rotate={10} />
      {/* head */}
      <Ellipse x={62} y={74} w={100} h={84} color="#F2D9AD" radius={34} />
      {/* forehead blaze — identity marking */}
      <Ellipse x={102} y={82} w={16} h={28} color="#FBF6EB" radius={8} />
      {/* muzzle */}
      <Ellipse x={82} y={110} w={58} h={42} color="#FBF6EB" radius={21} />
      <Ellipse x={103} y={118} w={14} h={10} color="#6E4A3A" radius={5} />
      {/* eyes */}
      <Ellipse x={86} y={98} w={7} h={8} color="#4A3A2C" radius={4} />
      <Ellipse x={128} y={98} w={7} h={8} color="#4A3A2C" radius={4} />
      {/* warm rim light from window side (top-left) */}
      <Ellipse x={70} y={80} w={38} h={16} color="#FFFDF6" radius={8} opacity={0.5} rotate={-18} />
    </View>
  );
}

const styles = StyleSheet.create({
  groundShadow: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(43,38,32,0.16)",
  },
});