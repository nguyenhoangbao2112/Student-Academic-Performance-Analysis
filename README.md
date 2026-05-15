# 🚔 US Police Shootings from 2015–2022

A data visualization project that explores patterns and trends in US police shootings over eight years. Built with JavaScript, HTML, and CSS, the project transforms raw incident data into interactive visual narratives — helping researchers, policymakers, and citizens better understand the scale and context of these events.

---

## 📌 Overview

In a transparent society, accountability in law enforcement is essential. This project goes beyond media headlines to examine the details behind reported police shootings — including demographic breakdowns, geographic distribution, incident circumstances, and year-over-year trends.

The visualizations are designed to make complex data accessible, supporting informed discussion around justice and public safety.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Visualization | JavaScript (D3.js / Vega-Lite) |
| Styling | CSS |
| Structure | HTML |
| Data Processing | Python |

---

## 📁 Project Structure

```
US-Police-Shootings-from-2015-2022/
│
├── Project_DSDV/
│   ├── code/
│   │   ├── data-processing.py   # Python script to clean & prepare data
│   │   ├── index.html           # Main entry point
│   │   ├── *.js                 # Visualization scripts
│   │   └── *.css                # Stylesheets
│   └── data/                    # Raw and processed datasets
│
└── README.md
```

---

## 🚀 How to Run

### Prerequisites

Make sure you have the following installed:

- [Visual Studio Code](https://code.visualstudio.com/)
- **Live Server** extension for VS Code
  - Install it from the Extensions panel (`Ctrl+Shift+X`) → search **"Live Server"** → click **Install**
- [Python 3](https://www.python.org/) (for data processing only)

---

### Step 1 — Clone or Download the Repository

**Option A: Clone via Git**
```bash
git clone https://github.com/nguyenhoangbao2112/US-Police-Shootings-from-2015-2022.git
```

**Option B: Download ZIP**
1. Click the green **Code** button on the GitHub page
2. Select **Download ZIP**
3. Extract the ZIP to a folder of your choice

---

### Step 2 — (Optional) Run the Data Processing Script

If you need to regenerate or update the dataset:

```bash
cd Project_DSDV/code
python data-processing.py
```

---

### Step 3 — Open the Project in VS Code

```bash
cd Project_DSDV/code
code .
```

Or open VS Code manually and use **File → Open Folder** to navigate to the `Project_DSDV/code` directory.

---

### Step 4 — Launch with Live Server

1. In VS Code, open `Dashboard.html`
2. Right-click anywhere in the file editor
3. Select **"Open with Live Server"**

Your browser will automatically open at `http://127.0.0.1:5500` and display the interactive visualizations.

> 💡 **Tip:** Any changes you save to the code will automatically refresh in the browser.

---

## 👥 Contributors

- [@nguyenhoangbao2112](https://github.com/nguyenhoangbao2112) and team

---

## 📄 License

This project is open source. Data sourced from publicly available US police shooting reports.
