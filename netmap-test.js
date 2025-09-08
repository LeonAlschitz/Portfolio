// D3 is loaded globally via script tag in HTML

export function createNetmap(container, { selectedItem = null, showAllDevices = true, onNodeClick, graphId = "graph" } = {}) {
  
  // ============================================================================
  // VARIABLE DECLARATIONS
  // ============================================================================
  
  // Basic variables
  let width = 0;
  let height = 0;
  let simulation;
  let destroyed = false;
  
  // ============================================================================
  // ROBUST STATE MACHINE
  // ============================================================================
  
  // Define possible states
  const INTERACTION_STATES = {
    IDLE: 'idle',
    SHIFT_PRESSED: 'shift_pressed',
    DRAGGING_CHILD: 'dragging_child',
    DRAGGING_PARENT: 'dragging_parent',
    DRAGGING_CHILD_WITH_SHIFT: 'dragging_child_with_shift',
    DRAGGING_PARENT_WITH_SHIFT: 'dragging_parent_with_shift',
    HANDOFF_IN_PROGRESS: 'handoff_in_progress',
    // New states for robust interaction handling
    DRAGGING_CHILD_WITH_SHIFT_COMMITTED: 'dragging_child_with_shift_committed',
    DRAGGING_PARENT_WITH_SHIFT_COMMITTED: 'dragging_parent_with_shift_committed'
  };
  
  // State machine with validation
  const stateMachine = {
    currentState: INTERACTION_STATES.IDLE,
    previousState: null,
    stateHistory: [],
    
    // State data
    data: {
      shiftPressed: false,
      draggedNode: null,
      currentSimulation: null,
      dragStartPosition: { x: 0, y: 0 },
      mousePosition: { x: 0, y: 0 },
      originalChildNode: null,
      originalChildSimulation: null,
      handoffTarget: null
    },
    
    // Valid state transitions
    transitions: {
      [INTERACTION_STATES.IDLE]: [INTERACTION_STATES.SHIFT_PRESSED, INTERACTION_STATES.DRAGGING_CHILD, INTERACTION_STATES.DRAGGING_PARENT],
      [INTERACTION_STATES.SHIFT_PRESSED]: [INTERACTION_STATES.IDLE, INTERACTION_STATES.DRAGGING_CHILD_WITH_SHIFT, INTERACTION_STATES.DRAGGING_PARENT_WITH_SHIFT],
      [INTERACTION_STATES.DRAGGING_CHILD]: [INTERACTION_STATES.IDLE, INTERACTION_STATES.DRAGGING_CHILD_WITH_SHIFT, INTERACTION_STATES.HANDOFF_IN_PROGRESS],
      [INTERACTION_STATES.DRAGGING_PARENT]: [INTERACTION_STATES.IDLE, INTERACTION_STATES.DRAGGING_PARENT_WITH_SHIFT],
      [INTERACTION_STATES.DRAGGING_CHILD_WITH_SHIFT]: [INTERACTION_STATES.DRAGGING_CHILD, INTERACTION_STATES.HANDOFF_IN_PROGRESS, INTERACTION_STATES.IDLE, INTERACTION_STATES.DRAGGING_CHILD_WITH_SHIFT_COMMITTED],
      [INTERACTION_STATES.DRAGGING_PARENT_WITH_SHIFT]: [INTERACTION_STATES.DRAGGING_PARENT, INTERACTION_STATES.IDLE, INTERACTION_STATES.DRAGGING_PARENT_WITH_SHIFT_COMMITTED],
      [INTERACTION_STATES.HANDOFF_IN_PROGRESS]: [INTERACTION_STATES.DRAGGING_PARENT, INTERACTION_STATES.DRAGGING_PARENT_WITH_SHIFT, INTERACTION_STATES.IDLE],
      [INTERACTION_STATES.DRAGGING_CHILD_WITH_SHIFT_COMMITTED]: [INTERACTION_STATES.HANDOFF_IN_PROGRESS, INTERACTION_STATES.IDLE],
      [INTERACTION_STATES.DRAGGING_PARENT_WITH_SHIFT_COMMITTED]: [INTERACTION_STATES.IDLE]
    },
    
    // Transition to new state with validation
    transition: function(newState, data = {}) {
      const validTransitions = this.transitions[this.currentState] || [];
      
      if (!validTransitions.includes(newState)) {
        throw new Error(`Invalid state transition from ${this.currentState} to ${newState}`);
      }
      
      // Store previous state
      this.previousState = this.currentState;
      this.currentState = newState;
      
      // Update state history (keep last 10 states for debugging)
      this.stateHistory.push({
        from: this.previousState,
        to: newState,
        timestamp: Date.now(),
        data: { ...this.data }
      });
      
      if (this.stateHistory.length > 10) {
        this.stateHistory.shift();
      }
      
      // Update data
      Object.assign(this.data, data);
      
      return true;
    },
    
    // Check if we can transition to a state
    canTransition: function(newState) {
      const validTransitions = this.transitions[this.currentState] || [];
      return validTransitions.includes(newState);
    },
    
    // Get current state info
    getStateInfo: function() {
      return {
        current: this.currentState,
        previous: this.previousState,
        data: { ...this.data },
        history: [...this.stateHistory]
      };
    },
    
    // Reset to idle state
    reset: function() {
      console.log('🔄 STATE MACHINE RESET - From:', this.currentState, 'To:', INTERACTION_STATES.IDLE);
      this.previousState = this.currentState;
      this.currentState = INTERACTION_STATES.IDLE;
      this.data = {
        shiftPressed: false,
        draggedNode: null,
        currentSimulation: null,
        dragStartPosition: { x: 0, y: 0 },
        mousePosition: { x: 0, y: 0 },
        originalChildNode: null,
        originalChildSimulation: null,
        handoffTarget: null
      };
      console.log('🔄 State machine reset complete');
    }
  };
  
  // Get container dimensions
  const containerElement = d3.select(container).node();
  width = containerElement.clientWidth;
  height = containerElement.clientHeight;
  
  // Calculate positions for side-by-side layout
  const leftCenterX = width * 0.25;  // Left quarter
  const rightCenterX = width * 0.75; // Right quarter
  const centerY = height / 2;
  
  // Visual constants
  const nodeColor = "#4ecdc4";
  const parentCollisionRadius = 150;
  
  // ============================================================================
  // SIMULATION CONFIGURATIONS
  // ============================================================================
  
  const simulationConfigs = [
    {
      id: "sim1",
      name: "Child Simulation 1",
      containerClass: "child-container-1",
      centerX: leftCenterX,
      centerY: centerY,
      nodes: [
        { id: "node1", name: "Device 1", group: 1 },
        { id: "node2", name: "Device 2", group: 1 },
        { id: "node3", name: "Device 3", group: 2 },
        { id: "node4", name: "Device 4", group: 2 },
        { id: "node5", name: "Device 5", group: 3 },
        { id: "node6", name: "Device 6", group: 3 },
        { id: "node7", name: "Device 7", group: 1 },
        { id: "node8", name: "Device 8", group: 2 },
        { id: "node9", name: "Device 9", group: 3 },
        { id: "node10", name: "Device 10", group: 1 }
      ],
      links: [
        { source: "node1", target: "node2" },
        { source: "node1", target: "node7" },
        { source: "node2", target: "node3" },
        { source: "node3", target: "node4" },
        { source: "node3", target: "node8" },
        { source: "node4", target: "node5" },
        { source: "node5", target: "node6" },
        { source: "node6", target: "node9" },
        { source: "node7", target: "node10" },
        { source: "node8", target: "node9" },
        { source: "node9", target: "node10" }
      ]
    },
    {
      id: "sim2",
      name: "Child Simulation 2",
      containerClass: "child-container-2",
      centerX: rightCenterX,
      centerY: centerY,
      nodes: [
        { id: "server1", name: "Server 1", group: 1 },
        { id: "server2", name: "Server 2", group: 1 },
        { id: "router1", name: "Router 1", group: 2 },
        { id: "router2", name: "Router 2", group: 2 },
        { id: "switch1", name: "Switch 1", group: 3 },
        { id: "switch2", name: "Switch 2", group: 3 },
        { id: "firewall1", name: "Firewall 1", group: 1 },
        { id: "firewall2", name: "Firewall 2", group: 2 },
        { id: "database1", name: "Database 1", group: 3 },
        { id: "database2", name: "Database 2", group: 1 }
      ],
      links: [
        { source: "server1", target: "router1" },
        { source: "server1", target: "firewall1" },
        { source: "server2", target: "router2" },
        { source: "router1", target: "switch1" },
        { source: "router2", target: "switch2" },
        { source: "switch1", target: "firewall2" },
        { source: "switch2", target: "database1" },
        { source: "firewall1", target: "database2" },
        { source: "firewall2", target: "database1" },
        { source: "database1", target: "database2" }
      ]
    }
  ];
  
  // ============================================================================
  // SIMULATION CREATION FUNCTIONS
  // ============================================================================
  
  // Create child simulation function
  function createChildSimulation(nodes, links, centerX, centerY, options = {}) {
    const {
      alpha = 0.3,
      alphaDecay = 0.05,
      alphaMin = 0.1,  // Keep simulation active for draggability
      linkDistance = 80,
      linkStrength = 0.5,
      chargeStrength = -200,
      collisionRadius = 18,
      centerStrength = 0.4   // Center force strength
    } = options;
    
    return d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(linkDistance).strength(linkStrength))
      .force("charge", d3.forceManyBody().strength(chargeStrength))
      .force("center", d3.forceCenter(centerX, centerY).strength(centerStrength))
      .force("collision", d3.forceCollide().radius(collisionRadius))
      .alpha(alpha)
      .alphaDecay(alphaDecay)
      .alphaMin(alphaMin);
  }

  // Create parent simulation function
  function createParentSimulation(nodes, options = {}) {
    const {
      alpha = 0.3,
      alphaDecay = 0.05,
      alphaMin = 0.001,
      linkDistance = 80,
      linkStrength = 0.5,
      chargeStrength = -200,
      collisionRadius = 60,  // Match the green circle radius
      centerStrength = 0.1   // Center force strength
    } = options;
    
    return d3.forceSimulation(nodes)
      .force("charge", d3.forceManyBody().strength(chargeStrength))
      .force("center", d3.forceCenter(width / 2, height / 2).strength(centerStrength))
      .force("collision", d3.forceCollide().radius(collisionRadius))
      .alpha(alpha)
      .alphaDecay(alphaDecay)
      .alphaMin(alphaMin);
  }
  
  // ============================================================================
  // SVG AND ZOOM SETUP
  // ============================================================================
  
  // Create main SVG
  const svg = d3.select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("background-color", "#f8f9fa")
    .style("border", "1px solid #dee2e6");
  
  const g = svg.append("g");
  
  // Add zoom and pan functionality
  const zoom = d3.zoom()
    .scaleExtent([0.1, 10])  // Allow zoom from 0.1x to 10x
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
    })
    .on("end", (event) => {
      // This will trigger when zoom/pan interaction ends (including mouseup)
      handleGlobalMouseUp(event);
    });
  
  svg.call(zoom);
  
  // Set initial zoom and pan to center the content nicely
  const initialTransform = d3.zoomIdentity
    .translate(width * 0.1, height * 0.1)  // Slight offset from top-left
    .scale(0.8);  // Start slightly zoomed out
  svg.call(zoom.transform, initialTransform);
  
  // ============================================================================
  // SIMULATION INITIALIZATION
  // ============================================================================
  
  // Create child simulations and containers
  const childSimulations = simulationConfigs.map(config => {
    const container = g.append("g")
      .attr("class", config.containerClass)
      .attr("transform", `translate(${config.centerX}, ${config.centerY})`);
    
    const simulation = createChildSimulation(config.nodes, config.links, 0, 0);
    
    return {
      id: config.id,
      name: config.name,
      config: config,
      container: container,
      simulation: simulation,
      nodes: config.nodes,
      links: config.links
    };
  });
  
  // Create parent nodes representing the child simulation containers
  const parentNodes = childSimulations.map(childSim => ({
    id: childSim.id,
    name: childSim.name,
    container: childSim.container,
    simulation: null
  }));
  
  // Create parent simulation with collision
  const parentSimulation = createParentSimulation(parentNodes, {
    collisionRadius: parentCollisionRadius
  });
  
  // Add parent simulation reference to all child simulations
  childSimulations.forEach(childSim => {
    childSim.parentSimulation = parentSimulation;
  });
  
  // ============================================================================
  // VISUAL ELEMENTS CREATION
  // ============================================================================
  
  // Helper function to create links for a simulation
  function createLinks(container, links, className) {
    return container.append("g")
      .attr("class", className)
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 2);
  }
  
  // Helper function to create nodes for a simulation
  function createNodes(container, nodes, className, simulation) {
    const nodeSelection = container.append("g")
      .attr("class", className)
      .selectAll("g")
      .data(nodes)
      .enter().append("g")
      .attr("class", "node")
      .call(d3.drag()
        .on("start", (event, d) => dragstarted(event, d, simulation))
        .on("drag", (event, d) => dragged(event, d, simulation))
        .on("end", (event, d) => dragended(event, d, simulation)));
    
    // Add circles to nodes
    nodeSelection.append("circle")
      .attr("r", 12)
      .attr("fill", nodeColor)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);
    
    // Add labels to nodes
    nodeSelection.append("text")
      .attr("dx", 0)
      .attr("dy", 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("font-family", "Arial, sans-serif")
      .attr("fill", "#333")
      .text(d => d.name);
    
    return nodeSelection;
  }
  
  // Create parent nodes with green circles (behind simulations)
  const parentNode = g.append("g")
    .attr("class", "parent-nodes")
    .selectAll("g")
    .data(parentNodes)
    .enter().append("g")
    .attr("class", "parent-node")
    .call(d3.drag()
      .on("start", (event, d) => dragstarted(event, d, parentSimulation))
      .on("drag", (event, d) => dragged(event, d, parentSimulation))
      .on("end", (event, d) => dragended(event, d, parentSimulation)));
  
  // Add green circles (stroke only, no fill, stroke width 5)
  // Radius matches collision radius to visually represent collision boundary
  parentNode.append("circle")
    .attr("r", parentCollisionRadius)
    .attr("fill", "none")
    .attr("stroke", "#4CAF50")
    .attr("stroke-width", 20);

  // Create links and nodes for each child simulation
  childSimulations.forEach((childSim, index) => {
    childSim.linksSelection = createLinks(childSim.container, childSim.links, `links${index + 1}`);
    childSim.nodesSelection = createNodes(childSim.container, childSim.nodes, `nodes${index + 1}`, childSim.simulation);
  });
  
  // ============================================================================
  // NODE INTERACTION HELPERS
  // ============================================================================
  
  // Helper function to add hover effects to nodes
  function addHoverEffects(nodeSelection) {
    nodeSelection.on("mouseenter", (event, d) => {
      d3.select(event.currentTarget).select("circle").attr("fill", "#ff6b6b");
    })
    .on("mouseleave", (event, d) => {
      d3.select(event.currentTarget).select("circle").attr("fill", nodeColor);
    });
  }
  
  // Helper function to add click handlers to nodes
  function addClickHandlers(nodeSelection) {
    nodeSelection.on("click", (event, d) => {
      if (onNodeClick) {
        onNodeClick({ node: { data: d } });
      }
    });
  }
  
  // Add hover effects and click handlers for all simulations
  childSimulations.forEach(childSim => {
    addHoverEffects(childSim.nodesSelection);
    addClickHandlers(childSim.nodesSelection);
  });
  
  // Helper function to get the correct node selection based on simulation
  function getNodeSelection(simulation) {
    const childSim = childSimulations.find(cs => cs.simulation === simulation);
    return childSim ? childSim.nodesSelection : null;
  }
  
  // Helper function to highlight or unhighlight nodes in a simulation
  function setNodeHighlight(simulation, highlight = false) {
    const nodeSelection = getNodeSelection(simulation);
    if (nodeSelection) {
      const color = highlight ? "#ff6b6b" : nodeColor;
      nodeSelection.selectAll("circle").attr("fill", color);
      
      // If highlighting and we're currently dragging, trigger a synthetic mouseup event
      if (highlight && (stateMachine.currentState === INTERACTION_STATES.DRAGGING_CHILD || 
                       stateMachine.currentState === INTERACTION_STATES.DRAGGING_CHILD_WITH_SHIFT) && 
          stateMachine.data.currentSimulation === simulation) {
        triggerSyntheticMouseup(simulation);
      }
    }
  }
  
  // ============================================================================
  // DRAG FUNCTIONS
  // ============================================================================
  
  // Custom drag event listener system
  const dragEventLogger = {
    logEvent: (eventType, event, subject, simulation, isSynthetic = false) => {
      const timestamp = new Date().toISOString();
      
      // Determine if this is a child or parent simulation
      const isChildSim = childSimulations.some(cs => cs.simulation === simulation);
      const simulationType = isChildSim ? 'child' : 'parent';
      
      const eventInfo = {
        timestamp,
        type: eventType,
        isSynthetic,
        subject: subject ? { id: subject.id, name: subject.name, x: subject.x, y: subject.y, fx: subject.fx, fy: subject.fy } : null,
        event: {
          x: event.x,
          y: event.y,
          dx: event.dx,
          dy: event.dy,
          active: event.active,
          type: event.type
        },
        simulation: simulationType
      };
      
    }
  };
  
  function dragstarted(event, d, currentSimulation) {
    // Log the drag start event
    dragEventLogger.logEvent('start', event, d, currentSimulation, false);
    
    console.log('🖱️ DRAG STARTED - Node:', d.name, 'Synthetic:', event.isSynthetic, 'Shift:', event.sourceEvent?.shiftKey);
    
    if (!event.active) currentSimulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
    
    // Determine if this is a parent or child node
    const isParentNode = !!d.container;
    const isShiftPressed = event.sourceEvent && event.sourceEvent.shiftKey;
    
    // Update state machine data
    const stateData = {
      draggedNode: d,
      currentSimulation: currentSimulation,
      dragStartPosition: { x: d.x, y: d.y },
      mousePosition: event.sourceEvent ? {
        clientX: event.sourceEvent.clientX,
        clientY: event.sourceEvent.clientY
      } : { x: 0, y: 0 }
    };
    
    // Transition to appropriate state
    if (isParentNode) {
      if (event.isSynthetic === true) {
        // This is a synthetic event from child handoff
        console.log('🔄 HANDOFF: Starting parent drag from child handoff');
        stateMachine.transition(INTERACTION_STATES.HANDOFF_IN_PROGRESS, stateData);
      } else {
        // Normal parent drag
        if (isShiftPressed) {
          console.log('🖱️ Starting DRAGGING_PARENT_WITH_SHIFT');
          stateMachine.transition(INTERACTION_STATES.DRAGGING_PARENT_WITH_SHIFT, stateData);
        } else {
          console.log('🖱️ Starting DRAGGING_PARENT');
          stateMachine.transition(INTERACTION_STATES.DRAGGING_PARENT, stateData);
        }
      }
    } else {
      // Child node drag
      if (isShiftPressed) {
        console.log('🖱️ Starting DRAGGING_CHILD_WITH_SHIFT');
        stateMachine.transition(INTERACTION_STATES.DRAGGING_CHILD_WITH_SHIFT, stateData);
        setNodeHighlight(currentSimulation, true);
      } else if (stateMachine.currentState === INTERACTION_STATES.SHIFT_PRESSED) {
        // Shift was pressed first, now starting drag
        console.log('🖱️ Shift-first sequence: Starting DRAGGING_CHILD_WITH_SHIFT');
        stateMachine.transition(INTERACTION_STATES.DRAGGING_CHILD_WITH_SHIFT, stateData);
        setNodeHighlight(currentSimulation, true);
      } else {
        console.log('🖱️ Starting DRAGGING_CHILD');
        stateMachine.transition(INTERACTION_STATES.DRAGGING_CHILD, stateData);
      }
    }
  }
  
  function dragged(event, d, currentSimulation) {
    // Log the drag event
    dragEventLogger.logEvent('drag', event, d, currentSimulation, false);
    
    d.fx = event.x;
    d.fy = event.y;
    
    // Update mouse position in state machine
    if (event.sourceEvent) {
      stateMachine.data.mousePosition = {
        clientX: event.sourceEvent.clientX,
        clientY: event.sourceEvent.clientY
      };
    }
  }
  
  function dragended(event, d, currentSimulation) {
    // Log the drag end event
    dragEventLogger.logEvent('end', event, d, currentSimulation, false);
    
    console.log('🖱️ DRAG ENDED - Node:', d.name, 'Synthetic:', event.isSynthetic, 'Current state:', stateMachine.currentState);
    
    if (!event.active) currentSimulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
    
    // Return all nodes to normal color when drag ends
    if (!d.container) {
      setNodeHighlight(currentSimulation, false);
    }
    
    // Handle state transitions based on current state
    if (!event.isSynthetic) {
      // This is a real drag end event
      console.log('🖱️ Real drag end event');
      if (stateMachine.currentState === INTERACTION_STATES.HANDOFF_IN_PROGRESS) {
        // Complete the handoff to parent drag
        console.log('🔄 Completing handoff to parent drag');
        stateMachine.transition(INTERACTION_STATES.DRAGGING_PARENT, {
          draggedNode: d,
          currentSimulation: currentSimulation
        });
      } else if (stateMachine.currentState === INTERACTION_STATES.DRAGGING_CHILD_WITH_SHIFT) {
        // Mouse released first during shift-drag - commit to handoff
        console.log('🖱️ Mouse released first during shift-drag - committing to handoff');
        stateMachine.transition(INTERACTION_STATES.DRAGGING_CHILD_WITH_SHIFT_COMMITTED);
        // Trigger the handoff
        triggerSyntheticMouseup(currentSimulation);
      } else if (stateMachine.currentState === INTERACTION_STATES.DRAGGING_PARENT_WITH_SHIFT) {
        // Mouse released first during shift-parent-drag - commit to end
        console.log('🖱️ Mouse released first during shift-parent-drag - committing to end');
        stateMachine.transition(INTERACTION_STATES.DRAGGING_PARENT_WITH_SHIFT_COMMITTED);
        // End the drag
        stateMachine.reset();
      } else {
        // Normal drag end - reset to idle
        console.log('🖱️ Normal drag end - resetting to IDLE');
        
        // If this was a parent drag, restart the child simulation
        if (d.container && stateMachine.data.originalChildSimulation) {
          console.log('🔄 Parent drag ended - restarting child simulation');
          const childSim = childSimulations.find(cs => cs.simulation === stateMachine.data.originalChildSimulation);
          if (childSim) {
            console.log('🔄 RESTARTING CHILD SIMULATION - Simulation:', childSim.id);
            console.log('🔄 Child simulation alpha before restart:', childSim.simulation.alpha());
            childSim.simulation.alpha(0.3).restart();
            console.log('🔄 Child simulation alpha after restart:', childSim.simulation.alpha());
            // Keep the simulation active by setting a minimum alpha
            childSim.simulation.alphaMin(0.1);
          } else {
            console.log('❌ Child simulation not found for restart');
          }
        }
        
        stateMachine.reset();
      }
    } else {
      // This is a synthetic drag end event
      console.log('🖱️ Synthetic drag end event');
      // Only reset state if we're ending a parent drag (not during handoff)
      if (stateMachine.currentState === INTERACTION_STATES.DRAGGING_PARENT || 
          stateMachine.currentState === INTERACTION_STATES.DRAGGING_PARENT_WITH_SHIFT) {
        console.log('🖱️ Ending parent drag - resetting to IDLE');
        stateMachine.reset();
      } else {
        console.log('🖱️ Synthetic drag end - not resetting state (handoff in progress)');
      }
      // For handoff events, let the handoff logic handle state transitions
    }
  }
  
  // ============================================================================
  // SYNTHETIC DRAG FUNCTIONS
  // ============================================================================
  
  // Helper function to trigger a synthetic mouseup event to end drag
  function triggerSyntheticMouseup(simulation) {
    console.log('🔄 TRIGGER SYNTHETIC MOUSEUP - Current state:', stateMachine.currentState);
    
    if (stateMachine.currentState === INTERACTION_STATES.DRAGGING_CHILD || 
        stateMachine.currentState === INTERACTION_STATES.DRAGGING_CHILD_WITH_SHIFT ||
        stateMachine.currentState === INTERACTION_STATES.DRAGGING_CHILD_WITH_SHIFT_COMMITTED) {
      
      console.log('🔄 Child drag detected - proceeding with handoff');
      
      // Get the current subject being dragged
      const childSim = childSimulations.find(cs => cs.simulation === simulation);
      if (!childSim) {
        console.log('❌ Child simulation not found');
        return;
      }
      
      // Use the tracked dragged node from state machine
      const subject = stateMachine.data.draggedNode;
      if (!subject) {
        console.log('❌ No dragged node found in state machine');
        return;
      }
      
      console.log('🔄 Handing off from child node:', subject.name);
      
      // Get parent node data to check its position
      const parentNodes = childSim.parentSimulation.nodes();
      const parentNodeData = parentNodes.find(node => node.id === childSim.id);
      if (parentNodeData) {
        // Parent node data found
      }
      
      // Get the current dragged position from the fixed positions (fx, fy)
      // These represent where the node currently is after dragging
      let currentX, currentY;
      if (subject.fx !== null && subject.fx !== undefined && subject.fy !== null && subject.fy !== undefined) {
        currentX = subject.fx;
        currentY = subject.fy;
      } else {
        currentX = subject.x;
        currentY = subject.y;
      }
      
      // Update the node's actual position to match the dragged position
      subject.x = currentX;
      subject.y = currentY;
      
      // Create a synthetic D3 drag event with type "end"
      const syntheticEvent = {
        type: "end",
        x: currentX,   // Current dragged position
        y: currentY,   // Current dragged position
        subject: subject,
        sourceEvent: new MouseEvent("mouseup", {
          bubbles: true,
          cancelable: true,
          view: window,
          button: 0,
          buttons: 0,
          clientX: stateMachine.data.mousePosition.clientX || 0,
          clientY: stateMachine.data.mousePosition.clientY || 0
        }),
        active: 0,  // This should be 0 for end events
        identifier: "mouse",
        target: simulation,
        isSynthetic: true  // Mark as synthetic event
      };
      
      // Set the global d3.event for the dragended function to use
      // This is how D3 drag functions access the event properties
      if (typeof d3 !== 'undefined' && d3.event) {
        d3.event = syntheticEvent;
      }
      
      // Log the synthetic event
      dragEventLogger.logEvent('end', syntheticEvent, subject, simulation, true);
      
      // Call dragended directly - this is the correct approach for synthetic events
      dragended(syntheticEvent, subject, simulation);
      
      // Set alpha to 0 to stop the simulation
      simulation.alpha(0);
      
      // Get mouse coordinates from the synthetic event we just created
      const mouseCoords = {
        clientX: syntheticEvent.sourceEvent.clientX,
        clientY: syntheticEvent.sourceEvent.clientY
      };
      
      // Calculate total distance traveled before clearing drag state
      const totalDistanceX = subject.x - stateMachine.data.dragStartPosition.x;
      const totalDistanceY = subject.y - stateMachine.data.dragStartPosition.y;
      
      // Store the original child node and simulation before handoff
      stateMachine.data.originalChildNode = subject;
      stateMachine.data.originalChildSimulation = simulation;
      
      // Don't clear drag state here - let the parent drag handle it
      // We need to keep isDragging = true for the parent drag
      
      // Call triggerSyntheticMouseDown to start dragging the parent node
      // Pass the total distance traveled from drag start
      // Use setTimeout to ensure the synthetic mouseup is fully processed first
      if (childSim && childSim.parentSimulation) {
        console.log('🔄 Scheduling parent drag start in setTimeout');
        setTimeout(() => {
          console.log('🔄 Executing parent drag start');
          triggerSyntheticMouseDown(simulation, childSim.parentSimulation, totalDistanceX, totalDistanceY, mouseCoords);
        }, 0);
      } else {
        console.log('❌ Child sim or parent simulation not found for handoff');
      }
    }
  }

  // Helper function to trigger a synthetic mousedown event to start drag
  function triggerSyntheticMouseDown(childSimulation, parentSimulation, dragX, dragY, mouseCoords) {
    const childSim = childSimulations.find(cs => cs.simulation === childSimulation);
    if (!childSim) return;

    const parentNodeData = parentSimulation.nodes().find(pn => pn.id === childSim.id);
    if (!parentNodeData) return;

    // Convert child simulation coordinates to parent simulation coordinates
    // dragX and dragY are in child simulation coordinates, we need parent coordinates
    const containerTransform = parentNodeData.container.attr("transform");
    const transformMatch = containerTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
    
    let parentX, parentY;
    if (transformMatch && !isNaN(dragX) && !isNaN(dragY)) {
      const containerX = parseFloat(transformMatch[1]);
      const containerY = parseFloat(transformMatch[2]);
      
      // Convert child coordinates to parent coordinates
      parentX = dragX + containerX;
      parentY = dragY + containerY;
    } else {
      // Fallback to parent node's current position
      parentX = parentNodeData.x;
      parentY = parentNodeData.y;
    }

    // Find the actual DOM element for the parent node
    const parentElement = parentNode.filter(d => d.id === parentNodeData.id).node();
    
    if (!parentElement) {
      return;
    }

    // Create a synthetic D3 drag event instead of dispatching a real mouse event
    const syntheticDragEvent = {
      type: "start",
      x: parentX,
      y: parentY,
      subject: parentNodeData,
      sourceEvent: new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        view: window,
        button: 0,
        buttons: 0,
        clientX: mouseCoords?.clientX,
        clientY: mouseCoords?.clientY
      }),
      active: 1,
      identifier: "mouse",
      target: parentSimulation,
      isSynthetic: true  // Mark as synthetic event
    };
    
    // Set the global d3.event for the dragstarted function to use
    if (typeof d3 !== 'undefined' && d3.event) {
      d3.event = syntheticDragEvent;
    }
    
    // Call dragstarted directly with the synthetic event
    dragstarted(syntheticDragEvent, parentNodeData, parentSimulation);
    
    // Set the parent node's fixed position so it can be dragged
    parentNodeData.fx = parentX;
    parentNodeData.fy = parentY;
    
    // Restart the parent simulation to make it responsive to dragging
    parentSimulation.alphaTarget(0.3).restart();
    
    // Dispatch a real mousedown event to the parent element to activate the drag behavior
    const realMouseEvent = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
      view: window,
      button: 0,
      buttons: 1,
      clientX: mouseCoords?.clientX || 0,
      clientY: mouseCoords?.clientY || 0
    });
    
    parentElement.dispatchEvent(realMouseEvent);
    
    // After setting up the parent drag, transition to parent drag state
    // Only transition if we're not already in a parent drag state
    if (stateMachine.currentState !== INTERACTION_STATES.DRAGGING_PARENT && 
        stateMachine.currentState !== INTERACTION_STATES.DRAGGING_PARENT_WITH_SHIFT) {
      stateMachine.transition(INTERACTION_STATES.DRAGGING_PARENT, {
        draggedNode: parentNodeData,
        currentSimulation: parentSimulation,
        dragStartPosition: { x: parentNodeData.x, y: parentNodeData.y }
      });
    } else {
      // Just update the data if we're already in a parent drag state
      stateMachine.data.draggedNode = parentNodeData;
      stateMachine.data.currentSimulation = parentSimulation;
      stateMachine.data.dragStartPosition = { x: parentNodeData.x, y: parentNodeData.y };
    }
  }
  
  // Trigger synthetic mouseup for parent node
  function triggerSyntheticMouseUpParent(keyup) {
    console.log('🔄 TRIGGER SYNTHETIC MOUSEUP PARENT - Current state:', stateMachine.currentState, 'Trigger:', keyup);
    
    if (stateMachine.currentState !== INTERACTION_STATES.DRAGGING_PARENT && 
        stateMachine.currentState !== INTERACTION_STATES.DRAGGING_PARENT_WITH_SHIFT &&
        stateMachine.currentState !== INTERACTION_STATES.HANDOFF_IN_PROGRESS) {
      console.log('❌ Not in valid state for parent mouseup');
      return;
    }
    
    // Get the parent node being dragged
    const parentNode = stateMachine.data.draggedNode;
    if (!parentNode) {
      console.log('❌ No parent node found in state machine');
      return;
    }
    
    console.log('🔄 Ending parent drag for node:', parentNode.name);
    
    // Get current position
    let currentX, currentY;
    if (parentNode.fx !== null && parentNode.fx !== undefined && parentNode.fy !== null && parentNode.fy !== undefined) {
      currentX = parentNode.fx;
      currentY = parentNode.fy;
    } else {
      currentX = parentNode.x;
      currentY = parentNode.y;
    }
    
    // Update the node's actual position
    parentNode.x = currentX;
    parentNode.y = currentY;
    
    // Create a synthetic D3 drag event with type "end"
    const syntheticEvent = {
      type: "end",
      x: currentX,
      y: currentY,
      subject: parentNode,
      sourceEvent: new MouseEvent("mouseup", {
        bubbles: true,
        cancelable: true,
        view: window,
        button: 0,
        buttons: 0,
        clientX: stateMachine.data.mousePosition.clientX || 0,
        clientY: stateMachine.data.mousePosition.clientY || 0
      }),
      active: 0,
      identifier: "mouse",
      target: parentSimulation,
      isSynthetic: true
    };
    
    // Set the global d3.event
    if (typeof d3 !== 'undefined' && d3.event) {
      d3.event = syntheticEvent;
    }
    
    // Call dragended to end the parent drag
    dragended(syntheticEvent, parentNode, parentSimulation);
    parentSimulation.alpha(0);
    
    // Restart the child simulation so nodes can be dragged again
    const childSim = childSimulations.find(cs => cs.simulation === stateMachine.data.originalChildSimulation);
    if (childSim) {
      console.log('🔄 RESTARTING CHILD SIMULATION - Simulation:', childSim.id);
      console.log('🔄 Child simulation alpha before restart:', childSim.simulation.alpha());
      childSim.simulation.alpha(0.3).restart();
      console.log('🔄 Child simulation alpha after restart:', childSim.simulation.alpha());
      // Keep the simulation active by setting a minimum alpha
      childSim.simulation.alphaMin(0.1);
    } else {
      console.log('❌ Child simulation not found for restart');
    }
    
    // Store values before clearing drag state
    const mouseCoords = {
      clientX: stateMachine.data.mousePosition.clientX || 0,
      clientY: stateMachine.data.mousePosition.clientY || 0
    };
    
    const originalChildSimulation = stateMachine.data.originalChildSimulation;
    const originalChildNode = stateMachine.data.originalChildNode;
    
    // Calculate the offset between the parent node and the original child node position
    // This ensures the child node appears under the mouse cursor
    const originalChildSim = childSimulations.find(cs => cs.simulation === originalChildSimulation);
    if (originalChildSim && originalChildNode) {
      const parentNodeData = parentSimulation.nodes().find(pn => pn.id === originalChildSim.id);
      if (parentNodeData) {
        // Calculate the child node's position relative to the parent
        const childOffsetX = originalChildNode.x;
        const childOffsetY = originalChildNode.y;
        
        // Update the child node's position to be relative to the current parent position
        originalChildNode.x = childOffsetX;
        originalChildNode.y = childOffsetY;
      }
    }
    if(keyup === 'shift'){
      //triggerSyntheticMouseDownChild(mouseCoords, originalChildNode, originalChildSimulation);
    }
  }

  // Trigger synthetic mousedown for child node
  function triggerSyntheticMouseDownChild(mouseCoords, originalChildNode, originalChildSimulation) {
    // Use the passed parameters instead of trying to access cleared drag state
    const childNode = originalChildNode;
    const childSimulation = originalChildSimulation;
    
    if (!childNode || !childSimulation) {
      return;
    }
    
    // Find the child simulation object
    const childSim = childSimulations.find(cs => cs.simulation === childSimulation);
    if (!childSim) {
      return;
    }
    
    // Find the specific child node's DOM element
    const childElement = childSim.nodesSelection.filter(d => d.id === childNode.id).node();
    if (!childElement) {
      return;
    }
    
    // Instead of using a synthetic MouseEvent, directly call the drag functions
    // Create a synthetic drag event with the child node's current position
    const syntheticDragEvent = {
      type: "start",
      x: childNode.x,
      y: childNode.y,
      subject: childNode,
      sourceEvent: new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        view: window,
        button: 0,
        buttons: 0
      }),
      active: 1,
      identifier: "mouse",
      target: childSimulation,
      isSynthetic: true
    };
    
    // Set the global d3.event
    if (typeof d3 !== 'undefined' && d3.event) {
      d3.event = syntheticDragEvent;
    }
    
    // Set up the drag state manually
    // Only transition if we're not already in a child drag state
    if (stateMachine.currentState !== INTERACTION_STATES.DRAGGING_CHILD && 
        stateMachine.currentState !== INTERACTION_STATES.DRAGGING_CHILD_WITH_SHIFT) {
      stateMachine.transition(INTERACTION_STATES.DRAGGING_CHILD, {
        draggedNode: childNode,
        currentSimulation: childSimulation,
        dragStartPosition: { x: childNode.x, y: childNode.y }
      });
    } else {
      // Just update the data if we're already in a child drag state
      stateMachine.data.draggedNode = childNode;
      stateMachine.data.currentSimulation = childSimulation;
      stateMachine.data.dragStartPosition = { x: childNode.x, y: childNode.y };
    }
    
    // Set the node's fixed position so it's ready to be dragged
    childNode.fx = childNode.x;
    childNode.fy = childNode.y;
    
    // Restart the simulation to make it responsive
    childSimulation.alphaTarget(0.3).restart();
    
    // Use the child node's actual position, similar to how child-to-parent works
    const childX = childNode.x;
    const childY = childNode.y;
    
    // Get the child container's transform
    const containerTransform = childSim.container.attr("transform");
    const transformMatch = containerTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
    
    let screenX, screenY;
    if (transformMatch) {
      const containerX = parseFloat(transformMatch[1]);
      const containerY = parseFloat(transformMatch[2]);
      screenX = childX + containerX;
      screenY = childY + containerY;
    } else {
      screenX = childX;
      screenY = childY;
    }
    
    // Get SVG bounding box for proper client coordinates
    const svgRect = svg.node().getBoundingClientRect();
    
    // Apply the current zoom transform to get accurate screen coordinates
    const currentTransform = d3.zoomTransform(svg.node());
    const transformedX = currentTransform.applyX(screenX);
    const transformedY = currentTransform.applyY(screenY);
    
    const clientX = transformedX + svgRect.left;
    const clientY = transformedY + svgRect.top;
    
    // Create and dispatch a real mousedown event
    const realMouseEvent = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
      view: window,
      button: 0,
      buttons: 1,
      clientX: clientX,
      clientY: clientY
    });
    
    childElement.dispatchEvent(realMouseEvent);
  }
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  // Add global key event listener for Shift key
  function handleKeyDown(event) {
    if (event.key === 'Shift') {
      console.log('🔑 Shift key DOWN - Current state:', stateMachine.currentState);
      stateMachine.data.shiftPressed = true;
      
      // Handle state transitions based on current state
      if (stateMachine.currentState === INTERACTION_STATES.IDLE) {
        stateMachine.transition(INTERACTION_STATES.SHIFT_PRESSED);
        console.log('🔑 Transitioned to SHIFT_PRESSED');
      } else if (stateMachine.currentState === INTERACTION_STATES.DRAGGING_CHILD) {
        stateMachine.transition(INTERACTION_STATES.DRAGGING_CHILD_WITH_SHIFT);
        console.log('🔑 Transitioned to DRAGGING_CHILD_WITH_SHIFT');
        setNodeHighlight(stateMachine.data.currentSimulation, true);
      } else if (stateMachine.currentState === INTERACTION_STATES.DRAGGING_PARENT) {
        stateMachine.transition(INTERACTION_STATES.DRAGGING_PARENT_WITH_SHIFT);
        console.log('🔑 Transitioned to DRAGGING_PARENT_WITH_SHIFT');
      }
      // Note: We don't handle SHIFT_PRESSED state here as it's handled in dragstarted
    }
  }
  
  function handleKeyUp(event) {
    if (event.key === 'Shift') {
      console.log('🔑 Shift key UP - Current state:', stateMachine.currentState);
      stateMachine.data.shiftPressed = false;
      
      // Handle state transitions based on current state
      if (stateMachine.currentState === INTERACTION_STATES.SHIFT_PRESSED) {
        stateMachine.transition(INTERACTION_STATES.IDLE);
        console.log('🔑 Transitioned to IDLE');
      } else if (stateMachine.currentState === INTERACTION_STATES.DRAGGING_CHILD_WITH_SHIFT) {
        // Shift released first - go back to normal child dragging
        stateMachine.transition(INTERACTION_STATES.DRAGGING_CHILD);
        console.log('🔑 Shift released first - back to DRAGGING_CHILD');
        setNodeHighlight(stateMachine.data.currentSimulation, false);
      } else if (stateMachine.currentState === INTERACTION_STATES.DRAGGING_PARENT_WITH_SHIFT) {
        // Shift released first - go back to normal parent dragging
        stateMachine.transition(INTERACTION_STATES.DRAGGING_PARENT);
        console.log('🔑 Shift released first - back to DRAGGING_PARENT');
      } else if (stateMachine.currentState === INTERACTION_STATES.HANDOFF_IN_PROGRESS) {
        // If shift is released during handoff, complete the handoff but continue as normal parent drag
        console.log('🔑 Shift released during handoff - completing handoff as normal parent drag');
        stateMachine.transition(INTERACTION_STATES.DRAGGING_PARENT);
      }
    }
  }
  
  // Handle global mouseup to clean up drag state if user releases mouse while shift-dragging
  function handleGlobalMouseUp(event) {
    console.log('🖱️ GLOBAL MOUSE UP - Current state:', stateMachine.currentState);
    // Only handle if we're not in a handoff state (which has its own cleanup)
    if (stateMachine.currentState !== INTERACTION_STATES.HANDOFF_IN_PROGRESS) {
      console.log('🖱️ Triggering synthetic parent mouseup from global mouseup');
      triggerSyntheticMouseUpParent("mouseup");
    } else {
      console.log('🖱️ Skipping global mouseup - handoff in progress');
    }
  }
  
  // ============================================================================
  // SIMULATION TICK HANDLERS
  // ============================================================================
  
  // Update positions on parent simulation tick
  parentSimulation.on("tick", () => {
    // Update parent node positions (green circles)
    parentNode
      .attr("transform", d => `translate(${d.x},${d.y})`);
    
    // Update child container positions based on parent node positions
    parentNodes.forEach((parentNodeData, index) => {
      if (parentNodeData.container) {
        parentNodeData.container.attr("transform", `translate(${parentNodeData.x}, ${parentNodeData.y})`);
      }
    });
  });
  
  // Update positions on simulation tick for all child simulations
  childSimulations.forEach(childSim => {
    childSim.simulation.on("tick", () => {
      childSim.linksSelection
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      
      childSim.nodesSelection
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });
  });
  
  // ============================================================================
  // RESIZE HANDLING
  // ============================================================================
  
  // Handle resize
  function handleResize() {
    const newWidth = containerElement.clientWidth;
    const newHeight = containerElement.clientHeight;
    
    if (newWidth !== width || newHeight !== height) {
      width = newWidth;
      height = newHeight;
      
      svg.attr("width", width).attr("height", height);
      
      // Update parent simulation center
      parentSimulation.force("center", d3.forceCenter(width / 2, height / 2));
      
      // Restart with default alpha values
      parentSimulation.alpha(0.3).restart();
      childSimulations.forEach(childSim => {
        childSim.simulation.alpha(0.3).restart();
      });
    }
  }
  
  // Add resize listener
  const resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(containerElement);
  
  // ============================================================================
  // EVENT LISTENERS SETUP
  // ============================================================================
  
  // Add event listeners
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
  document.addEventListener('mouseup', handleGlobalMouseUp);
  
  // Also add mouseup listener to the window for better coverage
  window.addEventListener('mouseup', handleGlobalMouseUp);
  
  // ============================================================================
  // RETURN OBJECT
  // ============================================================================
  
  // Return destroy function
  return {
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      
      if (parentSimulation) {
        parentSimulation.stop();
      }
      childSimulations.forEach(childSim => {
        if (childSim.simulation) {
          childSim.simulation.stop();
        }
      });
      
      // Reset state machine
      stateMachine.reset();
      
      // Clean up event listeners
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      
      resizeObserver.disconnect();
      d3.select(container).selectAll("*").remove();
    },
    
    updateProps: (newProps) => {
      // Handle prop updates if needed
      if (newProps.onNodeClick !== undefined) {
        onNodeClick = newProps.onNodeClick;
      }
    },
    
    // Expose state machine for debugging
    getState: () => stateMachine.getStateInfo()
  };
}