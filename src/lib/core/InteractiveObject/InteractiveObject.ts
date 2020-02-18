import GameObject, { IHitBox } from '@/lib/core/RenderedObject/GameObject/GameObject';

import Point from '@/lib/core/utils/classes/Point';

interface InteractiveObjectOptions {
  gameObject: GameObject,
  coordTiles?: Point[],
  position?: IPoint,
}

interface IObjectsRelativePosition {
  y: 'ABOVE' | 'BELOW' | 'MIDDLE';
  x: 'LEFT_OF' | 'RIGHT_OF' | 'MIDDLE';
}

export default class InteractiveObject {
  protected _gameObject: GameObject = null;
  protected _coordTiles: Point[] = [];
  protected _position: Point = new Point(0, 0);

  public get renderedObject(): IRenderedObject { return this._gameObject; }
  public get position() { return this._position.toObject(); }

  public get boundingRect(): IBoundingRect {
    return {
      x: this._position.x,
      y: this._position.y,
      width: this._gameObject.width,
      height: this._gameObject.height,
    };
  }

  public get boundingEdges(): IBoundingEdges {
    return {
      left: this._position.x,
      top: this._position.y,
      right: this._position.x + this._gameObject.width,
      bottom: this._position.y + this._gameObject.height,
    };
  }

  public get hitBoxes(): IBoundingEdges[] {
    return this._gameObject.hitBoxes.map((hitBox) => ({
      left: this._position.x + hitBox.from.x,
      top: this._position.y + hitBox.from.y,
      right: this._position.x + hitBox.to.x,
      bottom: this._position.y + hitBox.to.y,
    }));
  }

  /*
    1 2 3
    4 5 6
    7 8 9

    1 - ABOVE + LEFT_OF
    2 - ABOVE + MIDDLE
    3 - ABOVE + RIGHT_OF

    4 - MIDDLE + LEFT_OF
    5 - MIDDLE + MIDDLE
    6 - MIDDLE + RIGHT_OF

    7 - BELOW + LEFT_OF
    8 - BELOW + MIDDLE
    9 - BELOW + RIGHT_OF
  */
  protected _getRelativePosition(aEdges: IBoundingEdges, bEdges: IBoundingEdges): IObjectsRelativePosition {
    const res: IObjectsRelativePosition = { x: null, y: null };

    if (bEdges.bottom < aEdges.top) res.y = 'ABOVE';
    else if (bEdges.top > aEdges.bottom) res.y = 'BELOW';
    else res.y = 'MIDDLE';

    if (bEdges.right < aEdges.left) res.x = 'LEFT_OF';
    else if (bEdges.left > aEdges.right) res.x = 'RIGHT_OF';
    else res.x = 'MIDDLE';

    return res;
  }

  constructor(options: InteractiveObjectOptions) {
    if (options.gameObject) this._gameObject = options.gameObject;
    if (options.coordTiles) this._coordTiles = options.coordTiles;
    if (options.position) this._position.updateCoordinates(options.position.x, options.position.y);
  }

  public checkTile(coord: Point): boolean {
    const equal = coord.isEqualToPoint.bind(coord);
    return this._coordTiles.find(equal) != null;
  }

  public getDistanceTo(edges: IBoundingEdges, newEdges: IBoundingEdges): IDistanceToObject {
    const distanceTo = {
      left: Infinity,
      right: Infinity,
      up: Infinity,
      down: Infinity,
    };

    let isIntersected = false;

    for (const hitBox of this.hitBoxes) {
      const relativePosition = this._getRelativePosition(newEdges, hitBox);

      if (relativePosition.x === 'MIDDLE' && relativePosition.y === 'MIDDLE') {
        isIntersected = true;
        const relativePositionBeforeShift = this._getRelativePosition(edges, hitBox);

        if (relativePositionBeforeShift.x === 'LEFT_OF') {
          distanceTo.left = Math.min(distanceTo.left, edges.left - hitBox.right - 1);
        } else if (relativePositionBeforeShift.x === 'RIGHT_OF') {
          distanceTo.right = Math.min(distanceTo.right, hitBox.left - edges.right - 1);
        } else {
          distanceTo.left = 0; distanceTo.right = 0;
        }

        if (relativePositionBeforeShift.y === 'ABOVE') {
          distanceTo.up = Math.min(distanceTo.up, edges.top - hitBox.bottom - 1);
        } else if (relativePositionBeforeShift.y === 'BELOW') {
          distanceTo.down = Math.min(distanceTo.down, hitBox.top - edges.bottom - 1);
        } else {
          distanceTo.up = 0; distanceTo.down = 0;
        }
      }
    }

    return isIntersected ? distanceTo : null;
  }

  public setPosition(x: number, y: number) {
    this._position.updateCoordinates(x, y);
  }
}
