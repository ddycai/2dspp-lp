var packer = require("./packer");
var painter = require("./painter");

var config = {
  rectBorder: '#ffffff',
  rectMaxHeight: 600,
  configBorder: '#FFBC42',
  configLineWidth: 2
};

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

function drawPackingFromString(s) {
  try {
    var rects = parseRectangles(s);
  } catch (e) {
    alert(e);
    return;
  }
  console.log(rects);
  var result = packer.fractionalPacking(rects);
  console.log("Total height: " + result.totalHeight);
  console.log(result.packing);
  var canvas = document.getElementById("packing");
  painter.drawPacking(rects, result, canvas, config);
}

var defSolution = ".5 .5 2\n.333 .333 3\n.25 .25 2";

$(function() {
  $('#input').val(defSolution);
  drawPackingFromString(defSolution);
  $('#solve-button').click(function (){
    var s = $('#input').val();
    console.log(s);
    drawPackingFromString(s);
  });

  var slider = $("#slider").slideReveal({
    trigger: $("#trigger"),
    push: false,
    show: function() {
      $('#trigger span')
        .removeClass('glyphicon-chevron-right')
        .addClass('glyphicon-chevron-left');
      $('#slider').addClass('right-shadow-overlay');
    },
    hide: function() {
      $('#trigger span')
        .removeClass('glyphicon-chevron-left')
        .addClass('glyphicon-chevron-right');
      $('#slider').removeClass('right-shadow-overlay');
    },
    width: 250
  });
});

