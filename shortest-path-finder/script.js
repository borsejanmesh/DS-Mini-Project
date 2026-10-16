/* =====================================================================
   SHORTEST PATH FINDER  -  Dijkstra's Algorithm
   Data Structures Mini Project

   Data structures used:
     1. Graph stored as an ADJACENCY LIST
          adjList = { A: [ {node: "B", weight: 5}, {node: "C", weight: 2} ], ... }
     2. Binary MIN-HEAP used as the PRIORITY QUEUE in Dijkstra
     3. distances  map : node -> shortest distance found so far
     4. previous   map : node -> node we came from (for path reconstruction)
     5. visited    set : nodes whose shortest distance is final
   ===================================================================== */

// ---------------------------------------------------------------------
// 1. GRAPH (adjacency list + node positions for drawing)
// ---------------------------------------------------------------------
let graph = createGraph();

function createGraph() {
  return {
    adjList: {},   // node -> array of { node, weight }
    positions: {}  // node -> { x, y }   (only used for drawing)
  };
}

function addNode(name, x, y) {
  graph.adjList[name] = [];
  graph.positions[name] = { x: x, y: y };
}

// Adds an undirected edge. If the edge already exists, its weight is updated.
function addEdge(from, to, weight) {
  const existing = graph.adjList[from].find(e => e.node === to);
  if (existing) {
    existing.weight = weight;
    graph.adjList[to].find(e => e.node === from).weight = weight;
    return "updated";
  }
  graph.adjList[from].push({ node: to, weight: weight });
  graph.adjList[to].push({ node: from, weight: weight });
  return "added";
}

function removeEdge(from, to) {
  graph.adjList[from] = graph.adjList[from].filter(e => e.node !== to);
  graph.adjList[to] = graph.adjList[to].filter(e => e.node !== from);
}

function removeNode(name) {
  // First remove every edge that points to this node, then the node itself
  for (const edge of graph.adjList[name]) {
    graph.adjList[edge.node] = graph.adjList[edge.node].filter(e => e.node !== name);
  }
  delete graph.adjList[name];
  delete graph.positions[name];
}

function getNodes() {
  return Object.keys(graph.adjList).sort();
}

// Returns each undirected edge once: [{ from, to, weight }]
function getEdges() {
  const edges = [];
  for (const from of getNodes()) {
    for (const e of graph.adjList[from]) {
      if (from < e.node) edges.push({ from: from, to: e.node, weight: e.weight });
    }
  }
  return edges;
}

function loadSampleGraph() {
  graph = createGraph();
  addNode("A", 140, 110);
  addNode("B", 500, 110);
  addNode("C", 140, 320);
  addNode("D", 500, 320);
  addEdge("A", "B", 5);
  addEdge("A", "C", 2);
  addEdge("B", "D", 3);
  addEdge("C", "D", 1);
}

// ---------------------------------------------------------------------
// 2. PRIORITY QUEUE (binary min-heap ordered by distance)
//    push and pop both take O(log n) time.
// ---------------------------------------------------------------------
class MinHeap {
  constructor() {
    this.items = []; // each item is { node, distance }
  }

  isEmpty() {
    return this.items.length === 0;
  }

  push(node, distance) {
    this.items.push({ node: node, distance: distance });
    this.bubbleUp(this.items.length - 1);
  }

  // Removes and returns the item with the SMALLEST distance
  pop() {
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }

  bubbleUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.items[parent].distance <= this.items[i].distance) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }

  bubbleDown(i) {
    const n = this.items.length;
    while (true) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      let smallest = i;
      if (left < n && this.items[left].distance < this.items[smallest].distance) smallest = left;
      if (right < n && this.items[right].distance < this.items[smallest].distance) smallest = right;
      if (smallest === i) break;
      [this.items[smallest], this.items[i]] = [this.items[i], this.items[smallest]];
      i = smallest;
    }
  }
}

// ---------------------------------------------------------------------
// 3. DIJKSTRA'S ALGORITHM (implemented from scratch)
//
//    Returns:
//      distances : shortest distance from source to every node reached
//      previous  : previous node on the best route (for reconstructPath)
//      steps     : a log of every action, used by visualizeAlgorithm()
// ---------------------------------------------------------------------
function dijkstra(source, target) {
  const distances = {};
  const previous = {};
  const visited = new Set();
  const steps = [];

  // STEP 1: distance to the source is 0, every other node is Infinity
  for (const node of getNodes()) {
    distances[node] = Infinity;
    previous[node] = null;
  }
  distances[source] = 0;

  // STEP 2: put the source into the priority queue
  const pq = new MinHeap();
  pq.push(source, 0);
  steps.push({ type: "init", distances: { ...distances } });

  // STEP 3: repeat until the queue is empty
  while (!pq.isEmpty()) {
    // Select the unvisited node with the SMALLEST distance
    const { node: current, distance: currentDist } = pq.pop();

    // The heap may contain old (larger) entries for a node we have already
    // finalised. Skip them - this is called "lazy deletion".
    if (visited.has(current)) continue;

    visited.add(current); // its shortest distance is now final
    steps.push({ type: "visit", node: current, distance: currentDist, visitedCount: visited.size });

    // Stop early once the destination is finalised
    if (current === target) {
      steps.push({ type: "reached", node: current, distance: currentDist });
      break;
    }

    // STEP 4: explore every neighbour of the current node
    for (const edge of graph.adjList[current]) {
      const neighbour = edge.node;
      if (visited.has(neighbour)) continue;

      const oldDistance = distances[neighbour];
      const newDistance = currentDist + edge.weight;

      // RELAXATION: is going through 'current' shorter than the best known route?
      const improved = newDistance < oldDistance;
      if (improved) {
        distances[neighbour] = newDistance;   // update the distance
        previous[neighbour] = current;        // remember how we got here
        pq.push(neighbour, newDistance);      // add to the priority queue
      }

      steps.push({
        type: "relax",
        from: current,
        to: neighbour,
        weight: edge.weight,
        oldDistance: oldDistance,
        newDistance: newDistance,
        updated: improved
      });
    }
  }

  steps.push({ type: "done" });
  return { distances: distances, previous: previous, visited: visited, steps: steps };
}

// ---------------------------------------------------------------------
// 4. PATH RECONSTRUCTION
//    Walk backwards from the target using the 'previous' map,
//    then reverse the list to get source -> target.
// ---------------------------------------------------------------------
function reconstructPath(previous, source, target) {
  const path = [];
  let node = target;
  while (node !== null) {
    path.push(node);
    if (node === source) break;
    node = previous[node];
  }
  path.reverse();
  return path[0] === source ? path : []; // empty list = no path
}

// =====================================================================
//                    USER INTERFACE  (drawing + events)
// =====================================================================
const svg = document.getElementById("graph");
const SVG_NS = "http://www.w3.org/2000/svg";
const NODE_RADIUS = 24;

const ui = {
  startSelect: document.getElementById("startNode"),
  endSelect: document.getElementById("endNode"),
  findBtn: document.getElementById("findBtn"),
  visualizeBtn: document.getElementById("visualizeBtn"),
  resetBtn: document.getElementById("resetBtn"),
  speed: document.getElementById("speed"),
  message: document.getElementById("message"),
  statCurrent: document.getElementById("statCurrent"),
  statDistance: document.getElementById("statDistance"),
  statVisited: document.getElementById("statVisited"),
  statStep: document.getElementById("statStep"),
  resultPath: document.getElementById("resultPath"),
  resultDistance: document.getElementById("resultDistance"),
  distTable: document.getElementById("distTable"),
  graphSize: document.getElementById("graphSize")
};

// Visual state of nodes and edges (used only for colouring)
let nodeState = {};       // node -> "visited" | "current" | "evaluating" | "path"
let edgeState = {};       // "A|B" -> "evaluating" | "path"
let nodeLabels = {};      // node -> distance text shown under the node
let animationId = 0;      // changes on reset to cancel a running animation

function edgeKey(a, b) {
  return a < b ? a + "|" + b : b + "|" + a;
}

function renderGraph() {
  svg.innerHTML = "";
  const nodes = getNodes();

  if (nodes.length === 0) {
    const t = document.createElementNS(SVG_NS, "text");
    t.setAttribute("x", 320); t.setAttribute("y", 210);
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("fill", "#667085");
    t.textContent = "Graph is empty - add nodes or load the sample graph.";
    svg.appendChild(t);
  }

  // Draw edges first so that nodes appear on top
  for (const e of getEdges()) {
    const p1 = graph.positions[e.from];
    const p2 = graph.positions[e.to];
    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("x1", p1.x); line.setAttribute("y1", p1.y);
    line.setAttribute("x2", p2.x); line.setAttribute("y2", p2.y);
    line.setAttribute("class", "edge-line " + (edgeState[edgeKey(e.from, e.to)] || ""));
    svg.appendChild(line);

    const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("class", "edge-label");
    const text = String(e.weight);
    const w = 14 + text.length * 8;
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", mx - w / 2); rect.setAttribute("y", my - 12);
    rect.setAttribute("width", w); rect.setAttribute("height", 24); rect.setAttribute("rx", 6);
    const label = document.createElementNS(SVG_NS, "text");
    label.setAttribute("x", mx); label.setAttribute("y", my);
    label.textContent = text;
    g.appendChild(rect); g.appendChild(label);
    svg.appendChild(g);
  }

  // Draw nodes
  for (const name of nodes) {
    const pos = graph.positions[name];
    const g = document.createElementNS(SVG_NS, "g");
    let cls = "node";
    if (nodeState[name]) cls += " " + nodeState[name];
    if (name === ui.startSelect.value) cls += " start";
    if (name === ui.endSelect.value) cls += " end";
    g.setAttribute("class", cls);
    g.dataset.node = name;

    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", pos.x); circle.setAttribute("cy", pos.y);
    circle.setAttribute("r", NODE_RADIUS);
    const text = document.createElementNS(SVG_NS, "text");
    text.setAttribute("x", pos.x); text.setAttribute("y", pos.y);
    text.setAttribute("class", "label");
    text.textContent = name;
    g.appendChild(circle); g.appendChild(text);

    if (nodeLabels[name] !== undefined) {
      const badge = document.createElementNS(SVG_NS, "text");
      badge.setAttribute("x", pos.x); badge.setAttribute("y", pos.y + NODE_RADIUS + 14);
      badge.setAttribute("class", "dist-badge");
      badge.textContent = "d = " + nodeLabels[name];
      g.appendChild(badge);
    }

    enableNodeInteraction(g, name);
    svg.appendChild(g);
  }

  ui.graphSize.textContent = "V = " + nodes.length + ", E = " + getEdges().length;
}

// Click a node to choose Start/End; drag a node to move it
// The node being dragged is stored here; move/up are handled on the <svg>
// itself because renderGraph() re-creates the node elements while dragging.
let drag = null; // { name, moved, startX, startY }

function enableNodeInteraction(g, name) {
  g.addEventListener("pointerdown", (ev) => {
    const pt = toSvgPoint(ev);
    drag = { name: name, moved: false, startX: pt.x, startY: pt.y };
    svg.setPointerCapture(ev.pointerId);
    ev.preventDefault();
  });
}

svg.addEventListener("pointermove", (ev) => {
  if (!drag) return;
  const pt = toSvgPoint(ev);
  const pos = graph.positions[drag.name];
  if (!drag.moved && Math.abs(pt.x - drag.startX) + Math.abs(pt.y - drag.startY) < 6) return;
  drag.moved = true;
  pos.x = Math.max(NODE_RADIUS, Math.min(640 - NODE_RADIUS, pt.x));
  pos.y = Math.max(NODE_RADIUS, Math.min(420 - NODE_RADIUS - 16, pt.y));
  renderGraph();
});

svg.addEventListener("pointerup", () => {
  if (!drag) return;
  const { name, moved } = drag;
  drag = null;
  if (!moved) selectNodeByClick(name);
});

function toSvgPoint(ev) {
  const r = svg.getBoundingClientRect();
  return { x: (ev.clientX - r.left) * 640 / r.width, y: (ev.clientY - r.top) * 420 / r.height };
}

function selectNodeByClick(name) {
  if (!ui.startSelect.value || (ui.startSelect.value && ui.endSelect.value)) {
    ui.startSelect.value = name;
    ui.endSelect.value = "";
    showMessage("Start node set to " + name + ". Now click the destination node.", "info");
  } else {
    ui.endSelect.value = name;
    showMessage("End node set to " + name + ". Press Find Shortest Path or Visualize Algorithm.", "info");
  }
  clearHighlights();
  renderGraph();
}

// Fill all dropdowns with the current nodes / edges
function refreshDropdowns() {
  const nodes = getNodes();
  const keepStart = ui.startSelect.value, keepEnd = ui.endSelect.value;

  const fill = (select, placeholder, keep) => {
    select.innerHTML = "";
    const empty = document.createElement("option");
    empty.value = ""; empty.textContent = placeholder;
    select.appendChild(empty);
    for (const n of nodes) {
      const o = document.createElement("option");
      o.value = n; o.textContent = n;
      select.appendChild(o);
    }
    select.value = nodes.includes(keep) ? keep : "";
  };

  fill(ui.startSelect, "-- select start --", keepStart);
  fill(ui.endSelect, "-- select end --", keepEnd);
  fill(document.getElementById("edgeFrom"), "From", document.getElementById("edgeFrom").value);
  fill(document.getElementById("edgeTo"), "To", document.getElementById("edgeTo").value);
  fill(document.getElementById("deleteNodeSelect"), "Select node", "");

  const delEdge = document.getElementById("deleteEdgeSelect");
  delEdge.innerHTML = '<option value="">Select edge</option>';
  for (const e of getEdges()) {
    const o = document.createElement("option");
    o.value = e.from + "|" + e.to;
    o.textContent = e.from + " – " + e.to + " (" + e.weight + ")";
    delEdge.appendChild(o);
  }
}

function showMessage(text, type) {
  ui.message.textContent = text;
  ui.message.className = "message " + (type || "info");
}

function formatDist(d) {
  return d === Infinity ? "∞" : String(+d.toFixed(2));
}

// ---------------------------------------------------------------------
// INPUT VALIDATION (error handling)
// ---------------------------------------------------------------------
function validateSelection() {
  const nodes = getNodes();
  const start = ui.startSelect.value, end = ui.endSelect.value;

  if (nodes.length === 0) return "The graph is empty. Add nodes or load the sample graph.";
  if (!start || !end) return "Please select both a start node and an end node.";
  if (!graph.adjList[start] || !graph.adjList[end]) return "Invalid node selection. Please choose nodes from the list.";
  if (start === end) return "Start and end nodes are the same (" + start + "). Please choose two different nodes.";
  return null; // no error
}

// ---------------------------------------------------------------------
// DISPLAY HELPERS
// ---------------------------------------------------------------------
function displayResult(path, distance) {
  if (path.length === 0) {
    ui.resultPath.textContent = "No path exists";
    ui.resultDistance.textContent = "∞";
    showMessage("No path exists between " + ui.startSelect.value + " and " + ui.endSelect.value + ".", "error");
    return;
  }
  ui.resultPath.textContent = path.join(" → ");
  ui.resultDistance.textContent = formatDist(distance) + " km";
  showMessage("Shortest path found: " + path.join(" → ") + " (" + formatDist(distance) + " km).", "success");
}

function highlightPath(path) {
  for (let i = 0; i < path.length; i++) {
    nodeState[path[i]] = "path";
    if (i > 0) edgeState[edgeKey(path[i - 1], path[i])] = "path";
  }
  renderGraph();
}

function updateDistanceTable(distances, previous, visited, current, updatedNode) {
  ui.distTable.innerHTML = "";
  for (const n of getNodes()) {
    const tr = document.createElement("tr");
    if (n === updatedNode) tr.className = "updated";
    let status = "Unvisited";
    if (visited.has(n)) status = "Visited";
    if (n === current) status = "Current";
    const d = distances[n] === undefined ? Infinity : distances[n];
    tr.innerHTML = "<td>" + n + "</td><td>" + formatDist(d) + "</td><td>" +
      (previous[n] || "–") + "</td><td>" + status + "</td>";
    ui.distTable.appendChild(tr);
  }
}

function clearHighlights() {
  nodeState = {};
  edgeState = {};
  nodeLabels = {};
}

// ---------------------------------------------------------------------
// FIND SHORTEST PATH (instant)
// ---------------------------------------------------------------------
function findShortestPath() {
  animationId++; // stop any running visualization
  setButtonsDisabled(false);
  clearHighlights();
  const error = validateSelection();
  if (error) { showMessage(error, "error"); renderGraph(); return; }

  const start = ui.startSelect.value, end = ui.endSelect.value;
  const result = dijkstra(start, end);
  const path = reconstructPath(result.previous, start, end);

  for (const n of getNodes()) nodeLabels[n] = formatDist(result.distances[n]);
  updateDistanceTable(result.distances, result.previous, result.visited, null, null);
  ui.statVisited.textContent = result.visited.size;
  ui.statCurrent.textContent = end;
  ui.statDistance.textContent = formatDist(result.distances[end]);
  ui.statStep.textContent = "Dijkstra finished. " + result.visited.size + " node(s) were visited.";

  displayResult(path, result.distances[end]);
  highlightPath(path);
}

// ---------------------------------------------------------------------
// VISUALIZE ALGORITHM (step by step animation of the real dijkstra() run)
// ---------------------------------------------------------------------
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function setButtonsDisabled(disabled) {
  ui.findBtn.disabled = disabled;
  ui.visualizeBtn.disabled = disabled;
}

async function visualizeAlgorithm() {
  clearHighlights();
  const error = validateSelection();
  if (error) { showMessage(error, "error"); renderGraph(); return; }

  const myId = ++animationId;
  setButtonsDisabled(true);
  showMessage("Visualizing Dijkstra's algorithm...", "info");
  ui.resultPath.textContent = "–";
  ui.resultDistance.textContent = "–";

  const start = ui.startSelect.value, end = ui.endSelect.value;
  const result = dijkstra(start, end);

  // Replay the recorded steps
  const distances = {}, previous = {}, visited = new Set();
  for (const n of getNodes()) { distances[n] = Infinity; previous[n] = null; }
  let current = null;

  for (const step of result.steps) {
    if (myId !== animationId) return; // reset was pressed
    const delay = 1650 - Number(ui.speed.value);

    if (step.type === "init") {
      distances[start] = 0;
      for (const n of getNodes()) nodeLabels[n] = formatDist(distances[n]);
      ui.statStep.textContent = "Initialise: distance(" + start + ") = 0, all other distances = ∞.";
      updateDistanceTable(distances, previous, visited, null, start);
    }

    if (step.type === "visit") {
      // previous current node becomes 'visited'
      if (current) nodeState[current] = "visited";
      for (const k in edgeState) delete edgeState[k];
      current = step.node;
      visited.add(current);
      nodeState[current] = "current";
      ui.statCurrent.textContent = current;
      ui.statDistance.textContent = formatDist(step.distance);
      ui.statVisited.textContent = step.visitedCount;
      ui.statStep.textContent = "Select " + current + " - the unvisited node with the smallest distance (" + formatDist(step.distance) + ").";
      updateDistanceTable(distances, previous, visited, current, null);
    }

    if (step.type === "relax") {
      nodeState[step.to] = "evaluating";
      edgeState[edgeKey(step.from, step.to)] = "evaluating";
      if (step.updated) {
        distances[step.to] = step.newDistance;
        previous[step.to] = step.from;
        nodeLabels[step.to] = formatDist(step.newDistance);
        ui.statStep.textContent = "Check " + step.from + " → " + step.to + ": " + formatDist(distances[step.from]) + " + " +
          step.weight + " = " + formatDist(step.newDistance) + " < " + formatDist(step.oldDistance) +
          ", so update distance(" + step.to + ") = " + formatDist(step.newDistance) + ".";
      } else {
        ui.statStep.textContent = "Check " + step.from + " → " + step.to + ": " + formatDist(step.newDistance) +
          " is not smaller than " + formatDist(step.oldDistance) + ", so no change.";
      }
      updateDistanceTable(distances, previous, visited, current, step.to);
      renderGraph();
      await sleep(delay);
      if (myId !== animationId) return;
      if (nodeState[step.to] === "evaluating") delete nodeState[step.to];
      delete edgeState[edgeKey(step.from, step.to)];
      continue;
    }

    if (step.type === "reached") {
      ui.statStep.textContent = "Destination " + step.node + " has been finalised with distance " + formatDist(step.distance) + ". Stopping.";
    }

    if (step.type === "done") {
      if (current) nodeState[current] = "visited";
    }

    renderGraph();
    await sleep(delay);
  }

  if (myId !== animationId) return;
  const path = reconstructPath(result.previous, start, end);
  displayResult(path, result.distances[end]);
  if (path.length) ui.statStep.textContent = "Path reconstructed using the previous-node map: " + path.join(" → ") + ".";
  else ui.statStep.textContent = "The queue became empty before reaching " + end + ", so no path exists.";
  highlightPath(path);
  setButtonsDisabled(false);
}

// ---------------------------------------------------------------------
// RESET
// ---------------------------------------------------------------------
function resetGraph() {
  animationId++; // cancels a running animation
  setButtonsDisabled(false);
  ui.startSelect.value = "";
  ui.endSelect.value = "";
  clearHighlights();
  ui.resultPath.textContent = "–";
  ui.resultDistance.textContent = "–";
  ui.statCurrent.textContent = "–";
  ui.statDistance.textContent = "–";
  ui.statVisited.textContent = "0";
  ui.statStep.textContent = 'Press "Visualize Algorithm" to watch Dijkstra run step by step.';
  ui.distTable.innerHTML = "";
  showMessage("Reset done. Select a start and end node.", "info");
  renderGraph();
}

// Called after any change to the graph structure
function graphChanged(msg) {
  animationId++;
  setButtonsDisabled(false);
  clearHighlights();
  ui.distTable.innerHTML = "";
  ui.resultPath.textContent = "–";
  ui.resultDistance.textContent = "–";
  refreshDropdowns();
  renderGraph();
  showMessage(msg, "success");
}

// ---------------------------------------------------------------------
// EDIT GRAPH handlers
// ---------------------------------------------------------------------
function findFreePosition() {
  // Try points on a grid and pick the one farthest from all existing nodes
  let best = { x: 320, y: 200 }, bestGap = -1;
  for (let y = 60; y <= 340; y += 35) {
    for (let x = 60; x <= 580; x += 40) {
      let gap = Infinity;
      for (const p of Object.values(graph.positions)) gap = Math.min(gap, Math.hypot(p.x - x, p.y - y));
      if (gap > bestGap) { bestGap = gap; best = { x: x, y: y }; }
    }
  }
  return best;
}

document.getElementById("addNodeBtn").addEventListener("click", () => {
  const input = document.getElementById("newNodeName");
  const name = input.value.trim().toUpperCase();
  if (!name) return showMessage("Please enter a node name.", "error");
  if (!/^[A-Z0-9_]+$/.test(name)) return showMessage("Node names may only use letters, digits and _.", "error");
  if (graph.adjList[name]) return showMessage("Node " + name + " already exists.", "error");
  const pos = findFreePosition();
  addNode(name, pos.x, pos.y);
  input.value = "";
  graphChanged("Node " + name + " added. Drag it to place it where you like.");
});

document.getElementById("addEdgeBtn").addEventListener("click", () => {
  const from = document.getElementById("edgeFrom").value;
  const to = document.getElementById("edgeTo").value;
  const raw = document.getElementById("edgeWeight").value.trim();
  const weight = Number(raw);

  if (!from || !to) return showMessage("Please select both nodes for the edge.", "error");
  if (from === to) return showMessage("An edge must connect two different nodes.", "error");
  if (raw === "" || !Number.isFinite(weight)) return showMessage("Invalid edge weight. Please enter a number.", "error");
  if (weight <= 0) return showMessage("Invalid edge weight. Dijkstra needs positive weights (no zero or negative values).", "error");

  const result = addEdge(from, to, weight);
  document.getElementById("edgeWeight").value = "";
  graphChanged(result === "updated"
    ? "Weight of edge " + from + " – " + to + " updated to " + weight + "."
    : "Edge " + from + " – " + to + " with weight " + weight + " added.");
});

document.getElementById("deleteNodeBtn").addEventListener("click", () => {
  const name = document.getElementById("deleteNodeSelect").value;
  if (!name) return showMessage("Please select a node to delete.", "error");
  removeNode(name);
  graphChanged("Node " + name + " and its edges were deleted.");
});

document.getElementById("deleteEdgeBtn").addEventListener("click", () => {
  const value = document.getElementById("deleteEdgeSelect").value;
  if (!value) return showMessage("Please select an edge to delete.", "error");
  const [from, to] = value.split("|");
  removeEdge(from, to);
  graphChanged("Edge " + from + " – " + to + " deleted.");
});

document.getElementById("sampleBtn").addEventListener("click", () => {
  loadSampleGraph();
  ui.startSelect.value = "";
  ui.endSelect.value = "";
  graphChanged("Sample graph loaded (A–B 5, A–C 2, B–D 3, C–D 1).");
});

// ---------------------------------------------------------------------
// MAIN BUTTONS + START-UP
// ---------------------------------------------------------------------
ui.findBtn.addEventListener("click", findShortestPath);
ui.visualizeBtn.addEventListener("click", visualizeAlgorithm);
ui.resetBtn.addEventListener("click", resetGraph);
ui.startSelect.addEventListener("change", () => { clearHighlights(); renderGraph(); });
ui.endSelect.addEventListener("change", () => { clearHighlights(); renderGraph(); });

loadSampleGraph();
refreshDropdowns();
ui.startSelect.value = "A";
ui.endSelect.value = "D";
renderGraph();
showMessage("Sample graph loaded. Start = A, End = D. Press Find Shortest Path.", "info");
