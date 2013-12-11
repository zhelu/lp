(function() {
  var width = 700;
  var height = 400;
  var svg = d3.select("body").append("svg").attr("width", width).attr("height", height);
  var keyAlreadyDown = false;
  var deleteLine = false;
  var _clickX, _clickY;
  var dataset = [];
  var objective = [{base : {x : width / 2, y : height / 2}, vector : {x : 0, y : - height / 10}}];
  var algorithmRunning = false;
  var algorithmFinished = false;
  var algorithmStep = 0;
  var upperPairs = [];
  var lowerPairs = [];
  var epsilon = 0.000001;
  var towardPerp = true;

  // test if float is zero
  function isZero (f) {
    return Math.abs(f) < epsilon;
  }

  function clearTrace() {
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
    algorithmRunning = false;
    algorithmFinished = false;
    algorithmStep = 0;
    upperPairs = [];
    lowerPairs = [];
    d3.select("#buttonGo").attr("value", "Go");
    d3.selectAll("circle.pair").remove();
    d3.selectAll("circle.solution").remove();
    d3.select("line.median").remove();
    clearTrace();
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

  // Line endpoint getters
  function getX1(d) {
    if (isZero(d.vector.y)) {
      return d.base.x;
    }

    if (isZero(d.vector.x)) {
      return -10;
    }

    if (d.vector.y > 5 * Math.abs(d.vector.x)) {
      return (d.base.x * d.vector.x + d.base.y * d.vector.y + 10 * d.vector.y) / d.vector.x;
    } else {
      return -10;
    }
  }

  function getX2(d) {
    if (isZero(d.vector.y)) {
      return d.base.x;
    }

    if (isZero(d.vector.x)) {
      return width + 10;
    }

    if (d.vector.y > 5 * Math.abs(d.vector.x)) {
      return (d.base.x * d.vector.x + d.base.y * d.vector.y - (width + 10) * d.vector.y) / d.vector.x;
    } else {
      return width + 10;
    }
  }

  function getY1(d) {
    if (isZero(d.vector.y)) {
      return -10;
    }

    if (isZero(d.vector.x)) {
      return d.base.y;
    }

    return (d.base.x * d.vector.x + d.base.y * d.vector.y - getX1(d) * d.vector.x) / d.vector.y;
  }

  function getY2(d) {
    if (isZero(d.vector.y)) {
      return height + 10;
    }

    if (isZero(d.vector.x)) {
      return d.base.y;
    }

    return (d.base.x * d.vector.x + d.base.y * d.vector.y - getX2(d) * d.vector.x) / d.vector.y;
  }

  // on shift, prepare to delete on click
  function keydown() {
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
    _clickX = d3.mouse(this)[0];
    _clickY = d3.mouse(this)[1];
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
    p.base.x = d3.event.x;
    p.base.y = d3.event.y;
    update();
  }

  function dragmovetip(d) {
    if (algorithmRunning) {
      return;
    }
    d3.event.sourceEvent.stopPropagation
    var p = d3.select(this).datum();
    p.vector.x = d3.event.x - p.base.x;
    p.vector.y = d3.event.y - p.base.y;
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
    var _a = d3.mouse(this)[0] - _clickX;
    var _b = d3.mouse(this)[1] - _clickY;
    if (isZero(_a) && isZero(_b)) {
      _a = 20 + Math.random() / 1000;
      _b = 20;
    }
    dataset.push({
      base: {
        x : _clickX,
        y : _clickY,
      },
      vector : {
        x : _a + Math.random() / 1000,
        y : _b,
      },
      active : true
    });
    update();
  }

  var dragbase = d3.behavior.drag().on("drag", dragmovebase).on("dragstart", dragstarted).on("dragend", dragended);
  var dragtip = d3.behavior.drag().on("drag", dragmovetip).on("dragstart", dragstarted).on("dragend", dragended);
  var dragObjectiveBase = d3.behavior.drag().on("drag", dragmovebase).on("dragstart", dragstartedObjective).on("dragend", dragended);
  var dragObjectiveTip = d3.behavior.drag().on("drag", dragmovetip).on("dragstart", dragstartedObjective).on("dragend", dragended);

  // helper functions for updates
  function updateLineColor(obj) {
    return obj.classed("upper", function (d) {return (innerProduct (d.vector, getObj()) > 0 && d.active);})
              .classed("lower", function (d) {return (innerProduct (d.vector, getObj()) < 0 && d.active);})
              .classed("inactive", function (d) {return !d.active;}).classed("most", function (d) {return !(d.most === undefined || !d.most)});
  }

  function updateLine(obj) {
    return updateLineColor(obj.attr("x1", getX1).attr("x2", getX2).attr("y1", getY1).attr("y2", getY2));
  }

  function updatePointer(obj) {
    return obj.attr("x1", function(d) {
      return d.base.x;
    }).attr("y1", function(d) {
      return d.base.y;
    }).attr("x2", function(d) {
      return d.base.x + d.vector.x;
    }).attr("y2", function(d) {
      return d.base.y + d.vector.y;
    });
  }

  function updateBase(obj, r) {
    var r_ = r;
    return obj.attr("cx", function(d) {
      return d.base.x;
    }).attr("cy", function(d) {
      return d.base.y;
    }).attr("r", r_)
  }

  function updateTip(obj, r) {
    var r_ = r;
    return obj.attr("cx", function(d) {
      return d.base.x + d.vector.x;
    }).attr("cy", function(d) {
      return d.base.y + d.vector.y;
    }).attr("r", r_);
  }

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
  }

  // add text to trace
  function trace(text) {
    d3.select("#trace").append("span").text(text).append("br");
  }

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

  // display the solution in a red circle
  function showSolution(p) {
    trace("Red circle highlights solution");
    svg.selectAll("circle.pair").remove();
    svg.selectAll("line.median").remove();
    var solution = svg.selectAll("circle.solution").data(p).enter().append("circle")
                      .classed("solution", true).attr("cx", function(d) {return d.x;}).attr("cy", function(d) {return d.y}).attr("r", 100)
                      .transition().attr("r",5);
    algorithmStep = 4;
  }

  // step through algorithm, main work horse of algorithm here
  function stepAlgorithm() {
    if (algorithmFinished) return;
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
    switch (algorithmStep) {
      case 0:
        svg.selectAll("circle.pair").remove();
        svg.select("line.median").remove();
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
            svg.selectAll("line.inactive").transition().style("stroke-color", "lightgray !important");
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
            svg.selectAll("line.inactive").transition().style("stroke-color", "lightgray !important");
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
           .attr("cx", function (d) {return findIntersection(d).x})
           .attr("cy", function (d) {return findIntersection(d).y})
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
        trace("Trim data on side of median farther from solution (" + (towardPerp ? "left" : "right")  + " turn from objective).");
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
                         } else {
                           l2.active = false;
                         }
                       } else {
                         if (innerProductNorm(l1.vector,getPerp()) < innerProductNorm(l2.vector,getPerp())) {
                           l2.active = false;
                         } else {
                           l1.active = false;
                         }
                       }
                     });
        update();
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

  svg.on("click", click).on("mousedown", mousedown);
  d3.select(window).on("keyup", keyup).on("keydown", keydown);
  d3.select("body").append("div").attr("id", "trace").classed("trace", true).append("b").text("Algorithm trace:").append("br");

  d3.select("#buttonStart").on("click",
                                function() {
                                  dataset = [];
                                  objective = [{base : {x : width / 2, y : height / 2}, vector : {x : 0, y : - height / 10}}];
                                  update();
                                  reset();
                                });
  d3.select("#buttonGo").on("click",
                            function() {
                              algorithmRunning = true;
                              stepAlgorithm();
                              this.value = "Step";
                            });

}).call(this);
