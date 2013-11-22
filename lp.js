(function() {
  var width = 700;
  var height = 400;
  var svg = d3.select("body").append("svg").attr("width", width).attr("height", height);

  var dataset = [{
    a : 10,
    b : 10,
    x : 100,
    y : 50
  }];

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


  svg.append("defs").append("marker").attr("id", "Triangle").attr("viewBox", "0 0 10 10").attr("refX", "0").attr("refY", "5").attr("markerUnits", "strokeWidth").attr("markerWidth", "10").attr("markerHeight", "10").attr("orient", "auto").append("path").attr("d", "M 0 0 L 10 5 L 0 10 z").attr("fill", "rgba(128,128,128,0.4)");

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
    d3.event.sourceEvent.stopPropagation
  }

  function dragended(d) {
    update();
  }

  function click() {
    if (d3.event.defaultPrevented) {
      return;
    }
    dataset.push({
      x : d3.mouse(this)[0],
      y : d3.mouse(this)[1],
      a : 10,
      b : 10
    });
    update();
  }

  var dragbase = d3.behavior.drag().on("drag", dragmovebase).on("dragstart", dragstarted).on("dragend", dragended);
  var dragtip = d3.behavior.drag().on("drag", dragmovetip).on("dragstart", dragstarted).on("dragend", dragended);

  function update() {
    var lines = svg.selectAll("line.line").data(dataset).attr("x1", getX1).attr("x2", getX2).attr("y1", getY1).attr("y2", getY2);
    var basePts = svg.selectAll("circle.base").data(dataset).attr("cx", function(d) {
      return d.x;
    }).attr("cy", function(d) {
      return d.y;
    });
    var tipPts = svg.selectAll("circle.tip").data(dataset).attr("cx", function(d) {
      return d.x + d.a;
    }).attr("cy", function(d) {
      return d.y + d.b;
    });
    var pointers = svg.selectAll("line.pointer").data(dataset).attr("x1", function(d) {
      return d.x;
    }).attr("y1", function(d) {
      return d.y;
    }).attr("x2", function(d) {
      return d.x + d.a;
    }).attr("y2", function(d) {
      return d.y + d.b;
    });

    lines.enter().append("line").attr("x1", getX1).attr("x2", getX2).attr("y1", getY1).attr("y2", getY2).attr("stroke", "black").attr("class", "line");
    basePts.enter().append("circle").attr("cx", function(d) {
      return d.x;
    }).attr("cy", function(d) {
      return d.y;
    }).attr("r", 3).attr("class", "base").call(dragbase);
    tipPts.enter().append("circle").attr("cx", function(d) {
      return d.x + d.a;
    }).attr("cy", function(d) {
      return d.y + d.b;
    }).attr("r", 3).attr("class", "tip").call(dragtip);
    pointers.enter().append("line").attr("x1", function(d) {
      return d.x;
    }).attr("y1", function(d) {
      return d.y;
    }).attr("x2", function(d) {
      return d.x + d.a;
    }).attr("y2", function(d) {
      return d.y + d.b;
    }).attr("stroke", "black").attr("class", "pointer").attr("marker-end", "url(#Triangle)");

    lines.exit().remove();
    basePts.exit().remove();
    tipPts.exit().remove();
    pointers.exit().remove();
  }

  update();

  svg.on("click", click);

}).call(this);
