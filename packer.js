var solver = require("javascript-lp-solver");
const Stack = require("./Stack");

"use strict";
// ==============
// Functions for solving the 2DSPP linear program and then manipulating the
// solution.
// My convention is to use T to denote the list of rectangle objects.
// ==============
module.exports = {
  /**
   * Solves the fractional rectangle packing problem and returns the solution.
   * T - a list of rectangles objects
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
  },

  /**
   * Given a packing, converts the packing into a list of stacks.
   */
  fractionalStacks: (T, packing) => {
    var S = [];
    for (var i = 0; i < packing.configuration.length; i++) {
      for (var j = 0; j < packing.configuration[i]; j++) {
        S.push(new Stack(T[i], packing.height / T[i].height));
      }
    }
    return S;
  },

  /**
   * Makes the given list of stacks integral by combining their fractional parts
   * and then rounding up.
   */
  makeIntegralRoundUp: makeIntegralRoundUp,

  /**
   * Makes the given list of stacks with fractional parts cut at the cutting 
   * line integral by rounding down until they are integral.
   * Returns the number of fractional parts of each rectangle that were removed.
   */
  makeIntegralRoundDown: makeIntegralRoundDown,

  /**
   * Gets the fractional part of the given double.
   */
  fractionalPart: fractionalPart,
  triangleMethod: triangleMethod
}

// =========
// Packing Manipulation Functions
// =========

function fractionalPart(f) {
  return f - Math.floor(f);
}

/**
 * Makes the given list of stacks integral by combining their fractional parts
 * and then rounding up.
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

// ========
// Linear program solver functions
// ========

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
  // If any rectangles have been used (capacity < 1) then add this as a valid
  // configuration.
  if (capacity < 1 /*isLeaf*/) {
    configurations.push(c.slice());
  }
}

/**
 * Builds a linear program to solve the fractional rectangle problem given the
 * list of rectangles.
 * Optionally accepts a set of configurations but will generate them itself if
 * not given.
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

/**
 * Given a linear program model and a list of configurations, solves the linear
 * program and returns an object consisting of the height of each configuration
 * and which configuration it represents. (the corresponding element of
 * configurations)
 */
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
