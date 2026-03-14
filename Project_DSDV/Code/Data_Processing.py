import os
import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path
import pandas as pd
import matplotlib.ticker as mticker
import Function
import matplotlib.colors as mcolors

### 1. LOAD DATASET
script_dir = Path(__file__).resolve().parent
data_dir = script_dir.parent / "Data"
default_csv_name = "US Police shootings in from 2015-22.csv"

env_csv = os.getenv("CSV_PATH", "").strip()
if env_csv:
    csv_path = Path(env_csv)
else:
    csv_path = data_dir / default_csv_name
try:
    df = pd.read_csv(csv_path)
    print(f"Loaded dataset from {csv_path} with {len(df)} rows and {len(df.columns)} columns")
except FileNotFoundError:
    print(f"CSV file not found at: {csv_path}")
    print("Put the dataset in the same folder as this script, or set CSV_PATH environment variable.")
except Exception as e:
    print(f"Error loading CSV: {e}")

print("\nDATASET:")
print(df.head())

print("\nDATA TYPES:")
print(df.dtypes)
print(f"\nTotal columns : {df.shape[1]}")
print(f"Total rows    : {df.shape[0]}")

### 2. DEFINITIONS
NUMERIC_COL = "age"
DATE_COL    = "date"         
NOMINAL_COLS = ["manner_of_death",
               "armed", 
               "gender", 
               "race",
               "state", 
               "signs_of_mental_illness", 
               "threat_level", 
               "flee", 
               "body_camera"]

print("\nUNIQUE VALUES PER COLUMN (NOMINAL):")
for col in NOMINAL_COLS:
    uniq_count = df[col].nunique()
    uniq_vals  = df[col].unique()
 
    if uniq_count <= 10:
        display = ", ".join([str(v) for v in uniq_vals if pd.notna(v)])
        print(f"\n  {col} ({uniq_count} unique):")
        print(f"    --> {display}")
    else:
        sample = ", ".join([str(v) for v in uniq_vals[:5] if pd.notna(v)])
        print(f"\n  {col} ({uniq_count} unique):")
        print(f"    --> Sample: {sample} ...")

NOMINAL_COLS.remove('armed')
all_cols = [DATE_COL, NUMERIC_COL] + NOMINAL_COLS
df = df[all_cols]
print("\nFINAL DATA SHAPE:")
print(df.dtypes)
print(f"\nTotal columns : {df.shape[1]}")
print(f"Total rows    : {df.shape[0]}")

### 3. REMOVE DUPLICATES
rows_before_dup = len(df)
df = df.drop_duplicates()
removed_dup = rows_before_dup - len(df)
print(f"\n[DUPLICATES] Removed {removed_dup} duplicate row(s).")

print("\nMISSING VALUES (BEFORE CLEANING):")
print(df[all_cols].isnull().sum())

### 4. FILL MISSING VALUES
missing_numeric_before = df[NUMERIC_COL].isnull().sum()
age_mean = round(df[NUMERIC_COL].mean())    
df[NUMERIC_COL] = df[NUMERIC_COL].fillna(age_mean)
print(f"\n[NUMERIC] Filled {missing_numeric_before} missing value(s) in {NUMERIC_COL} with mean = {age_mean}")
print("\n[NOMINAL] Filling missing values with mode per column:")
for col in NOMINAL_COLS:
    missing_count = df[col].isnull().sum()
    mode_value = df[col].mode()[0]          
    df[col] = df[col].fillna(mode_value)
    print(f"{col}: filled {missing_count} missing value(s) with mode = {mode_value}.")

print("\nMISSING VALUES (AFTER CLEANING):")
print(df[all_cols].isnull().sum())

print("\nDATA (AFTER CLEANING):")
print(df.dtypes)
print(f"\nTotal columns : {df.shape[1]}")
print(f"Total rows    : {df.shape[0]}")

### 5. SAVE CLEANED DATASET
df.to_csv(f"{data_dir}/US_Police_shootings_cleaned.csv", index=False)
df['year'] = pd.to_datetime(df['date']).dt.year

### 6. VISUALIZATION - NUMERIC
fig, ax = plt.subplots(figsize=(8, 4))
ax.hist(df[NUMERIC_COL], bins=15, color="#4C72B0", edgecolor="white")
ax.set_title("Age Distribution (Histogram)")
ax.set_xlabel(NUMERIC_COL)
ax.set_ylabel("Occurrence")
ax.axvline(df[NUMERIC_COL].mean(),   color="red",    linestyle="--",
           label=f"Mean = {df[NUMERIC_COL].mean():.1f}")
ax.axvline(df[NUMERIC_COL].median(), color="orange", linestyle="--",
           label=f"Median = {df[NUMERIC_COL].median():.1f}")
ax.legend()
plt.tight_layout()
plt.show()

### 7. VISUALIZATION - NOMINAL
colors = ["#4C72B0", "#DD8452", "#55A868", "#C44E52",
          "#8172B2", "#937860", "#DA8BC3", "#8C8C8C"]

chunks = [NOMINAL_COLS[i:i+2] for i in range(0, len(NOMINAL_COLS), 2)]
 
for img_idx, chunk in enumerate(chunks):
    fig, axes = plt.subplots(1, len(chunk), figsize=(7 * len(chunk), 4))
 
    axes_list = axes if isinstance(axes, np.ndarray) else [axes]
 
    for j, col in enumerate(chunk):
        ax     = axes_list[j]
        counts = df[col].value_counts()
        color  = colors[(img_idx * 2 + j) % len(colors)]
 
        if len(counts) > 10:
            counts = counts.head(10)
            ax.set_title(f"'{col}' (Top 10)", fontweight="bold")
        else:
            ax.set_title(f"'{col}'", fontweight="bold")
 
        bars = ax.bar(counts.index.astype(str), counts.values,
                      color=color, edgecolor="white")
        ax.set_xlabel("Category")
        ax.set_ylabel("Count")
        ax.yaxis.set_major_locator(mticker.MaxNLocator(integer=True))
 
        for bar in bars:
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width() / 2, height + 0.1,
                    str(int(height)), ha="center", va="bottom", fontsize=9)
 
        if len(counts) > 5:
            ax.set_xticks(range(len(counts)))
            ax.set_xticklabels(counts.index.astype(str), rotation=30, ha="right")
 
    plt.tight_layout()
    plt.show()

### 8. CORRELATION MATRIX (CRAMÉR'S V)
df["signs_of_mental_illness"] = df["signs_of_mental_illness"].astype(int)
df["body_camera"] = df["body_camera"].astype(int)
df["age_binned"] = pd.cut(df["age"], bins=10, labels=False)
COLS = [
    "age_binned", "manner_of_death", "gender", "race",
    "state", "signs_of_mental_illness", "threat_level",
    "flee", "body_camera",
]
LABELS = [
    "age", "manner of death", "gender", "race",
    "state", "mental illness", "threat level",
    "flee", "body camera",
]
n = len(COLS)
matrix = np.zeros((n, n))
for i, c1 in enumerate(df[COLS]):
    for j, c2 in enumerate(df[COLS]):
        if i == j:
            matrix[i, j] = 1.0
        elif i < j:
            v = Function.cramers_v(df[c1], df[c2])
            matrix[i, j] = matrix[j, i] = v
 
matrix_df = pd.DataFrame(matrix, index=LABELS, columns=LABELS)
fig, ax = plt.subplots(figsize=(9, 7))
 
cmap = mcolors.LinearSegmentedColormap.from_list(
    "assoc", ["#f5f5f0", "#FAC775", "#EF9F27", "#E24B4A", "#A32D2D"]
)
 
im = ax.imshow(matrix, cmap=cmap, vmin=0, vmax=1, aspect="auto")
 
for i in range(n):
    for j in range(n):
        val = matrix[i, j]
        color = "white" if val > 0.5 else ("#5a1010" if val > 0.12 else "#444")
        text = "—" if i == j else f"{val:.2f}"
        ax.text(j, i, text, ha="center", va="center",
                fontsize=9, color=color, fontweight="bold" if val > 0.10 else "normal")
 
ax.set_xticks(range(n))
ax.set_yticks(range(n))
ax.set_xticklabels(LABELS, rotation=40, ha="right", fontsize=10)
ax.set_yticklabels(LABELS, fontsize=10)
ax.tick_params(length=0)
 
for x in np.arange(-0.5, n, 1):
    ax.axhline(x, color="white", linewidth=1.5)
    ax.axvline(x, color="white", linewidth=1.5)
 
cbar = fig.colorbar(im, ax=ax, fraction=0.03, pad=0.02)
cbar.set_label("Cramér's V  (0 = no association, 1 = perfect)", fontsize=9)
cbar.ax.tick_params(labelsize=8)
 
ax.set_title("Column association matrix — US Police Shootings\n"
             "Cramér's V (bias-corrected)", fontsize=12, pad=14)
 
plt.tight_layout()
plt.show()