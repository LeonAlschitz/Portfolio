// Page loader for portfolio
export async function loadPage(sectionId) {
    try {
        // Load the page HTML content
        const response = await fetch(`./pages/${sectionId}.html`);
        if (!response.ok) {
            throw new Error(`Failed to load page: ${response.statusText}`);
        }
        
        const htmlContent = await response.text();
        
        // Find the main content area
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) {
            throw new Error('Main content area not found');
        }
        
        // Clear existing content
        mainContent.innerHTML = '';
        
        // Insert the new page content
        mainContent.innerHTML = htmlContent;
        
        // Show the loaded section
        const loadedSection = document.getElementById(sectionId);
        if (loadedSection) {
            loadedSection.classList.add('active');
        }
        
        return true;
    } catch (error) {
        console.error(`Error loading page ${sectionId}:`, error);
        
        // Show error content
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="content-section active">
                    <h1 class="page-title">Error Loading Page</h1>
                    <p class="content-text">
                        Sorry, there was an error loading the ${sectionId} page. Please try again.
                    </p>
                </div>
            `;
        }
        
        return false;
    }
}
