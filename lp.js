(function() {
  var width = 700;
  var height = 400;
  var svg = d3.select("body").append("svg").attr("width", width).attr("height", height);
  var keyAlreadyDown = false;
  var deleteLine = false;
  var _clickX, _clickY;
  var dataset = [];
  var objective = [{x : width / 2, y : height / 2, a : 0, b : - height / 10}];
  var algorithmRunning = false;
  var algorithmFinished = false;
  var algorithmStep = 0;
  var upperPairs = [];
  var lowerPairs = [];
  
  function reset() {
    algorithmRunning = false;
    algorithmFinished = false;
    algorithmStep = 0;
    upperPairs = [];
    lowerPairs = [];
    d3.select("#buttonGo").attr("value", "Go");
    d3.select("#trace").remove();
    d3.select("body").append("div").attr("id", "trace").classed("trace", true).append("b").text("Algorithm trace:");
    d3.selectAll("circle.pair").remove();
    d3.select("line.median").remove();
  }

  function innerProduct(p1, p2) {
    return p1.a * p2.a + p1.b * p2.b;
  }

  function getX1(d) {
    if (d.b == 0) {
      return d.x;
    }

    if (d.a == 0) {
      return -10;
    }

    if (d.b > 5 * Math.abs(d.a)) {
      return (d.x * d.a + d.y * d.b + 10 * d.b) / d.a;
    } else {
      return -10;
    }
  }

  function getX2(d) {
    if (d.b == 0) {
      return d.x;
    }

    if (d.a == 0) {
      return width + 10;
    }

    if (d.b > 5 * Math.abs(d.a)) {
      return (d.x * d.a + d.y * d.b - (width + 10) * d.b) / d.a;
    } else {
      return width + 10;
    }
  }

  function getY1(d) {
    if (d.b == 0) {
      return -10;
    }

    if (d.a == 0) {
      return d.y;
    }

    return (d.x * d.a + d.y * d.b - getX1(d) * d.a) / d.b;
  }

  function getY2(d) {
    if (d.b == 0) {
      return height + 10;
    }

    if (d.a == 0) {
      return d.y;
    }

    return (d.x * d.a + d.y * d.b - getX2(d) * d.a) / d.b;
  }

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
  
  function mousedown() {
    if (algorithmRunning) {
      return;
    }
    d3.event.preventDefault();
    _clickX = d3.mouse(this)[0];
    _clickY = d3.mouse(this)[1];
    return svg;
  }

  svg.append("defs").append("marker").attr("id", "Triangle").attr("viewBox", "0 0 10 10").attr("refX", "0").attr("refY", "5").attr("markerUnits", "strokeWidth").attr("markerWidth", "10").attr("markerHeight", "10").attr("orient", "auto").append("path").attr("d", "M 0 0 L 10 5 L 0 10 z").attr("fill", "rgba(128,128,128,0.4)");
  svg.select("defs").append("marker").attr("id", "Triangle2").attr("viewBox", "0 0 10 10").attr("refX", "0").attr("refY", "5").attr("markerUnits", "strokeWidth").attr("markerWidth", "5").attr("markerHeight", "5").attr("orient", "auto").append("path").attr("d", "M 0 0 L 10 5 L 0 10 z").attr("fill", "rgba(135,206,235,0.6)");

  function dragmovebase(d) {
    if (algorithmRunning) {
      return;
    }
    d3.event.sourceEvent.stopPropagation
    var p = d3.select(this).datum();
    p.x = d3.event.x;
    p.y = d3.event.y;
    update();
  }

  function dragmovetip(d) {
    if (algorithmRunning) {
      return;
    }
    d3.event.sourceEvent.stopPropagation
    var p = d3.select(this).datum();
    p.a = d3.event.x - p.x;
    p.b = d3.event.y - p.y;
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
    if (_a == 0 && _b == 0) {
      _a = 20 + Math.random() / 1000;
      _b = 20;
    }
    dataset.push({
      x : _clickX,
      y : _clickY,
      a : _a + Math.random() / 1000,
      b : _b,
      active : true
    });
    update();
  }

  var dragbase = d3.behavior.drag().on("drag", dragmovebase).on("dragstart", dragstarted).on("dragend", dragended);
  var dragtip = d3.behavior.drag().on("drag", dragmovetip).on("dragstart", dragstarted).on("dragend", dragended);
  var dragObjectiveBase = d3.behavior.drag().on("drag", dragmovebase).on("dragstart", dragstartedObjective).on("dragend", dragended);
  var dragObjectiveTip = d3.behavior.drag().on("drag", dragmovetip).on("dragstart", dragstartedObjective).on("dragend", dragended);

  function updateLineColor(obj) {
    return obj.classed("upper", function (d) {return (innerProduct (d, objective[0]) > 0 && d.active);})
              .classed("lower", function (d) {return (innerProduct (d, objective[0]) < 0 && d.active);})
              .classed("inactive", function (d) {return !d.active;});
  }

  function updateLine(obj) {
    return updateLineColor(obj.attr("x1", getX1).attr("x2", getX2).attr("y1", getY1).attr("y2", getY2));
  }
  
  function updatePointer(obj) {
    return obj.attr("x1", function(d) {
      return d.x;
    }).attr("y1", function(d) {
      return d.y;
    }).attr("x2", function(d) {
      return d.x + d.a;
    }).attr("y2", function(d) {
      return d.y + d.b;
    });
  }
  
  function updateBase(obj, r) {
    var r_ = r;
    return obj.attr("cx", function(d) {
      return d.x;
    }).attr("cy", function(d) {
      return d.y;
    }).attr("r", r_)
  }
  
  function updateTip(obj, r) {
    var r_ = r;
    return obj.attr("cx", function(d) {
      return d.x + d.a;
    }).attr("cy", function(d) {
      return d.y + d.b;
    }).attr("r", r_);
  }

  function update() {
    var objectiveText = svg.selectAll("text.objective").data(objective).attr("x", function (d) { return d.x;}).attr("y", function (d) { return d.y;});
    objectiveText.enter().append("text").attr("x", function (d) { return d.x;}).attr("y", function (d) { return d.y;}).text("Objective").classed("objective", true);
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

  function trace(text) {
    d3.select("#trace").append("p").text(text);
  }

  function findIntersection(d) {
    var a1 = d[0].a;
    var a2 = d[1].a;
    var b1 = d[0].b;
    var b2 = d[1].b;
    var c1 = d[0].x * a1 + d[0].y * b1;
    var c2 = d[1].x * a2 + d[1].y * b2;
    var invDet = 1 / (a1 * b2 - b1 * a2);
    var x = invDet * (b2 * c1 - b1 * c2);
    var y = invDet * (-a2 * c1 + a1 * c2);
    return {a: x, b: y}; 
  }

  function stepAlgorithm() {
    if (algorithmFinished) return;
    if (d3.selectAll("line.lower").size() == 0) {
      algorithmFinished = true;
      trace("Region is unbounded in the direction of the objective function");
      return;
    } else if (d3.selectAll("line.lower").size() == 1) {
      
    } else if (d3.selectAll("line.upper").size() == 1) {
      
    }
    switch (algorithmStep) {
      case 0:
        trace("Pairing lines");
        var u = false;
        for (var i = 0; i < dataset.length; i++) {
          if (innerProduct(dataset[i], objective[0]) == 0) {
            dataset[i].b += objective[0].b / 10000;
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
          if (l1.a * l2.b - l1.b * l2.a == 0) {
            lowerPairs.splice(i);
          }
        }
        for (var i = upperPairs.length - 1; i >= 0; i--) {
          var l1 = upperPairs[i][0];
          var l2 = upperPairs[i][1];
          if (l1.a * l2.b - l1.b * l2.a == 0) {
            upperPairs.splice(i);
          }
        }
        var allPairs = lowerPairs.concat(upperPairs);
        svg.selectAll("circle.pair")
           .data(allPairs)
           .enter()
           .append("circle")
           .classed("pair", true)
           .attr("r", 5)
           .attr("cx", function (d) {return findIntersection(d).a})
           .attr("cy", function (d) {return findIntersection(d).b})
           .style("opacity", 0).transition().style("opacity", 1);
        algorithmStep = 1;
        break;
      case 1:
        trace("Finding median");
        var perp = {a: objective[0].b, b: -objective[0].a};
        var data = svg.selectAll("circle.pair").data();
        data.sort(function (d1, d2) {return innerProduct (findIntersection(d1), perp) - innerProduct (findIntersection(d2), perp);});
        var median = findIntersection(data[Math.floor(data.length / 2)]);
        var medianLine = [{a: perp.a, b: perp.b, x: median.a, y: median.b}];
        svg.selectAll("line.median").data(medianLine).enter().append("line").classed("median", true)
           .attr("x1", getX1).attr("x2", getX2).attr("y1", getY1).attr("y2", getY2).style("opacity", 0).transition().style("opacity", 1);
        algorithmStep = 2;
        break;
      case 2:
        trace("Find upper lower line and lower upper lines.");
        var upperLines = svg.selectAll("line.upper").data();
        console.log(upperLines);
        break;
    }
  }

  update();

  svg.on("click", click).on("mousedown", mousedown);
  d3.select(window).on("keyup", keyup).on("keydown", keydown);
  d3.select("body").append("div").attr("id", "trace").classed("trace", true).append("b").text("Algorithm trace");
  
  d3.select("#buttonStart").on("click",
                                function() {
                                  dataset = [];
                                  objective = [{x : width / 2, y : height / 2, a : 0, b : - height / 10}];
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
