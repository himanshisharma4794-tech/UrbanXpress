/* shared-theme.js - UrbanXpress High-Fidelity UI Engine */
(function() {
    // Initial Load Theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    function updateThemeIcon() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        
        // 1. Desktop Nav Icon (FontAwesome)
        const faIcons = document.querySelectorAll('#theme-toggle i, .theme-toggle i');
        faIcons.forEach(icon => {
            icon.className = currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        });

        // 2. Sidebar Sidebar Toggle (Text/Icon)
        const toggleButtons = document.querySelectorAll('#theme-toggle, .theme-toggle-btn');
        toggleButtons.forEach(btn => {
            // Update emoji directly for the simplistic header toggle
            if (btn.id === 'theme-toggle' && (btn.innerText.includes('🌓') || btn.innerText.includes('☀️'))) {
                btn.innerHTML = currentTheme === 'dark' ? '☀️' : '🌓';
            }
            
            const span = btn.querySelector('span');
            if (span) {
                span.innerHTML = currentTheme === 'dark' ? '☀️ Light Mode' : '🌓 Dark Mode';
            }
        });
    }

    window.toggleTheme = function() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        // Smooth transition effect
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Update all UI elements
        updateThemeIcon();
    };

    // Inject Favicon globally
    const injectFavicon = () => {
        if (!document.querySelector("link[rel*='icon']")) {
            const link = document.createElement('link');
            link.type = 'image/svg+xml';
            link.rel = 'icon';
            link.href = 'images/logo.svg';
            document.getElementsByTagName('head')[0].appendChild(link);
            
            const appleLink = document.createElement('link');
            appleLink.rel = 'apple-touch-icon';
            appleLink.href = 'images/logo.svg';
            document.getElementsByTagName('head')[0].appendChild(appleLink);
        }
    };

    // Wait for DOM to ensure selectors work
    document.addEventListener('DOMContentLoaded', () => {
        injectFavicon();
        updateThemeIcon();
        
        // Highlight active nav item based on current URL
        const currentPath = window.location.pathname.split('/').pop();
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            const href = item.getAttribute('href');
            if (href === currentPath) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    });
})();
