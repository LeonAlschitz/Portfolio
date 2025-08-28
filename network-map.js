// D3.js Network Map Implementation
function createNetworkMap() {
    // Hardcoded network data
    const networkData = {
        nodes: [
            { id: 1, name: "Router A", type: "router", x: 100, y: 100 },
            { id: 2, name: "Switch 1", type: "switch", x: 200, y: 150 },
            { id: 3, name: "PC 1", type: "pc", x: 300, y: 100 },
            { id: 4, name: "PC 2", type: "pc", x: 300, y: 200 },
            { id: 5, name: "Server 1", type: "server", x: 400, y: 150 },
            { id: 6, name: "Switch 2", type: "switch", x: 200, y: 250 },
            { id: 7, name: "PC 3", type: "pc", x: 300, y: 300 },
            { id: 8, name: "PC 4", type: "pc", x: 400, y: 300 }
        ],
        links: [
            { source: 1, target: 2 },
            { source: 2, target: 3 },
            { source: 2, target: 4 },
            { source: 2, target: 5 },
            { source: 1, target: 6 },
            { source: 6, target: 7 },
            { source: 6, target: 8 }
        ]
    };

    const container = document.getElementById('netmap');
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Create SVG
    const svg = d3.select('#netmap')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    // Create arrow marker
    svg.append('defs').append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '-0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('xoverflow', 'visible')
        .append('svg:path')
        .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
        .attr('fill', '#999');

    // Create force simulation
    const simulation = d3.forceSimulation(networkData.nodes)
        .force('link', d3.forceLink(networkData.links).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(30));

    // Create links
    const links = svg.append('g')
        .selectAll('line')
        .data(networkData.links)
        .enter().append('line')
        .attr('class', 'link')
        .attr('marker-end', 'url(#arrowhead)');

    // Create nodes
    const nodes = svg.append('g')
        .selectAll('circle')
        .data(networkData.nodes)
        .enter().append('circle')
        .attr('class', 'node')
        .attr('r', d => d.type === 'router' ? 12 : d.type === 'switch' ? 10 : 8)
        .attr('fill', d => {
            switch(d.type) {
                case 'router': return '#ff6b6b';
                case 'switch': return '#4ecdc4';
                case 'pc': return '#45b7d1';
                case 'server': return '#96ceb4';
                default: return '#ddd';
            }
        })
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));

    // Add labels
    const labels = svg.append('g')
        .selectAll('text')
        .data(networkData.nodes)
        .enter().append('text')
        .attr('class', 'node-label')
        .attr('x', d => d.x)
        .attr('y', d => d.y + 25)
        .text(d => d.name)
        .style('font-size', '12px')
        .style('font-family', 'Arial, sans-serif')
        .style('text-anchor', 'middle')
        .style('pointer-events', 'none')
        .style('fill', '#333');

    // Add zoom functionality
    const zoom = d3.zoom()
        .scaleExtent([0.2, 4])
        .on('zoom', (event) => {
            svg.selectAll('g').attr('transform', event.transform);
        });

    svg.call(zoom);

    // Update positions on simulation tick
    simulation.on('tick', () => {
        links
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        nodes
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);

        labels
            .attr('x', d => d.x)
            .attr('y', d => d.y + 25);
    });

    // Drag functions
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    // Add click handler for nodes
    nodes.on('click', function(event, d) {
        console.log('Clicked node:', d);
        // You can add more interactive features here
    });

    // Add hover effects
    nodes.on('mouseover', function(event, d) {
        d3.select(this).style('stroke', '#333').style('stroke-width', '2px');
    }).on('mouseout', function(event, d) {
        d3.select(this).style('stroke', 'none');
    });
}
