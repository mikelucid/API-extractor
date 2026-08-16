/**
 * Grid LiveRasterizer from Live Rating PDF (pp. 6–14).
 * Bins streaming (x,y) points into a density grid and flattens to an ML feature vector.
 */

export interface GridRasterizerOptions {
  xBins?: number;
  yBins?: number;
  xRange?: readonly [number, number];
  yRange?: readonly [number, number];
  bufferSize?: number;
}

export class GridLiveRasterizer {
  readonly xBins: number;
  readonly yBins: number;
  readonly xRange: readonly [number, number];
  readonly yRange: readonly [number, number];
  private grid: number[];
  private buffer: Array<[number, number]> = [];
  private readonly bufferSize: number;

  constructor(options: GridRasterizerOptions = {}) {
    this.xBins = options.xBins ?? 8;
    this.yBins = options.yBins ?? 8;
    this.xRange = options.xRange ?? [0, 100];
    this.yRange = options.yRange ?? [0, 100];
    this.bufferSize = options.bufferSize ?? 100;
    this.grid = zeros(this.xBins * this.yBins);
  }

  get featureSize(): number {
    return this.xBins * this.yBins;
  }

  clear(): void {
    this.buffer = [];
    this.grid = zeros(this.featureSize);
  }

  addPoint(x: number, y: number): void {
    const xc = clamp(x, this.xRange[0], this.xRange[1]);
    const yc = clamp(y, this.yRange[0], this.yRange[1]);
    let xi = Math.floor(
      ((xc - this.xRange[0]) / (this.xRange[1] - this.xRange[0])) * this.xBins,
    );
    let yi = Math.floor(
      ((yc - this.yRange[0]) / (this.yRange[1] - this.yRange[0])) * this.yBins,
    );
    xi = Math.min(Math.max(xi, 0), this.xBins - 1);
    yi = Math.min(Math.max(yi, 0), this.yBins - 1);
    this.buffer.push([xi, yi]);
    if (this.buffer.length > this.bufferSize) {
      this.buffer = this.buffer.slice(-this.bufferSize);
    }
    this.recompute();
  }

  private recompute(): void {
    this.grid = zeros(this.featureSize);
    for (const [bx, by] of this.buffer) {
      this.grid[bx * this.yBins + by]! += 1;
    }
    const norm = this.buffer.length + 1e-6;
    for (let i = 0; i < this.grid.length; i++) {
      this.grid[i]! /= norm;
    }
  }

  /** Flattened density map for the neural ratio predictor. */
  getFeatures(): number[] {
    return [...this.grid];
  }

  /** Centroid / covariance math features (later PDF MathRasterizer path). */
  getMathFeatures(): { meanX: number; meanY: number; covXX: number; covYY: number } {
    if (this.buffer.length === 0) {
      return { meanX: 50, meanY: 50, covXX: 0, covYY: 0 };
    }
    const xs = this.buffer.map(([x]) => x);
    const ys = this.buffer.map(([, y]) => y);
    const meanX = avg(xs);
    const meanY = avg(ys);
    const covXX = avg(xs.map((x) => (x - meanX) ** 2));
    const covYY = avg(ys.map((y) => (y - meanY) ** 2));
    return { meanX, meanY, covXX, covYY };
  }
}

function zeros(n: number): number[] {
  return Array.from({ length: n }, () => 0);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function avg(vals: number[]): number {
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
