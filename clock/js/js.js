
        function updateClocks() {
            const now = new Date();

            // New York (EDT - Eastern Daylight Time)
            const newYorkTime = now.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                timeZone: 'Asia/Tokyo'
            });
           document.querySelector('#clock-newyork span').textContent = newYorkTime.replace(/\s[AP]M$/, ''); //  Remove AM/PM for styling, will add back
            document.querySelector('#clock-newyork span').dataset.time = newYorkTime.replace(/\s[AP]M$/, ''); // For glitch effect

            // Manually append AM/PM for display
            document.querySelector('#clock-newyork span').textContent += ' ' + newYorkTime.split(' ')[1];
        }

        // Update clocks every second
        setInterval(updateClocks, 1000);
        // Initial call to display the time immediately
        updateClocks();