var solver = require("javascript-lp-solver");

"use strict";
// ==============
// Functions for solving the 2DSPP linear program.
// ==============
module.exports = {
  /**
   * Solves the fractional rectangle packing problem and returns the solution.
   * T - a list of rectangles (created by toRectangles())
   */
  fractionalPacking: function (T) {
    var configurations = generateConfigurations(T);
    var model = buildLinearProgram(T, configurations);
    var solution = solver.Solve(model);
    if (!solution.feasible) {
      return null;
    }
    var packing = [];
    for (var property in solution) {
      if (solution.hasOwnProperty(property) && property[0] == 'x') {
        var id = parseInt(property.substring(1));
        packing.push({
          "height": solution[property],
          "configuration": configurations[id]
        });
      }
    }
    return {
      "totalHeight": solution.result,
      "packing": packing
    };
  },

  /**
   * Converts the input for 2DSPP (heights, widths and number of rectangles) into
   * a list of rectangle objects.
   */
  toRectangles: function (h, w, n) {
    var T = [];
    for (var i = 0; i < n.length; i++) {
      T.push({
        "height": h[i],
        "width": w[i],
        "count": n[i]
      });
    }
    return T;
  }
}


/**
 * Generates all possible configurations given a list of rectangles T.
 */
function generateConfigurations(T) {
  var configurations = [];
  var c = Array.apply(null, Array(T.length)).map(Number.prototype.valueOf,0); 
  configurationPermutations(T, 0, c, 1, configurations);
  return configurations;
}

/**
 * Helper recursive function to generate all configurations.
 */
function configurationPermutations(T, start, c, capacity, configurations) {
  //var isLeaf = true;
  for (var i = start; i < T.length; i++) {
    if (capacity >= T[i].width && c[i] < T[i].count) {
      //isLeaf = false;
      c[i]++;
      configurationPermutations(T, i, c, capacity - T[i].width, configurations);
      c[i]--;
    }
  }
  // No more rectangles can fit so add this as a configuration.
  if (capacity < 1 /*isLeaf*/) {
    configurations.push(c.slice());
  }
}

/**
 * Builds a linear program to solve the fractional rectangle problem given the
 * list of rectangles.
 */
function buildLinearProgram(T, configurations) {
  if (typeof configurations === 'undefined') {
    var configurations = generateConfigurations(T);
  }
  // build a skeleton model
  var model = {
    "optimize": "height",
    "opType": "min",
    "constraints": {},
    "variables": {}
  };
  // Add each rectangle as a constraint
  for (var i = 0; i < T.length; i++) {
    model.constraints["t" + i.toString()] = {"min": T[i].count};
  }
  // Add each configuration as a variable
  for (var i = 0; i < configurations.length; i++) {
    var x = {
      "min": 0,
      "height": 1
    };
    for (var j = 0; j < configurations[i].length; j++) {
      x["t" + j.toString()] = configurations[i][j] / T[j].height;
    }
    model.variables["x" + i.toString()] = x;
  }
  return model;
}

function solveFractionalPackingLP(model, configurations) {
  var solution = solver.Solve(model);
  var packing = [];
  for (var property in solution) {
    if (solution.hasOwnProperty(property) && property[0] == 'x') {
      var id = parseInt(property.substring(1));
      packing.push({
        "height": solution[property],
        "configuration": configurations[id]
      });
    }
  }
  return packing;
}
