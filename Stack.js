/**
 * Represents a stack of rectangles of the same type one on top of another.
 */
module.exports = class Stack {
  constructor(rect, count) {
    this._rect = rect;
    this._count = count;
  }

  get rect() {
    return this._rect;
  }

  /**
   * Gets the (potentially fractional) number of rectangles in this stack.
   */
  get count() {
    return this._count;
  }

  /**
   * Gets the fractional part of the rectangle residing at the top (if any).
   */
  get fraction() {
    return this._count - Math.floor(this._count);
  }

  /**
   * Gets the number of whole rectangles.
   */
  get wholeRectangles() {
    return Math.floor(this._count);
  }

  addHeight(amount) {
    this._count += amount;
  }

  /**
   * Rounds this stack up.
   */
  roundUp() {
    this._count = Math.ceil(this._count);
  }

  /**
   * Rounds this stack down and returns the fractional part that is rounded
   * away.
   */
  roundDown() {
    var f = this.fraction;
    this._count = Math.floor(this._count);
    return f;
  }
}
