// Background script for handling downloads and other background tasks





function downloadCsv(content, filename) {
    const blob = new Blob([content], { type: 'text/csv' });
    const reader = new FileReader();

    reader.onload = function () {
        const dataUrl = reader.result;
        chrome.downloads.download({
            url: dataUrl,
            filename: filename,
            saveAs: false
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                console.error('Download failed:', chrome.runtime.lastError);
                return { success: false, error: chrome.runtime.lastError.message };
            } else {
                console.log('Download started:', downloadId);
                return { success: true, downloadId: downloadId };
            }   
        });
    };

    reader.readAsDataURL(blob);
}

function generateFullCsv(snapshots) {
    const students = new Set();
    snapshots.forEach(s => s.participants.forEach(p => students.add(p.name)));

    // Build headers
    const headers = ['Name', 'Overall', 'Total_Present', 'Total_Snapshots'];
    snapshots.forEach((snapshot, i) => {
        headers.push(`Attendance ${i + 1} Status (${snapshot.timestamp.replace(",", ' |')})`);
        headers.push(`Attendance ${i + 1} Reason`);
        headers.push(`Attendance ${i + 1} HasVideo`);
    });

    let csv = headers.join(',') + '\n';

    Array.from(students).sort().forEach(name => {
        const row = [name];
        let totalPresent = 0;
        let totalSnapshots = 0;

        // Process snapshots
        const attendanceDetails = [];

        snapshots.forEach(s => {
            const p = s.participants.find(p => p.name === name);

            if (!p) {
                attendanceDetails.push('Absent', 'Missing', 'FALSE');
            } else {
                totalSnapshots++;
                if (p.status.toUpperCase() === 'PRESENT') totalPresent++;
                attendanceDetails.push(p.status);
                attendanceDetails.push(p.reason || '');
                attendanceDetails.push(p.hasVideo ? 'TRUE' : 'FALSE');
            }
        });

        const overall = (totalPresent / snapshots.length) >= (2 / 3) ? 'Present' : 'Absent';

        row.push(overall);
        row.push(totalPresent);
        row.push(totalSnapshots);
        // row.push(snapshots.length);
        row.push(...attendanceDetails);

        csv += row.join(',') + '\n';
    });

    return csv;
}



let tracking = false;
let trackingInterval = null;
let snapshots = [];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    

    if (request.action === "get_tracking_state") {
        sendResponse({ tracking });
        return;
    }
    
    if (!tracking && request.action === "start_tracking") {
        console.log("At start_tracking")
        tracking = true;
        let activeTabId = request.tabId;
        let requireCamera = request.requireCamera;

        trackingInterval = setInterval(() => {
            chrome.tabs.sendMessage(activeTabId, {
                action: "captureAttendanceV2",
                settings: { requireCamera }
            }, (response) => {
                if (chrome.runtime.lastError || !response?.success) return;
                snapshots.push({
                    timestamp: response.timestamp,
                    participants: response.data
                });
            });
        }, 5 * 60 * 1000); // change back to 5 / 10 mins
    }

    if (tracking && request.action === "stop_tracking") {
        console.log("At stop_tracking")
        tracking = false;
        clearInterval(trackingInterval);
        trackingInterval = null;

        const fullCsv = generateFullCsv(snapshots);

        downloadCsv(fullCsv, 'attendance_log.csv');

        snapshots = [];
    }
    return true;
});

// Optional: Handle installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('Zoom Attendance Tracker installed');
    }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url.includes('zoom.us') || tab.url.includes('zoom.com')) {
    // Retrieve the action badge to check if the extension is 'ON' or 'OFF'
    const prevState = await chrome.action.getBadgeText({ tabId: tab.id });
    // Next state will always be the opposite
    const nextState = prevState === 'ON' ? 'OFF' : 'ON';

    // Set the action badge to the next state
    await chrome.action.setBadgeText({
      tabId: tab.id,
      text: nextState,
    });
  }
});
