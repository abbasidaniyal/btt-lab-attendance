// Content script for Zoom attendance tracking
(function () {
    'use strict';

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'checkMeetingStatus') {
            const meetingStatus = checkIfInMeeting();
            sendResponse(meetingStatus);
        } else if (request.action === 'captureAttendance') {
            captureAttendance(request.settings).then(result => {
                sendResponse(result);
            }).catch(error => {
                sendResponse({ success: false, error: error.message });
            });
            return true; // Keep message channel open for async response
        }
    });

    function checkIfInMeeting() {
        // Check various indicators that we're in a Zoom meeting

        const iframeScope = document.getElementsByClassName("pwa-webclient__iframe")?.[0];

        if (iframeScope) {

            // Check if participants panel is open
            const participantPanel = iframeScope.contentWindow.document.getElementsByClassName('participants-section-container')?.[0];
            if (!participantPanel) {


                const participantPanelButton = iframeScope.contentWindow.document.getElementById('participant');
                participantPanelButton.getElementsByTagName("button")[0].click();

                const participantPanelNew = iframeScope.contentWindow.document.getElementsByClassName('participants-section-container')?.[0];

                if (!participantPanelNew) {
                    console.warn('Participants panel not found. Make sure you are in a meeting and the participants panel is accessible.');
                    return { inMeeting: false };
                }
            }

            // get count and close panel and return | keep open if already open
            // set always show meeting controls option
            const participantElements = iframeScope.contentWindow.document.getElementsByClassName(
                'participants-header__header'
            )?.[0];
            return {
                inMeeting: true,
                participantCount: Number(participantElements?.textContent.split("(")[1].split(')')[0].trim()) || 0
            };
        }

        return { inMeeting: false };
    }


    async function captureAttendance(settings) {
        try {
            // Wait a bit to ensure UI is stable
            await new Promise(resolve => setTimeout(resolve, 500));

            // First try to open participants panel if not already open
            // await openParticipantsPanel();
            const iframeScope = document.getElementsByClassName("pwa-webclient__iframe")?.[0];
            if (iframeScope) {

                // Check if participants panel is open
                const participantPanel = iframeScope.contentWindow.document.getElementsByClassName('participants-section-container')?.[0];
                if (!participantPanel) {
    
    
                    const participantPanelButton = iframeScope.contentWindow.document.getElementById('participant');
                    participantPanelButton.getElementsByTagName("button")[0].click();
                }
            }

            // Wait for panel to load
            await new Promise(resolve => setTimeout(resolve, 1000));

            const participants = await getParticipantData(settings);

            if (participants.length === 0) {
                throw new Error('No participants found. Make sure the participants panel is accessible.');
            }

            const filename = generateFilename(settings.outputFormat);
            const content = formatData(participants, settings.outputFormat);

            await downloadFile(content, filename, settings.outputFormat);

            return {
                success: true,
                filename: filename,
                participantCount: participants.length
            };
        } catch (error) {
            console.error('Error capturing attendance:', error);
            throw error;
        }
    }

    async function getParticipantData(settings) {
        const participants = [];

        const iframeScope = document.getElementsByClassName("pwa-webclient__iframe")?.[0];

        console.log("Iframe scope found:", iframeScope);
             

        const participantItems = iframeScope.contentWindow.document.querySelectorAll(
            '.participants-item-position'
        );
        console.log("Items found:", participantItems.length);
        console.log(participantItems)

        for (const item of participantItems) {
            const participant = extractParticipantInfo(item, settings);
            if (participant) {
                participants.push(participant);
            }
        }

        return participants;
    }


    function extractParticipantInfo(item, settings) {
        // Extract name

        let name =  item.querySelector('.participants-item__display-name')?.textContent;

        if (!name) {
            // Fallback: use text content
            name = item.textContent.trim().split('\n')[0];
        }

        if (!name || name.length === 0) return null;

        // Check video status
        const icons = item.querySelectorAll('.participants-icon__icon-box');

        const mic = icons[0];
        const video = icons[1];

        // for mic, find svg tag and use class name
        const muted = mic && mic.getElementsByTagName('svg')?.[0].className.baseVal.includes('audio-muted');

        const hasVideo = video && video.getElementsByTagName('svg')?.[0].className.baseVal.includes('video-on');

        // Determine status
        let status = 'Present';
        let reason = '';

        if (settings.requireCamera && !hasVideo) {
            status = 'Absent';
            reason = 'Camera not on';
        }

        return {
            name: name,
            status: status,
            reason: reason,
            hasVideo: hasVideo,
            timestamp: new Date().toISOString()
        };
    }

    function formatData(participants, format) {
        if (format === 'json') {
            return JSON.stringify({
                meeting: {
                    date: new Date().toISOString(),
                    totalParticipants: participants.length
                },
                participants: participants
            }, null, 2);
        } else {
            // CSV format
            const headers = ['Name', 'Status', 'Reason', 'Has Video', 'Timestamp'];
            const csvRows = [headers.join(',')];

            participants.forEach(p => {
                const row = [
                    `"${p.name.replace(/"/g, '""')}"`,
                    `"${p.status}"`,
                    `"${p.reason}"`,
                    p.hasVideo,
                    `"${p.timestamp}"`
                ];
                csvRows.push(row.join(','));
            });

            return csvRows.join('\n');
        }
    }

    function generateFilename(format) {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
        return `zoom-attendance-${dateStr}-${timeStr}.${format}`;
    }

    async function downloadFile(content, filename, format) {
        const mimeType = format === 'json' ? 'application/json' : 'text/csv';
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);

        // Use Chrome downloads API through background script
        chrome.runtime.sendMessage({
            action: 'download',
            url: url,
            filename: filename
        });
    }
})();
