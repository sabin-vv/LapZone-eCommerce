document.querySelectorAll('.dropdown-menu .logout-item').forEach(logoutItem => {
    logoutItem.addEventListener('click', function(e) {
        e.preventDefault();
        // Simulate logout by clearing session data
        sessionStorage.removeItem('loggedIn');
        
        window.location.href = '/logout'; 
    });
});


document.querySelectorAll('.icon-group i').forEach(icon => {
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
    const iconGroup = document.querySelector('.icon-group');
    const dropdowns = document.querySelectorAll('.dropdown-menu');
    if (!iconGroup.contains(e.target)) {
        dropdowns.forEach(d => d.style.display = 'none');
    }
});

