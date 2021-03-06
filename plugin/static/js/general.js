var graph_padding_delta = 200;
const graph_padding_range = 4;
const graph_padding_idx_map = [];
$(function() {
  var low = 0;
  var high = graph_padding_range - 1;

  while (low <= high) {
    if (low == high) {
      graph_padding_idx_map.push(low);
    } else {
      graph_padding_idx_map.push(low);
      graph_padding_idx_map.push(high);
    }
    low += 1;
    high -= 1;
  }
});

var COLORS = [
  "#29b6f6",
  "#9ccc65",
  "#5c6bc0",
  "#ffca28",
  "#ab47bc",
  "#ff7043",
  "#ef5350",
];

$(function() {
  /* where 150 is the max-width of the .analysis-graph-edge and
   * 50 is the minimum padding to the side of the tab window */
  graph_padding_delta = Math.min(
      $("#results-tabs").width() / 2 - 150 - 50, graph_padding_delta);

  function toggle_write() {
    $("#plugin-tab-content-graph").toggleClass("hide-left-edges",
        !$("#plugin-toggle-write-edges").prop("checked"))
  }
  toggle_write();
  $("#plugin-toggle-write-edges").on("input", toggle_write);

  function toggle_read() {
    $("#plugin-tab-content-graph").toggleClass("hide-right-edges",
        !$("#plugin-toggle-read-edges").prop("checked"))
  }
  toggle_read();
  $("#plugin-toggle-read-edges").on("input", toggle_read);
});

function while_plugin(socket) {

  socket.on("plugin_analysissnippets", function(data) {
    const $tab = $("#plugin-snippets-tab");

    $tab
      .removeClass("loading")
      .toggleClass("error", data.error);

    $tab.find(".tab-body").removeClass("staging");

    if (!data.error) {
      const $content = $tab.find("#plugin-tab-content-snippets");
      $content.empty();

      var node_elems = [];

      var nodes = data.snippet_data.nodes;
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (node === null) {
          node_elems.push(null);
          continue;
        }

        node = node
          .replace(/\t/g, " ")
          .replace(/\n/g, "<br>")
          .replace(/ /g, "&nbsp;");

        var $elem = $(
          '<div class="snippet-container">' +
            '<div class="snippet-node">' +
              node +
            '</div>' +
          '</div>'
        );

        var $snippet_node = $elem.find(".snippet-node");

        $snippet_node
          .mouseenter(function() {
            var snippetgroup = this.getAttribute("snippetgroup");
            if (snippetgroup !== null) {
              $content.find(".snippet-container")
                  .toggleClass("inactive", true);
              $content.find(".snippet-group-" + snippetgroup)
                  .toggleClass("inactive", false);
            }
          })
          .mouseleave(function() {
            $content.find(".snippet-container")
              .toggleClass("inactive", false);
          });

        $content.append($elem);
        node_elems.push({
          container: $elem,
          node: $snippet_node,
        });
      }

      var snippets = data.snippet_data.snippets;
      var color_idx = 0;
      for (var i = 0; i < snippets.length; i++) {
        var snippet = snippets[i];
        var color = COLORS[color_idx % COLORS.length];
        color_idx += 1;
        snippet.sort(function(a, b) {
          return parseInt(a) - parseInt(b);
        })
        for (var j = 0; j < snippet.length; j++) {
          var node_obj = node_elems[snippet[j]];

          node_obj.node
            .css("background", color)
            .attr("snippetgroup", i);

          node_obj.container.addClass("snippet-group-" + i);

          if (j < snippet.length - 1) {
            var next_idx = snippet[j + 1];

            var contiguous = true;
            for (var k = snippet[j] + 1; k < next_idx; k++) {
              if (node_elems[k] !== null) {
                contiguous = false;
                break;
              }
            }

            if (contiguous) {
              node_obj.container.addClass("merge-next");
            }
          }
        }
      }
    }
  });

  socket.on("plugin_analysisgraph", function(data) {
    const $tab = $("#plugin-graph-tab");

    $tab
      .removeClass("loading")
      .toggleClass("error", data.error);

    $tab.find(".tab-body").removeClass("staging");

    if (!data.error) {
      const $content = $tab.find("#plugin-tab-content-graph .body");
      $content.empty();

      var nodes = [];

      const edge_settings = {
        left: {
          cls: "analysis-graph-edge left-edge",
          padding_css: "paddingRight",
          cnt: 0,
        },
        right: {
          cls: "analysis-graph-edge right-edge",
          padding_css: "paddingLeft",
          cnt: 0,
        },
      };
      function draw_edge(i, j, side) {
        const node1 = nodes[i];
        const node2 = nodes[j];

        const mid1 = node1.position().top + node1.outerHeight(true) / 2.0;
        const mid2 = node2.position().top + node2.outerHeight(true) / 2.0;

        var $edge = $(
          '<div class="analysis-graph-elem ' + edge_settings[side].cls + '">' +
          '</div>'
        );

        function add_classes($elem) {
          $elem
            .addClass("edge-connected-" + i)
            .addClass("edge-connected-" + j);
        }

        add_classes($edge);
        add_classes(node1);
        add_classes(node2);

        const _idx = graph_padding_idx_map[
            edge_settings[side].cnt % graph_padding_range];
        const padding = ((_idx + 1) *
            (graph_padding_delta / graph_padding_range));

        /* in height: -2 is the border width of the edge */
        $edge
          .css("height", Math.max(mid1, mid2) - Math.min(mid1, mid2) - 2)
          .css("top", Math.min(mid1, mid2))
          .css(edge_settings[side].padding_css, padding);

        $content.append($edge);
        edge_settings[side].cnt += 1;
      }

      const $tab_content = $content.parents(".tab-content");

      const tab_content_display = $tab_content.css("display");
      $tab_content.css("display", "").css("visibility", "hidden");

      var graph = data.graph;
      for (var i = 0; i < graph.length; i++) {
        var node = graph[i];
        var $elem = $(
          '<div class="analysis-graph-node-container analysis-graph-elem">' +
            '<div class="analysis-graph-node" nodeid="' + i + '">' +
              node.label +
            '</div>' +
          '</div>'
        );
        $content.append($elem);
        nodes.push($elem);

        if (node.write_edges.length > 0) {
          for (var j = 0; j < node.write_edges.length; j++) {
            draw_edge(node.write_edges[j], i, "left");
          }
        }

        if (node.read_edges.length > 0) {
          for (var j = 0; j < node.read_edges.length; j++) {
            draw_edge(node.read_edges[j], i, "right");
          }
        }

        $elem.find(".analysis-graph-node")
          .mouseenter(function() {
            $content.find(".analysis-graph-elem")
                .toggleClass("inactive", true);
            $content.find(".edge-connected-" + this.getAttribute("nodeid"))
                .toggleClass("inactive", false)
                .toggleClass("active", true);
          })
          .mouseleave(function() {
            $content.find(".analysis-graph-elem")
              .toggleClass("inactive", false)
              .toggleClass("active", false);
          });
      }

      $tab_content.css("display", tab_content_display).css("visibility", "");

    }

  });
}
