import throttle from 'lodash/throttle';

import { nextFrame } from '@/lib/core/utils/delayers';
import { updateInheritanceSequance, checkInheritanceSequance } from '@/lib/core/utils';

import eventedMixin, { IEvented } from '@/lib/core/utils/mixins/evented';

import PureCanvas, { PureCanvasOptions } from '@/lib/core/utils/classes/PureCanvas';

export type CanvasOptions = PureCanvasOptions & { el: HTMLCanvasElement; size?: { width: number; height: number; }; };

const CLASS_NAME = Symbol.for('Canvas');

export const isCanvas = (Class: any) => checkInheritanceSequance(Class, CLASS_NAME);

type BaseInstanceType = PureCanvas & IEvented;

type PureCanvasConstructor = typeof PureCanvas;

interface BaseClassType extends PureCanvasConstructor {
  new(): BaseInstanceType;
}

const BaseClass: BaseClassType = eventedMixin(PureCanvas) as any;

/*
  const canvas = await Canvas.create({ el: document.body, size: { width: 64, height: 64 } });
  canvas.addEventListener(
    'render',
    (event) => { if (tile != null) event.ctx.drawImage(tile, 0, 0, 64, 64); },
  );
 */
// @ts-ignore
export default class Canvas extends BaseClass {
  public static async create<T extends Canvas, G extends CanvasOptions>(options: G): Promise<T> {
    const instance = new this(options);
    await instance.init();
    return <T>instance;
  }

  public get normalizedWidth() { return this.width; }
  public get normalizedHeight() { return this.height; }

  protected async _initListeners() {
    this.on(':renderRequest', this._renderInNextFrame, this);
  }

  protected _renderInNextFrame() {
    nextFrame(this._render);
  }

  protected _render(time: number) {
    this._applyImageSmoothing();
    this.clear();
    this.emit(':render', { ctx: this.ctx });
  }

  protected _applyOptions(options: CanvasOptions): boolean {
    if (!super._applyOptions(options)) throw new Error('el is required option!');

    if (options.el == null) throw new Error('el is required option!');
    this._updateSource(options.el);

    if (options.size != null) this.resize(options.size.width, options.size.height);

    return true;
  }

  constructor(options: CanvasOptions) {
    super(options);

    this._render = throttle(this._render.bind(this), 16);
    // this._renderInNextFrame = this._renderInNextFrame.bind(this);
  }

  public async init() {
    await this._initListeners();

    this._renderInNextFrame();
  }
}

updateInheritanceSequance(Canvas, null, CLASS_NAME);
