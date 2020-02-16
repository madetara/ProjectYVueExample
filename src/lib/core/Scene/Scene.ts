import Character from '@/lib/core/InteractiveObject/Character/Character';
import InteractiveObject from '@/lib/core/InteractiveObject/InteractiveObject';
import Point from '@/lib/core/utils/classes/Point';
import GameObject, { IHitBox } from '@/lib/core/RenderedObject/GameObject/GameObject';

declare global {
  interface Scene {
    addHero(arg0: Character): void,
    addObject(object: any, type: string): void
    start(): void,
    pause(): void,
    checkBeyondPosition(x: number, y: number, width: number, height: number): boolean,
    checkMoveCollisions(position: IPoint, object: IHitBox, xOffset: number, yOffset: number): boolean,
    checkDamageCollisions(position: IPoint, object: IHitBox): boolean,
    setBackground(background: ILayerCache): void,
    setForeground(foreground: ILayerCache): void,
    addObjects(objects: Map<string, IRenderedObject>): void,
  }

  interface ICollisionArgument {
    hitBox: IHitBox,
    position: IPoint,
  }
}

/**
 * @class Scene - The core of a game.
 */
export default class Scene {
  private _staticObjects: InteractiveObject[] = [];
  private _dynamicObjects: any[] = [];
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _hero: Character;
  private _paused: boolean;
  private background: ILayerCache;
  private foreground: ILayerCache;

  /**
   * @constructor Scene
   * @param {Element} element - a place where game will be rendering
   * @param {number} [width=500] - width of a game viewport
   * @param {number} [height=500] - height of a game viewport
   */
  constructor(element: Element, width?: number, height?: number) {
    this._canvas = document.createElement('canvas');
    this._canvas.width = width || 500;
    this._canvas.height = height || 500;
    element.append(this._canvas);
    this._ctx = this._canvas.getContext('2d');
  }

  setBackground(background: ILayerCache) {
    this.background = background;
  }
  setForeground(foreground: ILayerCache) {
    this.foreground = foreground;
  }
  /**
   * Method to add a main Hero to a game
   * @param {Character} hero - Instance of the Character class which would be the main hero of a game.
   */
  addHero(hero: Character) {
    if (hero instanceof Character) {
      this._hero = hero;
    } else throw new Error('Hero should be an instance of the Character class.');
  }

  /**
   *
   * @param object
   * @param {string} [type=static] - dynamic or static
   */
  // TODO fix types
  addObject(object: InteractiveObject, type?: string) {
    if (object && type === 'dynamic') this._dynamicObjects.push(object);
    if (object && type === 'static') this._staticObjects.push(object);
    else this._staticObjects.push(object);
  }

  addObjects(objects: Map<string, GameObject>) {
    // this value is the size of tiles from TileMap. Because place represent coords on the grid
    // for example - 1|2 means that real point is 1 * 16 | 2 * 16
    const defaultTileSize = 16;
    for (const [place, renderedObject] of objects.entries()) {
      // eslint-disable-next-line no-continue
      if ((renderedObject as any).isVirtual) continue;
      const [x, y] = Point.fromReverseString(place).toArray();
      const position = {
        x: x * defaultTileSize,
        y: y * defaultTileSize,
      };
      this.addObject(new InteractiveObject({ gameObject: renderedObject, position }), 'static');
    }
  }

  start() {
    this._paused = false;
    this._render();
  }

  pause() {
    this._paused = true;
  }

  checkBeyondPosition(x: number, y: number, width: number, height: number) {
    if (x <= 0) return false;
    if (x + width >= this._canvas.width) return false;
    if (y < 0) return false;
    return y + height < this._canvas.height;
  }

  // 1 2 3
  // 4 5 6
  // 7 8 9
  getObjectPlace(a, b) {
    const res = { x: null, y: null };

    if (b.bottom < a.top) res.y = 'ABOVE';
    else if (b.top > a.bottom) res.y = 'BELOW';
    else res.y = 'MIDDLE';

    if (b.right < a.left) res.x = 'LEFT_OF';
    else if (b.left > a.right) res.x = 'RIGHT_OF';
    else res.x = 'MIDDLE';

    return res;
  }

  /**
   * If object has collision with any static object returns true.
   * @param {IPoint} position - position of object which want to detect collisions
   * @param {IHitBox} object
   * @param {number} xOffset - shift on the x axis
   * @param {number} yOffset - shift on the y axis
   * @returns {boolean}
   */
  checkMoveCollisions(position: IPoint, object: IHitBox, xOffset: number, yOffset: number) {
    const a = {
      left: Number(position.x) + Number(object.from.x),
      top: Number(position.y) + Number(object.from.y),
      right: Number(position.x) + Number(object.to.x),
      bottom: Number(position.y) + Number(object.to.y),
    };

    const newA = {
      left: a.left + xOffset,
      top: a.top + yOffset,
      right: a.right + xOffset,
      bottom: a.bottom + yOffset,
    };

    const intersectedObjects = [];
    const canMove = {
      up: Number.MAX_SAFE_INTEGER,
      down: Number.MAX_SAFE_INTEGER,
      left: Number.MAX_SAFE_INTEGER,
      right: Number.MAX_SAFE_INTEGER,
    };

    for (const obj of this._staticObjects) {
      let isIntersected = false;
      for (const hitBox of obj.hitBoxes) {
        const b = {
          left: Number(obj.position.x) + Number(hitBox.from.x),
          top: Number(obj.position.y) + Number(hitBox.from.y),
          right: Number(obj.position.x) + Number(hitBox.to.x),
          bottom: Number(obj.position.y) + Number(hitBox.to.y),
        };

        const relativePosition = this.getObjectPlace(newA, b);

        if (relativePosition.x === 'MIDDLE' && relativePosition.y === 'MIDDLE') {
          isIntersected = true;
          const relativePositionBeforeShift = this.getObjectPlace(a, b);

          if (relativePositionBeforeShift.x === 'LEFT_OF') {
            canMove.left = Math.min(canMove.left, a.left - b.right - 1);
          } else if (relativePositionBeforeShift.x === 'RIGHT_OF') {
            canMove.right = Math.min(canMove.right, b.left - a.right - 1);
          } else {
            canMove.left = 0; canMove.right = 0;
          }

          if (relativePositionBeforeShift.y === 'ABOVE') {
            canMove.up = Math.min(canMove.up, a.top - b.bottom - 1);
          } else if (relativePositionBeforeShift.y === 'BELOW') {
            canMove.down = Math.min(canMove.down, b.top - a.bottom - 1);
          } else {
            canMove.up = 0; canMove.down = 0;
          }

          break;
        }
      }
      if (isIntersected) {
        intersectedObjects.push(obj);
      }
    }
    return canMove;
  }

  /**
   * If object has collision with any dynamic object returns true.
   * It means that object receives a damage.
   * @param {IPoint} position - position of object which want to detect damage
   * @param {IHitBox} object
   * @returns {boolean}
   */
  checkDamageCollisions(position: IPoint, object: IHitBox) {
    const a = {
      hitBox: object,
      position,
    };

    return this._dynamicObjects.some(obj => {
      return obj.hitBoxes.some((hitBox: IHitBox) => {
        const b = {
          hitBox,
          position: obj.position,
        };
        return this._detectCollision(a, b);
      });
    });
  }

  _render() {
    if (this._paused) return;
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    this._renderBackground();
    this._renderObjects();
    this._renderHero();
    this._renderForeground();

    if (!this._paused) requestAnimationFrame(this._render.bind(this));
  }

  _renderBackground() {
    const { canvas, canvas: { width, height } } = this.background;
    this._ctx.drawImage(canvas, 0, 0, width, height, 0, 0, width, height);
  }
  _renderForeground() {
    const { canvas, canvas: { width, height } } = this.foreground;
    this._ctx.drawImage(canvas, 0, 0, width, height, 0, 0, width, height);
  }

  _renderObjects() {
    this._renderStaticObjects();
    this._dynamicObjects.forEach(dynamicObject => this._renderObject(dynamicObject));
  }

  _renderHero() {
    if (this._hero) this._renderObject(this._hero);
  }

  _renderInteractiveObject(object: InteractiveObject) {
    const { width, height } = object.sourceBoundingRect;
    const { x, y } = object.position;
    this._ctx.drawImage(
      object.render(),
      0,
      0,
      width,
      height,
      x,
      y,
      width,
      height,
    );
  }
  // TODO fix types
  _renderObject(object: any) {
    const { position, width, height } = object;
    this._ctx.drawImage(
      object.render(),
      0,
      0,
      width,
      height,
      position.x,
      position.y,
      width,
      height,
    );
  }

  _renderStaticObjects() {
    this._staticObjects.forEach(staticObject => this._renderInteractiveObject(staticObject));
  }

  _detectCollision(
    {
      position: ap,
      hitBox: ahit,
    }: ICollisionArgument,
    {
      position: bp,
      hitBox: bhit,
    }: ICollisionArgument,
    xOffset: number = 0,
    yOffset: number = 0,
  ) {
    const { x: apx, y: apy } = ap;
    const {
      from: { x: afx, y: afy },
      to: { x: atx, y: aty },
    } = ahit;
    const asx = Number(apx) + Number(afx);
    const asy = Number(apy) + Number(afy);
    const aw = Number(atx) - Number(afx);
    const ah = Number(aty) - Number(afy);
    const ax = asx + xOffset;
    const ay = asy + yOffset;
    const ax2 = ax + aw;
    const ay2 = ay + ah;

    const { x: bpx, y: bpy } = bp;
    const {
      from: { x: bfx, y: bfy },
      to: { x: btx, y: bty },
    } = bhit;
    const bx = Number(bpx) + Number(bfx);
    const by = Number(bpy) + Number(bfy);
    const bw = Number(btx) - Number(bfx);
    const bh = Number(bty) - Number(bfy);
    const bx2 = bx + bw;
    const by2 = by + bh;

    if (bx < ax2 && ax < bx2 && by < ay2) { return ay < by2; }
    return false;
  }
}
