document.addEventListener('DOMContentLoaded', () => {
    // Handle logout
    const logoutItem = document.querySelector('.logout-item');
    if (logoutItem) {
        logoutItem.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const response = await fetch('/logout', { method: 'POST' });
                if (response.ok) {
                    window.location.href = '/login';
                } else {
                    console.error('Logout failed:', response.statusText);
                }
            } catch (err) {
                console.error('Logout error:', err);
            }
        });
    }

    // Dropdown toggle functionality
    const iconGroup = document.querySelector('.icon-group');
    
    // Only add event listeners if iconGroup exists
    if (iconGroup) {
        // Icons in the icon group
        iconGroup.querySelectorAll('i').forEach(icon => {
            icon.addEventListener('click', function(e) {
                e.preventDefault();
                const dropdownId = this.id.replace('Icon', 'Dropdown');
                const dropdown = document.getElementById(dropdownId);
                
                if (dropdown) {
                    // Close other dropdowns
                    document.querySelectorAll('.dropdown-menu').forEach(d => {
                        if (d !== dropdown) d.style.display = 'none';
                    });
                    
                    // Toggle the clicked dropdown
                    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
                }
            });
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', function(e) {
            const dropdowns = document.querySelectorAll('.dropdown-menu');
            
            // Check if the click is outside the icon group
            if (!iconGroup.contains(e.target)) {
                dropdowns.forEach(d => d.style.display = 'none');
            }
        });
    }
});