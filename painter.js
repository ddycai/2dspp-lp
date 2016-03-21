const packer = require('./packer');
const Stack = require('./Stack');

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
      var stack = packer.fractionalStacks(rects, packing[i]);
      stacks.push(stack);
    }

    // Do triangle method on the last two stacks
    if (stage > 1) {
      var stack1 = stacks.pop();
      var stack2 = stacks.pop();
      var pair = packer.triangleMethod(rects, stack1, stack2);
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
        packer.makeIntegralRoundUp(rects, stacks[i]);
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
