// Table functionality for portfolio
import { networkData } from './network-data.js';

export async function createTable() {
    try {
        // Transform network nodes into table data
        const tableData = networkData.nodes.map(node => ({
            id: node.id,
            name: node.name,
            type: node.type,
            ip: node.ip,
            subnet: node.subnet
        }));

        const table = new Tabulator("#table-content", {
            data: tableData,
            layout: "fitColumns",
            pagination: "local",
            paginationSize: 10,
            columns: [
                { title: "ID", field: "id", width: 120, hozAlign: "left" },
                { title: "Name", field: "name", width: 150 },
                { title: "Type", field: "type", width: 120 },
                { title: "IP Address", field: "ip", width: 150 },
                { title: "Subnet", field: "subnet", width: 120 }
            ]
        });

        window.tableLoaded = true;
    } catch (error) {
        console.error('Error loading network data:', error);
        // Fallback to basic table if import fails
        const fallbackData = [
            { id: "Error", name: "Failed to load data", type: "Error", ip: "N/A", subnet: "N/A" }
        ];
        
        const table = new Tabulator("#table-content", {
            data: fallbackData,
            layout: "fitColumns",
            columns: [
                { title: "Error", field: "id", width: 200, hozAlign: "center" }
            ]
        });
    }
}

export async function loadTable() {
    try {
        // Reset the loaded flag to ensure fresh data
        window.tableLoaded = false;
        await createTable();
    } catch (error) {
        console.error('Error loading table:', error);
    }
}
