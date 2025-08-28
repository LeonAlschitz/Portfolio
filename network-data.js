// Network Data Configuration
export const networkData = {
    nodes: [
        // Core network devices
        { id: "router-1", name: "Router A", type: "router", ip: "192.168.1.1", subnet: "core" },
        { id: "switch-1", name: "Core Switch", type: "switch", ip: "192.168.1.2", subnet: "core" },
        { id: "switch-2", name: "Distribution Switch", type: "switch", ip: "192.168.1.3", subnet: "core" },
        
        // Server infrastructure
        { id: "server-1", name: "Web Server", type: "server", ip: "192.168.1.10", subnet: "servers" },
        { id: "server-2", name: "Database Server", type: "server", ip: "192.168.1.11", subnet: "servers" },
        { id: "server-3", name: "File Server", type: "server", ip: "192.168.1.12", subnet: "servers" },
        { id: "load-balancer", name: "Load Balancer", type: "loadbalancer", ip: "192.168.1.20", subnet: "servers" },
        
        // Security devices
        { id: "firewall-1", name: "Main Firewall", type: "firewall", ip: "192.168.1.100", subnet: "security" },
        { id: "firewall-2", name: "DMZ Firewall", type: "firewall", ip: "192.168.1.101", subnet: "security" },
        { id: "ids", name: "Intrusion Detection", type: "ids", ip: "192.168.1.102", subnet: "security" },
        
        // Workstations
        { id: "pc-1", name: "Workstation 1", type: "pc", ip: "192.168.1.200", subnet: "workstations" },
        { id: "pc-2", name: "Workstation 2", type: "pc", ip: "192.168.1.201", subnet: "workstations" },
        { id: "pc-3", name: "Workstation 3", type: "pc", ip: "192.168.1.202", subnet: "workstations" },
        { id: "pc-4", name: "Workstation 4", type: "pc", ip: "192.168.1.203", subnet: "workstations" },
        { id: "pc-5", name: "Workstation 5", type: "pc", ip: "192.168.1.204", subnet: "workstations" },
        
        // Network management
        { id: "monitor", name: "Network Monitor", type: "monitor", ip: "192.168.1.250", subnet: "management" },
        { id: "backup", name: "Backup System", type: "backup", ip: "192.168.1.251", subnet: "management" }
    ],
    links: [
        // Core network connections
        { source: "router-1", target: "switch-1", type: "core" },
        { source: "switch-1", target: "switch-2", type: "core" },
        
        // Server connections
        { source: "switch-1", target: "load-balancer", type: "server" },
        { source: "load-balancer", target: "server-1", type: "server" },
        { source: "load-balancer", target: "server-2", type: "server" },
        { source: "load-balancer", target: "server-3", type: "server" },
        { source: "switch-2", target: "server-1", type: "server" },
        { source: "switch-2", target: "server-2", type: "server" },
        
        // Security connections
        { source: "router-1", target: "firewall-1", type: "security" },
        { source: "firewall-1", target: "firewall-2", type: "security" },
        { source: "firewall-2", target: "ids", type: "security" },
        
        // Workstation connections
        { source: "switch-2", target: "pc-1", type: "workstation" },
        { source: "switch-2", target: "pc-2", type: "workstation" },
        { source: "switch-2", target: "pc-3", type: "workstation" },
        { source: "switch-2", target: "pc-4", type: "workstation" },
        { source: "switch-2", target: "pc-5", type: "workstation" },
        
        // Management connections
        { source: "switch-1", target: "monitor", type: "management" },
        { source: "switch-1", target: "backup", type: "management" },
        
        // Cross-subnet connections
        { source: "firewall-1", target: "load-balancer", type: "cross" },
        { source: "ids", target: "monitor", type: "cross" }
    ]
};

// Node type configurations
export const nodeConfig = {
    router: { radius: 14, color: '#28a745', icon: 'R' },
    switch: { radius: 12, color: '#17a2b8', icon: 'S' },
    firewall: { radius: 13, color: '#dc3545', icon: 'F' },
    loadbalancer: { radius: 12, color: '#6f42c1', icon: 'L' },
    server: { radius: 11, color: '#fd7e14', icon: 'S' },
    ids: { radius: 10, color: '#e83e8c', icon: 'I' },
    monitor: { radius: 10, color: '#20c997', icon: 'M' },
    backup: { radius: 10, color: '#6f42c1', icon: 'B' },
    pc: { radius: 9, color: '#6c757d', icon: 'P' }
};

// Link type configurations
export const linkConfig = {
    core: { color: '#007acc', width: 3 },
    server: { color: '#28a745', width: 2 },
    security: { color: '#dc3545', width: 2 },
    workstation: { color: '#6c757d', width: 2 },
    management: { color: '#fd7e14', width: 2 },
    cross: { color: '#6f42c1', width: 2 }
};
