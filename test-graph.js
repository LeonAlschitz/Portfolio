// Sample D3 Force-Directed Graph for Test Tab

export async function loadTestGraph() {
    try {
        // Load D3.js if not already loaded
        if (typeof d3 === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://d3js.org/d3.v7.min.js';
            
            await new Promise((resolve) => {
                script.onload = resolve;
                document.head.appendChild(script);
            });
        }
        
        // Reset the loaded flag to ensure fresh data
        window.testGraphLoaded = false;
        
        // Now create the test graph
        createTestGraph();
        window.testGraphLoaded = true;
    } catch (error) {
        console.error('Error loading test graph:', error);
    }
}

function createTestGraph() {
    const container = document.getElementById('test-graph');
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Sample data for the test graph
    const graphData = {
        nodes: [
            { id: "A", name: "Node A", group: 1, size: 20 },
            { id: "B", name: "Node B", group: 1, size: 18 },
            { id: "C", name: "Node C", group: 2, size: 16 },
            { id: "D", name: "Node D", group: 2, size: 14 },
            { id: "E", name: "Node E", group: 3, size: 12 },
            { id: "F", name: "Node F", group: 3, size: 10 },
            { id: "G", name: "Node G", group: 1, size: 15 },
            { id: "H", name: "Node H", group: 2, size: 13 },
            { id: "I", name: "Node I", group: 3, size: 11 },
            { id: "J", name: "Node J", group: 1, size: 17 }
        ],
        links: [
            { source: "A", target: "B", value: 1 },
            { source: "A", target: "C", value: 2 },
            { source: "B", target: "D", value: 1 },
            { source: "C", target: "E", value: 3 },
            { source: "D", target: "F", value: 2 },
            { source: "E", target: "G", value: 1 },
            { source: "F", target: "H", value: 2 },
            { source: "G", target: "I", value: 1 },
            { source: "H", target: "J", value: 3 },
            { source: "I", target: "A", value: 2 },
            { source: "J", target: "B", value: 1 },
            { source: "C", target: "G", value: 2 },
            { source: "D", target: "H", value: 1 }
        ]
    };

    // Create SVG container
    const svg = d3.select('#test-graph')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('background', '#fafafa');

    // Create arrow markers
    const defs = svg.append('defs');
    
    defs.append('marker')
        .attr('id', 'arrow-test')
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 6)
        .attr('refY', 5)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('polygon')
        .attr('points', '0,0 10,5 0,10')
        .attr('fill', '#666');

    // Create main content group
    const content = svg.append('g');

    // Create force simulation
    const simulation = d3.forceSimulation(graphData.nodes)
        .force('link', d3.forceLink(graphData.links).id(d => d.id).distance(80).strength(0.5))
        .force('collide', d3.forceCollide().radius(d => d.size + 5).strength(0.8))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('x', d3.forceX(width / 2).strength(0.1))
        .force('y', d3.forceY(height / 2).strength(0.1))
        .alpha(0.3)
        .alphaDecay(0.1);

    // Create links
    const links = content.append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(graphData.links)
        .join('line')
        .attr('class', 'link')
        .attr('marker-end', 'url(#arrow-test)')
        .attr('stroke', '#999')
        .attr('stroke-width', d => Math.sqrt(d.value))
        .attr('opacity', 0.6);

    // Create nodes
    const nodes = content.append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(graphData.nodes)
        .join('g')
        .attr('class', 'node')
        .style('cursor', 'pointer');

    // Add node circles
    nodes.append('circle')
        .attr('r', d => d.size)
        .attr('fill', d => {
            const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'];
            return colors[d.group % colors.length];
        })
        .attr('stroke', '#333')
        .attr('stroke-width', 2);

    // Add node labels
    nodes.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .attr('fill', 'white')
        .text(d => d.name);

    // Make nodes draggable
    nodes.call(d3.drag()
        .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        })
        .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
        })
        .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }));

    // Add click handler for nodes
    nodes.on('click', function(event, d) {
        console.log('Clicked node:', d);
        
        // Highlight connected links
        links
            .attr('stroke', link => 
                (link.source.id === d.id || link.target.id === d.id) ? '#ff4757' : '#999'
            )
            .attr('stroke-width', link => 
                (link.source.id === d.id || link.target.id === d.id) ? Math.sqrt(link.value) + 2 : Math.sqrt(link.value)
            );
        
        // Reset after 2 seconds
        setTimeout(() => {
            links
                .attr('stroke', '#999')
                .attr('stroke-width', d => Math.sqrt(d.value));
        }, 2000);
    });

    // Update positions on simulation tick
    simulation.on('tick', () => {
        links
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        nodes.attr('transform', d => `translate(${d.x}, ${d.y})`);
    });

    // Add zoom functionality
    const zoom = d3.zoom()
        .on('zoom', (event) => {
            content.attr('transform', event.transform);
        });

    svg.call(zoom);
}
