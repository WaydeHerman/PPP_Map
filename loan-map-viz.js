function loanMap(option) {
  // Extract options
  const el = option.el;
  const height = option.height;
  const width = option.width || "";
  const sectors = option.sectors;
  const zip_json = option.zip_json;
  const industry_json = option.industry_json;
  const initState = option.initState;

  var point_width = 4;
  var filter = "All Sectors";
  var list_of_naicscodes = [];
  var statsOpen = 1;
  var bar_options = { by: "city", aggregate: "percentage" };
  var drill_key = [];
  var drill_type = "city";
  var heatData,
    data,
    json_copy,
    bounds_NE,
    bounds_SW,
    featureCircle,
    global_drill_level,
    global_key;

  // Tooltip
  const tooltip = d3.select(el).append("div").attr("class", "chart-tooltip");
  tooltip.append("div").attr("class", "tooltip-business_name");
  tooltip.append("div").attr("class", "tooltip-address");
  tooltip.append("div").attr("class", "tooltip-industry");
  tooltip.append("div").attr("class", "tooltip-amount");
  tooltip.append("div").attr("class", "tooltip-date_approved");

  // legend tooltip
  const legend_tooltip = d3
    .select(el)
    .append("div")
    .attr("class", "chart-legend-tooltip");
  legend_tooltip.append("div").attr("class", "legend-tooltip-name");
  legend_tooltip.append("div").attr("class", "legend-tooltip-bucket");
  legend_tooltip.append("div").attr("class", "legend-tooltip-total");

  var topBar = d3
    .select(el)
    .append("div")
    .attr("class", "top-bar")
    .style("width", window.innerWidth + "px")
    .style("height", "60px");

  var top_bar_strip = topBar
    .append("div")
    .attr("class", "top-bar-strip")
    .style("width", window.innerWidth + "px")
    .style("height", "40px");

  top_bar_strip
    .append("text")
    .attr("class", "title")
    .text("FORWARD: PPP Dashboard");

  var legendContainer = d3
    .select(el)
    .append("div")
    .attr("class", "legend-container")
    .attr("id", "legend-container")
    //.style("top", "20px")
    //.style("left", document.getElementById("map").clientWidth - 420 + "px")
    .style("height", window.innerHeight + "px");

  var sidebarContainer = d3
    .select(el)
    .append("div")
    .attr("class", "sidebar-container")
    .style("height", window.innerHeight + "px");

  const container = d3.select(el).classed("migration-map-viz", true);
  container.append("p").attr("id", "map");

  if (width === "") {
    d3.select("#map")
      .style("left", "300px")
      .style("margin-top", "0px")
      .style("width", window.innerWidth - 600 + "px");
  } else {
    d3.select("#map").style("width", width + "px");
  }

  if (height === "") {
    d3.select("#map")
      .style("height", window.innerHeight - 60 + "px")
      .style("top", "60px")
      .style("position", "absolute");
  } else {
    d3.select("#map").style("height", height + "px");
  }

  const accessToken =
    "pk.eyJ1Ijoic3RlbmluamEiLCJhIjoiSjg5eTMtcyJ9.g_O2emQF6X9RV69ibEsaIw";

  var map = new L.Map("map", {
    center: [47.8, -110.9],
    zoom: 4,
    minZoom: 3,
    maxZoom: 11,
    zoomControl: false,
  }).addLayer(
    new L.TileLayer(
      "https://api.mapbox.com/styles/v1/mapbox/light-v10/tiles/{z}/{x}/{y}?access_token=" +
        accessToken,
      {
        attribution:
          '© <a href="https://apps.mapbox.com/feedback/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }
    )
  );

  L.control
    .zoom({
      position: "topright",
    })
    .addTo(map);

  var svg = d3.select(map.getPanes().overlayPane).append("svg"),
    g = svg.append("g").attr("class", "leaflet-zoom-hide");

  var transform = d3.geoTransform({ point: projectPoint }),
    path = d3.geoPath().projection(transform);

  function get_data(state_choice) {
    d3.csv("State_Data/data_" + state_choice + ".csv").then(function (
      state_data
    ) {
      document.getElementsByClassName("leaflet-zoom-hide").innerHTML = "";
      d3.selectAll(".feature-circle").remove();
      json_copy = JSON.parse(JSON.stringify(zip_json));
      data = state_data;

      // get coordinates for points
      data.forEach(function (v) {
        if (zip_json[+v.Zip]) {
          v.location = [zip_json[+v.Zip][0], zip_json[+v.Zip][1]];
          v.point = map.latLngToLayerPoint(
            new L.LatLng(v.location[0], v.location[1])
          );
        }
      });

      data = data.filter(function (d) {
        return d.point != null;
      });

      map.on("viewreset", reset);

      map.on("dragend", function (e) {
        reset();
      });

      reset();
      updateBars();
    });
  }

  var noScrollTarget = document.getElementById("legend-container");
  L.DomEvent.disableScrollPropagation(noScrollTarget);

  var legendHeader = legendContainer
    .append("div")
    .attr("class", "legend-header");

  legendHeader
    .append("div")
    .attr("class", "state-selection-label")
    .text("State");

  var statePickerContainer = legendHeader
    .append("div")
    .attr("class", "state-picker-container");

  statePickerContainer.append("div").attr("class", "dropdown-state");

  statePickerContainer
    .select(".dropdown-state")
    .append("div")
    .attr("class", "dropdown-content")
    .attr("id", "state-selector");

  statePickerContainer
    .select(".dropdown-state")
    .append("button")
    .attr("class", "dropbtn")
    .html("Select State" + " <i class='fas dropbtn-icon fa-chevron-down'></i>");

  d3.select("#state-selector")
    .selectAll("a")
    .data(["AK", "ID", "DC"])
    .enter()
    .append("text")
    .html(function (d) {
      return "<a href='#'>" + d + "</a>";
    })
    .on("click", function (d) {
      get_data(d);
    });

  var legendSubHeader = legendContainer
    .append("div")
    .attr("class", "legend-sub-header");

  legendSubHeader
    .append("text")
    .attr("class", "legend-title")
    .text("Loan Sizes");

  var legendSVG = legendSubHeader
    .append("svg")
    .attr("class", "legend-svg")
    .style("position", "relative")
    .attr("width", 210)
    .attr("height", 124);

  legendSVG
    .append("rect")
    .attr("width", 210)
    .attr("height", 124)
    .attr("fill", "#EBEBEB");

  var legend_examples = [0, 1, 2, 3, 4];
  var colors = ["#540D6E", "#EE4266", "#FFD23F", "#3A86FF", "#0EAD68"];
  var loan_range = [
    "$150,000-350,000",
    "$350,000-1 million",
    "$1-2 million",
    "$2-5 million",
    "$5-10 million",
  ];
  var loan_values = [0.035, 0.1, 0.2, 0.5, 1];

  var legendColorScale = d3.scaleOrdinal().domain(loan_range).range(colors);

  loanHeatmapScale = d3.scaleOrdinal().domain(loan_range).range(loan_values);

  legendSVG
    .selectAll(".legend-bars")
    .data(legend_examples)
    .enter()
    .append("rect")
    .attr("class", "legend-bars")
    .attr("y", function (d) {
      return d * 22 + 10;
    })
    .attr("fill", function (d) {
      return colors[d];
    })
    .attr("x", 15)
    .attr("width", 40)
    .attr("height", 14);

  legendSVG
    .selectAll(".legend-bars-label")
    .data(legend_examples)
    .enter()
    .append("text")
    .attr("class", "legend-bars-label")
    .attr("y", function (d) {
      return d * 22 + 22;
    })
    .attr("x", 65)
    .text(function (d) {
      return loan_range[d];
    });

  var sectors_object = d3
    .nest()
    .key(function (d) {
      return d.ds_naics_sector;
    })
    .sortKeys(d3.ascending)
    .entries(Object.values(industry_json));

  list_of_naicscodes = [];
  sectors_object.forEach(function (v) {
    v.values.forEach(function (w) {
      list_of_naicscodes.push(+w.cd_industry);
    });
  });

  var sectorPickerContainer = legendHeader
    .append("div")
    .attr("class", "sector-picker-container");

  sectorPickerContainer
    .append("text")
    .attr("class", "sector-title")
    .text("Sectors");

  var sectors_array = sectors_object.map(function (d) {
    return d.key;
  });

  //sectors_array.unshift("All Sectors");

  currently_selected = [];
  sectors_array.forEach(function (v) {
    currently_selected.push(v);
  });

  var legendRectSize = 12;
  var legendSpacing = 8;

  sectorPickerSVG = sectorPickerContainer
    .append("svg")
    .attr("class", "sector-picker-svg")
    .attr("height", 440)
    .attr("width", 220);

  sector_picker = sectorPickerSVG
    .selectAll(".sector-picker")
    .data(sectors_array)
    .enter()
    .append("g")
    .attr("class", "sector-picker")
    .attr("transform", function (d, i) {
      var height = legendRectSize + legendSpacing;
      var offset = 1;
      var horz = 1;
      var vert = i * height + offset;
      return "translate(" + horz + "," + vert + ")";
    });

  sector_picker
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", legendRectSize)
    .attr("height", legendRectSize)
    .style("stroke", "black")
    .style("stroke-width", 1)
    .attr("fill", function (d) {
      return "#000";
    })
    .on("click", function (d) {
      manage_selection(d);
    });

  sector_picker
    .append("text")
    .attr("class", "sector-select-label")
    .attr("dx", legendRectSize + 7)
    .attr("dy", "0.9em")
    .html(function (d) {
      if (d.length > 30) {
        return d.substr(0, 27) + "...";
      } else {
        return d;
      }
    })
    .on("click", function (d) {
      sector_select(d);
    });

  function manage_selection(sector_choice) {
    const index = currently_selected.indexOf(sector_choice);
    if (index >= 0) {
      currently_selected.splice(index, 1);
    } else {
      currently_selected.push(sector_choice);
    }

    sector_picker.selectAll("rect").attr("fill", function (v) {
      if (currently_selected.indexOf(v) >= 0) {
        return "#000";
      } else {
        return "#fff";
      }
    });
    list_of_naicscodes = [];
    sectors_object.forEach(function (v) {
      if (currently_selected.indexOf(v.key) >= 0) {
        // these are the chosen sectors
        v.values.forEach(function (w) {
          list_of_naicscodes.push(+w.cd_industry);
        });
      }
    });
    reset();
    updateBars();
  }

  function sector_select(sector_choice) {
    filter = sector_choice;
    sectors_object.forEach(function (v) {
      if (v.key == sector_choice) {
        // this is the chosen sector
        list_of_naicscodes = v.values.map(function (w) {
          return +w.cd_industry;
        });
      }
    });
    reset();
    updateBars();
  }

  var statsContainer = sidebarContainer
    .append("div")
    .attr("class", "stats-container");

  statsContainer
    .append("div")
    .html("<i class='fas stats-toggle fa-chevron-up'></i>")
    .on("click", function () {
      if (statsOpen === 1) {
        statsOpen = 0;
        barSVG.style("display", "none");
        d3.select(".stats-toggle").attr(
          "class",
          "fas stats-toggle fa-chevron-down"
        );
        d3.select(".stats-label-drill-0").style("display", "none");
        d3.select(".stats-label-drill-1").style("display", "none");
        d3.select(".stats-label-drill-2").style("display", "none");
        d3.select(".stats-label-drill-3").style("display", "none");
      } else {
        statsOpen = 1;
        barSVG.style("display", "block");
        d3.select(".stats-toggle").attr(
          "class",
          "fas stats-toggle fa-chevron-up"
        );
        d3.select(".stats-label-drill-0").style("display", "inline-block");
        d3.select(".stats-label-drill-1").style("display", "inline-block");
        d3.select(".stats-label-drill-2").style("display", "inline-block");
        d3.select(".stats-label-drill-3").style("display", "inline-block");
      }
    });

  var statsDrillToggle = statsContainer
    .append("div")
    .attr("class", "stats-drill-toggle");

  statsDrillToggle
    .append("div")
    .attr("class", "stats-drill-item stats-drill-city")
    .style("background-color", "#0FAD68")
    .html("By City")
    .on("click", function () {
      bar_options.by = "city";
      d3.select(".stats-drill-zip").style("background-color", "transparent");
      d3.select(".stats-drill-city").style("background-color", "#0FAD68");
      updateBars();
    });

  statsDrillToggle
    .append("div")
    .attr("class", "stats-drill-item stats-drill-zip")
    .html("By Zip")
    .on("click", function () {
      bar_options.by = "zip";
      d3.select(".stats-drill-zip").style("background-color", "#0FAD68");
      d3.select(".stats-drill-city").style("background-color", "transparent");
      updateBars();
    });

  statsDrillToggle
    .append("div")
    .attr("class", "stats-drill-item-alt stats-drill-count")
    .html("#")
    .on("click", function () {
      bar_options.aggregate = "count";
      d3.select(".stats-drill-percentage").style(
        "background-color",
        "transparent"
      );
      d3.select(".stats-drill-count").style("background-color", "#0FAD68");
      updateBars();
    });

  statsDrillToggle
    .append("div")
    .attr("class", "stats-drill-item-alt stats-drill-percentage")
    .style("background-color", "#0FAD68")
    .html("%")
    .on("click", function () {
      bar_options.aggregate = "percentage";
      d3.select(".stats-drill-percentage").style("background-color", "#0FAD68");
      d3.select(".stats-drill-count").style("background-color", "transparent");
      updateBars();
    });

  var barContainer = statsContainer
    .append("div")
    .attr("class", "stats-bar-container")
    .style("height", window.innerHeight - 125 + "px");

  barSVG = barContainer.append("svg").attr("width", 370);

  get_data(initState);

  function updateBars() {
    barSVG.selectAll("*").remove();

    var loan_range = [
      "$150,000-350,000",
      "$350,000-1 million",
      "$1-2 million",
      "$2-5 million",
      "$5-10 million",
    ];

    var processed_data = data.filter(function (v) {
      return list_of_naicscodes.indexOf(+v.NAICSCode) >= 0;
    });

    bar_data = d3
      .nest()
      .key(function (d) {
        if (bar_options.by == "city") {
          return d.City;
        } else {
          return d.Zip;
        }
      })
      .key(function (d) {
        return d.LoanRange;
      })
      .sortKeys(function (a, b) {
        return d3.ascending(loan_range.indexOf(a), loan_range.indexOf(b));
      })
      .entries(processed_data);

    var statsHeight = 20 + (5 + 20) * bar_data.length;

    barSVG.attr("height", statsHeight);

    bar_scale = d3.scaleLinear().range([0, 180]);

    if (bar_options.aggregate == "percentage") {
      bar_scale.domain([0, 1]);
    } else {
      var max = d3.max(bar_data, function (v) {
        return d3.sum(v.values, function (u) {
          return u.values.length;
        });
      });
      bar_scale.domain([0, max]);
    }
    legendColorScale = d3.scaleOrdinal().domain(loan_range).range(colors);

    bar_data.forEach(function (v, o) {
      var n = d3.sum(v.values, function (u) {
        return u.values.length;
      });

      barSVG
        .selectAll("bars")
        .data(v.values)
        .enter()
        .append("rect")
        .attr("class", "bars")
        .style("cursor", "pointer")
        .attr("fill", function (d) {
          return legendColorScale(d.key);
        })
        .attr("x", function (d, i) {
          init = 0;
          v.values.forEach(function (u, idx) {
            if (i == idx) {
              d.init = init + "";
            } else {
              if (bar_options.aggregate == "percentage") {
                init += u.values.length / n;
              } else {
                init += u.values.length;
              }
            }
          });
          return 70 + bar_scale(+d.init);
        })
        .attr("y", function (d) {
          return o * 25;
        })
        .attr("width", function (d) {
          if (bar_options.aggregate == "percentage") {
            return bar_scale(d.values.length / n);
          } else {
            return bar_scale(d.values.length);
          }
        })
        .attr("height", 20)
        .on("mouseover", function (d) {
          legend_bar_mouseover(v, d, n);
        })
        .on("mousemove", function () {
          moveLegendTooltip();
        })
        .on("mouseout", function () {
          legendMouseOut();
        });
    });

    barSVG
      .selectAll(".bar-label")
      .data(bar_data)
      .enter()
      .append("text")
      .attr("class", "bar-label")
      .attr("x", 0)
      .attr("y", function (d, i) {
        return i * 25 + 15;
      })
      .text(function (d) {
        return d.key;
      })
      .style("cursor", "pointer");
  }

  function updateStats() {
    drill_key.push(key);
    global_key = key;
    global_drill_level = drill_level;
    drill_key = drill_key.slice(0, drill_level + 1);
    barSVG.selectAll("*").remove();

    var loan_range = [
      "$150,000-350,000",
      "$350,000-1 million",
      "$1-2 million",
      "$2-5 million",
      "$5-10 million",
    ];

    var processed_data = data;

    if (drill_level == 0) {
      processed_data = processed_data.filter(function (v) {
        /*if (filter == "All Sectors") {
          return v;
        } else {*/
        return list_of_naicscodes.indexOf(+v.NAICSCode) >= 0;
        //}
      });
      bar_data = d3
        .nest()
        .key(function (d) {
          return d.State;
        })
        .key(function (d) {
          return d.LoanRange;
        })
        .sortKeys(function (a, b) {
          return d3.ascending(loan_range.indexOf(a), loan_range.indexOf(b));
        })
        .entries(processed_data);

      results = bar_data;
    } else {
      if (drill_level == 1) {
        processed_data = processed_data
          .filter(function (v) {
            /*if (filter == "All Sectors") {
              return v;
            } else {*/
            return list_of_naicscodes.indexOf(+v.NAICSCode) >= 0;
            //}
          })
          .filter(function (v) {
            return v.State == drill_key[1];
          });

        if (drill_type == "city") {
          bar_data = d3
            .nest()
            .key(function (d) {
              return d.City;
            })
            .key(function (d) {
              return d.LoanRange;
            })
            .sortKeys(function (a, b) {
              return d3.ascending(loan_range.indexOf(a), loan_range.indexOf(b));
            })
            .entries(processed_data);
        } else {
          bar_data = d3
            .nest()
            .key(function (d) {
              return d.Zip;
            })
            .key(function (d) {
              return d.LoanRange;
            })
            .sortKeys(function (a, b) {
              return d3.ascending(loan_range.indexOf(a), loan_range.indexOf(b));
            })
            .entries(processed_data);
        }
        results = bar_data;
      } else {
        processed_data = processed_data.filter(function (v) {
          /*if (filter == "All Sectors") {
            return v;
          } else {*/
          return list_of_naicscodes.indexOf(+v.NAICSCode) >= 0;
          //}
        });

        processed_data_2 = processed_data.filter(function (v) {
          return v.State == drill_key[1];
        });

        bar_data_1 = d3
          .nest()
          .key(function (d) {
            return d.State;
          })
          .key(function (d) {
            return d.LoanRange;
          })
          .sortKeys(function (a, b) {
            return d3.ascending(loan_range.indexOf(a), loan_range.indexOf(b));
          })
          .entries(processed_data);

        bar_data_0 = d3
          .nest()
          .key(function (d) {
            return d.LoanRange;
          })
          .sortKeys(function (a, b) {
            return d3.ascending(loan_range.indexOf(a), loan_range.indexOf(b));
          })
          .entries(processed_data);

        results = [];
        if (drill_type == "city") {
          bar_data_2 = d3
            .nest()
            .key(function (d) {
              return d.City;
            })
            .key(function (d) {
              return d.LoanRange;
            })
            .sortKeys(function (a, b) {
              return d3.ascending(loan_range.indexOf(a), loan_range.indexOf(b));
            })
            .entries(processed_data_2);
        } else {
          bar_data_2 = d3
            .nest()
            .key(function (d) {
              return d.Zip;
            })
            .key(function (d) {
              return d.LoanRange;
            })
            .sortKeys(function (a, b) {
              return d3.ascending(loan_range.indexOf(a), loan_range.indexOf(b));
            })
            .entries(processed_data_2);
        }

        bar_data_2.forEach(function (v) {
          if (v.key == drill_key[2]) {
            results.push(v);
          }
        });
        bar_data_1.forEach(function (v) {
          if (v.key == drill_key[1]) {
            results.push(v);
          }
        });
        results.push({ key: "US", values: bar_data_0 });
      }
    }

    if (drill_level == 0) {
      d3.select(".stats-label-drill-0")
        .style("display", "inline-block")
        .html("");
      d3.select(".stats-label-drill-1").style("display", "none").html("");
      d3.select(".stats-label-drill-2").style("display", "none").html("");
      d3.select(".stats-label-drill-3").style("display", "none").html("");
      d3.selectAll(".stats-drill-item").style("display", "none");
      d3.select(".stats-toggle").style("top", "-10px");
    } else {
      if (drill_level == 1) {
        d3.select(".stats-label-drill-0")
          .style("display", "inline-block")
          .html("US");
        d3.select(".stats-label-drill-1")
          .style("display", "inline-block")
          .html(" > " + key);
        d3.select(".stats-drill-toggle").style("display", "block");
        d3.select(".stats-toggle").style("top", "-10px");
        d3.selectAll(".stats-drill-item").style("display", "inline-block");
        d3.select(".stats-label-drill-2").style("display", "none").html("");
        d3.select(".stats-label-drill-3").style("display", "none").html("");
      } else {
        d3.select(".stats-label-drill-0")
          .style("display", "inline-block")
          .html("US");
        d3.select(".stats-label-drill-1")
          .style("display", "inline-block")
          .html(" > " + drill_key[1]);
        d3.select(".stats-label-drill-2")
          .style("display", "inline-block")
          .html(" > " + drill_key[2]);
        d3.select(".stats-drill-toggle").style("display", "block");
        d3.select(".stats-toggle").style("top", "-10px");
        d3.selectAll(".stats-drill-item").style("display", "none");
        d3.select(".stats-label-drill-3").style("display", "none").html("");
      }
    }

    var statsHeight = 20 + (5 + 20) * results.length;

    if (drill_level == 3) {
      statsHeight = 20 + (5 + 20) * 3;
    }

    barSVG.attr("height", statsHeight);

    bar_scale = d3.scaleLinear().domain([0, 1]).range([50, 340]);

    legendColorScale = d3.scaleOrdinal().domain(loan_range).range(colors);

    results.forEach(function (v, o) {
      var n = d3.sum(v.values, function (u) {
        return u.values.length;
      });
      barSVG
        .selectAll("bars")
        .data(v.values)
        .enter()
        .append("rect")
        .attr("class", "bars")
        .attr("fill", "blue")
        .style("cursor", "pointer")
        .attr("fill", function (d) {
          return legendColorScale(d.key);
        })
        .attr("x", function (d, i) {
          init = 0;
          v.values.forEach(function (u, idx) {
            if (i == idx) {
              d.init = init + "";
            } else {
              init += u.values.length / n;
            }
          });
          return 30 + bar_scale(+d.init);
        })
        .attr("y", function (d) {
          return o * 25;
        })
        .attr("width", function (d) {
          return bar_scale(d.values.length / n);
        })
        .attr("height", 20)
        .on("mouseover", function (d) {
          legend_bar_mouseover(v, d, n);
        })
        .on("mousemove", function () {
          moveLegendTooltip();
        })
        .on("mouseout", function () {
          legendMouseOut();
        });
    });

    barSVG
      .selectAll(".bar-label")
      .data(results)
      .enter()
      .append("text")
      .attr("class", "bar-label")
      .attr("x", 0)
      .attr("y", function (d, i) {
        return i * 25 + 15;
      })
      .text(function (d) {
        if ((drill_level == 1 || drill_level == 2) && drill_type == "zip") {
          return +d.key;
        } else {
          return d.key;
        }
      })
      .style("cursor", "pointer")
      .on("click", function (d) {
        if (drill_level === 0) {
          updateStats(d.key, 1);
        } else {
          if (drill_level == 1) {
            updateStats(d.key, 2);
          } else {
            if (drill_level == 2) {
              updateStats(d.key, 3);
            }
          }
        }
      });
  }

  function reset() {
    bounds_NE = map.getBounds()._northEast;
    bounds_SW = map.getBounds()._southWest;

    if (featureCircle != null) {
      featureCircle.remove();
    }

    filtered_data = data.filter(function (v) {
      return (
        list_of_naicscodes.indexOf(+v.NAICSCode) >= 0 //|| filter == "All Sectors"
      );
    });

    heatData = [];
    var loan_values = [0.035, 0.1, 0.2, 0.5, 1];
    loanHeatmapScale = d3.scaleOrdinal().domain(loan_range).range(loan_values);

    heat_nest = d3
      .nest()
      .key(function (v) {
        return v["Zip"];
      })
      .rollup(function (v) {
        return d3.sum(v, function (w) {
          return loanHeatmapScale(w.LoanRange);
        });
      })
      .entries(filtered_data);

    /*heat_nest.forEach(function (v) {
      v.location = [zip_json[+v.key][0], zip_json[+v.key][1]];
      v.point = map.latLngToLayerPoint(
        new L.LatLng(v.location[0], v.location[1])
      );
      var tmp_val = doStuff(v.location[1], v.location[0]);
      tmp_val.push(loanHeatmapScale(v.value));
      heatData.push(tmp_val);
    });*/

    filtered_data.forEach(function (v) {
      v.location = [zip_json[+v.Zip][0], zip_json[+v.Zip][1]];
      v.point = map.latLngToLayerPoint(
        new L.LatLng(v.location[0], v.location[1])
      );
      var tmp_val = doStuff(v.location[1], v.location[0]);
      tmp_val.push(loanHeatmapScale(v.LoanRange));
      var test = Math.round(loanHeatmapScale(v.LoanRange) / 0.035);
      for (let i = 0; i <= test; i++) {
        heatData.push(tmp_val);
      }
    });

    featureCircle = g
      .selectAll(".feature-circle")
      .data(filtered_data)
      .enter()
      .append("circle")
      .attr("class", "feature-circle");

    var bounds = path.bounds(),
      topLeft = [
        d3.min(data, function (v) {
          return v.point.x;
        }),
        d3.min(data, function (v) {
          return v.point.y;
        }),
      ];
    bottomRight = [
      d3.max(data, function (v) {
        return v.point.x;
      }),
      d3.max(data, function (v) {
        return v.point.y;
      }),
    ];

    map.eachLayer(function (d) {
      if (d._heat) {
        map.removeLayer(d);
      }
    });

    svg
      .attr("width", bottomRight[0] - topLeft[0] + 100)
      .attr("height", bottomRight[1] - topLeft[1] + 100)
      .style("left", topLeft[0] + "px")
      .style("top", topLeft[1] + "px");

    g.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");

    if (map._zoom < 7) {
      var heat = L.heatLayer(heatData, {
        maxZoom: 11,
        minOpacity: 0.2,
        radius: 20,
      }).addTo(map);
    }

    if (map._zoom >= 7) {
      featureCircle
        .attr("opacity", 1)
        .style("display", function (d) {
          if (
            d.location[0] < bounds_NE.lat &&
            d.location[0] > bounds_SW.lat &&
            d.location[1] < bounds_NE.lng &&
            d.location[1] > bounds_SW.lng
          ) {
            return "block";
          } else {
            return "none";
          }
        })
        //.style("display", "block")
        .attr("fill", function (d) {
          return legendColorScale(d.LoanRange);
        })
        .attr("cx", function (d) {
          return d.point.x;
        })
        .attr("cy", function (d) {
          return d.point.y;
        })
        .attr("r", point_width)
        .on("mouseover", function (d) {
          elementMouseOver(d);
        })
        .on("mousemove", moveTooltip)
        .on("mouseout", elementMouseOut);
    }
  }

  // Use Leaflet to implement a D3 geometric transformation.
  function projectPoint(x, y) {
    var point = map.latLngToLayerPoint(new L.LatLng(y, x));
    this.stream.point(point.x, point.y);
  }

  function elementMouseOver(d) {
    showTooltip(d);
  }

  function legend_bar_mouseover(v, d, n) {
    var name = v.key;
    var bucket_name = d.key;
    var total = d.values.length;
    var percent = Math.round((100 * d.values.length) / n) + "%";

    legend_tooltip.select(".legend-tooltip-name").text(name);
    legend_tooltip.select(".legend-tooltip-bucket").text(bucket_name);
    legend_tooltip
      .select(".legend-tooltip-total")
      .text(total + " (" + percent + ")");

    legend_tooltip.transition().style("opacity", 1);

    const { width, height } = legend_tooltip.node().getBoundingClientRect();
    legend_tooltip.datum({ width, height });
  }

  function moveLegendTooltip() {
    let padding = 10;
    const { width, height } = legend_tooltip.datum();
    let x = d3.event.clientX;
    if (x + padding + width > window.innerWidth) {
      x = x - padding - width;
    } else {
      x = x + padding;
    }
    let y = d3.event.clientY;
    if (y + padding + height > window.innerHeight) {
      y = y - padding - height;
    } else {
      y = y + padding;
    }
    legend_tooltip.style("transform", `translate(${x}px,${y}px)`);
  }

  function legendMouseOut() {
    legend_tooltip.transition().style("opacity", 0);
  }

  function showTooltip(d) {
    var business_name = d.BusinessName;
    var address = d.Address;
    var industry = industry_json[+d.NAICSCode].ds_naics_industry;
    var amount = d.LoanRange;
    var date_approved = d.DateApproved;

    tooltip.select(".tooltip-business_name").text(business_name);
    tooltip.select(".tooltip-address").text(address);
    tooltip.select(".tooltip-industry").text("Industry: " + industry);
    tooltip.select(".tooltip-amount").text("Loan Amount: " + amount);
    tooltip
      .select(".tooltip-date_approved")
      .text("Date Approved: " + date_approved);
    tooltip.transition().style("opacity", 1);

    const { width, height } = tooltip.node().getBoundingClientRect();
    tooltip.datum({ width, height });
  }

  function doStuff(x, y) {
    //console.log(e.latlng);
    // coordinates in tile space
    //var x = e.layerPoint.x;
    //var y = e.layerPoint.y;
    //console.log([x, y]);

    // calculate point in xy space
    var pointXY = L.point(x, y);
    //console.log("Point in x,y space: " + pointXY);

    // convert to lat/lng space
    var pointlatlng = map.layerPointToLatLng(pointXY);
    // why doesn't this match e.latlng?
    //console.log("Point in lat,lng space: " + pointlatlng);

    var test = new L.LatLng(y, x);
    //console.log(" test: " + test);
    return [test.lat, test.lng];
  }

  function moveTooltip() {
    let padding = 10;
    const { width, height } = tooltip.datum();
    let x = d3.event.clientX;
    if (x + padding + width > window.innerWidth) {
      x = x - padding - width;
    } else {
      x = x + padding;
    }
    let y = d3.event.clientY;
    if (y + padding + height > window.innerHeight) {
      y = y - padding - height;
    } else {
      y = y + padding;
    }
    tooltip.style("transform", `translate(${x}px,${y}px)`);
  }

  function elementMouseOut() {
    tooltip.transition().style("opacity", 0);
  }
}
