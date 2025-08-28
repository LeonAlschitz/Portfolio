// Enhanced D3.js Network Map with Subnet Simulation
import { networkData, nodeConfig, linkConfig } from './network-data.js';

export async function loadNetworkMap() {
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
        window.networkMapLoaded = false;
        
        // Now create the network map
        createNetworkMap();
        window.networkMapLoaded = true;
    } catch (error) {
        console.error('Error loading network map:', error);
    }
}

export function createNetworkMap() {

    const container = document.getElementById('netmap');
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Create SVG container
    const svg = d3.select('#netmap')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('background', '#f8f9fa');

    // Create arrow markers
    const defs = svg.append('defs');
    
    // Unidirectional arrow
    defs.append('marker')
        .attr('id', 'arrow-unidirectional')
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 5)
        .attr('refY', 5)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('polygon')
        .attr('points', '0,0 10,5 0,10')
        .attr('fill', '#666');

    // Create main content group
    const content = svg.append('g');



    // Create enhanced force simulation
    const simulation = d3.forceSimulation(networkData.nodes)
        .force('link', d3.forceLink(networkData.links).id(d => d.id).distance(120).strength(0.3))
        .force('collide', d3.forceCollide().radius(20).strength(0.8))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('x', d3.forceX(width / 2).strength(0.05))
        .force('y', d3.forceY(height / 2).strength(0.05))
        .alpha(0.3)
        .alphaDecay(0.1);

    // Create links with different styles based on type
    const linkGroup = content.append('g').attr('class', 'link-groups');
    
    const links = linkGroup
        .selectAll('line')
        .data(networkData.links)
        .join('line')
        .attr('class', 'link')
        .attr('marker-end', 'url(#arrow-unidirectional)')
        .attr('stroke', d => linkConfig[d.type]?.color || '#666')
        .attr('stroke-width', d => linkConfig[d.type]?.width || 2)
        .attr('opacity', 0.7);

    // Create nodes
    const nodeGroup = content.append('g').attr('class', 'node-groups');
    
    const nodes = nodeGroup
        .selectAll('g')
        .data(networkData.nodes)
        .join('g')
        .attr('class', 'node-group')
        .style('cursor', 'pointer');

    // Add node circles
    nodes.append('circle')
        .attr('class', 'node-circle')
        .attr('r', d => nodeConfig[d.type]?.radius || 10)
        .attr('fill', d => nodeConfig[d.type]?.color || '#6c757d')
        .attr('stroke', '#333')
        .attr('stroke-width', 2)
        .attr('data-type', d => d.type);

    // Add node icons
    nodes.append('text')
        .attr('class', 'node-icon')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '12px')
        .attr('fill', 'white')
        .attr('font-weight', 'bold')
        .text(d => nodeConfig[d.type]?.icon || '?');



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



    // Add click handler
    nodes.on('click', function(event, d) {
        console.log('Clicked node:', d);
        // You can add more interactive features here
    });

    // Update positions on simulation tick
    simulation.on('tick', () => {
        // Update link positions
        links
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        // Update node positions
        nodes.attr('transform', d => `translate(${d.x}, ${d.y})`);


    });


}
