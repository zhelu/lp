(function() {
  var width = 800;
  var height = 600;
  var svg = d3.select("body").append("svg").attr("width", width).attr("height", height);
  var scale = 1;
  var keyAlreadyDown = false;
  var deleteLine = false;
  var _clickX, _clickY;
  var dataset = [];
  var objective = [{base : {x : width / 2, y : height / 2}, vector : {x : 0, y : height / 10}}];
  var algorithmRunning = false;
  var algorithmFinished = false;
  var algorithmStep = 0;
  var upperPairs = [];
  var lowerPairs = [];
  var epsilon = 0.000001;
  var towardPerp = true;
  var randomScale = 1;

  // test if float is zero
  function isZero (f) {
    return Math.abs(f) < epsilon;
  }

  function clearTrace() {
    d3.select("#trace1").remove();
    d3.select("body").append("div").attr("id", "trace1").classed("trace", true).append("b").text("Current step:").append("br");
    d3.select("#trace").remove();
    d3.select("body").append("div").attr("id", "trace").classed("trace", true).append("b").text("Algorithm trace:").append("br");
  }

  function getObj() {
    return objective[0].vector;
  }

  function getPerp() {
    return {x : objective[0].vector.y, y : -objective[0].vector.x};
  }

  // Start over. Reset all data structures.
  function reset() {
    dataset = [];
    objective = [{base : {x : width / 2, y : height / 2}, vector : {x : 0, y : height / 10}}];
    algorithmRunning = false;
    algorithmFinished = false;
    algorithmStep = 0;
    upperPairs = [];
    lowerPairs = [];
    d3.select("#buttonGo").attr("value", "Go");
    d3.selectAll("circle.pair").remove();
    d3.selectAll("circle.solution").remove();
    d3.select("line.median").remove();
    scale = 1;
    clearTrace();
    update();
  }

  function norm(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y);
  }

  // Compute inner product of two vectors.
  function innerProduct(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y;
  }

  // Computer normalized inner product of two vectors.
  function innerProductNorm(v1, v2) {
    return (v1.x * v2.x + v1.y * v2.y) / (norm(v1) * norm(v2));
  }

  // Compute signed-magnitude of cross product of two vectors.
  function crossProduct(v1, v2) {
    return v1.x * v2.y - v2.x * v1.y;
  }

  // Compute normalized signed-magnitude of cross product of two vectors.
  function crossProductNorm(v1, v2) {
    return (v1.x * v2.y - v2.x * v1.y) / (norm(v1) * norm(v2));
  }

  // coordinate transformation functions
  function transformXWithScale(x) {
    return (x - (width / 2)) * scale + width / 2;
  }

  function untransformXWithScale(x) {
    return (x - (width / 2)) / scale + width / 2;
  }

  function transformYWithScale(y) {
    return (y - (height / 2)) * scale + height / 2;
  }

  function untransformYWithScale(y) {
    return (y - (height / 2)) / scale + height / 2;
  }

  // Line endpoint getters
  function getX1(d) {
    var x = transformXWithScale(d.base.x);
    var y = transformYWithScale(d.base.y);
    if (isZero(d.vector.y)) {
      return x;
    }

    if (isZero(d.vector.x)) {
      return -10;
    }

    if (d.vector.y > 5 * Math.abs(d.vector.x)) {
      return (x * d.vector.x + y * d.vector.y + 10 * d.vector.y) / d.vector.x;
    } else {
      return -10;
    }
  }

  function getX2(d) {
    var x = transformXWithScale(d.base.x);
    var y = transformYWithScale(d.base.y);
    if (isZero(d.vector.y)) {
      return x;
    }

    if (isZero(d.vector.x)) {
      return width + 10;
    }

    if (d.vector.y > 5 * Math.abs(d.vector.x)) {
      return (x * d.vector.x + y * d.vector.y - (width + 10) * d.vector.y) / d.vector.x;
    } else {
      return width + 10;
    }
  }

  function getY1(d) {
    var x = transformXWithScale(d.base.x);
    var y = transformYWithScale(d.base.y);
    if (isZero(d.vector.y)) {
      return -10;
    }

    if (isZero(d.vector.x)) {
      return y;
    }

    return (x * d.vector.x + y * d.vector.y - getX1(d) * d.vector.x) / d.vector.y;
  }

  function getY2(d) {
    var x = transformXWithScale(d.base.x);
    var y = transformYWithScale(d.base.y);
    if (isZero(d.vector.y)) {
      return height + 10;
    }

    if (isZero(d.vector.x)) {
      return y;
    }

    return (x * d.vector.x + y * d.vector.y - getX2(d) * d.vector.x) / d.vector.y;
  }

  // on shift, prepare to delete on click
  function keydown() {
    if (d3.event.keyCode == 90) {
      if (d3.event.shiftKey) {
        scale = scale * 2;
        if (scale > 1) scale = 1;
      } else {
        scale = scale / 2;
        if (scale < 0.0625) scale = 0.0625;
      }
      update();
    }
    if (keyAlreadyDown) {
      return false;
    }
    keyAlreadyDown = true;
    if (d3.event.keyCode == 16) {
      // shift
      d3.event.preventDefault();
      deleteLine = true;
    } 
    return svg;
  }

  function keyup() {
    keyAlreadyDown = false;
    deleteLine = false;
    return svg;
  }

  // on mouse down add new point
  function mousedown() {
    if (algorithmRunning) {
      return;
    }
    d3.event.preventDefault();
    _clickX = untransformXWithScale(d3.mouse(this)[0]);
    _clickY = untransformYWithScale(d3.mouse(this)[1]);
    return svg;
  }

  // defined transparent arrows for pointers
  svg.append("defs")
     .append("marker").attr("id", "Triangle").attr("viewBox", "0 0 10 10").attr("refX", "0").attr("refY", "5")
                      .attr("markerUnits", "strokeWidth").attr("markerWidth", "10").attr("markerHeight", "10")
                      .attr("orient", "auto").append("path").attr("d", "M 0 0 L 10 5 L 0 10 z")
                      .attr("fill", "rgba(128,128,128,0.4)");
  svg.select("defs")
     .append("marker").attr("id", "Triangle2").attr("viewBox", "0 0 10 10").attr("refX", "0").attr("refY", "5")
                      .attr("markerUnits", "strokeWidth").attr("markerWidth", "5").attr("markerHeight", "5")
                      .attr("orient", "auto").append("path").attr("d", "M 0 0 L 10 5 L 0 10 z")
                      .attr("fill", "rgba(135,206,235,0.6)");

  // handlers for dragging
  function dragmovebase(d) {
    if (algorithmRunning) {
      return;
    }
    d3.event.sourceEvent.stopPropagation
    var p = d3.select(this).datum();
    p.base.x = untransformXWithScale(d3.event.x);
    p.base.y = untransformYWithScale(d3.event.y);
    update();
  }

  function dragmovetip(d) {
    if (algorithmRunning) {
      return;
    }
    d3.event.sourceEvent.stopPropagation
    var p = d3.select(this).datum();
    p.vector.x = (untransformXWithScale(d3.event.x) - p.base.x) * scale + Math.random() * randomScale;
    p.vector.y = (untransformYWithScale(d3.event.y) - p.base.y) * scale + Math.random() * randomScale;
    update();
  }

  function dragstarted(d) {
    if (algorithmRunning) {
      return;
    }
    d3.event.sourceEvent.stopPropagation;
    if (deleteLine) {
      var p = d3.select(this).datum();
      for (var i = 0; i < dataset.length; i++) {
        if (dataset[i] == p) {
          dataset.splice(i,1);
          return;
        }
      }
    }
    d3.select(this).classed("dragging", true);
  }

  function dragstartedObjective(d) {
    if (algorithmRunning) {
      return;
    }
    d3.event.sourceEvent.stopPropagation;
    d3.select(this).classed("dragging", true);
  }

  function dragended(d) {
    if (algorithmRunning) {
      return;
    }
    d3.select(this).classed("dragging", false);
    update();
  }

  function click() {
    if (d3.event.defaultPrevented || deleteLine || algorithmRunning) {
      return;
    }
    var _a = (untransformXWithScale(d3.mouse(this)[0]) - _clickX) * scale;
    var _b = (untransformYWithScale(d3.mouse(this)[1]) - _clickY) * scale;
    if (isZero(_a) && isZero(_b)) {
      _a = 20;
      _b = 20;
    }
    dataset.push({
      base: {
        x : _clickX,
        y : _clickY
      },
      vector : {
        x : _a + Math.random() * randomScale,
        y : _b + Math.random() * randomScale
      },
      active : true,
      black : false
    });
    update();
  }

  var dragbase = d3.behavior.drag().on("drag", dragmovebase).on("dragstart", dragstarted).on("dragend", dragended);
  var dragtip = d3.behavior.drag().on("drag", dragmovetip).on("dragstart", dragstarted).on("dragend", dragended);
  var dragObjectiveBase = d3.behavior.drag().on("drag", dragmovebase).on("dragstart", dragstartedObjective).on("dragend", dragended);
  var dragObjectiveTip = d3.behavior.drag().on("drag", dragmovetip).on("dragstart", dragstartedObjective).on("dragend", dragended);

  // find intersection of two pairs of points
  function findIntersection(d) {
    var a1 = d[0].vector.x;
    var a2 = d[1].vector.x;
    var b1 = d[0].vector.y;
    var b2 = d[1].vector.y;
    var c1 = innerProduct(d[0].base, d[0].vector);
    var c2 = innerProduct(d[1].base, d[1].vector);
    var invDet = 1 / (a1 * b2 - b1 * a2);
    if (isZero(invDet)) {
      // no solution: parallel lines
      return null;
    }
    var x = invDet * (b2 * c1 - b1 * c2);
    var y = invDet * (-a2 * c1 + a1 * c2);
    return {x: x, y: y};
  }

  // helper functions for updates
  function updateLineColor(obj) {
    return obj.classed("upper", function (d) {return (innerProduct (d.vector, getObj()) > 0 && d.active);})
              .classed("lower", function (d) {return (innerProduct (d.vector, getObj()) < 0 && d.active);})
              .classed("inactive", function (d) {return !d.black && !d.active;})
              .classed("most", function (d) {return !(d.most === undefined || !d.most)});
  }

  function updateLine(obj) {
    return updateLineColor(obj.attr("x1", getX1).attr("x2", getX2).attr("y1", getY1).attr("y2", getY2));
  }

  function updatePointer(obj) {
    return obj.attr("x1", function(d) {
      return transformXWithScale(d.base.x);
    }).attr("y1", function(d) {
      return transformYWithScale(d.base.y);
    }).attr("x2", function(d) {
      return transformXWithScale(d.base.x) + d.vector.x;
    }).attr("y2", function(d) {
      return transformYWithScale(d.base.y) + d.vector.y;
    });
  }

  function updateBase(obj, r) {
    var r_ = r;
    return obj.attr("cx", function(d) {
      return transformXWithScale(d.base.x);
    }).attr("cy", function(d) {
      return transformYWithScale(d.base.y);
    }).attr("r", r_)
  }

  function updateTip(obj, r) {
    var r_ = r;
    return obj.attr("cx", function(d) {
      return transformXWithScale(d.base.x + d.vector.x / scale);
    }).attr("cy", function(d) {
      return transformYWithScale(d.base.y + d.vector.y / scale);
    }).attr("r", r_);
  }

  // main update function
  function update() {
    var objectiveText = svg.selectAll("text.objective").data(objective).attr("x", function (d) { return d.base.x;}).attr("y", function (d) { return d.base.y;});
    objectiveText.enter().append("text").attr("x", function (d) { return d.base.x;}).attr("y", function (d) { return d.base.y;}).text("Objective").classed("objective", true);
    objectiveText.exit().remove();

    // data set
    var lines = updateLine(svg.selectAll("line.line").data(dataset));
    var basePts = updateBase(svg.selectAll("circle.base").data(dataset), 4);
    var pointers = updatePointer(svg.selectAll("line.pointer").data(dataset));
    var tipPts = updateTip(svg.selectAll("circle.tip").data(dataset), 4);

    updateLine(lines.enter().append("line")).classed("line", true);
    updateBase(basePts.enter().append("circle"),4).classed("base", true).call(dragbase);
    updatePointer(pointers.enter().append("line")).classed("pointer", true).attr("marker-end", "url(#Triangle)");
    updateTip(tipPts.enter().append("circle"),4).classed("tip", true).call(dragtip);

    lines.exit().remove();
    basePts.exit().remove();
    tipPts.exit().remove();
    pointers.exit().remove();

    // objective
    var objectiveLine = updatePointer(svg.selectAll("line.objective").data(objective));
    updatePointer(objectiveLine.enter().append("line")).classed("objective", true).attr("marker-end", "url(#Triangle2)");
    var objectiveBase = updateBase(svg.selectAll("circle.objectiveBase").data(objective), 5);
    updateBase(objectiveBase.enter().append("circle"), 5).classed("objectiveBase", true).call(dragObjectiveBase);
    var objectiveTip = updateTip(svg.selectAll("circle.objectiveTip").data(objective), 5);
    updateTip(objectiveTip.enter().append("circle"), 5).classed("objectiveTip", true).call(dragObjectiveTip);

    svg.selectAll("circle.solution")
       .attr("cx", function(d) {return transformXWithScale(d.x);})
       .attr("cy", function(d) {return transformYWithScale(d.y);});
    
    svg.selectAll("circle.pair")
       .attr("cx", function (d) {return transformXWithScale(findIntersection(d).x);})
       .attr("cy", function (d) {return transformYWithScale(findIntersection(d).y);});

    svg.selectAll("line.median")
       .attr("x1", getX1).attr("x2", getX2).attr("y1", getY1).attr("y2", getY2);
  }

  // add text to trace
  function trace(text) {
    d3.select("#trace1").append("span").text(text).append("br");
  }

  function _trace(text) {
    d3.select("#trace").append("span").text(text).append("br");
  }

  function copyToTrace() {
    d3.selectAll("#trace1 span").each(function(d,i) {_trace(d3.select(this).text())});
    d3.selectAll("#trace1 span").remove();
    d3.selectAll("#trace1 br").remove();
    d3.selectAll("#trace1").append("br");
  }

  // display the solution in a red circle
  function showSolution(p) {
    trace("Red circle highlights solution");
    svg.selectAll("circle.pair").remove();
    svg.selectAll("line.median").remove();
    var solution = svg.selectAll("circle.solution").data(p).enter().append("circle")
                      .classed("solution", true)
                      .attr("cx", function(d) {return transformXWithScale(d.x);})
                      .attr("cy", function(d) {return transformYWithScale(d.y);})
                      .attr("r", 100)
                      .transition().attr("r",5);
    algorithmStep = 4;
  }

  // step through algorithm, main work horse of algorithm here
  function stepAlgorithm() {
    if (algorithmFinished) return;
    copyToTrace();
    if (d3.selectAll("line.lower").size() == 0) {
      algorithmFinished = true;
      trace("Region is unbounded in the direction of the objective function");
      return;
    } else if (d3.selectAll("line.lower").size() == 1) {
      svg.selectAll("circle.pair").remove();
      svg.select("line.median").remove();
      trace("Lower envelope has only 1 line. Find minimum point on lower envelope.");
      var lowerLine = d3.select("line.lower").datum();
      var lowerLineInverse = {x : -lowerLine.vector.x, y : -lowerLine.vector.y};
      var upperLines = d3.selectAll("line.upper").data();
      // check steeper and shallower lines
      if (crossProductNorm (lowerLineInverse, getObj()) > 0) {
        var steeper = upperLines.filter(function (l) {return crossProductNorm (l.vector, lowerLineInverse) >= 0;});
        var shallower = upperLines.filter(function (l) {return crossProductNorm (l.vector, lowerLineInverse) < 0;});
      } else {
        var steeper = upperLines.filter(function (l) {return crossProductNorm (l.vector, lowerLineInverse) <= 0;});
        var shallower = upperLines.filter(function (l) {return crossProductNorm (l.vector, lowerLineInverse) > 0;});
      }
      var shallowLineLow = null;
      var steepLineHigh = null;
      shallower.forEach(function(l) {
                          if (shallowLineLow === null) {
                            shallowLineLow = l;
                          } else {
                            if (innerProduct (findIntersection ([l,lowerLine]), getObj()) >
                                innerProduct (findIntersection ([shallowLineLow, lowerLine]), getObj())) {
                              shallowLineLow = l;
                            }
                          }
                        });
      steeper.forEach(function(l) {
                        if (steepLineHigh === null) {
                          steepLineHigh = l;
                        } else {
                          if (innerProduct (findIntersection ([l,lowerLine]), getObj()) <
                              innerProduct (findIntersection ([steepLineHigh, lowerLine]), getObj())) {
                            steepLineHigh = l;
                          }
                        }
                      });
      if (steepLineHigh === null) {
        trace("Unbounded feasible region in direction of objective. Infinite solution.");
        algorithmFinished = true;
      } else if (shallowLineLow === null) {
        showSolution([findIntersection([lowerLine, steepLineHigh])]);
      } else if (innerProduct (findIntersection([lowerLine, steepLineHigh]), getObj()) <
                 innerProduct (findIntersection([lowerLine, shallowLineLow]), getObj())) {
        trace("No solution. Feasible region does not exist.");
        algorithmFinished = true;
      } else {
        showSolution([findIntersection([lowerLine, steepLineHigh])]);
      }
      return;
    }
    
    // do stuff for each step of the algorithm
    switch (algorithmStep) {
      case 0:
        svg.selectAll("circle.pair").remove();
        svg.select("line.median").remove();
        for (var i = 0; i < dataset.length; i++) {
          dataset[i].black = false;
        }
        update();
        upperPairs = [];
        lowerPairs = [];
        trace("Pairing lines (intersections in black) and eliminating parallel pairs");
        var u = false;
        // tweak any line perpendicular to objective
        for (var i = 0; i < dataset.length; i++) {
          if (isZero(innerProduct(dataset[i].vector, getObj()))) {
            dataset[i].vector.y += getObj().y / 10000;
            u = true;
          }
        }
        if (u == true) {
          update();
        }
        var lowerSet = new Array();
        d3.selectAll(".lower").each(function (d, i) {d.r = Math.random(); lowerSet.push(d)});
        lowerSet.sort(function (a,b) {return a.r - b.r;});
        while (lowerSet.length > 1) {
          lowerPairs.push([lowerSet[0], lowerSet[1]]);
          lowerSet.splice(0,2);
        }
        var upperSet = new Array();
        d3.selectAll(".upper").each(function (d, i) {d.r = Math.random(); upperSet.push(d)});
        upperSet.sort(function (a,b) {return a.r - b.r;});
        while (upperSet.length > 1) {
          upperPairs.push([upperSet[0], upperSet[1]]);
          upperSet.splice(0,2);
        }
        for (var i = lowerPairs.length - 1; i >= 0; i--) {
          var l1 = lowerPairs[i][0];
          var l2 = lowerPairs[i][1];
          // if lines are parallel, remove the lower one
          if (isZero(crossProduct(l1.vector,l2.vector))) {
            if (innerProduct (l1.base, getObj()) > innerProduct(l2.base, getObj())) {
              l1.active = false;
            } else {
              l2.active = false;
            }
            update();
            lowerPairs.splice(i);
            trace("Parallel lines paired: removing redundant one");
          }
        }
        for (var i = upperPairs.length - 1; i >= 0; i--) {
          var l1 = upperPairs[i][0];
          var l2 = upperPairs[i][1];
          // if lines are parallel, remove the upper one
          if (isZero(crossProduct(l1.vector,l2.vector))) {
            if (innerProduct (l1, getObj()) > innerProduct(l2, getObj())) {
              l2.active = false;
            } else {
              l1.active = false;
            }
            update();
            upperPairs.splice(i);
            trace("Parallel lines paired: removing redundant one");
          }
        }
        var allPairs = lowerPairs.concat(upperPairs);
        svg.selectAll("circle.pair")
           .data(allPairs)
           .enter()
           .append("circle")
           .classed("pair", true)
           .attr("r", 100)
           .attr("cx", function (d) {return transformXWithScale(findIntersection(d).x);})
           .attr("cy", function (d) {return transformYWithScale(findIntersection(d).y);})
           .transition().attr("r", 5);
        algorithmStep = 1;
        break;
      case 1:
        var perp = getPerp();
        var data = svg.selectAll("circle.pair").data();
        if (data.length > 0) {
          // there is some pairing
          data.sort(function (d1, d2) {return innerProduct (findIntersection(d1), perp) - innerProduct (findIntersection(d2), perp);});
          var median = findIntersection(data[Math.floor(data.length / 2)]);
          var medianLine = [{vector : perp, base : {x: median.x, y: median.y}}];
          svg.selectAll("line.median").data(medianLine).enter().append("line").classed("median", true)
             .attr("x1", getX1).attr("x2", getX2).attr("y1", getY1).attr("y2", getY2).style("opacity", 0).transition().style("opacity", 1);
          algorithmStep = 2;
        } else {
          // no pairings find solution
          trace("No pairs remaining. Find direct solution");
          return;
        }
        trace("Finding median");
        break;
      case 2:
        var upperLines = svg.selectAll("line.upper").data();
        var lowerLines = svg.selectAll("line.lower").data();
        var median = svg.select("line.median").datum();
        var lowerInt1 = null;
        var lowerInt2 = null;
        var upperInt = null;
        upperLines.forEach(function(l) {
                             if (upperInt === null) {
                               upperInt = l;
                             } else if (innerProduct(findIntersection([median, l]),getObj()) >
                                        innerProduct(findIntersection([median, upperInt]),getObj())) {
                               upperInt = l;
                             }
                           });
        lowerLines.forEach(function(l) {
                             if (lowerInt1 === null) {
                               lowerInt1 = l;
                             } else if (lowerInt2 === null) {
                               if (innerProduct(findIntersection([median,l]),getObj()) <
                                   innerProduct(findIntersection([median, lowerInt1]),getObj())) {
                                 lowerInt2 = lowerInt1;
                                 lowerInt1 = l;
                               } else {
                                 lowerInt2 = l;
                               }
                             } else if (innerProduct(findIntersection([median, l]),getObj()) <
                                        innerProduct(findIntersection([median, lowerInt1]),getObj())) {
                               lowerInt2 = lowerInt1;
                               lowerInt1 = l;
                             } else if (innerProduct(findIntersection([median, l]),getObj()) <
                                        innerProduct(findIntersection([median, lowerInt2]),getObj())) {
                               lowerInt2 = l;
                             }
                           });
        // if lower line is flat and upper line is above, done
        if (isZero(innerProduct(median.vector,lowerInt1.vector))) {
          trace("Lower envelope is flat. Check feasibility.");
          if (innerProduct(findIntersection([median, upperInt]), getObj()) <
              innerProduct(findIntersection([median, lowerInt1]), getObj())) {
            showSolution([findIntersection([lowerInt1, median])]);
          } else {
            trace("Intersection of half-planes does not produce a feasible region. No solution.");
            algorithmFinished = true;
          }
          return;
        }
        // if top two lower lines intersect median line at the same place
        // and they slant to different sides, this is potential solution
        // if it's below the upper envelope, it is, otherwise, no solution.
        if (isZero(innerProductNorm(findIntersection([median,lowerInt1]), getObj()) -
                   innerProductNorm(findIntersection([median,lowerInt2]), getObj())) &&
                   crossProduct(lowerInt1.vector, getObj()) * crossProduct(lowerInt2.vector, getObj()) < 0) {
          trace("Median crosses cusp of lower envelope. Check feasibility.");
          if (innerProduct(findIntersection([median, upperInt]), getObj()) <
              innerProduct(findIntersection([median, lowerInt1]), getObj())) {
            showSolution([findIntersection([lowerInt1, median])]);
          } else {
            trace("Intersection of half-planes does not produce a feasible region. No solution.");
            algorithmFinished = true;
          }
          return;
        }
        trace("Find upper lower line and lower upper lines (in bold).");
        algorithmStep = 3;
        upperInt.most = true;
        lowerInt1.most = true;
        update();
        if (innerProduct(findIntersection([median, upperInt]), getObj()) <
            innerProduct(findIntersection([median, lowerInt1]), getObj())) {
          // there is a space, trim away from direction of lower line perpendicular
          towardPerp = innerProduct(lowerInt1.vector,getPerp()) < 0;
        } else {
          if (isZero(crossProductNorm(upperInt.vector,lowerInt1.vector))) {
            trace("Upper envelope below lower envelope, and envelopes are parallel.");
            trace("Intersection of half-planes does not produce a feasible region. No solution.");
            algorithmFinished = true;
            return;
          }
          // find sum of normalized perpendiculars. It points in the direction opposite the one to prune
          var sum = { x : upperInt.vector.x / norm(upperInt.vector) + lowerInt1.vector.x / norm(lowerInt1.vector),
                      y : upperInt.vector.y / norm(upperInt.vector) + lowerInt1.vector.y / norm(lowerInt1.vector) };
          towardPerp = innerProduct(sum, getPerp()) < 0;
        }
        break;
      case 3:
        // clear topmost line highlight
        svg.selectAll("line.most").data().forEach(function (d) {d.most = false});
        update();
        trace("Trim data on side of median farther from solution (" + (towardPerp ? "left" : "right")  + " turn from objective). (Lines to be deleted in black)");
        var pairs = svg.selectAll("circle.pair").data().sort(function (d1, d2) {return innerProduct (findIntersection(d1), getPerp()) - innerProduct (findIntersection(d2), getPerp());});
        var median = svg.select("line.median").datum().base;
        if (towardPerp) {
          var trim = pairs.filter(function (p) {return innerProduct(findIntersection(p),getPerp()) >= innerProduct(median,getPerp()) - epsilon;});
        } else {
          var trim = pairs.filter(function (p) {return innerProduct(findIntersection(p),getPerp()) <= innerProduct(median,getPerp()) + epsilon;});
        }
        trim.forEach(function(p) {
                       var l1 = p[0];
                       var l2 = p[1];
                       if (towardPerp) {
                         if (innerProductNorm(l1.vector,getPerp()) < innerProductNorm(l2.vector,getPerp())) {
                           l1.active = false;
                           l1.black = true;
                         } else {
                           l2.active = false;
                           l2.black = true;
                         }
                       } else {
                         if (innerProductNorm(l1.vector,getPerp()) < innerProductNorm(l2.vector,getPerp())) {
                           l2.active = false;
                           l2.black = true;
                         } else {
                           l1.active = false;
                           l1.black = true;
                         }
                       }
                     });
        // highlight lines to be deleted in black.
        svg.selectAll("line.lower").filter(function (d,i) {return !d.active}).classed("lower", false).style("stroke", "black");
        svg.selectAll("line.upper").filter(function (d,i) {return !d.active}).classed("upper", false).style("stroke", "black");
        algorithmStep = 0;
        break;
      case 4:
        svg.selectAll("line.inactive").data().forEach(function (d) {d.active = true});
        update();
        algorithmFinished = true;
        break;
    }
  }

  update();

  // for debugging, print out javascript code for all lines;
  function print() {
    var allLines = "[";
    dataset.forEach(function(v, i, a) {
                      allLines += "{ base : { x : " + v.base.x + ", y : "
                                  + v.base.y + "}, vector : { x : " + v.vector.x + ", y : "
                                  + v.vector.y + "}, active = false, black = false, most = false},";
                    });
    allLines = allLines.substring(0, allLines.length - 1) + "]";
    console.log(allLines);
  }

  svg.on("click", click).on("mousedown", mousedown);
  d3.select(window).on("keyup", keyup).on("keydown", keydown);
  d3.select("body").append("div").attr("id", "trace1").classed("trace", true).append("b").text("Current step:").append("br");
  d3.select("body").append("div").attr("id", "trace").classed("trace", true).append("b").text("Algorithm trace:").append("br");

  d3.select("#buttonStart").on("click",
                                function() {
                                  reset();
                                });
  d3.select("#buttonGo").on("click",
                            function() {
                              algorithmRunning = true;
                              stepAlgorithm();
                              this.value = "Step";
                            });

  d3.select("#buttonRestart").on("click",
                                function() {
                                  var tempDataSet = dataset.splice(0, dataset.length);
                                  var tempObj = objective.splice(0, 1);
                                  reset();
                                  dataset = tempDataSet.splice(0, tempDataSet.length);
                                  dataset.forEach(function (v, i, a) {
                                                    dataset[i].active = true;
                                                    dataset[i].most = false;
                                                    dataset[i].black = false;
                                                  });
                                  objective.push(tempObj[0]);
                                  update();
                                });
  d3.select("#buttonExample").on("click",
                                 function() {
                                   reset();
                                   dataset =
                                     [
                                      { base : { x : 127, y : 224.125}, vector : { x : 7.624989318894222, y : 6.468145279679447}, active : true, black : false, most : false },
                                      { base : { x : 154, y : 203.125}, vector : { x : 1.264222357654944, y : 1.8790595391765237}, active : true, black : false, most : false },
                                      { base : { x : 288, y : 183.125}, vector : { x : 20.156681700609624, y : 20.06904160697013}, active : true, black : false, most : false },
                                      { base : { x : 353, y : 161.125}, vector : { x : 5.95487827854231, y : 11.299223868874833}, active : true, black : false, most : false },
                                      { base : { x : 459, y : 147.125}, vector : { x : 5.427628024015576, y : 11.756631039315835}, active : true, black : false, most : false },
                                      { base : { x : 590, y : 152.125}, vector : { x : 0.3620420964434743, y : 20.638650175649673}, active : true, black : false, most : false },
                                      { base : { x : 641, y : 178.125}, vector : { x : 0.006524822674691677, y : 10.096495448611677}, active : true, black : false, most : false },
                                      { base : { x : 654, y : 241.125}, vector : { x : -3.831385877216235, y : 24.194045265670866}, active : true, black : false, most : false },
                                      { base : { x : 626, y : 292.125}, vector : { x : -5.26536030205898, y : 10.528492879355326}, active : true, black : false, most : false },
                                      { base : { x : 590, y : 326.125}, vector : { x : -4.788669750560075, y : 9.439482885878533}, active : true, black : false, most : false },
                                      { base : { x : 79, y : 473.125}, vector : { x : 8.214696272742003, y : -32.825857867021114}, active : true, black : false, most : false },
                                      { base : { x : 125, y : 458.125}, vector : { x : 16.067378230858594, y : -57.87439296068624}, active : true, black : false, most : false },
                                      { base : { x : 117, y : 485.125}, vector : { x : 0.530003909021616, y : -23.285200505051762}, active : true, black : false, most : false },
                                      { base : { x : 54, y : 576.125}, vector : { x : 1.3843748811632395, y : -20.547544410452247}, active : true, black : false, most : false },
                                      { base : { x : 324, y : 313.125}, vector : { x : -9.94588578096591, y : -10.303832843666896}, active : true, black : false, most : false },
                                      { base : { x : 344, y : 460.125}, vector : { x : 0.6683589983731508, y : -20.612006295472383}, active : true, black : false, most : false },
                                      { base : { x : 278, y : 537.125}, vector : { x : 3.8237419524230063, y : -54.52110516815446}, active : true, black : false, most : false },
                                      { base : { x : 320, y : 471.125}, vector : { x : 10.750979088246822, y : -52.0914125405252}, active : true, black : false, most : false },
                                      { base : { x : 463, y : 429.125}, vector : { x : -5.08956060023047, y : -29.098856090102345}, active : true, black : false, most : false },
                                      { base : { x : 517, y : 418.125}, vector : { x : -9.414082013303414, y : -67.0160258919932}, active : true, black : false, most : false },
                                      { base : { x : 607, y : 400.125}, vector : { x : -28.90931882080622, y : -65.37249907851219}, active : true, black : false, most : false },
                                      { base : { x : 542, y : 332.125}, vector : { x : -26.168191568227485, y : -27.259475253755227}, active : true, black : false, most : false },
                                      { base : { x : 518, y : 350.125}, vector : { x : -70.29502214770764, y : -30.77091912436299}, active : true, black : false, most : false },
                                      { base : { x : 447, y : 365.125}, vector : { x : -14.657398954266682, y : -15.17239809408784}, active : true, black : false, most : false },
                                      { base : { x : 369, y : 388.125}, vector : { x : -5.51557737076655, y : -29.158880532719195}, active : true, black : false, most : false },
                                      { base : { x : 354, y : 484.125}, vector : { x : 1.6841341506224126, y : -11.607109041884542}, active : true, black : false, most : false },
                                      { base : { x : 120, y : 428.125}, vector : { x : 13.60939843324013, y : -10.629593089455739}, active : true, black : false, most : false },
                                      { base : { x : 77, y : 432.125}, vector : { x : 11.811319810338318, y : -19.279540109913796}, active : true, black : false, most : false },
                                      { base : { x : 65, y : 488.125}, vector : { x : 8.324743164237589, y : -6.095755283487961}, active : true, black : false, most : false },
                                      { base : { x : 61, y : 536.125}, vector : { x : 15.163213393185288, y : -48.65701491711661}, active : true, black : false, most : false },
                                      { base : { x : 133, y : 538.125}, vector : { x : 10.082793658832088, y : -43.563783231657}, active : true, black : false, most : false },
                                      { base : { x : 75, y : 458.125}, vector : { x : 18.301445039687678, y : -14.172248411923647}, active : true, black : false, most : false },
                                      { base : { x : 50, y : 398.125}, vector : { x : 13.994525134097785, y : -8.965500203426927}, active : true, black : false, most : false },
                                      { base : { x : 59, y : 357.125}, vector : { x : 12.27982756914571, y : -8.656484358943999}, active : true, black : false, most : false },
                                      { base : { x : 533, y : 173.125}, vector : { x : -4.777319195214659, y : 38.27519871387631}, active : true, black : false, most : false },
                                      { base : { x : 565, y : 146.125}, vector : { x : -7.669427635148168, y : 38.918153875740245}, active : true, black : false, most : false },
                                      { base : { x : 634, y : 72.125}, vector : { x : -3.547780077671632, y : 15.741778829600662}, active : true, black : false, most : false },
                                      { base : { x : 689, y : 103.125}, vector : { x : -46.627321700332686, y : 51.324981751386076}, active : true, black : false, most : false },
                                      { base : { x : 580, y : 108.125}, vector : { x : -13.522405443713069, y : 43.05132908048108}, active : true, black : false, most : false },
                                      { base : { x : 538, y : 91.125}, vector : { x : -9.530740353511646, y : 47.15546366665512}, active : true, black : false, most : false },
                                      { base : { x : 449, y : 113.125}, vector : { x : -2.0482102076057345, y : 15.000844916328788}, active : true, black : false, most : false },
                                      { base : { x : 506, y : 97.125}, vector : { x : -20.60841759480536, y : 35.927995808422565}, active : true, black : false, most : false },
                                      { base : { x : 569, y : 185.125}, vector : { x : -2.525830588536337, y : 7.414381767157465}, active : true, black : false, most : false },
                                      { base : { x : 555, y : 212.125}, vector : { x : -19.656052617589012, y : 17.06725785904564}, active : true, black : false, most : false },
                                      { base : { x : 134, y : 189.125}, vector : { x : 7.454390999628231, y : 16.51577255036682}, active : true, black : false, most : false }]
                                   update();
                                 });
}).call(this);
