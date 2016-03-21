/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var packer = __webpack_require__(1);
	var painter = __webpack_require__(12);

	var config = {
	  rectBorder: '#ffffff',
	  rectMaxHeight: 600,
	  configBorder: '#FFBC42',
	  configLineWidth: 2,
	  colours: painter.tintGradient("#722364", .15, 10)
	};

	/**
	 * Given a string where each line contains the description of a rectangle
	 * (width, height and number of rectangles in that order space separated),
	 * returns a list of rectangle objects.
	 */
	function parseRectangles(s) {
	  var tokens = s.split('\n');
	  var result = [];
	  var h, w, n;
	  for (var i = 0; i < tokens.length; i++) {
	    if (!tokens[i]) {
	      continue;
	    }
	    var rect = tokens[i].split(' ');
	    if (rect.length != 3) {
	      throw "Make sure you have three numbers per line: " + tokens[i];
	    }
	    w = parseFloat(rect[0]);
	    h = parseFloat(rect[1]);
	    if (w < 0 || w > 1 || h < 0 || h > 1) {
	      throw "Rectangle height and width must be in [0, 1]: " + tokens[i];
	    }
	    n = parseInt(rect[2]);
	    result.push({
	      "id": i,
	      "width": w,
	      "height": h,
	      "count": n
	    });
	  }
	  return result;
	}

	/**
	 * Draws the packing given the string. Caches the result of solving the linear
	 * program in the following declared variables.
	 */
	var rects, result, stage;
	function drawPackingFromString(s) {
	  try {
	    rects = parseRectangles(s);
	  } catch (e) {
	    alert(e);
	    return;
	  }
	  console.log(rects);
	  stage = 0;
	  result = packer.fractionalPacking(rects);
	  console.log("Total height: " + result.totalHeight);
	  console.log(result.packing);
	  var canvas = document.getElementById("packing");
	  var info = painter.drawPacking(rects, result, canvas, 0, config);
	  var $info = $('#info ul').empty();
	  info.heights.reverse();
	  for (var i = 0; i < info.heights.length; i++) {
	    $info.append("<li>Configuration " + (i + 1) + " height: " + info.heights[i] + "</li>");
	  }
	}

	/**
	 * Go to the next stage in the packing sequence.
	 */
	function continuePackingSequence() {
	  stage++;
	  var canvas = document.getElementById("packing");
	  painter.drawPacking(rects, result, canvas, stage, config);
	}

	var defSolution = ".5 .5 3\n.333 .333 2\n.25 .25 2";

	$(function () {
	  $('#input').val(defSolution);
	  drawPackingFromString(defSolution);
	  $('#solve-button').click(function () {
	    var s = $('#input').val();
	    console.log(s);
	    drawPackingFromString(s);
	  });

	  $('#continue-button').click(function () {
	    continuePackingSequence();
	  });

	  var slider = $("#slider").slideReveal({
	    trigger: $("#trigger"),
	    push: false,
	    show: function show() {
	      $('#trigger span').removeClass('glyphicon-chevron-right').addClass('glyphicon-chevron-left');
	      $('#slider').addClass('right-shadow-overlay');
	    },
	    hide: function hide() {
	      $('#trigger span').removeClass('glyphicon-chevron-left').addClass('glyphicon-chevron-right');
	      $('#slider').removeClass('right-shadow-overlay');
	    },
	    width: 250
	  });
	});

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var solver = __webpack_require__(2);

	"use strict";
	// ==============
	// Functions for solving the 2DSPP linear program.
	// My convention is to use T to denote the list of rectangle objects.
	// ==============
	module.exports = {
	  /**
	   * Solves the fractional rectangle packing problem and returns the solution.
	   * T - a list of rectangles objects
	   */
	  fractionalPacking: function fractionalPacking(T) {
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
	  toRectangles: function toRectangles(h, w, n) {
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
	};

	/**
	 * Generates all possible configurations given a list of rectangles T.
	 */
	function generateConfigurations(T) {
	  var configurations = [];
	  var c = Array.apply(null, Array(T.length)).map(Number.prototype.valueOf, 0);
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
	    model.constraints["t" + i.toString()] = { "min": T[i].count };
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

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;var require;var require;"use strict";

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

	(function () {
	    if (( false ? "undefined" : _typeof(exports)) === "object") {
	        module.exports = __webpack_require__(3);
	    }
	})();
	(function e(t, n, r) {
	    function s(o, u) {
	        if (!n[o]) {
	            if (!t[o]) {
	                var a = typeof require == "function" && require;if (!u && a) return require(o, !0);if (i) return i(o, !0);var f = new Error("Cannot find module '" + o + "'");throw f.code = "MODULE_NOT_FOUND", f;
	            }var l = n[o] = { exports: {} };t[o][0].call(l.exports, function (e) {
	                var n = t[o][1][e];return s(n ? n : e);
	            }, l, l.exports, e, t, n, r);
	        }return n[o].exports;
	    }var i = typeof require == "function" && require;for (var o = 0; o < r.length; o++) {
	        s(r[o]);
	    }return s;
	})({ 1: [function (require, module, exports) {
	        /*global describe*/
	        /*global require*/
	        /*global module*/
	        /*global it*/
	        /*global console*/
	        /*global process*/
	        var Solution = require("./Solution.js");

	        //-------------------------------------------------------------------
	        //-------------------------------------------------------------------
	        function Cut(type, varIndex, value) {
	            this.type = type;
	            this.varIndex = varIndex;
	            this.value = value;
	        }

	        //-------------------------------------------------------------------
	        //-------------------------------------------------------------------
	        function Branch(relaxedEvaluation, cuts) {
	            this.relaxedEvaluation = relaxedEvaluation;
	            this.cuts = cuts;
	        }

	        //-------------------------------------------------------------------
	        //-------------------------------------------------------------------
	        function MilpSolution(relaxedSolution, iterations) {
	            Solution.call(this, relaxedSolution._tableau, relaxedSolution.evaluation, relaxedSolution.feasible);
	            this.iter = iterations;
	        }

	        MilpSolution.prototype = Object.create(Solution.prototype);
	        MilpSolution.prototype.constructor = MilpSolution;

	        //-------------------------------------------------------------------
	        // Branch sorting strategies
	        //-------------------------------------------------------------------
	        function sortByEvaluation(a, b) {
	            return b.relaxedEvaluation - a.relaxedEvaluation;
	        }

	        //-------------------------------------------------------------------
	        // Applying cuts on a tableau and resolving
	        //-------------------------------------------------------------------
	        function applyCuts(tableau, cuts) {
	            // Restoring initial solution
	            tableau.restore();

	            tableau.addCutConstraints(cuts);
	            tableau.solve();

	            // Adding MIR cuts
	            var fractionalVolumeImproved = true;
	            while (fractionalVolumeImproved) {
	                var fractionalVolumeBefore = tableau.computeFractionalVolume(true);

	                tableau.applyMIRCuts();
	                tableau.solve();

	                var fractionalVolumeAfter = tableau.computeFractionalVolume(true);

	                // If the new fractional volume is bigger than 90% of the previous one
	                // we assume there is no improvement from the MIR cuts
	                if (fractionalVolumeAfter >= 0.9 * fractionalVolumeBefore) {
	                    fractionalVolumeImproved = false;
	                }
	            }
	        }

	        //-------------------------------------------------------------------
	        // Function: MILP
	        // Detail: Main function, my attempt at a mixed integer linear programming
	        //         solver
	        //-------------------------------------------------------------------
	        function MILP(model) {
	            var branches = [];
	            var iterations = 0;
	            var tableau = model.tableau;

	            // This is the default result
	            // If nothing is both *integral* and *feasible*
	            var bestEvaluation = Infinity;
	            var bestBranch = null;

	            // And here...we...go!

	            // 1.) Load a model into the queue
	            var branch = new Branch(-Infinity, []);
	            branches.push(branch);

	            // If all branches have been exhausted terminate the loop
	            while (branches.length > 0) {
	                // Get a model from the queue
	                branch = branches.pop();
	                if (branch.relaxedEvaluation >= bestEvaluation) {
	                    continue;
	                }

	                // Solving from initial relaxed solution
	                // with additional cut constraints

	                // Adding cut constraints
	                var cuts = branch.cuts;

	                applyCuts(tableau, cuts);

	                iterations++;
	                if (tableau.feasible === false) {
	                    continue;
	                }

	                var evaluation = tableau.evaluation;
	                if (evaluation >= bestEvaluation) {
	                    // This branch does not contain the optimal solution
	                    continue;
	                }

	                // Is the model both integral and feasible?
	                if (tableau.isIntegral() === true) {
	                    if (iterations === 1) {
	                        tableau.updateVariableValues();
	                        return new MilpSolution(tableau.getSolution(), iterations);
	                    }

	                    // Store the solution as the bestSolution
	                    bestBranch = branch;
	                    bestEvaluation = evaluation;
	                } else {
	                    if (iterations === 1) {
	                        // Saving the first iteration
	                        // TODO: implement a better strategy for saving the tableau?
	                        tableau.save();
	                    }

	                    // If the solution is
	                    //  a. Feasible
	                    //  b. Better than the current solution
	                    //  c. but *NOT* integral

	                    // So the solution isn't integral? How do we solve this.
	                    // We create 2 new models, that are mirror images of the prior
	                    // model, with 1 exception.

	                    // Say we're trying to solve some stupid problem requiring you get
	                    // animals for your daughter's kindergarten petting zoo party
	                    // and you have to choose how many ducks, goats, and lambs to get.

	                    // Say that the optimal solution to this problem if we didn't have
	                    // to make it integral was {duck: 8, lambs: 3.5}
	                    //
	                    // To keep from traumatizing your daughter and the other children
	                    // you're going to want to have whole animals

	                    // What we would do is find the most fractional variable (lambs)
	                    // and create new models from the old models, but with a new constraint
	                    // on apples. The constraints on the low model would look like:
	                    // constraints: {...
	                    //   lamb: {max: 3}
	                    //   ...
	                    // }
	                    //
	                    // while the constraints on the high model would look like:
	                    //
	                    // constraints: {...
	                    //   lamb: {min: 4}
	                    //   ...
	                    // }
	                    // If neither of these models is feasible because of this constraint,
	                    // the model is not integral at this point, and fails.

	                    // Find out where we want to split the solution
	                    var variable = tableau.getMostFractionalVar();
	                    // var variable = tableau.getFractionalVarWithLowestCost();
	                    var varIndex = variable.index;

	                    var cutsHigh = [];
	                    var cutsLow = [];

	                    var nCuts = cuts.length;
	                    for (var c = 0; c < nCuts; c += 1) {
	                        var cut = cuts[c];
	                        if (cut.varIndex === varIndex) {
	                            if (cut.type === "min") {
	                                cutsLow.push(cut);
	                            } else {
	                                cutsHigh.push(cut);
	                            }
	                        } else {
	                            cutsHigh.push(cut);
	                            cutsLow.push(cut);
	                        }
	                    }

	                    var min = Math.ceil(variable.value);
	                    var max = Math.floor(variable.value);

	                    var cutHigh = new Cut("min", varIndex, min);
	                    cutsHigh.push(cutHigh);

	                    var cutLow = new Cut("max", varIndex, max);
	                    cutsLow.push(cutLow);

	                    branches.push(new Branch(evaluation, cutsHigh));
	                    branches.push(new Branch(evaluation, cutsLow));

	                    // Sorting branches
	                    // Branches with the most promising lower bounds
	                    // will be picked first
	                    branches.sort(sortByEvaluation);
	                }
	            }

	            // Adding cut constraints for the optimal solution
	            if (bestBranch !== null) {
	                // The model is feasible
	                applyCuts(tableau, bestBranch.cuts);
	                tableau.updateVariableValues();
	            }

	            // Solving a last time
	            return new MilpSolution(tableau.getSolution(), iterations);
	        }

	        module.exports = MILP;
	    }, { "./Solution.js": 5 }], 2: [function (require, module, exports) {
	        /*global describe*/
	        /*global require*/
	        /*global module*/
	        /*global it*/
	        /*global console*/
	        /*global process*/

	        var Tableau = require("./Tableau.js");
	        var MILP = require("./MILP.js");
	        var expressions = require("./expressions.js");
	        var Constraint = expressions.Constraint;
	        var Equality = expressions.Equality;
	        var Variable = expressions.Variable;
	        var IntegerVariable = expressions.IntegerVariable;
	        var Term = expressions.Term;

	        /*************************************************************
	         * Class: Model
	         * Description: Holds the model of a linear optimisation problem
	         **************************************************************/
	        function Model(precision, name) {
	            this.tableau = new Tableau(precision);

	            this.name = name;

	            this.variables = [];

	            this.integerVariables = [];

	            this.unrestrictedVariables = {};

	            this.constraints = [];

	            this.nConstraints = 0;

	            this.nVariables = 0;

	            this.isMinimization = true;

	            this.tableauInitialized = false;
	            this.relaxationIndex = 1;
	        }
	        module.exports = Model;

	        Model.prototype.minimize = function () {
	            this.isMinimization = true;
	            return this;
	        };

	        Model.prototype.maximize = function () {
	            this.isMinimization = false;
	            return this;
	        };

	        // Model.prototype.addConstraint = function (constraint) {
	        //     // TODO: make sure that the constraint does not belong do another model
	        //     // and make
	        //     this.constraints.push(constraint);
	        //     return this;
	        // };

	        Model.prototype._getNewElementIndex = function () {
	            if (this.availableIndexes.length > 0) {
	                return this.availableIndexes.pop();
	            }

	            var index = this.lastElementIndex;
	            this.lastElementIndex += 1;
	            return index;
	        };

	        Model.prototype._addConstraint = function (constraint) {
	            var slackVariable = constraint.slack;
	            this.tableau.variablesPerIndex[slackVariable.index] = slackVariable;
	            this.constraints.push(constraint);
	            this.nConstraints += 1;
	            if (this.tableauInitialized === true) {
	                this.tableau.addConstraint(constraint);
	            }
	        };

	        Model.prototype.smallerThan = function (rhs) {
	            var constraint = new Constraint(rhs, true, this.tableau.getNewElementIndex(), this);
	            this._addConstraint(constraint);
	            return constraint;
	        };

	        Model.prototype.greaterThan = function (rhs) {
	            var constraint = new Constraint(rhs, false, this.tableau.getNewElementIndex(), this);
	            this._addConstraint(constraint);
	            return constraint;
	        };

	        Model.prototype.equal = function (rhs) {
	            var constraintUpper = new Constraint(rhs, true, this.tableau.getNewElementIndex(), this);
	            this._addConstraint(constraintUpper);

	            var constraintLower = new Constraint(rhs, false, this.tableau.getNewElementIndex(), this);
	            this._addConstraint(constraintLower);

	            return new Equality(constraintUpper, constraintLower);
	        };

	        Model.prototype.addVariable = function (cost, id, isInteger, isUnrestricted, priority) {
	            if (typeof priority === "string") {
	                switch (priority) {
	                    case "required":
	                        priority = 0;
	                        break;
	                    case "strong":
	                        priority = 1;
	                        break;
	                    case "medium":
	                        priority = 2;
	                        break;
	                    case "weak":
	                        priority = 3;
	                        break;
	                    default:
	                        priority = 0;
	                        break;
	                }
	            }

	            var varIndex = this.tableau.getNewElementIndex();
	            if (id === null || id === undefined) {
	                id = "v" + varIndex;
	            }

	            if (cost === null || cost === undefined) {
	                cost = 0;
	            }

	            if (priority === null || priority === undefined) {
	                priority = 0;
	            }

	            var variable;
	            if (isInteger) {
	                variable = new IntegerVariable(id, cost, varIndex, priority);
	                this.integerVariables.push(variable);
	            } else {
	                variable = new Variable(id, cost, varIndex, priority);
	            }

	            this.variables.push(variable);
	            this.tableau.variablesPerIndex[varIndex] = variable;

	            if (isUnrestricted) {
	                this.unrestrictedVariables[varIndex] = true;
	            }

	            this.nVariables += 1;

	            if (this.tableauInitialized === true) {
	                this.tableau.addVariable(variable);
	            }

	            return variable;
	        };

	        Model.prototype._removeConstraint = function (constraint) {
	            var idx = this.constraints.indexOf(constraint);
	            if (idx === -1) {
	                console.warn("[Model.removeConstraint] Constraint not present in model");
	                return;
	            }

	            this._removeVariable(constraint.slack);

	            this.constraints.splice(idx, 1);
	            this.nConstraints -= 1;

	            if (this.tableauInitialized === true) {
	                this.tableau.removeConstraint(constraint);
	            }

	            if (constraint.relaxation) {
	                this.removeVariable(constraint.relaxation);
	            }
	        };

	        //-------------------------------------------------------------------
	        // For dynamic model modification
	        //-------------------------------------------------------------------
	        Model.prototype.removeConstraint = function (constraint) {
	            if (constraint.isEquality) {
	                this._removeConstraint(constraint.upperBound);
	                this._removeConstraint(constraint.lowerBound);
	            } else {
	                this._removeConstraint(constraint);
	            }

	            return this;
	        };

	        Model.prototype._removeVariable = function (variable) {
	            // TODO ? remove variable term from every constraint?
	            this.availableIndexes.push(variable.index);
	            variable.index = -1;
	        };

	        Model.prototype.removeVariable = function (variable) {
	            var idx = this.variables.indexOf(variable);
	            if (idx === -1) {
	                console.warn("[Model.removeVariable] Variable not present in model");
	                return;
	            }
	            this.variables.splice(idx, 1);

	            this._removeVariable(variable);

	            if (this.tableauInitialized === true) {
	                this.tableau.removeVariable(variable);
	            }

	            return this;
	        };

	        Model.prototype.updateRightHandSide = function (constraint, difference) {
	            if (this.tableauInitialized === true) {
	                this.tableau.updateRightHandSide(constraint, difference);
	            }
	            return this;
	        };

	        Model.prototype.updateConstraintCoefficient = function (constraint, variable, difference) {
	            if (this.tableauInitialized === true) {
	                this.tableau.updateConstraintCoefficient(constraint, variable, difference);
	            }
	            return this;
	        };

	        Model.prototype.setCost = function (cost, variable) {
	            var difference = cost - variable.cost;
	            if (this.isMinimization === false) {
	                difference = -difference;
	            }

	            variable.cost = cost;
	            this.tableau.updateCost(variable, difference);
	            return this;
	        };

	        //-------------------------------------------------------------------
	        //-------------------------------------------------------------------
	        Model.prototype.loadJson = function (jsonModel) {
	            this.isMinimization = jsonModel.opType !== "max";

	            var variables = jsonModel.variables;
	            var constraints = jsonModel.constraints;

	            var constraintsMin = {};
	            var constraintsMax = {};

	            // Instantiating constraints
	            var constraintIds = Object.keys(constraints);
	            var nConstraintIds = constraintIds.length;

	            for (var c = 0; c < nConstraintIds; c += 1) {
	                var constraintId = constraintIds[c];
	                var constraint = constraints[constraintId];
	                var equal = constraint.equal;

	                var weight = constraint.weight;
	                var priority = constraint.priority;
	                var relaxed = weight !== undefined || priority !== undefined;

	                var lowerBound, upperBound;
	                if (equal === undefined) {
	                    var min = constraint.min;
	                    if (min !== undefined) {
	                        lowerBound = this.greaterThan(min);
	                        constraintsMin[constraintId] = lowerBound;
	                        if (relaxed) {
	                            lowerBound.relax(weight, priority);
	                        }
	                    }

	                    var max = constraint.max;
	                    if (max !== undefined) {
	                        upperBound = this.smallerThan(max);
	                        constraintsMax[constraintId] = upperBound;
	                        if (relaxed) {
	                            upperBound.relax(weight, priority);
	                        }
	                    }
	                } else {
	                    lowerBound = this.greaterThan(equal);
	                    constraintsMin[constraintId] = lowerBound;

	                    upperBound = this.smallerThan(equal);
	                    constraintsMax[constraintId] = upperBound;

	                    var equality = new Equality(lowerBound, upperBound);
	                    if (relaxed) {
	                        equality.relax(weight, priority);
	                    }
	                }
	            }

	            var variableIds = Object.keys(variables);
	            var nVariables = variableIds.length;

	            var integerVarIds = jsonModel.ints || {};
	            var unrestrictedVarIds = jsonModel.unrestricted || {};

	            // Instantiating variables and constraint terms
	            var objectiveName = jsonModel.optimize;
	            for (var v = 0; v < nVariables; v += 1) {
	                // Creation of the variables
	                var variableId = variableIds[v];
	                var variableConstraints = variables[variableId];
	                var cost = variableConstraints[objectiveName] || 0;
	                var isInteger = !!integerVarIds[variableId];
	                var isUnrestricted = !!unrestrictedVarIds[variableId];
	                var variable = this.addVariable(cost, variableId, isInteger, isUnrestricted);

	                var constraintNames = Object.keys(variableConstraints);
	                for (c = 0; c < constraintNames.length; c += 1) {
	                    var constraintName = constraintNames[c];
	                    if (constraintName === objectiveName) {
	                        continue;
	                    }

	                    var coefficient = variableConstraints[constraintName];

	                    var constraintMin = constraintsMin[constraintName];
	                    if (constraintMin !== undefined) {
	                        constraintMin.addTerm(coefficient, variable);
	                    }

	                    var constraintMax = constraintsMax[constraintName];
	                    if (constraintMax !== undefined) {
	                        constraintMax.addTerm(coefficient, variable);
	                    }
	                }
	            }

	            return this;
	        };

	        //-------------------------------------------------------------------
	        //-------------------------------------------------------------------
	        Model.prototype.getNumberOfIntegerVariables = function () {
	            return this.integerVariables.length;
	        };

	        Model.prototype.solve = function () {
	            // Setting tableau if not done
	            if (this.tableauInitialized === false) {
	                this.tableau.setModel(this);
	                this.tableauInitialized = true;
	            }

	            if (this.getNumberOfIntegerVariables() > 0) {
	                return MILP(this);
	            } else {
	                var solution = this.tableau.solve().getSolution();
	                this.tableau.updateVariableValues();
	                return solution;
	            }
	        };

	        Model.prototype.compileSolution = function () {
	            return this.tableau.compileSolution();
	        };

	        Model.prototype.isFeasible = function () {
	            return this.tableau.feasible;
	        };

	        Model.prototype.save = function () {
	            return this.tableau.save();
	        };

	        Model.prototype.restore = function () {
	            return this.tableau.restore();
	        };

	        Model.prototype.log = function (message) {
	            return this.tableau.log(message);
	        };
	    }, { "./MILP.js": 1, "./Tableau.js": 6, "./expressions.js": 8 }], 3: [function (require, module, exports) {
	        /*global describe*/
	        /*global require*/
	        /*global module*/
	        /*global it*/
	        /*global console*/
	        /*global process*/

	        /***************************************************************
	         * Method: polyopt
	         * Scope: private
	         * Agruments:
	         *        model: The model we want solver to operate on.
	                         Because we're in here, we're assuming that
	                         we're solving a multi-objective optimization
	                         problem. Poly-Optimization. polyopt.
	                          This model has to be formed a little differently
	                         because it has multiple objective functions.
	                         Normally, a model has 2 attributes: opType (string,
	                         "max" or "min"), and optimize (string, whatever
	                         attribute we're optimizing.
	                          Now, there is no opType attribute on the model,
	                         and optimize is an object of attributes to be
	                         optimized, and how they're to be optimized.
	                         For example:
	                          ...
	                         "optimize": {
	                            "pancakes": "max",
	                            "cost": "minimize"
	                         }
	                         ...
	           **************************************************************/

	        module.exports = function (solver, model) {

	            // I have no idea if this is actually works, or what,
	            // but here is my algorithm to solve linear programs
	            // with multiple objective functions

	            // 1. Optimize for each constraint
	            // 2. The results for each solution is a vector
	            //    representing a vertex on the polytope we're creating
	            // 3. The results for all solutions describes the shape
	            //    of the polytope (would be nice to have the equation
	            //    representing this)
	            // 4. Find the mid-point between all vertices by doing the
	            //    following (a_1 + a_2 ... a_n) / n;
	            var objectives = model.optimize,
	                new_constraints = JSON.parse(JSON.stringify(model.optimize)),
	                keys = Object.keys(model.optimize),
	                tmp,
	                counter = 0,
	                vectors = {},
	                vector_key = "",
	                obj = {},
	                pareto = [],
	                i,
	                j,
	                x,
	                y,
	                z;

	            // Delete the optimize object from the model
	            delete model.optimize;

	            // Iterate and Clear
	            for (i = 0; i < keys.length; i++) {
	                // Clean up the new_constraints
	                new_constraints[keys[i]] = 0;
	            }

	            // Solve and add
	            for (i = 0; i < keys.length; i++) {

	                // Prep the model
	                model.optimize = keys[i];
	                model.opType = objectives[keys[i]];

	                // solve the model
	                tmp = solver.Solve(model, undefined, undefined, true);

	                // Only the variables make it into the solution;
	                // not the attributes.
	                //
	                // Because of this, we have to add the attributes
	                // back onto the solution so we can do math with
	                // them later...

	                // Loop over the keys
	                for (y in keys) {
	                    // We're only worried about attributes, not variables
	                    if (!model.variables[keys[y]]) {
	                        // Create space for the attribute in the tmp object
	                        tmp[keys[y]] = tmp[keys[y]] ? tmp[keys[y]] : 0;
	                        // Go over each of the variables
	                        for (x in model.variables) {
	                            // Does the variable exist in tmp *and* does attribute exist in this model?
	                            if (model.variables[x][keys[y]] && tmp[x]) {
	                                // Add it to tmp
	                                tmp[keys[y]] += tmp[x] * model.variables[x][keys[y]];
	                            }
	                        }
	                    }
	                }

	                // clear our key
	                vector_key = "base";
	                // this makes sure that if we get
	                // the same vector more than once,
	                // we only count it once when finding
	                // the midpoint
	                for (j = 0; j < keys.length; j++) {
	                    if (tmp[keys[j]]) {
	                        vector_key += "-" + (tmp[keys[j]] * 1000 | 0) / 1000;
	                    } else {
	                        vector_key += "-0";
	                    }
	                }

	                // Check here to ensure it doesn't exist
	                if (!vectors[vector_key]) {
	                    // Add the vector-key in
	                    vectors[vector_key] = 1;
	                    counter++;

	                    // Iterate over the keys
	                    // and update our new constraints
	                    for (j = 0; j < keys.length; j++) {
	                        if (tmp[keys[j]]) {
	                            new_constraints[keys[j]] += tmp[keys[j]];
	                        }
	                    }

	                    // Push the solution into the paretos
	                    // array after cleaning it of some
	                    // excess data markers

	                    delete tmp.feasible;
	                    delete tmp.result;
	                    pareto.push(tmp);
	                }
	            }

	            // Trying to find the mid-point
	            // divide each constraint by the
	            // number of constraints
	            // *midpoint formula*
	            // (x1 + x2 + x3) / 3
	            for (i = 0; i < keys.length; i++) {
	                model.constraints[keys[i]] = { "equal": new_constraints[keys[i]] / counter };
	            }

	            // Give the model a fake thing to optimize on
	            model.optimize = "cheater-" + Math.random();
	            model.opType = "max";

	            // And add the fake attribute to the variables
	            // in the model
	            for (i in model.variables) {
	                model.variables[i].cheater = 1;
	            }

	            // Build out the object with all attributes
	            for (i in pareto) {
	                for (x in pareto[i]) {
	                    obj[x] = obj[x] || { min: 1e99, max: -1e99 };
	                }
	            }

	            // Give each pareto a full attribute list
	            // while getting the max and min values
	            // for each attribute
	            for (i in obj) {
	                for (x in pareto) {
	                    if (pareto[x][i]) {
	                        if (pareto[x][i] > obj[i].max) {
	                            obj[i].max = pareto[x][i];
	                        }
	                        if (pareto[x][i] < obj[i].min) {
	                            obj[i].min = pareto[x][i];
	                        }
	                    } else {
	                        pareto[x][i] = 0;
	                        obj[i].min = 0;
	                    }
	                }
	            }
	            // Solve the model for the midpoints
	            tmp = solver.Solve(model, undefined, undefined, true);

	            return {
	                midpoint: tmp,
	                vertices: pareto,
	                ranges: obj
	            };
	        };
	    }, {}], 4: [function (require, module, exports) {
	        /*global describe*/
	        /*global require*/
	        /*global module*/
	        /*global it*/
	        /*global console*/
	        /*global process*/
	        /*jshint -W083 */

	        /*************************************************************
	        * Method: to_JSON
	        * Scope: Public:
	        * Agruments: input: Whatever the user gives us
	        * Purpose: Convert an unfriendly formatted LP
	        *          into something that our library can
	        *          work with
	        **************************************************************/
	        function to_JSON(input) {
	            var rxo = {
	                /* jshint ignore:start */
	                "is_blank": /^\W{0,}$/,
	                "is_objective": /(max|min)(imize){0,}\:/i,
	                "is_int": /^\W{0,}int/i,
	                "is_constraint": /(\>|\<){0,}\=/i,
	                "is_unrestricted": /^\S{0,}unrestricted/i,
	                "parse_lhs": /(\-|\+){0,1}\s{0,1}\d{0,}\.{0,}\d{0,}\s{0,}[A-Za-z]\S{0,}/gi,
	                "parse_rhs": /(\-|\+){0,1}\d{1,}\.{0,}\d{0,}\W{0,}\;{0,1}$/i,
	                "parse_dir": /(\>|\<){0,}\=/gi,
	                "parse_int": /[^\s|^\,]+/gi,
	                "get_num": /(\-|\+){0,1}(\W|^)\d+\.{0,}\d{0,}/g,
	                "get_word": /[A-Za-z].*/
	                /* jshint ignore:end */
	            },
	                model = {
	                "opType": "",
	                "optimize": "_obj",
	                "constraints": {},
	                "variables": {}
	            },
	                constraints = {
	                ">=": "min",
	                "<=": "max",
	                "=": "equal"
	            },
	                tmp = "",
	                tst = 0,
	                ary = null,
	                hldr = "",
	                hldr2 = "",
	                constraint = "",
	                rhs = 0;

	            // Handle input if its coming
	            // to us as a hard string
	            // instead of as an array of
	            // strings
	            if (typeof input === "string") {
	                input = input.split("\n");
	            }

	            // Start iterating over the rows
	            // to see what all we have
	            for (var i = 0; i < input.length; i++) {

	                constraint = "__" + i;

	                // Get the string we're working with
	                tmp = input[i];

	                // Set the test = 0
	                tst = 0;

	                // Reset the array
	                ary = null;

	                // Test to see if we're the objective
	                if (rxo.is_objective.test(tmp)) {

	                    // Set up in model the opType
	                    model.opType = tmp.match(/(max|min)/gi)[0];

	                    // Pull apart lhs
	                    ary = tmp.match(rxo.parse_lhs).map(function (d) {
	                        return d.replace(/\s+/, "");
	                    }).slice(1);

	                    // *** STEP 1 *** ///
	                    // Get the variables out
	                    ary.forEach(function (d) {

	                        // Get the number if its there
	                        hldr = d.match(rxo.get_num);

	                        // If it isn't a number, it might
	                        // be a standalone variable
	                        if (hldr === null) {
	                            if (d.substr(0, 1) === "-") {
	                                hldr = -1;
	                            } else {
	                                hldr = 1;
	                            }
	                        } else {
	                            hldr = hldr[0];
	                        }

	                        hldr = parseFloat(hldr);

	                        // Get the variable type
	                        hldr2 = d.match(rxo.get_word)[0].replace(/\;$/, "");

	                        // Make sure the variable is in the model
	                        model.variables[hldr2] = model.variables[hldr2] || {};
	                        model.variables[hldr2]._obj = hldr;
	                    });
	                    ////////////////////////////////////
	                } else if (rxo.is_int.test(tmp)) {
	                        // Get the array of ints
	                        ary = tmp.match(rxo.parse_int).slice(1);

	                        // Since we have an int, our model should too
	                        model.ints = model.ints || {};

	                        ary.forEach(function (d) {
	                            d = d.replace(";", "");
	                            model.ints[d] = 1;
	                        });
	                        ////////////////////////////////////
	                    } else if (rxo.is_constraint.test(tmp)) {
	                            // Pull apart lhs
	                            ary = tmp.match(rxo.parse_lhs).map(function (d) {
	                                return d.replace(/\s+/, "");
	                            });

	                            // *** STEP 1 *** ///
	                            // Get the variables out
	                            ary.forEach(function (d) {
	                                // Get the number if its there
	                                hldr = d.match(rxo.get_num);

	                                if (hldr === null) {
	                                    if (d.substr(0, 1) === "-") {
	                                        hldr = -1;
	                                    } else {
	                                        hldr = 1;
	                                    }
	                                } else {
	                                    hldr = hldr[0];
	                                }

	                                hldr = parseFloat(hldr);

	                                // Get the variable type
	                                hldr2 = d.match(rxo.get_word)[0];

	                                // Make sure the variable is in the model
	                                model.variables[hldr2] = model.variables[hldr2] || {};
	                                model.variables[hldr2][constraint] = hldr;
	                            });

	                            // *** STEP 2 *** ///
	                            // Get the RHS out           
	                            rhs = parseFloat(tmp.match(rxo.parse_rhs)[0]);

	                            // *** STEP 3 *** ///
	                            // Get the Constrainer out  
	                            tmp = constraints[tmp.match(rxo.parse_dir)[0]];
	                            model.constraints[constraint] = model.constraints[constraint] || {};
	                            model.constraints[constraint][tmp] = rhs;
	                            ////////////////////////////////////
	                        } else if (rxo.is_unrestricted.test(tmp)) {
	                                // Get the array of unrestricted
	                                ary = tmp.match(rxo.parse_int).slice(1);

	                                // Since we have an int, our model should too
	                                model.unrestricted = model.unrestricted || {};

	                                ary.forEach(function (d) {
	                                    d = d.replace(";", "");
	                                    model.unrestricted[d] = 1;
	                                });
	                            }
	            }
	            return model;
	        }

	        /*************************************************************
	        * Method: from_JSON
	        * Scope: Public:
	        * Agruments: model: The model we want solver to operate on
	        * Purpose: Convert a friendly JSON model into a model for a
	        *          real solving library...in this case
	        *          lp_solver
	        **************************************************************/
	        function from_JSON(model) {
	            // Make sure we at least have a model
	            if (!model) {
	                throw new Error("Solver requires a model to operate on");
	            }

	            var output = "",
	                ary = [],
	                norm = 1,
	                lookup = {
	                "max": "<=",
	                "min": ">=",
	                "equal": "="
	            },
	                rxClean = new RegExp("[^A-Za-z0-9]+", "gi");

	            // Build the objective statement
	            output += model.opType + ":";

	            // Iterate over the variables
	            for (var x in model.variables) {
	                // Give each variable a self of 1 unless
	                // it exists already
	                model.variables[x][x] = model.variables[x][x] ? model.variables[x][x] : 1;

	                // Does our objective exist here?
	                if (model.variables[x][model.optimize]) {
	                    output += " " + model.variables[x][model.optimize] + " " + x.replace(rxClean, "_");
	                }
	            }

	            // Add some closure to our line thing
	            output += ";\n";

	            // And now... to iterate over the constraints
	            for (x in model.constraints) {
	                for (var y in model.constraints[x]) {
	                    for (var z in model.variables) {
	                        // Does our Constraint exist here?
	                        if (model.variables[z][x]) {
	                            output += " " + model.variables[z][x] + " " + z.replace(rxClean, "_");
	                        }
	                    }
	                    // Add the constraint type and value...
	                    output += " " + lookup[y] + " " + model.constraints[x][y];
	                    output += ";\n";
	                }
	            }

	            // Are there any ints?
	            if (model.ints) {
	                output += "\n\n";
	                for (x in model.ints) {
	                    output += "int " + x.replace(rxClean, "_") + ";\n";
	                }
	            }

	            // Are there any unrestricted?
	            if (model.unrestricted) {
	                output += "\n\n";
	                for (x in model.unrestricted) {
	                    output += "unrestricted " + x.replace(rxClean, "_") + ";\n";
	                }
	            }

	            // And kick the string back
	            return output;
	        }

	        module.exports = function (model) {
	            // If the user is giving us an array
	            // or a string, convert it to a JSON Model
	            // otherwise, spit it out as a string
	            if (model.length) {
	                return to_JSON(model);
	            } else {
	                return from_JSON(model);
	            }
	        };
	    }, {}], 5: [function (require, module, exports) {
	        /*global module*/

	        function Solution(tableau, evaluation, feasible) {
	            this.feasible = feasible;
	            this.evaluation = evaluation;
	            this._tableau = tableau;
	        }
	        module.exports = Solution;

	        Solution.prototype.generateSolutionSet = function () {
	            var solutionSet = {};

	            var tableau = this._tableau;
	            var varIndexByRow = tableau.varIndexByRow;
	            var variablesPerIndex = tableau.variablesPerIndex;
	            var matrix = tableau.matrix;
	            var rhsColumn = tableau.rhsColumn;
	            var lastRow = tableau.height - 1;
	            var roundingCoeff = Math.round(1 / tableau.precision);

	            for (var r = 1; r <= lastRow; r += 1) {
	                var varIndex = varIndexByRow[r];
	                var variable = variablesPerIndex[varIndex];
	                if (variable === undefined || variable.isSlack === true) {
	                    continue;
	                }

	                var varValue = matrix[r][rhsColumn];
	                solutionSet[variable.id] = Math.round(varValue * roundingCoeff) / roundingCoeff;
	            }

	            return solutionSet;
	        };
	    }, {}], 6: [function (require, module, exports) {
	        /*global describe*/
	        /*global require*/
	        /*global module*/
	        /*global it*/
	        /*global console*/
	        /*global process*/
	        var Solution = require("./Solution.js");
	        var expressions = require("./expressions.js");
	        var Constraint = expressions.Constraint;

	        /*************************************************************
	         * Class: Tableau
	         * Description: Simplex tableau, holding a the tableau matrix
	         *              and all the information necessary to perform
	         *              the simplex algorithm
	         * Agruments:
	         *        precision: If we're solving a MILP, how tight
	         *                   do we want to define an integer, given
	         *                   that 20.000000000000001 is not an integer.
	         *                   (defaults to 1e-8)
	         **************************************************************/
	        function Tableau(precision) {
	            this.model = null;

	            this.matrix = null;
	            this.width = 0;
	            this.height = 0;

	            this.costRowIndex = 0;
	            this.rhsColumn = 0;

	            this.variablesPerIndex = [];
	            this.unrestrictedVars = null;

	            // Solution attributes
	            this.feasible = true; // until proven guilty
	            this.evaluation = 0;

	            this.varIndexByRow = null;
	            this.varIndexByCol = null;

	            this.rowByVarIndex = null;
	            this.colByVarIndex = null;

	            // this.model.variables[this.varIndexByRow[1]];

	            // this.varIndexByRow = null;
	            // this.varIndexByCol = null;
	            //
	            // this.rowByVarIndex = null;
	            // this.colByVarIndex = null;

	            this.precision = precision || 1e-8;

	            this.optionalObjectives = [];
	            this.objectivesByPriority = {};

	            this.savedState = null;

	            this.availableIndexes = [];
	            this.lastElementIndex = 0;

	            this.variables = null;
	            this.nVars = 0;
	        }
	        module.exports = Tableau;

	        //-------------------------------------------------------------------
	        //-------------------------------------------------------------------
	        Tableau.prototype.initialize = function (width, height, variables, unrestrictedVars) {
	            this.variables = variables;
	            this.unrestrictedVars = unrestrictedVars;

	            this.width = width;
	            this.height = height;

	            // BUILD AN EMPTY ARRAY OF THAT WIDTH
	            var tmpRow = new Array(width);
	            for (var i = 0; i < width; i++) {
	                tmpRow[i] = 0;
	            }

	            // BUILD AN EMPTY TABLEAU
	            this.matrix = new Array(height);
	            for (var j = 0; j < height; j++) {
	                this.matrix[j] = tmpRow.slice();
	            }

	            this.varIndexByRow = new Array(this.height);
	            this.varIndexByCol = new Array(this.width);

	            this.varIndexByRow[0] = -1;
	            this.varIndexByCol[0] = -1;

	            this.nVars = width + height - 2;
	            this.rowByVarIndex = new Array(this.nVars);
	            this.colByVarIndex = new Array(this.nVars);

	            this.lastElementIndex = this.nVars;
	        };

	        //-------------------------------------------------------------------
	        // Function: solve
	        // Detail: Main function, linear programming solver
	        //-------------------------------------------------------------------
	        Tableau.prototype.solve = function () {
	            // this.log('INIT')
	            // Execute Phase 1 to obtain a Basic Feasible Solution (BFS)
	            this.phase1();

	            // Execute Phase 2
	            if (this.feasible === true) {
	                // Running simplex on Initial Basic Feasible Solution (BFS)
	                // N.B current solution is feasible
	                this.phase2();
	            }

	            return this;
	        };

	        //-------------------------------------------------------------------
	        //-------------------------------------------------------------------
	        Tableau.prototype.updateVariableValues = function () {
	            var nVars = this.variables.length;
	            var roundingCoeff = Math.round(1 / this.precision);
	            for (var v = 0; v < nVars; v += 1) {
	                var variable = this.variables[v];
	                var varIndex = variable.index;

	                var r = this.rowByVarIndex[varIndex];
	                if (r === -1) {
	                    // Variable is non basic
	                    variable.value = 0;
	                } else {
	                    // Variable is basic
	                    var varValue = this.matrix[r][this.rhsColumn];
	                    variable.value = Math.round(varValue * roundingCoeff) / roundingCoeff;
	                }
	            }
	        };

	        //-------------------------------------------------------------------
	        //-------------------------------------------------------------------
	        Tableau.prototype.getSolution = function () {
	            var evaluation = this.model.isMinimization === true ? this.evaluation : -this.evaluation;

	            return new Solution(this, evaluation, this.feasible);
	        };

	        //-------------------------------------------------------------------
	        //-------------------------------------------------------------------
	        Tableau.prototype.isIntegral = function () {
	            var integerVariables = this.model.integerVariables;

	            var nIntegerVars = integerVariables.length;
	            for (var v = 0; v < nIntegerVars; v++) {
	                var varRow = this.rowByVarIndex[integerVariables[v].index];
	                if (varRow === -1) {
	                    continue;
	                }

	                var varValue = this.matrix[varRow][this.rhsColumn];
	                if (Math.abs(varValue - Math.round(varValue)) > this.precision) {
	                    return false;
	                }
	            }
	            return true;
	        };

	        function VariableData(index, value) {
	            this.index = index;
	            this.value = value;
	        }

	        //-------------------------------------------------------------------
	        //-------------------------------------------------------------------
	        Tableau.prototype.getMostFractionalVar = function () {
	            var biggestFraction = 0;
	            var selectedVarIndex = null;
	            var selectedVarValue = null;
	            var mid = 0.5;

	            var integerVariables = this.model.integerVariables;
	            var nIntegerVars = integerVariables.length;
	            for (var v = 0; v < nIntegerVars; v++) {
	                var varIndex = integerVariables[v].index;
	                var varRow = this.rowByVarIndex[varIndex];
	                if (varRow === -1) {
	                    continue;
	                }

	                var varValue = this.matrix[varRow][this.rhsColumn];
	                var fraction = Math.abs(varValue - Math.round(varValue));
	                if (biggestFraction < fraction) {
	                    biggestFraction = fraction;
	                    selectedVarIndex = varIndex;
	                    selectedVarValue = varValue;
	                }
	            }

	            return new VariableData(selectedVarIndex, selectedVarValue);
	        };

	        //-------------------------------------------------------------------
	        //-------------------------------------------------------------------
	        Tableau.prototype.getFractionalVarWithLowestCost = function () {
	            var highestCost = Infinity;
	            var selectedVarIndex = null;
	            var selectedVarValue = null;

	            var integerVariables = this.model.integerVariables;
	            var nIntegerVars = integerVariables.length;
	            for (var v = 0; v < nIntegerVars; v++) {
	                var variable = integerVariables[v];
	                var varIndex = variable.index;
	                var varRow = this.rowByVarIndex[varIndex];
	                if (varRow === -1) {
	                    // Variable value is non basic
	                    // its value is 0
	                    continue;
	                }

	                var varValue = this.matrix[varRow][this.rhsColumn];
	                if (Math.abs(varValue - Math.round(varValue)) > this.precision) {
	                    var cost = variable.cost;
	                    if (highestCost > cost) {
	                        highestCost = cost;
	                        selectedVarIndex = varIndex;
	                        selectedVarValue = varValue;
	                    }
	                }
	            }

	            return new VariableData(selectedVarIndex, selectedVarValue);
	        };

	        //-------------------------------------------------------------------
	        //-------------------------------------------------------------------
	        Tableau.prototype.setEvaluation = function () {
	            // Rounding objective value
	            var roundingCoeff = Math.round(1 / this.precision);
	            var evaluation = this.matrix[this.costRowIndex][this.rhsColumn];
	            this.evaluation = Math.round(evaluation * roundingCoeff) / roundingCoeff;
	        };

	        //-------------------------------------------------------------------
	        // Description: Convert a non standard form tableau
	        //              to a standard form tableau by eliminating
	        //              all negative values in the Right Hand Side (RHS)
	        //              This results in a Basic Feasible Solution (BFS)
	        //
	        //-------------------------------------------------------------------
	        Tableau.prototype.phase1 = function () {
	            var matrix = this.matrix;
	            var rhsColumn = this.rhsColumn;
	            var lastColumn = this.width - 1;
	            var lastRow = this.height - 1;

	            var unrestricted;
	            var iterations = 0;
	            while (true) {
	                // Selecting leaving variable (feasibility condition):
	                // Basic variable with most negative value
	                var leavingRowIndex = 0;
	                var rhsValue = -this.precision;
	                for (var r = 1; r <= lastRow; r++) {
	                    unrestricted = this.unrestrictedVars[this.varIndexByRow[r]] === true;
	                    if (unrestricted) {
	                        continue;
	                    }

	                    var value = matrix[r][rhsColumn];
	                    if (value < rhsValue) {
	                        rhsValue = value;
	                        leavingRowIndex = r;
	                    }
	                }

	                // If nothing is strictly smaller than 0; we're done with phase 1.
	                if (leavingRowIndex === 0) {
	                    // Feasible, champagne!
	                    this.feasible = true;
	                    return iterations;
	                }

	                // Selecting entering variable
	                var enteringColumn = 0;
	                var maxQuotient = -Infinity;
	                var costRow = matrix[0];
	                var leavingRow = matrix[leavingRowIndex];
	                for (var c = 1; c <= lastColumn; c++) {
	                    var reducedCost = leavingRow[c];
	                    if (-this.precision < reducedCost && reducedCost < this.precision) {
	                        continue;
	                    }

	                    unrestricted = this.unrestrictedVars[this.varIndexByCol[c]] === true;
	                    if (unrestricted || reducedCost < -this.precision) {
	                        var quotient = -costRow[c] / reducedCost;
	                        if (maxQuotient < quotient) {
	                            maxQuotient = quotient;
	                            enteringColumn = c;
	                        }
	                    }
	                }

	                if (enteringColumn === 0) {
	                    // Not feasible
	                    this.feasible = false;
	                    return iterations;
	                }

	                this.pivot(leavingRowIndex, enteringColumn);
	                iterations += 1;
	            }
	        };

	        //-------------------------------------------------------------------
	        // Description: Apply simplex to obtain optimal soltuion
	        //              used as phase2 of the simplex
	        //
	        //-------------------------------------------------------------------
	        Tableau.prototype.phase2 = function () {
	            var matrix = this.matrix;
	            var rhsColumn = this.rhsColumn;
	            var lastColumn = this.width - 1;
	            var lastRow = this.height - 1;

	            var precision = this.precision;
	            var nOptionalObjectives = this.optionalObjectives.length;
	            var optionalCostsColumns = null;

	            var iterations = 0;
	            var reducedCost, unrestricted;
	            while (true) {
	                var costRow = matrix[this.costRowIndex];

	                // Selecting entering variable (optimality condition)
	                if (nOptionalObjectives > 0) {
	                    optionalCostsColumns = [];
	                }

	                var enteringColumn = 0;
	                var enteringValue = this.precision;
	                var isReducedCostNegative = false;
	                for (var c = 1; c <= lastColumn; c++) {
	                    reducedCost = costRow[c];
	                    unrestricted = this.unrestrictedVars[this.varIndexByCol[c]] === true;

	                    if (nOptionalObjectives > 0 && -this.precision < reducedCost && reducedCost < this.precision) {
	                        optionalCostsColumns.push(c);
	                        continue;
	                    }

	                    if (unrestricted && reducedCost < 0) {
	                        if (-reducedCost > enteringValue) {
	                            enteringValue = -reducedCost;
	                            enteringColumn = c;
	                            isReducedCostNegative = true;
	                        }
	                        continue;
	                    }

	                    if (reducedCost > enteringValue) {
	                        enteringValue = reducedCost;
	                        enteringColumn = c;
	                        isReducedCostNegative = false;
	                    }
	                }

	                if (nOptionalObjectives > 0) {
	                    // There exist optional improvable objectives
	                    var o = 0;
	                    while (enteringColumn === 0 && optionalCostsColumns.length > 0 && o < nOptionalObjectives) {
	                        var optionalCostsColumns2 = [];
	                        var reducedCosts = this.optionalObjectives[o].reducedCosts;
	                        for (var i = 0; i <= optionalCostsColumns.length; i++) {
	                            c = optionalCostsColumns[i];
	                            reducedCost = reducedCosts[c];
	                            unrestricted = this.unrestrictedVars[this.varIndexByCol[c]] === true;

	                            if (-this.precision < reducedCost && reducedCost < this.precision) {
	                                optionalCostsColumns2.push(c);
	                                continue;
	                            }

	                            if (unrestricted && reducedCost < 0) {
	                                if (-reducedCost > enteringValue) {
	                                    enteringValue = -reducedCost;
	                                    enteringColumn = c;
	                                    isReducedCostNegative = true;
	                                }
	                                continue;
	                            }

	                            if (reducedCost > enteringValue) {
	                                enteringValue = reducedCost;
	                                enteringColumn = c;
	                                isReducedCostNegative = false;
	                            }
	                        }
	                        optionalCostsColumns = optionalCostsColumns2;
	                        o += 1;
	                    }
	                }

	                // If no entering column could be found we're done with phase 2.
	                if (enteringColumn === 0) {
	                    this.setEvaluation();
	                    return;
	                }

	                // Selecting leaving variable
	                var leavingRow = 0;
	                var minQuotient = Infinity;

	                for (var r = 1; r <= lastRow; r++) {
	                    var row = matrix[r];
	                    var rhsValue = row[rhsColumn];
	                    var colValue = row[enteringColumn];

	                    if (-precision < colValue && colValue < precision) {
	                        continue;
	                    }

	                    if (colValue > 0 && precision > rhsValue && rhsValue > -precision) {
	                        minQuotient = 0;
	                        leavingRow = r;
	                        break;
	                    }

	                    var quotient = isReducedCostNegative ? -rhsValue / colValue : rhsValue / colValue;
	                    if (quotient > 0 && minQuotient > quotient) {
	                        minQuotient = quotient;
	                        leavingRow = r;
	                    }
	                }

	                if (minQuotient === Infinity) {
	                    // TODO: solution is not bounded
	                    // optimal value is -Infinity
	                    this.evaluation = -Infinity;
	                    return;
	                }

	                this.pivot(leavingRow, enteringColumn, true);
	                iterations += 1;
	            }
	        };

	        // Array holding the column indexes for which the value is not null
	        // on the pivot row
	        // Shared by all tableaux for smaller overhead and lower memory usage
	        var nonZeroColumns = [];
	        //-------------------------------------------------------------------
	        // Description: Execute pivot operations over a 2d array,
	        //          on a given row, and column
	        //
	        //-------------------------------------------------------------------
	        Tableau.prototype.pivot = function (pivotRowIndex, pivotColumnIndex) {
	            var matrix = this.matrix;

	            var quotient = matrix[pivotRowIndex][pivotColumnIndex];

	            var lastRow = this.height - 1;
	            var lastColumn = this.width - 1;

	            var leavingBasicIndex = this.varIndexByRow[pivotRowIndex];
	            var enteringBasicIndex = this.varIndexByCol[pivotColumnIndex];

	            this.varIndexByRow[pivotRowIndex] = enteringBasicIndex;
	            this.varIndexByCol[pivotColumnIndex] = leavingBasicIndex;

	            this.rowByVarIndex[enteringBasicIndex] = pivotRowIndex;
	            this.rowByVarIndex[leavingBasicIndex] = -1;

	            this.colByVarIndex[enteringBasicIndex] = -1;
	            this.colByVarIndex[leavingBasicIndex] = pivotColumnIndex;

	            // Divide everything in the target row by the element @
	            // the target column
	            var pivotRow = matrix[pivotRowIndex];
	            var nNonZeroColumns = 0;
	            for (var c = 0; c <= lastColumn; c++) {
	                if (pivotRow[c] !== 0) {
	                    pivotRow[c] /= quotient;
	                    nonZeroColumns[nNonZeroColumns] = c;
	                    nNonZeroColumns += 1;
	                }
	            }
	            pivotRow[pivotColumnIndex] = 1 / quotient;

	            // for every row EXCEPT the pivot row,
	            // set the value in the pivot column = 0 by
	            // multiplying the value of all elements in the objective
	            // row by ... yuck... just look below; better explanation later
	            var coefficient, i, v0;
	            var precision = this.precision;
	            for (var r = 0; r <= lastRow; r++) {
	                var row = matrix[r];
	                if (r !== pivotRowIndex) {
	                    coefficient = row[pivotColumnIndex];
	                    // No point Burning Cycles if
	                    // Zero to the thing
	                    if (coefficient !== 0) {
	                        for (i = 0; i < nNonZeroColumns; i++) {
	                            c = nonZeroColumns[i];
	                            // No point in doing math if you're just adding
	                            // Zero to the thing
	                            v0 = pivotRow[c];
	                            if (v0 !== 0) {
	                                row[c] = row[c] - coefficient * v0;
	                            }
	                        }

	                        row[pivotColumnIndex] = -coefficient / quotient;
	                    }
	                }
	            }

	            var nOptionalObjectives = this.optionalObjectives.length;
	            if (nOptionalObjectives > 0) {
	                for (var o = 0; o < nOptionalObjectives; o += 1) {
	                    var reducedCosts = this.optionalObjectives[o].reducedCosts;
	                    coefficient = reducedCosts[pivotColumnIndex];
	                    if (coefficient !== 0) {
	                        for (i = 0; i < nNonZeroColumns; i++) {
	                            c = nonZeroColumns[i];
	                            v0 = pivotRow[c];
	                            if (v0 !== 0) {
	                                reducedCosts[c] = reducedCosts[c] - coefficient * v0;
	                            }
	                        }

	                        reducedCosts[pivotColumnIndex] = -coefficient / quotient;
	                    }
	                }
	            }
	        };

	        Tableau.prototype.copy = function () {
	            var copy = new Tableau(this.precision);

	            copy.width = this.width;
	            copy.height = this.height;

	            copy.nVars = this.nVars;
	            copy.model = this.model;

	            // Making a shallow copy of integer variable indexes
	            // and variable ids
	            copy.variables = this.variables;
	            copy.variablesPerIndex = this.variablesPerIndex;
	            copy.unrestrictedVars = this.unrestrictedVars;
	            copy.lastElementIndex = this.lastElementIndex;

	            // All the other arrays are deep copied
	            copy.varIndexByRow = this.varIndexByRow.slice();
	            copy.varIndexByCol = this.varIndexByCol.slice();

	            copy.rowByVarIndex = this.rowByVarIndex.slice();
	            copy.colByVarIndex = this.colByVarIndex.slice();

	            copy.availableIndexes = this.availableIndexes.slice();

	            var matrix = this.matrix;
	            var matrixCopy = new Array(this.height);
	            for (var r = 0; r < this.height; r++) {
	                matrixCopy[r] = matrix[r].slice();
	            }

	            copy.matrix = matrixCopy;

	            return copy;
	        };

	        Tableau.prototype.save = function () {
	            this.savedState = this.copy();
	        };

	        Tableau.prototype.restore = function () {
	            if (this.savedState === null) {
	                return;
	            }

	            var save = this.savedState;
	            var savedMatrix = save.matrix;
	            this.nVars = save.nVars;
	            this.model = save.model;

	            // Shallow restore
	            this.variables = save.variables;
	            this.variablesPerIndex = save.variablesPerIndex;
	            this.unrestrictedVars = save.unrestrictedVars;
	            this.lastElementIndex = save.lastElementIndex;

	            this.width = save.width;
	            this.height = save.height;

	            // Restoring matrix
	            var r, c;
	            for (r = 0; r < this.height; r += 1) {
	                var savedRow = savedMatrix[r];
	                var row = this.matrix[r];
	                for (c = 0; c < this.width; c += 1) {
	                    row[c] = savedRow[c];
	                }
	            }

	            // Restoring all the other structures
	            var savedBasicIndexes = save.varIndexByRow;
	            for (c = 0; c < this.height; c += 1) {
	                this.varIndexByRow[c] = savedBasicIndexes[c];
	            }

	            while (this.varIndexByRow.length > this.height) {
	                this.varIndexByRow.pop();
	            }

	            var savedNonBasicIndexes = save.varIndexByCol;
	            for (r = 0; r < this.width; r += 1) {
	                this.varIndexByCol[r] = savedNonBasicIndexes[r];
	            }

	            while (this.varIndexByCol.length > this.width) {
	                this.varIndexByCol.pop();
	            }

	            var savedRows = save.rowByVarIndex;
	            var savedCols = save.colByVarIndex;
	            for (var v = 0; v < this.nVars; v += 1) {
	                this.rowByVarIndex[v] = savedRows[v];
	                this.colByVarIndex[v] = savedCols[v];
	            }

	            this.availableIndexes = save.availableIndexes.slice();
	        };

	        Tableau.prototype.addCutConstraints = function (cutConstraints) {
	            var nCutConstraints = cutConstraints.length;

	            var height = this.height;
	            var heightWithCuts = height + nCutConstraints;

	            // Adding rows to hold cut constraints
	            for (var h = height; h < heightWithCuts; h += 1) {
	                if (this.matrix[h] === undefined) {
	                    this.matrix[h] = this.matrix[h - 1].slice();
	                }
	            }

	            // Adding cut constraints
	            this.height = heightWithCuts;
	            this.nVars = this.width + this.height - 2;

	            var c;
	            var lastColumn = this.width - 1;
	            for (var i = 0; i < nCutConstraints; i += 1) {
	                var cut = cutConstraints[i];

	                // Constraint row index
	                var r = height + i;

	                var sign = cut.type === "min" ? -1 : 1;

	                // Variable on which the cut is applied
	                var varIndex = cut.varIndex;
	                var varRowIndex = this.rowByVarIndex[varIndex];
	                var constraintRow = this.matrix[r];
	                if (varRowIndex === -1) {
	                    // Variable is non basic
	                    constraintRow[this.rhsColumn] = sign * cut.value;
	                    for (c = 1; c <= lastColumn; c += 1) {
	                        constraintRow[c] = 0;
	                    }
	                    constraintRow[this.colByVarIndex[varIndex]] = sign;
	                } else {
	                    // Variable is basic
	                    var varRow = this.matrix[varRowIndex];
	                    var varValue = varRow[this.rhsColumn];
	                    constraintRow[this.rhsColumn] = sign * (cut.value - varValue);
	                    for (c = 1; c <= lastColumn; c += 1) {
	                        constraintRow[c] = -sign * varRow[c];
	                    }
	                }

	                // Creating slack variable
	                var slackVarIndex = this.getNewElementIndex();
	                this.varIndexByRow[r] = slackVarIndex;
	                this.rowByVarIndex[slackVarIndex] = r;
	                this.colByVarIndex[slackVarIndex] = -1;
	                this.variablesPerIndex[slackVarIndex] = new expressions.SlackVariable("s" + slackVarIndex, slackVarIndex);
	                this.nVars += 1;
	            }
	        };

	        Tableau.prototype._addLowerBoundMIRCut = function (rowIndex) {

	            if (rowIndex === this.costRowIndex) {
	                //console.log("! IN MIR CUTS : The index of the row corresponds to the cost row. !");
	                return false;
	            }

	            var model = this.model;
	            var matrix = this.matrix;

	            var intVar = this.variablesPerIndex[this.varIndexByRow[rowIndex]];
	            if (!intVar.isInteger) {
	                return false;
	            }

	            var d = matrix[rowIndex][this.rhsColumn];
	            var frac_d = d - Math.floor(d);

	            if (frac_d < this.precision || 1 - this.precision < frac_d) {
	                return false;
	            }

	            //Adding a row
	            var r = this.height;
	            matrix[r] = matrix[r - 1].slice();
	            this.height += 1;

	            // Creating slack variable
	            this.nVars += 1;
	            var slackVarIndex = this.getNewElementIndex();
	            this.varIndexByRow[r] = slackVarIndex;
	            this.rowByVarIndex[slackVarIndex] = r;
	            this.colByVarIndex[slackVarIndex] = -1;
	            this.variablesPerIndex[slackVarIndex] = new expressions.SlackVariable("s" + slackVarIndex, slackVarIndex);

	            matrix[r][this.rhsColumn] = Math.floor(d);

	            for (var colIndex = 1; colIndex < this.varIndexByCol.length; colIndex += 1) {
	                var variable = this.variablesPerIndex[this.varIndexByCol[colIndex]];

	                if (!variable.isInteger) {
	                    matrix[r][colIndex] = Math.min(0, matrix[rowIndex][colIndex] / (1 - frac_d));
	                } else {
	                    var coef = matrix[rowIndex][colIndex];
	                    var termCoeff = Math.floor(coef) + Math.max(0, coef - Math.floor(coef) - frac_d) / (1 - frac_d);
	                    matrix[r][colIndex] = termCoeff;
	                }
	            }

	            for (var c = 0; c < this.width; c += 1) {
	                matrix[r][c] -= matrix[rowIndex][c];
	            }

	            return true;
	        };

	        Tableau.prototype._addUpperBoundMIRCut = function (rowIndex) {

	            if (rowIndex === this.costRowIndex) {
	                //console.log("! IN MIR CUTS : The index of the row corresponds to the cost row. !");
	                return false;
	            }

	            var model = this.model;
	            var matrix = this.matrix;

	            var intVar = this.variablesPerIndex[this.varIndexByRow[rowIndex]];
	            if (!intVar.isInteger) {
	                return false;
	            }

	            var b = matrix[rowIndex][this.rhsColumn];
	            var f = b - Math.floor(b);

	            if (f < this.precision || 1 - this.precision < f) {
	                return false;
	            }

	            //Adding a row
	            var r = this.height;
	            matrix[r] = matrix[r - 1].slice();
	            this.height += 1;

	            // Creating slack variable
	            this.nVars += 1;
	            var slackVarIndex = this.getNewElementIndex();
	            this.varIndexByRow[r] = slackVarIndex;
	            this.rowByVarIndex[slackVarIndex] = r;
	            this.colByVarIndex[slackVarIndex] = -1;
	            this.variablesPerIndex[slackVarIndex] = new expressions.SlackVariable("s" + slackVarIndex, slackVarIndex);

	            matrix[r][this.rhsColumn] = -f;

	            for (var colIndex = 1; colIndex < this.varIndexByCol.length; colIndex += 1) {
	                var variable = this.variablesPerIndex[this.varIndexByCol[colIndex]];

	                var aj = matrix[rowIndex][colIndex];
	                var fj = aj - Math.floor(aj);

	                if (variable.isInteger) {
	                    if (fj <= f) {
	                        matrix[r][colIndex] = -fj;
	                    } else {
	                        matrix[r][colIndex] = -(1 - fj) * f / fj;
	                    }
	                } else {
	                    if (aj >= 0) {
	                        matrix[r][colIndex] = -aj;
	                    } else {
	                        matrix[r][colIndex] = aj * f / (1 - f);
	                    }
	                }
	            }

	            return true;
	        };

	        Tableau.prototype.applyMIRCuts = function () {

	            var nRows = this.height;
	            for (var cst = 0; cst < nRows; cst += 1) {
	                this._addUpperBoundMIRCut(cst);
	            }

	            // nRows = tableau.height;
	            for (cst = 0; cst < nRows; cst += 1) {
	                this._addLowerBoundMIRCut(cst);
	            }
	        };

	        Tableau.prototype.countIntegerValues = function () {

	            var count = 0;

	            for (var r = 1; r < this.height; r += 1) {
	                if (this.variablesPerIndex[this.varIndexByRow[r]].isInteger) {
	                    var decimalPart = this.matrix[r][this.rhsColumn];
	                    decimalPart = decimalPart - Math.floor(decimalPart);
	                    if (decimalPart < this.precision && -decimalPart < this.precision) {
	                        count += 1;
	                    }
	                }
	            }

	            return count;
	        };

	        // Multiply all the fractional parts of variables supposed to be integer
	        Tableau.prototype.computeFractionalVolume = function (ignoreIntegerValues) {

	            var volume = -1;

	            for (var r = 1; r < this.height; r += 1) {
	                if (this.variablesPerIndex[this.varIndexByRow[r]].isInteger) {
	                    var rhs = this.matrix[r][this.rhsColumn];
	                    rhs = Math.abs(rhs);
	                    var decimalPart = Math.min(rhs - Math.floor(rhs), Math.floor(rhs + 1));
	                    if (decimalPart < this.precision) {
	                        if (!ignoreIntegerValues) {
	                            return 0;
	                        }
	                    } else {
	                        if (volume === -1) {
	                            volume = rhs;
	                        } else {
	                            volume *= rhs;
	                        }
	                    }
	                }
	            }

	            if (volume === -1) {
	                return 0;
	            }
	            return volume;
	        };

	        Tableau.prototype.density = function () {
	            var density = 0;

	            var matrix = this.matrix;
	            for (var r = 0; r < this.height; r++) {
	                var row = matrix[r];
	                for (var c = 0; c < this.width; c++) {
	                    if (row[c] !== 0) {
	                        density += 1;
	                    }
	                }
	            }

	            return density / (this.height * this.width);
	        };

	        Tableau.prototype._putInBase = function (varIndex) {
	            // Is varIndex in the base?
	            var r = this.rowByVarIndex[varIndex];

	            if (r === -1) {
	                // Outside the base
	                // pivoting to take it out
	                var c = this.colByVarIndex[varIndex];

	                // Selecting pivot row
	                // (Any row with coefficient different from 0)
	                for (var r1 = 1; r1 < this.height; r1 += 1) {
	                    var coefficient = this.matrix[r1][c];
	                    if (coefficient < -this.precision || this.precision < coefficient) {
	                        r = r1;
	                        break;
	                    }
	                }

	                this.pivot(r, c);
	            }

	            return r;
	        };

	        Tableau.prototype._takeOutOfBase = function (varIndex) {
	            // Is varIndex in the base?
	            var c = this.colByVarIndex[varIndex];
	            if (c === -1) {
	                // Inside the base
	                // pivoting to take it out
	                var r = this.rowByVarIndex[varIndex];

	                // Selecting pivot column
	                // (Any column with coefficient different from 0)
	                var pivotRow = this.matrix[r];
	                for (var c1 = 1; c1 < this.width; c1 += 1) {
	                    var coefficient = pivotRow[c1];
	                    if (coefficient < -this.precision || this.precision < coefficient) {
	                        c = c1;
	                        break;
	                    }
	                }

	                this.pivot(r, c);
	            }

	            return c;
	        };

	        Tableau.prototype.updateRightHandSide = function (constraint, difference) {
	            // Updates RHS of given constraint
	            var lastRow = this.height - 1;
	            var constraintRow = this.rowByVarIndex[constraint.index];
	            if (constraintRow === -1) {
	                // Slack is not in base
	                var slackColumn = this.colByVarIndex[constraint.index];

	                // Upading all the RHS values
	                for (var r = 0; r <= lastRow; r += 1) {
	                    var row = this.matrix[r];
	                    row[this.rhsColumn] -= difference * row[slackColumn];
	                }

	                var nOptionalObjectives = this.optionalObjectives.length;
	                if (nOptionalObjectives > 0) {
	                    for (var o = 0; o < nOptionalObjectives; o += 1) {
	                        var reducedCosts = this.optionalObjectives[o].reducedCosts;
	                        reducedCosts[this.rhsColumn] -= difference * reducedCosts[slackColumn];
	                    }
	                }
	            } else {
	                // Slack variable of constraint is in base
	                // Updating RHS with the difference between the old and the new one
	                this.matrix[constraintRow][this.rhsColumn] -= difference;
	            }
	        };

	        Tableau.prototype.updateConstraintCoefficient = function (constraint, variable, difference) {

	            // Updates variable coefficient within a constraint
	            if (constraint.index === variable.index) {
	                // console.log('constraint index is', constraint.index);
	                throw new Error("In tableau.updateConstraintCoefficient : constraint index = variable index !");
	            }

	            var r = this._putInBase(constraint.index);

	            var colVar = this.colByVarIndex[variable.index];
	            if (colVar === -1) {
	                var rowVar = this.rowByVarIndex[variable.index];
	                for (var c = 0; c < this.width; c += 1) {
	                    this.matrix[r][c] -= difference * this.matrix[rowVar][c];
	                }
	            } else {
	                this.matrix[r][colVar] -= difference;
	            }
	        };

	        Tableau.prototype.updateCost = function (variable, difference) {
	            // Updates variable coefficient within the objective function
	            var varIndex = variable.index;
	            var lastColumn = this.width - 1;
	            var varColumn = this.colByVarIndex[varIndex];
	            if (varColumn === -1) {
	                // Variable is in base
	                var variableRow = this.matrix[this.rowByVarIndex[varIndex]];

	                var c;
	                if (variable.priority === 0) {
	                    var costRow = this.matrix[0];

	                    // Upading all the reduced costs
	                    for (c = 0; c <= lastColumn; c += 1) {
	                        costRow[c] += difference * variableRow[c];
	                    }
	                } else {
	                    var reducedCosts = this.objectivesByPriority[variable.priority].reducedCosts;
	                    for (c = 0; c <= lastColumn; c += 1) {
	                        reducedCosts[c] += difference * variableRow[c];
	                    }
	                }
	            } else {
	                // Variable is not in the base
	                // Updating coefficient with difference
	                this.matrix[0][varColumn] -= difference;
	            }
	        };

	        Tableau.prototype.addConstraint = function (constraint) {
	            // Adds a constraint to the tableau
	            var sign = constraint.isUpperBound ? 1 : -1;
	            var lastRow = this.height;

	            var constraintRow = this.matrix[lastRow];
	            if (constraintRow === undefined) {
	                constraintRow = this.matrix[0].slice();
	                this.matrix[lastRow] = constraintRow;
	            }

	            // Setting all row cells to 0
	            var lastColumn = this.width - 1;
	            for (var c = 0; c <= lastColumn; c += 1) {
	                constraintRow[c] = 0;
	            }

	            // Initializing RHS
	            constraintRow[this.rhsColumn] = sign * constraint.rhs;

	            var terms = constraint.terms;
	            var nTerms = terms.length;
	            for (var t = 0; t < nTerms; t += 1) {
	                var term = terms[t];
	                var coefficient = term.coefficient;
	                var varIndex = term.variable.index;

	                var varRowIndex = this.rowByVarIndex[varIndex];
	                if (varRowIndex === -1) {
	                    // Variable is non basic
	                    constraintRow[this.colByVarIndex[varIndex]] += sign * coefficient;
	                } else {
	                    // Variable is basic
	                    var varRow = this.matrix[varRowIndex];
	                    var varValue = varRow[this.rhsColumn];
	                    for (c = 0; c <= lastColumn; c += 1) {
	                        constraintRow[c] -= sign * coefficient * varRow[c];
	                    }
	                }
	            }
	            // Creating slack variable
	            var slackIndex = constraint.index;
	            this.varIndexByRow[lastRow] = slackIndex;
	            this.rowByVarIndex[slackIndex] = lastRow;
	            this.colByVarIndex[slackIndex] = -1;

	            this.height += 1;
	        };

	        Tableau.prototype.removeConstraint = function (constraint) {
	            var slackIndex = constraint.index;
	            var lastRow = this.height - 1;

	            // Putting the constraint's slack in the base
	            var r = this._putInBase(slackIndex);

	            // Removing constraint
	            // by putting the corresponding row at the bottom of the matrix
	            // and virtually reducing the height of the matrix by 1
	            var tmpRow = this.matrix[lastRow];
	            this.matrix[lastRow] = this.matrix[r];
	            this.matrix[r] = tmpRow;

	            // Removing associated slack variable from basic variables
	            this.varIndexByRow[r] = this.varIndexByRow[lastRow];
	            this.varIndexByRow[lastRow] = -1;
	            this.rowByVarIndex[slackIndex] = -1;

	            // Putting associated slack variable index in index manager
	            this.availableIndexes[this.availableIndexes.length] = slackIndex;

	            this.height -= 1;
	        };

	        function OptionalObjective(priority, nColumns) {
	            this.priority = priority;
	            this.reducedCosts = new Array(nColumns);
	            for (var c = 0; c < nColumns; c += 1) {
	                this.reducedCosts[c] = 0;
	            }
	        }

	        Tableau.prototype.setOptionalObjective = function (priority, column, cost) {
	            var objectiveForPriority = this.objectivesByPriority[priority];
	            if (objectiveForPriority === undefined) {
	                var nColumns = Math.max(this.width, column) + 1;
	                objectiveForPriority = new OptionalObjective(priority, nColumns);
	                this.objectivesByPriority[priority] = objectiveForPriority;
	                this.optionalObjectives.push(objectiveForPriority);
	                this.optionalObjectives.sort(function (a, b) {
	                    return a.priority - b.priority;
	                });
	            }

	            objectiveForPriority.reducedCosts[column] = cost;
	        };

	        Tableau.prototype.addVariable = function (variable) {
	            // Adds a variable to the tableau
	            // var sign = constraint.isUpperBound ? 1 : -1;

	            var lastRow = this.height - 1;
	            var lastColumn = this.width;
	            var cost = this.model.isMinimization === true ? -variable.cost : variable.cost;
	            var priority = variable.priority;

	            // Setting reduced costs
	            var nOptionalObjectives = this.optionalObjectives.length;
	            if (nOptionalObjectives > 0) {
	                for (var o = 0; o < nOptionalObjectives; o += 1) {
	                    this.optionalObjectives[o].reducedCosts[lastColumn] = 0;
	                }
	            }

	            if (priority === 0) {
	                this.matrix[0][lastColumn] = cost;
	            } else {
	                this.setOptionalObjective(priority, lastColumn, cost);
	                this.matrix[0][lastColumn] = 0;
	            }

	            // Setting all other column cells to 0
	            for (var r = 1; r <= lastRow; r += 1) {
	                this.matrix[r][lastColumn] = 0;
	            }

	            // Adding variable to trackers
	            var varIndex = variable.index;
	            this.varIndexByCol[lastColumn] = varIndex;

	            this.rowByVarIndex[varIndex] = -1;
	            this.colByVarIndex[varIndex] = lastColumn;

	            this.width += 1;
	        };

	        Tableau.prototype.removeVariable = function (variable) {
	            var varIndex = variable.index;

	            // Putting the variable out of the base
	            var c = this._takeOutOfBase(varIndex);

	            var lastColumn = this.width - 1;
	            if (c !== lastColumn) {
	                var lastRow = this.height - 1;
	                for (var r = 0; r <= lastRow; r += 1) {
	                    var row = this.matrix[r];
	                    row[c] = row[lastColumn];
	                }

	                var nOptionalObjectives = this.optionalObjectives.length;
	                if (nOptionalObjectives > 0) {
	                    for (var o = 0; o < nOptionalObjectives; o += 1) {
	                        var reducedCosts = this.optionalObjectives[o].reducedCosts;
	                        reducedCosts[c] = reducedCosts[lastColumn];
	                    }
	                }

	                var switchVarIndex = this.varIndexByCol[lastColumn];
	                this.varIndexByCol[c] = switchVarIndex;
	                this.colByVarIndex[switchVarIndex] = c;
	            }

	            // Removing variable from non basic variables
	            this.varIndexByCol[lastColumn] = -1;
	            this.colByVarIndex[varIndex] = -1;

	            // Adding index into index manager
	            this.availableIndexes[this.availableIndexes.length] = varIndex;

	            this.width -= 1;
	        };

	        Tableau.prototype._resetMatrix = function () {
	            var variables = this.model.variables;
	            var constraints = this.model.constraints;

	            var nVars = variables.length;
	            var nConstraints = constraints.length;

	            var v, varIndex;
	            var costRow = this.matrix[0];
	            var coeff = this.model.isMinimization === true ? -1 : 1;
	            for (v = 0; v < nVars; v += 1) {
	                var variable = variables[v];
	                var priority = variable.priority;
	                var cost = coeff * variable.cost;
	                if (priority === 0) {
	                    costRow[v + 1] = cost;
	                } else {
	                    this.setOptionalObjective(priority, v + 1, cost);
	                }
	            }

	            for (v = 0; v < nVars; v += 1) {
	                varIndex = variables[v].index;
	                this.rowByVarIndex[varIndex] = -1;
	                this.colByVarIndex[varIndex] = v + 1;
	                this.varIndexByCol[v + 1] = varIndex;
	            }

	            var rowIndex = 1;
	            for (var c = 0; c < nConstraints; c += 1) {
	                var constraint = constraints[c];

	                var constraintIndex = constraint.index;
	                this.rowByVarIndex[constraintIndex] = rowIndex;
	                this.colByVarIndex[constraintIndex] = -1;
	                this.varIndexByRow[rowIndex] = constraintIndex;

	                var t, term, column;
	                var terms = constraint.terms;
	                var nTerms = terms.length;
	                var row = this.matrix[rowIndex++];
	                if (constraint.isUpperBound) {
	                    for (t = 0; t < nTerms; t += 1) {
	                        term = terms[t];
	                        column = this.colByVarIndex[term.variable.index];
	                        row[column] = term.coefficient;
	                    }

	                    row[0] = constraint.rhs;
	                } else {
	                    for (t = 0; t < nTerms; t += 1) {
	                        term = terms[t];
	                        column = this.colByVarIndex[term.variable.index];
	                        row[column] = -term.coefficient;
	                    }

	                    row[0] = -constraint.rhs;
	                }
	            }
	        };

	        Tableau.prototype.getNewElementIndex = function () {
	            if (this.availableIndexes.length > 0) {
	                return this.availableIndexes.pop();
	            }

	            var index = this.lastElementIndex;
	            this.lastElementIndex += 1;
	            return index;
	        };

	        //-------------------------------------------------------------------
	        //-------------------------------------------------------------------
	        Tableau.prototype.setModel = function (model) {
	            this.model = model;

	            var width = model.nVariables + 1;
	            var height = model.nConstraints + 1;

	            this.initialize(width, height, model.variables, model.unrestrictedVariables);
	            this._resetMatrix();
	            return this;
	        };

	        //-------------------------------------------------------------------
	        // Description: Display a tableau matrix
	        //              and additional tableau information
	        //
	        //-------------------------------------------------------------------
	        Tableau.prototype.log = function (message, force) {
	            if (false) {
	                return;
	            }

	            console.log("****", message, "****");
	            console.log("Nb Variables", this.width - 1);
	            console.log("Nb Constraints", this.height - 1);
	            // console.log("Variable Ids", this.variablesPerIndex);
	            console.log("Basic Indexes", this.varIndexByRow);
	            console.log("Non Basic Indexes", this.varIndexByCol);
	            console.log("Rows", this.rowByVarIndex);
	            console.log("Cols", this.colByVarIndex);

	            var digitPrecision = 5;

	            // Variable declaration
	            var varNameRowString = "",
	                spacePerColumn = [" "],
	                j,
	                c,
	                s,
	                r,
	                variable,
	                varIndex,
	                varName,
	                varNameLength,
	                nSpaces,
	                valueSpace,
	                nameSpace;

	            var row, rowString;

	            for (c = 1; c < this.width; c += 1) {
	                varIndex = this.varIndexByCol[c];
	                variable = this.variablesPerIndex[varIndex];
	                if (variable === undefined) {
	                    varName = "c" + varIndex;
	                } else {
	                    varName = variable.id;
	                }

	                varNameLength = varName.length;
	                nSpaces = Math.abs(varNameLength - 5);
	                valueSpace = " ";
	                nameSpace = "\t";

	                ///////////
	                /*valueSpace = " ";
	                nameSpace = " ";
	                 for (s = 0; s < nSpaces; s += 1) {
	                    if (varNameLength > 5) {
	                        valueSpace += " ";
	                    } else {
	                        nameSpace += " ";
	                    }
	                }*/

	                ///////////
	                if (varNameLength > 5) {
	                    valueSpace += " ";
	                } else {
	                    nameSpace += "\t";
	                }

	                spacePerColumn[c] = valueSpace;

	                varNameRowString += nameSpace + varName;
	            }
	            console.log(varNameRowString);

	            var signSpace;

	            // Displaying reduced costs
	            var firstRow = this.matrix[this.costRowIndex];
	            var firstRowString = "\t";

	            ///////////
	            /*for (j = 1; j < this.width; j += 1) {
	                signSpace = firstRow[j] < 0 ? "" : " ";
	                firstRowString += signSpace;
	                firstRowString += spacePerColumn[j];
	                firstRowString += firstRow[j].toFixed(2);
	            }
	            signSpace = firstRow[0] < 0 ? "" : " ";
	            firstRowString += signSpace + spacePerColumn[0] +
	                firstRow[0].toFixed(2);
	            console.log(firstRowString + " Z");*/

	            ///////////
	            for (j = 1; j < this.width; j += 1) {
	                signSpace = "\t";
	                firstRowString += signSpace;
	                firstRowString += spacePerColumn[j];
	                firstRowString += firstRow[j].toFixed(digitPrecision);
	            }
	            signSpace = "\t";
	            firstRowString += signSpace + spacePerColumn[0] + firstRow[0].toFixed(digitPrecision);
	            console.log(firstRowString + "\tZ");

	            // Then the basic variable rowByVarIndex
	            for (r = 1; r < this.height; r += 1) {
	                row = this.matrix[r];
	                rowString = "\t";

	                ///////////
	                /*for (c = 1; c < this.width; c += 1) {
	                    signSpace = row[c] < 0 ? "" : " ";
	                    rowString += signSpace + spacePerColumn[c] + row[c].toFixed(2);
	                }
	                signSpace = row[0] < 0 ? "" : " ";
	                rowString += signSpace + spacePerColumn[0] + row[0].toFixed(2);*/

	                ///////////
	                for (c = 1; c < this.width; c += 1) {
	                    signSpace = "\t";
	                    rowString += signSpace + spacePerColumn[c] + row[c].toFixed(digitPrecision);
	                }
	                signSpace = "\t";
	                rowString += signSpace + spacePerColumn[0] + row[0].toFixed(digitPrecision);

	                varIndex = this.varIndexByRow[r];
	                variable = this.variablesPerIndex[varIndex];
	                if (variable === undefined) {
	                    varName = "c" + varIndex;
	                } else {
	                    varName = variable.id;
	                }
	                console.log(rowString + "\t" + varName);
	            }
	            console.log("");

	            // Then reduced costs for optional objectives
	            var nOptionalObjectives = this.optionalObjectives.length;
	            if (nOptionalObjectives > 0) {
	                console.log("    Optional objectives:");
	                for (var o = 0; o < nOptionalObjectives; o += 1) {
	                    var reducedCosts = this.optionalObjectives[o].reducedCosts;
	                    var reducedCostsString = "";
	                    for (j = 1; j < this.width; j += 1) {
	                        signSpace = reducedCosts[j] < 0 ? "" : " ";
	                        reducedCostsString += signSpace;
	                        reducedCostsString += spacePerColumn[j];
	                        reducedCostsString += reducedCosts[j].toFixed(digitPrecision);
	                    }
	                    signSpace = reducedCosts[0] < 0 ? "" : " ";
	                    reducedCostsString += signSpace + spacePerColumn[0] + reducedCosts[0].toFixed(digitPrecision);
	                    console.log(reducedCostsString + " z" + o);
	                }
	            }
	            console.log("Feasible?", this.feasible);
	            console.log("evaluation", this.evaluation);

	            return this;
	        };
	    }, { "./Solution.js": 5, "./expressions.js": 8 }], 7: [function (require, module, exports) {
	        /*global describe*/
	        /*global require*/
	        /*global module*/
	        /*global it*/
	        /*global console*/
	        /*global process*/
	        /*global exports*/

	        // All functions in this module that
	        // get exported to main ***MUST***
	        // return a functional LPSolve JSON style
	        // model or throw an error

	        exports.CleanObjectiveAttributes = function (model) {
	            // Test to see if the objective attribute
	            // is also used by one of the constraints
	            //
	            // If so...create a new attribute on each
	            // variable
	            var fakeAttr, x, z;

	            if (typeof model.optimize === "string") {
	                if (model.constraints[model.optimize]) {
	                    // Create the new attribute
	                    fakeAttr = Math.random();

	                    // Go over each variable and check
	                    for (x in model.variables) {
	                        // Is it there?
	                        if (model.variables[x][model.optimize]) {
	                            model.variables[x][fakeAttr] = model.variables[x][model.optimize];
	                        }
	                    }

	                    // Now that we've cleaned up the variables
	                    // we need to clean up the constraints
	                    model.constraints[fakeAttr] = model.constraints[model.optimize];
	                    delete model.constraints[model.optimize];
	                    return model;
	                } else {
	                    return model;
	                }
	            } else {
	                // We're assuming its an object?
	                for (z in model.optimize) {
	                    if (model.constraints[z]) {
	                        // Make sure that the constraint
	                        // being optimized isn't constrained
	                        // by an equity collar
	                        if (model.constraints[z] === "equal") {
	                            // Its constrained by an equal sign;
	                            // delete that objective and move on
	                            delete model.optimize[z];
	                        } else {
	                            // Create the new attribute
	                            fakeAttr = Math.random();

	                            // Go over each variable and check
	                            for (x in model.variables) {
	                                // Is it there?
	                                if (model.variables[x][z]) {
	                                    model.variables[x][fakeAttr] = model.variables[x][z];
	                                }
	                            }
	                            // Now that we've cleaned up the variables
	                            // we need to clean up the constraints
	                            model.constraints[fakeAttr] = model.constraints[z];
	                            delete model.constraints[z];
	                        }
	                    }
	                }
	                return model;
	            }
	        };
	    }, {}], 8: [function (require, module, exports) {
	        /*global describe*/
	        /*global require*/
	        /*global module*/
	        /*global it*/
	        /*global console*/
	        /*global process*/

	        //-------------------------------------------------------------------
	        //-------------------------------------------------------------------
	        function Variable(id, cost, index, priority) {
	            this.id = id;
	            this.cost = cost;
	            this.index = index;
	            this.value = 0;
	            this.priority = priority;
	        }

	        function IntegerVariable(id, cost, index, priority) {
	            Variable.call(this, id, cost, index, priority);
	        }
	        IntegerVariable.prototype.isInteger = true;

	        function SlackVariable(id, index) {
	            Variable.call(this, id, 0, index, 0);
	        }
	        SlackVariable.prototype.isSlack = true;

	        //-------------------------------------------------------------------
	        //-------------------------------------------------------------------
	        function Term(variable, coefficient) {
	            this.variable = variable;
	            this.coefficient = coefficient;
	        }

	        function createRelaxationVariable(model, weight, priority) {
	            weight = weight || 0;
	            priority = priority || 0;

	            if (model.isMinimization === false) {
	                weight = -weight;
	            }

	            return model.addVariable(weight, "r" + model.relaxationIndex++, false, false, priority);
	        }

	        //-------------------------------------------------------------------
	        //-------------------------------------------------------------------
	        function Constraint(rhs, isUpperBound, index, model) {
	            this.slack = new SlackVariable("s" + index, index);
	            this.index = index;
	            this.model = model;
	            this.rhs = rhs;
	            this.isUpperBound = isUpperBound;

	            this.terms = [];
	            this.termsByVarIndex = {};

	            // Error variable in case the constraint is relaxed
	            this.relaxation = null;
	        }

	        Constraint.prototype.addTerm = function (coefficient, variable) {
	            var varIndex = variable.index;
	            var term = this.termsByVarIndex[varIndex];
	            if (term === undefined) {
	                // No term for given variable
	                term = new Term(variable, coefficient);
	                this.termsByVarIndex[varIndex] = term;
	                this.terms.push(term);
	                if (this.isUpperBound === true) {
	                    coefficient = -coefficient;
	                }
	                this.model.updateConstraintCoefficient(this, variable, coefficient);
	            } else {
	                // Term for given variable already exists
	                // updating its coefficient
	                var newCoefficient = term.coefficient + coefficient;
	                this.setVariableCoefficient(newCoefficient, variable);
	            }

	            return this;
	        };

	        Constraint.prototype.removeTerm = function (term) {
	            // TODO
	            return this;
	        };

	        Constraint.prototype.setRightHandSide = function (newRhs) {
	            if (newRhs !== this.rhs) {
	                var difference = newRhs - this.rhs;
	                if (this.isUpperBound === true) {
	                    difference = -difference;
	                }

	                this.rhs = newRhs;
	                this.model.updateRightHandSide(this, difference);
	            }

	            return this;
	        };

	        Constraint.prototype.setVariableCoefficient = function (newCoefficient, variable) {
	            var varIndex = variable.index;
	            if (varIndex === -1) {
	                console.warn("[Constraint.setVariableCoefficient] Trying to change coefficient of inexistant variable.");
	                return;
	            }

	            var term = this.termsByVarIndex[varIndex];
	            if (term === undefined) {
	                // No term for given variable
	                this.addTerm(newCoefficient, variable);
	            } else {
	                // Term for given variable already exists
	                // updating its coefficient if changed
	                if (newCoefficient !== term.coefficient) {
	                    var difference = newCoefficient - term.coefficient;
	                    if (this.isUpperBound === true) {
	                        difference = -difference;
	                    }

	                    term.coefficient = newCoefficient;
	                    this.model.updateConstraintCoefficient(this, variable, difference);
	                }
	            }

	            return this;
	        };

	        Constraint.prototype.relax = function (weight, priority) {
	            this.relaxation = createRelaxationVariable(this.model, weight, priority);
	            this._relax(this.relaxation, priority);
	        };

	        Constraint.prototype._relax = function (error) {
	            if (this.isUpperBound) {
	                this.setVariableCoefficient(-1, error);
	            } else {
	                this.setVariableCoefficient(1, error);
	            }
	        };

	        //-------------------------------------------------------------------
	        //-------------------------------------------------------------------
	        function Equality(constraintUpper, constraintLower) {
	            this.upperBound = constraintUpper;
	            this.lowerBound = constraintLower;
	            this.model = constraintUpper.model;
	            this.rhs = constraintUpper.rhs;
	            this.relaxation = null;
	        }

	        Equality.prototype.isEquality = true;

	        Equality.prototype.addTerm = function (coefficient, variable) {
	            this.upperBound.addTerm(coefficient, variable);
	            this.lowerBound.addTerm(coefficient, variable);
	            return this;
	        };

	        Equality.prototype.removeTerm = function (term) {
	            this.upperBound.removeTerm(term);
	            this.lowerBound.removeTerm(term);
	            return this;
	        };

	        Equality.prototype.setRightHandSide = function (rhs) {
	            this.upperBound.setRightHandSide(rhs);
	            this.lowerBound.setRightHandSide(rhs);
	            this.rhs = rhs;
	        };

	        Equality.prototype.relax = function (weight, priority) {
	            this.relaxation = createRelaxationVariable(this.model, weight, priority);
	            this.upperBound._relax(this.relaxation);
	            this.lowerBound._relax(this.relaxation);
	        };

	        module.exports = {
	            Constraint: Constraint,
	            Variable: Variable,
	            IntegerVariable: IntegerVariable,
	            SlackVariable: SlackVariable,
	            Equality: Equality,
	            Term: Term
	        };
	    }, {}], 9: [function (require, module, exports) {
	        /*global describe*/
	        /*global require*/
	        /*global module*/
	        /*global it*/
	        /*global console*/
	        /*global process*/

	        //-------------------------------------------------------------------
	        // SimplexJS
	        // https://github.com/
	        // An Object-Oriented Linear Programming Solver
	        //
	        // By Justin Wolcott (c)
	        // Licensed under the MIT License.
	        //-------------------------------------------------------------------

	        var Tableau = require("./Tableau");
	        var Model = require("./Model");
	        var MILP = require("./MILP");
	        var expressions = require("./expressions.js");
	        var validation = require("./Validation");
	        var Constraint = expressions.Constraint;
	        var Variable = expressions.Variable;
	        var Numeral = expressions.Numeral;
	        var Term = expressions.Term;

	        // Place everything under the Solver Name Space
	        var Solver = function Solver() {

	            "use strict";

	            this.Model = Model;
	            this.MILP = MILP;
	            this.Constraint = Constraint;
	            this.Variable = Variable;
	            this.Numeral = Numeral;
	            this.Term = Term;
	            this.Tableau = Tableau;

	            this.lastSolvedModel = null;

	            /*************************************************************
	             * Method: Solve
	             * Scope: Public:
	             * Agruments:
	             *        model: The model we want solver to operate on
	             *        precision: If we're solving a MILP, how tight
	             *                   do we want to define an integer, given
	             *                   that 20.000000000000001 is not an integer.
	             *                   (defaults to 1e-9)
	             *            full: *get better description*
	             *        validate: if left blank, it will get ignored; otherwise
	             *                  it will run the model through all validation
	             *                  functions in the *Validate* module
	             **************************************************************/
	            this.Solve = function (model, precision, full, validate) {
	                // Run our validations on the model
	                // if the model doesn't have a validate
	                // attribute set to false
	                if (validate) {
	                    for (var test in validation) {
	                        model = validation[test](model);
	                    }
	                }

	                // Make sure we at least have a model
	                if (!model) {
	                    throw new Error("Solver requires a model to operate on");
	                }

	                if (model instanceof Model === false) {
	                    model = new Model(precision).loadJson(model);
	                }

	                var solution = model.solve();
	                this.lastSolvedModel = model;
	                solution.solutionSet = solution.generateSolutionSet();

	                // If the user asks for a full breakdown
	                // of the tableau (e.g. full === true)
	                // this will return it
	                if (full) {
	                    return solution;
	                } else {
	                    // Otherwise; give the user the bare
	                    // minimum of info necessary to carry on

	                    var store = {};

	                    // 1.) Add in feasibility to store;
	                    store.feasible = solution.feasible;

	                    // 2.) Add in the objective value
	                    store.result = solution.evaluation;

	                    // 3.) Load all of the variable values
	                    Object.keys(solution.solutionSet).map(function (d) {
	                        store[d] = solution.solutionSet[d];
	                    });

	                    return store;
	                }
	            };

	            /*************************************************************
	             * Method: ReformatLP
	             * Scope: Public:
	             * Agruments: model: The model we want solver to operate on
	             * Purpose: Convert a friendly JSON model into a model for a
	             *          real solving library...in this case
	             *          lp_solver
	             **************************************************************/
	            this.ReformatLP = require("./Reformat");

	            /*************************************************************
	            * Method: MultiObjective
	            * Scope: Public:
	            * Agruments:
	            *        model: The model we want solver to operate on
	            *        detail: if false, or undefined; it will return the
	            *                result of using the mid-point formula; otherwise
	            *                it will return an object containing:
	            *
	            *                1. The results from the mid point formula
	            *                2. The solution for each objective solved
	            *                   in isolation (pareto)
	            *                3. The min and max of each variable along
	            *                   the frontier of the polytope (ranges)
	            * Purpose: Solve a model with multiple objective functions.
	            *          Since a potential infinite number of solutions exist
	            *          this naively returns the mid-point between
	            *
	            * Note: The model has to be changed a little to work with this.
	            *       Before an *opType* was required. No more. The objective
	            *       attribute of the model is now an object instead of a
	            *       string.
	            *
	            *  *EXAMPLE MODEL*
	            *
	            *   model = {
	            *       optimize: {scotch: "max", soda: "max"},
	            *       constraints: {fluid: {equal: 100}},
	            *       variables: {
	            *           scotch: {fluid: 1, scotch: 1},
	            *           soda: {fluid: 1, soda: 1}
	            *       }
	            *   }
	            *
	            **************************************************************/
	            this.MultiObjective = function (model) {
	                return require("./Polyopt")(this, model);
	            };
	        };

	        // Determine the environment we're in.
	        // if we're in node, offer a friendly exports
	        // otherwise, Solver's going global
	        /* jshint ignore:start */

	        (function () {
	            // If define exists; use it
	            if (true) {
	                !(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = function () {
	                    return new Solver();
	                }.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	            } else if ((typeof window === "undefined" ? "undefined" : _typeof(window)) === "object") {
	                window.solver = new Solver();
	            } else {
	                module.exports = new Solver();
	            }
	        })();

	        /* jshint ignore:end */
	    }, { "./MILP": 1, "./Model": 2, "./Polyopt": 3, "./Reformat": 4, "./Tableau": 6, "./Validation": 7, "./expressions.js": 8 }] }, {}, [9]);

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;"use strict";

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

	/*global describe*/
	/*global require*/
	/*global module*/
	/*global it*/
	/*global console*/
	/*global process*/

	//-------------------------------------------------------------------
	// SimplexJS
	// https://github.com/
	// An Object-Oriented Linear Programming Solver
	//
	// By Justin Wolcott (c)
	// Licensed under the MIT License.
	//-------------------------------------------------------------------

	var Tableau = __webpack_require__(4);
	var Model = __webpack_require__(7);
	var MILP = __webpack_require__(8);
	var expressions = __webpack_require__(6);
	var validation = __webpack_require__(9);
	var Constraint = expressions.Constraint;
	var Variable = expressions.Variable;
	var Numeral = expressions.Numeral;
	var Term = expressions.Term;

	// Place everything under the Solver Name Space
	var Solver = function Solver() {

	    "use strict";

	    this.Model = Model;
	    this.MILP = MILP;
	    this.Constraint = Constraint;
	    this.Variable = Variable;
	    this.Numeral = Numeral;
	    this.Term = Term;
	    this.Tableau = Tableau;

	    this.lastSolvedModel = null;

	    /*************************************************************
	     * Method: Solve
	     * Scope: Public:
	     * Agruments:
	     *        model: The model we want solver to operate on
	     *        precision: If we're solving a MILP, how tight
	     *                   do we want to define an integer, given
	     *                   that 20.000000000000001 is not an integer.
	     *                   (defaults to 1e-9)
	     *            full: *get better description*
	     *        validate: if left blank, it will get ignored; otherwise
	     *                  it will run the model through all validation
	     *                  functions in the *Validate* module
	     **************************************************************/
	    this.Solve = function (model, precision, full, validate) {
	        // Run our validations on the model
	        // if the model doesn't have a validate
	        // attribute set to false
	        if (validate) {
	            for (var test in validation) {
	                model = validation[test](model);
	            }
	        }

	        // Make sure we at least have a model
	        if (!model) {
	            throw new Error("Solver requires a model to operate on");
	        }

	        if (model instanceof Model === false) {
	            model = new Model(precision).loadJson(model);
	        }

	        var solution = model.solve();
	        this.lastSolvedModel = model;
	        solution.solutionSet = solution.generateSolutionSet();

	        // If the user asks for a full breakdown
	        // of the tableau (e.g. full === true)
	        // this will return it
	        if (full) {
	            return solution;
	        } else {
	            // Otherwise; give the user the bare
	            // minimum of info necessary to carry on

	            var store = {};

	            // 1.) Add in feasibility to store;
	            store.feasible = solution.feasible;

	            // 2.) Add in the objective value
	            store.result = solution.evaluation;

	            // 3.) Load all of the variable values
	            Object.keys(solution.solutionSet).map(function (d) {
	                store[d] = solution.solutionSet[d];
	            });

	            return store;
	        }
	    };

	    /*************************************************************
	     * Method: ReformatLP
	     * Scope: Public:
	     * Agruments: model: The model we want solver to operate on
	     * Purpose: Convert a friendly JSON model into a model for a
	     *          real solving library...in this case
	     *          lp_solver
	     **************************************************************/
	    this.ReformatLP = __webpack_require__(10);

	    /*************************************************************
	    * Method: MultiObjective
	    * Scope: Public:
	    * Agruments:
	    *        model: The model we want solver to operate on
	    *        detail: if false, or undefined; it will return the
	    *                result of using the mid-point formula; otherwise
	    *                it will return an object containing:
	    *
	    *                1. The results from the mid point formula
	    *                2. The solution for each objective solved
	    *                   in isolation (pareto)
	    *                3. The min and max of each variable along
	    *                   the frontier of the polytope (ranges)
	    * Purpose: Solve a model with multiple objective functions.
	    *          Since a potential infinite number of solutions exist
	    *          this naively returns the mid-point between
	    *
	    * Note: The model has to be changed a little to work with this.
	    *       Before an *opType* was required. No more. The objective
	    *       attribute of the model is now an object instead of a
	    *       string.
	    *
	    *  *EXAMPLE MODEL*
	    *
	    *   model = {
	    *       optimize: {scotch: "max", soda: "max"},
	    *       constraints: {fluid: {equal: 100}},
	    *       variables: {
	    *           scotch: {fluid: 1, scotch: 1},
	    *           soda: {fluid: 1, soda: 1}
	    *       }
	    *   }
	    *
	    **************************************************************/
	    this.MultiObjective = function (model) {
	        return __webpack_require__(11)(this, model);
	    };
	};

	// Determine the environment we're in.
	// if we're in node, offer a friendly exports
	// otherwise, Solver's going global
	/* jshint ignore:start */

	(function () {
	    // If define exists; use it
	    if (true) {
	        !(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = function () {
	            return new Solver();
	        }.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	    } else if ((typeof window === "undefined" ? "undefined" : _typeof(window)) === "object") {
	        window.solver = new Solver();
	    } else {
	        module.exports = new Solver();
	    }
	})();

	/* jshint ignore:end */

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	/*global describe*/
	/*global require*/
	/*global module*/
	/*global it*/
	/*global console*/
	/*global process*/
	var Solution = __webpack_require__(5);
	var expressions = __webpack_require__(6);
	var Constraint = expressions.Constraint;

	/*************************************************************
	 * Class: Tableau
	 * Description: Simplex tableau, holding a the tableau matrix
	 *              and all the information necessary to perform
	 *              the simplex algorithm
	 * Agruments:
	 *        precision: If we're solving a MILP, how tight
	 *                   do we want to define an integer, given
	 *                   that 20.000000000000001 is not an integer.
	 *                   (defaults to 1e-8)
	 **************************************************************/
	function Tableau(precision) {
	    this.model = null;

	    this.matrix = null;
	    this.width = 0;
	    this.height = 0;

	    this.costRowIndex = 0;
	    this.rhsColumn = 0;

	    this.variablesPerIndex = [];
	    this.unrestrictedVars = null;

	    // Solution attributes
	    this.feasible = true; // until proven guilty
	    this.evaluation = 0;

	    this.varIndexByRow = null;
	    this.varIndexByCol = null;

	    this.rowByVarIndex = null;
	    this.colByVarIndex = null;

	    // this.model.variables[this.varIndexByRow[1]];

	    // this.varIndexByRow = null;
	    // this.varIndexByCol = null;
	    //
	    // this.rowByVarIndex = null;
	    // this.colByVarIndex = null;

	    this.precision = precision || 1e-8;

	    this.optionalObjectives = [];
	    this.objectivesByPriority = {};

	    this.savedState = null;

	    this.availableIndexes = [];
	    this.lastElementIndex = 0;

	    this.variables = null;
	    this.nVars = 0;
	}
	module.exports = Tableau;

	//-------------------------------------------------------------------
	//-------------------------------------------------------------------
	Tableau.prototype.initialize = function (width, height, variables, unrestrictedVars) {
	    this.variables = variables;
	    this.unrestrictedVars = unrestrictedVars;

	    this.width = width;
	    this.height = height;

	    // BUILD AN EMPTY ARRAY OF THAT WIDTH
	    var tmpRow = new Array(width);
	    for (var i = 0; i < width; i++) {
	        tmpRow[i] = 0;
	    }

	    // BUILD AN EMPTY TABLEAU
	    this.matrix = new Array(height);
	    for (var j = 0; j < height; j++) {
	        this.matrix[j] = tmpRow.slice();
	    }

	    this.varIndexByRow = new Array(this.height);
	    this.varIndexByCol = new Array(this.width);

	    this.varIndexByRow[0] = -1;
	    this.varIndexByCol[0] = -1;

	    this.nVars = width + height - 2;
	    this.rowByVarIndex = new Array(this.nVars);
	    this.colByVarIndex = new Array(this.nVars);

	    this.lastElementIndex = this.nVars;
	};

	//-------------------------------------------------------------------
	// Function: solve
	// Detail: Main function, linear programming solver
	//-------------------------------------------------------------------
	Tableau.prototype.solve = function () {
	    // this.log('INIT')
	    // Execute Phase 1 to obtain a Basic Feasible Solution (BFS)
	    this.phase1();

	    // Execute Phase 2
	    if (this.feasible === true) {
	        // Running simplex on Initial Basic Feasible Solution (BFS)
	        // N.B current solution is feasible
	        this.phase2();
	    }

	    return this;
	};

	//-------------------------------------------------------------------
	//-------------------------------------------------------------------
	Tableau.prototype.updateVariableValues = function () {
	    var nVars = this.variables.length;
	    var roundingCoeff = Math.round(1 / this.precision);
	    for (var v = 0; v < nVars; v += 1) {
	        var variable = this.variables[v];
	        var varIndex = variable.index;

	        var r = this.rowByVarIndex[varIndex];
	        if (r === -1) {
	            // Variable is non basic
	            variable.value = 0;
	        } else {
	            // Variable is basic
	            var varValue = this.matrix[r][this.rhsColumn];
	            variable.value = Math.round(varValue * roundingCoeff) / roundingCoeff;
	        }
	    }
	};

	//-------------------------------------------------------------------
	//-------------------------------------------------------------------
	Tableau.prototype.getSolution = function () {
	    var evaluation = this.model.isMinimization === true ? this.evaluation : -this.evaluation;

	    return new Solution(this, evaluation, this.feasible);
	};

	//-------------------------------------------------------------------
	//-------------------------------------------------------------------
	Tableau.prototype.isIntegral = function () {
	    var integerVariables = this.model.integerVariables;

	    var nIntegerVars = integerVariables.length;
	    for (var v = 0; v < nIntegerVars; v++) {
	        var varRow = this.rowByVarIndex[integerVariables[v].index];
	        if (varRow === -1) {
	            continue;
	        }

	        var varValue = this.matrix[varRow][this.rhsColumn];
	        if (Math.abs(varValue - Math.round(varValue)) > this.precision) {
	            return false;
	        }
	    }
	    return true;
	};

	function VariableData(index, value) {
	    this.index = index;
	    this.value = value;
	}

	//-------------------------------------------------------------------
	//-------------------------------------------------------------------
	Tableau.prototype.getMostFractionalVar = function () {
	    var biggestFraction = 0;
	    var selectedVarIndex = null;
	    var selectedVarValue = null;
	    var mid = 0.5;

	    var integerVariables = this.model.integerVariables;
	    var nIntegerVars = integerVariables.length;
	    for (var v = 0; v < nIntegerVars; v++) {
	        var varIndex = integerVariables[v].index;
	        var varRow = this.rowByVarIndex[varIndex];
	        if (varRow === -1) {
	            continue;
	        }

	        var varValue = this.matrix[varRow][this.rhsColumn];
	        var fraction = Math.abs(varValue - Math.round(varValue));
	        if (biggestFraction < fraction) {
	            biggestFraction = fraction;
	            selectedVarIndex = varIndex;
	            selectedVarValue = varValue;
	        }
	    }

	    return new VariableData(selectedVarIndex, selectedVarValue);
	};

	//-------------------------------------------------------------------
	//-------------------------------------------------------------------
	Tableau.prototype.getFractionalVarWithLowestCost = function () {
	    var highestCost = Infinity;
	    var selectedVarIndex = null;
	    var selectedVarValue = null;

	    var integerVariables = this.model.integerVariables;
	    var nIntegerVars = integerVariables.length;
	    for (var v = 0; v < nIntegerVars; v++) {
	        var variable = integerVariables[v];
	        var varIndex = variable.index;
	        var varRow = this.rowByVarIndex[varIndex];
	        if (varRow === -1) {
	            // Variable value is non basic
	            // its value is 0
	            continue;
	        }

	        var varValue = this.matrix[varRow][this.rhsColumn];
	        if (Math.abs(varValue - Math.round(varValue)) > this.precision) {
	            var cost = variable.cost;
	            if (highestCost > cost) {
	                highestCost = cost;
	                selectedVarIndex = varIndex;
	                selectedVarValue = varValue;
	            }
	        }
	    }

	    return new VariableData(selectedVarIndex, selectedVarValue);
	};

	//-------------------------------------------------------------------
	//-------------------------------------------------------------------
	Tableau.prototype.setEvaluation = function () {
	    // Rounding objective value
	    var roundingCoeff = Math.round(1 / this.precision);
	    var evaluation = this.matrix[this.costRowIndex][this.rhsColumn];
	    this.evaluation = Math.round(evaluation * roundingCoeff) / roundingCoeff;
	};

	//-------------------------------------------------------------------
	// Description: Convert a non standard form tableau
	//              to a standard form tableau by eliminating
	//              all negative values in the Right Hand Side (RHS)
	//              This results in a Basic Feasible Solution (BFS)
	//
	//-------------------------------------------------------------------
	Tableau.prototype.phase1 = function () {
	    var matrix = this.matrix;
	    var rhsColumn = this.rhsColumn;
	    var lastColumn = this.width - 1;
	    var lastRow = this.height - 1;

	    var unrestricted;
	    var iterations = 0;
	    while (true) {
	        // Selecting leaving variable (feasibility condition):
	        // Basic variable with most negative value
	        var leavingRowIndex = 0;
	        var rhsValue = -this.precision;
	        for (var r = 1; r <= lastRow; r++) {
	            unrestricted = this.unrestrictedVars[this.varIndexByRow[r]] === true;
	            if (unrestricted) {
	                continue;
	            }

	            var value = matrix[r][rhsColumn];
	            if (value < rhsValue) {
	                rhsValue = value;
	                leavingRowIndex = r;
	            }
	        }

	        // If nothing is strictly smaller than 0; we're done with phase 1.
	        if (leavingRowIndex === 0) {
	            // Feasible, champagne!
	            this.feasible = true;
	            return iterations;
	        }

	        // Selecting entering variable
	        var enteringColumn = 0;
	        var maxQuotient = -Infinity;
	        var costRow = matrix[0];
	        var leavingRow = matrix[leavingRowIndex];
	        for (var c = 1; c <= lastColumn; c++) {
	            var reducedCost = leavingRow[c];
	            if (-this.precision < reducedCost && reducedCost < this.precision) {
	                continue;
	            }

	            unrestricted = this.unrestrictedVars[this.varIndexByCol[c]] === true;
	            if (unrestricted || reducedCost < -this.precision) {
	                var quotient = -costRow[c] / reducedCost;
	                if (maxQuotient < quotient) {
	                    maxQuotient = quotient;
	                    enteringColumn = c;
	                }
	            }
	        }

	        if (enteringColumn === 0) {
	            // Not feasible
	            this.feasible = false;
	            return iterations;
	        }

	        this.pivot(leavingRowIndex, enteringColumn);
	        iterations += 1;
	    }
	};

	//-------------------------------------------------------------------
	// Description: Apply simplex to obtain optimal soltuion
	//              used as phase2 of the simplex
	//
	//-------------------------------------------------------------------
	Tableau.prototype.phase2 = function () {
	    var matrix = this.matrix;
	    var rhsColumn = this.rhsColumn;
	    var lastColumn = this.width - 1;
	    var lastRow = this.height - 1;

	    var precision = this.precision;
	    var nOptionalObjectives = this.optionalObjectives.length;
	    var optionalCostsColumns = null;

	    var iterations = 0;
	    var reducedCost, unrestricted;
	    while (true) {
	        var costRow = matrix[this.costRowIndex];

	        // Selecting entering variable (optimality condition)
	        if (nOptionalObjectives > 0) {
	            optionalCostsColumns = [];
	        }

	        var enteringColumn = 0;
	        var enteringValue = this.precision;
	        var isReducedCostNegative = false;
	        for (var c = 1; c <= lastColumn; c++) {
	            reducedCost = costRow[c];
	            unrestricted = this.unrestrictedVars[this.varIndexByCol[c]] === true;

	            if (nOptionalObjectives > 0 && -this.precision < reducedCost && reducedCost < this.precision) {
	                optionalCostsColumns.push(c);
	                continue;
	            }

	            if (unrestricted && reducedCost < 0) {
	                if (-reducedCost > enteringValue) {
	                    enteringValue = -reducedCost;
	                    enteringColumn = c;
	                    isReducedCostNegative = true;
	                }
	                continue;
	            }

	            if (reducedCost > enteringValue) {
	                enteringValue = reducedCost;
	                enteringColumn = c;
	                isReducedCostNegative = false;
	            }
	        }

	        if (nOptionalObjectives > 0) {
	            // There exist optional improvable objectives
	            var o = 0;
	            while (enteringColumn === 0 && optionalCostsColumns.length > 0 && o < nOptionalObjectives) {
	                var optionalCostsColumns2 = [];
	                var reducedCosts = this.optionalObjectives[o].reducedCosts;
	                for (var i = 0; i <= optionalCostsColumns.length; i++) {
	                    c = optionalCostsColumns[i];
	                    reducedCost = reducedCosts[c];
	                    unrestricted = this.unrestrictedVars[this.varIndexByCol[c]] === true;

	                    if (-this.precision < reducedCost && reducedCost < this.precision) {
	                        optionalCostsColumns2.push(c);
	                        continue;
	                    }

	                    if (unrestricted && reducedCost < 0) {
	                        if (-reducedCost > enteringValue) {
	                            enteringValue = -reducedCost;
	                            enteringColumn = c;
	                            isReducedCostNegative = true;
	                        }
	                        continue;
	                    }

	                    if (reducedCost > enteringValue) {
	                        enteringValue = reducedCost;
	                        enteringColumn = c;
	                        isReducedCostNegative = false;
	                    }
	                }
	                optionalCostsColumns = optionalCostsColumns2;
	                o += 1;
	            }
	        }

	        // If no entering column could be found we're done with phase 2.
	        if (enteringColumn === 0) {
	            this.setEvaluation();
	            return;
	        }

	        // Selecting leaving variable
	        var leavingRow = 0;
	        var minQuotient = Infinity;

	        for (var r = 1; r <= lastRow; r++) {
	            var row = matrix[r];
	            var rhsValue = row[rhsColumn];
	            var colValue = row[enteringColumn];

	            if (-precision < colValue && colValue < precision) {
	                continue;
	            }

	            if (colValue > 0 && precision > rhsValue && rhsValue > -precision) {
	                minQuotient = 0;
	                leavingRow = r;
	                break;
	            }

	            var quotient = isReducedCostNegative ? -rhsValue / colValue : rhsValue / colValue;
	            if (quotient > 0 && minQuotient > quotient) {
	                minQuotient = quotient;
	                leavingRow = r;
	            }
	        }

	        if (minQuotient === Infinity) {
	            // TODO: solution is not bounded
	            // optimal value is -Infinity
	            this.evaluation = -Infinity;
	            return;
	        }

	        this.pivot(leavingRow, enteringColumn, true);
	        iterations += 1;
	    }
	};

	// Array holding the column indexes for which the value is not null
	// on the pivot row
	// Shared by all tableaux for smaller overhead and lower memory usage
	var nonZeroColumns = [];
	//-------------------------------------------------------------------
	// Description: Execute pivot operations over a 2d array,
	//          on a given row, and column
	//
	//-------------------------------------------------------------------
	Tableau.prototype.pivot = function (pivotRowIndex, pivotColumnIndex) {
	    var matrix = this.matrix;

	    var quotient = matrix[pivotRowIndex][pivotColumnIndex];

	    var lastRow = this.height - 1;
	    var lastColumn = this.width - 1;

	    var leavingBasicIndex = this.varIndexByRow[pivotRowIndex];
	    var enteringBasicIndex = this.varIndexByCol[pivotColumnIndex];

	    this.varIndexByRow[pivotRowIndex] = enteringBasicIndex;
	    this.varIndexByCol[pivotColumnIndex] = leavingBasicIndex;

	    this.rowByVarIndex[enteringBasicIndex] = pivotRowIndex;
	    this.rowByVarIndex[leavingBasicIndex] = -1;

	    this.colByVarIndex[enteringBasicIndex] = -1;
	    this.colByVarIndex[leavingBasicIndex] = pivotColumnIndex;

	    // Divide everything in the target row by the element @
	    // the target column
	    var pivotRow = matrix[pivotRowIndex];
	    var nNonZeroColumns = 0;
	    for (var c = 0; c <= lastColumn; c++) {
	        if (pivotRow[c] !== 0) {
	            pivotRow[c] /= quotient;
	            nonZeroColumns[nNonZeroColumns] = c;
	            nNonZeroColumns += 1;
	        }
	    }
	    pivotRow[pivotColumnIndex] = 1 / quotient;

	    // for every row EXCEPT the pivot row,
	    // set the value in the pivot column = 0 by
	    // multiplying the value of all elements in the objective
	    // row by ... yuck... just look below; better explanation later
	    var coefficient, i, v0;
	    var precision = this.precision;
	    for (var r = 0; r <= lastRow; r++) {
	        var row = matrix[r];
	        if (r !== pivotRowIndex) {
	            coefficient = row[pivotColumnIndex];
	            // No point Burning Cycles if
	            // Zero to the thing
	            if (coefficient !== 0) {
	                for (i = 0; i < nNonZeroColumns; i++) {
	                    c = nonZeroColumns[i];
	                    // No point in doing math if you're just adding
	                    // Zero to the thing
	                    v0 = pivotRow[c];
	                    if (v0 !== 0) {
	                        row[c] = row[c] - coefficient * v0;
	                    }
	                }

	                row[pivotColumnIndex] = -coefficient / quotient;
	            }
	        }
	    }

	    var nOptionalObjectives = this.optionalObjectives.length;
	    if (nOptionalObjectives > 0) {
	        for (var o = 0; o < nOptionalObjectives; o += 1) {
	            var reducedCosts = this.optionalObjectives[o].reducedCosts;
	            coefficient = reducedCosts[pivotColumnIndex];
	            if (coefficient !== 0) {
	                for (i = 0; i < nNonZeroColumns; i++) {
	                    c = nonZeroColumns[i];
	                    v0 = pivotRow[c];
	                    if (v0 !== 0) {
	                        reducedCosts[c] = reducedCosts[c] - coefficient * v0;
	                    }
	                }

	                reducedCosts[pivotColumnIndex] = -coefficient / quotient;
	            }
	        }
	    }
	};

	Tableau.prototype.copy = function () {
	    var copy = new Tableau(this.precision);

	    copy.width = this.width;
	    copy.height = this.height;

	    copy.nVars = this.nVars;
	    copy.model = this.model;

	    // Making a shallow copy of integer variable indexes
	    // and variable ids
	    copy.variables = this.variables;
	    copy.variablesPerIndex = this.variablesPerIndex;
	    copy.unrestrictedVars = this.unrestrictedVars;
	    copy.lastElementIndex = this.lastElementIndex;

	    // All the other arrays are deep copied
	    copy.varIndexByRow = this.varIndexByRow.slice();
	    copy.varIndexByCol = this.varIndexByCol.slice();

	    copy.rowByVarIndex = this.rowByVarIndex.slice();
	    copy.colByVarIndex = this.colByVarIndex.slice();

	    copy.availableIndexes = this.availableIndexes.slice();

	    var matrix = this.matrix;
	    var matrixCopy = new Array(this.height);
	    for (var r = 0; r < this.height; r++) {
	        matrixCopy[r] = matrix[r].slice();
	    }

	    copy.matrix = matrixCopy;

	    return copy;
	};

	Tableau.prototype.save = function () {
	    this.savedState = this.copy();
	};

	Tableau.prototype.restore = function () {
	    if (this.savedState === null) {
	        return;
	    }

	    var save = this.savedState;
	    var savedMatrix = save.matrix;
	    this.nVars = save.nVars;
	    this.model = save.model;

	    // Shallow restore
	    this.variables = save.variables;
	    this.variablesPerIndex = save.variablesPerIndex;
	    this.unrestrictedVars = save.unrestrictedVars;
	    this.lastElementIndex = save.lastElementIndex;

	    this.width = save.width;
	    this.height = save.height;

	    // Restoring matrix
	    var r, c;
	    for (r = 0; r < this.height; r += 1) {
	        var savedRow = savedMatrix[r];
	        var row = this.matrix[r];
	        for (c = 0; c < this.width; c += 1) {
	            row[c] = savedRow[c];
	        }
	    }

	    // Restoring all the other structures
	    var savedBasicIndexes = save.varIndexByRow;
	    for (c = 0; c < this.height; c += 1) {
	        this.varIndexByRow[c] = savedBasicIndexes[c];
	    }

	    while (this.varIndexByRow.length > this.height) {
	        this.varIndexByRow.pop();
	    }

	    var savedNonBasicIndexes = save.varIndexByCol;
	    for (r = 0; r < this.width; r += 1) {
	        this.varIndexByCol[r] = savedNonBasicIndexes[r];
	    }

	    while (this.varIndexByCol.length > this.width) {
	        this.varIndexByCol.pop();
	    }

	    var savedRows = save.rowByVarIndex;
	    var savedCols = save.colByVarIndex;
	    for (var v = 0; v < this.nVars; v += 1) {
	        this.rowByVarIndex[v] = savedRows[v];
	        this.colByVarIndex[v] = savedCols[v];
	    }

	    this.availableIndexes = save.availableIndexes.slice();
	};

	Tableau.prototype.addCutConstraints = function (cutConstraints) {
	    var nCutConstraints = cutConstraints.length;

	    var height = this.height;
	    var heightWithCuts = height + nCutConstraints;

	    // Adding rows to hold cut constraints
	    for (var h = height; h < heightWithCuts; h += 1) {
	        if (this.matrix[h] === undefined) {
	            this.matrix[h] = this.matrix[h - 1].slice();
	        }
	    }

	    // Adding cut constraints
	    this.height = heightWithCuts;
	    this.nVars = this.width + this.height - 2;

	    var c;
	    var lastColumn = this.width - 1;
	    for (var i = 0; i < nCutConstraints; i += 1) {
	        var cut = cutConstraints[i];

	        // Constraint row index
	        var r = height + i;

	        var sign = cut.type === "min" ? -1 : 1;

	        // Variable on which the cut is applied
	        var varIndex = cut.varIndex;
	        var varRowIndex = this.rowByVarIndex[varIndex];
	        var constraintRow = this.matrix[r];
	        if (varRowIndex === -1) {
	            // Variable is non basic
	            constraintRow[this.rhsColumn] = sign * cut.value;
	            for (c = 1; c <= lastColumn; c += 1) {
	                constraintRow[c] = 0;
	            }
	            constraintRow[this.colByVarIndex[varIndex]] = sign;
	        } else {
	            // Variable is basic
	            var varRow = this.matrix[varRowIndex];
	            var varValue = varRow[this.rhsColumn];
	            constraintRow[this.rhsColumn] = sign * (cut.value - varValue);
	            for (c = 1; c <= lastColumn; c += 1) {
	                constraintRow[c] = -sign * varRow[c];
	            }
	        }

	        // Creating slack variable
	        var slackVarIndex = this.getNewElementIndex();
	        this.varIndexByRow[r] = slackVarIndex;
	        this.rowByVarIndex[slackVarIndex] = r;
	        this.colByVarIndex[slackVarIndex] = -1;
	        this.variablesPerIndex[slackVarIndex] = new expressions.SlackVariable("s" + slackVarIndex, slackVarIndex);
	        this.nVars += 1;
	    }
	};

	Tableau.prototype._addLowerBoundMIRCut = function (rowIndex) {

	    if (rowIndex === this.costRowIndex) {
	        //console.log("! IN MIR CUTS : The index of the row corresponds to the cost row. !");
	        return false;
	    }

	    var model = this.model;
	    var matrix = this.matrix;

	    var intVar = this.variablesPerIndex[this.varIndexByRow[rowIndex]];
	    if (!intVar.isInteger) {
	        return false;
	    }

	    var d = matrix[rowIndex][this.rhsColumn];
	    var frac_d = d - Math.floor(d);

	    if (frac_d < this.precision || 1 - this.precision < frac_d) {
	        return false;
	    }

	    //Adding a row
	    var r = this.height;
	    matrix[r] = matrix[r - 1].slice();
	    this.height += 1;

	    // Creating slack variable
	    this.nVars += 1;
	    var slackVarIndex = this.getNewElementIndex();
	    this.varIndexByRow[r] = slackVarIndex;
	    this.rowByVarIndex[slackVarIndex] = r;
	    this.colByVarIndex[slackVarIndex] = -1;
	    this.variablesPerIndex[slackVarIndex] = new expressions.SlackVariable("s" + slackVarIndex, slackVarIndex);

	    matrix[r][this.rhsColumn] = Math.floor(d);

	    for (var colIndex = 1; colIndex < this.varIndexByCol.length; colIndex += 1) {
	        var variable = this.variablesPerIndex[this.varIndexByCol[colIndex]];

	        if (!variable.isInteger) {
	            matrix[r][colIndex] = Math.min(0, matrix[rowIndex][colIndex] / (1 - frac_d));
	        } else {
	            var coef = matrix[rowIndex][colIndex];
	            var termCoeff = Math.floor(coef) + Math.max(0, coef - Math.floor(coef) - frac_d) / (1 - frac_d);
	            matrix[r][colIndex] = termCoeff;
	        }
	    }

	    for (var c = 0; c < this.width; c += 1) {
	        matrix[r][c] -= matrix[rowIndex][c];
	    }

	    return true;
	};

	Tableau.prototype._addUpperBoundMIRCut = function (rowIndex) {

	    if (rowIndex === this.costRowIndex) {
	        //console.log("! IN MIR CUTS : The index of the row corresponds to the cost row. !");
	        return false;
	    }

	    var model = this.model;
	    var matrix = this.matrix;

	    var intVar = this.variablesPerIndex[this.varIndexByRow[rowIndex]];
	    if (!intVar.isInteger) {
	        return false;
	    }

	    var b = matrix[rowIndex][this.rhsColumn];
	    var f = b - Math.floor(b);

	    if (f < this.precision || 1 - this.precision < f) {
	        return false;
	    }

	    //Adding a row
	    var r = this.height;
	    matrix[r] = matrix[r - 1].slice();
	    this.height += 1;

	    // Creating slack variable
	    this.nVars += 1;
	    var slackVarIndex = this.getNewElementIndex();
	    this.varIndexByRow[r] = slackVarIndex;
	    this.rowByVarIndex[slackVarIndex] = r;
	    this.colByVarIndex[slackVarIndex] = -1;
	    this.variablesPerIndex[slackVarIndex] = new expressions.SlackVariable("s" + slackVarIndex, slackVarIndex);

	    matrix[r][this.rhsColumn] = -f;

	    for (var colIndex = 1; colIndex < this.varIndexByCol.length; colIndex += 1) {
	        var variable = this.variablesPerIndex[this.varIndexByCol[colIndex]];

	        var aj = matrix[rowIndex][colIndex];
	        var fj = aj - Math.floor(aj);

	        if (variable.isInteger) {
	            if (fj <= f) {
	                matrix[r][colIndex] = -fj;
	            } else {
	                matrix[r][colIndex] = -(1 - fj) * f / fj;
	            }
	        } else {
	            if (aj >= 0) {
	                matrix[r][colIndex] = -aj;
	            } else {
	                matrix[r][colIndex] = aj * f / (1 - f);
	            }
	        }
	    }

	    return true;
	};

	Tableau.prototype.applyMIRCuts = function () {

	    var nRows = this.height;
	    for (var cst = 0; cst < nRows; cst += 1) {
	        this._addUpperBoundMIRCut(cst);
	    }

	    // nRows = tableau.height;
	    for (cst = 0; cst < nRows; cst += 1) {
	        this._addLowerBoundMIRCut(cst);
	    }
	};

	Tableau.prototype.countIntegerValues = function () {

	    var count = 0;

	    for (var r = 1; r < this.height; r += 1) {
	        if (this.variablesPerIndex[this.varIndexByRow[r]].isInteger) {
	            var decimalPart = this.matrix[r][this.rhsColumn];
	            decimalPart = decimalPart - Math.floor(decimalPart);
	            if (decimalPart < this.precision && -decimalPart < this.precision) {
	                count += 1;
	            }
	        }
	    }

	    return count;
	};

	// Multiply all the fractional parts of variables supposed to be integer
	Tableau.prototype.computeFractionalVolume = function (ignoreIntegerValues) {

	    var volume = -1;

	    for (var r = 1; r < this.height; r += 1) {
	        if (this.variablesPerIndex[this.varIndexByRow[r]].isInteger) {
	            var rhs = this.matrix[r][this.rhsColumn];
	            rhs = Math.abs(rhs);
	            var decimalPart = Math.min(rhs - Math.floor(rhs), Math.floor(rhs + 1));
	            if (decimalPart < this.precision) {
	                if (!ignoreIntegerValues) {
	                    return 0;
	                }
	            } else {
	                if (volume === -1) {
	                    volume = rhs;
	                } else {
	                    volume *= rhs;
	                }
	            }
	        }
	    }

	    if (volume === -1) {
	        return 0;
	    }
	    return volume;
	};

	Tableau.prototype.density = function () {
	    var density = 0;

	    var matrix = this.matrix;
	    for (var r = 0; r < this.height; r++) {
	        var row = matrix[r];
	        for (var c = 0; c < this.width; c++) {
	            if (row[c] !== 0) {
	                density += 1;
	            }
	        }
	    }

	    return density / (this.height * this.width);
	};

	Tableau.prototype._putInBase = function (varIndex) {
	    // Is varIndex in the base?
	    var r = this.rowByVarIndex[varIndex];

	    if (r === -1) {
	        // Outside the base
	        // pivoting to take it out
	        var c = this.colByVarIndex[varIndex];

	        // Selecting pivot row
	        // (Any row with coefficient different from 0)
	        for (var r1 = 1; r1 < this.height; r1 += 1) {
	            var coefficient = this.matrix[r1][c];
	            if (coefficient < -this.precision || this.precision < coefficient) {
	                r = r1;
	                break;
	            }
	        }

	        this.pivot(r, c);
	    }

	    return r;
	};

	Tableau.prototype._takeOutOfBase = function (varIndex) {
	    // Is varIndex in the base?
	    var c = this.colByVarIndex[varIndex];
	    if (c === -1) {
	        // Inside the base
	        // pivoting to take it out
	        var r = this.rowByVarIndex[varIndex];

	        // Selecting pivot column
	        // (Any column with coefficient different from 0)
	        var pivotRow = this.matrix[r];
	        for (var c1 = 1; c1 < this.width; c1 += 1) {
	            var coefficient = pivotRow[c1];
	            if (coefficient < -this.precision || this.precision < coefficient) {
	                c = c1;
	                break;
	            }
	        }

	        this.pivot(r, c);
	    }

	    return c;
	};

	Tableau.prototype.updateRightHandSide = function (constraint, difference) {
	    // Updates RHS of given constraint
	    var lastRow = this.height - 1;
	    var constraintRow = this.rowByVarIndex[constraint.index];
	    if (constraintRow === -1) {
	        // Slack is not in base
	        var slackColumn = this.colByVarIndex[constraint.index];

	        // Upading all the RHS values
	        for (var r = 0; r <= lastRow; r += 1) {
	            var row = this.matrix[r];
	            row[this.rhsColumn] -= difference * row[slackColumn];
	        }

	        var nOptionalObjectives = this.optionalObjectives.length;
	        if (nOptionalObjectives > 0) {
	            for (var o = 0; o < nOptionalObjectives; o += 1) {
	                var reducedCosts = this.optionalObjectives[o].reducedCosts;
	                reducedCosts[this.rhsColumn] -= difference * reducedCosts[slackColumn];
	            }
	        }
	    } else {
	        // Slack variable of constraint is in base
	        // Updating RHS with the difference between the old and the new one
	        this.matrix[constraintRow][this.rhsColumn] -= difference;
	    }
	};

	Tableau.prototype.updateConstraintCoefficient = function (constraint, variable, difference) {

	    // Updates variable coefficient within a constraint
	    if (constraint.index === variable.index) {
	        // console.log('constraint index is', constraint.index);
	        throw new Error("In tableau.updateConstraintCoefficient : constraint index = variable index !");
	    }

	    var r = this._putInBase(constraint.index);

	    var colVar = this.colByVarIndex[variable.index];
	    if (colVar === -1) {
	        var rowVar = this.rowByVarIndex[variable.index];
	        for (var c = 0; c < this.width; c += 1) {
	            this.matrix[r][c] -= difference * this.matrix[rowVar][c];
	        }
	    } else {
	        this.matrix[r][colVar] -= difference;
	    }
	};

	Tableau.prototype.updateCost = function (variable, difference) {
	    // Updates variable coefficient within the objective function
	    var varIndex = variable.index;
	    var lastColumn = this.width - 1;
	    var varColumn = this.colByVarIndex[varIndex];
	    if (varColumn === -1) {
	        // Variable is in base
	        var variableRow = this.matrix[this.rowByVarIndex[varIndex]];

	        var c;
	        if (variable.priority === 0) {
	            var costRow = this.matrix[0];

	            // Upading all the reduced costs
	            for (c = 0; c <= lastColumn; c += 1) {
	                costRow[c] += difference * variableRow[c];
	            }
	        } else {
	            var reducedCosts = this.objectivesByPriority[variable.priority].reducedCosts;
	            for (c = 0; c <= lastColumn; c += 1) {
	                reducedCosts[c] += difference * variableRow[c];
	            }
	        }
	    } else {
	        // Variable is not in the base
	        // Updating coefficient with difference
	        this.matrix[0][varColumn] -= difference;
	    }
	};

	Tableau.prototype.addConstraint = function (constraint) {
	    // Adds a constraint to the tableau
	    var sign = constraint.isUpperBound ? 1 : -1;
	    var lastRow = this.height;

	    var constraintRow = this.matrix[lastRow];
	    if (constraintRow === undefined) {
	        constraintRow = this.matrix[0].slice();
	        this.matrix[lastRow] = constraintRow;
	    }

	    // Setting all row cells to 0
	    var lastColumn = this.width - 1;
	    for (var c = 0; c <= lastColumn; c += 1) {
	        constraintRow[c] = 0;
	    }

	    // Initializing RHS
	    constraintRow[this.rhsColumn] = sign * constraint.rhs;

	    var terms = constraint.terms;
	    var nTerms = terms.length;
	    for (var t = 0; t < nTerms; t += 1) {
	        var term = terms[t];
	        var coefficient = term.coefficient;
	        var varIndex = term.variable.index;

	        var varRowIndex = this.rowByVarIndex[varIndex];
	        if (varRowIndex === -1) {
	            // Variable is non basic
	            constraintRow[this.colByVarIndex[varIndex]] += sign * coefficient;
	        } else {
	            // Variable is basic
	            var varRow = this.matrix[varRowIndex];
	            var varValue = varRow[this.rhsColumn];
	            for (c = 0; c <= lastColumn; c += 1) {
	                constraintRow[c] -= sign * coefficient * varRow[c];
	            }
	        }
	    }
	    // Creating slack variable
	    var slackIndex = constraint.index;
	    this.varIndexByRow[lastRow] = slackIndex;
	    this.rowByVarIndex[slackIndex] = lastRow;
	    this.colByVarIndex[slackIndex] = -1;

	    this.height += 1;
	};

	Tableau.prototype.removeConstraint = function (constraint) {
	    var slackIndex = constraint.index;
	    var lastRow = this.height - 1;

	    // Putting the constraint's slack in the base
	    var r = this._putInBase(slackIndex);

	    // Removing constraint
	    // by putting the corresponding row at the bottom of the matrix
	    // and virtually reducing the height of the matrix by 1
	    var tmpRow = this.matrix[lastRow];
	    this.matrix[lastRow] = this.matrix[r];
	    this.matrix[r] = tmpRow;

	    // Removing associated slack variable from basic variables
	    this.varIndexByRow[r] = this.varIndexByRow[lastRow];
	    this.varIndexByRow[lastRow] = -1;
	    this.rowByVarIndex[slackIndex] = -1;

	    // Putting associated slack variable index in index manager
	    this.availableIndexes[this.availableIndexes.length] = slackIndex;

	    this.height -= 1;
	};

	function OptionalObjective(priority, nColumns) {
	    this.priority = priority;
	    this.reducedCosts = new Array(nColumns);
	    for (var c = 0; c < nColumns; c += 1) {
	        this.reducedCosts[c] = 0;
	    }
	}

	Tableau.prototype.setOptionalObjective = function (priority, column, cost) {
	    var objectiveForPriority = this.objectivesByPriority[priority];
	    if (objectiveForPriority === undefined) {
	        var nColumns = Math.max(this.width, column) + 1;
	        objectiveForPriority = new OptionalObjective(priority, nColumns);
	        this.objectivesByPriority[priority] = objectiveForPriority;
	        this.optionalObjectives.push(objectiveForPriority);
	        this.optionalObjectives.sort(function (a, b) {
	            return a.priority - b.priority;
	        });
	    }

	    objectiveForPriority.reducedCosts[column] = cost;
	};

	Tableau.prototype.addVariable = function (variable) {
	    // Adds a variable to the tableau
	    // var sign = constraint.isUpperBound ? 1 : -1;

	    var lastRow = this.height - 1;
	    var lastColumn = this.width;
	    var cost = this.model.isMinimization === true ? -variable.cost : variable.cost;
	    var priority = variable.priority;

	    // Setting reduced costs
	    var nOptionalObjectives = this.optionalObjectives.length;
	    if (nOptionalObjectives > 0) {
	        for (var o = 0; o < nOptionalObjectives; o += 1) {
	            this.optionalObjectives[o].reducedCosts[lastColumn] = 0;
	        }
	    }

	    if (priority === 0) {
	        this.matrix[0][lastColumn] = cost;
	    } else {
	        this.setOptionalObjective(priority, lastColumn, cost);
	        this.matrix[0][lastColumn] = 0;
	    }

	    // Setting all other column cells to 0
	    for (var r = 1; r <= lastRow; r += 1) {
	        this.matrix[r][lastColumn] = 0;
	    }

	    // Adding variable to trackers
	    var varIndex = variable.index;
	    this.varIndexByCol[lastColumn] = varIndex;

	    this.rowByVarIndex[varIndex] = -1;
	    this.colByVarIndex[varIndex] = lastColumn;

	    this.width += 1;
	};

	Tableau.prototype.removeVariable = function (variable) {
	    var varIndex = variable.index;

	    // Putting the variable out of the base
	    var c = this._takeOutOfBase(varIndex);

	    var lastColumn = this.width - 1;
	    if (c !== lastColumn) {
	        var lastRow = this.height - 1;
	        for (var r = 0; r <= lastRow; r += 1) {
	            var row = this.matrix[r];
	            row[c] = row[lastColumn];
	        }

	        var nOptionalObjectives = this.optionalObjectives.length;
	        if (nOptionalObjectives > 0) {
	            for (var o = 0; o < nOptionalObjectives; o += 1) {
	                var reducedCosts = this.optionalObjectives[o].reducedCosts;
	                reducedCosts[c] = reducedCosts[lastColumn];
	            }
	        }

	        var switchVarIndex = this.varIndexByCol[lastColumn];
	        this.varIndexByCol[c] = switchVarIndex;
	        this.colByVarIndex[switchVarIndex] = c;
	    }

	    // Removing variable from non basic variables
	    this.varIndexByCol[lastColumn] = -1;
	    this.colByVarIndex[varIndex] = -1;

	    // Adding index into index manager
	    this.availableIndexes[this.availableIndexes.length] = varIndex;

	    this.width -= 1;
	};

	Tableau.prototype._resetMatrix = function () {
	    var variables = this.model.variables;
	    var constraints = this.model.constraints;

	    var nVars = variables.length;
	    var nConstraints = constraints.length;

	    var v, varIndex;
	    var costRow = this.matrix[0];
	    var coeff = this.model.isMinimization === true ? -1 : 1;
	    for (v = 0; v < nVars; v += 1) {
	        var variable = variables[v];
	        var priority = variable.priority;
	        var cost = coeff * variable.cost;
	        if (priority === 0) {
	            costRow[v + 1] = cost;
	        } else {
	            this.setOptionalObjective(priority, v + 1, cost);
	        }
	    }

	    for (v = 0; v < nVars; v += 1) {
	        varIndex = variables[v].index;
	        this.rowByVarIndex[varIndex] = -1;
	        this.colByVarIndex[varIndex] = v + 1;
	        this.varIndexByCol[v + 1] = varIndex;
	    }

	    var rowIndex = 1;
	    for (var c = 0; c < nConstraints; c += 1) {
	        var constraint = constraints[c];

	        var constraintIndex = constraint.index;
	        this.rowByVarIndex[constraintIndex] = rowIndex;
	        this.colByVarIndex[constraintIndex] = -1;
	        this.varIndexByRow[rowIndex] = constraintIndex;

	        var t, term, column;
	        var terms = constraint.terms;
	        var nTerms = terms.length;
	        var row = this.matrix[rowIndex++];
	        if (constraint.isUpperBound) {
	            for (t = 0; t < nTerms; t += 1) {
	                term = terms[t];
	                column = this.colByVarIndex[term.variable.index];
	                row[column] = term.coefficient;
	            }

	            row[0] = constraint.rhs;
	        } else {
	            for (t = 0; t < nTerms; t += 1) {
	                term = terms[t];
	                column = this.colByVarIndex[term.variable.index];
	                row[column] = -term.coefficient;
	            }

	            row[0] = -constraint.rhs;
	        }
	    }
	};

	Tableau.prototype.getNewElementIndex = function () {
	    if (this.availableIndexes.length > 0) {
	        return this.availableIndexes.pop();
	    }

	    var index = this.lastElementIndex;
	    this.lastElementIndex += 1;
	    return index;
	};

	//-------------------------------------------------------------------
	//-------------------------------------------------------------------
	Tableau.prototype.setModel = function (model) {
	    this.model = model;

	    var width = model.nVariables + 1;
	    var height = model.nConstraints + 1;

	    this.initialize(width, height, model.variables, model.unrestrictedVariables);
	    this._resetMatrix();
	    return this;
	};

	//-------------------------------------------------------------------
	// Description: Display a tableau matrix
	//              and additional tableau information
	//
	//-------------------------------------------------------------------
	Tableau.prototype.log = function (message, force) {
	    if (false) {
	        return;
	    }

	    console.log("****", message, "****");
	    console.log("Nb Variables", this.width - 1);
	    console.log("Nb Constraints", this.height - 1);
	    // console.log("Variable Ids", this.variablesPerIndex);
	    console.log("Basic Indexes", this.varIndexByRow);
	    console.log("Non Basic Indexes", this.varIndexByCol);
	    console.log("Rows", this.rowByVarIndex);
	    console.log("Cols", this.colByVarIndex);

	    var digitPrecision = 5;

	    // Variable declaration
	    var varNameRowString = "",
	        spacePerColumn = [" "],
	        j,
	        c,
	        s,
	        r,
	        variable,
	        varIndex,
	        varName,
	        varNameLength,
	        nSpaces,
	        valueSpace,
	        nameSpace;

	    var row, rowString;

	    for (c = 1; c < this.width; c += 1) {
	        varIndex = this.varIndexByCol[c];
	        variable = this.variablesPerIndex[varIndex];
	        if (variable === undefined) {
	            varName = "c" + varIndex;
	        } else {
	            varName = variable.id;
	        }

	        varNameLength = varName.length;
	        nSpaces = Math.abs(varNameLength - 5);
	        valueSpace = " ";
	        nameSpace = "\t";

	        ///////////
	        /*valueSpace = " ";
	        nameSpace = " ";
	         for (s = 0; s < nSpaces; s += 1) {
	            if (varNameLength > 5) {
	                valueSpace += " ";
	            } else {
	                nameSpace += " ";
	            }
	        }*/

	        ///////////
	        if (varNameLength > 5) {
	            valueSpace += " ";
	        } else {
	            nameSpace += "\t";
	        }

	        spacePerColumn[c] = valueSpace;

	        varNameRowString += nameSpace + varName;
	    }
	    console.log(varNameRowString);

	    var signSpace;

	    // Displaying reduced costs
	    var firstRow = this.matrix[this.costRowIndex];
	    var firstRowString = "\t";

	    ///////////
	    /*for (j = 1; j < this.width; j += 1) {
	        signSpace = firstRow[j] < 0 ? "" : " ";
	        firstRowString += signSpace;
	        firstRowString += spacePerColumn[j];
	        firstRowString += firstRow[j].toFixed(2);
	    }
	    signSpace = firstRow[0] < 0 ? "" : " ";
	    firstRowString += signSpace + spacePerColumn[0] +
	        firstRow[0].toFixed(2);
	    console.log(firstRowString + " Z");*/

	    ///////////
	    for (j = 1; j < this.width; j += 1) {
	        signSpace = "\t";
	        firstRowString += signSpace;
	        firstRowString += spacePerColumn[j];
	        firstRowString += firstRow[j].toFixed(digitPrecision);
	    }
	    signSpace = "\t";
	    firstRowString += signSpace + spacePerColumn[0] + firstRow[0].toFixed(digitPrecision);
	    console.log(firstRowString + "\tZ");

	    // Then the basic variable rowByVarIndex
	    for (r = 1; r < this.height; r += 1) {
	        row = this.matrix[r];
	        rowString = "\t";

	        ///////////
	        /*for (c = 1; c < this.width; c += 1) {
	            signSpace = row[c] < 0 ? "" : " ";
	            rowString += signSpace + spacePerColumn[c] + row[c].toFixed(2);
	        }
	        signSpace = row[0] < 0 ? "" : " ";
	        rowString += signSpace + spacePerColumn[0] + row[0].toFixed(2);*/

	        ///////////
	        for (c = 1; c < this.width; c += 1) {
	            signSpace = "\t";
	            rowString += signSpace + spacePerColumn[c] + row[c].toFixed(digitPrecision);
	        }
	        signSpace = "\t";
	        rowString += signSpace + spacePerColumn[0] + row[0].toFixed(digitPrecision);

	        varIndex = this.varIndexByRow[r];
	        variable = this.variablesPerIndex[varIndex];
	        if (variable === undefined) {
	            varName = "c" + varIndex;
	        } else {
	            varName = variable.id;
	        }
	        console.log(rowString + "\t" + varName);
	    }
	    console.log("");

	    // Then reduced costs for optional objectives
	    var nOptionalObjectives = this.optionalObjectives.length;
	    if (nOptionalObjectives > 0) {
	        console.log("    Optional objectives:");
	        for (var o = 0; o < nOptionalObjectives; o += 1) {
	            var reducedCosts = this.optionalObjectives[o].reducedCosts;
	            var reducedCostsString = "";
	            for (j = 1; j < this.width; j += 1) {
	                signSpace = reducedCosts[j] < 0 ? "" : " ";
	                reducedCostsString += signSpace;
	                reducedCostsString += spacePerColumn[j];
	                reducedCostsString += reducedCosts[j].toFixed(digitPrecision);
	            }
	            signSpace = reducedCosts[0] < 0 ? "" : " ";
	            reducedCostsString += signSpace + spacePerColumn[0] + reducedCosts[0].toFixed(digitPrecision);
	            console.log(reducedCostsString + " z" + o);
	        }
	    }
	    console.log("Feasible?", this.feasible);
	    console.log("evaluation", this.evaluation);

	    return this;
	};

/***/ },
/* 5 */
/***/ function(module, exports) {

	"use strict";

	/*global module*/

	function Solution(tableau, evaluation, feasible) {
	    this.feasible = feasible;
	    this.evaluation = evaluation;
	    this._tableau = tableau;
	}
	module.exports = Solution;

	Solution.prototype.generateSolutionSet = function () {
	    var solutionSet = {};

	    var tableau = this._tableau;
	    var varIndexByRow = tableau.varIndexByRow;
	    var variablesPerIndex = tableau.variablesPerIndex;
	    var matrix = tableau.matrix;
	    var rhsColumn = tableau.rhsColumn;
	    var lastRow = tableau.height - 1;
	    var roundingCoeff = Math.round(1 / tableau.precision);

	    for (var r = 1; r <= lastRow; r += 1) {
	        var varIndex = varIndexByRow[r];
	        var variable = variablesPerIndex[varIndex];
	        if (variable === undefined || variable.isSlack === true) {
	            continue;
	        }

	        var varValue = matrix[r][rhsColumn];
	        solutionSet[variable.id] = Math.round(varValue * roundingCoeff) / roundingCoeff;
	    }

	    return solutionSet;
	};

/***/ },
/* 6 */
/***/ function(module, exports) {

	"use strict";

	/*global describe*/
	/*global require*/
	/*global module*/
	/*global it*/
	/*global console*/
	/*global process*/

	//-------------------------------------------------------------------
	//-------------------------------------------------------------------
	function Variable(id, cost, index, priority) {
	    this.id = id;
	    this.cost = cost;
	    this.index = index;
	    this.value = 0;
	    this.priority = priority;
	}

	function IntegerVariable(id, cost, index, priority) {
	    Variable.call(this, id, cost, index, priority);
	}
	IntegerVariable.prototype.isInteger = true;

	function SlackVariable(id, index) {
	    Variable.call(this, id, 0, index, 0);
	}
	SlackVariable.prototype.isSlack = true;

	//-------------------------------------------------------------------
	//-------------------------------------------------------------------
	function Term(variable, coefficient) {
	    this.variable = variable;
	    this.coefficient = coefficient;
	}

	function createRelaxationVariable(model, weight, priority) {
	    weight = weight || 0;
	    priority = priority || 0;

	    if (model.isMinimization === false) {
	        weight = -weight;
	    }

	    return model.addVariable(weight, "r" + model.relaxationIndex++, false, false, priority);
	}

	//-------------------------------------------------------------------
	//-------------------------------------------------------------------
	function Constraint(rhs, isUpperBound, index, model) {
	    this.slack = new SlackVariable("s" + index, index);
	    this.index = index;
	    this.model = model;
	    this.rhs = rhs;
	    this.isUpperBound = isUpperBound;

	    this.terms = [];
	    this.termsByVarIndex = {};

	    // Error variable in case the constraint is relaxed
	    this.relaxation = null;
	}

	Constraint.prototype.addTerm = function (coefficient, variable) {
	    var varIndex = variable.index;
	    var term = this.termsByVarIndex[varIndex];
	    if (term === undefined) {
	        // No term for given variable
	        term = new Term(variable, coefficient);
	        this.termsByVarIndex[varIndex] = term;
	        this.terms.push(term);
	        if (this.isUpperBound === true) {
	            coefficient = -coefficient;
	        }
	        this.model.updateConstraintCoefficient(this, variable, coefficient);
	    } else {
	        // Term for given variable already exists
	        // updating its coefficient
	        var newCoefficient = term.coefficient + coefficient;
	        this.setVariableCoefficient(newCoefficient, variable);
	    }

	    return this;
	};

	Constraint.prototype.removeTerm = function (term) {
	    // TODO
	    return this;
	};

	Constraint.prototype.setRightHandSide = function (newRhs) {
	    if (newRhs !== this.rhs) {
	        var difference = newRhs - this.rhs;
	        if (this.isUpperBound === true) {
	            difference = -difference;
	        }

	        this.rhs = newRhs;
	        this.model.updateRightHandSide(this, difference);
	    }

	    return this;
	};

	Constraint.prototype.setVariableCoefficient = function (newCoefficient, variable) {
	    var varIndex = variable.index;
	    if (varIndex === -1) {
	        console.warn("[Constraint.setVariableCoefficient] Trying to change coefficient of inexistant variable.");
	        return;
	    }

	    var term = this.termsByVarIndex[varIndex];
	    if (term === undefined) {
	        // No term for given variable
	        this.addTerm(newCoefficient, variable);
	    } else {
	        // Term for given variable already exists
	        // updating its coefficient if changed
	        if (newCoefficient !== term.coefficient) {
	            var difference = newCoefficient - term.coefficient;
	            if (this.isUpperBound === true) {
	                difference = -difference;
	            }

	            term.coefficient = newCoefficient;
	            this.model.updateConstraintCoefficient(this, variable, difference);
	        }
	    }

	    return this;
	};

	Constraint.prototype.relax = function (weight, priority) {
	    this.relaxation = createRelaxationVariable(this.model, weight, priority);
	    this._relax(this.relaxation, priority);
	};

	Constraint.prototype._relax = function (error) {
	    if (this.isUpperBound) {
	        this.setVariableCoefficient(-1, error);
	    } else {
	        this.setVariableCoefficient(1, error);
	    }
	};

	//-------------------------------------------------------------------
	//-------------------------------------------------------------------
	function Equality(constraintUpper, constraintLower) {
	    this.upperBound = constraintUpper;
	    this.lowerBound = constraintLower;
	    this.model = constraintUpper.model;
	    this.rhs = constraintUpper.rhs;
	    this.relaxation = null;
	}

	Equality.prototype.isEquality = true;

	Equality.prototype.addTerm = function (coefficient, variable) {
	    this.upperBound.addTerm(coefficient, variable);
	    this.lowerBound.addTerm(coefficient, variable);
	    return this;
	};

	Equality.prototype.removeTerm = function (term) {
	    this.upperBound.removeTerm(term);
	    this.lowerBound.removeTerm(term);
	    return this;
	};

	Equality.prototype.setRightHandSide = function (rhs) {
	    this.upperBound.setRightHandSide(rhs);
	    this.lowerBound.setRightHandSide(rhs);
	    this.rhs = rhs;
	};

	Equality.prototype.relax = function (weight, priority) {
	    this.relaxation = createRelaxationVariable(this.model, weight, priority);
	    this.upperBound._relax(this.relaxation);
	    this.lowerBound._relax(this.relaxation);
	};

	module.exports = {
	    Constraint: Constraint,
	    Variable: Variable,
	    IntegerVariable: IntegerVariable,
	    SlackVariable: SlackVariable,
	    Equality: Equality,
	    Term: Term
	};

/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	/*global describe*/
	/*global require*/
	/*global module*/
	/*global it*/
	/*global console*/
	/*global process*/

	var Tableau = __webpack_require__(4);
	var MILP = __webpack_require__(8);
	var expressions = __webpack_require__(6);
	var Constraint = expressions.Constraint;
	var Equality = expressions.Equality;
	var Variable = expressions.Variable;
	var IntegerVariable = expressions.IntegerVariable;
	var Term = expressions.Term;

	/*************************************************************
	 * Class: Model
	 * Description: Holds the model of a linear optimisation problem
	 **************************************************************/
	function Model(precision, name) {
	    this.tableau = new Tableau(precision);

	    this.name = name;

	    this.variables = [];

	    this.integerVariables = [];

	    this.unrestrictedVariables = {};

	    this.constraints = [];

	    this.nConstraints = 0;

	    this.nVariables = 0;

	    this.isMinimization = true;

	    this.tableauInitialized = false;
	    this.relaxationIndex = 1;
	}
	module.exports = Model;

	Model.prototype.minimize = function () {
	    this.isMinimization = true;
	    return this;
	};

	Model.prototype.maximize = function () {
	    this.isMinimization = false;
	    return this;
	};

	// Model.prototype.addConstraint = function (constraint) {
	//     // TODO: make sure that the constraint does not belong do another model
	//     // and make
	//     this.constraints.push(constraint);
	//     return this;
	// };

	Model.prototype._getNewElementIndex = function () {
	    if (this.availableIndexes.length > 0) {
	        return this.availableIndexes.pop();
	    }

	    var index = this.lastElementIndex;
	    this.lastElementIndex += 1;
	    return index;
	};

	Model.prototype._addConstraint = function (constraint) {
	    var slackVariable = constraint.slack;
	    this.tableau.variablesPerIndex[slackVariable.index] = slackVariable;
	    this.constraints.push(constraint);
	    this.nConstraints += 1;
	    if (this.tableauInitialized === true) {
	        this.tableau.addConstraint(constraint);
	    }
	};

	Model.prototype.smallerThan = function (rhs) {
	    var constraint = new Constraint(rhs, true, this.tableau.getNewElementIndex(), this);
	    this._addConstraint(constraint);
	    return constraint;
	};

	Model.prototype.greaterThan = function (rhs) {
	    var constraint = new Constraint(rhs, false, this.tableau.getNewElementIndex(), this);
	    this._addConstraint(constraint);
	    return constraint;
	};

	Model.prototype.equal = function (rhs) {
	    var constraintUpper = new Constraint(rhs, true, this.tableau.getNewElementIndex(), this);
	    this._addConstraint(constraintUpper);

	    var constraintLower = new Constraint(rhs, false, this.tableau.getNewElementIndex(), this);
	    this._addConstraint(constraintLower);

	    return new Equality(constraintUpper, constraintLower);
	};

	Model.prototype.addVariable = function (cost, id, isInteger, isUnrestricted, priority) {
	    if (typeof priority === "string") {
	        switch (priority) {
	            case "required":
	                priority = 0;
	                break;
	            case "strong":
	                priority = 1;
	                break;
	            case "medium":
	                priority = 2;
	                break;
	            case "weak":
	                priority = 3;
	                break;
	            default:
	                priority = 0;
	                break;
	        }
	    }

	    var varIndex = this.tableau.getNewElementIndex();
	    if (id === null || id === undefined) {
	        id = "v" + varIndex;
	    }

	    if (cost === null || cost === undefined) {
	        cost = 0;
	    }

	    if (priority === null || priority === undefined) {
	        priority = 0;
	    }

	    var variable;
	    if (isInteger) {
	        variable = new IntegerVariable(id, cost, varIndex, priority);
	        this.integerVariables.push(variable);
	    } else {
	        variable = new Variable(id, cost, varIndex, priority);
	    }

	    this.variables.push(variable);
	    this.tableau.variablesPerIndex[varIndex] = variable;

	    if (isUnrestricted) {
	        this.unrestrictedVariables[varIndex] = true;
	    }

	    this.nVariables += 1;

	    if (this.tableauInitialized === true) {
	        this.tableau.addVariable(variable);
	    }

	    return variable;
	};

	Model.prototype._removeConstraint = function (constraint) {
	    var idx = this.constraints.indexOf(constraint);
	    if (idx === -1) {
	        console.warn("[Model.removeConstraint] Constraint not present in model");
	        return;
	    }

	    this._removeVariable(constraint.slack);

	    this.constraints.splice(idx, 1);
	    this.nConstraints -= 1;

	    if (this.tableauInitialized === true) {
	        this.tableau.removeConstraint(constraint);
	    }

	    if (constraint.relaxation) {
	        this.removeVariable(constraint.relaxation);
	    }
	};

	//-------------------------------------------------------------------
	// For dynamic model modification
	//-------------------------------------------------------------------
	Model.prototype.removeConstraint = function (constraint) {
	    if (constraint.isEquality) {
	        this._removeConstraint(constraint.upperBound);
	        this._removeConstraint(constraint.lowerBound);
	    } else {
	        this._removeConstraint(constraint);
	    }

	    return this;
	};

	Model.prototype._removeVariable = function (variable) {
	    // TODO ? remove variable term from every constraint?
	    this.availableIndexes.push(variable.index);
	    variable.index = -1;
	};

	Model.prototype.removeVariable = function (variable) {
	    var idx = this.variables.indexOf(variable);
	    if (idx === -1) {
	        console.warn("[Model.removeVariable] Variable not present in model");
	        return;
	    }
	    this.variables.splice(idx, 1);

	    this._removeVariable(variable);

	    if (this.tableauInitialized === true) {
	        this.tableau.removeVariable(variable);
	    }

	    return this;
	};

	Model.prototype.updateRightHandSide = function (constraint, difference) {
	    if (this.tableauInitialized === true) {
	        this.tableau.updateRightHandSide(constraint, difference);
	    }
	    return this;
	};

	Model.prototype.updateConstraintCoefficient = function (constraint, variable, difference) {
	    if (this.tableauInitialized === true) {
	        this.tableau.updateConstraintCoefficient(constraint, variable, difference);
	    }
	    return this;
	};

	Model.prototype.setCost = function (cost, variable) {
	    var difference = cost - variable.cost;
	    if (this.isMinimization === false) {
	        difference = -difference;
	    }

	    variable.cost = cost;
	    this.tableau.updateCost(variable, difference);
	    return this;
	};

	//-------------------------------------------------------------------
	//-------------------------------------------------------------------
	Model.prototype.loadJson = function (jsonModel) {
	    this.isMinimization = jsonModel.opType !== "max";

	    var variables = jsonModel.variables;
	    var constraints = jsonModel.constraints;

	    var constraintsMin = {};
	    var constraintsMax = {};

	    // Instantiating constraints
	    var constraintIds = Object.keys(constraints);
	    var nConstraintIds = constraintIds.length;

	    for (var c = 0; c < nConstraintIds; c += 1) {
	        var constraintId = constraintIds[c];
	        var constraint = constraints[constraintId];
	        var equal = constraint.equal;

	        var weight = constraint.weight;
	        var priority = constraint.priority;
	        var relaxed = weight !== undefined || priority !== undefined;

	        var lowerBound, upperBound;
	        if (equal === undefined) {
	            var min = constraint.min;
	            if (min !== undefined) {
	                lowerBound = this.greaterThan(min);
	                constraintsMin[constraintId] = lowerBound;
	                if (relaxed) {
	                    lowerBound.relax(weight, priority);
	                }
	            }

	            var max = constraint.max;
	            if (max !== undefined) {
	                upperBound = this.smallerThan(max);
	                constraintsMax[constraintId] = upperBound;
	                if (relaxed) {
	                    upperBound.relax(weight, priority);
	                }
	            }
	        } else {
	            lowerBound = this.greaterThan(equal);
	            constraintsMin[constraintId] = lowerBound;

	            upperBound = this.smallerThan(equal);
	            constraintsMax[constraintId] = upperBound;

	            var equality = new Equality(lowerBound, upperBound);
	            if (relaxed) {
	                equality.relax(weight, priority);
	            }
	        }
	    }

	    var variableIds = Object.keys(variables);
	    var nVariables = variableIds.length;

	    var integerVarIds = jsonModel.ints || {};
	    var unrestrictedVarIds = jsonModel.unrestricted || {};

	    // Instantiating variables and constraint terms
	    var objectiveName = jsonModel.optimize;
	    for (var v = 0; v < nVariables; v += 1) {
	        // Creation of the variables
	        var variableId = variableIds[v];
	        var variableConstraints = variables[variableId];
	        var cost = variableConstraints[objectiveName] || 0;
	        var isInteger = !!integerVarIds[variableId];
	        var isUnrestricted = !!unrestrictedVarIds[variableId];
	        var variable = this.addVariable(cost, variableId, isInteger, isUnrestricted);

	        var constraintNames = Object.keys(variableConstraints);
	        for (c = 0; c < constraintNames.length; c += 1) {
	            var constraintName = constraintNames[c];
	            if (constraintName === objectiveName) {
	                continue;
	            }

	            var coefficient = variableConstraints[constraintName];

	            var constraintMin = constraintsMin[constraintName];
	            if (constraintMin !== undefined) {
	                constraintMin.addTerm(coefficient, variable);
	            }

	            var constraintMax = constraintsMax[constraintName];
	            if (constraintMax !== undefined) {
	                constraintMax.addTerm(coefficient, variable);
	            }
	        }
	    }

	    return this;
	};

	//-------------------------------------------------------------------
	//-------------------------------------------------------------------
	Model.prototype.getNumberOfIntegerVariables = function () {
	    return this.integerVariables.length;
	};

	Model.prototype.solve = function () {
	    // Setting tableau if not done
	    if (this.tableauInitialized === false) {
	        this.tableau.setModel(this);
	        this.tableauInitialized = true;
	    }

	    if (this.getNumberOfIntegerVariables() > 0) {
	        return MILP(this);
	    } else {
	        var solution = this.tableau.solve().getSolution();
	        this.tableau.updateVariableValues();
	        return solution;
	    }
	};

	Model.prototype.compileSolution = function () {
	    return this.tableau.compileSolution();
	};

	Model.prototype.isFeasible = function () {
	    return this.tableau.feasible;
	};

	Model.prototype.save = function () {
	    return this.tableau.save();
	};

	Model.prototype.restore = function () {
	    return this.tableau.restore();
	};

	Model.prototype.log = function (message) {
	    return this.tableau.log(message);
	};

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	/*global describe*/
	/*global require*/
	/*global module*/
	/*global it*/
	/*global console*/
	/*global process*/
	var Solution = __webpack_require__(5);

	//-------------------------------------------------------------------
	//-------------------------------------------------------------------
	function Cut(type, varIndex, value) {
	    this.type = type;
	    this.varIndex = varIndex;
	    this.value = value;
	}

	//-------------------------------------------------------------------
	//-------------------------------------------------------------------
	function Branch(relaxedEvaluation, cuts) {
	    this.relaxedEvaluation = relaxedEvaluation;
	    this.cuts = cuts;
	}

	//-------------------------------------------------------------------
	//-------------------------------------------------------------------
	function MilpSolution(relaxedSolution, iterations) {
	    Solution.call(this, relaxedSolution._tableau, relaxedSolution.evaluation, relaxedSolution.feasible);
	    this.iter = iterations;
	}

	MilpSolution.prototype = Object.create(Solution.prototype);
	MilpSolution.prototype.constructor = MilpSolution;

	//-------------------------------------------------------------------
	// Branch sorting strategies
	//-------------------------------------------------------------------
	function sortByEvaluation(a, b) {
	    return b.relaxedEvaluation - a.relaxedEvaluation;
	}

	//-------------------------------------------------------------------
	// Applying cuts on a tableau and resolving
	//-------------------------------------------------------------------
	function applyCuts(tableau, cuts) {
	    // Restoring initial solution
	    tableau.restore();

	    tableau.addCutConstraints(cuts);
	    tableau.solve();

	    // Adding MIR cuts
	    var fractionalVolumeImproved = true;
	    while (fractionalVolumeImproved) {
	        var fractionalVolumeBefore = tableau.computeFractionalVolume(true);

	        tableau.applyMIRCuts();
	        tableau.solve();

	        var fractionalVolumeAfter = tableau.computeFractionalVolume(true);

	        // If the new fractional volume is bigger than 90% of the previous one
	        // we assume there is no improvement from the MIR cuts
	        if (fractionalVolumeAfter >= 0.9 * fractionalVolumeBefore) {
	            fractionalVolumeImproved = false;
	        }
	    }
	}

	//-------------------------------------------------------------------
	// Function: MILP
	// Detail: Main function, my attempt at a mixed integer linear programming
	//         solver
	//-------------------------------------------------------------------
	function MILP(model) {
	    var branches = [];
	    var iterations = 0;
	    var tableau = model.tableau;

	    // This is the default result
	    // If nothing is both *integral* and *feasible*
	    var bestEvaluation = Infinity;
	    var bestBranch = null;

	    // And here...we...go!

	    // 1.) Load a model into the queue
	    var branch = new Branch(-Infinity, []);
	    branches.push(branch);

	    // If all branches have been exhausted terminate the loop
	    while (branches.length > 0) {
	        // Get a model from the queue
	        branch = branches.pop();
	        if (branch.relaxedEvaluation >= bestEvaluation) {
	            continue;
	        }

	        // Solving from initial relaxed solution
	        // with additional cut constraints

	        // Adding cut constraints
	        var cuts = branch.cuts;

	        applyCuts(tableau, cuts);

	        iterations++;
	        if (tableau.feasible === false) {
	            continue;
	        }

	        var evaluation = tableau.evaluation;
	        if (evaluation >= bestEvaluation) {
	            // This branch does not contain the optimal solution
	            continue;
	        }

	        // Is the model both integral and feasible?
	        if (tableau.isIntegral() === true) {
	            if (iterations === 1) {
	                tableau.updateVariableValues();
	                return new MilpSolution(tableau.getSolution(), iterations);
	            }

	            // Store the solution as the bestSolution
	            bestBranch = branch;
	            bestEvaluation = evaluation;
	        } else {
	            if (iterations === 1) {
	                // Saving the first iteration
	                // TODO: implement a better strategy for saving the tableau?
	                tableau.save();
	            }

	            // If the solution is
	            //  a. Feasible
	            //  b. Better than the current solution
	            //  c. but *NOT* integral

	            // So the solution isn't integral? How do we solve this.
	            // We create 2 new models, that are mirror images of the prior
	            // model, with 1 exception.

	            // Say we're trying to solve some stupid problem requiring you get
	            // animals for your daughter's kindergarten petting zoo party
	            // and you have to choose how many ducks, goats, and lambs to get.

	            // Say that the optimal solution to this problem if we didn't have
	            // to make it integral was {duck: 8, lambs: 3.5}
	            //
	            // To keep from traumatizing your daughter and the other children
	            // you're going to want to have whole animals

	            // What we would do is find the most fractional variable (lambs)
	            // and create new models from the old models, but with a new constraint
	            // on apples. The constraints on the low model would look like:
	            // constraints: {...
	            //   lamb: {max: 3}
	            //   ...
	            // }
	            //
	            // while the constraints on the high model would look like:
	            //
	            // constraints: {...
	            //   lamb: {min: 4}
	            //   ...
	            // }
	            // If neither of these models is feasible because of this constraint,
	            // the model is not integral at this point, and fails.

	            // Find out where we want to split the solution
	            var variable = tableau.getMostFractionalVar();
	            // var variable = tableau.getFractionalVarWithLowestCost();
	            var varIndex = variable.index;

	            var cutsHigh = [];
	            var cutsLow = [];

	            var nCuts = cuts.length;
	            for (var c = 0; c < nCuts; c += 1) {
	                var cut = cuts[c];
	                if (cut.varIndex === varIndex) {
	                    if (cut.type === "min") {
	                        cutsLow.push(cut);
	                    } else {
	                        cutsHigh.push(cut);
	                    }
	                } else {
	                    cutsHigh.push(cut);
	                    cutsLow.push(cut);
	                }
	            }

	            var min = Math.ceil(variable.value);
	            var max = Math.floor(variable.value);

	            var cutHigh = new Cut("min", varIndex, min);
	            cutsHigh.push(cutHigh);

	            var cutLow = new Cut("max", varIndex, max);
	            cutsLow.push(cutLow);

	            branches.push(new Branch(evaluation, cutsHigh));
	            branches.push(new Branch(evaluation, cutsLow));

	            // Sorting branches
	            // Branches with the most promising lower bounds
	            // will be picked first
	            branches.sort(sortByEvaluation);
	        }
	    }

	    // Adding cut constraints for the optimal solution
	    if (bestBranch !== null) {
	        // The model is feasible
	        applyCuts(tableau, bestBranch.cuts);
	        tableau.updateVariableValues();
	    }

	    // Solving a last time
	    return new MilpSolution(tableau.getSolution(), iterations);
	}

	module.exports = MILP;

/***/ },
/* 9 */
/***/ function(module, exports) {

	"use strict";

	/*global describe*/
	/*global require*/
	/*global module*/
	/*global it*/
	/*global console*/
	/*global process*/
	/*global exports*/

	// All functions in this module that
	// get exported to main ***MUST***
	// return a functional LPSolve JSON style
	// model or throw an error

	exports.CleanObjectiveAttributes = function (model) {
	    // Test to see if the objective attribute
	    // is also used by one of the constraints
	    //
	    // If so...create a new attribute on each
	    // variable
	    var fakeAttr, x, z;

	    if (typeof model.optimize === "string") {
	        if (model.constraints[model.optimize]) {
	            // Create the new attribute
	            fakeAttr = Math.random();

	            // Go over each variable and check
	            for (x in model.variables) {
	                // Is it there?
	                if (model.variables[x][model.optimize]) {
	                    model.variables[x][fakeAttr] = model.variables[x][model.optimize];
	                }
	            }

	            // Now that we've cleaned up the variables
	            // we need to clean up the constraints
	            model.constraints[fakeAttr] = model.constraints[model.optimize];
	            delete model.constraints[model.optimize];
	            return model;
	        } else {
	            return model;
	        }
	    } else {
	        // We're assuming its an object?
	        for (z in model.optimize) {
	            if (model.constraints[z]) {
	                // Make sure that the constraint
	                // being optimized isn't constrained
	                // by an equity collar
	                if (model.constraints[z] === "equal") {
	                    // Its constrained by an equal sign;
	                    // delete that objective and move on
	                    delete model.optimize[z];
	                } else {
	                    // Create the new attribute
	                    fakeAttr = Math.random();

	                    // Go over each variable and check
	                    for (x in model.variables) {
	                        // Is it there?
	                        if (model.variables[x][z]) {
	                            model.variables[x][fakeAttr] = model.variables[x][z];
	                        }
	                    }
	                    // Now that we've cleaned up the variables
	                    // we need to clean up the constraints
	                    model.constraints[fakeAttr] = model.constraints[z];
	                    delete model.constraints[z];
	                }
	            }
	        }
	        return model;
	    }
	};

/***/ },
/* 10 */
/***/ function(module, exports) {

	"use strict";

	/*global describe*/
	/*global require*/
	/*global module*/
	/*global it*/
	/*global console*/
	/*global process*/
	/*jshint -W083 */

	/*************************************************************
	* Method: to_JSON
	* Scope: Public:
	* Agruments: input: Whatever the user gives us
	* Purpose: Convert an unfriendly formatted LP
	*          into something that our library can
	*          work with
	**************************************************************/
	function to_JSON(input) {
	    var rxo = {
	        /* jshint ignore:start */
	        "is_blank": /^\W{0,}$/,
	        "is_objective": /(max|min)(imize){0,}\:/i,
	        "is_int": /^\W{0,}int/i,
	        "is_constraint": /(\>|\<){0,}\=/i,
	        "is_unrestricted": /^\S{0,}unrestricted/i,
	        "parse_lhs": /(\-|\+){0,1}\s{0,1}\d{0,}\.{0,}\d{0,}\s{0,}[A-Za-z]\S{0,}/gi,
	        "parse_rhs": /(\-|\+){0,1}\d{1,}\.{0,}\d{0,}\W{0,}\;{0,1}$/i,
	        "parse_dir": /(\>|\<){0,}\=/gi,
	        "parse_int": /[^\s|^\,]+/gi,
	        "get_num": /(\-|\+){0,1}(\W|^)\d+\.{0,}\d{0,}/g,
	        "get_word": /[A-Za-z].*/
	        /* jshint ignore:end */
	    },
	        model = {
	        "opType": "",
	        "optimize": "_obj",
	        "constraints": {},
	        "variables": {}
	    },
	        constraints = {
	        ">=": "min",
	        "<=": "max",
	        "=": "equal"
	    },
	        tmp = "",
	        tst = 0,
	        ary = null,
	        hldr = "",
	        hldr2 = "",
	        constraint = "",
	        rhs = 0;

	    // Handle input if its coming
	    // to us as a hard string
	    // instead of as an array of
	    // strings
	    if (typeof input === "string") {
	        input = input.split("\n");
	    }

	    // Start iterating over the rows
	    // to see what all we have
	    for (var i = 0; i < input.length; i++) {

	        constraint = "__" + i;

	        // Get the string we're working with
	        tmp = input[i];

	        // Set the test = 0
	        tst = 0;

	        // Reset the array
	        ary = null;

	        // Test to see if we're the objective
	        if (rxo.is_objective.test(tmp)) {

	            // Set up in model the opType
	            model.opType = tmp.match(/(max|min)/gi)[0];

	            // Pull apart lhs
	            ary = tmp.match(rxo.parse_lhs).map(function (d) {
	                return d.replace(/\s+/, "");
	            }).slice(1);

	            // *** STEP 1 *** ///
	            // Get the variables out
	            ary.forEach(function (d) {

	                // Get the number if its there
	                hldr = d.match(rxo.get_num);

	                // If it isn't a number, it might
	                // be a standalone variable
	                if (hldr === null) {
	                    if (d.substr(0, 1) === "-") {
	                        hldr = -1;
	                    } else {
	                        hldr = 1;
	                    }
	                } else {
	                    hldr = hldr[0];
	                }

	                hldr = parseFloat(hldr);

	                // Get the variable type
	                hldr2 = d.match(rxo.get_word)[0].replace(/\;$/, "");

	                // Make sure the variable is in the model
	                model.variables[hldr2] = model.variables[hldr2] || {};
	                model.variables[hldr2]._obj = hldr;
	            });
	            ////////////////////////////////////
	        } else if (rxo.is_int.test(tmp)) {
	                // Get the array of ints
	                ary = tmp.match(rxo.parse_int).slice(1);

	                // Since we have an int, our model should too
	                model.ints = model.ints || {};

	                ary.forEach(function (d) {
	                    d = d.replace(";", "");
	                    model.ints[d] = 1;
	                });
	                ////////////////////////////////////
	            } else if (rxo.is_constraint.test(tmp)) {
	                    // Pull apart lhs
	                    ary = tmp.match(rxo.parse_lhs).map(function (d) {
	                        return d.replace(/\s+/, "");
	                    });

	                    // *** STEP 1 *** ///
	                    // Get the variables out
	                    ary.forEach(function (d) {
	                        // Get the number if its there
	                        hldr = d.match(rxo.get_num);

	                        if (hldr === null) {
	                            if (d.substr(0, 1) === "-") {
	                                hldr = -1;
	                            } else {
	                                hldr = 1;
	                            }
	                        } else {
	                            hldr = hldr[0];
	                        }

	                        hldr = parseFloat(hldr);

	                        // Get the variable type
	                        hldr2 = d.match(rxo.get_word)[0];

	                        // Make sure the variable is in the model
	                        model.variables[hldr2] = model.variables[hldr2] || {};
	                        model.variables[hldr2][constraint] = hldr;
	                    });

	                    // *** STEP 2 *** ///
	                    // Get the RHS out           
	                    rhs = parseFloat(tmp.match(rxo.parse_rhs)[0]);

	                    // *** STEP 3 *** ///
	                    // Get the Constrainer out  
	                    tmp = constraints[tmp.match(rxo.parse_dir)[0]];
	                    model.constraints[constraint] = model.constraints[constraint] || {};
	                    model.constraints[constraint][tmp] = rhs;
	                    ////////////////////////////////////
	                } else if (rxo.is_unrestricted.test(tmp)) {
	                        // Get the array of unrestricted
	                        ary = tmp.match(rxo.parse_int).slice(1);

	                        // Since we have an int, our model should too
	                        model.unrestricted = model.unrestricted || {};

	                        ary.forEach(function (d) {
	                            d = d.replace(";", "");
	                            model.unrestricted[d] = 1;
	                        });
	                    }
	    }
	    return model;
	}

	/*************************************************************
	* Method: from_JSON
	* Scope: Public:
	* Agruments: model: The model we want solver to operate on
	* Purpose: Convert a friendly JSON model into a model for a
	*          real solving library...in this case
	*          lp_solver
	**************************************************************/
	function from_JSON(model) {
	    // Make sure we at least have a model
	    if (!model) {
	        throw new Error("Solver requires a model to operate on");
	    }

	    var output = "",
	        ary = [],
	        norm = 1,
	        lookup = {
	        "max": "<=",
	        "min": ">=",
	        "equal": "="
	    },
	        rxClean = new RegExp("[^A-Za-z0-9]+", "gi");

	    // Build the objective statement
	    output += model.opType + ":";

	    // Iterate over the variables
	    for (var x in model.variables) {
	        // Give each variable a self of 1 unless
	        // it exists already
	        model.variables[x][x] = model.variables[x][x] ? model.variables[x][x] : 1;

	        // Does our objective exist here?
	        if (model.variables[x][model.optimize]) {
	            output += " " + model.variables[x][model.optimize] + " " + x.replace(rxClean, "_");
	        }
	    }

	    // Add some closure to our line thing
	    output += ";\n";

	    // And now... to iterate over the constraints
	    for (x in model.constraints) {
	        for (var y in model.constraints[x]) {
	            for (var z in model.variables) {
	                // Does our Constraint exist here?
	                if (model.variables[z][x]) {
	                    output += " " + model.variables[z][x] + " " + z.replace(rxClean, "_");
	                }
	            }
	            // Add the constraint type and value...
	            output += " " + lookup[y] + " " + model.constraints[x][y];
	            output += ";\n";
	        }
	    }

	    // Are there any ints?
	    if (model.ints) {
	        output += "\n\n";
	        for (x in model.ints) {
	            output += "int " + x.replace(rxClean, "_") + ";\n";
	        }
	    }

	    // Are there any unrestricted?
	    if (model.unrestricted) {
	        output += "\n\n";
	        for (x in model.unrestricted) {
	            output += "unrestricted " + x.replace(rxClean, "_") + ";\n";
	        }
	    }

	    // And kick the string back
	    return output;
	}

	module.exports = function (model) {
	    // If the user is giving us an array
	    // or a string, convert it to a JSON Model
	    // otherwise, spit it out as a string
	    if (model.length) {
	        return to_JSON(model);
	    } else {
	        return from_JSON(model);
	    }
	};

/***/ },
/* 11 */
/***/ function(module, exports) {

	"use strict";

	/*global describe*/
	/*global require*/
	/*global module*/
	/*global it*/
	/*global console*/
	/*global process*/

	/***************************************************************
	 * Method: polyopt
	 * Scope: private
	 * Agruments:
	 *        model: The model we want solver to operate on.
	                 Because we're in here, we're assuming that
	                 we're solving a multi-objective optimization
	                 problem. Poly-Optimization. polyopt.
	                  This model has to be formed a little differently
	                 because it has multiple objective functions.
	                 Normally, a model has 2 attributes: opType (string,
	                 "max" or "min"), and optimize (string, whatever
	                 attribute we're optimizing.
	                  Now, there is no opType attribute on the model,
	                 and optimize is an object of attributes to be
	                 optimized, and how they're to be optimized.
	                 For example:
	                  ...
	                 "optimize": {
	                    "pancakes": "max",
	                    "cost": "minimize"
	                 }
	                 ...
	   **************************************************************/

	module.exports = function (solver, model) {

	    // I have no idea if this is actually works, or what,
	    // but here is my algorithm to solve linear programs
	    // with multiple objective functions

	    // 1. Optimize for each constraint
	    // 2. The results for each solution is a vector
	    //    representing a vertex on the polytope we're creating
	    // 3. The results for all solutions describes the shape
	    //    of the polytope (would be nice to have the equation
	    //    representing this)
	    // 4. Find the mid-point between all vertices by doing the
	    //    following (a_1 + a_2 ... a_n) / n;
	    var objectives = model.optimize,
	        new_constraints = JSON.parse(JSON.stringify(model.optimize)),
	        keys = Object.keys(model.optimize),
	        tmp,
	        counter = 0,
	        vectors = {},
	        vector_key = "",
	        obj = {},
	        pareto = [],
	        i,
	        j,
	        x,
	        y,
	        z;

	    // Delete the optimize object from the model
	    delete model.optimize;

	    // Iterate and Clear
	    for (i = 0; i < keys.length; i++) {
	        // Clean up the new_constraints
	        new_constraints[keys[i]] = 0;
	    }

	    // Solve and add
	    for (i = 0; i < keys.length; i++) {

	        // Prep the model
	        model.optimize = keys[i];
	        model.opType = objectives[keys[i]];

	        // solve the model
	        tmp = solver.Solve(model, undefined, undefined, true);

	        // Only the variables make it into the solution;
	        // not the attributes.
	        //
	        // Because of this, we have to add the attributes
	        // back onto the solution so we can do math with
	        // them later...

	        // Loop over the keys
	        for (y in keys) {
	            // We're only worried about attributes, not variables
	            if (!model.variables[keys[y]]) {
	                // Create space for the attribute in the tmp object
	                tmp[keys[y]] = tmp[keys[y]] ? tmp[keys[y]] : 0;
	                // Go over each of the variables
	                for (x in model.variables) {
	                    // Does the variable exist in tmp *and* does attribute exist in this model?
	                    if (model.variables[x][keys[y]] && tmp[x]) {
	                        // Add it to tmp
	                        tmp[keys[y]] += tmp[x] * model.variables[x][keys[y]];
	                    }
	                }
	            }
	        }

	        // clear our key
	        vector_key = "base";
	        // this makes sure that if we get
	        // the same vector more than once,
	        // we only count it once when finding
	        // the midpoint
	        for (j = 0; j < keys.length; j++) {
	            if (tmp[keys[j]]) {
	                vector_key += "-" + (tmp[keys[j]] * 1000 | 0) / 1000;
	            } else {
	                vector_key += "-0";
	            }
	        }

	        // Check here to ensure it doesn't exist
	        if (!vectors[vector_key]) {
	            // Add the vector-key in
	            vectors[vector_key] = 1;
	            counter++;

	            // Iterate over the keys
	            // and update our new constraints
	            for (j = 0; j < keys.length; j++) {
	                if (tmp[keys[j]]) {
	                    new_constraints[keys[j]] += tmp[keys[j]];
	                }
	            }

	            // Push the solution into the paretos
	            // array after cleaning it of some
	            // excess data markers

	            delete tmp.feasible;
	            delete tmp.result;
	            pareto.push(tmp);
	        }
	    }

	    // Trying to find the mid-point
	    // divide each constraint by the
	    // number of constraints
	    // *midpoint formula*
	    // (x1 + x2 + x3) / 3
	    for (i = 0; i < keys.length; i++) {
	        model.constraints[keys[i]] = { "equal": new_constraints[keys[i]] / counter };
	    }

	    // Give the model a fake thing to optimize on
	    model.optimize = "cheater-" + Math.random();
	    model.opType = "max";

	    // And add the fake attribute to the variables
	    // in the model
	    for (i in model.variables) {
	        model.variables[i].cheater = 1;
	    }

	    // Build out the object with all attributes
	    for (i in pareto) {
	        for (x in pareto[i]) {
	            obj[x] = obj[x] || { min: 1e99, max: -1e99 };
	        }
	    }

	    // Give each pareto a full attribute list
	    // while getting the max and min values
	    // for each attribute
	    for (i in obj) {
	        for (x in pareto) {
	            if (pareto[x][i]) {
	                if (pareto[x][i] > obj[i].max) {
	                    obj[i].max = pareto[x][i];
	                }
	                if (pareto[x][i] < obj[i].min) {
	                    obj[i].min = pareto[x][i];
	                }
	            } else {
	                pareto[x][i] = 0;
	                obj[i].min = 0;
	            }
	        }
	    }
	    // Solve the model for the midpoints
	    tmp = solver.Solve(model, undefined, undefined, true);

	    return {
	        midpoint: tmp,
	        vertices: pareto,
	        ranges: obj
	    };
	};

/***/ },
/* 12 */
/***/ function(module, exports) {

	"use strict";

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	module.exports = {
	  /**
	   * In: rects the list of rectangles, result the result of the linear program,
	   * canvas the HTML canvas and config a list of options, draws the packing
	   * specified by result onto the canvas.
	   */
	  drawPacking: function drawPacking(rects, result, canvas, stage, options) {
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
	  tintGradient: function tintGradient(hex, tintFactor, iterations) {
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
	    context.fillRect(coords[j].x1 * width, coords[j].y1 * height, w * width, h * height);
	    context.strokeRect(coords[j].x1 * width, coords[j].y1 * height, w * width, h * height);
	    configurationHeight = Math.max(configurationHeight, coords[j].y2 - currentHeight);
	  }
	  //console.log(i + ": " + configurationHeight);
	  context.lineWidth = options.configLineWidth;
	  context.strokeStyle = options.configBorder;
	  context.strokeRect(0, currentHeight * height, width, configurationHeight * height);
	  return configurationHeight;
	}

	/**
	 * Represents a stack of rectangles of the same type one on top of another.
	 */

	var Stack = function () {
	  function Stack(rect, count) {
	    _classCallCheck(this, Stack);

	    this._rect = rect;
	    this._count = count;
	  }

	  _createClass(Stack, [{
	    key: "addHeight",
	    value: function addHeight(amount) {
	      this._count += amount;
	    }

	    /**
	     * Rounds this stack up.
	     */

	  }, {
	    key: "roundUp",
	    value: function roundUp() {
	      this._count = Math.ceil(this._count);
	    }

	    /**
	     * Rounds this stack down and returns the fractional part that is rounded
	     * away.
	     */

	  }, {
	    key: "roundDown",
	    value: function roundDown() {
	      var f = this.fraction;
	      this._count = Math.floor(this._count);
	      return f;
	    }
	  }, {
	    key: "rect",
	    get: function get() {
	      return this._rect;
	    }

	    /**
	     * Gets the (potentially fractional) number of rectangles in this stack.
	     */

	  }, {
	    key: "count",
	    get: function get() {
	      return this._count;
	    }

	    /**
	     * Gets the fractional part of the rectangle residing at the top (if any).
	     */

	  }, {
	    key: "fraction",
	    get: function get() {
	      return fractionalPart(this._count);
	    }

	    /**
	     * Gets the number of whole rectangles.
	     */

	  }, {
	    key: "wholeRectangles",
	    get: function get() {
	      return Math.floor(this._count);
	    }
	  }]);

	  return Stack;
	}();

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
	  var fractions = Array.apply(null, Array(T.length)).map(Number.prototype.valueOf, 0);
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
	  var fractions = Array.apply(null, Array(T.length)).map(Number.prototype.valueOf, 0);
	  for (var i = 0; i < S.length; i++) {
	    fractions[S[i].rect.id] += S[i].fraction;
	  }
	  // Round all the fractional parts down and store them.
	  var removedFractions = Array.apply(null, Array(T.length)).map(Number.prototype.valueOf, 0);
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
	  var count = Array.apply(null, Array(T.length)).map(Number.prototype.valueOf, 0);
	  var S1 = [];
	  var S2 = [];
	  for (var i = 0; i < stack.length; i++) {
	    var id = stack[i].rect.id;
	    if (count[id] < common[id]) {
	      S1.push(stack[i]);
	      count[id]++;
	    } else {
	      S2.push(stack[i]);
	    }
	  }
	  return { S1: S1, S2: S2 };
	}

	function triangleMethod(T, stack1, stack2) {
	  // Step 1: combine the common rectangles
	  // frequency count of types of rectangles in stacks
	  var count1 = Array.apply(null, Array(T.length)).map(Number.prototype.valueOf, 0);
	  var count2 = Array.apply(null, Array(T.length)).map(Number.prototype.valueOf, 0);
	  for (var i = 0; i < stack1.length; i++) {
	    count1[stack1[i].rect.id]++;
	  }
	  for (var i = 0; i < stack2.length; i++) {
	    count2[stack2[i].rect.id]++;
	  }
	  // Get the number of rectangles which are common between them.
	  var common = Array.apply(null, Array(T.length)).map(Number.prototype.valueOf, 0);
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
	  var emptyStackFilter = function emptyStackFilter(x) {
	    return x.count > 0;
	  };
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
	function stackCoordinates(stack, offset) {
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
	  };
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

/***/ }
/******/ ]);