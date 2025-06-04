document.addEventListener('DOMContentLoaded', async () => {
    const statusEl = document.getElementById('status');
    const statusText = document.getElementById('status-text');
    const captureBtn = document.getElementById('captureBtn');
    const requireCameraCheckbox = document.getElementById('requireCamera');
    const participantCountEl = document.getElementById('participantCount');

    const countEl = document.getElementById('count');
    const messageEl = document.getElementById('message');

    // Load saved settings
    const settings = await chrome.storage.sync.get({
        requireCamera: false
    });


    requireCameraCheckbox.checked = settings.requireCamera;

    // Save settings on change
    requireCameraCheckbox.addEventListener('change', () => {
        chrome.storage.sync.set({ requireCamera: requireCameraCheckbox.checked });
    });

    // Check if we're in a Zoom meeting
    async function checkZoomStatus() {
        console.log("Checking Zoom status...");
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab.url.includes('zoom.us') && !tab.url.includes('zoom.com')) {
                updateStatus(false, 'Not on Zoom');
                return;
            }


            // Send message to content script to check meeting status
            chrome.tabs.sendMessage(tab.id, { action: 'checkMeetingStatus' }, (response) => {

                console.log("Response from content script:", response);
                console.log("Last error:", chrome.runtime.lastError);
                if (chrome.runtime.lastError) {
                    updateStatus(false, 'Extension not loaded. Please reload the page.');
                    return;
                }

                if (response && response.inMeeting) {
                    updateStatus(true, 'In Zoom meeting');
                    if (response.participantCount !== undefined) {
                        participantCountEl.style.display = 'block';
                        countEl.textContent = response.participantCount;
                    }
                } else {
                    updateStatus(false, 'Not in meeting');
                }
            });
        } catch (error) {
            updateStatus(false, 'Error checking status | ' + error.message);
        }
    }

    function updateStatus(active, text) {
        statusText.textContent = text;
        statusEl.className = active ? 'status active' : 'status inactive';
        captureBtn.disabled = !active;

        participantCountEl.style.display = active ? 'block' : 'none';
    }

    function showMessage(text, type = 'success') {
        messageEl.textContent = text;
        messageEl.className = `message ${type}`;
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 3000);
    }

    // Capture attendance
    captureBtn.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            const settings = {
                requireCamera: requireCameraCheckbox.checked,
            };

            captureBtn.textContent = 'Capturing...';
            captureBtn.disabled = true;

            chrome.tabs.sendMessage(tab.id, {
                action: 'captureAttendance',
                settings: settings
            }, (response) => {
                captureBtn.textContent = 'Capture Attendance';
                captureBtn.disabled = false;

                if (chrome.runtime.lastError) {
                    showMessage('Error: Extension not responding', 'error');
                    return;
                }

                if (response && response.success) {
                    showMessage(`Attendance captured! Downloaded ${response.filename}`);
                } else {
                    showMessage(response?.error || 'Failed to capture attendance', 'error');
                }
            });
        } catch (error) {
            captureBtn.textContent = 'Capture Attendance';
            captureBtn.disabled = false;
            showMessage('Error capturing attendance', 'error');
        }
    });

    // Initial status check
    checkZoomStatus();

    // Refresh status every 2 seconds
    setInterval(checkZoomStatus, 5000);
});