import * as PIXI from "pixi.js";
import * as particles from "pixi-particles";
import * as TextInput_ from "pixi-text-input";

export default PIXI;

export const Application = PIXI.Application;
export const loader = PIXI.Loader.shared;
export const resources = loader.resources;
export const Container = PIXI.Container;
export const Texture = PIXI.Texture;
export const Graphics = PIXI.Graphics;
export const Sprite = PIXI.Sprite;
export const TilingSprite = PIXI.TilingSprite;
export const AnimatedSprite = PIXI.AnimatedSprite;
export const Text = PIXI.Text;
export const TextStyle = PIXI.TextStyle;
export const NineSlicePlane = PIXI.NineSlicePlane;
export const Emitter = particles.Emitter;
export const Rectangle = PIXI.Rectangle;
export const filters = PIXI.filters;
export const TextInput = TextInput_;