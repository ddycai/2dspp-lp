"use strict";

module.exports = {
  /**
   * In: rects the list of rectangles, result the result of the linear program,
   * canvas the HTML canvas and config a list of options, draws the packing
   * specified by result onto the canvas.
   */
  drawPacking: function (rects, result, canvas, stage, options) {
    var info = {
      heights: [],
      configs: []
    };
    // resize the canvas accordingly and rename variables for better readability
    var height = options.rectMaxHeight;
    var width = canvas.width;
    options.canvasWidth = canvas.width;
    var packing = result.packing;
    var context = canvas.getContext("2d");

    // First pass, get all the configuration stacks
    var stacks = [];
    for (var i = 0; i < packing.length; i++) {
      var stack = fractionalStacks(rects, packing[i]);
      stacks.push(stack);
    }

    // Do triangle method on the last two stacks
    if (stage > 1) {
      var stack1 = stacks.pop();
      var stack2 = stacks.pop();
      var pair = triangleMethod(rects, stack1, stack2);
      stacks.push(pair.C1);
      stacks.push(pair.C2);
      console.log("pair...");
      console.log(pair);
    }
  
    // We have to do two passes to get the height of the final packing
    var coordsList = [];
    var currentHeight = 0;
    for (var i = 0; i < stacks.length; i++) {
      if (stage > 0) {
        makeIntegralRoundUp(rects, stacks[i]);
      }
      var coords = stackCoordinates(stacks[i], currentHeight);
      coordsList.push(coords);
      var configurationHeight = 0;
      for (var j = 0; j < coords.length; j++) {
        var h = coords[j].y2 - coords[j].y1;
        configurationHeight = Math.max(configurationHeight, coords[j].y2 - currentHeight);
      }
      currentHeight += configurationHeight;
    }

    // Set the height of the canvas
    canvas.height = height * currentHeight + 50;
    // Flip the canvas
    context.translate(0, canvas.height);
    context.scale(1, -1);

    currentHeight = 0;
    for (var i = 0; i < coordsList.length; i++) {
      var coords = coordsList[i];
      var configurationHeight = drawConfiguration(context, coords, currentHeight, options);
      info.heights.push(configurationHeight);
      currentHeight += configurationHeight;
    }
    return info;
  },

  /**
   * Returns a gradient of lighter colours given an initial shade.
   */
  tintGradient: function (hex, tintFactor, iterations) {
    var colours = [];
    var rgb = hexToRgb(hex);
    //var rgb = hexToRgb("#D81159");
    for (var i = 0; i < iterations; i++) {
      colours.push(rgbToHex(rgb));
      rgb = tint(rgb, tintFactor);
    }
    return colours;
  }
};

function drawConfiguration(context, coords, currentHeight, options) {  
  var configurationHeight = 0;
  var height = options.rectMaxHeight;
  var width = options.canvasWidth;
  //console.log(coords);
  for (var j = 0; j < coords.length; j++) {
    //var context = canvas.getContext('2d');
    var h = coords[j].y2 - coords[j].y1;
    var w = coords[j].x2 - coords[j].x1;
    context.lineWidth = 1;
    context.strokeStyle = options.rectBorder;
    //console.log(coords[j].id);
    context.fillStyle = options.colours[coords[j].id % options.colours.length];
    context.fillRect(
        coords[j].x1 * width,
        coords[j].y1 * height,
        w * width,
        h * height
    );
    context.strokeRect(
        coords[j].x1 * width,
        coords[j].y1 * height,
        w * width,
        h * height
    );
    configurationHeight = Math.max(configurationHeight, coords[j].y2 - currentHeight);
  }
  //console.log(i + ": " + configurationHeight);
  context.lineWidth = options.configLineWidth;
  context.strokeStyle = options.configBorder;
  context.strokeRect(
      0,
      currentHeight * height,
      width,
      configurationHeight * height
  );
  return configurationHeight;
}

/**
 * Represents a stack of rectangles of the same type one on top of another.
 */
class Stack {
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
    return fractionalPart(this._count);
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

/**
 * Gets the fractional part of the given double.
 */
function fractionalPart(f) {
  return f - Math.floor(f);
}

/**
 * Makes the given list of stacks integral by combining their fractional parts.
 */
function makeIntegralRoundUp(T, S) {
  // Analyze the total amount of fractional parts of each type
  var fractions = Array.apply(null, Array(T.length)).map(Number.prototype.valueOf,0);
  for (var i = 0; i < S.length; i++) {
    fractions[S[i].rect.id] += S[i].fraction;
  }
  // Round all the fractional parts up
  fractions = fractions.map(Math.ceil);

  // Round up as many stacks as is allowed
  for (var i = 0; i < S.length; i++) {
    if (fractions[S[i].rect.id] > 0) {
      S[i].roundUp();
      fractions[S[i].rect.id]--;
    } else {
      S[i].roundDown();
    }
  }
}

/**
 * Makes the given list of stacks with fractional parts cut at the cutting 
 * line integral by rounding down until they are integral.
 * Returns the number of fractional parts of each rectangle that were removed.
 */
function makeIntegralRoundDown(T, S) {
  // Analyze the total amount of fractional parts of each type
  var fractions = Array.apply(null, Array(T.length)).map(Number.prototype.valueOf,0);
  for (var i = 0; i < S.length; i++) {
    fractions[S[i].rect.id] += S[i].fraction;
  }
  // Round all the fractional parts down and store them.
  var removedFractions = Array.apply(null, Array(T.length)).map(Number.prototype.valueOf,0);
  for (var i = 0; i < S.length; i++) {
    removedFractions[i] = fractionalPart(fractions[i]);
    fractions[i] = Math.floor(fractions[i]);
  }

  var result = [];
  // Round up as many stacks as is allowed
  for (var i = 0; i < S.length; i++) {
    if (fractions[S[i].rect.id] > 0) {
      S[i].roundUp();
      fractions[S[i].rect.id]--;
    } else {
      S[i].roundDown();
    }
    if (S[i].count > 0) {
      result.push(S[i]);
    }
  }
  return removedFractions;
}

function partition(T, stack, common) {
  var count = Array.apply(null, Array(T.length)).map(Number.prototype.valueOf,0);
  var S1 = [];
  var S2 = [];
  for (var i = 0; i < stack.length; i++) {
    var id = stack[i].rect.id;
    if (count[id] < common[id]) {
      S1.push(stack[i]);
      count[id]++;
    } else {
      S2.push(stack[i])
    }
  }
  return {S1: S1, S2: S2};
}

function triangleMethod(T, stack1, stack2) {
  // Step 1: combine the common rectangles
  // frequency count of types of rectangles in stacks
  var count1 = Array.apply(null, Array(T.length)).map(Number.prototype.valueOf,0);
  var count2 = Array.apply(null, Array(T.length)).map(Number.prototype.valueOf,0);
  for (var i = 0; i < stack1.length; i++) {
    count1[stack1[i].rect.id]++;
  }
  for (var i = 0; i < stack2.length; i++) {
    count2[stack2[i].rect.id]++;
  }
  // Get the number of rectangles which are common between them.
  var common = Array.apply(null, Array(T.length)).map(Number.prototype.valueOf,0);
  for (var i = 0; i < T.length; i++) {
    common[i] = Math.min(count1[i], count2[i]);
  }
  //console.log(common);
  var C1 = partition(T, stack1, common);
  var C2 = partition(T, stack2, common);
  //console.log(C1.S1);
  //console.log(C2.S1);
  // Round down S1 in C2 and round up S1 in C1
  for (var i = 0; i < C1.S1.length; i++) {
    var fraction = C2.S1[i].roundDown();
    C1.S1[i].addHeight(fraction);
  }
  makeIntegralRoundUp(T, C1.S1);
  makeIntegralRoundDown(T, C1.S2);
  makeIntegralRoundDown(T, C2.S2);
  // Remove stacks with count of zero.
  var emptyStackFilter = (x) => {return (x.count > 0)};
  C1.S1 = C1.S1.filter(emptyStackFilter);
  C1.S2 = C1.S2.filter(emptyStackFilter);
  C2.S1 = C2.S1.filter(emptyStackFilter);
  C2.S2 = C2.S2.filter(emptyStackFilter);
  // Step 2: round down until the rectangles are integral

  //TODO: finish the rest of the this function
  return {
    C1: C1.S1.concat(C1.S2),
    C2: C2.S1.concat(C2.S2)
  };
}

function fractionalStacks(T, packing) {
  var S = [];
  for (var i = 0; i < packing.configuration.length; i++) {
    for (var j = 0; j < packing.configuration[i]; j++) {
      S.push(new Stack(T[i], packing.height / T[i].height));
    }
  }
  return S;
}

function roundedUpStacks(T, packing) {
  var S = fractionalStacks(T, packing);
  makeIntegralRoundUp(T, S);
  return S;
}

/**
 * Given some rectangle stacks, calculates the coordinates for each rectangle
 * and returns them as a list of coord objects. Each coord object has the id for
 * the rectangle object and the coordinates of the bottom left (x1, y1) and the
 * top right (x2, y2) corner.
 */
function stackCoordinates (stack, offset) {
  var coords = [];
  var x = 0;
  for (var i = 0; i < stack.length; i++) {
    var y = offset;
    for (var j = 0; j < stack[i].wholeRectangles; j++) {
      coords.push({
        id: stack[i].rect.id,
        x1: x,
        y1: y,
        x2: x + stack[i].rect.width,
        y2: y + stack[i].rect.height
      });
      y += stack[i].rect.height;
    }
    // Draw the fractional rectangle.
    var f = stack[i].fraction;
    if (f > 0) {
      coords.push({
        id: stack[i].rect.id,
        x1: x,
        y1: y,
        x2: x + stack[i].rect.width,
        y2: y + stack[i].rect.height * f
      });
    }
    x += stack[i].rect.width;
  }
  return coords;
}

function clearCanvas(canvas) {
  var context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
}

// ==========
// Colour functions
// ==========

function tint(rgb, tint_factor) {
  return {
    r: rgb.r + Math.round((255 - rgb.r) * tint_factor),
    g: rgb.g + Math.round((255 - rgb.g) * tint_factor),
    b: rgb.b + Math.round((255 - rgb.b) * tint_factor)
  }
}

// Source: http://stackoverflow.com/q/5623838/2372271
function componentToHex(c) {
      var hex = c.toString(16);
          return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(rgb) {
      return "#" + componentToHex(rgb.r) + componentToHex(rgb.g) + componentToHex(rgb.b);
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}
