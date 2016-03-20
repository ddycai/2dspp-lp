"use strict";

module.exports = {
  drawPacking: function (rects, result, canvas, config) {
    // resize the canvas accordingly
    var height = config.rectMaxHeight;
    canvas.height = height * result.totalHeight + 50;
    clearCanvas(canvas);
    var width = canvas.width;

    var packing = result.packing;
    var context = canvas.getContext("2d");
    // translates the canvas
    context.translate(0, canvas.height);
    context.scale(1, -1);
    var yh = 0;
    for (var i = 0; i < packing.length; i++) {
      var S = crossSection(rects, packing[i].configuration);
      var coords = drawCrossSection(S, packing[i].height, yh);
      console.log(coords);
      for (var j = 0; j < coords.length; j++) {
        //var context = canvas.getContext('2d');
        var h = coords[j].y2 - coords[j].y1;
        var w = coords[j].x2 - coords[j].x1;
        context.lineWidth = 1;
        context.strokeStyle = config.rectBorder;
        console.log(coords[j].id);
        context.fillStyle = colours[coords[j].id % colours.length];
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
      }
      context.lineWidth = config.configLineWidth;
      context.strokeStyle = config.configBorder;
      context.strokeRect(
          0,
          yh * height,
          width,
          yh + height * packing[i].height
      );
      yh += packing[i].height;
    }
  }
};

var colours = [];

var rgb = hexToRgb("#722364");
//var rgb = hexToRgb("#D81159");
for (var i = 0; i < 10; i++) {
  colours.push(rgbToHex(rgb));
  rgb = tint(rgb, 0.15);
}

/**
 * Converts the given configuration into a cross section.
 *
 * A cross section is the multiset of rectangles when a horizontal line is
 * drawn along any point in the configuration.
 */
function crossSection (T, C) {
  var S = [];
  for (var i = 0; i < C.length; i++) {
    for (var j = 0; j < C[i]; j++) {
      S.push(T[i]);
    }
  }
  return S;
}

/**
 * Returns the coordinates of all the rectangles in the given cross section.
 * S - the cross section
 * height - the height of the cross section
 * offset - the offset of the configuration
 */
function drawCrossSection (S, height, offset) {
  height = height + offset;
  var coords = [];
  var x = 0;
  for (var i = 0; i < S.length; i++) {
    var y = offset;
    while (y < height) {
      coords.push({
        id: S[i].id,
        x1: x,
        y1: y,
        x2: x + S[i].width,
        y2: Math.min(height, y + S[i].height)
      });
      y += S[i].height;
    }
    x += S[i].width;
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
