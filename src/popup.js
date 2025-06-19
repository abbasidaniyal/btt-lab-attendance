document.addEventListener('DOMContentLoaded', async () => {
    const statusEl = document.getElementById('status');
    const statusText = document.getElementById('status-text');
    const captureBtn = document.getElementById('captureBtn');
    const requireCameraCheckbox = document.getElementById('requireCamera');
    const participantCountEl = document.getElementById('participantCount');

    const countEl = document.getElementById('count');
    const messageEl = document.getElementById('message');

    function updateCaptureButtonText(tracking) {
        captureBtn.textContent = tracking ? "Stop" : "Start Attendance";
        captureBtn.style.background = tracking? "red": null;
    }

    await chrome.runtime.sendMessage({ action: 'get_tracking_state' }, async (response) => {
        tracking = response.tracking || false;
        updateCaptureButtonText(tracking);
        
    });

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
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab.url.includes('zoom.us') && !tab.url.includes('zoom.com')) {
                updateStatus(false, 'Not on Zoom');
                return;
            }


            // Send message to content script to check meeting status
            await chrome.tabs.sendMessage(tab.id, { action: 'checkMeetingStatus' }, (response) => {

                console.log("Response from content script:", response);
                // console.log("Last error:", chrome.runtime.lastError);
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



    captureBtn.addEventListener('click', async () => {
        let tracking = false;
        await chrome.runtime.sendMessage({ action: 'get_tracking_state' }, async (response) => {
            console.log("Response from background script:", response);
            tracking = response.tracking || false;

            const newTrackingStatus = !tracking;

            showMessage(tracking, newTrackingStatus ? 'Tracking in progress' : 'Ready to track');

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });


            chrome.runtime.sendMessage({
                action: newTrackingStatus ? "start_tracking" : "stop_tracking",
                tabId: tab.id,
                requireCamera: requireCameraCheckbox.checked
            });

            updateCaptureButtonText(newTrackingStatus);

        });

    });


    // Initial status check
    checkZoomStatus();

    // Refresh status every 5 seconds
    setInterval(checkZoomStatus, 5 * 1000);
});