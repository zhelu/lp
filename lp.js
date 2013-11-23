(function() {
  var width = 700;
  var height = 400;
  var svg = d3.select("body").append("svg").attr("width", width).attr("height", height);
  var keyAlreadyDown = false;
  var deleteLine = false;
  var _clickX, _clickY;
  var dataset = [];
  var objective = [{x : width / 2, y : height / 2, a : 0, b : - height / 10}];

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
    d3.event.preventDefault();
    _clickX = d3.mouse(this)[0];
    _clickY = d3.mouse(this)[1];
    return svg;
  }

  svg.append("defs").append("marker").attr("id", "Triangle").attr("viewBox", "0 0 10 10").attr("refX", "0").attr("refY", "5").attr("markerUnits", "strokeWidth").attr("markerWidth", "10").attr("markerHeight", "10").attr("orient", "auto").append("path").attr("d", "M 0 0 L 10 5 L 0 10 z").attr("fill", "rgba(128,128,128,0.4)");
  svg.select("defs").append("marker").attr("id", "Triangle2").attr("viewBox", "0 0 10 10").attr("refX", "0").attr("refY", "5").attr("markerUnits", "strokeWidth").attr("markerWidth", "5").attr("markerHeight", "5").attr("orient", "auto").append("path").attr("d", "M 0 0 L 10 5 L 0 10 z").attr("fill", "rgba(135,206,235,0.6)");

  function dragmovebase(d) {
    d3.event.sourceEvent.stopPropagation
    var p = d3.select(this).datum();
    p.x = d3.event.x;
    p.y = d3.event.y;
    update();
  }

  function dragmovetip(d) {
    d3.event.sourceEvent.stopPropagation
    var p = d3.select(this).datum();
    p.a = d3.event.x - p.x;
    p.b = d3.event.y - p.y;
    update();
  }

  function dragstarted(d) {
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
    d3.event.sourceEvent.stopPropagation;
    d3.select(this).classed("dragging", true);
  }

  function dragended(d) {
    d3.select(this).classed("dragging", false);
    update();
  }

  function click() {
    if (d3.event.defaultPrevented || deleteLine) {
      return;
    }
    var _a = d3.mouse(this)[0] - _clickX;
    var _b = d3.mouse(this)[1] - _clickY;
    if (_a == 0 && _b == 0) {
      _a = 20;
      _b = 20;
    }
    dataset.push({
      x : _clickX,
      y : _clickY,
      a : _a,
      b : _b,
    });
    update();
  }

  var dragbase = d3.behavior.drag().on("drag", dragmovebase).on("dragstart", dragstarted).on("dragend", dragended);
  var dragtip = d3.behavior.drag().on("drag", dragmovetip).on("dragstart", dragstarted).on("dragend", dragended);
  var dragObjectiveBase = d3.behavior.drag().on("drag", dragmovebase).on("dragstart", dragstartedObjective).on("dragend", dragended);
  var dragObjectiveTip = d3.behavior.drag().on("drag", dragmovetip).on("dragstart", dragstartedObjective).on("dragend", dragended);

  function updateLineColor(obj) {
    return obj.classed("upper", function (d) {return (innerProduct (d, objective[0]) > 0);}).classed("lower", function (d) {return (innerProduct (d, objective[0]) < 0);});
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

  update();

  svg.on("click", click).on("mousedown", mousedown);
  d3.select(window).on("keyup", keyup).on("keydown", keydown);
  
  d3.select("#buttonStart").on("click", function() { dataset = []; update();});

}).call(this);
