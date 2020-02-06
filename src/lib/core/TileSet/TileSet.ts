import CanvasClassBuilder from '@/lib/core/Canvas/CanvasClassBuilder';
import Tile from '@/lib/core/RenderedObject/Tile';
import buildEvent from '@/lib/core/utils/buildEvent';


const BaseClass = new CanvasClassBuilder()
  .applySelectableMixin()
  .applyResizeableMixin()
  .applyTileableMixin()
  .build();

interface MouseEventPoint {
  offsetX: number;
  offsetY: number;
}

interface MultiselectEvent {
  from: MouseEventPoint;
  to: MouseEventPoint;
}

export default class TileSet extends BaseClass {
  private _imageSrcLink: string = null;
  private _imageSrc: HTMLImageElement = null;

  private _metadataSrcLink: string = null;
  private _metadataSrc: any = null;

  _onMultiSelect({ from, to }: MultiselectEvent) {
    const [xFrom, yFrom] = this._transformEventCoordsToGridCoords(from.offsetX, from.offsetY);
    const [xTo, yTo] = this._transformEventCoordsToGridCoords(to.offsetX, to.offsetY);
    const tiles = new Map<string, Tile>();
    for (let y = yFrom, _y = 0; y <= yTo; y += 1, _y += 1) {
      for (let x = xFrom, _x = 0; x <= xTo; x += 1, _x += 1) {
        tiles.set(`${_y}|${_x}`, this._getTile(x, y));
      }
    }
    this.dispatchEvent(buildEvent(':multiSelect', null, { tiles }));
  }

  constructor(options: any = {}) {
    super(Object.assign({}, options, { size: { width: 0, height: 0 } }));

    this._imageSrcLink = options.imageUrl;
    this._metadataSrcLink = options.metadataUrl;
  }

  async init() {
    await this._loadImage();

    await super.init();

    await this._parse();
    // await this._loadMetadata();
    // await this.load({ meta: this._metadataSrc, img: this._imageSrc });

    this._renderInNextFrame();
  }

  async _initListeners() {
    await super._initListeners();
    this.addEventListener(':_multiSelect', this._onMultiSelect, { passive: true });
  }

  async _loadImage() {
    if (this._imageSrcLink == null || this._imageSrcLink === '') throw new Error('URL is not settled!');
    this._imageSrc = new Image();
    await new Promise((resolve, reject) => {
      this._imageSrc.onload = resolve;
      this._imageSrc.onerror = reject;
      this._imageSrc.src = this._imageSrcLink;
    });
    this.updateSize(this._imageSrc.width, this._imageSrc.height);
  }

  async _parse() {
    const sourceURL = this._imageSrcLink;
    const source = this._imageSrc;
    for (let row = 0; row < this._rowsNumber; row += 1) {
      for (let col = 0; col < this._columnsNumber; col += 1) {
        const tile = new Tile({
          source,
          sourceURL,
          sourceBoundingRect: {
            x: col * this._tileSize.x,
            y: row * this._tileSize.y,
            width: this._tileSize.x,
            height: this._tileSize.y,
          },
        });
        this._updateTileByCoord(col, row, '0', tile);
      }
    }
  }

  async _loadMetadata() {
    if (this._metadataSrcLink == null || this._metadataSrcLink === '') throw new Error('URL is not settled!');
    this._metadataSrc = await (await fetch(this._metadataSrcLink)).json();
  }

  public async updateImageUrl(url: string = null) {
    if (url == null) return;

    this._imageSrcLink = url;

    this._clearLayer('ALL');

    await this._loadImage();
    await this._parse();

    this._renderInNextFrame();
  }
}