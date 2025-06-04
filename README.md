# Zoom Attendance Chrome Extension

A simple Chrome extension to capture attendance from a Zoom meeting directly in your browser.

---

## 🚀 Installation

Follow the steps below to install the extension locally:

1. **Clone this repository**  
   
    ```bash
      git clone https://github.com/abbasidaniyal/btt-lab-attendance.git
    ```

2. **Open Chrome Extensions page**
   In your Chrome browser, go to:

   ```url
     chrome://extensions
   ```

3. **Enable Developer Mode**
   Toggle the switch in the top-right corner to enable Developer Mode.

4. **Load Unpacked Extension**
   Click **"Load unpacked"** and select the directory where you cloned this repository.

5. **Pin the Extension**
   Click the puzzle icon (🧩) in the top-right of Chrome and pin the extension for quick access.

---

## 📋 Usage Instructions

To capture attendance from a Zoom meeting:

1. **Join the Zoom Meeting in your browser**
   Ensure you're using the Zoom web client (not the desktop app).

2. **Keep the Zoom tab active**
   The extension will only work if a Zoom meeting is open in an active tab. If not, it will show an error:

   ![Not in zoom](https://github.com/abbasidaniyal/btt-lab-attendance/blob/main/images/not_in_zoom_status.png?raw=true)

3. **Click the Extension Icon**
   Once you're in the meeting, click the extension icon. It will confirm that you're currently in a Zoom session:
   
   ![In zoom](https://github.com/abbasidaniyal/btt-lab-attendance/blob/main/images/in_zoom_status.png?raw=true)

4. **Capture Attendance**
   Click on **"Capture Attendance"**. A CSV file will be automatically downloaded containing the current list of participants.
   
   ![CSV Output](https://github.com/abbasidaniyal/btt-lab-attendance/blob/main/images/downloaded_file.png?raw=true)

---

## 🛠 Troubleshooting

* Make sure you're not using the Zoom desktop app. This extension only works with Zoom meetings joined via **browser**.
* Keep the Zoom tab in the **foreground** when using the extension.

---
